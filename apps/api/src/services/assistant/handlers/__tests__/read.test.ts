/**
 * Read-handler tests. Each handler is a thin wrapper around supabase-js
 * — we mock the builder to assert the right query shape and that the
 * flat output mirrors the SQL JOIN.
 */
import {
  ReadInventoryHandler,
  ReadShoppingListHandler,
  ReadRecentRecipesHandler,
  ReadMealPlanHandler,
  SearchRecipesHandler,
  FindCookableRecipesHandler,
  SuggestRecipesForContextHandler,
} from '../read.js';
import type { ToolExecutionContext } from '../types.js';

const USER = '11111111-1111-1111-1111-111111111111';

interface QueryCall {
  table: string;
  columns: string;
  filters: Array<{ kind: string; col?: string; val?: unknown }>;
  orders: Array<{ col: string; ascending?: boolean }>;
  limit?: number;
}

function makeClient(plan: {
  routes: Record<
    string,
    { data?: unknown; error?: { message: string } | null; maybeSingle?: boolean }
  >;
}) {
  const calls: QueryCall[] = [];

  const builder = (table: string) => {
    let columns = '';
    const filters: QueryCall['filters'] = [];
    const orders: QueryCall['orders'] = [];
    let limitVal: number | undefined;

    const buildResolvedRoute = () => plan.routes[table];

    const finalize = (asMaybeSingle = false) => {
      const route = buildResolvedRoute();
      calls.push({ table, columns, filters, orders, limit: limitVal });
      if (asMaybeSingle) {
        return Promise.resolve({
          data: Array.isArray(route?.data) ? (route.data[0] ?? null) : route?.data ?? null,
          error: route?.error ?? null,
        });
      }
      return Promise.resolve({ data: route?.data ?? [], error: route?.error ?? null });
    };

    const chain: any = {
      select(cols: string) {
        columns = cols;
        return chain;
      },
      eq(col: string, val: unknown) {
        filters.push({ kind: 'eq', col, val });
        return chain;
      },
      ilike(col: string, val: unknown) {
        filters.push({ kind: 'ilike', col, val });
        return chain;
      },
      gte(col: string, val: unknown) {
        filters.push({ kind: 'gte', col, val });
        return chain;
      },
      order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
        orders.push({ col, ascending: opts?.ascending });
        return chain;
      },
      limit(n: number) {
        limitVal = n;
        return chain;
      },
      maybeSingle() {
        return finalize(true);
      },
      // The handlers don't always end with a terminal — sometimes they
      // await the chain directly. Make the chain thenable so `await q`
      // resolves with finalize().
      then(resolve: (v: unknown) => unknown, reject?: (v: unknown) => unknown) {
        return finalize().then(resolve, reject);
      },
    };
    return chain;
  };

  return {
    client: {
      from: (table: string) => builder(table),
    },
    calls,
  };
}

function makeCtx(client: any): ToolExecutionContext {
  return {
    userId: USER,
    userClient: client,
    adminClient: {} as any,
    productResolver: {} as any,
  };
}

