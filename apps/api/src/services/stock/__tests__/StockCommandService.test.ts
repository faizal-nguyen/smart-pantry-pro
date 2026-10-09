import type { SupabaseClient } from '@supabase/supabase-js';
import { StockCommandService } from '../StockCommandService.js';

const USER = '00000000-0000-4000-8000-000000000001';
const ID = '40000000-0000-4000-8000-000000000001';
const RECIPE = '30000000-0000-4000-8000-000000000001';
const LOT = '20000000-0000-4000-8000-000000000001';
const result = { command_id: ID, command_type: 'consume_recipe', status: 'confirmed', affected_tables: ['inventory','cooking_journal'] };
const operation = { command_id: ID, command_type: 'consume_recipe', payload_version: 1,
  payload: { recipe: { id: RECIPE, source: 'auto' }, servings: 4, recipe_version: 'version', outside_inventory: [] } };

function client(opts: { receipt?: unknown; error?: { message: string; code?: string }; amount?: number | null; unit?: string; changed?: boolean; routine?: boolean } = {}) {
  const filters: Array<[string,unknown]> = [];
  const from = jest.fn((table: string) => {
    const data = table === 'stock_commands' ? opts.receipt ?? null : [{ id: LOT, product_id: 'p', quantity: 1, unit: 'kg', stock_version: 2, product: { name: 'Farine', unit_type: 'kg' } }];
    const response = Promise.resolve({ data, error: null });
    const query = { select: () => query, eq: (name: string,value: unknown) => { filters.push([name,value]); return query; }, order: () => query, maybeSingle: () => response,
      then: response.then.bind(response) };
    return query;
  });
  const rpc = jest.fn(async (name: string) => name === 'stock_routine_capabilities' ? { data:opts.routine===false ? null:2,error:opts.routine===false ? { message:'not found' }:null } : name === 'resolve_stock_recipe' ? { data: {
    id: RECIPE, source: 'recipes', canonicalId: RECIPE, name: 'Pain', servings: 4, version: opts.changed ? 'new' : 'version',
    ingredients: [{ ingredient_name: 'Farine', inventory_product_id: 'p', quantity: opts.amount === undefined ? 200 : opts.amount, unit: opts.unit ?? 'g', is_essential: true }],
  }, error: null } : { data: opts.error ? null : result, error: opts.error ?? null });
  return { supabase: { from, rpc } as unknown as SupabaseClient, from, rpc, filters };
}

describe('StockCommandService', () => {
  test('returns a receipt before consulting already-modified stock', async () => {
    const mocked = client({ receipt: { command_type: operation.command_type, payload: operation.payload, result } });
    expect(await new StockCommandService(mocked.supabase).execute(USER,operation)).toEqual(result);
    expect(mocked.rpc).not.toHaveBeenCalled();
    expect(mocked.filters).toContainEqual(['user_id',USER]);
  });
  test('receipt comparison ignores object-key order and rejects an altered payload', async () => {
    const mocked = client({ receipt: { command_type: operation.command_type, payload: { outside_inventory: [], recipe_version: 'version', servings: 4, recipe: { source: 'auto', id: RECIPE } }, result } });
    const service = new StockCommandService(mocked.supabase);
    await expect(service.execute(USER,operation)).resolves.toEqual(result);
    await expect(service.execute(USER,{ ...operation, payload: { ...operation.payload, servings: 8 } })).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT', status: 409 });
  });
  test('passes a converted allocation and current version to the single RPC', async () => {
    const mocked = client();
    await new StockCommandService(mocked.supabase).execute(USER,operation);
    expect(mocked.rpc).toHaveBeenLastCalledWith('execute_stock_command',expect.objectContaining({ p_allocations: [{ ingredient_index: 0, inventory_id: LOT, quantity: .2, unit: 'kg', expected_version: 2 }] }));
  });
  test('changed recipe and unverified ingredient cannot be silently consumed', async () => {
    await expect(new StockCommandService(client({ changed: true }).supabase).execute(USER,operation)).rejects.toMatchObject({ code: 'RECIPE_CHANGED' });
    const mocked = client({ amount: null });
    await expect(new StockCommandService(mocked.supabase).execute(USER,operation)).rejects.toMatchObject({ code: 'INSUFFICIENT_QUANTITY' });
    expect(mocked.rpc).toHaveBeenCalledTimes(1);
  });
  test('explicit outside-stock declaration permits a journal without invented deductions', async () => {
    const mocked = client({ amount: null });
    await new StockCommandService(mocked.supabase).execute(USER,{ ...operation, payload: { ...operation.payload, outside_inventory: [0] } });
    expect(mocked.rpc).toHaveBeenLastCalledWith('execute_stock_command',expect.objectContaining({ p_allocations: [] }));
  });
  test('database conflict is recoverable and internal SQL failures are not reported as success', async () => {
    await expect(new StockCommandService(client({ error: { message: 'CONFLICT' } }).supabase).execute(USER,operation)).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });
    await expect(new StockCommandService(client({ error: { message: 'internal SQL details' } }).supabase).execute(USER,operation)).rejects.toMatchObject({ code: 'STOCK_WRITE_FAILED', status: 500 });
  });
  test('actual quantities are converted once and selected lots remain explicit', async () => {
    const mocked=client();
    await new StockCommandService(mocked.supabase).execute(USER,{ ...operation,payload:{ ...operation.payload,servings:8,adjustments:[{ ingredient_index:0,quantity:125,unit:'g',inventory_id:LOT }] } });
    expect(mocked.rpc).toHaveBeenCalledWith('stock_routine_capabilities');
    expect(mocked.rpc).toHaveBeenLastCalledWith('execute_stock_command',expect.objectContaining({ p_allocations:[{ ingredient_index:0,inventory_id:LOT,quantity:.125,unit:'kg',expected_version:2 }] }));
  });
  test('an older database cannot silently ignore reviewed quantities', async () => {
    const mocked=client({ routine:false });
    await expect(new StockCommandService(mocked.supabase).execute(USER,{ command_id:ID,command_type:'transfer_shopping',payload_version:1,payload:{ items:[{ id:LOT,expected_version:0,quantity:750,unit:'g' }] } })).rejects.toMatchObject({ code:'MIGRATION_REQUIRED',status:503 });
    expect(mocked.rpc).toHaveBeenCalledTimes(1);
    await expect(new StockCommandService(mocked.supabase).execute(USER,{ ...operation,payload:{ ...operation.payload,adjustments:[{ ingredient_index:0,quantity:125,unit:'g' }] } })).rejects.toMatchObject({ code:'MIGRATION_REQUIRED',status:503 });
    expect(mocked.rpc).not.toHaveBeenCalledWith('execute_stock_command',expect.anything());
  });
});
