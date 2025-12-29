/**
 * Receipt Processing Service
 * Orchestrates the complete receipt scanning workflow
 */
import { v4 as uuidv4 } from 'uuid';
import { getGPTVisionService } from './gptVisionService.js';
import { getProductMatcherService } from './productMatcherService.js';
import { ReceiptProcessResult, EnrichedProduct } from '../../types/receipt.types.js';

export class ReceiptProcessingService {
  private gptVision = getGPTVisionService();
  private productMatcher = getProductMatcherService();

  /**
   * Process a complete receipt scan
   * @param imageUrl URL of the receipt image
   * @param userId User ID for tracking
   */
  async processReceipt(imageUrl: string, userId: string): Promise<ReceiptProcessResult> {
    const startTime = Date.now();
    const scanId = uuidv4();

    try {
      // STEP 1: OCR via GPT Vision
      console.log(`[Receipt:${scanId}] Starting receipt scan for user ${userId}...`);
      const scanResult = await this.gptVision.scanReceipt(imageUrl);

      if (!scanResult.success || !scanResult.data) {
        return {
          success: false,
          error: scanResult.error || {
            code: 'SCAN_FAILED',
            message: 'Echec du scan OCR',
          },
          metadata: {
            processing_time_ms: Date.now() - startTime,
            gpt_cost_usd: scanResult.metadata.gpt_cost_usd,
            scan_id: scanId,
          },
        };
      }

      console.log(
        `[Receipt:${scanId}] OCR completed: ${scanResult.data.products.length} products found`
      );

      // STEP 2: Enrich each product in parallel
      const enrichmentPromises = scanResult.data.products.map((product) =>
        this.productMatcher.enrichProduct(product)
      );

      const enrichedProducts = await Promise.all(enrichmentPromises);

      console.log(`[Receipt:${scanId}] Enrichment completed`);

      // STEP 3: Calculate statistics
      const stats = {
        total_products: enrichedProducts.length,
        matched_products: enrichedProducts.filter((p) => p.matched).length,
        unmatched_products: enrichedProducts.filter((p) => !p.matched).length,
        low_confidence_products: enrichedProducts.filter((p) => p.confidence < 0.7).length,
      };

      // STEP 4: Filter products with very low confidence
      const validProducts = enrichedProducts.filter((p) => p.confidence >= 0.5);

      const processingTime = Date.now() - startTime;
      console.log(
        `[Receipt:${scanId}] Processing completed in ${processingTime}ms. ` +
          `${stats.matched_products}/${stats.total_products} products matched.`
      );

      return {
        success: true,
        data: {
          store: scanResult.data.store,
          date: scanResult.data.date,
          products: validProducts,
          total: scanResult.data.total,
          stats,
        },
        metadata: {
          processing_time_ms: processingTime,
          gpt_cost_usd: scanResult.metadata.gpt_cost_usd,
          scan_id: scanId,
        },
      };
    } catch (error) {
      console.error(`[Receipt:${scanId}] Processing error:`, error);

      return {
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Erreur de traitement',
        },
        metadata: {
          processing_time_ms: Date.now() - startTime,
          gpt_cost_usd: 0,
          scan_id: scanId,
        },
      };
    }
  }

  /**
   * Process receipt from base64 image data
   */
  async processReceiptFromBase64(
    base64Data: string,
    mimeType: string,
    userId: string
  ): Promise<ReceiptProcessResult> {
    const dataUri = `data:${mimeType};base64,${base64Data}`;
    return this.processReceipt(dataUri, userId);
  }
}

// Singleton instance
let instance: ReceiptProcessingService | null = null;

export function getReceiptProcessingService(): ReceiptProcessingService {
  if (!instance) {
    instance = new ReceiptProcessingService();
  }
  return instance;
}

export default ReceiptProcessingService;
