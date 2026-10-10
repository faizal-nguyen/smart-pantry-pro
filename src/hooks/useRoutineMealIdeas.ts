import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthSessionOptional } from './useAuthenticatedUser';
import { usePersonalization } from './usePersonalization';
import { useNutritionProfile } from './useNutritionProfile';
import { postRecommendationSuggest,type SuggestRecommendationsInput } from '@/services/recommendationsApi';
import { useAgentDbInvalidation } from '@/lib/agentEvents';

/** Render the shared server result; no local stock preview or second scoring path. */
export function useRoutineMealIdeas(input:SuggestRecommendationsInput) {
  const { user }=useAuthSessionOptional(),local=usePersonalization(),profile=useNutritionProfile();
  const query=useQuery({
    queryKey:['routine-meal-ideas',user?.id,profile.data?.profile.version,input,local.personalizationData?.dietaryPreferences],
    enabled:!!user && !!profile.data,staleTime:0,refetchOnWindowFocus:true,
    queryFn:async()=>{
      if (profile.error) throw new Error('Le profil alimentaire doit être relu avant les idées.');
      if (profile.data?.profile.version===0 && (local.error || local.personalizationData?.dietaryPreferences.length)) {
        throw new Error('Confirme les contraintes enregistrées sur cet appareil dans ton profil alimentaire.');
      }
      return postRecommendationSuggest({ ...input,limitPerBucket:3 },user!.id);
    },
  });
  const { refetch }=query;
  useAgentDbInvalidation(['inventory','products','recipes','recipe_ingredients','user_recipes','nutrition_profiles','recipe_interactions'],()=>{ void profile.refetch();void query.refetch(); });
  useEffect(()=>{
    if (!user?.id) return;
    let channel=supabase.channel(`meal-ideas:${user.id}`);
    for (const table of ['inventory','recipes','user_recipes','recipe_interactions']) channel=channel.on('postgres_changes',{ event:'*',schema:'public',table,filter:`user_id=eq.${user.id}` },()=>void refetch());
    channel.subscribe();
    return()=>{ void supabase.removeChannel(channel); };
  },[user?.id,refetch]);
  return { ...query,isLoading:profile.isLoading || query.isLoading,error:profile.error ?? query.error,isError:profile.isError || query.isError,owner:user?.id };
}
