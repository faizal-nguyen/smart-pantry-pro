import express from 'express';
import request from 'supertest';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createRecommendationsRouter } from '../recommendations.routes.js';
import { RecommendationEngine } from '../../services/recommendations/RecommendationEngine.js';
import { ProfileError } from '../../services/recommendations/NutritionProfileService.js';

jest.mock('../../middleware/userRateLimit.js', () => ({ userRateLimit: () => (_req: unknown, _res: unknown, next: () => void) => next() }));
const OWNER = '00000000-0000-4000-8000-000000000001';
const ID = '10000000-0000-4000-8000-000000000001';
const input = { recipe: { id: ID, source: 'user_recipes' }, servings: 2 };
function evidence() {
  return { reference: input.recipe, servings: 2, base_servings: 4, recipe_version: 'recipe-v1', profile_version: 1,
    stock_version: 'stock-v1', calculated_at: '2026-10-09T12:00:00Z', duration_minutes: null,
    constraints: { status: 'verify', findings: [], registry_version: 'test', limitations: [] },
    availability: { status: 'verify', missing: [], allocations: [], uncertainties: ['Quantité à vérifier.'], excluded_lots: [] },
    nutrition: { status: 'unavailable', coverage: 0, known_ingredients: 0, total_ingredients: 1,
      per_serving: { energyKcal: null, proteinG: null, fiberG: null }, sources: [], limitations: [] } };
}
function appFor(signedIn = true) {
  const userClient = { from: jest.fn(), rpc: jest.fn() } as unknown as SupabaseClient;
  const adminClient = { from: jest.fn(), rpc: jest.fn() } as unknown as SupabaseClient;
  const app = express(); app.use(express.json());
  app.use((req, _res, next) => { if (signedIn) { req.user = { id: OWNER } as User; req.supabaseClient = userClient; } next(); });
  app.use('/api/v1/recommendations', createRecommendationsRouter(adminClient as any));
  return { app, userClient, adminClient };
}
afterEach(() => jest.restoreAllMocks());
test('authentication and a strict concrete recipe contract are mandatory', async () => {
  const evaluate = jest.spyOn(RecommendationEngine.prototype, 'evaluateForUser').mockResolvedValue(evidence() as any);
  await request(appFor(false).app).post('/api/v1/recommendations/evaluate').send(input).expect(401);
  for (const body of [{ ...input, user_id: OWNER }, { ...input, recipe: { ...input.recipe, source: 'auto' } }, { ...input, servings: 0 }, { ...input, servings: 101 }]) {
    await request(appFor().app).post('/api/v1/recommendations/evaluate').send(body).expect(400);
  }
  expect(evaluate).not.toHaveBeenCalled();
});
test('evaluation receives the session owner and RLS client and returns versioned unknown values', async () => {
  const evaluate = jest.spyOn(RecommendationEngine.prototype, 'evaluateForUser').mockResolvedValue(evidence() as any);
  const { app, userClient, adminClient } = appFor();
  const result = await request(app).post('/api/v1/recommendations/evaluate').send(input).expect(200);
  expect(evaluate).toHaveBeenCalledWith({ userId: OWNER, userClient }, input);
  expect(result.body.data.nutrition.per_serving.energyKcal).toBeNull();
  expect(result.body.data.profile_version).toBe(1);
  expect(adminClient.from).not.toHaveBeenCalled(); expect(userClient.rpc).not.toHaveBeenCalled();
});
test('absence, database failure and malformed results stay distinct and do not leak diagnostics', async () => {
  const evaluate = jest.spyOn(RecommendationEngine.prototype, 'evaluateForUser');
  evaluate.mockRejectedValueOnce(new ProfileError('RECIPE_NOT_FOUND', 404));
  const missing = await request(appFor().app).post('/api/v1/recommendations/evaluate').send(input).expect(404);
  expect(missing.body.code).toBe('RECIPE_NOT_FOUND');
  evaluate.mockRejectedValueOnce(new Error('SQL diagnostic privé allergie lait'));
  const failed = await request(appFor().app).post('/api/v1/recommendations/evaluate').send(input).expect(503);
  expect(failed.body.code).toBe('RECIPE_EVALUATION_FAILED'); expect(JSON.stringify(failed.body)).not.toContain('diagnostic');
  evaluate.mockResolvedValueOnce({} as any);
  await request(appFor().app).post('/api/v1/recommendations/evaluate').send(input).expect(503);
});
