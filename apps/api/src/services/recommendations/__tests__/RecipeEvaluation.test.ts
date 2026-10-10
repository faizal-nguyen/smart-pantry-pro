import { emptyNutritionProfile, RecipeEvaluationSchema } from '@smart/shared';
import { RecommendationEngine } from '../RecommendationEngine.js';

const OWNER = '00000000-0000-4000-8000-000000000001';
const OTHER = '00000000-0000-4000-8000-000000000002';
const ID = '10000000-0000-4000-8000-000000000001';
const PRODUCT = '20000000-0000-4000-8000-000000000001';
const NOW = new Date('2026-10-09T12:00:00Z');
type Row = Record<string, any>;

function setup(overrides: Record<string, Row[]> = {}) {
  const ingredient = { ingredient_name: 'Riz', quantity: 100, unit: 'g', inventory_product_id: PRODUCT, is_essential: true };
  const catalog = { id: ID, title: 'Riz catalogue', photo_url: '/catalog.jpg', servings: 2, prep_time: 5, cook_time: 15, rest_time: 5,
    ingredients_json: [ingredient], instructions: '["Cuire le riz."]', created_at: NOW.toISOString(), updated_at: NOW.toISOString() };
  const tables: Record<string, Row[]> = {
    recipes: [{ id: ID, user_id: OWNER, is_public: false, name: 'Riz personnel', servings: 2, prep_time: 5, cook_time: 15, rest_time: 5,
      image_url: '/legacy.jpg', recipe_ingredients: [ingredient], created_at: NOW.toISOString() }],
    user_recipes: [{ id: ID, user_id: OWNER, recipe_id: ID, is_from_catalog: true, catalog_recipe: catalog,
      custom_photo_url: ' /personal.jpg ', created_at: NOW.toISOString(), updated_at: NOW.toISOString() }],
    recipes_catalog: [catalog],
    nutrition_profiles: [{ user_id: OWNER, version: 1, schema_version: 1, origin: 'explicit', updated_at: NOW.toISOString(),
      settings: { ...emptyNutritionProfile(), consent: true } }],
    inventory: [{ id: 'lot', user_id: OWNER, product_id: PRODUCT, quantity: 125, unit: 'g', stock_version: 1,
      date_kind: 'best_before', expiry_date: '2026-12-01', quantity_quality: 'measured', products: { name: 'Riz' } }],
    products: [{ id: PRODUCT, name: 'Riz', nutrition_json: { source: 'manual', per100g: { energyKcal: 200, proteinG: 4, fiberG: 0 } },
      updated_at: '2026-10-08T12:00:00Z', off_last_synced_at: '2025-01-01T12:00:00Z' }],
    ...overrides,
  };
  const reads: string[] = [];
  const client = { from: jest.fn((table: string) => {
    reads.push(table);
    let rows = [...(tables[table] ?? [])];
    const query: any = {
      select: () => query,
      eq: (key: string, value: unknown) => { rows = rows.filter(row => row[key] === value); return query; },
      in: (key: string, values: unknown[]) => { rows = rows.filter(row => values.includes(row[key])); return query; },
      is: (key: string, value: unknown) => { rows = rows.filter(row => (row[key] ?? null) === value); return query; },
      or: (filter: string) => {
        expect(filter).toBe('user_id.eq.' + OWNER + ',is_public.eq.true');
        rows = rows.filter(row => row.user_id === OWNER || row.is_public === true); return query;
      },
      order: () => query,
      limit: (count: number) => { rows = rows.slice(0, count); return query; },
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve, reject),
    };
    return query;
  }), rpc: jest.fn(() => { throw new Error('Read-only evaluation must not call RPC'); }) };
  const serviceClient = { from: jest.fn(() => { throw new Error('Must use RLS client'); }) };
  const ctx = { userId: OWNER, userClient: client as any, serviceClient: serviceClient as any, now: NOW };
  const engine = new RecommendationEngine();
  return { tables, reads, client, serviceClient, ctx, engine };
}

test.each(['recipes', 'user_recipes', 'recipes_catalog'] as const)('evaluates the exact %s identity even when UUIDs collide, without writes', async source => {
  const { engine, ctx, client, serviceClient, reads } = setup();
  const result = await engine.evaluateForUser(ctx, { recipe: { id: ID, source }, servings: 2 });
  expect(RecipeEvaluationSchema.safeParse(result).success).toBe(true);
  expect(result.reference).toEqual({ id: ID, source });
  expect(result.duration_minutes).toBe(25);
  expect(result.nutrition.per_serving).toEqual({ energyKcal: 100, proteinG: 2, fiberG: 0 });
  expect(result.nutrition.sources[0]).toMatchObject({ source: 'manual', updated_at: '2026-10-08T12:00:00Z' });
  expect(client.rpc).not.toHaveBeenCalled();
  expect(serviceClient.from).not.toHaveBeenCalled();
  expect(reads).not.toContain('recipe_interactions');
  expect(reads).not.toContain('cooking_journal_entries');
});

test('a specific recipe outside the first 200 candidates and top three is still evaluable', async () => {
  const { tables, engine, ctx } = setup({ user_recipes: [], recipes_catalog: [] });
  const target = tables.recipes[0];
  tables.recipes = [...Array.from({ length: 200 }, (_, index) => ({ ...target, id: 'other-' + index })), target];
  const suggestions = await engine.suggestForUser(ctx, { servings: 2 });
  expect([...suggestions.cookable_now, ...suggestions.almost_cookable, ...suggestions.verify_suggestions]).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: ID })]));
  expect((await engine.evaluateForUser(ctx, { recipe: { id: ID, source: 'recipes' }, servings: 2 })).reference.id).toBe(ID);
});

