import { allocateMenuStock, menuShoppingLines, qualifyLotsOn, type MenuMealInput, type QualifiedLot, type ResolvedStockRecipe } from '@smart/shared';

const recipe = (name: string, ingredients: Array<[string, number | null, string]>, servings = 4): ResolvedStockRecipe => ({
  id: `r-${name}`, source: 'recipes', canonicalId: `r-${name}`, name, servings, version: 'v',
  ingredients: ingredients.map(([ingredient_name, quantity, unit]) => ({ ingredient_name, quantity, unit, is_essential: true })),
});
const meal = (id: string, date: string, dish: ResolvedStockRecipe | null, role: 'reserve' | 'target' = 'target', servings: number | null = 4): MenuMealInput =>
  ({ id, version: 0, date, meal_type: 'dinner', role, recipe_name: dish?.name ?? 'Repas', servings, recipe: dish });
const lot = (id: string, product_name: string, quantity: number, unit: string, extra: Partial<QualifiedLot> = {}): QualifiedLot =>
  ({ id, product_id: `p-${product_name}`, product_name, quantity, unit, stock_version: 1, ...extra });
const need = (result: ReturnType<typeof allocateMenuStock>, name: string) => result.needs.filter(item => item.name === name);

describe('week shopping from the menu', () => {
  test('two meals of 200 g with 100 g in stock need 300 g: a partial take stays reserved', () => {
    const flour = recipe('Crêpes', [['farine', 200, 'g']]);
    const result = allocateMenuStock([meal('m1', '2026-11-30', flour), meal('m2', '2026-12-02', flour)], [lot('l1', 'farine', 100, 'g')]);
    expect(need(result, 'farine')).toEqual([expect.objectContaining({ status: 'to_buy', quantity: 300, unit: 'g' })]);
    expect(need(result, 'farine')[0].meals.map(item => [item.id, item.quantity])).toEqual([['m1', 100], ['m2', 200]]);
  });

  test('an earlier meal reserves the stock first, and a meal of the target week then lacks it', () => {
    const rice = recipe('Riz', [['riz', 200, 'g']]);
    const result = allocateMenuStock([meal('before', '2026-11-28', rice, 'reserve'), meal('target', '2026-12-01', rice)], [lot('l1', 'riz', 200, 'g')]);
    expect(need(result, 'riz')).toEqual([expect.objectContaining({ status: 'to_buy', quantity: 200 })]);
    expect(need(result, 'riz')[0].meals.map(item => item.id)).toEqual(['target']);
  });

  test('a lot past its date at the meal: DLC excluded and bought, DDM or unknown kind to verify, never counted', () => {
    const milk = recipe('Flan', [['lait', 1, 'l']]);
    const meals = [meal('m1', '2026-12-03', milk)];
    expect(need(allocateMenuStock(meals, [lot('l1', 'lait', 1, 'l', { expiry_date: '2026-12-01', date_kind: 'use_by' })]), 'lait'))
      .toEqual([expect.objectContaining({ status: 'to_buy', quantity: 1 })]);
    const doubtful = need(allocateMenuStock(meals, [lot('l1', 'lait', 1, 'l', { expiry_date: '2026-12-01', date_kind: 'best_before' })]), 'lait');
    expect(doubtful).toEqual([expect.objectContaining({ status: 'verify', quantity: 1 })]);
    expect(doubtful[0].verify_lots).toEqual(['lait']);
    expect(need(allocateMenuStock(meals, [lot('l1', 'lait', 1, 'l', { expiry_date: '2026-12-05', date_kind: 'use_by' })]), 'lait')).toEqual([]);
  });

  test('mass, volume and pieces never add up; amounts of one dimension are converted', () => {
    const a = recipe('A', [['crème', 20, 'cl'], ['crème', 100, 'g']]);
    const b = recipe('B', [['crème', 0.3, 'l']]);
    const result = need(allocateMenuStock([meal('m1', '2026-11-30', a), meal('m2', '2026-12-01', b)], []), 'crème');
    expect(result.map(item => [item.quantity, item.unit]).sort()).toEqual([[100, 'g'], [50, 'cl']]);
  });

  test('an unknown amount is added by hand when absent, to verify when in stock; a meal without recipe is named', () => {
    const herbs = recipe('Salade', [['persil', null, 'botte'], ['sel', null, 'g']]);
    const result = allocateMenuStock([meal('m1', '2026-11-30', herbs), meal('m2', '2026-12-01', null)], [lot('l1', 'sel', 1, 'kg')]);
    expect(need(result, 'persil')).toEqual([expect.objectContaining({ status: 'manual' })]);
    expect(need(result, 'sel')).toEqual([expect.objectContaining({ status: 'verify' })]);
    expect(result.uncomputable).toEqual([expect.objectContaining({ id: 'm2' })]);
  });

  test('qualifyLotsOn judges each lot at the meal day', () => {
    const lots = [lot('a', 'x', 1, 'g', { expiry_date: '2026-12-01', date_kind: 'use_by' }), lot('b', 'y', 1, 'g', { expiry_date: '2026-12-01' }),
      lot('c', 'z', 1, 'g', { expiry_date: '2026-12-01', date_kind: 'use_by' }), lot('d', 'w', 0, 'g')];
    expect(qualifyLotsOn(lots, '2026-12-01')).toEqual({ eligible: [lots[0], lots[1], lots[2]], verify: [], excluded: [] });
    const later = qualifyLotsOn(lots, '2026-12-02');
    expect([later.eligible.map(item => item.id), later.verify.map(item => item.id), later.excluded.map(item => item.id)]).toEqual([[], ['b'], ['a', 'c']]);
  });
});

