/**
 * V11-01 E5b — receipts, from the screen « Scanner le ticket » (API of E5a). A photo is read for its
 * owner (POST /v1/receipts/scan, multipart); scans are read back by their owner; every answer is checked
 * before it is shown. A reviewed receipt is applied as one reconcile_receipt, saved under its own
 * intention (`shopping-list:receipt:<scan>`): a lost reply is sent again as it was, here or on opening
 * Courses, which resumes every `shopping-list:` intention.
 */
import { ReceiptScanSchema, ReceiptScanSummarySchema, type ReceiptScan, type ReceiptScanSummary, type StockCommandResult } from '@smart/shared';
import { ApiError, apiGet, apiPostForm } from '@/lib/api';
import type { ReconcileLine } from '@/lib/receiptMatching';
import { commandForIntent, executeStockCommand, finishIntent, pendingIntent } from './stockCommands';

export const receiptIntent = (scanId: string): string => `shopping-list:receipt:${scanId}`;
const unreadable = () => new ApiError('Le ticket reçu ne peut pas être affiché. Réessaie dans un instant.', { status: 503, code: 'INVALID_RECEIPT_SCAN' });

function checked(value: unknown): ReceiptScan {
  const parsed = ReceiptScanSchema.safeParse(value);
  if (!parsed.success) throw unreadable();
  return parsed.data;
}

export async function scanReceipt(owner: string, photo: Blob, signal?: AbortSignal): Promise<ReceiptScan> {
  const form = new FormData();
  form.append('receipt', photo, 'ticket.jpg');
  return checked(await apiPostForm<unknown>('/v1/receipts/scan', form, { expectedUserId: owner, signal }));
}

export async function fetchReceipt(owner: string, scanId: string, signal?: AbortSignal): Promise<ReceiptScan> {
  return checked(await apiGet<unknown>(`/v1/receipts/${encodeURIComponent(scanId)}`, undefined, { expectedUserId: owner, signal }));
}

export async function fetchReceiptHistory(owner: string, signal?: AbortSignal): Promise<ReceiptScanSummary[]> {
  const parsed = ReceiptScanSummarySchema.array().safeParse(await apiGet<unknown>('/v1/receipts/history', undefined, { expectedUserId: owner, signal }));
  if (!parsed.success) throw unreadable();
  return parsed.data;
}

/** Applies a reviewed receipt to the list, once. */
export async function reconcileReceipt(scanId: string, lines: ReconcileLine[]): Promise<StockCommandResult> {
  const intent = receiptIntent(scanId);
  const command = await commandForIntent('reconcile_receipt', intent, { receipt_scan_id: scanId, lines });
  const result = await executeStockCommand(command);
  await finishIntent(intent);
  return result;
}

/** The command of this receipt left without a reply, if any. */
export const pendingReceipt = (scanId: string) => pendingIntent(receiptIntent(scanId));

/** Sends again, as it was, the command a lost reply left pending; null when there is none. */
export async function resendReceipt(scanId: string): Promise<StockCommandResult | null> {
  const intent = receiptIntent(scanId);
  const saved = await pendingIntent(intent);
  if (!saved) return null;
  const result = await executeStockCommand(saved);
  await finishIntent(intent);
  return result;
}
