import { NutritionProfileSchema,ProfileWriteSchema,type NutritionProfileRead,type NutritionProfileSettings,type ProfileWrite,type ProfileWriteResult,emptyNutritionProfile } from '@smart/shared';
import { apiGet,apiPost,ApiError } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { readOwnedValue,writeOwnedValue,removeOwnedValue } from '@/lib/ownedStorage';
import type { PersonalizationData } from '@/types/onboarding';

const intent='nutrition-profile-write';
async function requireOwner(owner:string) {
  if ((await supabase.auth.getSession()).data.session?.user.id!==owner) throw new ApiError('Le compte a changé. Reprenez avec son propriétaire.',{ status:401,code:'AUTH_CHANGED' });
}
export async function getNutritionProfile(owner:string):Promise<NutritionProfileRead> {
  const result=await apiGet<NutritionProfileRead>('/v1/settings/nutrition-profile',undefined,{ expectedUserId:owner });
  await requireOwner(owner);
  const profile=NutritionProfileSchema.parse(result.profile);
  if (profile.user_id!==owner) throw new Error('Le profil reçu ne correspond pas à ce compte.');
  return { ...result,profile };
}
export function pendingProfileWrite(owner:string):ProfileWrite|null {
  const value=readOwnedValue<unknown>(owner,intent,null);
  return value ? ProfileWriteSchema.parse(value) : null;
}
export function abandonConflictedProfileWrite(owner:string) { removeOwnedValue(owner,intent); }
export async function writeNutritionProfile(owner:string,settings:NutritionProfileSettings,expectedVersion:number,operation:'save'|'clear'='save',origin:'explicit'|'imported'='explicit'):Promise<ProfileWriteResult> {
  await requireOwner(owner);
  const previous=pendingProfileWrite(owner);
  const candidate=ProfileWriteSchema.parse({ command_id:previous?.command_id ?? crypto.randomUUID(),expected_version:expectedVersion,operation,settings,origin });
  if (previous && JSON.stringify(candidate)!==JSON.stringify(previous)) throw new ApiError('Une sauvegarde reste à vérifier. Reprenez les valeurs envoyées avant de modifier le profil.',{ status:409,code:'PROFILE_PENDING' });
  const command=previous ?? candidate;
  // A pending request is frozen; the caller retries the exact command, never a fresh UUID.
  if (!previous) writeOwnedValue(owner,intent,command);
  const result=await apiPost<ProfileWriteResult>('/v1/settings/nutrition-profile',command,{ expectedUserId:owner });
  await requireOwner(owner);
  const profile=NutritionProfileSchema.parse(result.profile);
  if (profile.user_id!==owner || profile.version<result.applied_version) throw new Error('La sauvegarde n’a pas pu être relue. Réessayez.');
  removeOwnedValue(owner,intent);
  if (command.operation==='clear') {
    localStorage.removeItem(`v10-personalization:${owner}:cooking`);
    localStorage.removeItem(`v10-personalization:${owner}:memory-import-v1`);
    removeOwnedValue(owner,'nutrition-profile-draft');
    removeOwnedValue(owner,'recipe-feedback-write');
    window.dispatchEvent(new Event('smart-pantry-preferences-change'));
  }
  return { ...result,profile };
}
export function migrateOwnedCookingPreferences(current:NutritionProfileSettings,local:PersonalizationData):NutritionProfileSettings {
  const candidate={ ...current,targets:{ ...current.targets },consent:false };
  const map:Record<string,NutritionProfileSettings['diets'][number]>={ vegetarian:'vegetarian',vegan:'vegan','gluten-free':'gluten_free','lactose-free':'lactose_free',halal:'halal',kosher:'kosher' };
  candidate.diets=[...new Set([...current.diets,...local.dietaryPreferences.map(value=>map[value]).filter(Boolean)])];
  candidate.excludedIngredients=[...new Set([...current.excludedIngredients,...local.dietaryPreferences.filter(value=>!map[value]).map(value=>value.replace(/^sans /,''))])];
  candidate.usualServings=({ Solo:1,'2 personnes':2,'3-4':4,'5+':5 } as Record<string,number>)[local.householdSize] ?? current.usualServings;
  candidate.skill=local.cookingLevel<=0.33 ? 'beginner' : local.cookingLevel<=0.66 ? 'intermediate' : 'advanced';
  const goals:Record<string,NutritionProfileSettings['goals'][number]>={ 'Réduire le gaspillage':'anti_waste','Gagner du temps':'quick','Découvrir de nouvelles recettes':'variety' };
  candidate.goals=[...new Set([...current.goals,...local.goals.map(value=>goals[value]).filter(Boolean)])];
  return candidate;
}
export const clearedProfileSettings=emptyNutritionProfile;
