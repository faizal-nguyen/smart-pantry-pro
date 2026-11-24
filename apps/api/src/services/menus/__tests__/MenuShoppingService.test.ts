import type { SupabaseClient } from '@supabase/supabase-js';
import { MenuShoppingService } from '../MenuShoppingService.js';

const USER = '00000000-0000-4000-8000-000000000001';
const MAX_ROWS = 1000; // PostgREST max-rows: one response never holds more.
const basis = {
  week_start: '2026-11-30', as_of: '2026-11-24', menu_version: 'a'.repeat(32), context_revision: 7,
  meals: [
    { id: 'm1', version: 0, date: '2026-12-01', meal_type: 'dinner', recipe_reference: { id: 'r1', source: 'recipes' }, servings: 4, recipe_name: 'Crêpes', role: 'target' },
    { id: 'm2', version: 2, date: '2026-12-02', meal_type: 'lunch', recipe_reference: null, servings: 2, recipe_name: 'Reste ancien', role: 'target' },
    { id: 'm3', version: 0, date: '2026-12-03', meal_type: 'dinner', recipe_reference: { id: 'gone', source: 'auto' }, servings: 4, recipe_name: 'Supprimée', role: 'target' },
  ],
};
const crepes = { id: 'r1', source: 'recipes', canonicalId: 'r1', name: 'Crêpes', servings: 4, version: 'v',
  ingredients: [{ ingredient_name: 'farine', quantity: 200, unit: 'g', is_essential: true }] };
const farine = { id: 's1', product_id: 'p', quantity: 100, unit: 'g', is_purchased: false, stock_version: 2, created_at: '2026-11-01', product: { name: 'farine', unit_type: 'g' } };

interface Options { shopping?: unknown[]; basisData?: unknown; recipeError?: { message: string; code?: string } }

function client({ shopping = [farine], basisData = basis, recipeError }: Options = {}) {
  const filters: Array<[string, string, unknown]> = [];
  const rows: Record<string, unknown[]> = {
    inventory: [{ id: 'l1', product_id: 'p', quantity: 50, unit: 'g', stock_version: 1, expiry_date: null, date_kind: 'unknown', quantity_quality: 'measured', location: null, notes: null, product: { name: 'farine', unit_type: 'g' } }],
    shopping_list: shopping,
    menu_shopping_contributions: [],
  };
  const from = jest.fn((table: string) => {
    let range = [0, Number.MAX_SAFE_INTEGER];
    const respond = () => {
      const all = rows[table];
      return { data: all.slice(range[0], Math.min(range[1] + 1, range[0] + MAX_ROWS)), error: null, count: all.length };
    };
    const query = {
      select: () => query, order: () => query,
      eq: (field: string, value: unknown) => { filters.push([table, field, value]); return query; },
      range: (start: number, end: number) => { range = [start, end]; return query; },
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(respond()).then(resolve, reject),
    };
    return query;
  });
  const rpc = jest.fn(async (name: string, args: Record<string, unknown>) => {
    if (name === 'menu_shopping_basis') return { data: basisData, error: null };
    if (args.p_recipe_id === 'r1') return recipeError ? { data: null, error: recipeError } : { data: crepes, error: null };
    return { data: null, error: { message: 'RECIPE_NOT_FOUND' } };
  });
  return { supabase: { from, rpc } as unknown as SupabaseClient, rpc, filters };
}

describe('MenuShoppingService.preview', () => {
  test('returns the lines to review with the tokens of the basis it was computed on', async () => {
    const mocked = client();
    const preview = await new MenuShoppingService(mocked.supabase).preview(USER, '2026-11-30');
    expect(mocked.rpc).toHaveBeenCalledWith('menu_shopping_basis', { p_week_start: '2026-11-30' });
    expect([preview.week_start, preview.as_of, preview.menu_version, preview.context_revision]).toEqual(['2026-11-30', '2026-11-24', 'a'.repeat(32), 7]);
    // 200 g needed, 50 g in stock, 100 g already listed: 50 g to add on the listed row.
    expect(preview.lines).toEqual([expect.objectContaining({ state: 'to_add', name: 'farine', quantity: 50, unit: 'g', target: { id: 's1', expected_version: 2 } })]);
    expect(preview.uncomputable.map(meal => [meal.id, meal.reason])).toEqual([['m2', 'NO_RECIPE'], ['m3', 'RECIPE_UNAVAILABLE']]);
    expect(preview.meals.map(meal => meal.id)).toEqual(['m1', 'm2', 'm3']);
  });

  test('reads only the signed-in account, and the week’s contributions', async () => {
    const mocked = client();
    await new MenuShoppingService(mocked.supabase).preview(USER, '2026-11-30');
    expect(mocked.filters).toEqual(expect.arrayContaining([['inventory', 'user_id', USER], ['shopping_list', 'user_id', USER],
      ['menu_shopping_contributions', 'user_id', USER], ['menu_shopping_contributions', 'week_start_date', '2026-11-30']]));
    expect(mocked.rpc.mock.calls.filter(([name]) => name === 'resolve_stock_recipe')).toHaveLength(2);
  });

  test('reads every page of a list longer than one response', async () => {
    const others = Array.from({ length: MAX_ROWS }, (_, index) => ({ ...farine, id: `x${index}`, product_id: `o${index}`, product: { name: `autre ${index}`, unit_type: 'g' } }));
    const preview = await new MenuShoppingService(client({ shopping: [...others, farine] }).supabase).preview(USER, '2026-11-30');
    expect(preview.lines).toEqual([expect.objectContaining({ state: 'to_add', quantity: 50, target: { id: 's1', expected_version: 2 } })]);
  });

  test('a failure to resolve a recipe fails the preview instead of hiding the meal', async () => {
    const service = new MenuShoppingService(client({ recipeError: { message: 'connection reset', code: '08006' } }).supabase);
    await expect(service.preview(USER, '2026-11-30')).rejects.toMatchObject({ code: 'STOCK_WRITE_FAILED' });
  });

  test('a basis of an unexpected shape is refused, never computed', async () => {
    await expect(new MenuShoppingService(client({ basisData: null }).supabase).preview(USER, '2026-11-30')).rejects.toThrow('MENU_BASIS_INVALID');
  });
});
