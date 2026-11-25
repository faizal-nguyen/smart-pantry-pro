import { apiGet, apiPostForm } from '@/lib/api';
import { commandForIntent, executeStockCommand, finishIntent, pendingIntent } from '../stockCommands';
import { fetchReceipt, fetchReceiptHistory, receiptIntent, reconcileReceipt, resendReceipt, scanReceipt } from '../receipts';

// V11-01 E5b: a receipt photo sent for its owner; answers checked before they are shown; one command per receipt.
const OWNER = '00000000-0000-4000-8000-000000000001';
const SCAN = '70000000-0000-4000-8000-000000000001';
jest.mock('@/lib/api', () => ({ apiGet: jest.fn(), apiPostForm: jest.fn(), ApiError: class extends Error {
  status: number; code?: string;
  constructor(message: string, options: { status: number; code?: string }) { super(message); this.status = options.status; this.code = options.code; }
} }));
jest.mock('../stockCommands', () => ({ commandForIntent: jest.fn(), executeStockCommand: jest.fn(), finishIntent: jest.fn(), pendingIntent: jest.fn() }));
const scan = { id: SCAN, state: 'read', store: 'Marché', purchased_on: '2026-11-20', total: 3.15, currency: 'EUR', created_at: '2026-11-25T10:00:00Z',
  applied_at: null, possible_duplicate: null, lines: [{ raw_text: 'LAIT', name: 'Lait', quantity: null, unit: null, package: null, unit_price: null,
    total_price: 1.05, food: true, confidence: 'high' }] };
const line = { line_index: 0, name: 'Lait', quantity: 2, unit: 'pièce', unit_price: null, total_price: 1.05, target: null };
const receipt = { command_id: 'c', command_type: 'reconcile_receipt', status: 'confirmed', affected_tables: ['shopping_list'] };
beforeEach(() => jest.clearAllMocks());

test('the photo leaves as the field « receipt » for its owner; the scan is checked before it is shown', async () => {
  jest.mocked(apiPostForm).mockResolvedValueOnce(scan);
  const controller = new AbortController();
  const photo = new Blob(['jpeg'], { type: 'image/jpeg' });
  await expect(scanReceipt(OWNER, photo, controller.signal)).resolves.toEqual(scan);
  const [path, form, options] = jest.mocked(apiPostForm).mock.calls[0];
  expect(path).toBe('/v1/receipts/scan');
  expect((form as FormData).get('receipt')).toBeInstanceOf(Blob);
  expect(options).toEqual({ expectedUserId: OWNER, signal: controller.signal });
  jest.mocked(apiPostForm).mockResolvedValueOnce({ ...scan, lines: [{ raw_text: 'LAIT', quantity: 1 }] });
  await expect(scanReceipt(OWNER, photo)).rejects.toMatchObject({ code: 'INVALID_RECEIPT_SCAN', status: 503 });
});

test('a scan and the history are read for their owner and checked', async () => {
  jest.mocked(apiGet).mockResolvedValueOnce(scan).mockResolvedValueOnce([{ ...scan, lines: undefined, possible_duplicate: undefined, line_count: 1 }].map(({ lines: _l, possible_duplicate: _d, ...rest }) => rest));
  await expect(fetchReceipt(OWNER, SCAN)).resolves.toEqual(scan);
  expect(apiGet).toHaveBeenCalledWith(`/v1/receipts/${SCAN}`, undefined, { expectedUserId: OWNER, signal: undefined });
  await expect(fetchReceiptHistory(OWNER)).resolves.toEqual([expect.objectContaining({ id: SCAN, line_count: 1 })]);
  jest.mocked(apiGet).mockResolvedValueOnce([{ id: SCAN }]);
  await expect(fetchReceiptHistory(OWNER)).rejects.toMatchObject({ code: 'INVALID_RECEIPT_SCAN' });
});

test('a reviewed receipt is one command under its own intention; a lost reply is sent again as it was', async () => {
  const command = { command_id: 'c', command_type: 'reconcile_receipt', payload_version: 1, payload: { receipt_scan_id: SCAN, lines: [line] } };
  jest.mocked(commandForIntent).mockResolvedValueOnce(command as never);
  jest.mocked(executeStockCommand).mockResolvedValue(receipt as never);
  await expect(reconcileReceipt(SCAN, [line])).resolves.toEqual(receipt);
  expect(receiptIntent(SCAN)).toBe(`shopping-list:receipt:${SCAN}`);
  expect(commandForIntent).toHaveBeenCalledWith('reconcile_receipt', `shopping-list:receipt:${SCAN}`, { receipt_scan_id: SCAN, lines: [line] });
  expect(finishIntent).toHaveBeenCalledWith(`shopping-list:receipt:${SCAN}`);
  jest.mocked(pendingIntent).mockResolvedValueOnce(command as never).mockResolvedValueOnce(null);
  await expect(resendReceipt(SCAN)).resolves.toEqual(receipt);
  expect(executeStockCommand).toHaveBeenLastCalledWith(command);
  await expect(resendReceipt(SCAN)).resolves.toBeNull();
});
