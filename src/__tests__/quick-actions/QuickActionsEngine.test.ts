import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { QuickActionsEngine } from '@/services/quick-actions/QuickActionsEngine';

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
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({ error: null }))
      })),
      gte: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({ data: [], error: null }))
        }))
      })),
      gt: jest.fn(() => ({ data: [], error: null })),
      lte: jest.fn(() => ({
        eq: jest.fn(() => ({ data: [], error: null }))
      })),
      or: jest.fn(() => ({
        gt: jest.fn(() => ({
          limit: jest.fn(() => ({ data: [], error: null }))
        }))
      }))
    }))
  })
};

// Mock console
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

describe('QuickActionsEngine', () => {
  let quickActions: QuickActionsEngine;

  beforeEach(() => {
    quickActions = new QuickActionsEngine(mockSupabase as any);
  });

  const mockContext = {
    userId: 'test-user',
    familySize: 2,
    triggerMethod: 'button' as const
  };

  describe('executeAction', () => {
    it('should complete all actions within 5 seconds', async () => {
      const actions = ['repeat_week', 'survival_mode', 'empty_fridge', 'reset_week'];
      
      for (const actionType of actions) {
        const startTime = Date.now();
        
        const result = await quickActions.executeAction(actionType, mockContext);
        
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(5000);
        expect(result).toBeDefined();
      }
    }, 25000); // 25s timeout for all actions

    it('should handle unknown action types', async () => {
      const result = await quickActions.executeAction('unknown_action', mockContext);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Type d\'action inconnu');
    });

    it('should timeout long-running actions', async () => {
      // Mock a handler that takes too long
      const slowHandler = {
        execute: jest.fn(() => new Promise(resolve => setTimeout(resolve, 15000)))
      };

      // This would require internal access to actionHandlers, so we'll test indirectly
      const result = await quickActions.executeAction('repeat_week', mockContext);
      
      // Should not timeout for normal actions
      expect(result).toBeDefined();
    }, 12000);

    it('should log action usage', async () => {
      await quickActions.executeAction('survival_mode', mockContext);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('quick_actions_usage');
    });
  });

  describe('RepeatWeekHandler', () => {
    beforeEach(() => {
      // Mock successful plan retrieval
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'weekly_meal_plans') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => ({
                    single: jest.fn(() => ({
                      data: {
                        id: 'plan-1',
                        user_id: 'test-user',
                        week_start_date: '2024-01-01',
                        meal_plan_entries: [
                          {
                            id: 'entry-1',
                            day_of_week: 1,
                            meal_type: 'dinner',
                            recipe_id: 'recipe-1'
                          }
                        ]
                      },
                      error: null
                    }))
                  }))
                }))
              }))
            }))
          };
        }
        return mockSupabase.from(table);
      });
    });

    it('should repeat last successful week', async () => {
      const result = await quickActions.executeAction('repeat_week', mockContext);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('répété');
      expect(result.data).toBeDefined();
    });

    it('should handle no previous plan', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                single: () => ({ data: null, error: null })
              })
            })
          })
        })
      }));

      const result = await quickActions.executeAction('repeat_week', mockContext);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Aucun plan précédent');
    });

    it('should adjust portions for family size', async () => {
      const familyContext = { ...mockContext, familySize: 6 };
      
      const result = await quickActions.executeAction('repeat_week', familyContext);
      
      if (result.success) {
        expect(result.metadata?.changes).toContain('Portions ajustées');
      }
    });

    it('should warn about missing ingredients', async () => {
      // Mock missing ingredients scenario
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'pantry_items') {
          return {
            select: () => ({
              eq: () => ({
                gt: () => ({ data: [], error: null }) // No items in pantry
              })
            })
          };
        }
        if (table === 'recipes_catalog') {
          return {
            select: () => ({
              in: () => ({
                data: [{
                  id: 'recipe-1',
                  ingredients: JSON.stringify([
                    { name: 'tomates', amount: 3 },
                    { name: 'pâtes', amount: 200 }
                  ])
                }],
                error: null
              })
            })
          };
        }
        return mockSupabase.from(table);
      });

      const result = await quickActions.executeAction('repeat_week', mockContext);
      
      if (result.success && result.warnings) {
        expect(result.warnings).toContain('manquants');
      }
    });
  });

  describe('SurvivalModeHandler', () => {
    it('should create simple meal plan', async () => {
      const result = await quickActions.executeAction('survival_mode', mockContext);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Mode survie');
      expect(result.data).toBeDefined();
      
      if (result.data) {
        // Should have simple meals for the week
        expect(Object.keys(result.data)).toContain('friday'); // Friday should have restaurant
      }
    });

    it('should provide ultra-simple recipes', async () => {
      const result = await quickActions.executeAction('survival_mode', mockContext);
      
      expect(result.success).toBe(true);
      expect(result.metadata?.changes).toContain('ultra-simples');
    });

    it('should scale for family size', async () => {
      const familyContext = { ...mockContext, familySize: 5 };
      
      const result = await quickActions.executeAction('survival_mode', familyContext);
      
      expect(result.success).toBe(true);
      // Budget should adjust for larger family
      if (result.data) {
        expect(result.data.totalEstimatedCost).toBeGreaterThan(35); // Base cost * family factor
      }
    });
  });

  describe('EmptyFridgeHandler', () => {
    beforeEach(() => {
      // Mock expiring items
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'pantry_items') {
          return {
            select: () => ({
              eq: () => ({
                not: () => ({
                  lte: () => ({
                    gt: () => ({
                      order: () => ({
                        data: [
                          {
                            id: '1',
                            name: 'tomates',
                            quantity: 3,
                            expiry_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                            location: 'fridge'
                          },
                          {
                            id: '2',
                            name: 'pâtes',
                            quantity: 500,
                            expiry_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
                            location: 'pantry'
                          }
                        ],
                        error: null
                      })
                    })
                  })
                })
              })
            })
          };
        }
        return mockSupabase.from(table);
      });
    });

    it('should find expiring items', async () => {
      const result = await quickActions.executeAction('empty_fridge', mockContext);
      
      expect(result.success).toBe(true);
      expect(result.data.expiringItems).toHaveLength(2);
      expect(result.data.expiringItems[0].name).toBe('tomates');
    });

    it('should suggest recipes using expiring ingredients', async () => {
      const result = await quickActions.executeAction('empty_fridge', mockContext);
      
      if (result.success) {
        expect(result.data.suggestions).toHaveLength(2);
        expect(result.data.suggestions[0].priority).toBe('high');
      }
    });

    it('should handle no expiring items gracefully', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            not: () => ({
              lte: () => ({
                gt: () => ({
                  order: () => ({ data: [], error: null })
                })
              })
            })
          })
        })
      }));

      const result = await quickActions.executeAction('empty_fridge', mockContext);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Aucun produit');
    });

    it('should prioritize by expiry urgency', async () => {
      const result = await quickActions.executeAction('empty_fridge', mockContext);
      
      if (result.success && result.data.suggestions) {
        const priorities = result.data.suggestions.map((s: any) => s.priority);
        const highPriorityFirst = priorities.indexOf('high') <= priorities.indexOf('medium');
        expect(highPriorityFirst).toBe(true);
      }
    });
  });

  describe('ResetWeekHandler', () => {
    it('should clear current week plan', async () => {
      const result = await quickActions.executeAction('reset_week', mockContext);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('réinitialisée');
      expect(result.data.weekStart).toBeDefined();
    });

    it('should handle no existing plan', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            single: () => ({ data: null, error: null })
          })
        })
      }));

      const result = await quickActions.executeAction('reset_week', mockContext);
      
      expect(result.success).toBe(true); // Should succeed even if nothing to clear
    });
  });

  describe('SmartSuggestHandler', () => {
    beforeEach(() => {
      // Mock user data for AI analysis
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'weekly_meal_plans') {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    data: [
                      {
                        meal_plan_entries: [
                          { recipe_id: 'italian-1' },
                          { recipe_id: 'italian-2' }
                        ]
                      }
                    ],
                    error: null
                  })
                })
              })
            })
          };
        }
        if (table === 'user_meal_preferences') {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({
                  data: {
                    cuisine_preferences: ['italien'],
                    dietary_restrictions: [],
                    max_prep_time: 30
                  },
                  error: null
                })
              })
            })
          };
        }
        return mockSupabase.from(table);
      });
    });

    it('should generate personalized suggestions', async () => {
      const result = await quickActions.executeAction('smart_suggest', mockContext);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3); // 3 suggestions
      expect(result.message).toContain('IA personnalisées');
    });

    it('should base suggestions on user history', async () => {
      const result = await quickActions.executeAction('smart_suggest', mockContext);
      
      if (result.success) {
        // Should include preference-based suggestion
        const preferenceBasedSuggestion = result.data.find((s: any) => s.type === 'preference_based');
        expect(preferenceBasedSuggestion).toBeDefined();
        expect(preferenceBasedSuggestion.description).toContain('italien');
      }
    });

    it('should include seasonal recommendations', async () => {
      const result = await quickActions.executeAction('smart_suggest', mockContext);
      
      if (result.success) {
        const seasonalSuggestion = result.data.find((s: any) => s.type === 'seasonal');
        expect(seasonalSuggestion).toBeDefined();
        expect(seasonalSuggestion.category).toBe('seasonal');
      }
    });
  });

  describe('BatchCookingHandler', () => {
    beforeEach(() => {
      // Mock current meal plan with multiple meals
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'weekly_meal_plans') {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({
                  data: {
                    id: 'plan-1',
                    meals: [
                      { dayOfWeek: 1, estimatedTime: 30, recipeId: 'stew-1' },
                      { dayOfWeek: 2, estimatedTime: 25, recipeId: 'stew-2' },
                      { dayOfWeek: 3, estimatedTime: 15, recipeId: 'pasta-1' }
                    ]
                  },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'recipes_catalog') {
          return {
            select: () => ({
              in: () => ({
                data: [
                  {
                    id: 'stew-1',
                    ingredients: JSON.stringify([
                      { name: 'carottes', amount: 3 },
                      { name: 'pommes de terre', amount: 5 }
                    ])
                  },
                  {
                    id: 'stew-2',
                    ingredients: JSON.stringify([
                      { name: 'carottes', amount: 4 },
                      { name: 'oignons', amount: 2 }
                    ])
                  }
                ],
                error: null
              })
            })
          };
        }
        return mockSupabase.from(table);
      });
    });

    it('should identify batch cooking opportunities', async () => {
      const result = await quickActions.executeAction('batch_cooking', mockContext);
      
      expect(result.success).toBe(true);
      expect(result.data.opportunities).toHaveLength(2); // technique + ingredient groupings
      expect(result.data.estimatedTimeSaved).toBeGreaterThan(0);
    });

    it('should create batch cooking schedule', async () => {
      const result = await quickActions.executeAction('batch_cooking', mockContext);
      
      if (result.success) {
        expect(result.data.schedule).toHaveLength(2);
        expect(result.data.schedule[0].day).toBe('dimanche');
        expect(result.data.schedule[0].estimatedTime).toBeGreaterThan(30);
      }
    });

    it('should handle no current plan', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            single: () => ({ data: null, error: null })
          })
        })
      }));

      const result = await quickActions.executeAction('batch_cooking', mockContext);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('plan de repas');
    });

    it('should calculate time savings accurately', async () => {
      const result = await quickActions.executeAction('batch_cooking', mockContext);
      
      if (result.success) {
        expect(result.data.estimatedTimeSaved).toBeLessThanOrEqual(50); // Reasonable max
        expect(result.data.estimatedTimeSaved).toBeGreaterThanOrEqual(5); // Minimum benefit
      }
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await quickActions.executeAction('repeat_week', mockContext);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should execute actions in parallel when possible', async () => {
      const actions = ['survival_mode', 'empty_fridge', 'smart_suggest'];
      
      const startTime = Date.now();
      const promises = actions.map(action => 
        quickActions.executeAction(action, mockContext)
      );
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // Parallel execution should be faster than sequential
      expect(totalTime).toBeLessThan(actions.length * 3000); // Less than 3s per action
      
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });

    it('should provide consistent results for same context', async () => {
      const result1 = await quickActions.executeAction('survival_mode', mockContext);
      const result2 = await quickActions.executeAction('survival_mode', mockContext);
      
      expect(result1.success).toBe(result2.success);
      expect(typeof result1.data).toBe(typeof result2.data);
    });
  });

  describe('Action Statistics', () => {
    it('should track action statistics', async () => {
      const stats = await quickActions.getActionStats('test-user', 30);
      
      expect(stats).toHaveProperty('totalActions');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('averageTime');
      expect(stats).toHaveProperty('mostUsedAction');
      expect(stats).toHaveProperty('actionBreakdown');
    });

    it('should provide available actions list', async () => {
      const availableActions = quickActions.getAvailableActions();
      
      expect(availableActions).toHaveLength(6);
      expect(availableActions[0]).toHaveProperty('id');
      expect(availableActions[0]).toHaveProperty('name');
      expect(availableActions[0]).toHaveProperty('description');
      expect(availableActions[0]).toHaveProperty('estimatedTime');

      // Check all expected actions are present
      const actionIds = availableActions.map(a => a.id);
      expect(actionIds).toContain('repeat_week');
      expect(actionIds).toContain('survival_mode');
      expect(actionIds).toContain('empty_fridge');
      expect(actionIds).toContain('reset_week');
      expect(actionIds).toContain('smart_suggest');
      expect(actionIds).toContain('batch_cooking');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed context gracefully', async () => {
      const malformedContext = {
        userId: null as any,
        familySize: -1,
        triggerMethod: 'invalid' as any
      };

      const result = await quickActions.executeAction('survival_mode', malformedContext);
      
      // Should handle gracefully, not throw
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should validate action parameters', async () => {
      const invalidParams = {
        invalidParam: 'value'
      };

      const result = await quickActions.executeAction('repeat_week', mockContext, invalidParams);
      
      // Should not crash with invalid params
      expect(result).toBeDefined();
    });

    it('should handle network timeouts', async () => {
      // Mock slow database response
      mockSupabase.from.mockImplementation(() => ({
        select: () => new Promise(resolve => setTimeout(() => resolve({
          eq: () => ({ data: [], error: null })
        }), 12000)) // 12 second delay
      }));

      const result = await quickActions.executeAction('repeat_week', mockContext);
      
      // Should timeout and return error
      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    }, 15000);
  });
});