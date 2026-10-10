import { useEffect } from 'react';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import type { RecipeReference } from '@smart/shared';
import { getRecipeDetails } from '@/services/recipeDetails';
import { invalidateUnifiedRecipeCache } from '@/lib/recipeSource';
import { useAgentDbInvalidation } from '@/lib/agentEvents';
import { supabase } from '@/integrations/supabase/client';

export function useRecipeDetails(owner:string,reference:RecipeReference|undefined) {
  const client=useQueryClient();
  const query=useQuery({
    queryKey:['recipe-detail',owner,reference?.source,reference?.id],enabled:!!reference,
    retry:false,staleTime:0,refetchOnWindowFocus:true,
    queryFn:({ signal })=>getRecipeDetails(owner,reference!,signal),
  });
  const refresh=()=>{
    if (!reference) return;
    invalidateUnifiedRecipeCache(reference.id);
    void client.invalidateQueries({ queryKey:['recipe-detail',owner] });
    void client.invalidateQueries({ queryKey:['recipe-evaluation',owner] });
  };
  useAgentDbInvalidation(['recipes','recipe_ingredients','user_recipes','recipes_catalog'],refresh);
  const { canonicalId,source }=query.data?.recipe ?? {};
  const recipeId=reference?.id,recipeSource=reference?.source;
  useEffect(()=>{
    if (!recipeId || !recipeSource) return;
    const reload=()=>{
      invalidateUnifiedRecipeCache(recipeId);
      void client.invalidateQueries({ queryKey:['recipe-detail',owner] });
      void client.invalidateQueries({ queryKey:['recipe-evaluation',owner] });
    };
    let channel=supabase.channel(`recipe-detail:${owner}:${recipeSource}:${recipeId}`);
    for (const [table,filter] of [
      ['recipes',`id=eq.${recipeId}`],['user_recipes',`id=eq.${recipeId}`],
      ['recipe_ingredients',`recipe_id=eq.${recipeId}`],
      ['recipes_catalog',`id=eq.${source==='user_recipes' ? canonicalId ?? recipeId : recipeId}`],
    ]) channel=channel.on('postgres_changes',{ event:'*',schema:'public',table,filter },reload);
    channel.subscribe();
    return()=>{ void supabase.removeChannel(channel); };
  },[owner,recipeId,recipeSource,canonicalId,source,client]);
  return query;
}
