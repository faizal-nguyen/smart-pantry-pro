import { allocateRecipeStock, convertQuantity, ingredientMatchRank, mapLibraryRecipe, normalizeRecipeIngredients, StockCommandSchema, type StockLot } from '@smart/shared';

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

describe('recipe ingredients checked against the pantry', () => {
  const pantry = (product_name: string, quantity = 1, unit: string | null = 'kg', id = product_name): StockLot =>
    ({ id, product_id: `p:${id}`, product_name, quantity, unit, stock_version: 1 });
  const need = (ingredient_name: string, quantity: number | null = 1, unit = 'unité') =>
    ({ ingredient_name, quantity, unit, inventory_product_id: null, is_essential: true });

  test.each([[2,'c. à soupe','ml',30], [1,'c. à café','ml',5], [1,'cuillère à soupe','c. à café',3], [10,'c. à café','cl',5], [1,'tbsp','ml',15]])(
    '%s %s converts to %s', (quantity,from,to,expected) => expect(convertQuantity(quantity as number,from as string,to as string)).toBe(expected),
  );
  test.each([
    ['échalotes','Échalote',1], ['œufs','Oeufs',1], ['lait de coco','Lait de coco bio',2], ['oignon','Oignons rouges',2],
    ['味噌','味噌',1], ['đường','Đường',1], ['sel','Sel de Guérande',2], ['poivre','Poivre en grains',2],
    ['cuisses de poulet','Cuisses de poulet fermier Label Rouge',2], ['sel','Sel fin de Guérande',2], ["huile d'olive","Huile d’olive vierge extra",2], ['sucre','Sucre en poudre',2], ['sel','Sel de mer',2],
  ])('%s is found in stock as %s', (ingredient,product,rank) => expect(ingredientMatchRank(ingredient as string,product as string)).toBe(rank));
  test.each([
    ['lait','Lait de coco'], ['poulet','Bouillon de poulet'], ['huile',"Huile d'olive"], ['coriandre','Coriandre en poudre'],
    ['lait','Lait concentré sucré'], ['sauce soja','Sauce soja sucrée'], ['saumon','Saumon fumé'], ['riz','Farine de riz'], ['','Riz'],
    ['citron vert','Citron'], ['sucre glace','Sucre'], ['sucre','Sucre de coco'], ['sel','Sel de céleri'], ['poivre','Poivre de Sichuan'], ['味噌','味噌 blanc'],
  ])('%s is not mistaken for %s', (ingredient,product) => expect(ingredientMatchRank(ingredient,product)).toBe(0));
  test('a plural or qualified product name covers the recipe ingredient', () => {
    const preview = allocateRecipeStock([need('échalotes',3), need('lait de coco',200,'ml')],[pantry('Échalote',5,'unité'),pantry('Lait de coco bio',400,'ml')],4,4);
    expect(preview.missing).toEqual([]);
    expect(preview.allocations.map(item => [item.inventory_id,item.quantity])).toEqual([['Échalote',3],['Lait de coco bio',200]]);
  });
  test('the exact product is used before a more specific one', () => {
    const preview = allocateRecipeStock([need('riz',200,'g')],[{ ...pantry('Riz basmati',1,'kg','basmati'), expiry_date: '2026-01-01' },pantry('Riz',1,'kg','plain')],4,4);
    expect(preview.allocations.map(item => item.inventory_id)).toEqual(['plain']);
  });
  test('a linked product id still accepts a pantry lot with the same name', () => {
    expect(allocateRecipeStock([{ ...need('farine',200,'g'), inventory_product_id: 'catalog-flour' }],[pantry('Farine')],4,4).missing).toEqual([]);
  });
  test('spoon measures are deducted from liquids stored in ml', () => {
    const preview = allocateRecipeStock([need('sauce soja',2,'c. à soupe')],[pantry('Sauce soja',500,'ml')],4,4);
    expect(preview.allocations[0]).toMatchObject({ quantity: 30, unit: 'ml' });
  });
  test('an absent ingredient is reported as not in stock even when its amount cannot be measured', () => {
    const preview = allocateRecipeStock([need('gingembre',2.5,'cm'), need('coriandre',null), need('sel',1,'c. à café')],[],4,4);
    expect(preview.missing.map(item => item.reason)).toEqual(['NOT_IN_STOCK','NOT_IN_STOCK','NOT_IN_STOCK']);
  });
  test('an ingredient in stock whose amount cannot be compared stays to verify, not absent', () => {
    const preview = allocateRecipeStock([need('gingembre',2.5,'cm'), need('sel',1,'c. à café'), need('coriandre',null)],
      [pantry('Gingembre',100,'g'),pantry('Sel',1,'kg'),pantry('Coriandre fraîche',1,'botte')],4,4);
    expect(preview.missing.map(item => item.reason)).toEqual(['UNIT_UNKNOWN','UNIT_INCOMPATIBLE','QUANTITY_UNKNOWN']);
  });
  test('tap water is never required from the pantry, other waters are', () => {
    expect(allocateRecipeStock([need('eau',250,'ml'), need('Eau chaude',1,'l'), need('eau du robinet',1,'l')],[],4,4)).toEqual({ allocations: [], missing: [] });
    expect(allocateRecipeStock([need('eau de coco',250,'ml'), need('eau gazeuse',1,'l')],[],4,4).missing.map(item => item.reason)).toEqual(['NOT_IN_STOCK','NOT_IN_STOCK']);
  });
});
