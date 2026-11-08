import { cookRecipeWithStock, fireRecipeAssistantAction } from '../recipeActions';
import { commandForIntent, executeStockCommand, previewRecipeStock } from '@/services/stockCommands';

let mockPlans: Array<{ week_start_date: string; meal_plan_entries: Array<{ day_of_week: number; meal_type: string; recipe_name: string }> }> = [];
jest.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getSession: async () => ({ data: { session: { user: { id: 'owner-a' } } } }) },
  from: () => { const query: Record<string, unknown> = { select: () => query, eq: () => query, gte: () => query, lte: () => query,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: mockPlans, error: null }).then(resolve) }; return query; },
} }));
jest.mock('@/services/stockCommands', () => ({
  pendingIntent: jest.fn(async () => null), finishIntent: jest.fn(async () => undefined), executeStockCommand: jest.fn(async () => undefined),
  commandForIntent: jest.fn(async (type: string, _intent: string, payload: unknown) => ({ command_id: 'command-1', command_type: type, payload })),
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

// iPhone 2026-11-08: a cook refused as soon as one ingredient was missing (« quantités ou unités à vérifier »).
test('« Cuisinée » takes what the stock holds and says what it left out', async () => {
  const lot = (id: string, product_name: string, quantity: number, unit: string) => ({ id, product_id: 'p-' + id, product_name, quantity, unit, stock_version: 1 });
  jest.mocked(previewRecipeStock).mockResolvedValue({ servings: 2, lots: [lot('riz', 'Riz basmati', 100, 'g'), lot('oignon', 'Oignon', 3, 'pièce')],
    recipe: { version: 'v', servings: 2, ingredients: [{ ingredient_name: 'Riz basmati', quantity: 300, unit: 'g' }, { ingredient_name: 'Agneau', quantity: 500, unit: 'g' },
      { ingredient_name: 'Oignon', quantity: 2, unit: 'pièce' }] }, allocations: [], missing: [] } as never);
  const outcome = await cookRecipeWithStock({ id: '30000000-0000-4000-8000-000000000001', name: 'Lamb (Mutton) Biryani' });
  expect(commandForIntent).toHaveBeenLastCalledWith('consume_recipe', 'recipe:30000000-0000-4000-8000-000000000001:cooked', expect.objectContaining({
    outside_inventory: [1], adjustments: [{ ingredient_index: 0, quantity: 100, unit: 'g' }] }));
  expect(outcome).toEqual({ title: 'Repas enregistré et stock mis à jour', commandId: 'command-1', details: [
    'Retiré de ton stock : Oignon 2 pièce.', 'Tout ce que tu avais : Riz basmati 100 g (la recette en demande 300 g).', 'Pas dans ton stock, rien à retirer : Agneau.'] });
});

describe('« Planifier » takes the next free dinner (audit 2026-11-07: it replaced tonight’s meal)', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-08T10:00:00Z'));
    jest.mocked(previewRecipeStock).mockResolvedValue({ servings: 4, recipe: { version: 'v' }, missing: [] } as never);
  });
  afterEach(() => { jest.useRealTimers(); mockPlans = []; });
  const plan = () => fireRecipeAssistantAction({ id: '30000000-0000-4000-8000-000000000001', name: 'Dhal' }, 'plan');
  test('tonight when it is free', async () => {
    await expect(plan()).resolves.toBe('Ajoutée au menu : ce soir');
    expect(commandForIntent).toHaveBeenLastCalledWith('plan_recipe', expect.any(String), expect.objectContaining({ date: '2026-11-08', meal_type: 'dinner' }));
  });
  test('after the dinners already planned', async () => {
    mockPlans = [{ week_start_date: '2026-11-02', meal_plan_entries: [{ day_of_week: 6, meal_type: 'dinner', recipe_name: 'Curry' }] },
      { week_start_date: '2026-11-09', meal_plan_entries: [{ day_of_week: 0, meal_type: 'dinner', recipe_name: 'Soupe' }, { day_of_week: 1, meal_type: 'lunch', recipe_name: 'Salade' }] }];
    await expect(plan()).resolves.toBe('Ajoutée au menu : dîner, mardi 10 novembre');
    expect(commandForIntent).toHaveBeenLastCalledWith('plan_recipe', expect.any(String), expect.objectContaining({ date: '2026-11-10' }));
  });
});

test('« Ajouter les manquants » with everything already on the list says so', async () => {
  jest.mocked(previewRecipeStock).mockResolvedValue({ servings: 4, recipe: { version: 'v' },
    missing: [{ ingredient_index: 0, ingredient_name: 'riz', quantity: 300, unit: 'g', reason: 'NOT_IN_STOCK', is_essential: true }] } as never);
  jest.mocked(executeStockCommand).mockResolvedValueOnce({ command_id: 'c', command_type: 'recipe_add_missing', status: 'confirmed', affected_tables: [], shopping_ids: [] });
  await expect(fireRecipeAssistantAction({ id: '30000000-0000-4000-8000-000000000001', name: 'Riz', servings: 4 }, 'add_missing'))
    .resolves.toBe('Déjà sur ta liste de courses');
});
// Audit 2026-11-07: « Ingrédients ajoutés aux courses » even when nothing was missing.
test('nothing missing: it says so and sends nothing', async () => {
  jest.mocked(previewRecipeStock).mockResolvedValue({ servings: 4, recipe: { version: 'v' }, missing: [] } as never);
  jest.mocked(executeStockCommand).mockClear();
  await expect(fireRecipeAssistantAction({ id: '30000000-0000-4000-8000-000000000001', name: 'Riz', servings: 4 }, 'add_missing'))
    .resolves.toBe('Rien à ajouter : tout est déjà dans ton stock');
  expect(executeStockCommand).not.toHaveBeenCalled();
});
test('only amounts the list cannot hold: they are named, nothing is sent', async () => {
  jest.mocked(previewRecipeStock).mockResolvedValue({ servings: 4, recipe: { version: 'v' },
    missing: [{ ingredient_index: 0, ingredient_name: 'coriandre', quantity: 1, unit: 'botte', reason: 'NOT_IN_STOCK', is_essential: true }] } as never);
  jest.mocked(executeStockCommand).mockClear();
  await expect(fireRecipeAssistantAction({ id: '30000000-0000-4000-8000-000000000001', name: 'Riz', servings: 4 }, 'add_missing'))
    .resolves.toBe('Rien à ajouter automatiquement · à ajouter à la main : coriandre');
  expect(executeStockCommand).not.toHaveBeenCalled();
});
