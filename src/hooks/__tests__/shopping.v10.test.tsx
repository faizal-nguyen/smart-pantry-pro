import { act, renderHook, waitFor } from '@testing-library/react';
import { useShoppingList } from '../useShoppingList';
import { executeStockCommand } from '@/services/stockCommands';

const mockUpdate = jest.fn();
const mockDelete = jest.fn();
let mockRefuse = false;
const mockRows = [{ id: '50000000-0000-4000-8000-000000000001', product_id: 'p', quantity: 1, unit: 'kg', stock_version: 2, is_purchased: true, priority: 1, created_at: '', updated_at: '', product: { id: 'p', name: 'Farine', unit_type: 'kg', category: '' } }];
jest.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getSession: async () => ({ data: { session: { user: { id: 'A' } } } }) },
  from: () => {
    let writing = false;
    const query = { select: () => query, eq: () => query, in: () => query, order: () => query,
      update: (value: unknown) => { mockUpdate(value); writing = true; return query; }, delete: mockDelete,
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: mockRows, error: writing && mockRefuse ? new Error('Écriture refusée') : null }).then(resolve) };
    return query;
  },
} }));
jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthSessionOptional: () => ({ user: { id: 'A' }, isLoading: false }) }));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('@/lib/agentEvents', () => ({ dispatchAgentDbChanged: jest.fn(), useAgentDbInvalidation: jest.fn() }));
jest.mock('@/services/stockCommands', () => ({ pendingIntent: async () => null, finishIntent: jest.fn(), executeStockCommand: jest.fn(),
  commandForIntent: async (kind: string,_intent: string,payload: unknown) => ({ command_id: 'command', command_type: kind, payload_version: 1, payload }),
}));
beforeEach(() => { jest.clearAllMocks(); mockRefuse = false; });
describe('purchased state and atomic transfer', () => {
  test('passes the explicit checked value and preserves state when the write is refused', async () => {
    const { result } = renderHook(() => useShoppingList());
    await waitFor(() => expect(result.current.loading).toBe(false));
    mockRefuse = true;
    await act(async () => { await expect(result.current.togglePurchased(mockRows[0].id,false)).rejects.toThrow('Écriture refusée'); });
    expect(mockUpdate).toHaveBeenCalledWith({ is_purchased: false });
    expect(result.current.shoppingList[0].is_purchased).toBe(true);
    expect(result.current.error).toBe('Écriture refusée');
  });
  test('refused transfer retains the purchased selection and never independently deletes it', async () => {
    jest.mocked(executeStockCommand).mockRejectedValueOnce(new Error('Transaction refusée'));
    const { result } = renderHook(() => useShoppingList());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await expect(result.current.addAllToInventory()).rejects.toThrow('Transaction refusée'); });
    expect(result.current.shoppingList).toHaveLength(1);
    expect(result.current.shoppingList[0].is_purchased).toBe(true);
    expect(mockDelete).not.toHaveBeenCalled();
    expect(result.current.isTransferring).toBe(false);
    expect(executeStockCommand).toHaveBeenCalledWith(expect.objectContaining({ command_type: 'transfer_shopping',
      payload: { items: [{ id: mockRows[0].id, expected_version: 2 }] },
    }));
  });
});
