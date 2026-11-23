import type { SupabaseClient } from '@supabase/supabase-js';
import { StockCommandSchema } from '@smart/shared';
import { StockCommandService } from '../StockCommandService.js';

const USER = '00000000-0000-4000-8000-000000000001';
const ID = '40000000-0000-4000-8000-000000000001';
const ROW = '50000000-0000-4000-8000-000000000001';
const OTHER = '50000000-0000-4000-8000-000000000002';
const PRODUCT = '10000000-0000-4000-8000-000000000001';

const envelope = (command_type: string, items: unknown[]) => ({ command_id: ID, command_type, payload_version: 1, payload: { items } });
const parses = (command_type: string, items: unknown[]) => StockCommandSchema.safeParse(envelope(command_type, items)).success;
const add = (item: Record<string, unknown>) => ({ quantity: 1, unit: 'l', origin: 'manual', ...item });

function client(capability: number | null, error?: { message: string }) {
  const from = jest.fn(() => {
    const response = Promise.resolve({ data: null, error: null });
    const query = { select: () => query, eq: () => query, maybeSingle: () => response };
    return query;
  });
  const rpc = jest.fn(async (name: string) => name === 'stock_routine_capabilities'
    ? { data: capability, error: capability === null ? { message: 'not found' } : null }
    : { data: error ? null : { command_id: ID, command_type: 'shopping_add', status: 'confirmed', affected_tables: ['shopping_list'] }, error: error ?? null });
  return { supabase: { from, rpc } as unknown as SupabaseClient, rpc };
}

describe('shopping list commands', () => {
  test('an add names its product exactly once, with a closed origin and no account', () => {
    expect(parses('shopping_add', [add({ name: 'Lait' })])).toBe(true);
    expect(parses('shopping_add', [add({ product_id: PRODUCT, store_section: 'Crèmerie', target: { id: ROW, expected_version: 3 } })])).toBe(true);
    expect(parses('shopping_add', [add({})])).toBe(false);
    expect(parses('shopping_add', [add({ name: 'Lait', product_id: PRODUCT })])).toBe(false);
    expect(parses('shopping_add', [add({ name: 'Lait', origin: 'robot' })])).toBe(false);
    expect(parses('shopping_add', [add({ name: 'Lait', user_id: USER })])).toBe(false);
    expect(parses('shopping_add', [add({ name: 'Lait', quantity: 0 })])).toBe(false);
    expect(parses('shopping_add', [add({ name: 'Lait', target: { id: ROW } })])).toBe(false);
    expect(parses('shopping_add', [])).toBe(false);
  });

  test('check, update and remove carry the displayed version', () => {
    expect(parses('shopping_check', [{ id: ROW, expected_version: 2, purchased: true }])).toBe(true);
    expect(parses('shopping_check', [{ id: ROW, purchased: true }])).toBe(false);
    expect(parses('shopping_check', [{ id: ROW, expected_version: 2, purchased: 'yes' }])).toBe(false);
    expect(parses('shopping_update', [{ id: ROW, expected_version: 2, estimated_price: null, store_section: null }])).toBe(true);
    expect(parses('shopping_update', [{ id: ROW, expected_version: 2, name: 'Lait entier', category: 'Frais', quantity: 2, unit: 'l' }])).toBe(true);
    expect(parses('shopping_update', [{ id: ROW, expected_version: 2 }])).toBe(false);
    expect(parses('shopping_update', [{ id: ROW, expected_version: 2, estimated_price: -1 }])).toBe(false);
    expect(parses('shopping_update', [{ id: ROW, expected_version: 2, is_purchased: true }])).toBe(false);
    expect(parses('shopping_remove', [{ id: ROW, expected_version: 2 }, { id: OTHER, expected_version: 0 }])).toBe(true);
    expect(parses('shopping_remove', [{ id: ROW }])).toBe(false);
  });

  test('a database that does not declare the commands keeps the request instead of failing it', async () => {
    for (const capability of [3, null]) {
      const mocked = client(capability);
      await expect(new StockCommandService(mocked.supabase).execute(USER, envelope('shopping_add', [add({ name: 'Lait' })])))
        .rejects.toMatchObject({ code: 'MIGRATION_REQUIRED', status: 503 });
      expect(mocked.rpc).not.toHaveBeenCalledWith('execute_stock_command', expect.anything());
    }
    const ready = client(4);
    await new StockCommandService(ready.supabase).execute(USER, envelope('shopping_remove', [{ id: ROW, expected_version: 1 }]));
    expect(ready.rpc).toHaveBeenLastCalledWith('execute_stock_command', expect.objectContaining({ p_allocations: [] }));
  });

  test('a duplicated row is refused as invalid input, a stale one as a conflict', async () => {
    await expect(new StockCommandService(client(4, { message: 'DUPLICATE_ITEM' }).supabase)
      .execute(USER, envelope('shopping_remove', [{ id: ROW, expected_version: 1 }])))
      .rejects.toMatchObject({ code: 'DUPLICATE_ITEM', status: 400 });
    await expect(new StockCommandService(client(4, { message: 'CONFLICT' }).supabase)
      .execute(USER, envelope('shopping_check', [{ id: ROW, expected_version: 1, purchased: true }])))
      .rejects.toMatchObject({ code: 'CONFLICT', status: 409 });
  });
});