test.each(['recipes', 'user_recipes'] as const)('foreign private %s returns the same absence error', async source => {
  const { tables, engine, ctx } = setup();
  tables[source][0].user_id = OTHER;
  await expect(engine.evaluateForUser(ctx, { recipe: { id: ID, source }, servings: 2 })).rejects.toMatchObject({ status: 404, code: 'RECIPE_NOT_FOUND' });
});

test('an accessible public legacy recipe is evaluable; an absent reference never falls back to another origin', async () => {
  const { tables, engine, ctx } = setup();
  tables.recipes[0].user_id = OTHER; tables.recipes[0].is_public = true;
  await expect(engine.evaluateForUser(ctx, { recipe: { id: ID, source: 'recipes' }, servings: 2 })).resolves.toMatchObject({ reference: { source: 'recipes' } });
  tables.user_recipes = [];
  await expect(engine.evaluateForUser(ctx, { recipe: { id: ID, source: 'user_recipes' }, servings: 2 })).rejects.toMatchObject({ status: 404 });
});

test('personal photo, replacement ingredients and multiplier agree in the detail and suggestions', async () => {
  const { tables, engine, ctx } = setup();
  tables.nutrition_profiles[0].settings.allergies = ['lait'];
  const row = tables.user_recipes[0];
  row.catalog_recipe.ingredients_json = [{ ingredient_name: 'Beurre', quantity: 100, unit: 'g' }];
  row.custom_modifications = { ingredients_override: [{ ingredient_name: 'Riz', quantity: 100, unit: 'g', inventory_product_id: PRODUCT }], servings_multiplier: 2 };
  const specific = await engine.evaluateForUser(ctx, { recipe: { id: ID, source: 'user_recipes' }, servings: 2 });
  const suggested = await engine.suggestForUser(ctx, { servings: 2 });
  const candidate = [...suggested.cookable_now, ...suggested.almost_cookable, ...suggested.verify_suggestions].find(item => item.reference?.source === 'user_recipes')!;
  expect(candidate.image_url).toBe('/personal.jpg');
  expect(specific.base_servings).toBe(4);
  expect(specific.constraints.status).toBe('compatible');
  for (const key of ['reference', 'servings', 'availability', 'constraints', 'nutrition', 'duration_minutes', 'stock_version', 'profile_version'] as const) expect(candidate[key]).toEqual(specific[key]);
  expect(specific.availability.allocations[0].quantity).toBe(100);
  const more = await engine.evaluateForUser(ctx, { recipe: { id: ID, source: 'user_recipes' }, servings: 4 });
  expect(more.availability.status).toBe('missing');
  expect(more.nutrition).toEqual(specific.nutrition); // scaling the recipe and its portions preserves values per portion.
});

test('unknown base portions remain unknown instead of four and cannot produce stock allocations or macros', async () => {
  const { tables, engine, ctx } = setup();
  Object.assign(tables.user_recipes[0], { is_from_catalog: false, custom_title: 'Riz sans métadonnées', custom_ingredients_json: tables.recipes_catalog[0].ingredients_json });
  const result = await engine.evaluateForUser(ctx, { recipe: { id: ID, source: 'user_recipes' }, servings: 2 });
  expect(result.base_servings).toBeNull(); expect(result.duration_minutes).toBeNull();
  expect(result.availability.status).toBe('verify'); expect(result.availability.allocations).toEqual([]);
  expect(result.nutrition.per_serving.energyKcal).toBeNull();
});

test('one missing macro stays null and partial, while an explicit zero and manual provenance survive', async () => {
  const { tables, engine, ctx } = setup();
  delete tables.products[0].nutrition_json.per100g.proteinG;
  const result = await engine.evaluateForUser(ctx, { recipe: { id: ID, source: 'recipes' }, servings: 2 });
  expect(result.nutrition).toMatchObject({ status: 'partial', per_serving: { energyKcal: 100, proteinG: null, fiberG: 0 } });
  expect(result.nutrition.sources[0].source).toBe('manual');
  expect(result.nutrition.sources[0].updated_at).not.toBe(tables.products[0].off_last_synced_at);
});

test('the stock fingerprint and recipe evidence change after authoritative writes', async () => {
  const { tables, engine, ctx } = setup();
  const input = { recipe: { id: ID, source: 'recipes' as const }, servings: 2 };
  const first = await engine.evaluateForUser(ctx, input);
  tables.inventory[0].quantity = 50; tables.inventory[0].stock_version++;
  tables.recipes[0].recipe_ingredients = [{ ingredient_name: 'Sauce inconnue', quantity: null, unit: null }];
  tables.nutrition_profiles[0].settings.allergies = ['lait'];
  tables.nutrition_profiles[0].version = 2;
  const next = await engine.evaluateForUser(ctx, input);
  expect(next.stock_version).not.toBe(first.stock_version); expect(next.recipe_version).not.toBe(first.recipe_version);
  expect(next.profile_version).toBe(2); expect(next.constraints.status).toBe('verify');
  expect(next.nutrition.status).toBe('unavailable');
});
