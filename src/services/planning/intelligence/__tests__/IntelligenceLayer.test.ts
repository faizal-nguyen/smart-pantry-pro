import { IntelligenceLayer, IntelligenceUtils } from '../index';
import { PlanningContext, WeeklyMealPlan, MealPlanEntry } from '../../types';
import { LearnedPreferences, CurrentContext, CollectedFeedback, AdaptationEvent } from '../types';

// Mock all dependencies
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: mockPreferencesData, error: null })),
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: mockAnalyticsData, error: null }))
          }))
        })),
        gte: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({ data: mockAnalyticsData, error: null }))
            }))
          }))
        }))
      }))
    }))
  }
}));

// Mock intelligence components
jest.mock('../ml/PreferenceLearner', () => ({
  preferenceLearner: {
    learnFromBehavior: jest.fn(),
    getStoredPreferences: jest.fn()
  }
}));

jest.mock('../recommendation/SmartRecommender', () => ({
  smartRecommender: {
    generateRecommendations: jest.fn()
  }
}));

jest.mock('../adaptation/RealTimeAdapter', () => ({
  realTimeAdapter: {
    adaptPlan: jest.fn()
  }
}));

jest.mock('../adaptation/ContextAnalyzer', () => ({
  contextAnalyzer: {
    analyzeCurrentContext: jest.fn()
  }
}));

jest.mock('../learning/LearningLoop', () => ({
  learningLoop: {
    runLearningCycle: jest.fn(),
    getLearningStatistics: jest.fn(),
    forceLearningCycle: jest.fn()
  }
}));

jest.mock('../analyzers/NutritionalBalancer', () => ({
  nutritionalBalancer: {
    optimizeNutritionalBalance: jest.fn(),
    analyzeNutritionalBalance: jest.fn()
  }
}));

jest.mock('../analyzers/BudgetOptimizer', () => ({
  budgetOptimizer: {
    optimizeForBudget: jest.fn(),
    analyzeBudget: jest.fn()
  }
}));

jest.mock('../analyzers/InventoryAnalyzer', () => ({
  inventoryAnalyzer: {
    analyzeInventory: jest.fn(),
    optimizeForInventory: jest.fn()
  }
}));

jest.mock('../learning/FeedbackProcessor', () => ({
  FeedbackProcessor: jest.fn().mockImplementation(() => ({
    processFeedback: jest.fn()
  }))
}));

const mockPreferencesData = {
  user_id: 'user123',
  preferences_json: {
    cuisineAffinities: { italienne: 0.8, française: 0.7 },
    ingredientPreferences: {
      loved: ['tomates', 'basilic'],
      liked: ['poulet'],
      neutral: [],
      disliked: ['épinards'],
      allergens: []
    },
    confidenceScore: 0.85
  }
};

const mockAnalyticsData = [
  {
    event_type: 'recommendation_clicked',
    event_data: { recipeId: 'recipe1', score: 0.9 },
    created_at: new Date('2024-01-15')
  }
];

