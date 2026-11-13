/**
 * PRP-234 PR3 — Recommendations route.
 *
 * Expose `POST /api/v1/recommendations/suggest` au front pour que le
 * dashboard Today (« À cuisiner ») puisse appeler le moteur PRP-226
 * sans passer par le LLM (latence ~150ms vs ~2-3s via assistant).
 *
 * - User-scoped via le middleware auth (`req.supabaseClient` RLS-bound).
 * - Rate-limit 60/h free, 600/h premium.
 * - Réutilise les services PRP-226 :
 *   - `RecommendationEngine` (stateless, partagé) ;
 *   - `RecommendationEventWriter` (per-request, écrit cache 15-min +
 *     `recommendation_events`) ;
 *   - Explicit versioned profile; inferred preferences never override it.
 */
import { Router } from 'express';
import {RecipeLifecycleWriteSchema} from '@smart/shared';
import {RecipeLifecycleService} from '../services/recommendations/RecipeLifecycleService.js';
import { MealContextSchema,RecommendationFeedbackSchema,RecipeEvaluationInputSchema,RecipeEvaluationSchema } from '@smart/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

import { ok, fail } from '../utils/responses.js';
import { userRateLimit } from '../middleware/userRateLimit.js';
import type { Database } from '../types/supabase.js';
import { MemoryService } from '../services/assistant/MemoryService.js';
import { RecommendationEngine } from '../services/recommendations/RecommendationEngine.js';
import { RecommendationEventWriter } from '../services/recommendations/RecommendationEventWriter.js';
import {FoodGuidanceService} from '../services/recommendations/FoodGuidanceService.js';
import { ProfileError,profileDatabaseError } from '../services/recommendations/NutritionProfileService.js';

const SuggestRequestSchema = MealContextSchema;

const HOUR = 3_600_000;

export function createRecommendationsRouter(
  adminClient: SupabaseClient<Database>,
): Router {
  const router = Router();

  // Stateless engine; each call uses the authenticated client's profile and RLS.
  const engine = new RecommendationEngine();
  const memoryService = new MemoryService(adminClient);

  const limiter = userRateLimit({
    key: 'recommendations.suggest',
    freeMax: 60,
    premiumMax: 600,
    windowMs: HOUR,
  });

  const libraryReadLimit=userRateLimit({key:'recipes.lifecycle.read',freeMax:120,premiumMax:1200,windowMs:HOUR});
  const libraryWriteLimit=userRateLimit({key:'recipes.lifecycle.write',freeMax:600,premiumMax:2400,windowMs:HOUR});
  router.get('/library-state',libraryReadLimit,async(req,res)=>{
    if(!req.user?.id||!req.supabaseClient)return fail(res,'Unauthorized',401,'UNAUTHORIZED');
    try{return ok(res,await new RecipeLifecycleService(req.supabaseClient,req.user.id).read(),'OK','LIBRARY_STATE_OK');}
    catch{return fail(res,'Ta sélection et ton historique ne peuvent pas être relus. Réessaie.',503,'LIBRARY_HISTORY_UNAVAILABLE');}
  });
  router.post('/library-events',libraryWriteLimit,async(req,res)=>{
    if(!req.user?.id||!req.supabaseClient)return fail(res,'Unauthorized',401,'UNAUTHORIZED');
    const parsed=RecipeLifecycleWriteSchema.safeParse(req.body);
    if(!parsed.success)return fail(res,'Action de recette invalide.',400,'INVALID_BODY');
    try{return ok(res,await new RecipeLifecycleService(req.supabaseClient,req.user.id).write(parsed.data),'OK','LIBRARY_EVENT_SAVED');}
    catch(error){return fail(res,'Action non confirmée. Réessaie avec le même choix.',error instanceof ProfileError?error.status:503,error instanceof ProfileError?error.code:'LIBRARY_WRITE_UNAVAILABLE');}
  });

  router.get('/food-guidance',limiter,async(req,res)=>{
    if(!req.user?.id||!req.supabaseClient)return fail(res,'Unauthorized',401,'UNAUTHORIZED');
    try{return ok(res,await new FoodGuidanceService().read(req.user.id,req.supabaseClient),'OK','FOOD_GUIDANCE_OK');}
    catch{return fail(res,'Les conseils liés au stock ne peuvent pas être vérifiés. Réessaie.',503,'FOOD_GUIDANCE_UNAVAILABLE');}
  });

  router.post('/suggest', limiter, async (req, res) => {
    if (!req.user?.id || !req.supabaseClient) {
      return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    }
    const parsed = SuggestRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return fail(res, 'Invalid body', 400, 'INVALID_BODY');
    }

    try {
      const userClient = req.supabaseClient as SupabaseClient<Database>;
      const eventWriter = new RecommendationEventWriter(userClient, adminClient);
      const result = await engine.suggestForUser(
        {
          userId: req.user.id,
          userClient,
          eventWriter, memoryService,
        },
        parsed.data,
      );
      return ok(res, result, 'OK', 'RECOMMENDATIONS_OK');
    } catch (err) {
      return fail(res,'Les recommandations ne peuvent pas être vérifiées. Réessayez.',err instanceof ProfileError ? err.status : 503,err instanceof ProfileError ? err.code : 'RECOMMENDATIONS_FAILED');
    }
  });

  router.post('/feedback',limiter,async(req,res)=>{
    if (!req.user?.id || !req.supabaseClient) return fail(res,'Unauthorized',401,'UNAUTHORIZED');
    const parsed=RecommendationFeedbackSchema.safeParse(req.body);
    if (!parsed.success) return fail(res,'Retour invalide.',400,'INVALID_BODY');
    try {
      const client=req.supabaseClient as SupabaseClient;
      const { data,error }=await client.rpc('record_recommendation_feedback',{ p_feedback:parsed.data });
      if (error) profileDatabaseError(error);
      if (!data?.id) throw new ProfileError('FEEDBACK_UNAVAILABLE',503);
      return ok(res,data,'OK','FEEDBACK_SAVED');
    } catch (error) { return fail(res,'Retour non confirmé. Réessayez.',error instanceof ProfileError ? error.status : 503,error instanceof ProfileError ? error.code : 'FEEDBACK_UNAVAILABLE'); }
  });
  router.post('/evaluate',userRateLimit({ key:'recommendations.evaluate',freeMax:60,premiumMax:600,windowMs:HOUR }),async(req,res)=>{
    if (!req.user?.id || !req.supabaseClient) return fail(res,'Unauthorized',401,'UNAUTHORIZED');
    const parsed=RecipeEvaluationInputSchema.safeParse(req.body);
    if (!parsed.success) return fail(res,'Recette ou portions invalides.',400,'INVALID_BODY');
    try {
      const result=await engine.evaluateForUser({ userId:req.user.id,userClient:req.supabaseClient },parsed.data);
      const checked=RecipeEvaluationSchema.safeParse(result);
      if (!checked.success) return fail(res,'Les informations de cette recette ne peuvent pas être vérifiées.',503,'RECIPE_EVALUATION_FAILED');
      return ok(res,checked.data,'OK','RECIPE_EVALUATION_OK');
    } catch (error) {
      return fail(res,error instanceof ProfileError && error.status===404 ? 'Cette recette est absente ou inaccessible.' : 'Les informations de cette recette ne peuvent pas être vérifiées. Réessayez.',
        error instanceof ProfileError ? error.status : 503,error instanceof ProfileError ? error.code : 'RECIPE_EVALUATION_FAILED');
    }
  });
  return router;
}
