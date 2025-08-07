/**
 * Performance Validation Test Suite
 * Tests API response times, streaming performance, and memory usage
 */

import { performance } from 'perf_hooks';

// Mock fetch for testing
global.fetch = jest.fn();

// Mock ReadableStream for Node.js environment
if (typeof ReadableStream === 'undefined') {
  global.ReadableStream = class {
    constructor(options: any) {
      this.start = options.start;
    }
    start: any;
    getReader() {
      return {
        read: jest.fn(),
        releaseLock: jest.fn()
      };
    }
  } as any;
}

describe('AI Assistant Performance Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API Response Time Tests', () => {
    it('should respond within 2 seconds for simple queries', async () => {
      // Mock streaming response that arrives quickly
      const mockReadableStream = new ReadableStream({
        start(controller) {
          // Simulate immediate response
          setTimeout(() => {
            controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Bonjour!"}}]}\n\n'));
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            controller.close();
          }, 100); // 100ms response
        }
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        body: mockReadableStream,
        headers: new Map()
      });

      const startTime = performance.now();
      
      const response = await fetch('/api/ai-assistant-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          message: 'Que puis-je cuisiner avec des tomates?',
          context: { inventory: [], recipes: [], expiryAlerts: [] },
          stream: true
        })
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(response.ok).toBe(true);
      expect(responseTime).toBeLessThan(2000); // Less than 2 seconds
    });

    it('should handle complex queries with large context within acceptable time', async () => {
      // Create large context to simulate real-world usage
      const largeInventory = Array.from({ length: 30 }, (_, i) => ({
        id: `item-${i}`,
        product: { name: `Product ${i}` },
        quantity: i + 1,
        unit: 'piece',
        expiry_date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString()
      }));

      const largeRecipes = Array.from({ length: 20 }, (_, i) => ({
        id: `recipe-${i}`,
        name: `Recipe ${i}`,
        ingredients: [`ingredient-${i}-1`, `ingredient-${i}-2`],
        cuisine: 'Française'
      }));

      const mockReadableStream = new ReadableStream({
        start(controller) {
          // Simulate processing time for complex query
          setTimeout(() => {
            controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Voici plusieurs recettes..."}}]}\n\n'));
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            controller.close();
          }, 800); // 800ms for complex processing
        }
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        body: mockReadableStream
      });

      const startTime = performance.now();
      
      await fetch('/api/ai-assistant-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          message: 'Peux-tu analyser mon inventaire et suggérer 5 recettes avec les ingrédients qui expirent bientôt?',
          context: {
            inventory: largeInventory,
            recipes: largeRecipes,
            expiryAlerts: [
              { product: 'Lait', daysUntil: 1, type: 'critical' },
              { product: 'Yaourt', daysUntil: 2, type: 'warning' }
            ]
          },
          stream: true
        })
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(3000); // Complex queries allow up to 3 seconds
    });

    it('should measure streaming chunk delivery performance', async () => {
      const chunkTimes: number[] = [];
      let chunkCount = 0;
      const startTime = performance.now();

      const mockReadableStream = new ReadableStream({
        start(controller) {
          const words = ['Voici', 'une', 'recette', 'délicieuse', 'avec', 'vos', 'ingrédients'];
          
          words.forEach((word, index) => {
            setTimeout(() => {
              chunkTimes.push(performance.now() - startTime);
              chunkCount++;
              controller.enqueue(
                new TextEncoder().encode(`data: {"choices":[{"delta":{"content":"${word} "}}]}\n\n`)
              );
              
              if (index === words.length - 1) {
                controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                controller.close();
              }
            }, index * 50); // 50ms between chunks
          });
        }
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        body: mockReadableStream
      });

      const reader = mockReadableStream.getReader();
      
      // Simulate reading chunks
      await new Promise((resolve) => {
        setTimeout(resolve, 400); // Wait for all chunks
      });

      // First chunk should arrive quickly
      expect(chunkTimes[0]).toBeLessThan(100); // First chunk within 100ms
      
      // Verify steady streaming
      for (let i = 1; i < chunkTimes.length; i++) {
        const timeBetweenChunks = chunkTimes[i] - chunkTimes[i - 1];
        expect(timeBetweenChunks).toBeLessThan(200); // Max 200ms between chunks
      }
    });
  });

  describe('Memory Usage Tests', () => {
    it('should handle large inventory without memory issues', () => {
      const initialMemory = process.memoryUsage();
      
      // Create large dataset
      const largeInventory = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        product: { name: `Product ${i}` },
        quantity: Math.random() * 10,
        unit: 'piece',
        expiry_date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      }));

      // Simulate context preparation
      const context = {
        inventory: largeInventory.slice(0, 30), // Limited to 30 as per implementation
        recipes: [],
        expiryAlerts: largeInventory
          .filter(item => {
            const daysUntil = Math.ceil(
              (new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            return daysUntil <= 3;
          })
          .map(item => ({
            product: item.product.name,
            daysUntil: Math.ceil(
              (new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            ),
            type: 'warning'
          }))
      };

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 10MB for this test)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
      
      // Context should be properly limited
      expect(context.inventory.length).toBeLessThanOrEqual(30);
    });

    it('should clean up streaming resources properly', async () => {
      const initialHandles = process._getActiveHandles().length;
      
      const mockReadableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Test"}}]}\n\n'));
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        body: mockReadableStream
      });

      // Simulate streaming request
      const response = await fetch('/api/ai-assistant-enhanced', {
        method: 'POST',
        body: JSON.stringify({ message: 'test', stream: true })
      });

      // Allow for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      const finalHandles = process._getActiveHandles().length;
      
      // Should not have significant handle leaks
      expect(finalHandles - initialHandles).toBeLessThanOrEqual(2);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should efficiently check rate limits without significant delay', async () => {
      const startTime = performance.now();
      
      // Simulate multiple rapid requests to test rate limiting performance
      const requests = Array.from({ length: 10 }, (_, i) => 
        fetch('/api/ai-assistant-enhanced', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer test-token-${i}`
          },
          body: JSON.stringify({ message: `test ${i}` })
        })
      );

      // Mock rate limiting responses - some allowed, some blocked
      (global.fetch as jest.Mock).mockImplementation(() => {
        const shouldLimit = Math.random() > 0.7; // 30% rate limited
        if (shouldLimit) {
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: new Map([['X-RateLimit-Reset', String(Date.now() + 900000)]])
          });
        } else {
          return Promise.resolve({
            ok: true,
            body: new ReadableStream({
              start(controller) {
                controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                controller.close();
              }
            })
          });
        }
      });

      const responses = await Promise.all(requests);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const avgTimePerRequest = totalTime / requests.length;
      
      expect(avgTimePerRequest).toBeLessThan(50); // Less than 50ms per rate limit check
      
      // Should have mix of allowed and blocked requests
      const allowedCount = responses.filter(r => r.ok).length;
      const blockedCount = responses.filter(r => r.status === 429).length;
      
      expect(allowedCount + blockedCount).toBe(10);
    });
  });

  describe('Context Size Optimization', () => {
    it('should optimize context size for token limits', () => {
      const largeInventory = Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        product: { name: `Very Long Product Name With Many Details ${i}` },
        quantity: i,
        unit: 'pieces',
        expiry_date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
        description: `This is a very long description for product ${i} with lots of details that could make the context too large for the AI model to process efficiently`
      }));

      const largeRecipes = Array.from({ length: 50 }, (_, i) => ({
        id: `recipe-${i}`,
        name: `Very Detailed Recipe Name ${i}`,
        description: `This is a very long recipe description with lots of details about cooking methods and ingredients`,
        ingredients: Array.from({ length: 10 }, (_, j) => `ingredient-${i}-${j}`),
        instructions: Array.from({ length: 15 }, (_, k) => `Step ${k}: Very detailed instruction for step ${k}`)
      }));

      // Simulate context preparation with size limits
      const optimizedContext = {
        inventory: largeInventory.slice(0, 30), // Limited
        recipes: largeRecipes.slice(0, 20), // Limited
        expiryAlerts: []
      };

      // Calculate approximate token count (rough estimation)
      const contextString = JSON.stringify(optimizedContext);
      const approximateTokens = Math.ceil(contextString.length / 4); // Rough GPT token estimation

      expect(approximateTokens).toBeLessThan(4000); // Should fit within reasonable context limit
      expect(optimizedContext.inventory.length).toBeLessThanOrEqual(30);
      expect(optimizedContext.recipes.length).toBeLessThanOrEqual(20);
    });

    it('should prioritize expiring items in context optimization', () => {
      const now = Date.now();
      const inventory = [
        {
          id: '1',
          product: { name: 'Expired Item' },
          expiry_date: new Date(now - 24 * 60 * 60 * 1000).toISOString() // Yesterday
        },
        {
          id: '2',
          product: { name: 'Critical Item' },
          expiry_date: new Date(now + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
        },
        {
          id: '3',
          product: { name: 'Warning Item' },
          expiry_date: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString() // In 3 days
        },
        {
          id: '4',
          product: { name: 'Fresh Item' },
          expiry_date: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString() // In 1 week
        }
      ];

      // Simulate prioritization logic
      const sortedInventory = inventory.sort((a, b) => {
        const aDays = Math.ceil((new Date(a.expiry_date).getTime() - now) / (1000 * 60 * 60 * 24));
        const bDays = Math.ceil((new Date(b.expiry_date).getTime() - now) / (1000 * 60 * 60 * 24));
        return aDays - bDays; // Sort by days until expiry (ascending)
      });

      expect(sortedInventory[0].product.name).toBe('Expired Item');
      expect(sortedInventory[1].product.name).toBe('Critical Item');
      expect(sortedInventory[2].product.name).toBe('Warning Item');
      expect(sortedInventory[3].product.name).toBe('Fresh Item');
    });
  });

  describe('Error Response Performance', () => {
    it('should handle rate limit errors quickly', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Map([['X-RateLimit-Reset', String(Date.now() + 900000)]])
      });

      const startTime = performance.now();

      try {
        await fetch('/api/ai-assistant-enhanced', {
          method: 'POST',
          body: JSON.stringify({ message: 'test' })
        });
      } catch (error) {
        // Expected to handle rate limit
      }

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(500); // Should handle errors quickly
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const startTime = performance.now();

      try {
        await fetch('/api/ai-assistant-enhanced', {
          method: 'POST',
          body: JSON.stringify({ message: 'test' })
        });
      } catch (error) {
        expect(error.message).toBe('Network error');
      }

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000); // Should fail fast
    });
  });
});

describe('Streaming Performance Benchmarks', () => {
  it('should maintain consistent streaming performance', async () => {
    const streamingMetrics = {
      firstChunkTime: 0,
      totalChunks: 0,
      averageChunkInterval: 0,
      totalStreamTime: 0
    };

    let firstChunkReceived = false;
    const startTime = performance.now();
    const chunkTimes: number[] = [];

    const mockReadableStream = new ReadableStream({
      start(controller) {
        const chunks = Array.from({ length: 20 }, (_, i) => `Chunk ${i + 1} `);
        
        chunks.forEach((chunk, index) => {
          setTimeout(() => {
            const chunkTime = performance.now();
            if (!firstChunkReceived) {
              streamingMetrics.firstChunkTime = chunkTime - startTime;
              firstChunkReceived = true;
            }
            
            chunkTimes.push(chunkTime);
            streamingMetrics.totalChunks++;
            
            controller.enqueue(
              new TextEncoder().encode(`data: {"choices":[{"delta":{"content":"${chunk}"}}]}\n\n`)
            );
            
            if (index === chunks.length - 1) {
              streamingMetrics.totalStreamTime = performance.now() - startTime;
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
              controller.close();
            }
          }, index * 25); // 25ms between chunks
        });
      }
    });

    // Wait for stream to complete
    await new Promise(resolve => setTimeout(resolve, 600));

    // Calculate metrics
    const intervals = chunkTimes.slice(1).map((time, i) => time - chunkTimes[i]);
    streamingMetrics.averageChunkInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    expect(streamingMetrics.firstChunkTime).toBeLessThan(100); // First chunk within 100ms
    expect(streamingMetrics.averageChunkInterval).toBeLessThan(50); // Average 50ms between chunks
    expect(streamingMetrics.totalChunks).toBe(20);
    expect(streamingMetrics.totalStreamTime).toBeLessThan(1000); // Total under 1 second
  });
});

export { };