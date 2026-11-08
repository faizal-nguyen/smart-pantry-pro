import { act, renderHook, waitFor } from '@testing-library/react';
import { useInventory } from '../useInventory';
import { commandForIntent, executeStockCommand, finishIntent } from '@/services/stockCommands';

let mockPending: unknown = null;
const lot = { id: 'lot', product_id: 'p', quantity: 5, unit: 'pièce', stock_version: 3, expiry_date: null, location: null,
  product: { id: 'p', name: 'Œufs', unit_type: 'pièce', category: '' } };
jest.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: 'A' } } }), getSession: async () => ({ data: { session: { user: { id: 'A' } } } }) },
  from: (table: string) => {
    const query: Record<string, unknown> = { select: () => query, eq: () => query, in: () => query, order: () => query,
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: table === 'inventory' ? [lot] : [], error: null }).then(resolve) };
    return query;
  },
} }));
jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthSessionOptional: () => ({ user: { id: 'A' }, isLoading: false }) }));
jest.mock('@/lib/agentEvents', () => ({ dispatchAgentDbChanged: jest.fn(), useAgentDbInvalidation: jest.fn() }));
jest.mock('@/services/voice/voiceOutputService', () => ({ voiceOutputService: {} }));
jest.mock('@/services/stockCommands', () => ({ pendingIntent: async () => mockPending, finishIntent: jest.fn(),
  executeStockCommand: jest.fn(async (command: { command_id: string }) => ({ command_id: command.command_id, status: 'confirmed', affected_tables: ['inventory'] })),
  commandForIntent: jest.fn(async (kind: string, _intent: string, payload: unknown) => ({ command_id: 'new', command_type: kind, payload_version: 1, payload })),
}));
const consumption = (quantity: number) => ({ command_id: 'old', command_type: 'consume_inventory', payload_version: 1,
  payload: { items: [{ id: 'lot', quantity, unit: 'pièce', expected_version: 3 }] } });
beforeEach(() => { jest.clearAllMocks(); mockPending = null; });

async function consume(quantity: number) {
  const { result } = renderHook(() => useInventory());
  await waitFor(() => expect(result.current.loading).toBe(false));
  let outcome: Promise<unknown> = Promise.resolve();
  await act(async () => { outcome = result.current.consumeItem('lot', quantity); await outcome.catch(() => undefined); });
  return outcome;
}

describe('consuming from a lot', () => {
  test('a lost response is replayed with its own identity', async () => {
    mockPending = consumption(2);
    await expect(consume(2)).resolves.toMatchObject({ command_id: 'old' });
    expect(commandForIntent).not.toHaveBeenCalled();
  });
  // Audit 2026-11-07: a new amount silently replayed the previous one instead.
  test('a new amount first settles the previous one and says so, without consuming it in its place', async () => {
    mockPending = consumption(1);
    await expect(consume(2)).rejects.toThrow('Ta consommation précédente vient d’être confirmée. Vérifie ton stock avant de recommencer.');
    expect(executeStockCommand).toHaveBeenCalledTimes(1);
    expect(executeStockCommand).toHaveBeenCalledWith(expect.objectContaining({ command_id: 'old' }));
    expect(finishIntent).toHaveBeenCalledWith('inventory-consume:lot');
    expect(commandForIntent).not.toHaveBeenCalled();
  });
});
