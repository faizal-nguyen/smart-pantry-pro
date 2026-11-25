import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReceiptLine, ReceiptScan } from '@smart/shared';
import type { ShoppingItem } from '@/hooks/useShoppingList';
import { useReceiptReview } from '../useReceiptReview';
import { pendingReceipt, reconcileReceipt, resendReceipt } from '@/services/receipts';

// V11-01 E5b: the review of one receipt: kept across a visit, recomputed after a refusal, sent once.
jest.mock('@/lib/api', () => ({ ApiError: class extends Error {
  status: number; code?: string;
  constructor(message: string, options: { status: number; code?: string }) { super(message); this.status = options.status; this.code = options.code; }
} }));
jest.mock('@/services/receipts', () => ({ reconcileReceipt: jest.fn(), resendReceipt: jest.fn(), pendingReceipt: jest.fn() }));
const { ApiError } = jest.requireMock('@/lib/api') as { ApiError: new (message: string, options: { status: number; code?: string }) => Error };

const OWNER = '00000000-0000-4000-8000-000000000001';
const SCAN = '70000000-0000-4000-8000-000000000001';
const row = (id: string, name: string, quantity: number, unit: string, version = 2): ShoppingItem => ({
  id, product_id: `p-${id}`, quantity, unit, stock_version: version, is_purchased: false, priority: 1, created_at: '2026-11-20T10:00:00Z', updated_at: '',
  product: { id: `p-${id}`, name, category: 'Épicerie', unit_type: unit },
} as ShoppingItem);
const read = (raw_text: string, name: string, extra: Partial<ReceiptLine> = {}): ReceiptLine => ({
  raw_text, name, quantity: null, unit: null, package: null, unit_price: null, total_price: 1, food: true, confidence: 'high', ...extra,
});
const scan = (extra: Partial<ReceiptScan> = {}): ReceiptScan => ({ id: SCAN, state: 'read', store: 'Marché', purchased_on: '2026-11-20', total: 2,
  currency: 'EUR', created_at: '2026-11-25T10:00:00Z', applied_at: null, possible_duplicate: null,
  lines: [read('LAIT', 'Lait'), read('PAIN', 'Pain')], ...extra });
const rows = [row('milk', 'Lait', 2, 'pièce')];
const result = { command_id: 'c1', command_type: 'reconcile_receipt', status: 'confirmed', affected_tables: ['shopping_list'],
  shopping_changes: [{ id: 'milk', outcome: 'checked' }, { id: 'n', outcome: 'created', note: 'receipt_added' }] };
const setup = (refetchRows = jest.fn(async () => undefined), value = scan(), list = rows) =>
  renderHook(props => useReceiptReview({ owner: OWNER, scan: props.scan, rows: props.rows, rowsReady: true, refetchRows }), { initialProps: { scan: value, rows: list } });

beforeEach(() => { jest.clearAllMocks(); sessionStorage.clear(); jest.mocked(pendingReceipt).mockResolvedValue(null); });

test('the lines are matched, edits are kept for this account and receipt, and a broken save is ignored', async () => {
  const first = setup();
  await waitFor(() => expect(first.result.current.lines).toHaveLength(2));
  act(() => first.result.current.editLine(1, { name: 'Pain de campagne' }));
  first.unmount();
  const again = setup();
  await waitFor(() => expect(again.result.current.lines[1]).toMatchObject({ name: 'Pain de campagne', nameEdited: true }));
  again.unmount();
  sessionStorage.setItem(`v11-receipt-review:${OWNER}:${SCAN}`, '{"lines":"x"}');
  const broken = setup();
  await waitFor(() => expect(broken.result.current.lines[1].name).toBe('Pain'));
});

test('sending applies the reviewed lines once, then forgets the review', async () => {
  jest.mocked(reconcileReceipt).mockResolvedValueOnce(result as never);
  const { result: hook } = setup();
  await waitFor(() => expect(hook.current.lines).toHaveLength(2));
  let applied: unknown;
  await act(async () => { applied = await hook.current.send(); });
  expect(applied).toEqual(result);
  expect(reconcileReceipt).toHaveBeenCalledWith(SCAN, [
    expect.objectContaining({ line_index: 0, target: { shopping_id: 'milk', expected_version: 2 } }), expect.objectContaining({ line_index: 1, target: null })]);
  expect(sessionStorage.getItem(`v11-receipt-review:${OWNER}:${SCAN}`)).toBeNull();
});

