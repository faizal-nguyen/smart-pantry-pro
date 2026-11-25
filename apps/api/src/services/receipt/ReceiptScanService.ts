/**
 * V11-01 E5a — receipt scans. A photo is checked by its bytes and size, read (ReceiptReader), and
 * what was read is kept in receipt_scans with the session's user, by the service role (the table
 * grants no write to authenticated). The photo itself is never stored. A failed reading is kept as a
 * failed scan with its model receipt and no line, for its cost. Scans are read back with the user's
 * own client (RLS). Writing nothing to the list or the stock: reconcile_receipt does, once reviewed.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ReceiptScanSchema, ReceiptScanSummarySchema,
  type AssistantModelReceipt, type ReceiptFailure, type ReceiptScan, type ReceiptScanSummary,
} from '@smart/shared';

import { logError } from '../../config/logger.js';
import { readImageDimensions } from '../media/imageDimensions.js';
import { sniffImageMime } from '../media/ThumbnailSnapshotService.js';
import { ReceiptReadError, type ReceiptReader } from './ReceiptReader.js';

/** A receipt photo is resized on the phone (2048 px on its long side); a side outside these bounds is no receipt photo. */
export const RECEIPT_IMAGE_MIN_SIDE = 200;
export const RECEIPT_IMAGE_MAX_SIDE = 4096;
const PROVIDER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const COLUMNS = 'id,state,store,purchased_on,total,currency,lines,created_at,applied_at';
/** The history never reads the lines themselves: line_count is computed by the table. */
const SUMMARY_COLUMNS = 'id,state,store,purchased_on,total,currency,line_count,created_at,applied_at';
const HISTORY_SIZE = 20;

export class ReceiptScanError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) { super(message); }
}

interface ScanRow {
  id: string; state: string; store: string | null; purchased_on: string | null; total: number | string | null;
  currency: string | null; lines: unknown; created_at: string; applied_at: string | null;
}
type StoredScan = Omit<ReceiptScan, 'possible_duplicate'>;
const StoredScanSchema = ReceiptScanSchema.omit({ possible_duplicate: true });

const missingTable = (error: { code?: string } | null) => ['42P01', 'PGRST205', 'PGRST202', '42703'].includes(error?.code ?? '');
function storageError(error: { message?: string; code?: string } | null, context: string): ReceiptScanError {
  if (missingTable(error)) return new ReceiptScanError('MIGRATION_REQUIRED', 'La lecture des tickets n’est pas encore disponible. Coche tes achats à la main.', 503);
  logError(new Error(error?.code ?? 'RECEIPT_STORAGE_FAILED'), { context });
  return new ReceiptScanError('RECEIPT_SCAN_UNAVAILABLE', 'Les tickets ne peuvent pas être lus ou enregistrés pour le moment. Réessaie dans un instant.', 503);
}

/** A stored row, checked again: a row of another shape is an error, never shown half. */
function stored(row: ScanRow): StoredScan {
  const { id, state, store, purchased_on, total, currency, lines, created_at, applied_at } = row;
  const parsed = StoredScanSchema.safeParse({ id, state, store, purchased_on, total: total === null ? null : Number(total), currency, lines, created_at, applied_at });
  if (!parsed.success) throw new ReceiptScanError('RECEIPT_SCAN_UNAVAILABLE', 'Ce ticket ne peut pas être relu. Scanne-le à nouveau.', 503);
  // The API's TypeScript is not strict: zod's inferred fields read as optional there.
  return parsed.data as StoredScan;
}

/**
 * `admin` (service role) only writes, since receipt_scans grants no write to authenticated; every read
 * goes through the user's own client (RLS).
 */
export class ReceiptScanService {
  constructor(private readonly admin: SupabaseClient, private readonly reader: Pick<ReceiptReader, 'read'>) {}