describe('ReadInventoryHandler', () => {
  it('returns flat inventory items joined with products', async () => {
    const { client, calls } = makeClient({
      routes: {
        inventory: {
          data: [
            {
              id: 'inv1',
              product_id: 'p1',
              quantity: 2,
              expiry_date: '2030-01-01',
              location: 'frigo',
              products: {
                id: 'p1',
                name: 'Tomate',
                category: 'fruits-legumes',
                unit_type: 'unit',
                image_url: null,
              },
            },
          ],
        },
      },
    });

    const handler = new ReadInventoryHandler();
    const result = await handler.execute(makeCtx(client), {});
    expect(result.result.items).toHaveLength(1);
    expect(result.result.items[0]).toMatchObject({
      id: 'inv1',
      product_name: 'Tomate',
      category: 'fruits-legumes',
      unit_type: 'unit',
      quantity: 2,
    });
    expect(calls[0].filters).toContainEqual({ kind: 'eq', col: 'user_id', val: USER });
  });

  it('passes search filter as ILIKE on products.name', async () => {
    const { client, calls } = makeClient({ routes: { inventory: { data: [] } } });
    const handler = new ReadInventoryHandler();
    await handler.execute(makeCtx(client), { search: 'tom' });
    expect(calls[0].filters).toContainEqual({ kind: 'ilike', col: 'products.name', val: '%tom%' });
  });

  it('drops rows with NULL joined product (PostgREST filter exclusion)', async () => {
    const { client } = makeClient({
      routes: {
        inventory: {
          data: [
            {
              id: 'inv1',
              product_id: 'p1',
              quantity: 1,
              expiry_date: null,
              location: null,
              products: null,
            },
          ],
        },
      },
    });
    const result = await new ReadInventoryHandler().execute(makeCtx(client), {});
    expect(result.result.items).toHaveLength(0);
  });

  it('filters near_expiry_days client-side', async () => {
    const inDays = (n: number) => {
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    };
    const { client } = makeClient({
      routes: {
        inventory: {
          data: [
            {
              id: 'a',
              product_id: 'p',
              quantity: 1,
              expiry_date: inDays(3),
              location: null,
              products: { id: 'p', name: 'soon', category: 'c', unit_type: 'u', image_url: null },
            },
            {
              id: 'b',
              product_id: 'p',
              quantity: 1,
              expiry_date: inDays(40),
              location: null,
              products: { id: 'p', name: 'late', category: 'c', unit_type: 'u', image_url: null },
            },
          ],
        },
      },
    });
    const result = await new ReadInventoryHandler().execute(makeCtx(client), {
      near_expiry_days: 7,
    });
    expect(result.result.items.map((i) => i.id)).toEqual(['a']);
  });
});

describe('ReadShoppingListHandler', () => {
  it('returns flat shopping items, filters by purchased', async () => {
    const { client, calls } = makeClient({
      routes: {
        shopping_list: {
          data: [
            {
              id: 's1',
              product_id: 'p',
              quantity: 1,
              is_purchased: false,
              priority: 1,
              estimated_price: null,
              store_section: null,
              products: { id: 'p', name: 'Lait', category: 'laitier', unit_type: 'L' },
            },
          ],
        },
      },
    });

    const result = await new ReadShoppingListHandler().execute(makeCtx(client), {
      purchased: false,
    });
    expect(result.result.items).toHaveLength(1);
    expect(result.result.items[0].product_name).toBe('Lait');
    expect(calls[0].filters).toContainEqual({
      kind: 'eq',
      col: 'is_purchased',
      val: false,
    });
  });
});

describe('ReadRecentRecipesHandler', () => {
  it('orders by created_at DESC, applies limit', async () => {
    const { client, calls } = makeClient({
      routes: {
        recipes: {
          data: [
            {
              id: 'r1',
              name: 'Pasta',
              description: null,
              prep_time: 10,
              cook_time: 15,
              servings: 4,
              image_url: null,
              cuisine_category: 'italienne',
              meal_type: 'dinner',
              tags: [],
              created_at: '2026-05-08',
            },
          ],
        },
      },
    });
    const result = await new ReadRecentRecipesHandler().execute(makeCtx(client), { limit: 5 });
    expect(result.result.recipes[0].name).toBe('Pasta');
    expect(calls[0].limit).toBe(5);
    expect(calls[0].orders).toContainEqual({ col: 'created_at', ascending: false });
  });
});

describe('SearchRecipesHandler', () => {
  it('escapes ILIKE wildcards in the user query', async () => {
    const { client, calls } = makeClient({ routes: { recipes: { data: [] } } });
    await new SearchRecipesHandler().execute(makeCtx(client), { query: '50%_off' });
    expect(calls[0].filters).toContainEqual({
      kind: 'ilike',
      col: 'name',
      val: '%50\\%\\_off%',
    });
  });
});

describe('ReadMealPlanHandler', () => {
  it('flattens nested meal_plan_entries into a single array', async () => {
    const { client } = makeClient({
      routes: {
        weekly_meal_plans: {
          data: {
            id: 'plan1',
            user_id: USER,
            week_start_date: '2026-05-04',
            meal_plan_entries: [
              { id: 'e1', day_of_week: 1, meal_type: 'dinner', recipe_id: 'r1', recipe_name: 'X', servings: 2 },
            ],
          },
        },
      },
    });
    const result = await new ReadMealPlanHandler().execute(makeCtx(client), {
      week_start: '2026-05-04',
    });
    expect(result.result.entries).toHaveLength(1);
    expect(result.result.entries[0]).toMatchObject({
      week_start_date: '2026-05-04',
      day_of_week: 1,
      meal_type: 'dinner',
      recipe_name: 'X',
    });
  });

  it('returns empty array when the table errors (defensive)', async () => {
    const { client } = makeClient({
      routes: { weekly_meal_plans: { data: null, error: { message: 'relation does not exist' } } },
    });
    const result = await new ReadMealPlanHandler().execute(makeCtx(client), {
      week_start: '2026-05-04',
    });
    expect(result.result.entries).toEqual([]);
  });
});

