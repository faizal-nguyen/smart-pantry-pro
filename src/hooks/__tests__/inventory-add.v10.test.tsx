import { act, renderHook, waitFor } from '@testing-library/react';
import { useInventory } from '../useInventory';
import { executeStockCommand } from '@/services/stockCommands';

const mockInsert = jest.fn();
let mockLots: unknown[] = [];
jest.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: 'A' } } }), getSession: async () => ({ data: { session: { user: { id: 'A' } } } }) },
  from: (table: string) => {
    const query: Record<string, unknown> = { select: () => query, eq: () => query, in: () => query, order: () => query,
      insert: (rows: unknown) => { mockInsert(rows); return { select: () => ({ single: async () => ({ data: { id: 'new', product_id: 'p', quantity: 2, unit: 'kg' }, error: null }) }) }; },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: table === 'inventory' ? mockLots : [], error: null }).then(resolve) };
    return query;
  },
} }));
jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthSessionOptional: () => ({ user: { id: 'A' }, isLoading: false }) }));
jest.mock('@/lib/agentEvents', () => ({ dispatchAgentDbChanged: jest.fn(), useAgentDbInvalidation: jest.fn() }));
jest.mock('@/services/voice/voiceOutputService', () => ({ voiceOutputService: { announceItemAdded: jest.fn() } }));
jest.mock('@/services/stockCommands', () => ({ pendingIntent: async () => null, finishIntent: jest.fn(),
  executeStockCommand: jest.fn(async (command: { command_id: string }) => ({ command_id: command.command_id, status: 'confirmed', affected_tables: ['inventory'] })),
  commandForIntent: async (kind: string, _intent: string, payload: unknown) => ({ command_id: 'command', command_type: kind, payload_version: 1, payload }),
}));
const lot = { id: 'lot', product_id: 'p', quantity: 1, unit: null, stock_version: 3, expiry_date: null, location: null,
  product: { id: 'p', name: 'pomme de terre', unit_type: 'unité', category: '' } };
beforeEach(() => { jest.clearAllMocks(); mockLots = []; });

describe('a manual add tops up the matching lot', () => {
  test('2 pommes de terre join the lot of 1, undoable by its command (prod case 2026-11-04)', async () => {
    mockLots = [lot];
    const { result } = renderHook(() => useInventory());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let added: Awaited<ReturnType<typeof result.current.addToInventory>> | undefined;
    await act(async () => { added = await result.current.addToInventory({ product_id: 'p', quantity: 2 }); });
    expect(executeStockCommand).toHaveBeenCalledWith(expect.objectContaining({ command_type: 'adjust_inventory',
      payload: { items: [{ id: 'lot', quantity: 3, unit: 'unité', expected_version: 3 }] } }));
    expect(mockInsert).not.toHaveBeenCalled();
    expect(added).toMatchObject({ id: 'lot', quantity: 3, top_up_command_id: 'command' });
  });
  test('2 kg next to a lot counted in unités makes a new row', async () => {
    mockLots = [lot];
    const { result } = renderHook(() => useInventory());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.addToInventory({ product_id: 'p', quantity: 2, unit: 'kg' }); });
    expect(executeStockCommand).not.toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalledWith([expect.objectContaining({ product_id: 'p', quantity: 2, unit: 'kg' })]);
  });
});
