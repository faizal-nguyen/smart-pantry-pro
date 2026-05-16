/**
 * PRP-226 PR2 — RecommendationEngine integration tests.
 *
 * Covers : bucket assignment, score ordering, recent fallback,
 * anti_waste goal boost, quick goal time filter, deterministic
 * output with fixed `now`, no LLM dependency.
 *
 * Mocks the Supabase client at the chain-builder level (pattern
 * mirroring `read.test.ts`).
 */

import { RecommendationEngine } from '../RecommendationEngine.js';
import type { RecommendationContext } from '../types.js';

const USER = '11111111-1111-1111-1111-111111111111';
const NOW = new Date('2026-05-17T10:00:00Z');

function isoPlusDays(days: number): string {
  return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

interface MockPlan {
  recipes: unknown[];
  inventory: unknown[];
}

function makeClient(plan: MockPlan) {
  const builder = (table: 'recipes' | 'inventory') => {
    const data = table === 'recipes' ? plan.recipes : plan.inventory;
    const chain: any = {
      select() {
        return chain;
      },
      eq() {
        return chain;
      },
      ilike() {
        return chain;
      },
      order() {
        return chain;
      },
      limit() {
        return chain;
      },
      then(resolve: (v: unknown) => unknown, reject?: (v: unknown) => unknown) {
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      },
    };
    return chain;
  };
  return {
    from: (table: string) => builder(table as 'recipes' | 'inventory'),
  };
}

function makeRecipe(opts: {
  id: string;
  name: string;
  prep?: number;
  cook?: number;
  mealType?: string | null;
  ings: Array<{ pid: string | null; qty?: number; name?: string }>;
  createdAt?: string;
}) {
  return {
    id: opts.id,
    name: opts.name,
    description: null,
    prep_time: opts.prep ?? 10,
    cook_time: opts.cook ?? 0,
    servings: 2,
    image_url: null,
    cuisine_category: null,
    meal_type: opts.mealType ?? null,
    tags: null,
    created_at: opts.createdAt ?? '2026-05-15T00:00:00Z',
    recipe_ingredients: opts.ings.map((i, idx) => ({
      id: `${opts.id}-i${idx}`,
      ingredient_name: i.name ?? `ing-${idx}`,
      quantity: i.qty ?? 1,
      inventory_product_id: i.pid,
      is_essential: true,
    })),
  };
}

function makeInvRow(pid: string, qty: number, expiry: string | null = null) {
  return { product_id: pid, quantity: qty, expiry_date: expiry, products: null };
}

function buildEngine(plan: MockPlan) {
  const client = makeClient(plan);
  return {
    engine: new RecommendationEngine(),
    ctx: {
      userId: USER,
      userClient: client as any,
      now: NOW,
    },
  };
}

describe('RecommendationEngine — bucket assignment', () => {
  it('routes a fully cookable recipe into cookable_now', async () => {
    const { engine, ctx } = buildEngine({
      recipes: [
        makeRecipe({
          id: 'r-now',
          name: 'Tomate-mozza',
          ings: [
            { pid: 'p-tomate', qty: 2 },
            { pid: 'p-mozza', qty: 100 },
          ],
        }),
      ],
      inventory: [
        makeInvRow('p-tomate', 5),
        makeInvRow('p-mozza', 200),
      ],
    });
    const result = await engine.suggestForUser(ctx, {});
    expect(result.cookable_now.map((r) => r.id)).toEqual(['r-now']);
    expect(result.cookable_now[0].score_total).toBeGreaterThan(50);
    expect(result.cookable_now[0].reasons).toContain('Tu as tout en stock');
    expect(result.almost_cookable).toHaveLength(0);
  });

  it('routes a recipe with 1 missing ingredient into almost_cookable', async () => {
    const { engine, ctx } = buildEngine({
      recipes: [
        makeRecipe({
          id: 'r-almost',
          name: 'Risotto',
          ings: [
            { pid: 'p-riz', qty: 200, name: 'Riz' },
            { pid: 'p-bouillon', qty: 1, name: 'Bouillon' },
          ],
        }),
      ],
      inventory: [makeInvRow('p-riz', 500)],
    });
    const result = await engine.suggestForUser(ctx, {});
    expect(result.almost_cookable.map((r) => r.id)).toEqual(['r-almost']);
    expect(result.almost_cookable[0].missing_count).toBe(1);
    expect(result.almost_cookable[0].missing_ingredients).toEqual(['Bouillon']);
    expect(result.almost_cookable[0].reasons.some((r) => r.includes('manquant'))).toBe(true);
  });

  it('keeps recipes with unlinked essentials in almost_cookable as unknown', async () => {
    const { engine, ctx } = buildEngine({
      recipes: [
        makeRecipe({
          id: 'r-legacy',
          name: 'Vieille recette',
          ings: [{ pid: null, name: 'Truc' }],
        }),
      ],
      inventory: [],
    });
    const result = await engine.suggestForUser(ctx, {});
    expect(result.almost_cookable.map((r) => r.id)).toEqual(['r-legacy']);
    expect(result.almost_cookable[0].unlinked).toBe(true);
    expect(result.almost_cookable[0].unlinked_count).toBe(1);
    expect(result.almost_cookable[0].reasons.some((r) => r.includes('à vérifier'))).toBe(true);
  });

  it('surfaces recipes without essentials only in recent_suggestions', async () => {
    const recipe = makeRecipe({ id: 'r-noing', name: 'Pas d ingredients', ings: [] });
    const { engine, ctx } = buildEngine({ recipes: [recipe], inventory: [] });
    const result = await engine.suggestForUser(ctx, {});
    expect(result.cookable_now).toHaveLength(0);
    expect(result.almost_cookable).toHaveLength(0);
    expect(result.recent_suggestions.map((r) => r.id)).toEqual(['r-noing']);
  });
});

describe('RecommendationEngine — anti_waste boost', () => {
  it('ranks an expiring recipe higher than an in-stock one when goal=anti_waste', async () => {
    const { engine, ctx } = buildEngine({
      recipes: [
        // Both fully cookable, but r-expire uses a near-expiry product.
        makeRecipe({
          id: 'r-stable',
          name: 'Stable',
          ings: [{ pid: 'p-stable', qty: 1, name: 'Conserve' }],
        }),
        makeRecipe({
          id: 'r-expire',
          name: 'Use it now',
          ings: [{ pid: 'p-expire', qty: 1, name: 'Yaourt' }],
        }),
      ],
      inventory: [
        makeInvRow('p-stable', 5, null),
        makeInvRow('p-expire', 5, isoPlusDays(1)),
      ],
    });
    const ctxGoal: RecommendationContext = { goal: 'anti_waste' };
    const result = await engine.suggestForUser(ctx, ctxGoal);
    expect(result.cookable_now[0].id).toBe('r-expire');
    expect(result.cookable_now[0].expiring_ingredients_used?.length).toBeGreaterThan(0);
  });
});

describe('RecommendationEngine — quick goal time filter', () => {
  it('drops recipes that exceed max_prep_time from every bucket', async () => {
    const { engine, ctx } = buildEngine({
      recipes: [
        makeRecipe({
          id: 'r-fast',
          name: 'Express',
          prep: 5,
          cook: 5,
          ings: [{ pid: 'p-1', qty: 1 }],
        }),
        makeRecipe({
          id: 'r-slow',
          name: 'Longue cuisson',
          prep: 30,
          cook: 60,
          ings: [{ pid: 'p-1', qty: 1 }],
        }),
      ],
      inventory: [makeInvRow('p-1', 10)],
    });
    const result = await engine.suggestForUser(ctx, { timeLimitMinutes: 20 });
    expect(result.cookable_now.map((r) => r.id)).toEqual(['r-fast']);
    expect(result.recent_suggestions.map((r) => r.id)).not.toContain('r-slow');
  });
});

describe('RecommendationEngine — determinism', () => {
  it('returns identical results across two calls with the same `now` and data', async () => {
    const plan = {
      recipes: [
        makeRecipe({
          id: 'r-a',
          name: 'Alpha',
          ings: [{ pid: 'p-1', qty: 1 }],
        }),
        makeRecipe({
          id: 'r-b',
          name: 'Beta',
          ings: [{ pid: 'p-2', qty: 1 }],
        }),
      ],
      inventory: [makeInvRow('p-1', 1), makeInvRow('p-2', 1)],
    };
    const { engine, ctx } = buildEngine(plan);
    const r1 = await engine.suggestForUser(ctx, {});
    const r2 = await engine.suggestForUser(ctx, {});
    expect(r1.cookable_now.map((r) => r.id)).toEqual(r2.cookable_now.map((r) => r.id));
    expect(r1.cookable_now[0].score_total).toBe(r2.cookable_now[0].score_total);
  });
});

describe('RecommendationEngine — buckets cap + total count', () => {
  it('respects limit_per_bucket and reports total_user_recipes', async () => {
    const recipes = Array.from({ length: 8 }, (_, i) =>
      makeRecipe({
        id: `r-${i}`,
        name: `Recette ${i}`,
        ings: [{ pid: 'p-1', qty: 1 }],
      }),
    );
    const { engine, ctx } = buildEngine({
      recipes,
      inventory: [makeInvRow('p-1', 100)],
    });
    const result = await engine.suggestForUser(ctx, { limitPerBucket: 3 });
    expect(result.cookable_now).toHaveLength(3);
    expect(result.total_user_recipes).toBe(8);
  });
});

describe('RecommendationEngine — suggested_actions', () => {
  it('includes add_missing_to_shopping when a recipe has missing ingredients', async () => {
    const { engine, ctx } = buildEngine({
      recipes: [
        makeRecipe({
          id: 'r-mix',
          name: 'Mix',
          ings: [
            { pid: 'p-1', qty: 1 },
            { pid: 'p-2', qty: 1, name: 'Bouillon' },
          ],
        }),
      ],
      inventory: [makeInvRow('p-1', 5)],
    });
    const result = await engine.suggestForUser(ctx, {});
    const actions = result.almost_cookable[0]?.suggested_actions ?? [];
    expect(actions).toContain('add_missing_to_shopping');
    expect(actions).toContain('open_recipe');
  });

  it('does not include add_missing_to_shopping when nothing is missing', async () => {
    const { engine, ctx } = buildEngine({
      recipes: [
        makeRecipe({ id: 'r-ok', name: 'OK', ings: [{ pid: 'p-1', qty: 1 }] }),
      ],
      inventory: [makeInvRow('p-1', 5)],
    });
    const result = await engine.suggestForUser(ctx, {});
    const actions = result.cookable_now[0]?.suggested_actions ?? [];
    expect(actions).not.toContain('add_missing_to_shopping');
  });
});
