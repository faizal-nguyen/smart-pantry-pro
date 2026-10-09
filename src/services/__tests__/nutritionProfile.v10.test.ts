import { emptyNutritionProfile } from '@smart/shared';
import { getNutritionProfile,writeNutritionProfile,pendingProfileWrite,migrateOwnedCookingPreferences } from '../nutritionProfile';
import { apiGet,apiPost } from '@/lib/api';
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002';
let mockOwner=A;
jest.mock('@/integrations/supabase/client',()=>({ supabase:{ auth:{ getSession:jest.fn(async()=>({ data:{ session:{ user:{ id:mockOwner },access_token:'fixture' } } })) } } }));
jest.mock('@/lib/api',()=>({ apiGet:jest.fn(),apiPost:jest.fn(),ApiError:class extends Error { code?:string;status:number;constructor(message:string,opts:{ code?:string;status:number }){ super(message);this.code=opts.code;this.status=opts.status; } } }));
const settings=()=>({ ...emptyNutritionProfile(),consent:true,allergies:['lait'] });
const profile=(owner=A,version=2)=>({ user_id:owner,version,schema_version:1,origin:'explicit',updated_at:'2026-10-09T12:00:00Z',settings:settings() });
beforeEach(()=>{ localStorage.clear();jest.clearAllMocks();mockOwner=A;Object.defineProperty(crypto,'randomUUID',{ configurable:true,value:()=> '40000000-0000-4000-8000-000000000001' }); });
test('owned read validates owner and preserves version across a reconnect',async()=>{
  jest.mocked(apiGet).mockResolvedValue({ profile:profile(),legacyServerPresent:false });
  expect((await getNutritionProfile(A)).profile.version).toBe(2);
  expect(apiGet).toHaveBeenCalledWith('/v1/settings/nutrition-profile',undefined,{ expectedUserId:A });
  jest.mocked(apiGet).mockResolvedValue({ profile:profile(B),legacyServerPresent:false });
  await expect(getNutritionProfile(A)).rejects.toThrow('correspond pas');
});
test('lost reply preserves exact UUID and settings; retry confirms once and clears intent',async()=>{
  jest.mocked(apiPost).mockRejectedValueOnce(new Error('réponse perdue')).mockResolvedValueOnce({ applied_version:2,profile:profile() });
  await expect(writeNutritionProfile(A,settings(),1)).rejects.toThrow('perdue');
  const frozen=pendingProfileWrite(A)!;
  await expect(writeNutritionProfile(A,{ ...settings(),allergies:[] },1)).rejects.toMatchObject({ code:'PROFILE_PENDING' });
  expect(apiPost).toHaveBeenCalledTimes(1);
  await writeNutritionProfile(A,settings(),1);
  expect(apiPost).toHaveBeenLastCalledWith('/v1/settings/nutrition-profile',frozen,{ expectedUserId:A });
  expect(pendingProfileWrite(A)).toBeNull();
});
test('account switch during response never returns A data to B and preserves A retry',async()=>{
  jest.mocked(apiPost).mockImplementation(async()=>{ mockOwner=B;return { applied_version:2,profile:profile() }; });
  await expect(writeNutritionProfile(A,settings(),1)).rejects.toMatchObject({ code:'AUTH_CHANGED' });
  expect(pendingProfileWrite(A)).not.toBeNull();expect(pendingProfileWrite(B)).toBeNull();
});
test('local storage refusal prevents any request',async()=>{
  const refuse=jest.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{ throw new Error('quota'); });
  await expect(writeNutritionProfile(A,settings(),1)).rejects.toThrow('Aucune action');expect(apiPost).not.toHaveBeenCalled();refuse.mockRestore();
});
test('explicit local migration retains server allergies/exclusions, is repeatable and needs confirmation',()=>{
  const current={ ...settings(),excludedIngredients:['céleri'] },local={ householdSize:'2 personnes',dietaryPreferences:['vegan'],cookingLevel:.2,goals:['Gagner du temps'],onboardingCompletedAt:new Date() };
  const merged=migrateOwnedCookingPreferences(current,local);
  expect(merged).toMatchObject({ allergies:['lait'],excludedIngredients:['céleri'],diets:['vegan'],usualServings:2,consent:false });
  expect(migrateOwnedCookingPreferences(merged,local)).toEqual(merged);
});
test('verified clear removes owned local drafts and keeps the other account and unowned legacy',async()=>{
  for (const key of [`v10-personalization:${A}:cooking`,`v10-routine:${A}:nutrition-profile-draft`,`v10-routine:${A}:recipe-feedback-write`,`v10-personalization:${B}:cooking`,'smart-pantry-personalization']) localStorage.setItem(key,'{}');
  jest.mocked(apiPost).mockResolvedValue({ applied_version:3,profile:{ ...profile(A,3),settings:emptyNutritionProfile() } });
  await writeNutritionProfile(A,emptyNutritionProfile(),2,'clear');
  expect(localStorage.getItem(`v10-routine:${A}:nutrition-profile-draft`)).toBeNull();
  expect(localStorage.getItem(`v10-personalization:${A}:cooking`)).toBeNull();
  expect(localStorage.getItem(`v10-personalization:${B}:cooking`)).not.toBeNull();expect(localStorage.getItem('smart-pantry-personalization')).not.toBeNull();
});
