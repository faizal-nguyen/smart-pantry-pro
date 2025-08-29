import { PreferenceLearner } from '../ml/PreferenceLearner';
import { UserBehaviorData, LearnedPreferences } from '../types';

// Mock Supabase
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: mockBehaviorData, error: null }))
          })),
          single: jest.fn(() => Promise.resolve({ data: mockStoredPreferences, error: null }))
        })),
        insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
        upsert: jest.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  }
}));

const mockBehaviorData = [
  {
    user_id: 'user123',
    event_type: 'meal_completed',
    event_data: {
      mealId: 'meal1',
      rating: 4.5,
      recipeId: 'recipe1',
      cuisine: 'italienne',
      complexity: 2,
      prepTime: 20
    },
    created_at: new Date('2024-01-15T18:00:00Z')
  },
  {
    user_id: 'user123',
    event_type: 'recipe_liked',
    event_data: {
      recipeId: 'recipe2',
      cuisine: 'française',
      ingredients: ['poulet', 'tomates'],
      rating: 5
    },
    created_at: new Date('2024-01-14T12:00:00Z')
  }
];

const mockStoredPreferences = {
  user_id: 'user123',
  preferences_json: {
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
      averageCookingTime: 35,
      complexityPreference: 'medium',
      batchCookingTendency: 0.4
    },
    nutritionalTendencies: {
      averageCaloriesPerMeal: 580,
      macroDistribution: { protein: 0.25, carbs: 0.45, fat: 0.30 },
      healthScore: 0.75,
      dietaryPattern: 'balanced'
    },
    confidenceScore: 0.82
  }
};

const createMockUserBehavior = (): UserBehaviorData => ({
  recipesLiked: ['recipe1', 'recipe2'],
  recipesDisliked: ['recipe3'],
  recipesCooked: ['recipe1', 'recipe2', 'recipe4'],
  recipesSkipped: ['recipe5'],
  viewDuration: { 'recipe1': 120, 'recipe2': 85 },
  searchQueries: ['pasta', 'chicken', 'quick meals'],
  filterUsage: [
    {
      filters: ['italian', 'quick'],
      frequency: 5,
      context: 'weekday_lunch',
      timestamp: new Date('2024-01-15T12:00:00Z')
    }
  ],
  cookingTimes: [
    {
      dayOfWeek: 1,
      mealType: 'lunch',
      averagePrepTime: 20,
      complexity: 'simple'
    },
    {
      dayOfWeek: 0,
      mealType: 'dinner',
      averagePrepTime: 45,
      complexity: 'medium'
    }
  ],
  shoppingPatterns: [
    {
      frequency: 'weekly',
      averageSpend: 60,
      preferredStores: ['SuperMarché', 'BioCoop'],
      peakShoppingDays: [6, 0]
    }
  ],
  seasonalPreferences: [
    {
      season: 'winter',
      preferredIngredients: ['root vegetables', 'warming spices'],
      avoidedIngredients: ['cold salads'],
      mealTemperaturePreference: 'hot'
    }
  ]
});

