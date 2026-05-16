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
 *   - `MemoryService` (PreferenceScorer V1 — PRP-226 PR6).
 */
import { Router } from 'express';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

import { ok, fail } from '../utils/responses.js';
import { userRateLimit } from '../middleware/userRateLimit.js';
import type { Database } from '../types/supabase.js';
import { RecommendationEngine } from '../services/recommendations/RecommendationEngine.js';
import { RecommendationEventWriter } from '../services/recommendations/RecommendationEventWriter.js';
import { MemoryService } from '../services/assistant/MemoryService.js';

const SuggestRequestSchema = z.object({
  goal: z
    .enum(['tonight', 'quick', 'anti_waste', 'light', 'high_protein', 'comfort', 'batch_cooking'])
    .optional(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  timeLimitMinutes: z.number().int().positive().max(600).optional(),
  servings: z.number().int().positive().max(20).optional(),
  query: z.string().max(200).optional(),
  almostThreshold: z.number().int().min(0).max(10).optional(),
  limitPerBucket: z.number().int().min(1).max(20).optional(),
  nearExpiryDays: z.number().int().min(1).max(30).optional(),
  includeRecentFallback: z.boolean().optional(),
});

const HOUR = 3_600_000;

export function createRecommendationsRouter(
  adminClient: SupabaseClient<Database>,
): Router {
  const router = Router();

  // Engine stateless → 1 instance partagée. Le writer + le memoryService
  // utilisent l'admin client, ils sont sûrs à partager aussi.
  const engine = new RecommendationEngine();
  const memoryService = new MemoryService(adminClient);

  const limiter = userRateLimit({
    key: 'recommendations.suggest',
    freeMax: 60,
    premiumMax: 600,
    windowMs: HOUR,
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
          eventWriter,
          memoryService,
        },
        parsed.data,
      );
      return ok(res, result, 'OK', 'RECOMMENDATIONS_OK');
    } catch (err) {
      console.error('[recommendations.suggest] error:', err);
      return fail(res, 'Internal error', 500, 'RECOMMENDATIONS_FAILED');
    }
  });

  return router;
}
