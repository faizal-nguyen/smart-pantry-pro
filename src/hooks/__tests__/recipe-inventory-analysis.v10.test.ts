import type { RecipeStockPreview } from '@smart/shared';
import { analysisFromPreview } from '../useRecipeInventoryAnalysis';

jest.mock('@/services/stockCommands', () => ({ previewRecipeStock: jest.fn() }));
jest.mock('../useAuthenticatedUser', () => ({ useAuthSessionOptional: () => ({ user: null }) }));

const preview = (missing: RecipeStockPreview['missing']): RecipeStockPreview => ({
  recipe: { id: 'r', source: 'recipes', canonicalId: 'r', name: 'Riz sauté', servings: 2, prep_time: 5, cook_time: 10, version: 'v',
    ingredients: [
      { ingredient_name: 'riz', quantity: 200, unit: 'g', is_essential: true },
      { ingredient_name: 'sel', quantity: 1, unit: 'c. à café', is_essential: true },
      { ingredient_name: 'ciboule', quantity: 1, unit: 'tige', is_essential: false },
    ] },
  servings: 2, lots: [], allocations: [], missing,
} as RecipeStockPreview);

test('an ingredient in stock with an amount to verify does not stop the recipe, an absent one does', () => {
  const toVerify = { ingredient_index: 1, ingredient_name: 'sel', quantity: 1, unit: 'c. à café', reason: 'UNIT_INCOMPATIBLE' as const, is_essential: true };
  const garnish = { ingredient_index: 2, ingredient_name: 'ciboule', quantity: 1, unit: 'tige', reason: 'NOT_IN_STOCK' as const, is_essential: false };
  const ready = analysisFromPreview(preview([toVerify, garnish]));
  expect(ready).toMatchObject({ canMake: true, confidence: 1 });
  expect(ready.missingIngredients.map(item => item.ingredient.ingredient_name)).toEqual(['ciboule']);
  expect(ready.ingredientsToVerify.map(item => item.ingredient.ingredient_name)).toEqual(['sel']);
  const absent = analysisFromPreview(preview([{ ...toVerify, reason: 'NOT_IN_STOCK' }]));
  expect(absent).toMatchObject({ canMake: false, confidence: 0.5 });
  expect(absent.shoppingList.map(item => [item.ingredient.ingredient_name, item.quantity, item.unit])).toEqual([['sel', 1, 'c. à café']]);
});
