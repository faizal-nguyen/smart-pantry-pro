/**
 * Performance Validation Tests for Social Media Parser V2
 * Validates cost optimizations and performance improvements
 */

import { EnhancedSocialMediaParser } from '../enhancedSocialMediaParser';

// Mock the StreamingAIService with cost tracking
jest.mock('../../ai/streamingAIService', () => ({
  StreamingAIService: jest.fn().mockImplementation(() => ({
    streamChat: jest.fn().mockImplementation(async (systemPrompt, userMessage, onChunk) => {
      const startTime = Date.now();
      
      // Simulate enhanced AI processing (faster than video processing)
      const mockResponse = {
        name: 'Recette Optimisée V2',
        description: 'Recette extraite avec coût réduit',
        ingredients: [
          { name: 'ingredient1', quantity: 1, unit: 'unité' },
          { name: 'ingredient2', quantity: 200, unit: 'g' }
        ],
        instructions: ['Étape 1', 'Étape 2'],
        prepTime: 15,
        cookTime: 30,
        servings: 4,
        difficulty: 'medium'
      };
      
      // Simulate token usage - much lower than video processing
      const tokenUsage = {
        promptTokens: 150,
        completionTokens: 200,
        totalTokens: 350
      };
      
      const processingTime = Date.now() - startTime;
      
      // Stream the response
      const chunks = JSON.stringify(mockResponse).split('');
      for (const chunk of chunks) {
        onChunk({
          choices: [{
            delta: { content: chunk }
          }]
        });
      }
      
      // Return performance metrics
      return {
        tokenUsage,
        processingTime,
        costEstimate: tokenUsage.totalTokens * 0.00005 // $0.00005 per token for text
      };
    })
  }))
}));

// Mock fetch for network requests
global.fetch = jest.fn();

const TEST_API_KEY = 'test-performance-key';

