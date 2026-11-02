import { fireRecipeAssistantAction } from '../recipeActions';
import { executeStockCommand, previewRecipeStock } from '@/services/stockCommands';

jest.mock('@/services/stockCommands', () => ({
  pendingIntent: jest.fn(async () => null), finishIntent: jest.fn(async () => undefined), executeStockCommand: jest.fn(async () => undefined),
  commandForIntent: jest.fn(async (type: string, _intent: string, payload: unknown) => ({ command_type: type, payload })),
  previewRecipeStock: jest.fn(),
}));

test('adding missing ingredients names the ones whose amount the shopping list cannot hold', async () => {
  const missing = (ingredient_name: string, quantity: number, unit: string, reason = 'NOT_IN_STOCK') =>
    ({ ingredient_index: 0, ingredient_name, quantity, unit, reason, is_essential: true });
  jest.mocked(previewRecipeStock).mockResolvedValue({ servings: 4, recipe: { version: 'v' },
    missing: [missing('sucre', 50, 'g'), missing('coriandre', 1, 'botte'), missing('sel', 1, 'pincée', 'UNIT_UNKNOWN')] } as never);
  const title = await fireRecipeAssistantAction({ id: '30000000-0000-4000-8000-000000000001', name: 'Riz', servings: 4 }, 'add_missing');
  expect(title).toBe('Ingrédients ajoutés aux courses · à ajouter à la main : coriandre');
  expect(executeStockCommand).toHaveBeenCalledWith(expect.objectContaining({ command_type: 'recipe_add_missing' }));
});
