import { NutritionProfileSchema,ProfileWriteSchema,emptyNutritionProfile,type NutritionProfileRead,type ProfileWriteResult,type NutritionProfileSettings } from '@smart/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

export class ProfileError extends Error {
  constructor(readonly code:string,readonly status:number) { super(code); }
}
export function profileDatabaseError(error:{ code?:string;message?:string }):never {
  const code=['PROFILE_VERSION_CONFLICT','IDEMPOTENCY_CONFLICT','INVALID_PROFILE','FORBIDDEN','RECIPE_NOT_FOUND'].find(value=>error.message?.includes(value));
  if (code) throw new ProfileError(code,code.includes('CONFLICT') ? 409 : code==='FORBIDDEN' ? 403 : code==='RECIPE_NOT_FOUND' ? 404 : 400);
  if (['42P01','42703','PGRST202','PGRST204'].includes(error.code ?? '')) throw new ProfileError('MIGRATION_REQUIRED',503);
  throw new ProfileError('PROFILE_UNAVAILABLE',503);
}
export function legacyServerProfile(row:Record<string,unknown>):NutritionProfileSettings {
  const profile=emptyNutritionProfile();
  const strings=(value:unknown):string[] => {
    if (value==null) return [];
    if (!Array.isArray(value) || value.length>30 || value.some(item=>typeof item!=='string' || !item.trim() || item.length>80)) throw new ProfileError('PROFILE_UNAVAILABLE',503);
    return value.map(item=>item.trim());
  };
  profile.allergies=strings(row.allergies);
  const diets:Record<string,NutritionProfileSettings['diets'][number]>={ vegetarian:'vegetarian',vegetarien:'vegetarian',vegan:'vegan','gluten-free':'gluten_free','sans gluten':'gluten_free','lactose-free':'lactose_free','sans lactose':'lactose_free',halal:'halal',kosher:'kosher',casher:'kosher','sans porc':'no_pork','sans alcool':'no_alcohol' };
  for (const term of strings(row.dietary_restrictions)) {
    const known=diets[term.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/_/g,'-')];
    if (known) profile.diets.push(known);else profile.excludedIngredients.push(term.toLowerCase().replace(/^sans /,''));
  }
  profile.cuisines=strings(row.cuisine_preferences);
  profile.equipment=strings(row.equipment_available);
  if (typeof row.max_prep_time==='number' && typeof row.max_cook_time==='number' && row.max_prep_time+row.max_cook_time>0 && row.max_prep_time+row.max_cook_time<=600) profile.usualTimeMinutes=row.max_prep_time+row.max_cook_time;
  if (['beginner','intermediate','advanced'].includes(String(row.cooking_skill_level))) profile.skill=row.cooking_skill_level as NutritionProfileSettings['skill'];
  if (typeof row.family_size==='number' && row.family_size>=1 && row.family_size<=20) profile.usualServings=row.family_size;
  return profile;
}
export class NutritionProfileService {
  constructor(private readonly client:SupabaseClient) {}
  async read(userId:string):Promise<NutritionProfileRead> {
    const { data,error }=await this.client.from('nutrition_profiles').select('user_id,version,schema_version,settings,updated_at,origin').eq('user_id',userId).maybeSingle();
    if (error) profileDatabaseError(error);
    if (data) {
      const parsed=NutritionProfileSchema.safeParse(data);
      if (!parsed.success || parsed.data.user_id!==userId) throw new ProfileError('PROFILE_UNAVAILABLE',503);
      return { profile:parsed.data,legacyServerPresent:false };
    }
    const legacy=await this.client.from('user_meal_preferences').select('allergies,dietary_restrictions,cuisine_preferences,cooking_skill_level,family_size,equipment_available,max_prep_time,max_cook_time,updated_at').eq('user_id',userId).maybeSingle();
    if (legacy.error) profileDatabaseError(legacy.error);
    const present=!!legacy.data && !Array.isArray(legacy.data);
    const settings=present ? legacyServerProfile(legacy.data) : emptyNutritionProfile();
    return { profile:{ user_id:userId,version:0,schema_version:1,settings,updated_at:present ? legacy.data.updated_at ?? null : null,origin:present ? 'legacy_server' : 'empty' },legacyServerPresent:present };
  }
  async write(userId:string,input:unknown):Promise<ProfileWriteResult> {
    const write=ProfileWriteSchema.parse(input);
    const { data,error }=await this.client.rpc('write_nutrition_profile',{ p_command:write });
    if (error) profileDatabaseError(error);
    if (!data || !Number.isSafeInteger(data.version)) throw new ProfileError('PROFILE_UNAVAILABLE',503);
    const { profile }=await this.read(userId);
    if (profile.version<data.version) throw new ProfileError('PROFILE_UNAVAILABLE',503);
    return { applied_version:data.version,profile };
  }
}
