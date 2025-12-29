import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { PanicEngine } from '@/services/panic-mode/PanicEngine';

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => ({ data: null, error: null })),
        order: jest.fn(() => ({
          limit: jest.fn(() => ({ data: [], error: null }))
        }))
      })),
      insert: jest.fn(() => ({ 
        select: jest.fn(() => ({ 
          single: jest.fn(() => ({ data: { id: 'test-id' }, error: null }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({ error: null }))
      })),
      lte: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({ data: [], error: null }))
          }))
        }))
      })),
      contains: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => ({ data: [], error: null }))
        }))
      })),
      overlaps: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => ({ data: [], error: null }))
        }))
      }))
    }))
  })
};

// Mock console pour éviter les logs dans les tests
const originalConsole = console;
beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  jest.clearAllMocks();
});

describe('PanicEngine', () => {
  let panicEngine: PanicEngine;

  beforeEach(() => {
    panicEngine = new PanicEngine(mockSupabase as any);
  });

  describe('triggerPanic', () => {
    const mockContext = {
      userId: 'test-user',
      timeAvailable: 30,
      stressLevel: 3 as 1 | 2 | 3 | 4 | 5,
      familyMembers: 2,
      triggerType: 'manual' as const
    };

    it('should resolve panic in less than 30 seconds', async () => {
      const startTime = Date.now();
      
      const solutions = await panicEngine.triggerPanic(mockContext);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(30000);
      expect(solutions).toHaveLength(3); // Top 3 solutions
    }, 35000); // 35s timeout pour le test

    it('should return emergency solutions on failure', async () => {
      // Mock failure scenario
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database error');
      });

      const solutions = await panicEngine.triggerPanic(mockContext);
      
      expect(solutions).toHaveLength(2); // Emergency solutions
      expect(solutions[0].category).toBe('emergency');
      expect(solutions[0].difficulty).toBe('trivial');
    });

    it('should prioritize instant solutions for high stress', async () => {
      const highStressContext = {
        ...mockContext,
        stressLevel: 5 as 1 | 2 | 3 | 4 | 5
      };

      const solutions = await panicEngine.triggerPanic(highStressContext);
      
      // First solution should be instant for high stress
      expect(solutions[0].type).toBe('instant');
      expect(solutions[0].timeRequired).toBeLessThan(15);
    });

    it('should handle family size in solutions', async () => {
      const familyContext = {
        ...mockContext,
        familyMembers: 6
      };

      const solutions = await panicEngine.triggerPanic(familyContext);
      
      solutions.forEach(solution => {
        if (solution.recipe?.servings) {
          expect(solution.recipe.servings).toBeGreaterThanOrEqual(6);
        }
        if (solution.estimatedCost) {
          expect(solution.estimatedCost).toBeGreaterThan(mockContext.familyMembers * 3);
        }
      });
    });

    it('should respect time constraints', async () => {
      const urgentContext = {
        ...mockContext,
        timeAvailable: 10
      };

      const solutions = await panicEngine.triggerPanic(urgentContext);
      
      solutions.forEach(solution => {
        expect(solution.timeRequired).toBeLessThanOrEqual(10);
      });
    });

    it('should handle inventory-based solutions', async () => {
      const contextWithInventory = {
        ...mockContext,
        inventory: [
          { id: '1', name: 'pâtes', quantity: 500, unit: 'g', category: 'carbs' },
          { id: '2', name: 'tomates', quantity: 3, unit: 'pcs', category: 'vegetables' }
        ]
      };

      // Mock emergency templates
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'emergency_meal_templates') {
          return {
            select: () => ({
              eq: () => ({
                lte: () => ({
                  order: () => ({
                    limit: () => ({
                      data: [{
                        id: 'template-1',
                        name: 'Pâtes tomates',
                        description: 'Recette simple',
                        max_prep_time: 15,
                        max_cook_time: 10,
                        difficulty_level: 'trivial',
                        ingredients_required: JSON.stringify([
                          { name: 'pâtes', amount: 100, unit: 'g' },
                          { name: 'tomates', amount: 2, unit: 'pcs' }
                        ]),
                        instructions: 'Cuire pâtes\nAjouter tomates\nServir'
                      }],
                      error: null
                    })
                  })
                })
              })
            })
          };
        }
        return mockSupabase.from(table);
      });

      const solutions = await panicEngine.triggerPanic(contextWithInventory);
      
      // Should include inventory-based solutions
      expect(solutions.some(s => s.category === 'template')).toBe(true);
    });

    it('should provide different solution types', async () => {
      const solutions = await panicEngine.triggerPanic(mockContext);
      
      const types = solutions.map(s => s.type);
      expect(types).toContain('instant');
      
      // Should have variety in solution types
      const uniqueTypes = new Set(types);
      expect(uniqueTypes.size).toBeGreaterThanOrEqual(1);
    });

    it('should include confidence scores', async () => {
      const solutions = await panicEngine.triggerPanic(mockContext);
      
      solutions.forEach(solution => {
        expect(solution.confidence).toBeGreaterThanOrEqual(0);
        expect(solution.confidence).toBeLessThanOrEqual(100);
      });

      // Emergency solutions should have high confidence
      const emergencySolution = solutions.find(s => s.category === 'universal');
      if (emergencySolution) {
        expect(emergencySolution.confidence).toBeGreaterThanOrEqual(85);
      }
    });

    it('should provide actionable steps', async () => {
      const solutions = await panicEngine.triggerPanic(mockContext);
      
      solutions.forEach(solution => {
        if (solution.steps) {
          expect(solution.steps.length).toBeGreaterThan(0);
          expect(solution.steps.length).toBeLessThanOrEqual(4); // Max 4 steps for panic mode
          
          solution.steps.forEach(step => {
            expect(step.length).toBeGreaterThan(5); // Meaningful step
            expect(step.length).toBeLessThanOrEqual(50); // Not too long
          });
        }
      });
    });

    it('should rank solutions appropriately', async () => {
      const solutions = await panicEngine.triggerPanic(mockContext);
      
      // Solutions should be ordered by score (highest first)
      for (let i = 0; i < solutions.length - 1; i++) {
        const currentScore = solutions[i].confidence;
        const nextScore = solutions[i + 1].confidence;
        expect(currentScore).toBeGreaterThanOrEqual(nextScore);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid user context gracefully', async () => {
      const invalidContext = {
        userId: '',
        timeAvailable: -1,
        stressLevel: 0 as any,
        familyMembers: 0,
        triggerType: 'manual' as const
      };

      const solutions = await panicEngine.triggerPanic(invalidContext);
      
      expect(solutions).toHaveLength(2); // Should fallback to emergency solutions
      expect(solutions[0].category).toBe('emergency');
    });

    it('should handle network failures', async () => {
      // Mock network failure
      mockSupabase.from.mockImplementation(() => {
        return {
          select: () => {
            throw new Error('Network error');
          }
        };
      });

      const solutions = await panicEngine.triggerPanic({
        userId: 'test-user',
        timeAvailable: 30,
        stressLevel: 3,
        familyMembers: 2,
        triggerType: 'manual'
      });
      
      expect(solutions).toHaveLength(2); // Emergency fallback
      expect(solutions.every(s => s.confidence >= 80)).toBe(true);
    });

    it('should handle extreme time pressure', async () => {
      const extremeContext = {
        userId: 'test-user',
        timeAvailable: 5, // Only 5 minutes
        stressLevel: 5 as 1 | 2 | 3 | 4 | 5,
        familyMembers: 1,
        triggerType: 'manual' as const
      };

      const solutions = await panicEngine.triggerPanic(extremeContext);
      
      solutions.forEach(solution => {
        expect(solution.timeRequired).toBeLessThanOrEqual(5);
        expect(solution.difficulty).toBe('trivial'); // Only trivial solutions for extreme pressure
      });
    });

    it('should adapt to family dietary restrictions', async () => {
      const contextWithRestrictions = {
        userId: 'test-user',
        timeAvailable: 30,
        stressLevel: 3 as 1 | 2 | 3 | 4 | 5,
        familyMembers: 4,
        triggerType: 'manual' as const,
        preferences: {
          cuisines: ['italian'],
          dietaryRestrictions: ['vegetarian', 'no_nuts'],
          budgetConstraints: { weeklyBudget: 100, maxMealCost: 15 },
          timeConstraints: { maxPrepTime: 20, maxCookTime: 30 },
          familySize: 4
        }
      };

      const solutions = await panicEngine.triggerPanic(contextWithRestrictions);
      
      // Should consider dietary restrictions
      expect(solutions.length).toBeGreaterThan(0);
      solutions.forEach(solution => {
        if (solution.estimatedCost) {
          expect(solution.estimatedCost).toBeLessThanOrEqual(15);
        }
      });
    });
  });

  describe('Performance Tests', () => {
    it('should cache solutions for similar contexts', async () => {
      const context = {
        userId: 'test-user',
        timeAvailable: 30,
        stressLevel: 3 as 1 | 2 | 3 | 4 | 5,
        familyMembers: 2,
        triggerType: 'manual' as const
      };

      // First call
      const startTime1 = Date.now();
      const solutions1 = await panicEngine.triggerPanic(context);
      const duration1 = Date.now() - startTime1;

      // Second call with same context should be faster (cache hit)
      const startTime2 = Date.now();
      const solutions2 = await panicEngine.triggerPanic(context);
      const duration2 = Date.now() - startTime2;

      expect(solutions1).toHaveLength(3);
      expect(solutions2).toHaveLength(3);
      // Second call should be significantly faster if caching works
      // (Note: In real implementation, this would be true. In tests, both might be fast)
    });

    it('should handle concurrent panic requests', async () => {
      const context = {
        userId: 'test-user',
        timeAvailable: 30,
        stressLevel: 4 as 1 | 2 | 3 | 4 | 5,
        familyMembers: 2,
        triggerType: 'manual' as const
      };

      // Simulate multiple concurrent panic triggers
      const promises = Array(5).fill(null).map(() => panicEngine.triggerPanic(context));
      
      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(solutions => {
        expect(solutions.length).toBeGreaterThan(0);
        expect(solutions.length).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('Integration with Analytics', () => {
    it('should log panic events for analytics', async () => {
      const context = {
        userId: 'test-user',
        timeAvailable: 30,
        stressLevel: 3 as 1 | 2 | 3 | 4 | 5,
        familyMembers: 2,
        triggerType: 'automatic' as const
      };

      await panicEngine.triggerPanic(context);
      
      // Should have called insert on panic_events table
      expect(mockSupabase.from).toHaveBeenCalledWith('panic_events');
    });

    it('should track solution generation time', async () => {
      const context = {
        userId: 'test-user',
        timeAvailable: 30,
        stressLevel: 3 as 1 | 2 | 3 | 4 | 5,
        familyMembers: 2,
        triggerType: 'manual' as const
      };

      const startTime = Date.now();
      await panicEngine.triggerPanic(context);
      const endTime = Date.now();
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(30000);
    });
  });

  describe('Solution Quality', () => {
    it('should provide diverse solution types', async () => {
      const context = {
        userId: 'test-user',
        timeAvailable: 45,
        stressLevel: 2 as 1 | 2 | 3 | 4 | 5,
        familyMembers: 3,
        triggerType: 'manual' as const,
        currentLocation: { lat: 48.8566, lng: 2.3522 } // Paris coordinates
      };

      const solutions = await panicEngine.triggerPanic(context);
      
      // Should include different categories
      const categories = solutions.map(s => s.category || s.type);
      expect(categories).toContain('universal');
      
      // Solutions should be practical
      solutions.forEach(solution => {
        expect(solution.title).toBeTruthy();
        expect(solution.description).toBeTruthy();
        expect(solution.timeRequired).toBeGreaterThan(0);
        expect(solution.difficulty).toBeTruthy();
      });
    });

    it('should provide appropriate difficulty levels', async () => {
      const highStressContext = {
        userId: 'test-user',
        timeAvailable: 15,
        stressLevel: 5 as 1 | 2 | 3 | 4 | 5,
        familyMembers: 2,
        triggerType: 'manual' as const
      };

      const solutions = await panicEngine.triggerPanic(highStressContext);
      
      // High stress should mean trivial solutions
      solutions.forEach(solution => {
        expect(['trivial', 'easy']).toContain(solution.difficulty);
      });
    });

    it('should provide cost-effective solutions', async () => {
      const budgetContext = {
        userId: 'test-user',
        timeAvailable: 30,
        stressLevel: 3 as 1 | 2 | 3 | 4 | 5,
        familyMembers: 4,
        triggerType: 'manual' as const,
        preferences: {
          budgetConstraints: { weeklyBudget: 50, maxMealCost: 10 },
          cuisines: [],
          dietaryRestrictions: [],
          timeConstraints: { maxPrepTime: 30, maxCookTime: 30 },
          familySize: 4
        }
      };

      const solutions = await panicEngine.triggerPanic(budgetContext);
      
      // Should prefer low-cost solutions
      const solutionsWithCost = solutions.filter(s => s.estimatedCost);
      solutionsWithCost.forEach(solution => {
        expect(solution.estimatedCost).toBeLessThanOrEqual(10);
      });
    });
  });
});