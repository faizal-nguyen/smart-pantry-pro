import type { SupabaseClient } from '@supabase/supabase-js';
import { StockCommandSchema } from '@smart/shared';
import { StockCommandService } from '../StockCommandService.js';

const USER = '00000000-0000-4000-8000-000000000001';
const ID = '40000000-0000-4000-8000-000000000001';
const ROW = '50000000-0000-4000-8000-000000000001';
const MEAL = '60000000-0000-4000-8000-000000000001';
const menu = (payload: Record<string, unknown> = {}) => ({ command_id: ID, command_type: 'menu_add_missing', payload_version: 1, payload: {
  week_start: '2026-11-30', as_of: '2026-11-24', menu_version: 'a'.repeat(32), context_revision: 7,
  adds: [{ name: 'farine', quantity: 50, unit: 'g', target: { id: ROW, expected_version: 2 } }], reductions: [], ...payload } });
const cooked = { command_id: ID, command_type: 'consume_recipe', payload_version: 1, payload: {
  recipe: { id: '30000000-0000-4000-8000-000000000001', source: 'auto' }, servings: 4, recipe_version: 'v', outside_inventory: [],
  meal_plan_entry_id: MEAL, entry_version: 0 } };

function client(capability: number, error?: { message: string }) {
  const from = jest.fn(() => {
    const response = Promise.resolve({ data: null, error: null });
    const query = { select: () => query, eq: () => query, maybeSingle: () => response };
    return query;
  });
  const rpc = jest.fn(async (name: string) => name === 'stock_routine_capabilities' ? { data: capability, error: null }
    : { data: error ? null : { command_id: ID, command_type: 'menu_add_missing', status: 'confirmed', affected_tables: ['shopping_list'] }, error: error ?? null });
  return { supabase: { from, rpc } as unknown as SupabaseClient, rpc };
}

describe('week shopping and planned-meal commands', () => {
  test('menu_add_missing carries the three tokens and bounded lists, never an account', () => {
    expect(StockCommandSchema.safeParse(menu()).success).toBe(true);
    expect(StockCommandSchema.safeParse(menu({ adds: [], reductions: [{ id: ROW, expected_version: 3, quantity: 100, unit: 'g' }] })).success).toBe(true);
    expect(StockCommandSchema.safeParse(menu({ adds: [], reductions: [] })).success).toBe(false);
    expect(StockCommandSchema.safeParse(menu({ menu_version: 'stale' })).success).toBe(false);
    expect(StockCommandSchema.safeParse(menu({ user_id: USER })).success).toBe(false);
    expect(StockCommandSchema.safeParse(menu({ adds: [{ name: 'farine', product_id: ROW, quantity: 1, unit: 'g' }] })).success).toBe(false);
  });

  test('a cooked meal is named with its version, both or neither', () => {
    expect(StockCommandSchema.safeParse(cooked).success).toBe(true);
    expect(StockCommandSchema.safeParse({ ...cooked, payload: { ...cooked.payload, entry_version: undefined } }).success).toBe(false);
  });

  test('a database below capability 5 keeps the request instead of writing it', async () => {
    for (const operation of [menu(), cooked]) {
      const mocked = client(4);
      await expect(new StockCommandService(mocked.supabase).execute(USER, operation)).rejects.toMatchObject({ code: 'MIGRATION_REQUIRED', status: 503 });
      expect(mocked.rpc).not.toHaveBeenCalledWith('execute_stock_command', expect.anything());
    }
    const ready = client(5);
    await new StockCommandService(ready.supabase).execute(USER, menu());
    expect(ready.rpc).toHaveBeenLastCalledWith('execute_stock_command', expect.objectContaining({ p_allocations: [] }));
  });

  test.each(['STOCK_CHANGED', 'ALREADY_COOKED', 'MEAL_COOKED', 'MENU_CHANGED'])('%s is a conflict to reread, not a failure', async code => {
    await expect(new StockCommandService(client(5, { message: code }).supabase).execute(USER, menu()))
      .rejects.toMatchObject({ code, status: 409 });
  });
});
