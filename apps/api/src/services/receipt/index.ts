/**
 * Receipt services (V11-01 E5a): the reading of one photo, the scans kept as text, and the local
 * abbreviation dictionary. Nothing here writes the list or the stock.
 */
export { ReceiptReader, ReceiptReadError, RECEIPT_OUTPUT_TOKENS } from './ReceiptReader.js';
export type { ReceiptReading, ReceiptReadErrorCode } from './ReceiptReader.js';
export { ReceiptScanService, ReceiptScanError, RECEIPT_IMAGE_MIN_SIDE, RECEIPT_IMAGE_MAX_SIDE } from './ReceiptScanService.js';
export { FRENCH_RECEIPT_ABBREVIATIONS, normalizeTicketLine } from './abbreviationDictionary.js';