describe('FindCookableRecipesHandler', () => {
  it('returns recipes with unlinked essentials flagged (best-effort estimate)', async () => {
    const { client } = makeClient({
      routes: {
        recipes: {
          data: [
            {
              id: 'r-good',
              name: 'Tomate-mozza',
              prep_time: 10,
              cook_time: 0,
              image_url: null,
              recipe_ingredients: [
                {
                  id: 'i1',
                  ingredient_name: 'Tomate',
                  quantity: 2,
                  inventory_product_id: 'p-tomate',
                  is_essential: true,
                },
                {
                  id: 'i2',
                  ingredient_name: 'Mozzarella',
                  quantity: 100,
                  inventory_product_id: 'p-mozza',
                  is_essential: true,
                },
              ],
            },
            {
              id: 'r-legacy',
              name: 'Vieille recette',
              prep_time: 5,
              cook_time: 0,
              image_url: null,
              recipe_ingredients: [
                {
                  id: 'i3',
                  ingredient_name: 'Truc',
                  quantity: 1,
                  inventory_product_id: null,
                  is_essential: true,
                },
              ],
            },
          ],
        },
        inventory: {
          data: [
            { product_id: 'p-tomate', quantity: 5 },
            { product_id: 'p-mozza', quantity: 200 },
          ],
        },
      },
    });

    const result = await new FindCookableRecipesHandler().execute(makeCtx(client), {});
    expect(result.result.recipes).toHaveLength(2);
    // Fully cookable first (missing=0, unlinked=0).
    expect(result.result.recipes[0].id).toBe('r-good');
    expect(result.result.recipes[0].missing_count).toBe(0);
    expect(result.result.recipes[0].unlinked).toBe(false);
    expect(result.result.recipes[0].unlinked_count).toBe(0);
    // Legacy unlinked recipe surfaces with unlinked=true.
    expect(result.result.recipes[1].id).toBe('r-legacy');
    expect(result.result.recipes[1].unlinked).toBe(true);
    expect(result.result.recipes[1].unlinked_count).toBe(1);
  });

  it('drops unlinked recipes when caller passes max_missing_ingredients=0', async () => {
    // Strict mode is still reachable explicitly — used by callers that
    // genuinely want "you have everything for sure".
    const { client } = makeClient({
      routes: {
        recipes: {
          data: [
            {
              id: 'r-legacy',
              name: 'Vieille recette',
              prep_time: 5,
              cook_time: 0,
              image_url: null,
              recipe_ingredients: [
                {
                  id: 'i3',
                  ingredient_name: 'Truc',
                  quantity: 1,
                  inventory_product_id: null,
                  is_essential: true,
                },
              ],
            },
          ],
        },
        inventory: { data: [] },
      },
    });

    const result = await new FindCookableRecipesHandler().execute(makeCtx(client), {
      max_missing_ingredients: 0,
    });
    expect(result.result.recipes).toHaveLength(0);
  });

  it('reports missing ingredients within max_missing_ingredients tolerance', async () => {
    const { client } = makeClient({
      routes: {
        recipes: {
          data: [
            {
              id: 'r1',
              name: 'Risotto',
              prep_time: 30,
              cook_time: 0,
              image_url: null,
              recipe_ingredients: [
                {
                  id: 'i1',
                  ingredient_name: 'Riz',
                  quantity: 200,
                  inventory_product_id: 'p-riz',
                  is_essential: true,
                },
                {
                  id: 'i2',
                  ingredient_name: 'Bouillon',
                  quantity: 1,
                  inventory_product_id: 'p-bouillon',
                  is_essential: true,
                },
              ],
            },
          ],
        },
        inventory: {
          data: [{ product_id: 'p-riz', quantity: 500 }], // bouillon missing
        },
      },
    });

    // max_missing = 0 → excluded (1 missing > 0)
    const r0 = await new FindCookableRecipesHandler().execute(makeCtx(client), {
      max_missing_ingredients: 0,
    });
    expect(r0.result.recipes).toHaveLength(0);

    // Default (max_missing = 3) → included with missing_ingredients reported
    const { client: client2 } = makeClient({
      routes: {
        recipes: {
          data: [
            {
              id: 'r1',
              name: 'Risotto',
              prep_time: 30,
              cook_time: 0,
              image_url: null,
              recipe_ingredients: [
                {
                  id: 'i1',
                  ingredient_name: 'Riz',
                  quantity: 200,
                  inventory_product_id: 'p-riz',
                  is_essential: true,
                },
                {
                  id: 'i2',
                  ingredient_name: 'Bouillon',
                  quantity: 1,
                  inventory_product_id: 'p-bouillon',
                  is_essential: true,
                },
              ],
            },
          ],
        },
        inventory: { data: [{ product_id: 'p-riz', quantity: 500 }] },
      },
    });
    const r1 = await new FindCookableRecipesHandler().execute(makeCtx(client2), {});
    expect(r1.result.recipes).toHaveLength(1);
    expect(r1.result.recipes[0].missing_ingredients).toEqual(['Bouillon']);
    expect(r1.result.recipes[0].missing_count).toBe(1);
    expect(r1.result.recipes[0].unlinked).toBe(false);
  });

  it('respects max_prep_time filter', async () => {
    const { client } = makeClient({
      routes: {
        recipes: {
          data: [
            {
              id: 'fast',
              name: 'Fast',
              prep_time: 5,
              cook_time: 0,
              image_url: null,
              recipe_ingredients: [
                { id: 'i', ingredient_name: 'X', quantity: 1, inventory_product_id: 'p1', is_essential: true },
              ],
            },
            {
              id: 'slow',
              name: 'Slow',
              prep_time: 60,
              cook_time: 0,
              image_url: null,
              recipe_ingredients: [
                { id: 'j', ingredient_name: 'Y', quantity: 1, inventory_product_id: 'p2', is_essential: true },
              ],
            },
          ],
        },
        inventory: {
          data: [
            { product_id: 'p1', quantity: 5 },
            { product_id: 'p2', quantity: 5 },
          ],
        },
      },
    });

    const result = await new FindCookableRecipesHandler().execute(makeCtx(client), {
      max_prep_time: 10,
    });
    expect(result.result.recipes.map((r) => r.id)).toEqual(['fast']);
  });
});

