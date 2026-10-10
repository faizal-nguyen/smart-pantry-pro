import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { RecipeEvaluationInput } from '@smart/shared';
import { supabase } from '@/integrations/supabase/client';
import { postRecipeEvaluation } from '@/services/recommendationsApi';
import { useAuthSessionOptional } from './useAuthenticatedUser';
import { useNutritionProfile } from './useNutritionProfile';
import { usePersonalization } from './usePersonalization';
import { useAgentDbInvalidation } from '@/lib/agentEvents';

export function useRecipeEvaluation(reference:RecipeEvaluationInput['recipe']|undefined,servings:number|undefined,recipeRevision:string,canonicalId?:string) {
  const { user }=useAuthSessionOptional(),profile=useNutritionProfile(),local=usePersonalization();
  const owner=user?.id,validServings=servings!=null && Number.isFinite(servings) && servings>0 && servings<=100;
  const blocked=profile.data?.profile.version===0 && (local.error || local.personalizationData?.dietaryPreferences.length)
    ? new Error('Confirme la reprise de tes contraintes dans ton profil alimentaire avant cette évaluation.') : null;
  const query=useQuery({
    queryKey:['recipe-evaluation',owner,reference?.source,reference?.id,servings,profile.data?.profile.version,recipeRevision,!!blocked],
    enabled:!!owner && !!reference && validServings && !!profile.data && !profile.error && !blocked,
    retry:false,staleTime:0,refetchOnWindowFocus:true,
    queryFn:async({ signal })=>{
      if (!owner || !reference || !validServings || !profile.data || profile.error || blocked) throw blocked ?? new Error('La recette, le profil et les portions doivent être relus.');
      const result=await postRecipeEvaluation({ recipe:reference,servings:servings! },owner,signal);
      if (result.profile_version!==profile.data?.profile.version) {
        void profile.refetch();
        throw new Error('Le profil a changé. Les informations de la recette doivent être relues.');
      }
      return result;
    },
  });
  useAgentDbInvalidation(['inventory','products','recipes','recipe_ingredients','user_recipes','recipes_catalog','nutrition_profiles'],()=>{ void profile.refetch();void query.refetch(); });
  const { refetch }=query;
  const recipeId=reference?.id,recipeSource=reference?.source;
  useEffect(()=>{
    if (!owner || !recipeId || !recipeSource) return;
    let channel=supabase.channel(`recipe-evaluation:${owner}:${recipeSource}:${recipeId}`);
    const filters=[
      ['inventory',`user_id=eq.${owner}`],
      ['products',undefined],
      ['recipes',`id=eq.${recipeId}`],
      ['user_recipes',`id=eq.${recipeId}`],
      ['recipe_ingredients',`recipe_id=eq.${recipeId}`],
      ['recipes_catalog',`id=eq.${canonicalId ?? recipeId}`],
    ] as const;
    for (const [table,filter] of filters) channel=channel.on('postgres_changes',{ event:'*',schema:'public',table,...(filter ? { filter } : {}) },()=>void refetch());
    channel.subscribe();
    return()=>{ void supabase.removeChannel(channel); };
  },[owner,recipeId,recipeSource,canonicalId,refetch]);
  const error=profile.error ?? blocked ?? query.error;
  return {
    ...query,data:error || !validServings ? undefined : query.data,error,isError:!!error,
    isFetching:profile.isFetching || query.isFetching,
    isLoading:profile.isLoading || (!!reference && validServings && !error && query.isLoading),
    owner,validServings,
    refetch:async()=>{ await profile.refetch();return query.refetch(); },
  };
}
