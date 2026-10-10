import { postRecipeEvaluation } from '../recommendationsApi';
import { apiPost } from '@/lib/api';
import type { RecipeEvaluation } from '@smart/shared';
jest.mock('@/lib/api', () => ({ apiPost: jest.fn(), ApiError: class extends Error { code?: string; constructor(message: string, options: { code?: string }) { super(message); this.code = options.code; } } }));
const OWNER = '00000000-0000-4000-8000-000000000001';
const ID = '10000000-0000-4000-8000-000000000001';
const input = { recipe: { id: ID, source: 'recipes' as const }, servings: 2 };
export function fixtureEvaluation(): RecipeEvaluation {
  return { reference: input.recipe, servings: 2, base_servings: 4, recipe_version: 'v1', profile_version: 1, stock_version: 'v1', calculated_at: '2026-10-09T12:00:00Z', duration_minutes: 25,
    constraints: { status: 'compatible', findings: [], registry_version: 'test', limitations: [] },
    availability: { status: 'available', missing: [], allocations: [], uncertainties: [], excluded_lots: [] },
    nutrition: { status: 'partial', coverage: 1, known_ingredients: 1, total_ingredients: 1, per_serving: { energyKcal: 100, proteinG: null, fiberG: 0 },
      sources: [{ product_id: 'rice', source: 'manual', updated_at: '2026-10-08T12:00:00Z', base: '100g' }], limitations: ['Différences cru/cuit non documentées.'] } };
}
beforeEach(() => jest.clearAllMocks());
test('the response preserves unknown and zero values and propagates cancellation and account ownership', async () => {
  const signal = new AbortController().signal;
  jest.mocked(apiPost).mockResolvedValue(fixtureEvaluation());
  expect((await postRecipeEvaluation(input, OWNER, signal)).nutrition.per_serving).toEqual({ energyKcal: 100, proteinG: null, fiberG: 0 });
  expect(apiPost).toHaveBeenCalledWith('/v1/recommendations/evaluate', input, { expectedUserId: OWNER, signal });
});
test.each([{ reference: { id: ID, source: 'user_recipes' } }, { reference: { id: OWNER, source: 'recipes' } }, { servings: 4 }, { nutrition: {} }])('a stale or malformed evaluation cannot be displayed as this recipe: %j', async replacement => {
  jest.mocked(apiPost).mockResolvedValue({ ...fixtureEvaluation(), ...replacement });
  await expect(postRecipeEvaluation(input, OWNER)).rejects.toMatchObject({ code: 'INVALID_RECIPE_EVALUATION' });
});
