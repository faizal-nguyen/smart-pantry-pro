import { act, renderHook, waitFor } from '@testing-library/react';
import type { StockCommandResult } from '@smart/shared';
import { useShoppingList } from '../useShoppingList';
import { executeStockCommand, finishIntent, pendingIntents, undoStockCommand } from '@/services/stockCommands';
import { ApiError } from '@/lib/api';

const ROW = '50000000-0000-4000-8000-000000000001';
const OTHER = '50000000-0000-4000-8000-000000000002';
const mockFetch = jest.fn();
const mockWrite = jest.fn();
const mockRows = [
  { id: ROW, product_id: 'p', quantity: 1, unit: 'kg', stock_version: 2, is_purchased: true, priority: 1, created_at: '', updated_at: '', product: { id: 'p', name: 'Farine', unit_type: 'kg', category: '' } },
  { id: OTHER, product_id: 'q', quantity: 1, unit: 'l', stock_version: 5, is_purchased: false, priority: 1, created_at: '', updated_at: '', product: { id: 'q', name: 'Lait', unit_type: 'l', category: '' } },
];
jest.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getSession: async () => ({ data: { session: { user: { id: 'A' } } } }) },
  from: () => {
    const query = { select: () => query, eq: () => query, in: () => query, order: () => query,
      insert: mockWrite, update: mockWrite, delete: mockWrite,
      then: (resolve: (value: unknown) => unknown) => { mockFetch(); return Promise.resolve({ data: mockRows, error: null }).then(resolve); } };
    return query;
  },
} }));
jest.mock('@/lib/api', () => {
  class MockApiError extends Error {
    status: number; code?: string;
    constructor(message: string, options: { status: number; code?: string }) { super(message); this.status = options.status; this.code = options.code; }
  }
  return { ApiError: MockApiError };
});
jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthSessionOptional: () => ({ user: { id: 'A' }, isLoading: false }) }));
jest.mock('@/lib/agentEvents', () => ({ dispatchAgentDbChanged: jest.fn(), useAgentDbInvalidation: jest.fn() }));
let mockCommandCount = 0;
jest.mock('@/services/stockCommands', () => ({
  pendingIntent: async () => null, pendingIntents: jest.fn(async () => []), finishIntent: jest.fn(), executeStockCommand: jest.fn(), undoStockCommand: jest.fn(),
  commandForIntent: async (kind: string, _intent: string, payload: unknown) => ({ command_id: `command-${++mockCommandCount}`, command_type: kind, payload_version: 1, payload }),
}));
const confirmed = (command_type: string, shopping_changes: unknown[] = []) =>
  ({ command_id: 'command', command_type, status: 'confirmed', affected_tables: ['shopping_list'], shopping_changes }) as StockCommandResult;
/** The server answers with the identity of the command it ran. */
const answer = (shopping_changes: unknown[] = []) => async (command: { command_id: string; command_type: string }) =>
  ({ ...confirmed(command.command_type, shopping_changes), command_id: command.command_id }) as never;

async function loaded() {
  const hook = renderHook(() => useShoppingList());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}
beforeEach(() => { jest.clearAllMocks(); mockCommandCount = 0; jest.mocked(pendingIntents).mockResolvedValue([]); });

