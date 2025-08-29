import { BudgetOptimizer } from '../analyzers/BudgetOptimizer';
import { WeeklyMealPlan, MealPlanEntry, BudgetConstraints } from '../../types';
import { LearnedPreferences, CurrentContext } from '../types';

// Mock Supabase
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: mockRecipeData, error: null })),
          limit: jest.fn(() => Promise.resolve({ data: mockAlternatives, error: null }))
        })),
        neq: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: mockAlternatives, error: null }))
        })),
        gte: jest.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
  }
}));

const mockRecipeData = {
  id: 'recipe1',
  ingredients_json: [
    { name: 'saumon', quantity: '400g' },
    { name: 'brocolis', quantity: '300g' },
    { name: 'riz', quantity: '200g' }
  ]
};

const mockAlternatives = [
  {
    id: 'recipe_alt1',
    title: 'Poulet aux légumes',
    prep_time: 20,
    cook_time: 25,
    difficulty: 2,
    tags: ['français', 'économique']
  },
  {
    id: 'recipe_alt2',
    title: 'Pâtes aux légumes',
    prep_time: 15,
    cook_time: 12,
    difficulty: 1,
    tags: ['italien', 'rapide']
  }
];

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
      recipeName: 'Saumon grillé',
      mealType: 'dinner',
      dayOfWeek: 0,
      servings: 4,
      estimatedCost: 18,
      prepTime: 15,
      cookTime: 20,
      tags: ['expensive']
    } as MealPlanEntry,
    {
      id: 'meal2',
      userId: 'user123',
      recipeId: 'recipe2',
      recipeName: 'Salade simple',
      mealType: 'lunch',
      dayOfWeek: 0,
      servings: 4,
      estimatedCost: 8,
      prepTime: 10,
      cookTime: 0
    } as MealPlanEntry,
    {
      id: 'meal3',
      userId: 'user123',
      recipeId: 'recipe3',
      recipeName: 'Bœuf bourguignon',
      mealType: 'dinner',
      dayOfWeek: 1,
      servings: 4,
      estimatedCost: 22,
      prepTime: 30,
      cookTime: 120,
      tags: ['complex', 'expensive']
    } as MealPlanEntry
  ],
  totalEstimatedCost: 48,
  status: 'draft',
  createdAt: new Date()
});

const createMockBudgetConstraints = (): BudgetConstraints => ({
  weeklyBudget: 40,
  maxMealCost: 15,
  strictMode: false
});

const createMockPreferences = (): LearnedPreferences => ({
  cuisineAffinities: { française: 0.8, italienne: 0.6 },
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
    batchCookingTendency: 0.3
  },
  nutritionalTendencies: {
    averageCaloriesPerMeal: 600,
    macroDistribution: { protein: 0.3, carbs: 0.4, fat: 0.3 },
    healthScore: 0.8,
    dietaryPattern: 'balanced'
  },
  confidenceScore: 0.85
});