const createMockContext = (): PlanningContext => ({
  request: {
    userId: 'user123',
    weekStartDate: new Date('2024-01-01'),
    optimizationMode: 'balanced',
    preferences: {
      cuisinePreferences: ['italienne', 'française'],
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
    inventory: []
  },
  availableRecipes: [],
  weekStartDate: new Date('2024-01-01'),
  daysToplan: 7,
  mealsPerDay: ['lunch', 'dinner']
});

const createMockMealPlan = (): WeeklyMealPlan => ({
  id: 'plan123',
  userId: 'user123',
  name: 'Test Plan',
  weekStartDate: new Date('2024-01-01'),
  meals: [
    {
      id: 'meal1',
      userId: 'user123',
      recipeId: 'recipe1',
      recipeName: 'Pâtes carbonara',
      mealType: 'dinner',
      dayOfWeek: 0,
      servings: 4,
      estimatedCost: 12
    } as MealPlanEntry
  ],
  totalEstimatedCost: 45,
  status: 'draft',
  createdAt: new Date()
});

const createMockPreferences = (): LearnedPreferences => ({
  cuisineAffinities: { italienne: 0.8, française: 0.7 },
  ingredientPreferences: {
    loved: ['tomates', 'basilic'],
    liked: ['poulet', 'pâtes'],
    neutral: ['oignons'],
    disliked: ['épinards'],
    allergens: ['noix']
  },
  cookingHabits: {
    preferredMealTimes: ['12:00', '19:30'],
    averageCookingTime: 30,
    complexityPreference: 'medium',
    batchCookingTendency: 0.4
  },
  nutritionalTendencies: {
    averageCaloriesPerMeal: 600,
    macroDistribution: { protein: 0.3, carbs: 0.4, fat: 0.3 },
    healthScore: 0.8,
    dietaryPattern: 'balanced'
  },
  confidenceScore: 0.85
});

describe('IntelligenceLayer', () => {
  let intelligenceLayer: IntelligenceLayer;

  beforeEach(() => {
    intelligenceLayer = new IntelligenceLayer();
    jest.clearAllMocks();
    
    // Setup default mocks
    const { preferenceLearner } = require('../ml/PreferenceLearner');
    const { smartRecommender } = require('../recommendation/SmartRecommender');
    const { contextAnalyzer } = require('../adaptation/ContextAnalyzer');
    const { inventoryAnalyzer } = require('../analyzers/InventoryAnalyzer');
    const { budgetOptimizer } = require('../analyzers/BudgetOptimizer');
    const { nutritionalBalancer } = require('../analyzers/NutritionalBalancer');

    preferenceLearner.learnFromBehavior.mockResolvedValue(createMockPreferences());
    smartRecommender.generateRecommendations.mockResolvedValue({
      primaryRecommendations: [
        { recipeId: 'recipe1', score: 0.9, reasons: ['Great match'] }
      ],
      quickOptions: [],
      healthyOptions: [],
      budgetFriendly: [],
      explanations: [],
      metadata: { totalCandidates: 10 }
    });
    contextAnalyzer.analyzeCurrentContext.mockResolvedValue({
      insights: [{ type: 'weather', description: 'Cold weather detected' }],
      recommendations: []
    });
    inventoryAnalyzer.analyzeInventory.mockResolvedValue({ coverageScore: 0.8 });
    budgetOptimizer.analyzeBudget.mockResolvedValue({ riskLevel: 'low', budgetUtilization: 0.8 });
    nutritionalBalancer.optimizeNutritionalBalance.mockResolvedValue(createMockMealPlan());
  });

  describe('generateIntelligentPlan', () => {
    it('should generate intelligent plan successfully', async () => {
      const context = createMockContext();
      const currentContext: CurrentContext = {
        weather: { temperature: 15, condition: 'cold' },
        timeAvailable: 60,
        healthGoals: { active: true, targets: { calories: 2000 } },
        budgetRemaining: 40,
        inventoryStatus: 'medium',
        upcomingEvents: []
      };

      const result = await intelligenceLayer.generateIntelligentPlan(context, undefined, currentContext);

      expect(result).toBeDefined();
      expect(result.id).toBeTruthy();
      expect(result.userId).toBe('user123');
      expect(result.aiGenerated).toBe(true);
      expect(result.intelligenceVersion).toBe('2.0');
      expect(result.meals).toBeDefined();
    });

    it('should use user behavior when provided', async () => {
      const context = createMockContext();
      const userBehavior = {
        userId: 'user123',
        recentActions: [],
        cookingFrequency: 0.8,
        preferredCuisines: ['italienne'],
        avgMealComplexity: 2.5,
        feedbackHistory: [],
        mealTimings: [],
        portionPreferences: 4
      };

      const { preferenceLearner } = require('../ml/PreferenceLearner');
      
      await intelligenceLayer.generateIntelligentPlan(context, userBehavior);

      expect(preferenceLearner.learnFromBehavior).toHaveBeenCalledWith(userBehavior);
    });

    it('should coordinate all intelligence components', async () => {
      const context = createMockContext();

      await intelligenceLayer.generateIntelligentPlan(context);

      // Verify all components were called
      const { preferenceLearner } = require('../ml/PreferenceLearner');
      const { smartRecommender } = require('../recommendation/SmartRecommender');
      const { contextAnalyzer } = require('../adaptation/ContextAnalyzer');
      const { inventoryAnalyzer } = require('../analyzers/InventoryAnalyzer');
      const { budgetOptimizer } = require('../analyzers/BudgetOptimizer');
      const { nutritionalBalancer } = require('../analyzers/NutritionalBalancer');

      expect(contextAnalyzer.analyzeCurrentContext).toHaveBeenCalled();
      expect(smartRecommender.generateRecommendations).toHaveBeenCalled();
      expect(inventoryAnalyzer.analyzeInventory).toHaveBeenCalled();
      expect(budgetOptimizer.analyzeBudget).toHaveBeenCalled();
      expect(nutritionalBalancer.optimizeNutritionalBalance).toHaveBeenCalled();
    });
  });

  describe('adaptPlan', () => {
    it('should adapt plan using real-time adapter', async () => {
      const plan = createMockMealPlan();
      const event: AdaptationEvent = {
        type: 'inventory_change',
        userId: 'user123',
        data: { removedItems: ['item1'] },
        timestamp: new Date(),
        priority: 2,
        context: {}
      };
      const context = createMockContext();

      const { realTimeAdapter } = require('../adaptation/RealTimeAdapter');
      realTimeAdapter.adaptPlan.mockResolvedValue(plan);

      const result = await intelligenceLayer.adaptPlan(plan, event, context);

      expect(realTimeAdapter.adaptPlan).toHaveBeenCalledWith(plan, event, context);
      expect(result).toEqual(plan);
    });
  });

  describe('processFeedback', () => {
    it('should process feedback and trigger learning when significant', async () => {
      const feedback: CollectedFeedback = {
        planId: 'plan123',
        userId: 'user123',
        mealFeedback: [
          {
            mealId: 'meal1',
            rating: 5,
            comments: 'Perfect!',
            timestamp: new Date()
          }
        ],
        overallSatisfaction: 4.8,
        suggestions: ['More variety'],
        timestamp: new Date(),
        context: {}
      };

      const plan = createMockMealPlan();

      // Mock feedback processor to return significant improvement
      const mockFeedbackProcessor = {
        processFeedback: jest.fn().mockResolvedValue({
          confidenceImprovement: 0.15 // Significant improvement
        })
      };

      (intelligenceLayer as any).feedbackProcessor = mockFeedbackProcessor;

      const { learningLoop } = require('../learning/LearningLoop');
      learningLoop.forceLearningCycle.mockResolvedValue({});

      await intelligenceLayer.processFeedback(feedback, plan, 'user123');

      expect(mockFeedbackProcessor.processFeedback).toHaveBeenCalledWith(feedback, plan, 'user123');
      expect(learningLoop.forceLearningCycle).toHaveBeenCalledWith('Significant feedback improvement');
    });

    it('should not trigger learning for minor feedback improvements', async () => {
      const feedback: CollectedFeedback = {
        planId: 'plan123',
        userId: 'user123',
        mealFeedback: [],
        overallSatisfaction: 3.5,
        suggestions: [],
        timestamp: new Date(),
        context: {}
      };

      const plan = createMockMealPlan();

      // Mock feedback processor to return minor improvement
      const mockFeedbackProcessor = {
        processFeedback: jest.fn().mockResolvedValue({
          confidenceImprovement: 0.05 // Minor improvement
        })
      };

      (intelligenceLayer as any).feedbackProcessor = mockFeedbackProcessor;

      const { learningLoop } = require('../learning/LearningLoop');

      await intelligenceLayer.processFeedback(feedback, plan, 'user123');

      expect(mockFeedbackProcessor.processFeedback).toHaveBeenCalledWith(feedback, plan, 'user123');
      expect(learningLoop.forceLearningCycle).not.toHaveBeenCalled();
    });
  });

  describe('getIntelligenceMetrics', () => {
    it('should return comprehensive intelligence metrics', async () => {
      const { learningLoop } = require('../learning/LearningLoop');
      learningLoop.getLearningStatistics.mockResolvedValue({
        patternsDiscovered: 15,
        totalCycles: 50,
        lastLearningCycle: new Date()
      });

      const metrics = await intelligenceLayer.getIntelligenceMetrics();

      expect(metrics.ml).toBeDefined();
      expect(metrics.recommendations).toBeDefined();
      expect(metrics.learning).toBeDefined();
      expect(metrics.business).toBeDefined();

      expect(metrics.ml.accuracy).toBeGreaterThan(0);
      expect(metrics.ml.f1Score).toBeGreaterThan(0);
      expect(metrics.recommendations.clickThroughRate).toBeGreaterThan(0);
      expect(metrics.learning.newPatternsThisWeek).toBeGreaterThanOrEqual(0);
      expect(metrics.business.userEngagement).toBeGreaterThan(0);
    });

    it('should handle errors and return default metrics', async () => {
      const { learningLoop } = require('../learning/LearningLoop');
      learningLoop.getLearningStatistics.mockRejectedValue(new Error('Stats error'));

      const metrics = await intelligenceLayer.getIntelligenceMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.ml.accuracy).toBe(0.75); // Default value
    });
  });

  describe('Plan Creation Process', () => {
    it('should create optimized plan from recommendations', async () => {
      const context = createMockContext();
      const preferences = createMockPreferences();
      const recommendations = {
        primaryRecommendations: [
          {
            recipeId: 'recipe1',
            recipeName: 'Pâtes carbonara',
            score: 0.9,
            prepTime: 20,
            estimatedCost: 8,
            reasons: ['Perfect match']
          }
        ],
        quickOptions: [],
        healthyOptions: [],
        budgetFriendly: [],
        explanations: [],
        metadata: { totalCandidates: 5 }
      };

      const plan = (intelligenceLayer as any).createBasePlanFromRecommendations(
        context,
        recommendations,
        preferences
      );

      expect(plan.meals.length).toBe(14); // 7 days * 2 meals
      expect(plan.aiGenerated).toBe(true);
      expect(plan.intelligenceVersion).toBe('2.0');
    });

    it('should apply contextual insights to plans', () => {
      const plan = createMockMealPlan();
      const insights = [
        { type: 'weather', description: 'Cold weather detected', priority: 1 }
      ];
      const recommendations = [
        {
          type: 'weather_adaptation',
          priority: 1,
          description: 'Add warming spices'
        }
      ];

      const contextualPlan = (intelligenceLayer as any).applyContextualInsights(
        plan,
        insights,
        recommendations
      );

      expect(contextualPlan).toBeDefined();
      expect(contextualPlan.id).toBe(plan.id);
    });
  });

  describe('Recommendation Selection', () => {
    it('should select best recommendations based on context', () => {
      const recommendations = {
        primaryRecommendations: [
          { recipeId: 'recipe1', score: 0.9, prepTime: 30 },
          { recipeId: 'recipe2', score: 0.8, prepTime: 45 }
        ],
        quickOptions: [
          { recipeId: 'recipe3', score: 0.7, prepTime: 15 }
        ],
        healthyOptions: [
          { recipeId: 'recipe4', score: 0.85, prepTime: 25 }
        ],
        budgetFriendly: [],
        explanations: [],
        metadata: { totalCandidates: 4 }
      };

      const preferences = createMockPreferences();

      // Test quick meal selection for weekday lunch
      const quickSelection = (intelligenceLayer as any).selectBestRecommendation(
        recommendations,
        'lunch',
        1, // Monday
        preferences
      );

      expect(quickSelection.prepTime).toBeLessThanOrEqual(30);

      // Test health-conscious selection
      preferences.nutritionalTendencies.healthScore = 0.9;
      const healthySelection = (intelligenceLayer as any).selectBestRecommendation(
        recommendations,
        'dinner',
        0, // Sunday
        preferences
      );

      expect(healthySelection).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle component failures gracefully', async () => {
      const context = createMockContext();

      // Mock component failure
      const { contextAnalyzer } = require('../adaptation/ContextAnalyzer');
      contextAnalyzer.analyzeCurrentContext.mockRejectedValue(new Error('Context analysis failed'));

      await expect(intelligenceLayer.generateIntelligentPlan(context)).rejects.toThrow();
    });

    it('should handle missing preferences data', async () => {
      const { supabase } = require('@/integrations/supabase/client');
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      });

      const preferences = await (intelligenceLayer as any).getStoredPreferences('user123');

      expect(preferences).toBeDefined();
      expect(preferences.confidenceScore).toBeLessThan(0.6); // Default low confidence
    });
  });
});

