import { allocateRecipeStock, convertQuantity, mapLibraryRecipe, normalizeRecipeIngredients, StockCommandSchema, type StockLot } from '@smart/shared';

const lot = (quantity = 1, unit = 'kg'): StockLot => ({ id: 'lot', product_id: 'p', product_name: 'Farine', quantity, unit, stock_version: 2 });
const ingredient = (quantity = 200, unit = 'g') => ({ ingredient_name: 'Farine', quantity, unit, inventory_product_id: 'p', is_essential: true });

describe('V10 quantity and recipe contracts', () => {
  test.each([[1,'kg','g',1000], [200,'g','kg',.2], [1.2,'L','ml',1200], [25,'cl','l',.25], [3,'unités','pièce',3], [1,'mg','g',.001]])(
    '%s %s converts to %s', (quantity,from,to,expected) => expect(convertQuantity(quantity as number,from as string,to as string)).toBe(expected),
  );
  test.each(['tasse','boîte','pincée',''])('does not invent a conversion for %s', unit => expect(() => convertQuantity(1,unit,'g')).toThrow());
  test('mass and volume cannot be subtracted without a known density', () => expect(() => convertQuantity(1,'ml','g')).toThrow());
  test.each([-1,NaN,Infinity])('invalid quantity %s is rejected', quantity => expect(() => convertQuantity(quantity,'g','g')).toThrow());
  test('scales portions exactly once', () => {
    const preview = allocateRecipeStock([ingredient()], [lot()],2,4);
    expect(preview.missing).toEqual([]);
    expect(preview.allocations[0].quantity).toBe(.4);
  });
  test('reserves shared stock across repeated ingredients', () => {
    const preview = allocateRecipeStock([ingredient(),ingredient()], [lot(.3)],4,4);
    expect(preview.allocations).toHaveLength(1);
    expect(preview.missing[0]).toMatchObject({ ingredient_index: 1, quantity: 100, reason: 'INSUFFICIENT_QUANTITY' });
  });
  test('combines compatible lots in expiry order', () => {
    const preview = allocateRecipeStock([ingredient(300)], [lot(.2),{ ...lot(200,'g'), id: 'first', expiry_date: '2026-10-09' }],4,4);
    expect(preview.allocations.map(item => [item.inventory_id,item.quantity])).toEqual([['first',200],['lot',.1]]);
    expect(preview.missing).toHaveLength(0);
  });
  test('unknown quantity and incompatible unit remain distinct from missing stock', () => {
    expect(allocateRecipeStock([{ ...ingredient(), quantity: null }],[lot()],4,4).missing[0].reason).toBe('QUANTITY_UNKNOWN');
    expect(allocateRecipeStock([ingredient(200,'ml')],[lot()],4,4).missing[0].reason).toBe('UNIT_INCOMPATIBLE');
  });
  test('exact normalized names can link ingredients without a product id', () => {
    expect(allocateRecipeStock([{ ...ingredient(), ingredient_name: ' farine ', inventory_product_id: null }],[lot()],4,4).missing).toEqual([]);
  });
  test('library customizations retain wrapper identity and scale amounts with portions', () => {
    const recipe = mapLibraryRecipe({ id: 'wrapper', user_id: 'owner', is_from_catalog: true, created_at: '', updated_at: '',
      catalog_recipe: { id: 'canonical', title: 'Base', servings: 4, ingredients_json: [{ name: 'Lait', amount: '100', unit: 'ml' }], instructions: 'Cuire', created_at: '', updated_at: '' },
      custom_modifications: { title: 'Ma version', servings_multiplier: 2, ingredients_override: [{ name: 'Farine', amount: '200,5', unit: 'g' }], instructions_append: 'Laisser reposer' },
    });
    expect(recipe).toMatchObject({ id: 'wrapper', canonicalId: 'canonical', name: 'Ma version', servings: 8 });
    expect(recipe.inlineIngredients[0].quantity).toBe(401);
    expect(recipe.instructions).toContain('Laisser reposer');
  });
  test('a nonnumeric imported amount stays unknown', () => expect(normalizeRecipeIngredients([{ name: 'Farine', amount: 'au goût' }])[0].quantity).toBeUndefined());
  test('malformed inline ingredients remain unknown and cannot invent a usable quantity', () => {
    const ingredients = normalizeRecipeIngredients([null, 'Sel', 42]);
    expect(ingredients.map(item => item.quantity)).toEqual([undefined,undefined,undefined]);
    expect(ingredients[1].ingredient_name).toBe('Sel');
  });
  test('fractional servings are rejected when persisting an integer menu slot', () => {
    expect(StockCommandSchema.safeParse({ command_id: '40000000-0000-4000-8000-000000000001', command_type: 'plan_recipe', payload_version: 1,
      payload: { recipe: { id: '30000000-0000-4000-8000-000000000001' }, servings: 2.5, date: '2026-10-08' } }).success).toBe(false);
  });
  test('a command cannot supply another owner or accept a negative consumption', () => {
    const command = { command_id: '40000000-0000-4000-8000-000000000001', command_type: 'consume_inventory', payload_version: 1,
      payload: { items: [{ id: '20000000-0000-4000-8000-000000000001', quantity: 1, unit: 'g' }] } };
    expect(StockCommandSchema.safeParse({ ...command, user_id: 'other' }).success).toBe(false);
    expect(StockCommandSchema.safeParse({ ...command, payload: { items: [{ ...command.payload.items[0], quantity: -1 }] } }).success).toBe(false);
  });
});
