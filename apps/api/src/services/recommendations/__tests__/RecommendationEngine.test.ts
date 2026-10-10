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

import { emptyNutritionProfile } from '@smart/shared';
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
  library?: unknown[];
  contextRevision?: number | null;
  profile?:unknown;
}

function makeClient(plan: MockPlan & { interactions?: unknown[] }) {
  const builder = (table: string) => {
    let data: unknown[] = [];
    if (table === 'recipes') data = plan.recipes;
    else if (table === 'inventory') data = plan.inventory;
    else if (table === 'recipe_interactions') data = plan.interactions ?? [];
    else if (table === 'user_recipes') data = plan.library ?? [];
    const chain: any = {
      select() {
        return chain;
      },
      eq() {
        return chain;
      },
      in() {
        return chain;
      },
      is() { return chain; },
      gte() {
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
      maybeSingle() { return Promise.resolve({ data: table==='nutrition_profiles' ? plan.profile ?? null : null,error:null }); },
      then(resolve: (v: unknown) => unknown, reject?: (v: unknown) => unknown) {
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      },
    };
    return chain;
  };
  return {
    from: (table: string) => builder(table),
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
      unit: "g",
      inventory_product_id: i.pid,
      is_essential: true,
    })),
  };
}

function makeInvRow(pid: string, qty: number, expiry: string | null = null) {
  return { id: `lot-${pid}`, product_id: pid, quantity: qty, unit: "g", stock_version: 0, expiry_date: expiry ?? isoPlusDays(60), date_kind:'best_before',quantity_quality:'measured', products: null };
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
  it('retains customized library identity and checks kg/g for the requested portions', async () => {
    const { engine, ctx } = buildEngine({ recipes: [], inventory: [{ ...makeInvRow('p',.3), unit: 'kg' }], library: [{
      id: 'wrapper', user_id: USER, is_from_catalog: true, created_at: '', updated_at: '',
      catalog_recipe: { id: 'canonical', title: 'Base', servings: 4, created_at: '', updated_at: '' },
      custom_modifications: { title: 'Mon pain', servings_multiplier: 2, ingredients_override: [{ name: 'Farine', amount: '200', unit: 'g', inventory_product_id: 'p' }] },
    }] });
    const forFour = await engine.suggestForUser(ctx,{ servings: 4 });
    expect(forFour.cookable_now[0]).toMatchObject({ id: 'wrapper', name: 'Mon pain', servings: 4, missing_count: 0 });
    const forEight = await engine.suggestForUser(ctx,{ servings: 8 });
    expect(forEight.cookable_now).toHaveLength(0);
    expect(forEight.almost_cookable[0]).toMatchObject({ id: 'wrapper', missing_count: 1 });
  });
  it('never reuses a cookable result from an older stock context revision', async () => {
    const plan: MockPlan = { recipes: [makeRecipe({ id: 'recipe', name: 'Pain', ings: [{ pid: 'p', qty: 200 }] })], inventory: [makeInvRow('p',200)], contextRevision: 1 };
    const cache = new Map();
    const writer = { readCache: jest.fn(async (_userId: string,key: string) => ({ hit: cache.get(key) ?? null, expired: false })),
      writeCache: jest.fn(async (input: { cacheKey: string; payload: unknown }) => { cache.set(input.cacheKey,{ result: input.payload }); }),
      recordEvent: jest.fn(async () => 'event'),
    };
    const ctx = { userId: USER, userClient: makeClient(plan) as any, now: NOW, eventWriter: writer as any };
    const engine = new RecommendationEngine();
    expect((await engine.suggestForUser(ctx,{})).cookable_now).toHaveLength(1);
    plan.contextRevision = 2; plan.inventory = [makeInvRow('p',0)];
    expect((await engine.suggestForUser(ctx,{})).cookable_now).toHaveLength(0);
    const keys=writer.readCache.mock.calls.map(call=>call[1]);
    expect(keys.every(key=>key.startsWith('v10-03a:'))).toBe(true);
    expect(keys[0]).not.toBe(keys[1]);
    plan.contextRevision = null;
    expect((await engine.suggestForUser(ctx,{})).cookable_now).toHaveLength(0);
    expect(writer.readCache).toHaveBeenCalledTimes(3);
  });
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
    expect(result.cookable_now[0].reasons).toContain('Quantités et lots utilisables renseignés pour les portions demandées.');
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
    expect(result.almost_cookable[0].reasons.some((r) => r.includes('acheter'))).toBe(true);
  });

  it('reports quantified ingredients without a matching product as missing', async () => {
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
    expect(result.almost_cookable[0].availability.missing[0]).toMatchObject({ reason:'NOT_IN_STOCK',ingredient_name:'Truc' });
    expect(result.almost_cookable[0].unlinked_count).toBe(0);
    expect(result.almost_cookable[0].reasons.some((r) => r.includes('vérifier'))).toBe(true);
  });

  it('surfaces recipes without essentials only as requiring verification', async () => {
    const recipe = makeRecipe({ id: 'r-noing', name: 'Pas d ingredients', ings: [] });
    const { engine, ctx } = buildEngine({ recipes: [recipe], inventory: [] });
    const result = await engine.suggestForUser(ctx, {});
    expect(result.cookable_now).toHaveLength(0);
    expect(result.almost_cookable).toHaveLength(0);
    expect(result.verify_suggestions!.map(r=>r.id)).toEqual(['r-noing']);
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

// ---- PRP-226 PR6 — PreferenceScorer V1 wiring ----------------------

describe('RecommendationEngine — explicit preference and feedback wiring', () => {
  function buildEngineWithMemories(opts: {
    recipes: unknown[];
    inventory: unknown[];
    interactions?: unknown[];
    memories?: Array<{
      id: string;
      kind: string;
      content: string;
      normalized_content?: string | null;
      sensitivity?: string;
      subject_type?: string | null;
      subject_id?: string | null;
    }>;
  }) {
    const client = makeClient({
      recipes: opts.recipes,
      inventory: opts.inventory,
      interactions: opts.interactions,
      profile:{ user_id:USER,version:1,schema_version:1,settings:{ ...emptyNutritionProfile(),consent:true,likedIngredients:(opts.memories ?? []).filter(item=>item.kind==='preference').map(item=>item.content),avoidedIngredients:(opts.memories ?? []).filter(item=>item.kind==='negative_preference').map(item=>item.content) },updated_at:NOW.toISOString(),origin:'explicit' },
    });
    const memoryService = {
      async getTopActiveMemories() {
        return (opts.memories ?? []).map((m) => ({
          ...m,
          normalized_content: m.normalized_content ?? null,
          sensitivity: m.sensitivity ?? 'normal',
          subject_type: m.subject_type ?? null,
          subject_id: m.subject_id ?? null,
        }));
      },
    };
    return {
      engine: new RecommendationEngine(),
      ctx: {
        userId: USER,
        userClient: client as any,
        memoryService: memoryService as any,
        now: NOW,
      },
    };
  }

  it('positive preference re-ranks the matching recipe ahead of a neutral one', async () => {
    const { engine, ctx } = buildEngineWithMemories({
      recipes: [
        makeRecipe({ id: 'r-pasta', name: 'Pasta carbonara', ings: [{ pid:'p-pates',name:'Pasta' }] }),
        makeRecipe({ id: 'r-quinoa', name: 'Quinoa bowl', ings: [{ pid: 'p-quinoa' }] }),
      ],
      inventory: [makeInvRow('p-pates', 5), makeInvRow('p-quinoa', 5)],
      memories: [
        { id: 'm1', kind: 'preference', content: 'pasta' },
      ],
    });
    const result = await engine.suggestForUser(ctx, {});
    const ids = result.cookable_now.map((r) => r.id);
    expect(ids).toEqual(['r-pasta', 'r-quinoa']);
    const pasta = result.cookable_now[0];
    expect(pasta.score_parts.preferenceMatch).toBeGreaterThan(0);
    expect(pasta.reasons.some((r) => r.toLowerCase().includes('pasta'))).toBe(true);
  });

  it('negative_preference flips the ranking even when the recipe is cookable', async () => {
    const { engine, ctx } = buildEngineWithMemories({
      recipes: [
        makeRecipe({ id: 'r-fish', name: 'Saumon grillé', ings: [{ pid:'p-saumon',name:'Saumon' }] }),
        makeRecipe({ id: 'r-veg', name: 'Légumes rôtis', ings: [{ pid: 'p-leg' }] }),
      ],
      inventory: [makeInvRow('p-saumon', 5), makeInvRow('p-leg', 5)],
      memories: [
        { id: 'm1', kind: 'negative_preference', content: 'saumon' },
      ],
    });
    const result = await engine.suggestForUser(ctx, {});
    const ids = result.cookable_now.map((r) => r.id);
    expect(ids[0]).toBe('r-veg');
    const fish = result.cookable_now.find((r) => r.id === 'r-fish');
    expect(fish?.score_parts.preferenceMatch).toBeLessThan(0);
  });

  it('recent dismissed interaction penalises that specific recipe only', async () => {
    const { engine, ctx } = buildEngineWithMemories({
      recipes: [
        makeRecipe({ id: 'r-a', name: 'Recette A', ings: [{ pid: 'p-1' }] }),
        makeRecipe({ id: 'r-b', name: 'Recette B', ings: [{ pid: 'p-1' }] }),
      ],
      inventory: [makeInvRow('p-1', 10)],
      interactions: [
        {
          recipe_id: 'r-a',
          interaction_type: 'dismissed',feedback:'too_long',
          created_at: new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    });
    const result = await engine.suggestForUser(ctx, {});
    const ids = result.cookable_now.map((r) => r.id);
    expect(ids[0]).toBe('r-b');
    const dismissed = result.cookable_now.find((r) => r.id === 'r-a');
    expect(dismissed?.score_parts.preferenceMatch).toBeLessThan(0);
  });

  it('engine still scores recipes when no memoryService is wired (PR2 path preserved)', async () => {
    // Same buildEngine shape as the existing PR2 tests — no
    // memoryService, no interactions. Preference must default to 0.
    const { engine, ctx } = buildEngine({
      recipes: [makeRecipe({ id: 'r-pasta', name: 'Pasta', ings: [{ pid: 'p-1' }] })],
      inventory: [makeInvRow('p-1', 5)],
    });
    const result = await engine.suggestForUser(ctx, {});
    expect(result.cookable_now[0].score_parts.preferenceMatch).toBe(0);
  });
});