describe('shopping list writes go through commands', () => {
  test('an add names the product and its origin, and announces the row it topped up', async () => {
    jest.mocked(executeStockCommand).mockImplementationOnce(answer([{ id: OTHER, outcome: 'merged', name: 'Lait', quantity: 2, unit: 'l', added_quantity: 1 }]));
    const { result } = await loaded();
    await act(async () => { await result.current.addToShoppingList({ productName: ' Lait ', quantity: 1, unit: 'l', category: 'Frais' }); });
    expect(executeStockCommand).toHaveBeenCalledWith(expect.objectContaining({ command_type: 'shopping_add',
      payload: { items: [{ name: 'Lait', category: 'Frais', quantity: 1, unit: 'l', origin: 'manual' }] } }));
    expect(result.current.lastShoppingChange).toEqual({ commandId: 'command-1', message: 'Lait : 1 l ajouté, 2 l au total.' });
    expect(mockWrite).not.toHaveBeenCalled();
  });

  test('a new row explains why the listed product was not topped up; the stock sends its own origin', async () => {
    jest.mocked(executeStockCommand).mockResolvedValueOnce(confirmed('shopping_add', [{ id: 'n', outcome: 'created', name: 'Farine', quantity: 2, unit: 'paquet', note: 'unit_incompatible' }]));
    const { result } = await loaded();
    await act(async () => { await result.current.addToShoppingList({ productName: 'Farine', quantity: 2, unit: 'paquet', category: 'Épicerie' }, 'stock_row'); });
    expect(jest.mocked(executeStockCommand).mock.calls[0][0].payload).toEqual({ items: [expect.objectContaining({ origin: 'stock_row' })] });
    expect(result.current.lastShoppingChange?.message).toBe('Farine : nouvelle ligne de 2 paquet, l’unité diffère de la ligne déjà prévue.');
  });

  test('a check carries the displayed version; a stale one rereads the list without checking again', async () => {
    jest.mocked(executeStockCommand).mockRejectedValueOnce(new ApiError('Le stock ou l’achat a changé.', { status: 409, code: 'CONFLICT' }));
    const { result } = await loaded();
    const reads = mockFetch.mock.calls.length;
    await act(async () => { await expect(result.current.togglePurchased(OTHER, true)).rejects.toThrow('Cet article a changé entre-temps'); });
    expect(executeStockCommand).toHaveBeenCalledTimes(1);
    expect(executeStockCommand).toHaveBeenCalledWith(expect.objectContaining({ command_type: 'shopping_check',
      payload: { items: [{ id: OTHER, expected_version: 5, purchased: true }] } }));
    expect(mockFetch.mock.calls.length).toBeGreaterThan(reads);
    expect(result.current.shoppingList.find(row => row.id === OTHER)?.is_purchased).toBe(false);
  });

  test('removing and clearing bought rows send every displayed version in one command', async () => {
    jest.mocked(executeStockCommand).mockResolvedValue(confirmed('shopping_remove', [{ id: ROW, outcome: 'removed', name: 'Farine' }]));
    const { result } = await loaded();
    await act(async () => { await result.current.clearPurchased(); });
    expect(executeStockCommand).toHaveBeenLastCalledWith(expect.objectContaining({ command_type: 'shopping_remove',
      payload: { items: [{ id: ROW, expected_version: 2 }] } }));
    expect(result.current.lastShoppingChange?.message).toBe('Farine retiré des courses.');
    await act(async () => { await result.current.removeMultipleFromShoppingList([OTHER, ROW]); });
    expect(jest.mocked(executeStockCommand).mock.calls[1][0].payload).toEqual({ items: [{ id: ROW, expected_version: 2 }, { id: OTHER, expected_version: 5 }] });
  });

  test('an edit sends the fields of the dialog at the version it opened on', async () => {
    jest.mocked(executeStockCommand).mockResolvedValueOnce(confirmed('shopping_update', [{ id: OTHER, outcome: 'updated', name: 'Lait entier' }]));
    const { result } = await loaded();
    await act(async () => { await result.current.updateShoppingItem(OTHER, { productName: 'Lait entier', quantity: 2, unit: 'l', category: 'Frais', estimatedPrice: 1.5, storeSection: 'Crèmerie' }); });
    expect(executeStockCommand).toHaveBeenCalledWith(expect.objectContaining({ command_type: 'shopping_update',
      payload: { items: [{ id: OTHER, expected_version: 5, name: 'Lait entier', category: 'Frais', quantity: 2, unit: 'l', estimated_price: 1.5, store_section: 'Crèmerie' }] } }));
  });

  test('the last change is undone by undo_stock, then forgotten', async () => {
    jest.mocked(executeStockCommand).mockImplementationOnce(answer([{ id: OTHER, outcome: 'checked', name: 'Lait' }]));
    jest.mocked(undoStockCommand).mockResolvedValueOnce(confirmed('undo_stock') as never);
    const { result } = await loaded();
    await act(async () => { await result.current.togglePurchased(OTHER, true); });
    expect(result.current.lastShoppingChange).toEqual({ commandId: 'command-1', message: 'Lait coché.' });
    await act(async () => { await result.current.undoLastShoppingChange(); });
    expect(undoStockCommand).toHaveBeenCalledWith('command-1');
    expect(result.current.lastShoppingChange).toBeNull();
  });

  test('a list write left pending by a lost reply is sent again with its identity on load', async () => {
    const saved = { command_id: 'saved', command_type: 'shopping_add', payload_version: 1, payload: { items: [{ name: 'Riz', quantity: 1, unit: 'kg', origin: 'manual' }] } };
    jest.mocked(pendingIntents).mockResolvedValueOnce([{ intent: 'shopping-list:add:riz', command: saved }] as never);
    jest.mocked(executeStockCommand).mockResolvedValueOnce(confirmed('shopping_add'));
    await loaded();
    await waitFor(() => expect(executeStockCommand).toHaveBeenCalledWith(saved));
    await waitFor(() => expect(finishIntent).toHaveBeenCalledWith('shopping-list:add:riz'));
  });

  // V11-01 E5b: the receipt page resends its own command; the list's intentions wait for Courses.
  test('a screen that resumes its own command leaves the pending list writes to Courses', async () => {
    const hook = renderHook(() => useShoppingList({ notify: false, resume: false }));
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    expect(pendingIntents).not.toHaveBeenCalled();
    expect(executeStockCommand).not.toHaveBeenCalled();
  });

  test('a pending write is settled before a new gesture, which then stops on the reread list', async () => {
    const saved = { command_id: 'saved', command_type: 'shopping_check', payload_version: 1, payload: { items: [{ id: OTHER, expected_version: 5, purchased: true }] } };
    jest.mocked(pendingIntents).mockResolvedValueOnce([]).mockResolvedValueOnce([{ intent: 'shopping-list:check:x', command: saved }] as never);
    jest.mocked(executeStockCommand).mockImplementationOnce(answer([{ id: OTHER, outcome: 'checked', name: 'Lait' }]));
    const { result } = await loaded();
    await act(async () => { await expect(result.current.togglePurchased(OTHER, false)).rejects.toThrow('Une action précédente sur la liste vient d’être confirmée'); });
    expect(executeStockCommand).toHaveBeenCalledTimes(1);
    expect(executeStockCommand).toHaveBeenCalledWith(saved);
    expect(result.current.lastShoppingChange).toEqual({ commandId: 'saved', message: 'Lait coché.' });
  });

  test('a pending write that still cannot be confirmed holds the next gesture with a clear reason', async () => {
    const saved = { command_id: 'saved', command_type: 'shopping_check', payload_version: 1, payload: { items: [{ id: OTHER, expected_version: 5, purchased: true }] } };
    jest.mocked(pendingIntents).mockResolvedValueOnce([]).mockResolvedValueOnce([{ intent: 'shopping-list:check:x', command: saved }] as never);
    jest.mocked(executeStockCommand).mockRejectedValueOnce(new Error('Network lost'));
    const { result } = await loaded();
    await act(async () => { await expect(result.current.togglePurchased(OTHER, false)).rejects.toThrow('pas encore confirmée'); });
    expect(executeStockCommand).toHaveBeenCalledTimes(1);
  });

  test('a resumed write refused by the server is announced, not dropped silently', async () => {
    const saved = { command_id: 'saved', command_type: 'shopping_remove', payload_version: 1, payload: { items: [{ id: OTHER, expected_version: 4 }] } };
    jest.mocked(pendingIntents).mockResolvedValueOnce([{ intent: 'shopping-list:remove:x', command: saved }] as never);
    jest.mocked(executeStockCommand).mockRejectedValueOnce(new ApiError('Le stock ou l’achat a changé.', { status: 409, code: 'CONFLICT' }));
    const { result } = await loaded();
    await waitFor(() => expect(result.current.error).toBe('Une action précédente sur la liste n’a pas pu être appliquée : l’article avait changé. La liste est à jour.'));
  });

  test('an empty selection is explained instead of failing validation', async () => {
    const { result } = await loaded();
    await act(async () => { await expect(result.current.removeMultipleFromShoppingList([])).rejects.toThrow('Aucun article sélectionné.'); });
    expect(executeStockCommand).not.toHaveBeenCalled();
  });

  test('a refused transfer keeps the purchased selection and never deletes it directly', async () => {
    jest.mocked(executeStockCommand).mockRejectedValueOnce(new Error('Transaction refusée'));
    const { result } = await loaded();
    await act(async () => { await expect(result.current.addAllToInventory()).rejects.toThrow('Transaction refusée'); });
    expect(result.current.shoppingList.filter(row => row.is_purchased)).toHaveLength(1);
    expect(mockWrite).not.toHaveBeenCalled();
    expect(result.current.isTransferring).toBe(false);
    expect(executeStockCommand).toHaveBeenCalledWith(expect.objectContaining({ command_type: 'transfer_shopping',
      payload: { items: [{ id: ROW, expected_version: 2 }] } }));
  });
});