describe('IntelligenceUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup analyzer mocks
    const { nutritionalBalancer } = require('../analyzers/NutritionalBalancer');
    const { budgetOptimizer } = require('../analyzers/BudgetOptimizer');
    const { inventoryAnalyzer } = require('../analyzers/InventoryAnalyzer');

    nutritionalBalancer.analyzeNutritionalBalance.mockResolvedValue({
      balanceScore: 0.85,
      recommendations: [
        { description: 'Add more vegetables', priority: 1 }
      ]
    });

    budgetOptimizer.analyzeBudget.mockResolvedValue({
      budgetUtilization: 0.75,
      optimizations: [
        { description: 'Use seasonal ingredients', priority: 1 }
      ]
    });

    inventoryAnalyzer.analyzeInventory.mockResolvedValue({
      coverageScore: 0.9,
      optimizations: [
        { description: 'Use expiring items first', priority: 1 }
      ]
    });
  });

  describe('evaluatePlanQuality', () => {
    it('should evaluate plan quality comprehensively', async () => {
      const plan = createMockMealPlan();
      const preferences = createMockPreferences();
      const context: CurrentContext = {
        weather: { temperature: 20 },
        timeAvailable: 60,
        healthGoals: { active: true, targets: {} },
        budgetRemaining: 40,
        inventoryStatus: 'good',
        upcomingEvents: []
      };

      const evaluation = await IntelligenceUtils.evaluatePlanQuality(plan, preferences, context);

      expect(evaluation.overallScore).toBeGreaterThan(0);
      expect(evaluation.overallScore).toBeLessThanOrEqual(1);
      expect(evaluation.nutritionScore).toBeGreaterThanOrEqual(0);
      expect(evaluation.budgetScore).toBeGreaterThanOrEqual(0);
      expect(evaluation.preferenceScore).toBeGreaterThanOrEqual(0);
      expect(evaluation.inventoryScore).toBeGreaterThanOrEqual(0);
      expect(evaluation.suggestions).toBeDefined();
      expect(evaluation.suggestions.length).toBeGreaterThan(0);
    });

    it('should provide actionable suggestions', async () => {
      const plan = createMockMealPlan();
      const preferences = createMockPreferences();

      const evaluation = await IntelligenceUtils.evaluatePlanQuality(plan, preferences);

      expect(evaluation.suggestions.length).toBeGreaterThan(0);
      
      evaluation.suggestions.forEach(suggestion => {
        expect(suggestion).toBeTruthy();
        expect(suggestion.length).toBeGreaterThan(10); // Meaningful suggestions
      });
    });
  });

  describe('generateMealAdvice', () => {
    it('should generate relevant meal advice', async () => {
      const meal: MealPlanEntry = {
        id: 'meal1',
        userId: 'user123',
        recipeId: 'recipe1',
        recipeName: 'Pâtes carbonara',
        mealType: 'dinner',
        dayOfWeek: 0,
        servings: 4,
        estimatedCost: 12,
        prepTime: 30
      };

      const preferences = createMockPreferences();
      const inventory = [
        {
          name: 'tomates',
          expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // Expires in 2 days
        }
      ];
      const weather = { temperature: 8, condition: 'cold' };

      const advice = await IntelligenceUtils.generateMealAdvice(
        meal,
        preferences,
        inventory,
        weather
      );

      expect(Array.isArray(advice)).toBe(true);
      expect(advice.length).toBeGreaterThan(0);
      expect(advice.length).toBeLessThanOrEqual(3); // Max 3 advice items

      advice.forEach(adviceItem => {
        expect(adviceItem).toBeTruthy();
        expect(adviceItem.length).toBeGreaterThan(5);
      });
    });

    it('should provide expiry warnings', async () => {
      const meal: MealPlanEntry = {
        id: 'meal1',
        userId: 'user123',
        recipeId: 'recipe1',
        recipeName: 'Salade de tomates',
        mealType: 'lunch',
        dayOfWeek: 1,
        servings: 4,
        estimatedCost: 8
      };

      const preferences = createMockPreferences();
      const expiringInventory = [
        {
          name: 'tomates',
          expiryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) // Expires tomorrow
        }
      ];

      const advice = await IntelligenceUtils.generateMealAdvice(
        meal,
        preferences,
        expiringInventory
      );

      const hasExpiryAdvice = advice.some(item => item.includes('expire'));
      expect(hasExpiryAdvice).toBeTruthy();
    });

    it('should provide weather-appropriate advice', async () => {
      const meal: MealPlanEntry = {
        id: 'meal1',
        userId: 'user123',
        recipeId: 'recipe1',
        recipeName: 'Soupe de légumes',
        mealType: 'dinner',
        dayOfWeek: 0,
        servings: 4,
        estimatedCost: 10
      };

      const preferences = createMockPreferences();

      // Cold weather
      const coldAdvice = await IntelligenceUtils.generateMealAdvice(
        meal,
        preferences,
        [],
        { temperature: 2, condition: 'cold' }
      );

      const hasColdWeatherAdvice = coldAdvice.some(item => 
        item.includes('froid') || item.includes('réconfortant')
      );
      expect(hasColdWeatherAdvice).toBeTruthy();

      // Hot weather
      const hotAdvice = await IntelligenceUtils.generateMealAdvice(
        meal,
        preferences,
        [],
        { temperature: 32, condition: 'hot' }
      );

      const hasHotWeatherAdvice = hotAdvice.some(item => 
        item.includes('chaud') || item.includes('frais')
      );
      expect(hasHotWeatherAdvice).toBeTruthy();
    });

    it('should provide time-saving tips for complex meals', async () => {
      const complexMeal: MealPlanEntry = {
        id: 'meal1',
        userId: 'user123',
        recipeId: 'recipe1',
        recipeName: 'Coq au vin',
        mealType: 'dinner',
        dayOfWeek: 0,
        servings: 4,
        estimatedCost: 15,
        prepTime: 60 // Long prep time
      };

      const timeConstrainedPreferences = {
        ...createMockPreferences(),
        cookingHabits: {
          ...createMockPreferences().cookingHabits,
          complexityPreference: 'simple' as const
        }
      };

      const advice = await IntelligenceUtils.generateMealAdvice(
        complexMeal,
        timeConstrainedPreferences
      );

      const hasTimeSavingTip = advice.some(item => 
        item.includes('temps') || item.includes('avance')
      );
      expect(hasTimeSavingTip).toBeTruthy();
    });
  });

  describe('Integration Testing', () => {
    it('should work end-to-end for complete intelligence workflow', async () => {
      const context = createMockContext();
      const userBehavior = {
        userId: 'user123',
        recentActions: [
          {
            type: 'meal_completed',
            data: { rating: 4.5, recipeId: 'recipe1' },
            timestamp: new Date()
          }
        ],
        cookingFrequency: 0.8,
        preferredCuisines: ['italienne'],
        avgMealComplexity: 2.5,
        feedbackHistory: [],
        mealTimings: [],
        portionPreferences: 4
      };

      // Generate plan
      const plan = await intelligenceLayer.generateIntelligentPlan(context, userBehavior);
      
      // Evaluate plan quality
      const evaluation = await IntelligenceUtils.evaluatePlanQuality(
        plan,
        createMockPreferences()
      );

      // Process feedback
      const feedback: CollectedFeedback = {
        planId: plan.id,
        userId: 'user123',
        mealFeedback: [
          {
            mealId: plan.meals[0]?.id || 'meal1',
            rating: 4.5,
            comments: 'Great!',
            timestamp: new Date()
          }
        ],
        overallSatisfaction: 4.5,
        suggestions: [],
        timestamp: new Date(),
        context: {}
      };

      await intelligenceLayer.processFeedback(feedback, plan, 'user123');

      // Get metrics
      const metrics = await intelligenceLayer.getIntelligenceMetrics();

      expect(plan).toBeDefined();
      expect(evaluation.overallScore).toBeGreaterThan(0);
      expect(metrics).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should complete intelligent plan generation within time limit', async () => {
      const context = createMockContext();
      
      const startTime = Date.now();
      await intelligenceLayer.generateIntelligentPlan(context);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Less than 5 seconds
    });

    it('should handle concurrent requests efficiently', async () => {
      const context = createMockContext();
      
      // Generate multiple plans concurrently
      const promises = Array.from({ length: 5 }, () => 
        intelligenceLayer.generateIntelligentPlan({
          ...context,
          request: {
            ...context.request,
            userId: `user${Math.random()}`
          }
        })
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results.length).toBe(5);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
      expect(endTime - startTime).toBeLessThan(10000); // Less than 10 seconds for 5 plans
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across components', async () => {
      const context = createMockContext();
      
      const plan = await intelligenceLayer.generateIntelligentPlan(context);

      // Verify plan structure consistency
      expect(plan.userId).toBe(context.request.userId);
      expect(plan.meals.every(meal => meal.userId === context.request.userId)).toBe(true);
      
      // Verify cost consistency
      const calculatedTotal = plan.meals.reduce(
        (sum, meal) => sum + (meal.estimatedCost || 0), 
        0
      );
      expect(Math.abs(plan.totalEstimatedCost - calculatedTotal)).toBeLessThan(1);
    });
  });
});