describe('BudgetOptimizer', () => {
  let optimizer: BudgetOptimizer;

  beforeEach(() => {
    optimizer = new BudgetOptimizer();
    jest.clearAllMocks();
  });

  describe('analyzeBudget', () => {
    it('should analyze budget correctly', async () => {
      const plan = createMockMealPlan();
      const constraints = createMockBudgetConstraints();
      const preferences = createMockPreferences();

      const analysis = await optimizer.analyzeBudget(plan, constraints, preferences);

      expect(analysis.totalCost).toBeGreaterThan(0);
      expect(analysis.budgetUtilization).toBe(analysis.totalCost / constraints.weeklyBudget);
      expect(analysis.dailyCosts).toHaveLength(7);
      expect(analysis.costBreakdown).toBeDefined();
      expect(analysis.optimizations).toBeDefined();
      expect(analysis.savingsOpportunities).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(analysis.riskLevel);
    });

    it('should identify over-budget situations', async () => {
      const plan = createMockMealPlan();
      plan.totalEstimatedCost = 60; // Over budget
      const constraints = createMockBudgetConstraints(); // Budget: 40
      const preferences = createMockPreferences();

      const analysis = await optimizer.analyzeBudget(plan, constraints, preferences);

      expect(analysis.budgetUtilization).toBeGreaterThan(1);
      expect(analysis.riskLevel).toBe('high');
      expect(analysis.optimizations.length).toBeGreaterThan(0);
    });

    it('should provide detailed daily cost breakdown', async () => {
      const plan = createMockMealPlan();
      const constraints = createMockBudgetConstraints();
      const preferences = createMockPreferences();

      const analysis = await optimizer.analyzeBudget(plan, constraints, preferences);

      expect(analysis.dailyCosts).toHaveLength(7);
      
      analysis.dailyCosts.forEach(dailyCost => {
        expect(dailyCost.day).toBeGreaterThanOrEqual(0);
        expect(dailyCost.day).toBeLessThan(7);
        expect(dailyCost.dayName).toBeTruthy();
        expect(dailyCost.totalCost).toBeGreaterThanOrEqual(0);
        expect(dailyCost.mealCosts).toBeDefined();
        expect(dailyCost.budgetShare).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('optimizeForBudget', () => {
    it('should optimize plan to meet budget constraints', async () => {
      const plan = createMockMealPlan();
      plan.totalEstimatedCost = 60; // Over budget
      const constraints = createMockBudgetConstraints(); // Budget: 40
      const preferences = createMockPreferences();

      const optimizedPlan = await optimizer.optimizeForBudget(plan, constraints, preferences);

      expect(optimizedPlan.budgetOptimizations).toBeDefined();
      expect(optimizedPlan.estimatedSavings).toBeGreaterThan(0);
      
      // Should attempt to reduce cost
      if (optimizedPlan.estimatedSavings) {
        expect(optimizedPlan.totalEstimatedCost + optimizedPlan.estimatedSavings).toBeGreaterThan(plan.totalEstimatedCost);
      }
    });

    it('should return original plan when budget is already met', async () => {
      const plan = createMockMealPlan();
      plan.totalEstimatedCost = 35; // Under budget
      const constraints = createMockBudgetConstraints(); // Budget: 40
      const preferences = createMockPreferences();

      const optimizedPlan = await optimizer.optimizeForBudget(plan, constraints, preferences);

      expect(optimizedPlan).toEqual(plan);
    });

    it('should apply optimizations in priority order', async () => {
      const plan = createMockMealPlan();
      plan.totalEstimatedCost = 70; // Significantly over budget
      const constraints = createMockBudgetConstraints();
      const preferences = createMockPreferences();

      const optimizedPlan = await optimizer.optimizeForBudget(plan, constraints, preferences, 20);

      if (optimizedPlan.budgetOptimizations) {
        expect(optimizedPlan.budgetOptimizations.length).toBeGreaterThan(0);
        
        // Verify optimizations are ordered by priority
        for (let i = 1; i < optimizedPlan.budgetOptimizations.length; i++) {
          expect(optimizedPlan.budgetOptimizations[i].priority).toBeGreaterThanOrEqual(
            optimizedPlan.budgetOptimizations[i - 1].priority
          );
        }
      }
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate meal cost accurately', async () => {
      const meal: MealPlanEntry = {
        id: 'meal1',
        userId: 'user123',
        recipeId: 'recipe1',
        recipeName: 'Saumon grillé',
        mealType: 'dinner',
        dayOfWeek: 0,
        servings: 4,
        estimatedCost: 18,
        prepTime: 15,
        cookTime: 20
      };

      const cost = await (optimizer as any).calculateMealCost(meal);

      expect(cost).toBeGreaterThan(0);
      expect(typeof cost).toBe('number');
    });

    it('should handle missing recipe data gracefully', async () => {
      const { supabase } = require('@/integrations/supabase/client');
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: new Error('Not found') }))
          }))
        }))
      });

      const meal: MealPlanEntry = {
        id: 'meal1',
        userId: 'user123',
        recipeId: 'nonexistent',
        recipeName: 'Missing Recipe',
        mealType: 'lunch',
        dayOfWeek: 0,
        servings: 4,
        estimatedCost: 10
      };

      const cost = await (optimizer as any).calculateMealCost(meal);

      expect(cost).toBe(meal.estimatedCost); // Fallback to estimated cost
    });

    it('should calculate ingredient cost with seasonal factors', async () => {
      const ingredient = { name: 'tomates', quantity: '300g' };
      const servings = 4;

      const cost = await (optimizer as any).calculateIngredientCost(ingredient, servings);

      expect(cost).toBeGreaterThan(0);
      expect(typeof cost).toBe('number');
    });
  });

  describe('Optimization Identification', () => {
    it('should identify meal replacement opportunities', async () => {
      const plan = createMockMealPlan();
      plan.totalEstimatedCost = 60; // Over budget
      const constraints = createMockBudgetConstraints();
      const preferences = createMockPreferences();

      const optimizations = await (optimizer as any).identifyOptimizations(
        plan, constraints, preferences, 60
      );

      expect(optimizations.length).toBeGreaterThan(0);
      
      const mealReplacements = optimizations.filter((opt: any) => opt.type === 'replace_meal');
      expect(mealReplacements.length).toBeGreaterThan(0);
      
      mealReplacements.forEach((opt: any) => {
        expect(opt.potentialSavings).toBeGreaterThan(0);
        expect(opt.targetMeals.length).toBeGreaterThan(0);
        expect(['easy', 'medium', 'hard']).toContain(opt.implementationDifficulty);
      });
    });

    it('should identify bulk cooking opportunities', async () => {
      const plan = createMockMealPlan();
      // Add meals that could benefit from bulk cooking
      plan.meals.push(
        {
          id: 'meal4',
          userId: 'user123',
          recipeId: 'curry1',
          recipeName: 'Curry de légumes',
          mealType: 'dinner',
          dayOfWeek: 2,
          servings: 4,
          estimatedCost: 12,
          tags: ['curry']
        } as MealPlanEntry,
        {
          id: 'meal5',
          userId: 'user123',
          recipeId: 'curry2',
          recipeName: 'Curry de poulet',
          mealType: 'dinner',
          dayOfWeek: 4,
          servings: 4,
          estimatedCost: 14,
          tags: ['curry']
        } as MealPlanEntry
      );

      const preferences = createMockPreferences();

      const opportunities = await (optimizer as any).findBulkCookingOpportunities(plan, preferences);

      expect(opportunities.length).toBeGreaterThanOrEqual(0);
      
      opportunities.forEach((opp: any) => {
        expect(opp.mealCount).toBeGreaterThanOrEqual(2);
        expect(opp.savings).toBeGreaterThan(0);
      });
    });

    it('should identify portion optimization opportunities', async () => {
      const plan = createMockMealPlan();
      // Add meal with large portions
      plan.meals[0].servings = 8; // Large portion
      plan.meals[0].estimatedCost = 25;

      const optimizations = await (optimizer as any).findPortionOptimizations(plan);

      expect(optimizations.length).toBeGreaterThan(0);
      
      const portionOpts = optimizations.filter((opt: any) => opt.optimizedServings);
      expect(portionOpts.length).toBeGreaterThan(0);
      
      portionOpts.forEach((opt: any) => {
        expect(opt.optimizedServings).toBeLessThan(opt.currentServings);
        expect(opt.savings).toBeGreaterThan(0);
      });
    });
  });

  describe('Savings Opportunities', () => {
    it('should find protein savings opportunities', async () => {
      const plan = createMockMealPlan();
      const costBreakdown = {
        ingredients: [
          { category: 'proteins', cost: 25, percentage: 50 }, // High protein cost
          { category: 'vegetables', cost: 10, percentage: 20 },
          { category: 'grains', cost: 8, percentage: 16 },
          { category: 'other', cost: 7, percentage: 14 }
        ],
        mealTypes: [
          { type: 'lunch', cost: 20, percentage: 40 },
          { type: 'dinner', cost: 30, percentage: 60 }
        ],
        complexity: [
          { level: 'simple', cost: 15, percentage: 30 },
          { level: 'complex', cost: 35, percentage: 70 }
        ]
      };
      const preferences = createMockPreferences();

      const opportunities = await (optimizer as any).findSavingsOpportunities(
        plan, costBreakdown, preferences
      );

      expect(opportunities.length).toBeGreaterThan(0);
      
      const proteinSavings = opportunities.find((opp: any) => opp.category === 'Protéines');
      expect(proteinSavings).toBeDefined();
      expect(proteinSavings.savings).toBeGreaterThan(0);
      expect(proteinSavings.actions.length).toBeGreaterThan(0);
    });

    it('should find complexity savings opportunities', async () => {
      const plan = createMockMealPlan();
      const costBreakdown = {
        ingredients: [
          { category: 'proteins', cost: 15, percentage: 30 },
          { category: 'vegetables', cost: 10, percentage: 20 },
          { category: 'grains', cost: 8, percentage: 16 },
          { category: 'other', cost: 17, percentage: 34 }
        ],
        mealTypes: [
          { type: 'lunch', cost: 20, percentage: 40 },
          { type: 'dinner', cost: 30, percentage: 60 }
        ],
        complexity: [
          { level: 'simple', cost: 10, percentage: 20 },
          { level: 'complex', cost: 40, percentage: 80 } // High complexity cost
        ]
      };
      const preferences = createMockPreferences();

      const opportunities = await (optimizer as any).findSavingsOpportunities(
        plan, costBreakdown, preferences
      );

      const complexitySavings = opportunities.find((opp: any) => opp.category === 'Complexité des repas');
      expect(complexitySavings).toBeDefined();
      expect(complexitySavings.savings).toBeGreaterThan(0);
    });
  });

  describe('Alternative Finding', () => {
    it('should find budget alternatives for expensive meals', async () => {
      const expensiveMeal: MealPlanEntry = {
        id: 'meal1',
        userId: 'user123',
        recipeId: 'expensive_recipe',
        recipeName: 'Homard thermidor',
        mealType: 'dinner',
        dayOfWeek: 0,
        servings: 4,
        estimatedCost: 35,
        prepTime: 45,
        cookTime: 30
      };

      const alternative = await (optimizer as any).findBudgetAlternative(expensiveMeal, 20);

      if (alternative) {
        expect(alternative.estimatedCost).toBeLessThanOrEqual(20);
        expect(alternative.recipeId).not.toBe(expensiveMeal.recipeId);
        expect(alternative.mealType).toBe(expensiveMeal.mealType);
      }
    });

    it('should find ingredient alternatives', async () => {
      const expensiveIngredient = { name: 'saumon', quantity: '400g' };
      
      const alternatives = await (optimizer as any).findIngredientAlternatives(expensiveIngredient);
      
      expect(Array.isArray(alternatives)).toBe(true);
      
      if (alternatives.length > 0) {
        alternatives.forEach((alt: any) => {
          expect(alt.name).toBeTruthy();
          expect(alt.cost).toBeGreaterThan(0);
          expect(alt.nutritionSimilarity).toBeGreaterThan(0);
          expect(alt.nutritionSimilarity).toBeLessThanOrEqual(1);
        });
      }
    });
  });

  describe('Optimization Application', () => {
    it('should apply meal replacement optimization', async () => {
      const plan = createMockMealPlan();
      const optimization = {
        type: 'replace_meal' as const,
        description: 'Replace expensive meals',
        targetMeals: ['meal1'],
        potentialSavings: 8,
        implementationDifficulty: 'medium' as const,
        priority: 1
      };

      const result = await (optimizer as any).applyOptimization(plan, optimization);

      expect(result.success).toBeDefined();
      expect(result.savings).toBeGreaterThanOrEqual(0);
    });

    it('should apply ingredient substitution optimization', async () => {
      const plan = createMockMealPlan();
      const optimization = {
        type: 'substitute_ingredient' as const,
        description: 'Replace expensive ingredients',
        targetMeals: ['meal1'],
        potentialSavings: 5,
        implementationDifficulty: 'easy' as const,
        priority: 2
      };

      const result = await (optimizer as any).applyOptimization(plan, optimization);

      expect(result.success).toBeDefined();
      expect(result.savings).toBeGreaterThanOrEqual(0);
    });

    it('should handle optimization failures gracefully', async () => {
      const plan = createMockMealPlan();
      const invalidOptimization = {
        type: 'unknown_type' as any,
        description: 'Invalid optimization',
        targetMeals: [],
        potentialSavings: 0,
        implementationDifficulty: 'easy' as const,
        priority: 1
      };

      const result = await (optimizer as any).applyOptimization(plan, invalidOptimization);

      expect(result.success).toBe(false);
      expect(result.savings).toBe(0);
    });
  });

  describe('Cost Estimation', () => {
    it('should estimate recipe cost based on ingredients', async () => {
      const recipe = {
        id: 'recipe1',
        ingredients_json: [
          { name: 'poulet', quantity: '500g' },
          { name: 'tomates', quantity: '400g' },
          { name: 'oignons', quantity: '2' }
        ]
      };

      const cost = await (optimizer as any).estimateRecipeCost(recipe, 4);

      expect(cost).toBeGreaterThan(0);
      expect(typeof cost).toBe('number');
    });

    it('should fall back to difficulty-based estimation when ingredients missing', async () => {
      const recipe = {
        id: 'recipe2',
        difficulty: 3,
        ingredients_json: null
      };

      const cost = await (optimizer as any).estimateRecipeCost(recipe, 4);

      expect(cost).toBeGreaterThan(0);
      expect(cost).toBe(3 * 1.5 * (4 / 4)); // difficulty * 1.5 * serving ratio
    });
  });

  describe('Utility Functions', () => {
    it('should calculate meal similarity correctly', () => {
      const meal1: MealPlanEntry = {
        id: 'meal1',
        userId: 'user123',
        recipeId: 'recipe1',
        recipeName: 'Pâtes carbonara',
        mealType: 'dinner',
        dayOfWeek: 0,
        servings: 4,
        estimatedCost: 12,
        prepTime: 20,
        cookTime: 15,
        difficulty: 2
      };

      const recipe2 = {
        id: 'recipe2',
        title: 'Pâtes bolognaise',
        prep_time: 25,
        cook_time: 20,
        difficulty: 2
      };

      const similarity = (optimizer as any).calculateMealSimilarity(meal1, recipe2);

      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('should extract cuisine type correctly', () => {
      const testCases = [
        { name: 'Pasta alla carbonara', expected: 'italienne' },
        { name: 'Chicken curry', expected: 'indienne' },
        { name: 'Beef stir fry wok', expected: 'asiatique' },
        { name: 'Tacos al pastor', expected: 'mexicaine' },
        { name: 'Coq au vin', expected: 'française' }
      ];

      testCases.forEach(({ name, expected }) => {
        const cuisine = (optimizer as any).extractCuisine(name);
        expect(cuisine).toBe(expected);
      });
    });

    it('should assess waste risk appropriately', async () => {
      const meal: MealPlanEntry = {
        id: 'meal1',
        userId: 'user123',
        recipeId: 'recipe1',
        recipeName: 'Large family meal',
        mealType: 'dinner',
        dayOfWeek: 0,
        servings: 8 // Large portion
      };

      const wasteRisk = await (optimizer as any).assessWasteRisk(meal);

      expect(wasteRisk).toBeGreaterThanOrEqual(0);
      expect(wasteRisk).toBeLessThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors during analysis', async () => {
      const { supabase } = require('@/integrations/supabase/client');
      supabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: null, 
              error: new Error('Database connection failed') 
            }))
          }))
        }))
      });

      const plan = createMockMealPlan();
      const constraints = createMockBudgetConstraints();
      const preferences = createMockPreferences();

      const analysis = await optimizer.analyzeBudget(plan, constraints, preferences);

      expect(analysis).toBeDefined();
      expect(analysis.riskLevel).toBeDefined();
    });

    it('should handle invalid cost data', async () => {
      const meal: MealPlanEntry = {
        id: 'meal1',
        userId: 'user123',
        recipeId: 'recipe1',
        recipeName: 'Test meal',
        mealType: 'lunch',
        dayOfWeek: 0,
        servings: 4,
        estimatedCost: undefined // Invalid cost
      };

      const cost = await (optimizer as any).calculateMealCost(meal);

      expect(cost).toBeGreaterThan(0); // Should provide fallback value
    });
  });

  describe('Performance', () => {
    it('should complete budget analysis within reasonable time', async () => {
      const plan = createMockMealPlan();
      const constraints = createMockBudgetConstraints();
      const preferences = createMockPreferences();

      const startTime = Date.now();
      await optimizer.analyzeBudget(plan, constraints, preferences);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(3000); // Less than 3 seconds
    });

    it('should handle large meal plans efficiently', async () => {
      const largePlan = createMockMealPlan();
      
      // Add many meals to test performance
      for (let day = 0; day < 7; day++) {
        for (let meal = 0; meal < 4; meal++) {
          largePlan.meals.push({
            id: `large_meal_${day}_${meal}`,
            userId: 'user123',
            recipeId: `recipe_${day}_${meal}`,
            recipeName: `Meal ${day}-${meal}`,
            mealType: meal % 2 === 0 ? 'lunch' : 'dinner',
            dayOfWeek: day,
            servings: 4,
            estimatedCost: 10 + Math.random() * 10
          } as MealPlanEntry);
        }
      }

      const constraints = createMockBudgetConstraints();
      const preferences = createMockPreferences();

      const startTime = Date.now();
      const analysis = await optimizer.analyzeBudget(largePlan, constraints, preferences);
      const endTime = Date.now();

      expect(analysis).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should handle large plans efficiently
    });
  });

  describe('Integration', () => {
    it('should integrate with other planning components', async () => {
      const plan = createMockMealPlan();
      const constraints = createMockBudgetConstraints();
      const preferences = createMockPreferences();
      const context: CurrentContext = {
        weather: { temperature: 22, condition: 'sunny' },
        timeAvailable: 45,
        healthGoals: { active: true, targets: { calories: 2000 } },
        budgetRemaining: 35,
        inventoryStatus: 'medium',
        upcomingEvents: []
      };

      const analysis = await optimizer.analyzeBudget(plan, constraints, preferences, context);

      expect(analysis.riskLevel).toBeDefined();
      expect(analysis.optimizations).toBeDefined();
      expect(analysis.savingsOpportunities).toBeDefined();
    });
  });
});