  async scan(client: SupabaseClient, userId: string, buffer: Buffer): Promise<ReceiptScan> {
    const mime = sniffImageMime(buffer);
    if (!mime || !PROVIDER_TYPES.has(mime)) throw new ReceiptScanError('UNSUPPORTED_IMAGE', 'Photo en JPEG, PNG ou WebP seulement.', 415);
    const size = readImageDimensions(buffer);
    if (!size || Math.min(size.width, size.height) < RECEIPT_IMAGE_MIN_SIDE || Math.max(size.width, size.height) > RECEIPT_IMAGE_MAX_SIDE) {
      throw new ReceiptScanError('RECEIPT_IMAGE_SIZE', 'Cette photo ne peut pas être lue : reprends le ticket entier, bien cadré.', 422);
    }
    let reading;
    try {
      reading = await this.reader.read({ buffer, mime });
    } catch (error) {
      if (!(error instanceof ReceiptReadError)) throw error;
      if (error.code === 'RECEIPT_READ_UNAVAILABLE') throw new ReceiptScanError(error.code, error.message, 503);
      await this.keepFailure(userId, error.code, error.modelReceipt);
      throw new ReceiptScanError(error.code, error.message, error.code === 'RECEIPT_READ_FAILED' ? 502 : 422);
    }
    const { data, error } = await this.admin.from('receipt_scans').insert({
      user_id: userId, state: 'read', store: reading.store, purchased_on: reading.purchased_on, total: reading.total,
      currency: reading.currency, lines: reading.lines, model_receipt: reading.model_receipt,
    }).select(COLUMNS).single();
    if (error || !data) {
      // Read but not saved: the paid reading's cost is still kept, as a failed scan.
      await this.keepFailure(userId, 'RECEIPT_READ_FAILED', reading.model_receipt);
      throw storageError(error, 'receipts.scan.save');
    }
    const scan = stored(data as ScanRow);
    return { ...scan, possible_duplicate: await this.duplicate(client, userId, scan) };
  }

  /** The cost of a failed reading is kept (V10-03D), never the photo nor any line; a failure to keep it is logged only. */
  private async keepFailure(userId: string, failure: ReceiptFailure, modelReceipt: AssistantModelReceipt | null): Promise<void> {
    const { error } = await this.admin.from('receipt_scans').insert({
      user_id: userId, state: 'failed', failure, model_receipt: modelReceipt, lines: [],
    });
    if (error) logError(new Error(error.code ?? 'RECEIPT_FAILURE_NOT_KEPT'), { context: 'receipts.scan.failure' });
  }

  /** The last scans read or applied, newest first; failed ones are not history. A row of another shape is left out, never the whole list. */
  async history(client: SupabaseClient, userId: string): Promise<ReceiptScanSummary[]> {
    const { data, error } = await client.from('receipt_scans').select(SUMMARY_COLUMNS).eq('user_id', userId)
      .in('state', ['read', 'applied']).order('created_at', { ascending: false }).limit(HISTORY_SIZE);
    if (error) throw storageError(error, 'receipts.history');
    return ((data ?? []) as Array<Omit<ScanRow, 'lines'> & { line_count: unknown }>).flatMap(row => {
      const { id, state, store, purchased_on, total, currency, line_count, created_at, applied_at } = row;
      const parsed = ReceiptScanSummarySchema.safeParse({ id, state, store, purchased_on, total: total === null ? null : Number(total), currency, line_count, created_at, applied_at });
      if (parsed.success) return [parsed.data as ReceiptScanSummary];
      logError(new Error('RECEIPT_SCAN_UNREADABLE'), { context: 'receipts.history', scan_id: id });
      return [];
    });
  }

  /** A scan of this user, or null (another account's scan is not found either). */
  async get(client: SupabaseClient, userId: string, id: string): Promise<ReceiptScan | null> {
    const { data, error } = await client.from('receipt_scans').select(COLUMNS).eq('id', id).eq('user_id', userId)
      .in('state', ['read', 'applied']).maybeSingle();
    if (error) throw storageError(error, 'receipts.get');
    if (!data) return null;
    const scan = stored(data as ScanRow);
    return { ...scan, possible_duplicate: scan.state === 'read' ? await this.duplicate(client, userId, scan) : null };
  }

  /** An applied scan of the same store, day and total: two receipts may match, so this is a warning only. */
  private async duplicate(client: SupabaseClient, userId: string, scan: StoredScan): Promise<ReceiptScan['possible_duplicate']> {
    if (!scan.store || !scan.purchased_on || scan.total === null) return null;
    const { data, error } = await client.from('receipt_scans').select('id,applied_at').eq('user_id', userId).eq('state', 'applied')
      .eq('store', scan.store).eq('purchased_on', scan.purchased_on).eq('total', scan.total).neq('id', scan.id)
      .order('applied_at', { ascending: false }).limit(1).maybeSingle();
    const found = data as { id: string; applied_at: string | null } | null;
    return !error && found?.applied_at ? { id: found.id, applied_at: found.applied_at } : null;
  }
}
