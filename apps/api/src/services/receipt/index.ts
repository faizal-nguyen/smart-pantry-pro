/**
 * Receipt Services - Barrel Export
 */
export { GPTVisionService, getGPTVisionService } from './gptVisionService.js';
export { ProductMatcherService, getProductMatcherService } from './productMatcherService.js';
export { ReceiptProcessingService, getReceiptProcessingService } from './receiptProcessingService.js';
export {
  FRENCH_RECEIPT_ABBREVIATIONS,
  QUANTITY_PATTERNS,
  normalizeTicketLine,
  extractQuantity,
} from './abbreviationDictionary.js';