describe('SuggestRecipesForContextHandler', () => {
  const recipesPlan = {
    recipes: {
      data: [
        // r-now: fully cookable
        {
          id: 'r-now',
          name: 'Tomate-mozza',
          description: null,
          prep_time: 10,
          cook_time: 0,
          servings: 2,
          image_url: null,
          cuisine_category: 'italien',
          meal_type: 'dinner',
          tags: null,
          created_at: '2026-05-15T18:00:00Z',
          recipe_ingredients: [
            { id: 'i1', ingredient_name: 'Tomate', quantity: 2, inventory_product_id: 'p-tomate', is_essential: true },
            { id: 'i2', ingredient_name: 'Mozzarella', quantity: 100, inventory_product_id: 'p-mozza', is_essential: true },
          ],
        },
        // r-almost: 1 missing ingredient (linked, not in stock)
        {
          id: 'r-almost',
          name: 'Risotto',
          description: null,
          prep_time: 30,
          cook_time: 0,
          servings: 4,
          image_url: null,
          cuisine_category: null,
          meal_type: null,
          tags: null,
          created_at: '2026-05-14T18:00:00Z',
          recipe_ingredients: [
            { id: 'i3', ingredient_name: 'Riz', quantity: 200, inventory_product_id: 'p-riz', is_essential: true },
            { id: 'i4', ingredient_name: 'Bouillon', quantity: 1, inventory_product_id: 'p-bouillon', is_essential: true },
          ],
        },
        // r-legacy: unlinked essential, lands in almost (1 unknown ≤ 3)
        {
          id: 'r-legacy',
          name: 'Vieille recette',
          description: null,
          prep_time: 15,
          cook_time: 0,
          servings: 2,
          image_url: null,
          cuisine_category: null,
          meal_type: null,
          tags: null,
          created_at: '2026-05-13T18:00:00Z',
          recipe_ingredients: [
            { id: 'i5', ingredient_name: 'Truc', quantity: 1, inventory_product_id: null, is_essential: true },
          ],
        },
        // r-noing: no essentials → only in recent_suggestions
        {
          id: 'r-noing',
          name: 'Pas d ingredients',
          description: null,
          prep_time: 5,
          cook_time: 0,
          servings: 1,
          image_url: null,
          cuisine_category: null,
          meal_type: null,
          tags: null,
          created_at: '2026-05-12T18:00:00Z',
          recipe_ingredients: [],
        },
      ],
    },
    inventory: {
      data: [
        { product_id: 'p-tomate', quantity: 5 },
        { product_id: 'p-mozza', quantity: 200 },
        { product_id: 'p-riz', quantity: 500 },
      ],
    },
  };

  it('buckets recipes into cookable_now, almost_cookable, recent_suggestions', async () => {
    const { client } = makeClient({ routes: recipesPlan });
    const result = await new SuggestRecipesForContextHandler().execute(makeCtx(client), {});

    expect(result.result.cookable_now.map((r) => r.id)).toEqual(['r-now']);
    expect(result.result.cookable_now[0].missing_count).toBe(0);
    expect(result.result.cookable_now[0].unlinked_count).toBe(0);

    // r-almost (1 missing) and r-legacy (1 unlinked) both fit in almost.
    const almostIds = result.result.almost_cookable.map((r) => r.id).sort();
    expect(almostIds).toEqual(['r-almost', 'r-legacy']);

    // recent_suggestions excludes anything already in the cookable buckets.
    // Only r-noing remains.
    expect(result.result.recent_suggestions.map((r) => r.id)).toEqual(['r-noing']);

    expect(result.result.total_user_recipes).toBe(4);
  });

  it('respects almost_threshold: tightening to 0 promotes only fully cookable', async () => {
    const { client } = makeClient({ routes: recipesPlan });
    const result = await new SuggestRecipesForContextHandler().execute(makeCtx(client), {
      almost_threshold: 0,
    });
    expect(result.result.cookable_now.map((r) => r.id)).toEqual(['r-now']);
    expect(result.result.almost_cookable).toHaveLength(0);
    // r-almost and r-legacy now fall through to recent_suggestions.
    const recentIds = result.result.recent_suggestions.map((r) => r.id).sort();
    expect(recentIds).toEqual(['r-almost', 'r-legacy', 'r-noing']);
  });

  it('respects max_prep_time filter', async () => {
    const { client } = makeClient({ routes: recipesPlan });
    const result = await new SuggestRecipesForContextHandler().execute(makeCtx(client), {
      max_prep_time: 12,
    });
    // Only r-now (10) and r-noing (5) survive the prep filter.
    expect(result.result.cookable_now.map((r) => r.id)).toEqual(['r-now']);
    expect(result.result.almost_cookable).toHaveLength(0);
    expect(result.result.recent_suggestions.map((r) => r.id)).toEqual(['r-noing']);
    expect(result.result.total_user_recipes).toBe(2);
  });

  it('limit_per_bucket caps each bucket independently', async () => {
    const manyRecipes = Array.from({ length: 8 }, (_, i) => ({
      id: `r-bulk-${i}`,
      name: `Recipe ${i}`,
      description: null,
      prep_time: 10,
      cook_time: 0,
      servings: 2,
      image_url: null,
      cuisine_category: null,
      meal_type: null,
      tags: null,
      created_at: `2026-05-${10 + i}T00:00:00Z`,
      recipe_ingredients: [
        { id: `i-${i}`, ingredient_name: 'Tomate', quantity: 1, inventory_product_id: 'p-tomate', is_essential: true },
      ],
    }));
    const { client } = makeClient({
      routes: {
        recipes: { data: manyRecipes },
        inventory: { data: [{ product_id: 'p-tomate', quantity: 100 }] },
      },
    });
    const result = await new SuggestRecipesForContextHandler().execute(makeCtx(client), {
      limit_per_bucket: 3,
    });
    expect(result.result.cookable_now).toHaveLength(3);
  });
});
