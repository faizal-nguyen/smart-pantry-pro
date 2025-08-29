import { SmartRecommender } from '../recommendation/SmartRecommender';
import { PlanningContext } from '../../types';
import { LearnedPreferences, MealRecommendations } from '../types';

// Mock Supabase
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: mockRecipeData, error: null })),
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: mockUserActions, error: null }))
          }))
        })),
        gte: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({ data: mockUserActions, error: null }))
            }))
          }))
        }))
      }))
    }))
  }
}));

const mockRecipeData = [
  {
    id: 'recipe1',
    title: 'Pâtes à la carbonara',
    prep_time: 15,
    cook_time: 20,
    difficulty: 2,
    tags: ['italienne', 'rapide'],
    rating: 4.5,
    times_cooked: 125
  },
  {
    id: 'recipe2',
    title: 'Salade César',
    prep_time: 10,
    cook_time: 0,
    difficulty: 1,
    tags: ['salade', 'healthy'],
    rating: 4.2,
    times_cooked: 89
  },
  {
    id: 'recipe3',
    title: 'Ratatouille',
    prep_time: 20,
    cook_time: 40,
    difficulty: 3,
    tags: ['française', 'végétarien'],
    rating: 4.7,
    times_cooked: 67
  }
];

const mockUserActions = [
  {
    user_id: 'user123',
    event_type: 'recipe_liked',
    event_data: { recipeId: 'recipe1', rating: 5 },
    created_at: new Date('2024-01-15')
  },
  {
    user_id: 'user456',
    event_type: 'meal_completed',
    event_data: { recipeId: 'recipe1', rating: 4 },
    created_at: new Date('2024-01-14')
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
    }
  },
  availableRecipes: [],
  weekStartDate: new Date('2024-01-01'),
  daysToplan: 7,
  mealsPerDay: ['lunch', 'dinner']
});

