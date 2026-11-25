import type { SupabaseClient } from '@supabase/supabase-js';
import { RECEIPT_COMMANDS_CAPABILITY, StockCommandSchema } from '@smart/shared';
import { StockCommandService } from '../StockCommandService.js';

// V11-01 E5a: a reviewed receipt applied to the list once (reconcile_receipt).
const USER = '00000000-0000-4000-8000-000000000001';
const ID = '40000000-0000-4000-8000-000000000001';
const SCAN = '70000000-0000-4000-8000-000000000001';
const ROW = '50000000-0000-4000-8000-000000000001';
const matched = { line_index: 0, name: 'Farine de blé', quantity: 1000, unit: 'g', unit_price: null, total_price: 1.2, target: { shopping_id: ROW, expected_version: 2 } };
const added = { line_index: 3, name: 'Chocolat noir', quantity: 2, unit: 'pièce', unit_price: 1.99, total_price: 3.98, target: null };
const reconcile = (lines: unknown[] = [matched, added], extra: Record<string, unknown> = {}) =>
  ({ command_id: ID, command_type: 'reconcile_receipt', payload_version: 1, payload: { receipt_scan_id: SCAN, lines, ...extra } });

function client(capability: number, error?: { message: string }) {
  const from = jest.fn(() => {
    const response = Promise.resolve({ data: null, error: null });
    const query = { select: () => query, eq: () => query, maybeSingle: () => response };
    return query;
  });
  const rpc = jest.fn(async (name: string) => name === 'stock_routine_capabilities' ? { data: capability, error: null }
    : { data: error ? null : { command_id: ID, command_type: 'reconcile_receipt', status: 'confirmed', affected_tables: ['shopping_list'] }, error: error ?? null });
  return { supabase: { from, rpc } as unknown as SupabaseClient, rpc };
}

test('each line names its place in the scan, a quantity with its unit, its prices or null, and a row of the list or none', () => {
  expect(StockCommandSchema.safeParse(reconcile()).success).toBe(true);
  for (const invalid of [
    reconcile([]), reconcile(Array.from({ length: 121 }, (_, index) => ({ ...added, line_index: index }))),
    reconcile([matched, { ...added, line_index: 0 }]),
    reconcile([{ ...added, quantity: null }]), reconcile([{ ...added, quantity: 0 }]), reconcile([{ ...added, unit: '' }]),
    reconcile([{ ...added, name: ' ' }]), reconcile([{ ...added, total_price: -1 }]), reconcile([{ ...added, unit_price: 100001 }]),
    reconcile([{ ...added, line_index: 1.5 }]), reconcile([{ ...added, target: undefined }]),
    reconcile([{ ...matched, target: { shopping_id: ROW } }]), reconcile([{ ...added, user_id: USER }]),
    reconcile([added], { user_id: USER }), reconcile([added], { receipt_scan_id: 'scan' }),
  ]) expect(StockCommandSchema.safeParse(invalid).success).toBe(false);
});

test('a database below capability 7 keeps the request instead of writing it', async () => {
  expect(RECEIPT_COMMANDS_CAPABILITY).toBe(7);
  const old = client(6);
  await expect(new StockCommandService(old.supabase).execute(USER, reconcile())).rejects.toMatchObject({ code: 'MIGRATION_REQUIRED', status: 503 });
  expect(old.rpc).not.toHaveBeenCalledWith('execute_stock_command', expect.anything());
  const ready = client(7);
  await new StockCommandService(ready.supabase).execute(USER, reconcile());
  expect(ready.rpc).toHaveBeenLastCalledWith('execute_stock_command', expect.objectContaining({ p_allocations: [] }));
});

test.each([
  ['RECEIPT_ALREADY_APPLIED', 409, 'Ce ticket a déjà été rapproché de ta liste.'],
  ['RECEIPT_NOT_FOUND', 400, 'Ce ticket n’est plus disponible : scanne-le à nouveau.'],
  ['UNIT_INCOMPATIBLE', 400, 'Ces unités ne sont pas convertibles sans information supplémentaire.'],
])('%s is a refusal to explain, never a failure', async (code, status, message) => {
  await expect(new StockCommandService(client(7, { message: code }).supabase).execute(USER, reconcile()))
    .rejects.toMatchObject({ code, status, message });
});
