import { allocateCookingStock, describeCookPlan, planCookFromStock, type StockIngredient, type StockLot } from '@smart/shared';

const lot = (id: string, product_name: string, quantity: number, unit: string): StockLot =>
  ({ id, product_id: 'p-' + id, product_name, quantity, unit, stock_version: 1 });
const ingredient = (ingredient_name: string, quantity: number | null, unit: string | null): StockIngredient =>
  ({ ingredient_name, quantity, unit, is_essential: true });

// iPhone 2026-11-08: « J'ai cuisiné Lamb (Mutton) Biryani » → « La quantité disponible ne suffit plus ».
const biryani = [ingredient('Riz basmati', 300, 'g'), ingredient('Agneau', 500, 'g'), ingredient('Oignon', 2, 'pièce'),
  ingredient('Sel', null, null), ingredient('Eau', 500, 'ml')];
const stock = [lot('riz', 'Riz basmati', 100, 'g'), lot('oignon', 'Oignon', 3, 'pièce'), lot('sel', 'Sel fin', 1, 'kg')];

describe('cooking with what the stock holds', () => {
  test('takes whole ingredients, all of a short one, and leaves the rest outside the stock', () => {
    const plan = planCookFromStock(biryani, stock, 2, 2);
    expect(plan.taken).toEqual([{ ingredient_index: 2, ingredient_name: 'Oignon', quantity: 2, unit: 'pièce' }]);
    expect(plan.partial).toEqual([{ ingredient_index: 0, ingredient_name: 'Riz basmati', quantity: 100, needed: 300, unit: 'g' }]);
    expect(plan.outside.map(item => [item.ingredient_name, item.reason])).toEqual([['Agneau', 'NOT_IN_STOCK'], ['Sel', 'QUANTITY_UNKNOWN']]);
    expect(plan.outside_inventory).toEqual([1, 3]);
    expect(plan.adjustments).toEqual([{ ingredient_index: 0, quantity: 100, unit: 'g' }]);
  });

  test('the plan is exactly what the stock command accepts: nothing left missing', () => {
    const plan = planCookFromStock(biryani, stock, 2, 2);
    const actual = allocateCookingStock(biryani, stock, 2, 2, plan.adjustments, plan.outside_inventory);
    expect(actual.missing).toEqual([]);
    expect(actual.allocations.map(item => [item.inventory_id, item.quantity])).toEqual([['riz', 100], ['oignon', 2]]);
  });

  test('portions scale what is needed', () => {
    const plan = planCookFromStock([ingredient('Riz basmati', 300, 'g')], [lot('riz', 'Riz basmati', 1, 'kg')], 2, 4);
    expect(plan.taken).toEqual([{ ingredient_index: 0, ingredient_name: 'Riz basmati', quantity: 600, unit: 'g' }]);
    expect(plan.outside_inventory).toEqual([]);
  });

  test('two ingredients sharing one lot: the second gets what the first left', () => {
    const recipe = [ingredient('Oignon', 2, 'pièce'), ingredient('Oignon', 2, 'pièce')];
    const plan = planCookFromStock(recipe, [lot('oignon', 'Oignon', 3, 'pièce')], 1, 1);
    expect(plan.taken.map(item => item.ingredient_index)).toEqual([0]);
    expect(plan.partial).toEqual([{ ingredient_index: 1, ingredient_name: 'Oignon', quantity: 1, needed: 2, unit: 'pièce' }]);
    expect(allocateCookingStock(recipe, [lot('oignon', 'Oignon', 3, 'pièce')], 1, 1, plan.adjustments, plan.outside_inventory).missing).toEqual([]);
  });

  test('an ingredient already declared outside the stock stays untouched', () => {
    const plan = planCookFromStock(biryani, stock, 2, 2, [2]);
    expect(plan.taken).toEqual([]);
    expect(plan.outside_inventory).toEqual([1, 2, 3]);
  });

  test('a unit the stock cannot convert is left untouched, to check', () => {
    const plan = planCookFromStock([ingredient('Coriandre', 1, 'botte')], [lot('cor', 'Coriandre', 30, 'g')], 1, 1);
    expect(plan.outside).toEqual([{ ingredient_index: 0, ingredient_name: 'Coriandre', reason: 'UNIT_UNKNOWN' }]);
  });

  test('says in French what is taken and what is not', () => {
    const plan = planCookFromStock(biryani, stock, 2, 2);
    expect(describeCookPlan(plan, 'done')).toEqual([
      'Retiré de ton stock : Oignon 2 pièce.',
      'Tout ce que tu avais : Riz basmati 100 g (la recette en demande 300 g).',
      'Pas dans ton stock, rien à retirer : Agneau.',
      'Quantité ou unité à préciser, je n’y touche pas : Sel.',
    ]);
    expect(describeCookPlan(plan, 'planned').slice(0, 2)).toEqual([
      'Je retire de ton stock : Oignon 2 pièce.',
      'Je prends tout ce que tu as : Riz basmati 100 g (la recette en demande 300 g).',
    ]);
    expect(describeCookPlan(planCookFromStock([ingredient('Eau', 1, 'l')], [], 1, 1), 'planned')).toEqual(['Rien à retirer de ton stock.']);
  });
});