describe('PreferenceLearner', () => {
  let learner: PreferenceLearner;

  beforeEach(() => {
    learner = new PreferenceLearner();
    jest.clearAllMocks();
  });

  describe('learnFromBehavior', () => {
    it('should learn preferences from user behavior successfully', async () => {
      const userBehavior = createMockUserBehavior();
      
      const result = await learner.learnFromBehavior(userBehavior);
      
      expect(result.cuisineAffinities).toBeDefined();
      expect(result.ingredientPreferences).toBeDefined();
      expect(result.cookingHabits).toBeDefined();
      expect(result.nutritionalTendencies).toBeDefined();
      expect(result.confidenceScore).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);
    });

    it('should calculate cuisine affinities correctly', async () => {
      const userBehavior = createMockUserBehavior();
      
      const result = await learner.learnFromBehavior(userBehavior);
      
      expect(result.cuisineAffinities.italienne).toBeGreaterThan(0);
      expect(result.cuisineAffinities.française).toBeGreaterThan(0);
    });

    it('should extract cooking habits from behavior patterns', async () => {
      const userBehavior = createMockUserBehavior();
      
      const result = await learner.learnFromBehavior(userBehavior);
      
      expect(result.cookingHabits.averageCookingTime).toBeGreaterThan(0);
      expect(result.cookingHabits.complexityPreference).toMatch(/simple|medium|complex/);
      expect(result.cookingHabits.batchCookingTendency).toBeGreaterThanOrEqual(0);
      expect(result.cookingHabits.batchCookingTendency).toBeLessThanOrEqual(1);
    });

    it('should handle empty behavior gracefully', async () => {
      const emptyBehavior: UserBehaviorData = {
        recipesLiked: [],
        recipesDisliked: [],
        recipesCooked: [],
        recipesSkipped: [],
        viewDuration: {},
        searchQueries: [],
        filterUsage: [],
        cookingTimes: [],
        shoppingPatterns: [],
        seasonalPreferences: []
      };
      
      const result = await learner.learnFromBehavior(emptyBehavior);
      
      expect(result).toBeDefined();
      expect(result.confidenceScore).toBeLessThan(0.3); // Low confidence for empty data
    });
  });

  describe('updatePreferences', () => {
    it('should update stored preferences with new learning', async () => {
      const userId = 'user123';
      const newPreferences: LearnedPreferences = {
        cuisineAffinities: { italienne: 0.9, française: 0.6 },
        ingredientPreferences: {
          loved: ['basilic'],
          liked: ['tomates'],
          neutral: [],
          disliked: ['épinards'],
          allergens: []
        },
        cookingHabits: {
          preferredMealTimes: [
            { dayOfWeek: 1, mealType: 'lunch', averagePrepTime: 20, complexity: 'simple' },
            { dayOfWeek: 0, mealType: 'dinner', averagePrepTime: 30, complexity: 'medium' }
          ],
          averageCookingTime: 30,
          complexityPreference: 'medium',
          batchCookingTendency: 0.5
        },
        nutritionalTendencies: {
          averageCaloriesPerMeal: 600,
          macroDistribution: { protein: 0.3, carbs: 0.4, fat: 0.3 },
          healthScore: 0.8,
          dietaryPattern: 'balanced'
        },
        confidenceScore: 0.85
      };

      // Mock the updatePreferences method for testing
      jest.spyOn(learner as any, 'updatePreferences').mockResolvedValue(undefined);
      await (learner as any).updatePreferences(userId, newPreferences);

      const { supabase } = require('@/integrations/supabase/client');
      expect(supabase.from).toHaveBeenCalledWith('user_meal_preferences');
      expect(supabase.from().upsert).toHaveBeenCalled();
    });
  });

  describe('getStoredPreferences', () => {
    it('should retrieve stored preferences successfully', async () => {
      const result = await (learner as any).getStoredPreferences('user123');
      
      expect(result).toBeDefined();
      expect(result.cuisineAffinities).toBeDefined();
      expect(result.ingredientPreferences).toBeDefined();
      expect(result.cookingHabits).toBeDefined();
      expect(result.nutritionalTendencies).toBeDefined();
    });

    it('should return default preferences when none stored', async () => {
      const { supabase } = require('@/integrations/supabase/client');
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      });

      const result = await (learner as any).getStoredPreferences('user456');
      
      expect(result).toBeDefined();
      expect(result.confidenceScore).toBeLessThan(0.3); // Default low confidence
    });
  });

  describe('Feature Extraction', () => {
    it('should extract features from user actions correctly', () => {
      const userBehavior = createMockUserBehavior();
      
      const features = (learner as any).extractFeatures(userBehavior);
      
      expect(features.cuisineFrequency).toBeDefined();
      expect(features.avgRating).toBeGreaterThan(0);
      expect(features.avgComplexity).toBeGreaterThan(0);
      expect(features.cookingPatterns).toBeDefined();
    });

    it('should calculate cuisine affinities from patterns', () => {
      const features = {
        cuisineFrequency: { italienne: 5, française: 3, asiatique: 1 },
        avgRating: 4.2,
        avgComplexity: 2.5,
        cookingPatterns: { weekday: 0.6, weekend: 0.4 }
      };
      
      const affinities = (learner as any).calculateCuisineAffinities(features);
      
      expect(affinities.italienne).toBeGreaterThan(affinities.française);
      expect(affinities.française).toBeGreaterThan(affinities.asiatique);
      expect(Object.values(affinities).every((score: any) => score >= 0 && score <= 1)).toBe(true);
    });
  });

  describe('Preference Evolution', () => {
    it('should evolve preferences with new data', () => {
      const existing: LearnedPreferences = {
        cuisineAffinities: { italienne: 0.7, française: 0.5 },
        ingredientPreferences: {
          loved: ['tomates'],
          liked: ['basilic'],
          neutral: [],
          disliked: [],
          allergens: []
        },
        cookingHabits: {
          preferredMealTimes: ['12:00'],
          averageCookingTime: 30,
          complexityPreference: 'medium',
          batchCookingTendency: 0.3
        },
        nutritionalTendencies: {
          averageCaloriesPerMeal: 550,
          macroDistribution: { protein: 0.2, carbs: 0.5, fat: 0.3 },
          healthScore: 0.7,
          dietaryPattern: 'balanced'
        },
        confidenceScore: 0.6
      };

      const newData = {
        cuisineAffinities: { italienne: 0.9, française: 0.6, asiatique: 0.4 },
        avgComplexity: 3,
        avgCookingTime: 25
      };

      const evolved = (learner as any).evolvePreferences(existing, newData);
      
      expect(evolved.cuisineAffinities.italienne).toBeGreaterThan(0.7);
      expect(evolved.cuisineAffinities.asiatique).toBeGreaterThan(0);
      expect(evolved.confidenceScore).toBeGreaterThan(0.6);
    });
  });

  describe('ML Algorithm Simulation', () => {
    it('should simulate pattern detection correctly', () => {
      const userBehavior = createMockUserBehavior();
      
      const patterns = (learner as any).detectPatterns(userBehavior);
      
      expect(patterns.cuisinePreferences).toBeDefined();
      expect(patterns.timePatterns).toBeDefined();
      expect(patterns.complexityTrends).toBeDefined();
      expect(patterns.seasonalBias).toBeDefined();
    });

    it('should calculate prediction accuracy', () => {
      const mockData = [
        { predicted: 0.8, actual: 0.9 },
        { predicted: 0.6, actual: 0.7 },
        { predicted: 0.9, actual: 0.8 }
      ];
      
      const accuracy = (learner as any).calculateAccuracy(mockData);
      
      expect(accuracy).toBeGreaterThan(0);
      expect(accuracy).toBeLessThanOrEqual(1);
    });
  });

  describe('Integration with Database', () => {
    it('should load behavior data within date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      const data = await (learner as any).loadBehaviorData('user123', startDate, endDate);
      
      expect(Array.isArray(data)).toBe(true);
      
      const { supabase } = require('@/integrations/supabase/client');
      expect(supabase.from).toHaveBeenCalledWith('meal_planning_analytics');
    });

    it('should handle database errors gracefully', async () => {
      const { supabase } = require('@/integrations/supabase/client');
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({ 
                data: null, 
                error: new Error('Database error') 
              }))
            }))
          }))
        }))
      });

      const userBehavior = createMockUserBehavior();
      
      const result = await learner.learnFromBehavior(userBehavior);
      
      expect(result).toBeDefined();
      expect(result.confidenceScore).toBeLessThan(0.5); // Low confidence on error
    });
  });

  describe('Preference Validation', () => {
    it('should validate preference structure', () => {
      const validPreferences: LearnedPreferences = {
        cuisineAffinities: { italienne: 0.8 },
        ingredientPreferences: {
          loved: ['tomates'],
          liked: ['basilic'],
          neutral: [],
          disliked: [],
          allergens: []
        },
        cookingHabits: {
          preferredMealTimes: ['12:00'],
          averageCookingTime: 30,
          complexityPreference: 'medium',
          batchCookingTendency: 0.3
        },
        nutritionalTendencies: {
          averageCaloriesPerMeal: 600,
          macroDistribution: { protein: 0.3, carbs: 0.4, fat: 0.3 },
          healthScore: 0.8,
          dietaryPattern: 'balanced'
        },
        confidenceScore: 0.85
      };

      const isValid = (learner as any).validatePreferences(validPreferences);
      expect(isValid).toBe(true);
    });

    it('should reject invalid preference structure', () => {
      const invalidPreferences = {
        cuisineAffinities: { italienne: 1.5 }, // Invalid score > 1
        ingredientPreferences: null,
        confidenceScore: -0.1 // Invalid negative score
      };

      const isValid = (learner as any).validatePreferences(invalidPreferences);
      expect(isValid).toBe(false);
    });
  });

  describe('Learning Statistics', () => {
    it('should provide learning statistics', async () => {
      const stats = await learner.getLearningStatistics();
      
      expect(stats.totalUsers).toBeGreaterThanOrEqual(0);
      expect(stats.avgConfidenceScore).toBeGreaterThanOrEqual(0);
      expect(stats.avgConfidenceScore).toBeLessThanOrEqual(1);
      expect(stats.patternsDiscovered).toBeGreaterThanOrEqual(0);
      expect(stats.totalCycles).toBeGreaterThanOrEqual(0);
      expect(stats.lastLearningCycle).toBeInstanceOf(Date);
    });
  });

  describe('Confidence Scoring', () => {
    it('should calculate confidence based on data quality', () => {
      const highQualityData = {
        userId: 'user123',
        recentActions: new Array(50).fill({}).map((_, i) => ({
          type: 'meal_completed',
          data: { rating: 4 + Math.random() },
          timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        })),
        cookingFrequency: 0.9,
        preferredCuisines: ['italienne', 'française'],
        avgMealComplexity: 2.5,
        feedbackHistory: [],
        mealTimings: [],
        portionPreferences: 4
      };

      const confidence = (learner as any).calculateConfidenceScore(highQualityData);
      expect(confidence).toBeGreaterThan(0.7); // High confidence for rich data
    });

    it('should give low confidence for sparse data', () => {
      const sparseData = {
        userId: 'user123',
        recentActions: [
          {
            type: 'meal_completed',
            data: { rating: 3 },
            timestamp: new Date()
          }
        ],
        cookingFrequency: 0.1,
        preferredCuisines: [],
        avgMealComplexity: 0,
        feedbackHistory: [],
        mealTimings: [],
        portionPreferences: 4
      };

      const confidence = (learner as any).calculateConfidenceScore(sparseData);
      expect(confidence).toBeLessThan(0.4); // Low confidence for sparse data
    });
  });

  describe('Ingredient Preference Learning', () => {
    it('should categorize ingredients from feedback', () => {
      const feedbackHistory = [
        { mealId: 'meal1', rating: 5, ingredients: ['tomates', 'basilic'], timestamp: new Date() },
        { mealId: 'meal2', rating: 2, ingredients: ['épinards'], timestamp: new Date() },
        { mealId: 'meal3', rating: 4, ingredients: ['poulet', 'tomates'], timestamp: new Date() }
      ];

      const preferences = (learner as any).analyzeIngredientPreferences(feedbackHistory);
      
      expect(preferences.loved).toContain('tomates');
      expect(preferences.liked).toContain('basilic');
      expect(preferences.disliked).toContain('épinards');
    });
  });

  describe('Temporal Pattern Analysis', () => {
    it('should detect meal timing patterns', () => {
      const mealTimings = [
        { mealType: 'lunch', preferredTime: '12:00' },
        { mealType: 'lunch', preferredTime: '12:30' },
        { mealType: 'dinner', preferredTime: '19:00' },
        { mealType: 'dinner', preferredTime: '19:30' }
      ];

      const patterns = (learner as any).analyzeMealTimingPatterns(mealTimings);
      
      expect(patterns.lunch).toMatch(/12:\d{2}/);
      expect(patterns.dinner).toMatch(/19:\d{2}/);
      expect(patterns.consistency).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted preference data', async () => {
      const { supabase } = require('@/integrations/supabase/client');
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: { preferences_json: 'invalid_json' }, 
              error: null 
            }))
          }))
        }))
      });

      const result = await learner.getStoredPreferences('user123');
      
      expect(result).toBeDefined();
      expect(result.confidenceScore).toBeLessThan(0.3); // Low confidence for corrupted data
    });

    it('should handle learning from invalid behavior data', async () => {
      const invalidBehavior = null as any;
      
      await expect(() => learner.learnFromBehavior(invalidBehavior)).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should complete learning within reasonable time', async () => {
      const userBehavior = createMockUserBehavior();
      
      const startTime = Date.now();
      await learner.learnFromBehavior(userBehavior);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Less than 5 seconds
    });

    it('should handle large behavior datasets efficiently', async () => {
      const largeBehaviorData: UserBehaviorData = {
        recipesLiked: new Array(200).fill('').map((_, i) => `recipe${i}`),
        recipesDisliked: new Array(50).fill('').map((_, i) => `recipe${i + 200}`),
        recipesCooked: new Array(500).fill('').map((_, i) => `recipe${i % 150}`),
        recipesSkipped: new Array(30).fill('').map((_, i) => `recipe${i + 250}`),
        viewDuration: Object.fromEntries(
          new Array(300).fill('').map((_, i) => [`recipe${i}`, Math.random() * 200])
        ),
        searchQueries: new Array(100).fill('').map((_, i) => `query${i}`),
        filterUsage: new Array(50).fill({}).map((_, i) => ({
          filters: [`filter${i}`, `category${i % 10}`],
          frequency: Math.floor(Math.random() * 10),
          context: `context${i % 5}`,
          timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        })),
        cookingTimes: new Array(100).fill({}).map((_, i) => ({
          dayOfWeek: i % 7,
          mealType: i % 2 === 0 ? 'lunch' : 'dinner',
          averagePrepTime: 15 + Math.random() * 60,
          complexity: ['simple', 'medium', 'complex'][i % 3] as 'simple' | 'medium' | 'complex'
        })),
        shoppingPatterns: [
          {
            frequency: 'weekly',
            averageSpend: 65,
            preferredStores: ['Store1', 'Store2'],
            peakShoppingDays: [0, 6]
          }
        ],
        seasonalPreferences: [
          {
            season: 'winter',
            preferredIngredients: ['warming spices'],
            avoidedIngredients: ['cold items'],
            mealTemperaturePreference: 'hot'
          }
        ]
      };

      const startTime = Date.now();
      const result = await learner.learnFromBehavior(largeBehaviorData);
      const endTime = Date.now();
      
      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(10000); // Less than 10 seconds for large dataset
    });
  });

  describe('Preference Stability', () => {
    it('should maintain preference stability with consistent behavior', async () => {
      const consistentBehavior = createMockUserBehavior();
      
      const firstLearning = await learner.learnFromBehavior(consistentBehavior);
      const secondLearning = await learner.learnFromBehavior(consistentBehavior);
      
      // Preferences should be similar for consistent behavior
      expect(Math.abs(firstLearning.confidenceScore - secondLearning.confidenceScore)).toBeLessThan(0.1);
    });

    it('should adapt preferences when behavior changes significantly', async () => {
      const oldBehavior = createMockUserBehavior();
      const newBehavior = {
        ...oldBehavior,
        preferredCuisines: ['asiatique'], // Changed preference
        avgMealComplexity: 1 // Simpler meals
      };

      const oldPreferences = await learner.learnFromBehavior(oldBehavior);
      const newPreferences = await learner.learnFromBehavior(newBehavior);
      
      expect(newPreferences.cuisineAffinities.asiatique).toBeGreaterThan(
        oldPreferences.cuisineAffinities.asiatique || 0
      );
    });
  });
});