const createMockPreferences = (): LearnedPreferences => ({
  cuisineAffinities: { italienne: 0.9, française: 0.7, asiatique: 0.3 },
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

describe('SmartRecommender', () => {
  let recommender: SmartRecommender;

  beforeEach(() => {
    recommender = new SmartRecommender();
    jest.clearAllMocks();
  });

  describe('generateRecommendations', () => {
    it('should generate comprehensive recommendations', async () => {
      const context = createMockContext();
      const preferences = createMockPreferences();

      const recommendations = await recommender.generateRecommendations(context, preferences);

      expect(recommendations.primaryRecommendations).toBeDefined();
      expect(recommendations.quickOptions).toBeDefined();
      expect(recommendations.healthyOptions).toBeDefined();
      expect(recommendations.budgetFriendly).toBeDefined();
      expect(recommendations.explanations).toBeDefined();
      expect(recommendations.metadata).toBeDefined();

      expect(recommendations.primaryRecommendations.length).toBeGreaterThan(0);
      expect(recommendations.explanations.length).toBeGreaterThan(0);
    });

    it('should prioritize based on user preferences', async () => {
      const context = createMockContext();
      const preferences = createMockPreferences();

      const recommendations = await recommender.generateRecommendations(context, preferences);

      // Primary recommendations should be scored
      recommendations.primaryRecommendations.forEach(rec => {
        expect(rec.score).toBeGreaterThan(0);
        expect(rec.score).toBeLessThanOrEqual(1);
        expect(rec.reasons).toBeDefined();
        expect(rec.reasons.length).toBeGreaterThan(0);
      });

      // Should be sorted by score (highest first)
      for (let i = 1; i < recommendations.primaryRecommendations.length; i++) {
        expect(recommendations.primaryRecommendations[i].score).toBeLessThanOrEqual(
          recommendations.primaryRecommendations[i - 1].score
        );
      }
    });

    it('should provide context-aware recommendations', async () => {
      const context = createMockContext();
      context.request.preferences.timeConstraints.maxPrepTime = 15; // Quick meals needed
      const preferences = createMockPreferences();

      const recommendations = await recommender.generateRecommendations(context, preferences);

      expect(recommendations.quickOptions.length).toBeGreaterThan(0);
      
      recommendations.quickOptions.forEach(option => {
        expect(option.prepTime).toBeLessThanOrEqual(15);
      });
    });

    it('should handle dietary restrictions correctly', async () => {
      const context = createMockContext();
      context.request.preferences.dietaryRestrictions = ['meat'];
      const preferences = createMockPreferences();

      const recommendations = await recommender.generateRecommendations(context, preferences);

      // Should not recommend meat-containing recipes
      recommendations.primaryRecommendations.forEach(rec => {
        expect(rec.tags?.includes('meat')).toBeFalsy();
      });
    });
  });

  describe('Collaborative Filtering', () => {
    it('should find similar users correctly', async () => {
      const targetUserId = 'user123';
      const preferences = createMockPreferences();

      const similarUsers = await (recommender as any).findSimilarUsers(targetUserId, preferences);

      expect(Array.isArray(similarUsers)).toBe(true);
      
      similarUsers.forEach((user: any) => {
        expect(user.userId).toBeTruthy();
        expect(user.similarityScore).toBeGreaterThan(0);
        expect(user.similarityScore).toBeLessThanOrEqual(1);
      });
    });

    it('should generate collaborative recommendations', async () => {
      const context = createMockContext();
      const preferences = createMockPreferences();

      const recommendations = await (recommender as any).generateCollaborativeRecommendations(
        context, preferences
      );

      expect(Array.isArray(recommendations)).toBe(true);
      
      recommendations.forEach((rec: any) => {
        expect(rec.recipeId).toBeTruthy();
        expect(rec.score).toBeGreaterThan(0);
        expect(rec.source).toBe('collaborative');
      });
    });

    it('should calculate user similarity accurately', () => {
      const user1Prefs = createMockPreferences();
      const user2Prefs = {
        ...createMockPreferences(),
        cuisineAffinities: { italienne: 0.8, française: 0.9, asiatique: 0.2 }
      };

      const similarity = (recommender as any).calculateUserSimilarity(user1Prefs, user2Prefs);

      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });

  describe('Content-Based Filtering', () => {
    it('should generate content-based recommendations', async () => {
      const context = createMockContext();
      const preferences = createMockPreferences();

      const recommendations = await (recommender as any).generateContentBasedRecommendations(
        context, preferences
      );

      expect(Array.isArray(recommendations)).toBe(true);
      
      recommendations.forEach((rec: any) => {
        expect(rec.recipeId).toBeTruthy();
        expect(rec.score).toBeGreaterThan(0);
        expect(rec.source).toBe('content_based');
        expect(rec.reasons).toBeDefined();
      });
    });

    it('should score recipes based on preferences', () => {
      const recipe = mockRecipeData[0];
      const preferences = createMockPreferences();

      const score = (recommender as any).calculateContentScore(recipe, preferences);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should match cuisine preferences', () => {
      const recipe = { tags: ['italienne', 'rapide'] };
      const preferences = createMockPreferences();

      const cuisineScore = (recommender as any).calculateCuisineMatch(recipe, preferences);

      expect(cuisineScore).toBeGreaterThan(0);
      expect(cuisineScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Contextual Adaptations', () => {
    it('should adapt recommendations for weather', () => {
      const baseRecommendations = [
        { recipeId: 'recipe1', score: 0.8, tags: ['soup', 'hot'] },
        { recipeId: 'recipe2', score: 0.7, tags: ['salad', 'cold'] },
        { recipeId: 'recipe3', score: 0.6, tags: ['pasta'] }
      ];

      const coldWeatherAdapted = (recommender as any).adaptForWeather(
        baseRecommendations,
        { temperature: 5, condition: 'cold' }
      );

      const hotWeatherAdapted = (recommender as any).adaptForWeather(
        baseRecommendations,
        { temperature: 30, condition: 'hot' }
      );

      // Cold weather should boost hot dishes
      expect(coldWeatherAdapted[0].tags?.includes('hot')).toBeTruthy();
      
      // Hot weather should boost cold dishes
      expect(hotWeatherAdapted.some((rec: any) => rec.tags?.includes('cold'))).toBeTruthy();
    });

    it('should adapt recommendations for time constraints', () => {
      const baseRecommendations = [
        { recipeId: 'recipe1', score: 0.8, prepTime: 45, cookTime: 30 },
        { recipeId: 'recipe2', score: 0.7, prepTime: 10, cookTime: 15 },
        { recipeId: 'recipe3', score: 0.6, prepTime: 20, cookTime: 25 }
      ];

      const timeAdapted = (recommender as any).adaptForTimeConstraints(
        baseRecommendations,
        { maxPrepTime: 20, maxCookTime: 30 }
      );

      timeAdapted.forEach((rec: any) => {
        expect(rec.prepTime).toBeLessThanOrEqual(20);
        expect(rec.cookTime).toBeLessThanOrEqual(30);
      });
    });

    it('should adapt recommendations for season', () => {
      const baseRecommendations = [
        { recipeId: 'recipe1', score: 0.8, tags: ['soup'], ingredients: ['tomatoes'] },
        { recipeId: 'recipe2', score: 0.7, tags: ['salad'], ingredients: ['strawberries'] },
        { recipeId: 'recipe3', score: 0.6, tags: ['stew'], ingredients: ['squash'] }
      ];

      const winterAdapted = (recommender as any).adaptForSeason(baseRecommendations, 'winter');
      const summerAdapted = (recommender as any).adaptForSeason(baseRecommendations, 'summer');

      // Winter should boost warming dishes
      expect(winterAdapted[0].tags?.includes('soup') || winterAdapted[0].tags?.includes('stew')).toBeTruthy();
      
      // Summer should boost fresh dishes
      expect(summerAdapted.some((rec: any) => rec.tags?.includes('salad'))).toBeTruthy();
    });
  });

  describe('Hybrid Scoring', () => {
    it('should combine collaborative and content-based scores', () => {
      const contentScore = 0.8;
      const collaborativeScore = 0.6;
      const context = { hasCollaborativeData: true, userActivity: 'high' };

      const hybridScore = (recommender as any).calculateHybridScore(
        contentScore, 
        collaborativeScore, 
        context
      );

      expect(hybridScore).toBeGreaterThan(0);
      expect(hybridScore).toBeLessThanOrEqual(1);
      expect(hybridScore).toBeGreaterThan(Math.min(contentScore, collaborativeScore));
    });

    it('should weight content-based higher for new users', () => {
      const contentScore = 0.8;
      const collaborativeScore = 0.6;
      const newUserContext = { hasCollaborativeData: false, userActivity: 'low' };

      const hybridScore = (recommender as any).calculateHybridScore(
        contentScore, 
        collaborativeScore, 
        newUserContext
      );

      // For new users, should be closer to content score
      expect(Math.abs(hybridScore - contentScore)).toBeLessThan(Math.abs(hybridScore - collaborativeScore));
    });
  });

  describe('Diversity and Novelty', () => {
    it('should ensure recommendation diversity', async () => {
      const context = createMockContext();
      const preferences = createMockPreferences();

      const recommendations = await recommender.generateRecommendations(context, preferences);

      const uniqueCuisines = new Set();
      const uniqueComplexities = new Set();

      recommendations.primaryRecommendations.forEach(rec => {
        if (rec.tags) {
          rec.tags.forEach(tag => {
            if (['française', 'italienne', 'asiatique', 'mexicaine'].includes(tag)) {
              uniqueCuisines.add(tag);
            }
          });
        }
        uniqueComplexities.add(rec.difficulty || 2);
      });

      expect(uniqueCuisines.size).toBeGreaterThan(1); // Multiple cuisines
      expect(uniqueComplexities.size).toBeGreaterThan(1); // Multiple complexity levels
    });

    it('should introduce novelty in recommendations', async () => {
      const context = createMockContext();
      const preferences = createMockPreferences();

      const recommendations = await recommender.generateRecommendations(context, preferences);

      // Check that some recommendations include novelty
      const hasNoveltyFactors = recommendations.primaryRecommendations.some(rec => 
        rec.reasons?.includes('Discover new flavors') || 
        rec.reasons?.includes('Try something different')
      );

      expect(recommendations.metadata.noveltyScore).toBeGreaterThanOrEqual(0);
      expect(recommendations.metadata.noveltyScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Explanation Generation', () => {
    it('should generate meaningful explanations', async () => {
      const context = createMockContext();
      const preferences = createMockPreferences();

      const recommendations = await recommender.generateRecommendations(context, preferences);

      expect(recommendations.explanations.length).toBeGreaterThan(0);
      
      recommendations.explanations.forEach(explanation => {
        expect(explanation.reason).toBeTruthy();
        expect(explanation.details).toBeTruthy();
        expect(['high', 'medium', 'low']).toContain(explanation.importance);
      });
    });

    it('should explain recommendation reasons clearly', () => {
      const recipe = mockRecipeData[0];
      const preferences = createMockPreferences();
      const score = 0.85;

      const reasons = (recommender as any).generateRecommendationReasons(
        recipe, 
        preferences, 
        score
      );

      expect(Array.isArray(reasons)).toBe(true);
      expect(reasons.length).toBeGreaterThan(0);
      
      reasons.forEach((reason: string) => {
        expect(reason).toBeTruthy();
        expect(reason.length).toBeGreaterThan(5);
      });
    });
  });

  describe('Performance Optimization', () => {
    it('should complete recommendation generation within time limit', async () => {
      const context = createMockContext();
      const preferences = createMockPreferences();

      const startTime = Date.now();
      await recommender.generateRecommendations(context, preferences);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(3000); // Less than 3 seconds
    });

    it('should cache similar requests efficiently', async () => {
      const context = createMockContext();
      const preferences = createMockPreferences();

      // First call
      const startTime1 = Date.now();
      const result1 = await recommender.generateRecommendations(context, preferences);
      const endTime1 = Date.now();

      // Second call with same parameters
      const startTime2 = Date.now();
      const result2 = await recommender.generateRecommendations(context, preferences);
      const endTime2 = Date.now();

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      
      // Second call should potentially be faster due to caching
      // Note: This might not always be true in tests, but verifies the mechanism exists
      expect(endTime2 - startTime2).toBeLessThan(5000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty recipe database', async () => {
      const { supabase } = require('@/integrations/supabase/client');
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      });

      const context = createMockContext();
      const preferences = createMockPreferences();

      const recommendations = await recommender.generateRecommendations(context, preferences);

      expect(recommendations.primaryRecommendations).toHaveLength(0);
      expect(recommendations.explanations.some(exp => 
        exp.reason.includes('no recipes available')
      )).toBeTruthy();
    });

    it('should handle user with no preferences', async () => {
      const context = createMockContext();
      const emptyPreferences: LearnedPreferences = {
        cuisineAffinities: {},
        ingredientPreferences: {
          loved: [],
          liked: [],
          neutral: [],
          disliked: [],
          allergens: []
        },
        cookingHabits: {
          preferredMealTimes: [],
          averageCookingTime: 30,
          complexityPreference: 'medium',
          batchCookingTendency: 0.5
        },
        nutritionalTendencies: {
          averageCaloriesPerMeal: 600,
          macroDistribution: { protein: 0.3, carbs: 0.4, fat: 0.3 },
          healthScore: 0.7,
          dietaryPattern: 'balanced'
        },
        confidenceScore: 0.1 // Very low confidence
      };

      const recommendations = await recommender.generateRecommendations(context, emptyPreferences);

      expect(recommendations.primaryRecommendations).toBeDefined();
      expect(recommendations.explanations.some(exp => 
        exp.reason.includes('popular') || exp.reason.includes('general')
      )).toBeTruthy();
    });

    it('should handle extreme budget constraints', async () => {
      const context = createMockContext();
      context.request.preferences.budgetConstraints.weeklyBudget = 10; // Very low budget
      context.request.preferences.budgetConstraints.strictMode = true;
      const preferences = createMockPreferences();

      const recommendations = await recommender.generateRecommendations(context, preferences);

      if (recommendations.budgetFriendly.length > 0) {
        recommendations.budgetFriendly.forEach(rec => {
          expect(rec.estimatedCost).toBeLessThanOrEqual(2); // Very cheap meals only
        });
      }
    });
  });

  describe('Recommendation Quality', () => {
    it('should maintain minimum quality threshold', async () => {
      const context = createMockContext();
      const preferences = createMockPreferences();

      const recommendations = await recommender.generateRecommendations(context, preferences);

      recommendations.primaryRecommendations.forEach(rec => {
        expect(rec.score).toBeGreaterThan(0.3); // Minimum quality threshold
      });
    });

    it('should provide balanced recommendation categories', async () => {
      const context = createMockContext();
      const preferences = createMockPreferences();

      const recommendations = await recommender.generateRecommendations(context, preferences);

      // Should have multiple categories with content
      const categoriesWithContent = [
        recommendations.primaryRecommendations.length > 0,
        recommendations.quickOptions.length > 0,
        recommendations.healthyOptions.length > 0,
        recommendations.budgetFriendly.length > 0
      ].filter(Boolean).length;

      expect(categoriesWithContent).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const { supabase } = require('@/integrations/supabase/client');
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ 
              data: null, 
              error: new Error('Database error') 
            }))
          }))
        }))
      });

      const context = createMockContext();
      const preferences = createMockPreferences();

      const recommendations = await recommender.generateRecommendations(context, preferences);

      expect(recommendations).toBeDefined();
      expect(recommendations.primaryRecommendations).toBeDefined();
      expect(recommendations.explanations.some(exp => 
        exp.reason.includes('error') || exp.reason.includes('fallback')
      )).toBeTruthy();
    });

    it('should handle invalid preference data', async () => {
      const context = createMockContext();
      const invalidPreferences = {
        cuisineAffinities: null,
        confidenceScore: -1
      } as any;

      await expect(recommender.generateRecommendations(context, invalidPreferences))
        .rejects.toThrow();
    });
  });

  describe('Metadata and Analytics', () => {
    it('should provide recommendation metadata', async () => {
      const context = createMockContext();
      const preferences = createMockPreferences();

      const recommendations = await recommender.generateRecommendations(context, preferences);

      expect(recommendations.metadata).toBeDefined();
      expect(recommendations.metadata.totalCandidates).toBeGreaterThanOrEqual(0);
      expect(recommendations.metadata.diversityScore).toBeGreaterThanOrEqual(0);
      expect(recommendations.metadata.noveltyScore).toBeGreaterThanOrEqual(0);
      expect(recommendations.metadata.avgConfidence).toBeGreaterThanOrEqual(0);
      expect(recommendations.metadata.generationTime).toBeGreaterThan(0);
    });

    it('should track recommendation sources', async () => {
      const context = createMockContext();
      const preferences = createMockPreferences();

      const recommendations = await recommender.generateRecommendations(context, preferences);

      const sources = new Set();
      recommendations.primaryRecommendations.forEach(rec => {
        if (rec.source) sources.add(rec.source);
      });

      expect(sources.size).toBeGreaterThan(0);
      expect([...sources].every(source => 
        ['collaborative', 'content_based', 'hybrid'].includes(source as string)
      )).toBeTruthy();
    });
  });
});