import { useQuery,useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthSessionOptional } from './useAuthenticatedUser';
import { getNutritionProfile,writeNutritionProfile } from '@/services/nutritionProfile';
import type { NutritionProfileSettings } from '@smart/shared';
import { dispatchAgentDbChanged } from '@/lib/agentEvents';
export function useNutritionProfile() {
  const { user }=useAuthSessionOptional(),client=useQueryClient(),owner=user?.id;
  const key=['nutrition-profile',owner];
  const query=useQuery({ queryKey:key,enabled:!!owner,queryFn:()=>getNutritionProfile(owner!),staleTime:0,refetchOnWindowFocus:true });
  useEffect(()=>{
    if (!owner) return;
    const channel=supabase.channel(`nutrition-profile:${owner}`).on('postgres_changes',{ event:'*',schema:'public',table:'nutrition_profiles',filter:`user_id=eq.${owner}` },()=>{
      void client.invalidateQueries({ queryKey:['nutrition-profile',owner] });
      void client.invalidateQueries({ queryKey:['routine-meal-ideas',owner] });
    }).subscribe();
    return()=>{ void supabase.removeChannel(channel); };
  },[owner,client]);
  const save=async(settings:NutritionProfileSettings,version:number,operation:'save'|'clear'='save',origin:'explicit'|'imported'='explicit')=>{
    if (!owner) throw new Error('Connectez-vous pour enregistrer votre profil.');
    const result=await writeNutritionProfile(owner,settings,version,operation,origin);
    client.setQueryData(key,{ profile:result.profile,legacyServerPresent:false });
    await Promise.all(['routine-meal-ideas','today-recommendations','personalized-recommendations','assistant-memories'].map(name=>client.invalidateQueries({ queryKey:[name] })));
    dispatchAgentDbChanged(['nutrition_profiles','recipe_interactions']);
    return result;
  };
  return { ...query,owner,save };
}
