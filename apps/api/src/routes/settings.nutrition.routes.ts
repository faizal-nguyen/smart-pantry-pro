import { Router } from 'express';
import { ProfileWriteSchema } from '@smart/shared';
import { ok,fail } from '../utils/responses.js';
import { userRateLimit } from '../middleware/userRateLimit.js';
import { NutritionProfileService,ProfileError } from '../services/recommendations/NutritionProfileService.js';

export function createNutritionProfileRouter():Router {
  const router=Router();
  router.use(userRateLimit({ key:'settings.nutrition',freeMax:120,premiumMax:600,windowMs:3600000 }));
  router.get('/',async(req,res)=>{
    if (!req.user?.id || !req.supabaseClient) return fail(res,'Unauthorized',401,'UNAUTHORIZED');
    try { return ok(res,await new NutritionProfileService(req.supabaseClient).read(req.user.id),'OK','PROFILE_OK'); }
    catch (error) { return fail(res,'Le profil ne peut pas être lu. Réessayez.',error instanceof ProfileError ? error.status : 503,error instanceof ProfileError ? error.code : 'PROFILE_UNAVAILABLE'); }
  });
  router.post('/',async(req,res)=>{
    if (!req.user?.id || !req.supabaseClient) return fail(res,'Unauthorized',401,'UNAUTHORIZED');
    const parsed=ProfileWriteSchema.safeParse(req.body);
    if (!parsed.success) return fail(res,'Vérifiez les champs du profil et son consentement.',400,'INVALID_PROFILE');
    try { return ok(res,await new NutritionProfileService(req.supabaseClient).write(req.user.id,parsed.data),'OK','PROFILE_SAVED'); }
    catch (error) { return fail(res,error instanceof ProfileError && error.code==='PROFILE_VERSION_CONFLICT' ? 'Le profil a changé sur un autre appareil. Rechargez-le avant de résoudre les différences.' : 'Enregistrement non confirmé. Votre saisie reste conservée.',error instanceof ProfileError ? error.status : 503,error instanceof ProfileError ? error.code : 'PROFILE_UNAVAILABLE'); }
  });
  return router;
}
