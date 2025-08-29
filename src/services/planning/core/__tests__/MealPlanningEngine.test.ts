import { MealPlanningEngine } from '../MealPlanningEngine';
import { PlanningRequest, PlanningResult, WeeklyMealPlan, MealPlanEntry } from '../../types';
import { AdaptationEvent, UserBehaviorData } from '../../intelligence/types';

// Mock Supabase
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
          lte: jest.fn(() => ({
            lte: jest.fn(() => Promise.resolve({ data: mockRecipes, error: null }))
          })),
          not: jest.fn(() => ({
            lte: jest.fn(() => ({
              lte: jest.fn(() => Promise.resolve({ data: mockRecipes, error: null }))
            }))
          })),
          gte: jest.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }))
    }))
  }
}));

// Mock Intelligence Layer
jest.mock('../../intelligence', () => ({
  intelligenceLayer: {
    generateIntelligentPlan: jest.fn(),
    processFeedback: jest.fn(),
    getIntelligenceMetrics: jest.fn()
  },
  contextAnalyzer: {
    analyzeCurrentContext: jest.fn()
  },
  preferenceLearner: {
    learnFromBehavior: jest.fn()
  },
  smartRecommender: {
    generateRecommendations: jest.fn()
  },
  realTimeAdapter: {
    adaptPlan: jest.fn()
  }
}));

const mockRecipes = [
  {
    id: 'recipe1',
    title: 'Pâtes à la carbonara',
    prep_time: 15,
    cook_time: 20,
    difficulty: 2,
    tags: ['italienne', 'rapide'],
    ingredients_json: [
      { name: 'pâtes', quantity: '400g' },
      { name: 'œufs', quantity: '4' },
      { name: 'parmesan', quantity: '100g' }
    ],
    nutrition_json: { calories: 450, protein: 20, carbs: 60, fat: 15 }
  },
  {
    id: 'recipe2',
    title: 'Salade de quinoa',
    prep_time: 10,
    cook_time: 15,
    difficulty: 1,
    tags: ['healthy', 'végétarien'],
    ingredients_json: [
      { name: 'quinoa', quantity: '200g' },
      { name: 'tomates', quantity: '300g' },
      { name: 'avocat', quantity: '2' }
    ],
    nutrition_json: { calories: 350, protein: 15, carbs: 40, fat: 12 }
  }
];

const createMockRequest = (overrides: Partial<PlanningRequest> = {}): PlanningRequest => ({
  userId: 'user123',
  weekStartDate: new Date('2024-01-01'),
  optimizationMode: 'balanced',
  preferences: {
    cuisinePreferences: ['française', 'italienne'],
    dietaryRestrictions: [],
    timeConstraints: {
      maxPrepTime: 45,
      maxCookTime: 60,
      availableTimeSlots: []
    },
    budgetConstraints: {
      weeklyBudget: 50,
      maxMealCost: 12,
      strictMode: false
    },
    familySize: 4,
    nutritionalGoals: {
      targetCalories: 2000,
      macroDistribution: { protein: 0.3, carbs: 0.4, fat: 0.3 }
    }
  },
  constraints: {
    maxPrepTimePerMeal: 45,
    minVarietyScore: 0.7,
    maxBudgetOverrun: 0.1,
    requiredMealsPerWeek: 14
  },
  existingInventory: [],
  ...overrides
});

