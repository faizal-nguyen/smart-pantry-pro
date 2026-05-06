/**
 * Image Processing Pipeline
 * Optimized pipeline for efficient image processing with caching and batch operations
 */

import { imageOptimizer } from '@/utils/mobile-performance';
import { getAdvancedVisionService } from './advancedVisionService';

export interface ProcessingOptions {
  quality?: 'low' | 'medium' | 'high';
  stripExif?: boolean;
  detectMultiple?: boolean;
  extractText?: boolean;
  detectExpiry?: boolean;
  cacheResults?: boolean;
  priority?: 'normal' | 'high';
}

export interface ProcessingResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  results?: any;
  error?: string;
  cached?: boolean;
}

export class ImageProcessingPipeline {
  private queue: Map<string, ProcessingResult> = new Map();
  private cache: Map<string, any> = new Map();
  private maxCacheSize = 50;
  private processingCount = 0;
  private maxConcurrent = 3;

  /**
   * Process single image through pipeline
   */
  async processImage(
    imageBlob: Blob,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const id = this.generateId();
    const startTime = Date.now();

    // Create processing entry
    const result: ProcessingResult = {
      id,
      status: 'pending',
      startTime
    };

    this.queue.set(id, result);

    try {
      // Check cache if enabled
      if (options.cacheResults) {
        const cacheKey = await this.generateCacheKey(imageBlob, options);
        const cached = this.cache.get(cacheKey);
        
        if (cached) {
          result.status = 'completed';
          result.endTime = Date.now();
          result.results = cached;
          result.cached = true;
          return result;
        }
      }

      // Wait for processing slot
      await this.waitForSlot(options.priority === 'high');

      result.status = 'processing';
      this.processingCount++;

      // Step 1: Optimize image
      const optimized = await this.optimizeImage(imageBlob, options);

      // Step 2: Run vision analysis in parallel
      const [
        visionResults,
        textExtraction,
        expiryDetection
      ] = await Promise.all([
        this.runVisionAnalysis(optimized, options),
        options.extractText ? this.extractText(optimized) : null,
        options.detectExpiry ? this.detectExpiry(optimized) : null
      ]);

      // Combine results
      const combinedResults = {
        vision: visionResults,
        text: textExtraction,
        expiry: expiryDetection,
        metadata: {
          originalSize: imageBlob.size,
          optimizedSize: optimized.size,
          processingTime: Date.now() - startTime
        }
      };

      // Cache if enabled
      if (options.cacheResults) {
        const cacheKey = await this.generateCacheKey(imageBlob, options);
        this.addToCache(cacheKey, combinedResults);
      }

      result.status = 'completed';
      result.endTime = Date.now();
      result.results = combinedResults;

      return result;

    } catch (error: any) {
      result.status = 'failed';
      result.endTime = Date.now();
      result.error = error.message;
      return result;
    } finally {
      this.processingCount--;
      this.cleanupQueue();
    }
  }

  /**
   * Process multiple images in batch
   */
  async processBatch(
    images: Blob[],
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult[]> {
    const batchId = this.generateId();
    console.log(`[Pipeline] Starting batch ${batchId} with ${images.length} images`);

    // Process in chunks to avoid overwhelming the system
    const chunkSize = this.maxConcurrent;
    const results: ProcessingResult[] = [];

    for (let i = 0; i < images.length; i += chunkSize) {
      const chunk = images.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map(img => this.processImage(img, options))
      );
      results.push(...chunkResults);
    }

    console.log(`[Pipeline] Batch ${batchId} completed`);
    return results;
  }

  /**
   * Optimize image based on quality settings
   */
  private async optimizeImage(
    blob: Blob,
    options: ProcessingOptions
  ): Promise<Blob> {
    const qualitySettings = {
      low: { maxWidth: 800, quality: 0.7 },
      medium: { maxWidth: 1280, quality: 0.8 },
      high: { maxWidth: 1920, quality: 0.9 }
    };

    const settings = qualitySettings[options.quality || 'medium'];
    
    // Strip EXIF if requested
    if (options.stripExif !== false) {
      const visionService = getAdvancedVisionService();
      blob = await visionService.stripExifData(blob);
    }

    // Compress image
    return imageOptimizer.compressImage(
      blob,
      settings.maxWidth,
      settings.quality
    );
  }

  /**
   * Run vision analysis
   */
  private async runVisionAnalysis(
    blob: Blob,
    options: ProcessingOptions
  ): Promise<any> {
    const visionService = getAdvancedVisionService();
    
    return visionService.analyzeImage(blob, {
      detectMultiple: options.detectMultiple,
      analyzeNutrition: false,
      estimateFreshness: true
    });
  }

  /**
   * Extract text from image
   */
  private async extractText(blob: Blob): Promise<string | null> {
    // This would use OCR service
    // For now, return null
    return null;
  }

  /**
   * Detect expiry date
   */
  private async detectExpiry(blob: Blob): Promise<any> {
    const visionService = getAdvancedVisionService();
    return visionService.detectExpiryDate(blob);
  }

  /**
   * Wait for processing slot
   */
  private async waitForSlot(highPriority: boolean): Promise<void> {
    const maxWait = highPriority ? 5000 : 30000;
    const startWait = Date.now();

    while (this.processingCount >= this.maxConcurrent) {
      if (Date.now() - startWait > maxWait) {
        throw new Error('Processing queue timeout');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Generate cache key
   */
  private async generateCacheKey(
    blob: Blob,
    options: ProcessingOptions
  ): Promise<string> {
    // Create a simple hash from blob size and options
    const buffer = await blob.arrayBuffer();
    const view = new Uint8Array(buffer);
    
    // Simple hash using first/last bytes and size
    const hash = `${view[0]}-${view[view.length - 1]}-${blob.size}-${JSON.stringify(options)}`;
    return hash;
  }

  /**
   * Add to cache with LRU eviction
   */
  private addToCache(key: string, value: any): void {
    // Remove oldest if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  /**
   * Clean up old queue entries
   */
  private cleanupQueue(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [id, result] of this.queue.entries()) {
      if (result.endTime && now - result.endTime > maxAge) {
        this.queue.delete(id);
      }
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get processing statistics
   */
  getStats(): {
    queueSize: number;
    processingCount: number;
    cacheSize: number;
    cacheHitRate: number;
  } {
    let hits = 0;
    let total = 0;

    for (const result of this.queue.values()) {
      if (result.status === 'completed') {
        total++;
        if (result.cached) hits++;
      }
    }

    return {
      queueSize: this.queue.size,
      processingCount: this.processingCount,
      cacheSize: this.cache.size,
      cacheHitRate: total > 0 ? hits / total : 0
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get result by ID
   */
  getResult(id: string): ProcessingResult | undefined {
    return this.queue.get(id);
  }
}

// Export singleton instance
export const imageProcessingPipeline = new ImageProcessingPipeline();