describe('lines of the weekly shopping review', () => {
  const row = (id: string, product_name: string, quantity: number, unit: string, extra: Record<string, unknown> = {}) =>
    ({ id, product_id: `p-${product_name}`, product_name, quantity, unit, is_purchased: false, stock_version: 2, created_at: '2026-11-01', ...extra });
  const needs = (quantity: number) => allocateMenuStock([meal('m1', '2026-11-30', recipe('Riz', [['riz', quantity, 'g']]))], []).needs;

  test('what the list holds covers the need: unchecked rows first, then bought rows awaiting storage', () => {
    expect(menuShoppingLines(needs(300), [row('s1', 'riz', 0.3, 'kg')], [])[0]).toMatchObject({ state: 'listed' });
    expect(menuShoppingLines(needs(300), [row('s1', 'riz', 300, 'g', { is_purchased: true })], [])[0]).toMatchObject({ state: 'purchased_pending' });
    const partial = menuShoppingLines(needs(500), [row('old', 'riz', 100, 'g', { created_at: '2026-01-01' }), row('new', 'riz', 100, 'g')], []);
    expect(partial[0]).toMatchObject({ state: 'to_add', quantity: 300, unit: 'g', target: { id: 'old', expected_version: 2 } });
  });

  test('a row topped up by the menu is reduced only by the menu share, and only while unchanged', () => {
    const listed = [row('s1', 'riz', 500, 'g', { stock_version: 3 })];
    const share = [{ id: 1, shopping_id: 's1', quantity: 300, unit: 'g', line_version_after: 3 }];
    expect(menuShoppingLines(needs(100), listed, share).find(line => line.state === 'excess'))
      .toMatchObject({ reduction: { id: 's1', expected_version: 3, quantity: 300, unit: 'g' } });
    expect(menuShoppingLines(needs(400), listed, share).find(line => line.state === 'excess')).toMatchObject({ reduction: { quantity: 100 } });
    expect(menuShoppingLines(needs(100), [{ ...listed[0], stock_version: 4 }], share).some(line => line.state === 'excess')).toBe(false);
    expect(menuShoppingLines([], listed, share).find(line => line.state === 'excess')).toMatchObject({ reduction: { quantity: 300 } });
  });

  test('lines to add by hand and to verify pass through, never with an amount to write', () => {
    const lines = menuShoppingLines(allocateMenuStock([meal('m1', '2026-11-30', recipe('Salade', [['persil', null, 'botte']]))], []).needs, [], []);
    expect(lines).toEqual([expect.objectContaining({ state: 'manual', name: 'persil' })]);
    expect(lines[0]).not.toHaveProperty('target');
  });
});
