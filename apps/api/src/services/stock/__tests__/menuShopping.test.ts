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
    expect(result.uncomputable).toEqual([expect.objectContaining({ id: 'm2', role: 'target', reason: 'NO_RECIPE' })]);
  });

  test('a meal without servings counts the recipe’s own', () => {
    const rice = recipe('Riz', [['riz', 200, 'g']]);
    const result = allocateMenuStock([meal('m1', '2026-11-30', rice, 'target', null)], []);
    expect(need(result, 'riz')).toEqual([expect.objectContaining({ quantity: 200 })]);
    expect(result.uncomputable).toEqual([]);
  });

  test('a recipe that no longer resolves is named, also on an earlier meal whose stock it could not reserve', () => {
    const gone = (id: string, role: 'reserve' | 'target') => ({ ...meal(id, '2026-11-30', null, role), recipe_unavailable: true });
    const result = allocateMenuStock([gone('before', 'reserve'), gone('target', 'target'), meal('plain', '2026-11-29', null, 'reserve')], []);
    expect(result.uncomputable.map(item => [item.id, item.role, item.reason]))
      .toEqual([['before', 'reserve', 'RECIPE_UNAVAILABLE'], ['target', 'target', 'RECIPE_UNAVAILABLE']]);
  });

  // 24 Nov 2026: « Pâte de curry jaune thaï » was proposed to buy with « Pâte de Curry Jaune » in stock.
  test('a stock product only close to the ingredient is named to check, never counted nor bought', () => {
    const curry = recipe('Curry', [['Pâte de curry jaune thaï', 45, 'g'], ['Sauce poisson', 20, 'ml']]);
    const result = allocateMenuStock([meal('m1', '2026-12-02', curry)], [lot('l1', 'Pâte de Curry Jaune', 400, 'g'), lot('l2', 'Sauce soja', 1, 'l')]);
    expect(need(result, 'Pâte de curry jaune thaï')).toEqual([expect.objectContaining({ status: 'verify', quantity: 45, unit: 'g', similar_lots: ['Pâte de Curry Jaune'] })]);
    expect(need(result, 'Sauce poisson')).toEqual([expect.objectContaining({ status: 'to_buy', quantity: 20 })]);
    expect(need(result, 'Sauce poisson')[0]).not.toHaveProperty('similar_lots');
  });

  test('an exact product is counted first; a close one is not named once the need is covered', () => {
    const curry = recipe('Curry', [['pâte de curry jaune thaï', 45, 'g']]);
    const lots = [lot('l1', 'Pâte de Curry Jaune', 400, 'g'), lot('l2', 'Pâte de curry jaune thaï', 50, 'g')];
    expect(need(allocateMenuStock([meal('m1', '2026-12-02', curry)], lots), 'pâte de curry jaune thaï')).toEqual([]);
    const short = need(allocateMenuStock([meal('m1', '2026-12-02', curry)], [lots[0], { ...lots[1], quantity: 20 }]), 'pâte de curry jaune thaï');
    expect(short).toEqual([expect.objectContaining({ status: 'verify', quantity: 25, similar_lots: ['Pâte de Curry Jaune'] })]);
  });

  // Review 2026-11-24: a lot the same meal used up is no longer in stock to check.
  test('a close product already taken by the same meal is not named, and the need is bought', () => {
    const curry = recipe('Curry', [['Pâte de Curry Jaune', 400, 'g'], ['pâte de curry jaune thaï', 45, 'g']]);
    const result = allocateMenuStock([meal('m1', '2026-12-02', curry)], [lot('l1', 'Pâte de Curry Jaune', 400, 'g')]);
    expect(need(result, 'pâte de curry jaune thaï')).toEqual([expect.objectContaining({ status: 'to_buy', quantity: 45 })]);
    expect(need(result, 'pâte de curry jaune thaï')[0]).not.toHaveProperty('similar_lots');
  });

  test('a close product reaches the review line, and the line is never written', () => {
    const curry = recipe('Curry', [['pâte de curry jaune thaï', 45, 'g']]);
    const { needs } = allocateMenuStock([meal('m1', '2026-12-02', curry)], [lot('l1', 'Pâte de Curry Jaune', 400, 'g')]);
    expect(menuShoppingLines(needs, [], [])).toEqual([expect.objectContaining({ state: 'verify', similar_lots: ['Pâte de Curry Jaune'] })]);
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

  // A recipe linked to the product and another naming it make two needs of one product.
  const linkedAndNamed = (quantity: number) => {
    const linked = { ...recipe('Sauce', []), ingredients: [{ ingredient_name: 'Tomates', quantity, unit: 'g', is_essential: true, inventory_product_id: 'p-tomate' }] };
    return allocateMenuStock([meal('m1', '2026-11-30', linked), meal('m2', '2026-12-01', recipe('Salade', [['tomate', quantity, 'g']]))], []).needs;
  };

  test('a row covers the needs once: two needs of one product never both count it', () => {
    const lines = menuShoppingLines(linkedAndNamed(500), [row('s1', 'tomate', 500, 'g')], []);
    expect(lines.map(line => [line.state, line.quantity])).toEqual([['listed', 500], ['to_add', 500]]);
  });

  test('two needs topping up one row make one add, so the confirmation never conflicts with itself', () => {
    const lines = menuShoppingLines(linkedAndNamed(500), [row('s1', 'tomate', 100, 'g')], []);
    expect(lines).toEqual([expect.objectContaining({ state: 'to_add', quantity: 900, unit: 'g', target: { id: 's1', expected_version: 2 } })]);
    expect(lines[0].meals.map(item => item.id)).toEqual(['m1', 'm2']);
  });

  test('a longer name is covered after the closest match, and never topped up for another product', () => {
    const needs = allocateMenuStock([meal('m1', '2026-11-30', recipe('Salade', [['tomate', 300, 'g'], ['tomate cerise', 200, 'g']]))], []).needs;
    const lines = menuShoppingLines(needs, [row('s1', 'tomate cerise', 200, 'g')], []);
    expect(lines.map(line => [line.name, line.state, line.quantity])).toEqual([['tomate', 'to_add', 300], ['tomate cerise', 'listed', 200]]);
    expect(lines[0]).not.toHaveProperty('target');
  });

  test('a row a meal still names without an amount, or without a unit, is never proposed back', () => {
    const share = [{ id: 1, shopping_id: 's1', quantity: 1, unit: 'botte', line_version_after: 2 }];
    const herbs = allocateMenuStock([meal('m1', '2026-11-30', recipe('Salade', [['persil', null, 'botte']]))], []).needs;
    expect(menuShoppingLines(herbs, [row('s1', 'persil', 1, 'botte')], share).some(line => line.state === 'excess')).toBe(false);
    expect(menuShoppingLines([], [row('s1', 'persil', 1, null as unknown as string)], share).some(line => line.state === 'excess')).toBe(false);
  });
});
