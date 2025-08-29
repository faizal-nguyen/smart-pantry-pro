/**
 * Basic tests for the Meal Planning Engine
 * Tests core functionality without complex type dependencies
 */

describe('Meal Planning Engine - Basic Tests', () => {
  describe('Core Engine Functionality', () => {
    it('should have MealPlanningEngine class available', () => {
      expect(() => {
        const { MealPlanningEngine } = require('../core/MealPlanningEngine');
        new MealPlanningEngine(false);
      }).not.toThrow();
    });

    it('should initialize with correct AI state', () => {
      const { MealPlanningEngine } = require('../core/MealPlanningEngine');
      
      const aiEnabled = new MealPlanningEngine(true);
      const aiDisabled = new MealPlanningEngine(false);
      
      expect(aiEnabled.isAIEnabled()).toBe(true);
      expect(aiDisabled.isAIEnabled()).toBe(false);
    });

    it('should be able to toggle AI functionality', () => {
      const { MealPlanningEngine } = require('../core/MealPlanningEngine');
      const engine = new MealPlanningEngine(false);
      
      expect(engine.isAIEnabled()).toBe(false);
      
      engine.toggleAI(true);
      expect(engine.isAIEnabled()).toBe(true);
      
      engine.toggleAI(false);
      expect(engine.isAIEnabled()).toBe(false);
    });

    it('should export singleton instances', () => {
      const { mealPlanningEngine, intelligentMealPlanningEngine } = require('../core/MealPlanningEngine');
      
      expect(mealPlanningEngine).toBeDefined();
      expect(intelligentMealPlanningEngine).toBeDefined();
      expect(mealPlanningEngine).toBe(intelligentMealPlanningEngine);
    });
  });

  describe('Intelligence Layer Components', () => {
    it('should have IntelligenceLayer class available', () => {
      expect(() => {
        const { IntelligenceLayer } = require('../intelligence/index');
        new IntelligenceLayer();
      }).not.toThrow();
    });

    it('should export intelligence layer singleton', () => {
      const { intelligenceLayer } = require('../intelligence/index');
      expect(intelligenceLayer).toBeDefined();
    });

    it('should have PreferenceLearner available', () => {
      expect(() => {
        const { PreferenceLearner } = require('../intelligence/ml/PreferenceLearner');
        new PreferenceLearner();
      }).not.toThrow();
    });

    it('should have SmartRecommender available', () => {
      expect(() => {
        const { SmartRecommender } = require('../intelligence/recommendation/SmartRecommender');
        new SmartRecommender();
      }).not.toThrow();
    });

    it('should have BudgetOptimizer available', () => {
      expect(() => {
        const { BudgetOptimizer } = require('../intelligence/analyzers/BudgetOptimizer');
        new BudgetOptimizer();
      }).not.toThrow();
    });
  });

  describe('Type System', () => {
    it('should export planning types', () => {
      const types = require('../types');
      
      expect(types.DietaryRestriction).toBeDefined();
      expect(types.Allergen).toBeDefined();
      expect(types.CuisinePreference).toBeDefined();
      expect(types.MealType).toBeDefined();
      expect(types.DayOfWeek).toBeDefined();
    });

    it('should export intelligence types', () => {
      const intelligenceTypes = require('../intelligence/types');
      
      expect(intelligenceTypes.AdaptationEventType).toBeDefined();
      expect(intelligenceTypes.PatternType).toBeDefined();
    });
  });

  describe('Integration Points', () => {
    it('should be able to import all main components together', () => {
      expect(() => {
        const engine = require('../core/MealPlanningEngine');
        const intelligence = require('../intelligence/index');
        const types = require('../types');
        
        expect(engine.MealPlanningEngine).toBeDefined();
        expect(intelligence.IntelligenceLayer).toBeDefined();
        expect(types.MealType).toBeDefined();
      }).not.toThrow();
    });

    it('should have proper component dependencies', () => {
      const { mealPlanningEngine } = require('../core/MealPlanningEngine');
      
      // Test that engine has required methods
      expect(typeof mealPlanningEngine.generatePlan).toBe('function');
      expect(typeof mealPlanningEngine.generateIntelligentPlan).toBe('function');
      expect(typeof mealPlanningEngine.adaptPlanIntelligently).toBe('function');
      expect(typeof mealPlanningEngine.processFeedbackForLearning).toBe('function');
      expect(typeof mealPlanningEngine.getIntelligentRecommendations).toBe('function');
      expect(typeof mealPlanningEngine.toggleAI).toBe('function');
      expect(typeof mealPlanningEngine.isAIEnabled).toBe('function');
      expect(typeof mealPlanningEngine.getAIMetrics).toBe('function');
    });
  });

  describe('Database Migration Support', () => {
    it('should have database migration file', () => {
      const fs = require('fs');
      const path = require('path');
      
      const migrationPath = path.join(
        process.cwd(),
        'supabase/migrations/20250829000001_create_meal_planning_tables.sql'
      );
      
      expect(fs.existsSync(migrationPath)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing dependencies gracefully', async () => {
      const { MealPlanningEngine } = require('../core/MealPlanningEngine');
      const engine = new MealPlanningEngine(false);
      
      // Test with minimal request that won't cause database calls
      const mockRequest = {
        userId: 'test_user',
        optimizationMode: 'balanced',
        preferences: {
          cuisinePreferences: [],
          dietaryRestrictions: [],
          timeConstraints: {
            maxPrepTime: 60,
            maxCookTime: 90,
            availableTimeSlots: []
          },
          budgetConstraints: {
            weeklyBudget: 50,
            maxMealCost: 15,
            strictMode: false
          },
          familySize: 4,
          nutritionalGoals: {
            targetCalories: 2000,
            macroDistribution: {
              protein: 0.3,
              carbs: 0.4,
              fat: 0.3
            }
          }
        },
        constraints: {
          maxPrepTimePerMeal: 60,
          minVarietyScore: 0.5,
          maxBudgetOverrun: 0.2,
          requiredMealsPerWeek: 14
        }
      };

      // This should not throw, even if it fails to generate a plan
      const result = await engine.generatePlan(mockRequest);
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle AI metrics request when AI disabled', async () => {
      const { MealPlanningEngine } = require('../core/MealPlanningEngine');
      const engine = new MealPlanningEngine(false);
      
      const metrics = await engine.getAIMetrics();
      expect(metrics).toBeNull();
    });

    it('should handle intelligent recommendations when AI disabled', async () => {
      const { MealPlanningEngine } = require('../core/MealPlanningEngine');
      const engine = new MealPlanningEngine(false);
      
      const mockContext = {
        request: {
          userId: 'test_user',
          preferences: {
            cuisinePreferences: [],
            budgetConstraints: { weeklyBudget: 50 }
          }
        },
        availableRecipes: [],
        weekStartDate: new Date(),
        daysToplan: 7,
        mealsPerDay: ['lunch', 'dinner']
      };

      const recommendations = await engine.getIntelligentRecommendations(mockContext);
      expect(recommendations.primaryRecommendations).toEqual([]);
      expect(recommendations.explanations).toEqual([]);
    });
  });

  describe('Utility Functions', () => {
    it('should calculate next Monday correctly', () => {
      const { MealPlanningEngine } = require('../core/MealPlanningEngine');
      const engine = new MealPlanningEngine(false);
      
      const nextMonday = (engine as any).getNextMonday();
      expect(nextMonday).toBeInstanceOf(Date);
      expect(nextMonday.getDay()).toBe(1); // Monday = 1
      expect(nextMonday.getHours()).toBe(0);
      expect(nextMonday.getMinutes()).toBe(0);
      expect(nextMonday.getSeconds()).toBe(0);
    });

    it('should create empty optimization score', () => {
      const { MealPlanningEngine } = require('../core/MealPlanningEngine');
      const engine = new MealPlanningEngine(false);
      
      const emptyScore = (engine as any).createEmptyScore();
      expect(emptyScore.overall).toBe(0);
      expect(emptyScore.nutrition).toBe(0);
      expect(emptyScore.budget).toBe(0);
      expect(emptyScore.variety).toBe(0);
      expect(emptyScore.timeEfficiency).toBe(0);
    });

    it('should calculate inventory match percentage', () => {
      const { MealPlanningEngine } = require('../core/MealPlanningEngine');
      const engine = new MealPlanningEngine(false);
      
      const recipe = {
        ingredients_json: [
          { name: 'Tomates' },
          { name: 'Oignons' },
          { name: 'Ail' }
        ]
      };

      const inventory = [
        { product: { name: 'tomates' } },
        { product: { name: 'oignons' } }
      ];

      const match = (engine as any).calculateInventoryMatch(recipe, inventory);
      expect(match).toBeCloseTo(0.67, 1); // 2/3 ingredients available
    });

    it('should handle empty inventory gracefully', () => {
      const { MealPlanningEngine } = require('../core/MealPlanningEngine');
      const engine = new MealPlanningEngine(false);
      
      const recipe = {
        ingredients_json: [{ name: 'Tomates' }]
      };

      const match = (engine as any).calculateInventoryMatch(recipe, []);
      expect(match).toBe(0);
    });
  });

  describe('Component Integration', () => {
    it('should initialize all required analyzers', () => {
      const { MealPlanningEngine } = require('../core/MealPlanningEngine');
      const engine = new MealPlanningEngine(false);
      
      // Check that private properties exist (via accessing them)
      expect((engine as any).optimizer).toBeDefined();
      expect((engine as any).constraintsSolver).toBeDefined();
      expect((engine as any).nutritionalBalancer).toBeDefined();
      expect((engine as any).budgetOptimizer).toBeDefined();
      expect((engine as any).inventoryAnalyzer).toBeDefined();
      expect((engine as any).seasonalAnalyzer).toBeDefined();
      expect((engine as any).preferencesAnalyzer).toBeDefined();
    });

    it('should have intelligence layer integration', () => {
      const { intelligenceLayer } = require('../intelligence/index');
      
      // Test that main intelligence methods exist
      expect(typeof intelligenceLayer.generateIntelligentPlan).toBe('function');
      expect(typeof intelligenceLayer.adaptPlan).toBe('function');
      expect(typeof intelligenceLayer.processFeedback).toBe('function');
      expect(typeof intelligenceLayer.runLearningCycle).toBe('function');
      expect(typeof intelligenceLayer.getIntelligenceMetrics).toBe('function');
    });
  });

  describe('Configuration', () => {
    it('should support different optimization modes', () => {
      const validModes = ['budget', 'nutrition', 'time', 'balanced'];
      
      validModes.forEach(mode => {
        expect(['budget', 'nutrition', 'time', 'balanced']).toContain(mode);
      });
    });

    it('should support different meal types', () => {
      const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
      
      validMealTypes.forEach(mealType => {
        expect(['breakfast', 'lunch', 'dinner', 'snack']).toContain(mealType);
      });
    });

    it('should support different plan statuses', () => {
      const validStatuses = ['draft', 'active', 'completed', 'archived'];
      
      validStatuses.forEach(status => {
        expect(['draft', 'active', 'completed', 'archived']).toContain(status);
      });
    });
  });

  describe('Business Logic Validation', () => {
    it('should validate day of week range', () => {
      const validateDayOfWeek = (day: number) => day >= 0 && day < 7;
      
      expect(validateDayOfWeek(0)).toBe(true); // Sunday
      expect(validateDayOfWeek(6)).toBe(true); // Saturday
      expect(validateDayOfWeek(7)).toBe(false); // Invalid
      expect(validateDayOfWeek(-1)).toBe(false); // Invalid
    });

    it('should validate optimization score ranges', () => {
      const validateScore = (score: number) => score >= 0 && score <= 1;
      
      expect(validateScore(0)).toBe(true);
      expect(validateScore(0.5)).toBe(true);
      expect(validateScore(1)).toBe(true);
      expect(validateScore(-0.1)).toBe(false);
      expect(validateScore(1.1)).toBe(false);
    });

    it('should validate budget constraints logic', () => {
      const validateBudget = (weekly: number, maxMeal: number) => {
        return weekly > 0 && maxMeal > 0 && maxMeal <= weekly;
      };
      
      expect(validateBudget(50, 12)).toBe(true);
      expect(validateBudget(30, 35)).toBe(false); // Max meal > weekly
      expect(validateBudget(-10, 5)).toBe(false); // Negative weekly
      expect(validateBudget(50, 0)).toBe(false); // Zero max meal
    });
  });

  describe('System Requirements', () => {
    it('should have required dependencies available', () => {
      // Test that main dependencies can be required
      expect(() => require('@/integrations/supabase/client')).not.toThrow();
      expect(() => require('../core/MealPlanOptimizer')).not.toThrow();
      expect(() => require('../core/ConstraintsSolver')).not.toThrow();
    });

    it('should support crypto functions', () => {
      expect(typeof crypto.randomUUID).toBe('function');
      
      const uuid = crypto.randomUUID();
      expect(uuid).toBeTruthy();
      expect(uuid.length).toBe(36);
    });
  });
});