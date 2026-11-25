import { z } from 'zod';

/**
 * V11-01 E5 — a receipt read from one photo (D10: the text only, never the photo). What the receipt
 * does not say stays null: no quantity 1, price 0 or confidence 0.5 is ever made up.
 */
export const RECEIPT_MAX_LINES = 120;
export const RECEIPT_TEXT_MAX_LENGTH = 200;
export const RECEIPT_STORE_MAX_LENGTH = 80;
export const RECEIPT_PRICE_MAX = 100000;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const price = z.number().finite().nonnegative().max(RECEIPT_PRICE_MAX);
const currency = z.string().regex(/^[A-Z]{3}$/);

/** high: read clearly; medium: one part inferred; low: a guess, shown « à vérifier ». */
export const ReceiptConfidenceSchema = z.enum(['high', 'medium', 'low']);
export type ReceiptConfidence = z.infer<typeof ReceiptConfidenceSchema>;

export const ReceiptLineSchema = z.object({
  /** The line as printed. */
  raw_text: z.string().min(1).max(RECEIPT_TEXT_MAX_LENGTH),
  /** The product named in full (« LAIT 1/2 ECR » : « Lait demi-écrémé »), or null. */
  name: z.string().min(1).max(120).nullable(),
  quantity: z.number().finite().positive().max(1e9).nullable(),
  unit: z.string().min(1).max(40).nullable(),
  /** The packaging as printed (« 6 x 1 L »), for the review only. */
  package: z.string().min(1).max(60).nullable(),
  unit_price: price.nullable(),
  total_price: price.nullable(),
  /** false: not food (bag, detergent); null: unknown. */
  food: z.boolean().nullable(),
  confidence: ReceiptConfidenceSchema,
}).strict();
export type ReceiptLine = z.infer<typeof ReceiptLineSchema>;

export const ReceiptScanStateSchema = z.enum(['read', 'failed', 'applied']);
export type ReceiptScanState = z.infer<typeof ReceiptScanStateSchema>;

/** Why a photo gave no scan to review; each is answered in words, the photo to take again. */
export const ReceiptFailureSchema = z.enum(['RECEIPT_UNREADABLE', 'RECEIPT_NO_FOOD', 'RECEIPT_TOO_LONG', 'RECEIPT_READ_FAILED']);
export type ReceiptFailure = z.infer<typeof ReceiptFailureSchema>;

const scanHeader = {
  id: z.string().uuid(),
  state: ReceiptScanStateSchema,
  store: z.string().min(1).max(RECEIPT_STORE_MAX_LENGTH).nullable(),
  purchased_on: isoDate.nullable(),
  total: price.nullable(),
  currency: currency.nullable(),
  created_at: z.string().min(1),
  applied_at: z.string().min(1).nullable(),
};

/** A scan to review: its lines, and an applied scan of the same store, day and total if there is one. */
export const ReceiptScanSchema = z.object({
  ...scanHeader,
  lines: z.array(ReceiptLineSchema).max(RECEIPT_MAX_LINES),
  possible_duplicate: z.object({ id: z.string().uuid(), applied_at: z.string().min(1) }).strict().nullable(),
}).strict();
export type ReceiptScan = z.infer<typeof ReceiptScanSchema>;

/** One entry of the scan history. */
export const ReceiptScanSummarySchema = z.object({ ...scanHeader, line_count: z.number().int().nonnegative() }).strict();
export type ReceiptScanSummary = z.infer<typeof ReceiptScanSummarySchema>;