test('a list changed meanwhile is read again and the review recomputed, the edits kept', async () => {
  const refetchRows = jest.fn(async () => undefined);
  jest.mocked(reconcileReceipt).mockRejectedValueOnce(new ApiError('Le stock ou l’achat a changé.', { status: 409, code: 'CONFLICT' }));
  const hook = setup(refetchRows);
  await waitFor(() => expect(hook.result.current.lines).toHaveLength(2));
  act(() => hook.result.current.editLine(1, { name: 'Pain de campagne' }));
  await act(async () => { await hook.result.current.send(); });
  expect(refetchRows).toHaveBeenCalled();
  expect(hook.result.current.outcome).toBe('refused');
  expect(hook.result.current.error).toBe('Ta liste a changé pendant la révision : le rapprochement a été recalculé. Vérifie-le, puis valide.');
  hook.rerender({ scan: scan(), rows: [row('milk', 'Lait', 2, 'pièce', 3)] });
  expect(hook.result.current.lines[1].name).toBe('Pain de campagne');
  jest.mocked(reconcileReceipt).mockResolvedValueOnce(result as never);
  await act(async () => { await hook.result.current.send(); });
  expect(jest.mocked(reconcileReceipt).mock.calls[1][1][0].target).toEqual({ shopping_id: 'milk', expected_version: 3 });
});

test('a lost reply is never recomputed: the same command is sent again; one left pending is found on arrival', async () => {
  jest.mocked(reconcileReceipt).mockRejectedValueOnce(new ApiError('Connexion impossible.', { status: 0, code: 'NETWORK_ERROR' }));
  jest.mocked(resendReceipt).mockResolvedValueOnce(result as never);
  const hook = setup();
  await waitFor(() => expect(hook.result.current.lines).toHaveLength(2));
  await act(async () => { await hook.result.current.send(); });
  expect(hook.result.current.outcome).toBe('unconfirmed');
  let applied: unknown;
  await act(async () => { applied = await hook.result.current.send(); });
  expect(resendReceipt).toHaveBeenCalledWith(SCAN);
  expect(reconcileReceipt).toHaveBeenCalledTimes(1);
  expect(applied).toEqual(result);
  hook.unmount();
  jest.mocked(pendingReceipt).mockResolvedValueOnce({ command_id: 'c1' } as never);
  const arrived = setup();
  await waitFor(() => expect(arrived.result.current.outcome).toBe('unconfirmed'));
});

test('a receipt applied already is said; a possible duplicate waits for the user’s word', async () => {
  jest.mocked(reconcileReceipt).mockRejectedValueOnce(new ApiError('Ce ticket a déjà été rapproché de ta liste.', { status: 409, code: 'RECEIPT_ALREADY_APPLIED' }));
  const duplicate = setup(undefined, scan({ possible_duplicate: { id: '70000000-0000-4000-8000-000000000002', applied_at: '2026-11-20T18:00:00Z' } }));
  await waitFor(() => expect(duplicate.result.current.lines).toHaveLength(2));
  await act(async () => { await duplicate.result.current.send(); });
  expect(reconcileReceipt).not.toHaveBeenCalled();
  expect(duplicate.result.current.error).toBe('Confirme d’abord que c’est un autre ticket.');
  act(() => duplicate.result.current.confirmDuplicate(true));
  await act(async () => { await duplicate.result.current.send(); });
  expect(duplicate.result.current.outcome).toBe('applied');
  expect(duplicate.result.current.error).toBe('Ce ticket a déjà été rapproché de ta liste.');
});

// Review of E5b: a saved command is always sent again as it was; a doubt without a code is never a dead end.
test('a command found saved when sending is sent again as it was, whatever the screen showed', async () => {
  jest.mocked(pendingReceipt).mockResolvedValueOnce(null).mockResolvedValueOnce({ command_id: 'c1' } as never);
  jest.mocked(resendReceipt).mockResolvedValueOnce(result as never);
  const hook = setup();
  await waitFor(() => expect(hook.result.current.lines).toHaveLength(2));
  await act(async () => { await hook.result.current.send(); });
  expect(resendReceipt).toHaveBeenCalledWith(SCAN);
  expect(reconcileReceipt).not.toHaveBeenCalled();
});

test('an answer in doubt without a code offers to send again while the command stays saved', async () => {
  jest.mocked(pendingReceipt).mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce({ command_id: 'c1' } as never);
  jest.mocked(reconcileReceipt).mockRejectedValueOnce(new Error('Le résultat de cette action reste à vérifier.'));
  const hook = setup();
  await waitFor(() => expect(hook.result.current.lines).toHaveLength(2));
  await act(async () => { await hook.result.current.send(); });
  expect(hook.result.current.outcome).toBe('unconfirmed');
  expect(hook.result.current.error).toBe('Le résultat de cette action reste à vérifier. L’envoi n’est pas confirmé : renvoie-le, il ne sera appliqué qu’une fois.');
});

test('a receipt applied already forgets its review', async () => {
  jest.mocked(reconcileReceipt).mockRejectedValueOnce(new ApiError('Ce ticket a déjà été rapproché de ta liste.', { status: 409, code: 'RECEIPT_ALREADY_APPLIED' }));
  const hook = setup();
  await waitFor(() => expect(sessionStorage.getItem(`v11-receipt-review:${OWNER}:${SCAN}`)).not.toBeNull());
  await act(async () => { await hook.result.current.send(); });
  expect(sessionStorage.getItem(`v11-receipt-review:${OWNER}:${SCAN}`)).toBeNull();
});
