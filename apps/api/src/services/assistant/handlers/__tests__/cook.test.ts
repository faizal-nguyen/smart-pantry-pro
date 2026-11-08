import type { SupabaseClient } from '@supabase/supabase-js';
import { CookRecipeHandler } from '../write.js';
import type { ToolExecutionContext } from '../types.js';

const USER = '00000000-0000-4000-8000-000000000001';
const RECIPE = '30000000-0000-4000-8000-000000000001';
const LOT = '20000000-0000-4000-8000-000000000001';
const COMMAND = '40000000-0000-4000-8000-000000000001';

// iPhone 2026-11-08: Confirmer on « J'ai cuisiné Lamb (Mutton) Biryani » → « La quantité disponible ne suffit plus ».
function client(flour: number) {
  const from = jest.fn((table: string) => {
    const data = table === 'stock_commands' ? null : [{ id: LOT, product_id: 'p', quantity: 1, unit: 'kg', stock_version: 2, product: { name: 'Farine', unit_type: 'kg' } }];
    const response = Promise.resolve({ data, error: null });
    const query = { select: () => query, eq: () => query, order: () => query, maybeSingle: () => response, then: response.then.bind(response) };
    return query;
  });
  const rpc = jest.fn(async (name: string) => name === 'stock_routine_capabilities' ? { data: 3, error: null }
    : name === 'resolve_stock_recipe' ? { data: { id: RECIPE, source: 'recipes', canonicalId: RECIPE, name: 'Pain', servings: 4, version: 'v1', ingredients: [
      { ingredient_name: 'Farine', inventory_product_id: 'p', quantity: flour, unit: 'g', is_essential: true },
      { ingredient_name: 'Beurre', quantity: 100, unit: 'g', is_essential: true }] }, error: null }
    : { data: { command_id: COMMAND, command_type: 'consume_recipe', status: 'confirmed', affected_tables: ['inventory'] }, error: null });
  const ctx = { userId: USER, commandId: COMMAND, userClient: { from, rpc } as unknown as SupabaseClient } as unknown as ToolExecutionContext;
  return { ctx, rpc };
}
const sent = (rpc: jest.Mock) => rpc.mock.calls.find(call => call[0] === 'execute_stock_command')?.[1] as { p_command: { payload: Record<string, unknown> }; p_allocations: unknown[] };

describe('cook_recipe takes what the stock holds', () => {
  test('an ingredient not in stock no longer refuses the cook: it is left outside', async () => {
    const { ctx, rpc } = client(200);
    const { result } = await new CookRecipeHandler().execute(ctx, { recipe_id: RECIPE, outside_inventory: [] });
    expect(sent(rpc).p_command.payload).toMatchObject({ outside_inventory: [1] });
    expect(sent(rpc).p_command.payload).not.toHaveProperty('adjustments');
    expect(sent(rpc).p_allocations).toEqual([expect.objectContaining({ ingredient_index: 0, inventory_id: LOT, quantity: .2, unit: 'kg' })]);
    expect(result.summary).toEqual(['Retiré de ton stock : Farine 200 g.', 'Pas dans ton stock, rien à retirer : Beurre.']);
  });
  test('a short ingredient: all of the lot is taken', async () => {
    const { ctx, rpc } = client(1500);
    await new CookRecipeHandler().execute(ctx, { recipe_id: RECIPE, outside_inventory: [] });
    expect(sent(rpc).p_command.payload).toMatchObject({ outside_inventory: [1], adjustments: [{ ingredient_index: 0, quantity: 1000, unit: 'g' }] });
    expect(sent(rpc).p_allocations).toEqual([expect.objectContaining({ inventory_id: LOT, quantity: 1, unit: 'kg' })]);
  });
  test('before the confirmation, it says what it will take', async () => {
    const { ctx, rpc } = client(1500);
    await expect(new CookRecipeHandler().preview(ctx, { recipe_id: RECIPE, outside_inventory: [] })).resolves.toEqual([
      'Je prends tout ce que tu as : Farine 1\u202f000 g (la recette en demande 1\u202f500 g).', 'Pas dans ton stock, rien à retirer : Beurre.']);
    expect(rpc).not.toHaveBeenCalledWith('execute_stock_command', expect.anything());
  });
});