describe('MealPlanningEngine', () => {
  let engine: MealPlanningEngine;

  beforeEach(() => {
    engine = new MealPlanningEngine(false); // Disable AI for unit tests
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with AI disabled by default in tests', () => {
      const testEngine = new MealPlanningEngine(false);
      expect(testEngine.isAIEnabled()).toBe(false);
    });

    it('should initialize with AI enabled when specified', () => {
      const testEngine = new MealPlanningEngine(true);
      expect(testEngine.isAIEnabled()).toBe(true);
    });
  });

  describe('generatePlan', () => {
    it('should generate a basic meal plan successfully', async () => {
      const request = createMockRequest();
      
      const result = await engine.generatePlan(request);
      
      expect(result.success).toBe(true);
      expect(result.plan).toBeDefined();
      expect(result.plan?.meals).toBeDefined();
      expect(result.optimizationScore).toBeDefined();
    });

    it('should respect dietary restrictions', async () => {
      const request = createMockRequest({
        preferences: {
          ...createMockRequest().preferences,
          dietaryRestrictions: ['meat']
        }
      });
      
      const result = await engine.generatePlan(request);
      
      expect(result.success).toBe(true);
      // Verify no meat-containing meals were selected
      if (result.plan?.meals) {
        result.plan.meals.forEach(meal => {
          expect(meal.tags).not.toContain('meat');
        });
      }
    });

    it('should handle empty recipe database gracefully', async () => {
      // Mock empty response
      const { supabase } = require('@/integrations/supabase/client');
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            lte: jest.fn(() => ({
              lte: jest.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        }))
      });

      const request = createMockRequest();
      const result = await engine.generatePlan(request);
      
      expect(result.success).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings?.[0]?.type).toBe('no_valid_plans');
    });

    it('should handle budget constraints correctly', async () => {
      const request = createMockRequest({
        preferences: {
          ...createMockRequest().preferences,
          budgetConstraints: {
            weeklyBudget: 20, // Very tight budget
            maxMealCost: 3,
            strictMode: true
          }
        }
      });
      
      const result = await engine.generatePlan(request);
      
      if (result.success && result.plan) {
        expect(result.plan.totalEstimatedCost).toBeLessThanOrEqual(20);
        result.plan.meals.forEach(meal => {
          expect(meal.estimatedCost).toBeLessThanOrEqual(3);
        });
      }
    });

    it('should generate 14 meals for a complete week', async () => {
      const request = createMockRequest();
      
      const result = await engine.generatePlan(request);
      
      if (result.success && result.plan?.meals) {
        expect(result.plan.meals).toHaveLength(14); // 7 days * 2 meals
        
        // Verify we have lunch and dinner for each day
        for (let day = 0; day < 7; day++) {
          const dayMeals = result.plan.meals.filter(meal => meal.dayOfWeek === day);
          expect(dayMeals).toHaveLength(2);
          
          const lunchMeal = dayMeals.find(meal => meal.mealType === 'lunch');
          const dinnerMeal = dayMeals.find(meal => meal.mealType === 'dinner');
          
          expect(lunchMeal).toBeDefined();
          expect(dinnerMeal).toBeDefined();
        }
      }
    });
  });

  describe('generateIntelligentPlan', () => {
    let aiEngine: MealPlanningEngine;

    beforeEach(() => {
      aiEngine = new MealPlanningEngine(true);
    });

    it('should use AI when enabled', async () => {
      const request = createMockRequest();
      const mockUserBehavior: UserBehaviorData = {
        userId: 'user123',
        recentActions: [],
        cookingFrequency: 0.8,
        preferredCuisines: ['française'],
        avgMealComplexity: 2.5,
        feedbackHistory: [],
        mealTimings: [],
        portionPreferences: 4
      };

      const mockIntelligentPlan: WeeklyMealPlan = {
        id: 'ai_plan_123',
        userId: 'user123',
        name: 'Plan IA',
        weekStartDate: new Date(),
        meals: [],
        totalEstimatedCost: 45,
        aiGenerated: true,
        intelligenceVersion: '2.0',
        status: 'draft',
        createdAt: new Date()
      };

      const { intelligenceLayer } = require('../../intelligence');
      intelligenceLayer.generateIntelligentPlan.mockResolvedValue(mockIntelligentPlan);

      const result = await aiEngine.generateIntelligentPlan(request, mockUserBehavior);
      
      expect(intelligenceLayer.generateIntelligentPlan).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.plan?.aiGenerated).toBe(true);
    });

    it('should fallback to standard generation when AI fails', async () => {
      const request = createMockRequest();
      
      const { intelligenceLayer } = require('../../intelligence');
      intelligenceLayer.generateIntelligentPlan.mockRejectedValue(new Error('AI failed'));

      const result = await aiEngine.generateIntelligentPlan(request);
      
      expect(result.success).toBe(true);
      // Should still generate a plan via fallback
    });

    it('should disable AI when requested', async () => {
      const request = createMockRequest();
      
      const result = await engine.generateIntelligentPlan(request);
      
      expect(result.success).toBe(true);
      // Should use standard generation when AI is disabled
    });
  });

  describe('adaptPlanIntelligently', () => {
    let aiEngine: MealPlanningEngine;

    beforeEach(() => {
      aiEngine = new MealPlanningEngine(true);
    });

    it('should adapt plan when AI is enabled', async () => {
      const mockPlan: WeeklyMealPlan = {
        id: 'plan123',
        userId: 'user123',
        name: 'Test Plan',
        weekStartDate: new Date(),
        meals: [],
        totalEstimatedCost: 40,
        status: 'draft',
        createdAt: new Date()
      };

      const mockEvent: AdaptationEvent = {
        type: 'inventory_change',
        userId: 'user123',
        data: { removedItems: ['item1'] },
        timestamp: new Date(),
        priority: 2,
        context: {}
      };

      const mockContext = {
        request: createMockRequest(),
        availableRecipes: [],
        weekStartDate: new Date(),
        daysToplan: 7,
        mealsPerDay: ['lunch', 'dinner']
      };

      const { realTimeAdapter } = require('../../intelligence');
      realTimeAdapter.adaptPlan.mockResolvedValue(mockPlan);

      const result = await aiEngine.adaptPlanIntelligently(mockPlan, mockEvent, mockContext);
      
      expect(realTimeAdapter.adaptPlan).toHaveBeenCalledWith(mockPlan, mockEvent, mockContext);
      expect(result).toEqual(mockPlan);
    });

    it('should return original plan when AI is disabled', async () => {
      const mockPlan: WeeklyMealPlan = {
        id: 'plan123',
        userId: 'user123',
        name: 'Test Plan',
        weekStartDate: new Date(),
        meals: [],
        totalEstimatedCost: 40,
        status: 'draft',
        createdAt: new Date()
      };

      const mockEvent: AdaptationEvent = {
        type: 'inventory_change',
        userId: 'user123',
        data: {},
        timestamp: new Date(),
        priority: 2,
        context: {}
      };

      const mockContext = {
        request: createMockRequest(),
        availableRecipes: [],
        weekStartDate: new Date(),
        daysToplan: 7,
        mealsPerDay: ['lunch', 'dinner']
      };

      const result = await engine.adaptPlanIntelligently(mockPlan, mockEvent, mockContext);
      
      expect(result).toEqual(mockPlan);
    });
  });

  describe('processFeedbackForLearning', () => {
    it('should process feedback when AI is enabled', async () => {
      const aiEngine = new MealPlanningEngine(true);
      const mockFeedback = {
        mealId: 'meal123',
        rating: 4.5,
        comments: 'Delicious!',
        userId: 'user123'
      };

      const mockPlan: WeeklyMealPlan = {
        id: 'plan123',
        userId: 'user123',
        name: 'Test Plan',
        weekStartDate: new Date(),
        meals: [],
        totalEstimatedCost: 40,
        status: 'draft',
        createdAt: new Date()
      };

      const { intelligenceLayer } = require('../../intelligence');
      intelligenceLayer.processFeedback.mockResolvedValue(undefined);

      await aiEngine.processFeedbackForLearning(mockFeedback, mockPlan, 'user123');
      
      expect(intelligenceLayer.processFeedback).toHaveBeenCalledWith(mockFeedback, mockPlan, 'user123');
    });

    it('should do nothing when AI is disabled', async () => {
      const mockFeedback = { rating: 4 };
      const mockPlan: WeeklyMealPlan = {
        id: 'plan123',
        userId: 'user123',
        name: 'Test Plan',
        weekStartDate: new Date(),
        meals: [],
        totalEstimatedCost: 40,
        status: 'draft',
        createdAt: new Date()
      };

      await engine.processFeedbackForLearning(mockFeedback, mockPlan, 'user123');
      
      const { intelligenceLayer } = require('../../intelligence');
      expect(intelligenceLayer.processFeedback).not.toHaveBeenCalled();
    });
  });

  describe('getIntelligentRecommendations', () => {
    it('should return recommendations when AI is enabled', async () => {
      const aiEngine = new MealPlanningEngine(true);
      const mockContext = {
        request: createMockRequest(),
        availableRecipes: [],
        weekStartDate: new Date(),
        daysToplan: 7,
        mealsPerDay: ['lunch', 'dinner']
      };

      const mockRecommendations = {
        primaryRecommendations: [
          { recipeId: 'recipe1', score: 0.9, reason: 'Popular choice' }
        ],
        explanations: ['Based on your preferences']
      };

      const { smartRecommender, preferenceLearner } = require('../../intelligence');
      preferenceLearner.learnFromBehavior.mockResolvedValue({});
      smartRecommender.generateRecommendations.mockResolvedValue(mockRecommendations);

      const result = await aiEngine.getIntelligentRecommendations(mockContext);
      
      expect(result).toEqual(mockRecommendations);
    });

    it('should return empty recommendations when AI is disabled', async () => {
      const mockContext = {
        request: createMockRequest(),
        availableRecipes: [],
        weekStartDate: new Date(),
        daysToplan: 7,
        mealsPerDay: ['lunch', 'dinner']
      };

      const result = await engine.getIntelligentRecommendations(mockContext);
      
      expect(result.primaryRecommendations).toEqual([]);
      expect(result.explanations).toEqual([]);
    });
  });

  describe('AI Management', () => {
    it('should toggle AI correctly', () => {
      expect(engine.isAIEnabled()).toBe(false);
      
      engine.toggleAI(true);
      expect(engine.isAIEnabled()).toBe(true);
      
      engine.toggleAI(false);
      expect(engine.isAIEnabled()).toBe(false);
    });

    it('should return metrics when AI is enabled', async () => {
      const aiEngine = new MealPlanningEngine(true);
      
      const mockMetrics = {
        ml: { accuracy: 0.85, f1Score: 0.80 },
        recommendations: { clickThroughRate: 0.65 },
        learning: { newPatternsThisWeek: 3 },
        business: { userEngagement: 0.78 }
      };

      const { intelligenceLayer } = require('../../intelligence');
      intelligenceLayer.getIntelligenceMetrics.mockResolvedValue(mockMetrics);

      const result = await aiEngine.getAIMetrics();
      
      expect(result).toEqual(mockMetrics);
    });

    it('should return null metrics when AI is disabled', async () => {
      const result = await engine.getAIMetrics();
      expect(result).toBeNull();
    });
  });

  describe('Utility Methods', () => {
    describe('calculateInventoryMatch', () => {
      it('should calculate correct inventory match percentage', () => {
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

        // Access private method via any cast for testing
        const match = (engine as any).calculateInventoryMatch(recipe, inventory);
        expect(match).toBeCloseTo(0.67, 2); // 2/3 ingredients available
      });

      it('should return 0 for empty inventory', () => {
        const recipe = {
          ingredients_json: [{ name: 'Tomates' }]
        };

        const match = (engine as any).calculateInventoryMatch(recipe, []);
        expect(match).toBe(0);
      });
    });

    describe('calculateBudgetFit', () => {
      it('should calculate budget fit correctly', () => {
        const recipe = {
          ingredients_json: [
            { name: 'ingredient1' },
            { name: 'ingredient2' }
          ]
        };

        const budgetConstraints = {
          weeklyBudget: 70
        };

        const fit = (engine as any).calculateBudgetFit(recipe, budgetConstraints);
        expect(fit).toBeGreaterThanOrEqual(0);
        expect(fit).toBeLessThanOrEqual(1);
      });
    });

    describe('getNextMonday', () => {
      it('should return next Monday correctly', () => {
        const nextMonday = (engine as any).getNextMonday();
        expect(nextMonday.getDay()).toBe(1); // Monday = 1
        expect(nextMonday.getHours()).toBe(0);
        expect(nextMonday.getMinutes()).toBe(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      const { supabase } = require('@/integrations/supabase/client');
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            lte: jest.fn(() => ({
              lte: jest.fn(() => Promise.resolve({ 
                data: null, 
                error: new Error('Database error') 
              }))
            }))
          }))
        }))
      });

      const request = createMockRequest();
      const result = await engine.generatePlan(request);
      
      expect(result.success).toBe(false);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.[0]?.severity).toBe('error');
    });

    it('should handle constraint validation failures', async () => {
      const request = createMockRequest({
        constraints: {
          maxPrepTimePerMeal: 5, // Unrealistic constraint
          minVarietyScore: 0.95,
          maxBudgetOverrun: 0,
          requiredMealsPerWeek: 14
        }
      });
      
      const result = await engine.generatePlan(request);
      
      // Should either succeed with warnings or fail gracefully
      if (!result.success) {
        expect(result.warnings).toBeDefined();
        expect(result.warnings?.length).toBeGreaterThan(0);
      } else if (result.warnings) {
        expect(result.warnings.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Integration with Components', () => {
    it('should create valid meal entries', () => {
      const mockCandidate = {
        recipe: mockRecipes[0],
        score: 0.85,
        matchReasons: ['Good fit'],
        missingIngredients: [],
        inventoryMatch: 0.7,
        seasonalScore: 0.8,
        nutritionalFit: 0.9,
        budgetFit: 0.8
      };

      const mockContext = {
        request: createMockRequest(),
        availableRecipes: [],
        weekStartDate: new Date(),
        daysToplan: 7,
        mealsPerDay: ['lunch', 'dinner']
      };

      const entry = (engine as any).createMealEntry(
        mockCandidate, 
        1, 
        'lunch', 
        mockContext
      );

      expect(entry.id).toBeDefined();
      expect(entry.dayOfWeek).toBe(1);
      expect(entry.mealType).toBe('lunch');
      expect(entry.recipeId).toBe(mockRecipes[0].id);
      expect(entry.recipeName).toBe(mockRecipes[0].title);
      expect(entry.servings).toBe(4); // Family size from request
      expect(entry.confidence).toBe(0.85);
    });
  });

  describe('Optimization Modes', () => {
    it('should generate budget-optimized plan', async () => {
      const request = createMockRequest({
        optimizationMode: 'budget'
      });
      
      const result = await engine.generatePlan(request);
      
      expect(result.success).toBe(true);
      if (result.plan) {
        expect(result.plan.totalEstimatedCost).toBeLessThanOrEqual(
          request.preferences.budgetConstraints.weeklyBudget
        );
      }
    });

    it('should generate time-optimized plan', async () => {
      const request = createMockRequest({
        optimizationMode: 'time',
        preferences: {
          ...createMockRequest().preferences,
          timeConstraints: {
            maxPrepTime: 20,
            maxCookTime: 25,
            availableTimeSlots: []
          }
        }
      });
      
      const result = await engine.generatePlan(request);
      
      expect(result.success).toBe(true);
      if (result.plan?.meals) {
        result.plan.meals.forEach(meal => {
          expect(meal.prepTime).toBeLessThanOrEqual(20);
          expect(meal.cookTime).toBeLessThanOrEqual(25);
        });
      }
    });
  });

  describe('Plan Quality', () => {
    it('should calculate variety score correctly', () => {
      const mockPlan: WeeklyMealPlan = {
        id: 'plan123',
        userId: 'user123',
        name: 'Test Plan',
        weekStartDate: new Date(),
        meals: [
          { id: '1', recipeId: 'recipe1', dayOfWeek: 0, mealType: 'lunch' } as MealPlanEntry,
          { id: '2', recipeId: 'recipe2', dayOfWeek: 0, mealType: 'dinner' } as MealPlanEntry,
          { id: '3', recipeId: 'recipe1', dayOfWeek: 1, mealType: 'lunch' } as MealPlanEntry,
          { id: '4', recipeId: 'recipe3', dayOfWeek: 1, mealType: 'dinner' } as MealPlanEntry
        ],
        totalEstimatedCost: 40,
        status: 'draft',
        createdAt: new Date()
      };

      const varietyScore = (engine as any).calculateVarietyScore(mockPlan);
      expect(varietyScore).toBeCloseTo(0.75, 2); // 3 unique recipes out of 4 meals
    });

    it('should generate appropriate warnings', () => {
      const mockPlan: WeeklyMealPlan = {
        id: 'plan123',
        userId: 'user123',
        name: 'Test Plan',
        weekStartDate: new Date(),
        meals: [
          { id: '1', recipeId: 'recipe1', estimatedCost: 10 } as MealPlanEntry,
          { id: '2', recipeId: 'recipe1', estimatedCost: 10 } as MealPlanEntry
        ],
        totalEstimatedCost: 60, // Over budget
        status: 'draft',
        createdAt: new Date()
      };

      const mockContext = {
        request: createMockRequest(),
        availableRecipes: [],
        weekStartDate: new Date(),
        daysToplan: 7,
        mealsPerDay: ['lunch', 'dinner']
      };

      const warnings = (engine as any).generateWarnings(mockPlan, mockContext);
      
      expect(warnings).toHaveLength(2);
      expect(warnings.some((w: any) => w.type === 'budget_exceeded')).toBe(true);
      expect(warnings.some((w: any) => w.type === 'low_variety')).toBe(true);
    });
  });
});