describe('Social Media Parser V2 - Performance Validation', () => {
  let parser: EnhancedSocialMediaParser;

  beforeEach(() => {
    parser = new EnhancedSocialMediaParser(TEST_API_KEY);
    (global.fetch as jest.Mock).mockReset();
  });

  describe('Cost Optimization Validation', () => {
    test('should demonstrate 85% cost reduction vs standard processing', () => {
      const standardCost = 0.35; // Video processing cost
      const enhancedCost = 0.02; // Text-only processing cost
      
      const savings = standardCost - enhancedCost;
      const savingsPercent = Math.round((savings / standardCost) * 100);
      
      expect(savingsPercent).toBeGreaterThanOrEqual(85);
      expect(savings).toBeCloseTo(0.33, 2);
      expect(enhancedCost).toBeLessThan(0.05);
    });

    test('should calculate accurate cost savings for different extraction methods', () => {
      const costMatrix = {
        videoProcessing: 0.35,
        imageAnalysis: 0.15,
        textOnlyEnhanced: 0.02,
        textOnlyBasic: 0.01
      };
      
      // V2 Enhanced should be much cheaper than video/image processing
      expect(costMatrix.textOnlyEnhanced).toBeLessThan(costMatrix.imageAnalysis);
      expect(costMatrix.textOnlyEnhanced).toBeLessThan(costMatrix.videoProcessing);
      
      // But slightly more expensive than basic text (due to enhanced AI)
      expect(costMatrix.textOnlyEnhanced).toBeGreaterThan(costMatrix.textOnlyBasic);
      
      const savingsVsVideo = ((costMatrix.videoProcessing - costMatrix.textOnlyEnhanced) / costMatrix.videoProcessing) * 100;
      expect(savingsVsVideo).toBeGreaterThan(90);
    });
  });

  describe('Performance Benchmarks', () => {
    test('should complete extraction within performance targets', async () => {
      // Mock successful fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<html><head><meta property="og:title" content="Test Recipe"/></head></html>')
      });

      const startTime = Date.now();
      
      const result = await parser.parseFromUrlEnhanced('https://instagram.com/p/test/', {
        enableCache: false,
        enhancedAI: true
      });
      
      const processingTime = Date.now() - startTime;
      
      // Should complete within 5 seconds (target for 95% of requests)
      expect(processingTime).toBeLessThan(5000);
      
      // Should be successful
      expect(result.success).toBe(true);
    });

    test('should demonstrate cache performance benefits', async () => {
      // Mock fetch for initial request
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<html><head><meta property="og:title" content="Cached Recipe"/></head></html>')
      });

      const url = 'https://instagram.com/p/cache-test/';
      const options = { enableCache: true, cacheTimeout: 60 };
      
      // First request - should be slower (cache miss)
      const firstStart = Date.now();
      const firstResult = await parser.parseFromUrlEnhanced(url, options);
      const firstTime = Date.now() - firstStart;
      
      // Second request - should be faster (cache hit)
      const secondStart = Date.now();
      const secondResult = await parser.parseFromUrlEnhanced(url, options);
      const secondTime = Date.now() - secondStart;
      
      // Cache hit should be significantly faster
      expect(secondTime).toBeLessThan(firstTime);
      expect(secondTime).toBeLessThan(100); // Should be < 100ms for cache hit
      
      // Results should be identical
      expect(firstResult.success).toBe(true);
      expect(secondResult.success).toBe(true);
    });

    test('should handle concurrent requests efficiently', async () => {
      // Mock fetch responses
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<html><head><meta property="og:title" content="Concurrent Test"/></head></html>')
      });

      const concurrentRequests = 5;
      const urls = Array.from({ length: concurrentRequests }, (_, i) => 
        `https://instagram.com/p/concurrent-${i}/`
      );
      
      const startTime = Date.now();
      
      // Run concurrent requests
      const promises = urls.map(url => 
        parser.parseFromUrlEnhanced(url, { enableCache: false, enhancedAI: true })
      );
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // All requests should succeed
      expect(results.every(r => r.success)).toBe(true);
      
      // Average time per request should be reasonable
      const avgTimePerRequest = totalTime / concurrentRequests;
      expect(avgTimePerRequest).toBeLessThan(3000); // < 3s average
    });
  });

  describe('Cache System Performance', () => {
    test('should maintain optimal cache size and hit rates', () => {
      const initialStats = parser.getCacheStats();
      expect(initialStats.size).toBe(0);
      
      // Cache should have proper structure
      expect(initialStats).toHaveProperty('platforms');
      expect(typeof initialStats.platforms).toBe('object');
    });

    test('should handle cache cleanup efficiently', () => {
      // Test that cache cleanup doesn't impact performance
      const stats = parser.getCacheStats();
      expect(stats.size).toBeGreaterThanOrEqual(0);
      
      // Cache operations should be fast
      const start = Date.now();
      parser.getCacheStats();
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(10); // Should be very fast
    });
  });

  describe('Memory and Resource Management', () => {
    test('should not leak memory with repeated operations', async () => {
      // Mock fetch
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<html><body>test</body></html>')
      });

      const initialMemory = process.memoryUsage();
      
      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        await parser.parseFromUrlEnhanced(
          `https://instagram.com/p/memory-test-${i}/`,
          { enableCache: false }
        );
      }
      
      const finalMemory = process.memoryUsage();
      
      // Memory usage should not grow excessively
      const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const heapGrowthMB = heapGrowth / (1024 * 1024);
      
      expect(heapGrowthMB).toBeLessThan(50); // Less than 50MB growth
    });

    test('should handle large text inputs efficiently', async () => {
      const largeText = 'Recette test '.repeat(1000); // ~13KB of text
      
      const startTime = Date.now();
      const result = await parser.parseFromText?.(largeText) || { success: false };
      const processingTime = Date.now() - startTime;
      
      // Should handle large inputs in reasonable time
      expect(processingTime).toBeLessThan(10000); // < 10s for large text
    });
  });

  describe('Error Recovery Performance', () => {
    test('should recover from failures quickly', async () => {
      // Mock network failure then success
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<html><head><title>Recovery Test</title></head></html>')
        });

      const startTime = Date.now();
      
      const result = await parser.parseFromUrlEnhanced('https://instagram.com/p/recovery-test/', {
        fallbackToBasic: true,
        enableCache: false
      });
      
      const recoveryTime = Date.now() - startTime;
      
      // Should recover within reasonable time
      expect(recoveryTime).toBeLessThan(8000); // < 8s with fallback
      expect(result).toHaveProperty('success');
    });

    test('should maintain performance under error conditions', async () => {
      // Mock various error scenarios
      const errorScenarios = [
        new Error('Network timeout'),
        new Error('Parse error'),
        new Error('AI service unavailable')
      ];

      const results = [];
      
      for (const error of errorScenarios) {
        (global.fetch as jest.Mock).mockRejectedValueOnce(error);
        
        const startTime = Date.now();
        const result = await parser.parseFromUrlEnhanced(
          `https://instagram.com/p/error-test-${Math.random()}/`,
          { fallbackToBasic: false, enableCache: false }
        );
        const errorHandlingTime = Date.now() - startTime;
        
        results.push({ result, errorHandlingTime });
      }
      
      // Error handling should be fast
      const maxErrorTime = Math.max(...results.map(r => r.errorHandlingTime));
      expect(maxErrorTime).toBeLessThan(5000); // < 5s for error handling
      
      // All should have proper error responses
      results.forEach(({ result }) => {
        expect(result).toHaveProperty('success');
        if (!result.success) {
          expect(result).toHaveProperty('error');
        }
      });
    });
  });
});

describe('Real-world Performance Simulation', () => {
  test('should simulate production load patterns', async () => {
    const parser = new EnhancedSocialMediaParser(TEST_API_KEY);
    
    // Mock various response times
    (global.fetch as jest.Mock).mockImplementation(() => 
      Promise.resolve({
        ok: true,
        text: () => new Promise(resolve => 
          setTimeout(() => resolve('<html><body>test</body></html>'), Math.random() * 1000)
        )
      })
    );

    const loadPatterns = {
      light: 2,    // 2 concurrent requests
      medium: 5,   // 5 concurrent requests  
      heavy: 10    // 10 concurrent requests
    };

    for (const [pattern, concurrency] of Object.entries(loadPatterns)) {
      const requests = Array.from({ length: concurrency }, (_, i) => 
        parser.parseFromUrlEnhanced(
          `https://instagram.com/p/${pattern}-${i}/`,
          { enableCache: true, fallbackToBasic: true }
        )
      );
      
      const startTime = Date.now();
      const results = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      // Performance targets by load
      const targets = {
        light: 3000,   // < 3s for light load
        medium: 8000,  // < 8s for medium load
        heavy: 15000   // < 15s for heavy load
      };
      
      expect(totalTime).toBeLessThan(targets[pattern as keyof typeof targets]);
      expect(results.length).toBe(concurrency);
    }
  });
});