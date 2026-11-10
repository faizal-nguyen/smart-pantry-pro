import {useEffect} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {useQuery} from '@tanstack/react-query';
import {FoodGuidanceSchema,calendarDate} from '@smart/shared';
import {apiGet} from '@/lib/api';
import {useAuthenticatedUser} from './useAuthenticatedUser';
import {useNutritionProfile} from './useNutritionProfile';
import {usePersonalization} from './usePersonalization';
import {useAgentDbInvalidation} from '@/lib/agentEvents';

export function useFoodGuidance(now:Date){
 const user=useAuthenticatedUser(),profile=useNutritionProfile(),local=usePersonalization();
 const query=useQuery({queryKey:['food-guidance',user.id,calendarDate(now),profile.data?.profile.version,local.personalizationData?.dietaryPreferences],enabled:!!profile.data,
  staleTime:60_000,refetchOnWindowFocus:true,queryFn:async({signal})=>{
   if(profile.error)throw profile.error;
   if(profile.data?.profile.version===0&&(local.error||local.personalizationData?.dietaryPreferences.length))throw new Error('Confirme tes contraintes dans ton profil alimentaire avant les conseils du jour.');
   return FoodGuidanceSchema.parse(await apiGet('/v1/recommendations/food-guidance',undefined,{expectedUserId:user.id,signal}));
  }});
 const {refetch}=query;
 useAgentDbInvalidation(['inventory','products','nutrition_profiles'],()=>{void profile.refetch();void refetch();});
 useEffect(()=>{
  const channel=supabase.channel(`food-guidance:${user.id}`)
   .on('postgres_changes',{event:'*',schema:'public',table:'inventory',filter:`user_id=eq.${user.id}`},()=>void refetch())
   .subscribe();
  return()=>{void supabase.removeChannel(channel);};
 },[user.id,refetch]);
 return {...query,isLoading:profile.isLoading||query.isLoading,error:profile.error??query.error};
}
