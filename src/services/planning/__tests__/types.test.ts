import {
  PlanningRequest,
  PlanningResult,
  WeeklyMealPlan,
  MealPlanEntry,
  RecipeCandidate,
  PlanningConstraints,
  OptimizationScore,
  UserPreferences,
  BudgetConstraints,
  NutritionalGoals,
  TimeConstraints
} from '../types';

describe('Planning Types', () => {
  describe('Type Validation', () => {
    it('should validate PlanningRequest structure', () => {
      const validRequest: PlanningRequest = {
        userId: 'user123',
        weekStartDate: new Date('2024-01-01'),
        optimizationMode: 'balanced',
        preferences: {
          cuisinePreferences: ['française', 'italienne'],
          dietaryRestrictions: ['nuts'],
          timeConstraints: {
            maxPrepTime: 45,
            maxCookTime: 60,
            availableTimeSlots: [
              { start: '18:00', end: '20:00', days: [1, 2, 3, 4, 5] }
            ]
          },
          budgetConstraints: {
            weeklyBudget: 50,
            maxMealCost: 12,
            strictMode: false
          },
          familySize: 4,
          nutritionalGoals: {
            targetCalories: 2000,
            macroDistribution: {
              protein: 0.3,
              carbs: 0.4,
              fat: 0.3
            },
            specificGoals: ['high_protein']
          }
        },
        constraints: {
          maxPrepTimePerMeal: 45,
          minVarietyScore: 0.7,
          maxBudgetOverrun: 0.1,
          requiredMealsPerWeek: 14
        },
        existingInventory: [
          {
            id: 'inv1',
            productId: 'prod1',
            quantity: 2,
            unit: 'pieces',
            expiryDate: new Date('2024-01-15')
          }
        ]
      };

      // Type assertion should not throw
      expect(validRequest.userId).toBe('user123');
      expect(validRequest.optimizationMode).toBe('balanced');
      expect(validRequest.preferences.familySize).toBe(4);
      expect(validRequest.constraints.requiredMealsPerWeek).toBe(14);
    });

    it('should validate WeeklyMealPlan structure', () => {
      const validPlan: WeeklyMealPlan = {
        id: 'plan123',
        userId: 'user123',
        name: 'Weekly Plan',
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
            estimatedCost: 12,
            prepTime: 20,
            cookTime: 15,
            nutritionalInfo: {
              calories: 450,
              protein: 20,
              carbs: 60,
              fat: 15
            },
            requiredIngredients: [
              { name: 'pâtes', quantity: '400g', unit: 'g' }
            ],
            missingIngredients: [],
            confidence: 0.85,
            tags: ['italian', 'quick'],
            notes: 'Family favorite',
            aiGenerated: true
          }
        ],
        totalEstimatedCost: 45,
        nutritionalSummary: {
          totalCalories: 6300,
          avgCaloriesPerMeal: 450,
          macroDistribution: {
            protein: 0.3,
            carbs: 0.4,
            fat: 0.3
          },
          weeklyTotals: {
            protein: 280,
            carbs: 840,
            fat: 210
          }
        },
        shoppingList: {
          totalCost: 35,
          estimatedSavings: 8,
          items: [
            {
              productId: 'prod1',
              name: 'Pâtes',
              quantity: 2.8,
              unit: 'kg',
              estimatedCost: 4.5,
              category: 'grains'
            }
          ],
          storeRecommendations: [
            {
              storeId: 'store1',
              storeName: 'SuperMarché Local',
              estimatedTotal: 33,
              savings: 2,
              distance: 1.2
            }
          ],
          bulkBuyingOpportunities: [
            {
              productId: 'prod2',
              name: 'Riz',
              currentQuantity: 1,
              bulkQuantity: 5,
              savings: 3.5
            }
          ],
          seasonalSubstitutions: [
            {
              originalProduct: 'tomatoes_imported',
              seasonalAlternative: 'tomatoes_local',
              savings: 1.2,
              availabilityPeriod: 'summer'
            }
          ]
        },
        alternativeOptions: [
          {
            mealId: 'meal1',
            alternatives: [
              {
                recipeId: 'recipe_alt1',
                recipeName: 'Pâtes à l\'ail',
                estimatedCost: 8,
                reason: 'Cheaper alternative'
              }
            ]
          }
        ],
        aiGenerated: true,
        intelligenceVersion: '2.0',
        intelligenceInsights: [
          {
            type: 'preference_insight',
            description: 'User prefers Italian cuisine',
            confidence: 0.9
          }
        ],
        recommendations: [
          {
            type: 'cooking_tip',
            description: 'Prepare pasta water in advance',
            priority: 2
          }
        ],
        status: 'draft',
        isOptimized: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Type validation
      expect(validPlan.id).toBeTruthy();
      expect(validPlan.meals.length).toBeGreaterThan(0);
      expect(validPlan.nutritionalSummary).toBeDefined();
      expect(validPlan.shoppingList).toBeDefined();
      expect(validPlan.aiGenerated).toBe(true);
    });

    it('should validate OptimizationScore structure', () => {
      const validScore: OptimizationScore = {
        overall: 0.85,
        nutrition: 0.90,
        budget: 0.80,
        variety: 0.85,
        timeEfficiency: 0.88,
        seasonality: 0.75,
        inventoryUtilization: 0.82,
        sustainability: 0.78
      };

      expect(validScore.overall).toBeGreaterThan(0);
      expect(validScore.overall).toBeLessThanOrEqual(1);
      expect(validScore.nutrition).toBeLessThanOrEqual(1);
      expect(validScore.budget).toBeLessThanOrEqual(1);
      expect(validScore.variety).toBeLessThanOrEqual(1);
    });

    it('should validate BudgetConstraints structure', () => {
      const validConstraints: BudgetConstraints = {
        weeklyBudget: 60,
        maxMealCost: 15,
        strictMode: true,
        preferredStores: ['store1', 'store2'],
        bulkBuyingEnabled: true
      };

      expect(validConstraints.weeklyBudget).toBeGreaterThan(0);
      expect(validConstraints.maxMealCost).toBeGreaterThan(0);
      expect(typeof validConstraints.strictMode).toBe('boolean');
    });

    it('should validate NutritionalGoals structure', () => {
      const validGoals: NutritionalGoals = {
        targetCalories: 2200,
        macroDistribution: {
          protein: 0.25,
          carbs: 0.45,
          fat: 0.30
        },
        specificGoals: ['high_protein', 'low_sodium'],
        allergens: ['nuts', 'dairy'],
        vitaminTargets: {
          vitaminC: 90,
          vitaminD: 20,
          iron: 15
        }
      };

      expect(validGoals.targetCalories).toBeGreaterThan(0);
      expect(validGoals.macroDistribution.protein + 
             validGoals.macroDistribution.carbs + 
             validGoals.macroDistribution.fat).toBeCloseTo(1, 1);
    });
  });

  describe('Type Compatibility', () => {
    it('should ensure MealPlanEntry is compatible with WeeklyMealPlan', () => {
      const meal: MealPlanEntry = {
        id: 'meal1',
        userId: 'user123',
        recipeId: 'recipe1',
        recipeName: 'Test Meal',
        mealType: 'lunch',
        dayOfWeek: 1,
        servings: 4
      };

      const plan: WeeklyMealPlan = {
        id: 'plan1',
        userId: 'user123',
        name: 'Test Plan',
        weekStartDate: new Date(),
        meals: [meal], // Should accept MealPlanEntry
        totalEstimatedCost: 0,
        status: 'draft',
        createdAt: new Date()
      };

      expect(plan.meals[0]).toBe(meal);
      expect(plan.meals[0].userId).toBe(plan.userId);
    });

    it('should ensure RecipeCandidate extends recipe data', () => {
      const candidate: RecipeCandidate = {
        recipe: {
          id: 'recipe1',
          title: 'Test Recipe',
          prep_time: 20,
          cook_time: 25
        },
        score: 0.8,
        matchReasons: ['Good fit'],
        missingIngredients: [],
        inventoryMatch: 0.7,
        seasonalScore: 0.8,
        nutritionalFit: 0.85,
        budgetFit: 0.75
      };

      expect(candidate.recipe.id).toBeTruthy();
      expect(candidate.score).toBeGreaterThan(0);
      expect(candidate.score).toBeLessThanOrEqual(1);
    });
  });

  describe('Enum Validation', () => {
    it('should validate optimization modes', () => {
      const validModes: Array<PlanningRequest['optimizationMode']> = [
        'budget',
        'nutrition',
        'time',
        'balanced'
      ];

      validModes.forEach(mode => {
        const request: PlanningRequest = {
          userId: 'user123',
          optimizationMode: mode,
          preferences: {} as UserPreferences,
          constraints: {} as PlanningConstraints
        };

        expect(['budget', 'nutrition', 'time', 'balanced']).toContain(request.optimizationMode);
      });
    });

    it('should validate meal types', () => {
      const validMealTypes: Array<MealPlanEntry['mealType']> = [
        'breakfast',
        'lunch',
        'dinner',
        'snack'
      ];

      validMealTypes.forEach(mealType => {
        const meal: MealPlanEntry = {
          id: 'meal1',
          userId: 'user123',
          recipeId: 'recipe1',
          recipeName: 'Test',
          mealType,
          dayOfWeek: 0,
          servings: 4
        };

        expect(['breakfast', 'lunch', 'dinner', 'snack']).toContain(meal.mealType);
      });
    });

    it('should validate plan status', () => {
      const validStatuses: Array<WeeklyMealPlan['status']> = [
        'draft',
        'active',
        'completed',
        'archived'
      ];

      validStatuses.forEach(status => {
        const plan: WeeklyMealPlan = {
          id: 'plan1',
          userId: 'user123',
          name: 'Test',
          weekStartDate: new Date(),
          meals: [],
          totalEstimatedCost: 0,
          status,
          createdAt: new Date()
        };

        expect(['draft', 'active', 'completed', 'archived']).toContain(plan.status);
      });
    });
  });

  describe('Required vs Optional Fields', () => {
    it('should allow minimal valid PlanningRequest', () => {
      const minimalRequest: PlanningRequest = {
        userId: 'user123',
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
          familySize: 2,
          nutritionalGoals: {
            targetCalories: 1800,
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

      expect(minimalRequest.userId).toBeTruthy();
      expect(minimalRequest.preferences).toBeDefined();
      expect(minimalRequest.constraints).toBeDefined();
    });

    it('should allow minimal valid MealPlanEntry', () => {
      const minimalEntry: MealPlanEntry = {
        id: 'meal1',
        userId: 'user123',
        recipeId: 'recipe1',
        recipeName: 'Simple Meal',
        mealType: 'lunch',
        dayOfWeek: 2,
        servings: 3
      };

      expect(minimalEntry.id).toBeTruthy();
      expect(minimalEntry.recipeId).toBeTruthy();
      expect(minimalEntry.dayOfWeek).toBeGreaterThanOrEqual(0);
      expect(minimalEntry.dayOfWeek).toBeLessThan(7);
      expect(minimalEntry.servings).toBeGreaterThan(0);
    });

    it('should handle optional fields gracefully', () => {
      const entryWithOptionals: MealPlanEntry = {
        id: 'meal1',
        userId: 'user123',
        recipeId: 'recipe1',
        recipeName: 'Full Meal',
        mealType: 'dinner',
        dayOfWeek: 3,
        servings: 4,
        estimatedCost: 15,
        prepTime: 30,
        cookTime: 25,
        difficulty: 3,
        nutritionalInfo: {
          calories: 550,
          protein: 25,
          carbs: 65,
          fat: 18,
          fiber: 8,
          sodium: 450
        },
        requiredIngredients: [
          {
            name: 'chicken',
            quantity: '500g',
            unit: 'g',
            category: 'protein'
          }
        ],
        missingIngredients: [],
        confidence: 0.92,
        tags: ['healthy', 'family-friendly'],
        notes: 'Kid-approved recipe',
        aiGenerated: true,
        budgetOptimization: {
          type: 'ingredient_substitution',
          originalCost: 18,
          savings: 3
        }
      };

      expect(entryWithOptionals.estimatedCost).toBeDefined();
      expect(entryWithOptionals.nutritionalInfo?.calories).toBe(550);
      expect(entryWithOptionals.requiredIngredients?.length).toBe(1);
      expect(entryWithOptionals.aiGenerated).toBe(true);
    });
  });

  describe('Business Logic Validation', () => {
    it('should ensure macro distribution sums to 1', () => {
      const validateMacroDistribution = (macros: { protein: number; carbs: number; fat: number }) => {
        const sum = macros.protein + macros.carbs + macros.fat;
        return Math.abs(sum - 1) < 0.01; // Allow small floating point errors
      };

      expect(validateMacroDistribution({ protein: 0.3, carbs: 0.4, fat: 0.3 })).toBe(true);
      expect(validateMacroDistribution({ protein: 0.2, carbs: 0.5, fat: 0.2 })).toBe(false);
    });

    it('should ensure dayOfWeek is valid', () => {
      const validateDayOfWeek = (day: number) => day >= 0 && day < 7;

      expect(validateDayOfWeek(0)).toBe(true); // Sunday
      expect(validateDayOfWeek(6)).toBe(true); // Saturday
      expect(validateDayOfWeek(7)).toBe(false); // Invalid
      expect(validateDayOfWeek(-1)).toBe(false); // Invalid
    });

    it('should ensure budget constraints are realistic', () => {
      const validateBudgetConstraints = (constraints: BudgetConstraints) => {
        return constraints.weeklyBudget > 0 && 
               constraints.maxMealCost > 0 &&
               constraints.maxMealCost <= constraints.weeklyBudget;
      };

      const validConstraints: BudgetConstraints = {
        weeklyBudget: 50,
        maxMealCost: 12,
        strictMode: false
      };

      const invalidConstraints: BudgetConstraints = {
        weeklyBudget: 30,
        maxMealCost: 35, // More than weekly budget
        strictMode: true
      };

      expect(validateBudgetConstraints(validConstraints)).toBe(true);
      expect(validateBudgetConstraints(invalidConstraints)).toBe(false);
    });

    it('should ensure time constraints are logical', () => {
      const validateTimeConstraints = (constraints: TimeConstraints) => {
        return constraints.maxPrepTime > 0 && 
               constraints.maxCookTime > 0 &&
               constraints.maxPrepTime + constraints.maxCookTime <= 180; // Max 3 hours total
      };

      const validConstraints: TimeConstraints = {
        maxPrepTime: 45,
        maxCookTime: 60,
        availableTimeSlots: []
      };

      const invalidConstraints: TimeConstraints = {
        maxPrepTime: 120,
        maxCookTime: 120, // Total 4 hours - unrealistic
        availableTimeSlots: []
      };

      expect(validateTimeConstraints(validConstraints)).toBe(true);
      expect(validateTimeConstraints(invalidConstraints)).toBe(false);
    });
  });

  describe('Type Safety', () => {
    it('should enforce string literal types for optimization modes', () => {
      // This test ensures TypeScript compilation catches invalid modes
      const request = {
        optimizationMode: 'balanced' as const
      };

      // Should accept valid modes
      const validModes: PlanningRequest['optimizationMode'][] = [
        'budget', 'nutrition', 'time', 'balanced'
      ];

      expect(validModes.includes(request.optimizationMode)).toBe(true);
    });

    it('should enforce meal type constraints', () => {
      const mealTypes: MealPlanEntry['mealType'][] = [
        'breakfast', 'lunch', 'dinner', 'snack'
      ];

      mealTypes.forEach(mealType => {
        const entry: Pick<MealPlanEntry, 'mealType'> = { mealType };
        expect(['breakfast', 'lunch', 'dinner', 'snack']).toContain(entry.mealType);
      });
    });

    it('should enforce status type constraints', () => {
      const statuses: WeeklyMealPlan['status'][] = [
        'draft', 'active', 'completed', 'archived'
      ];

      statuses.forEach(status => {
        const plan: Pick<WeeklyMealPlan, 'status'> = { status };
        expect(['draft', 'active', 'completed', 'archived']).toContain(plan.status);
      });
    });
  });

  describe('Data Structure Integrity', () => {
    it('should maintain referential integrity between plan and meals', () => {
      const plan: WeeklyMealPlan = {
        id: 'plan123',
        userId: 'user123',
        name: 'Test Plan',
        weekStartDate: new Date(),
        meals: [
          {
            id: 'meal1',
            userId: 'user123', // Should match plan.userId
            recipeId: 'recipe1',
            recipeName: 'Test Meal',
            mealType: 'lunch',
            dayOfWeek: 1,
            servings: 4
          }
        ],
        totalEstimatedCost: 0,
        status: 'draft',
        createdAt: new Date()
      };

      // All meals should belong to the same user as the plan
      plan.meals.forEach(meal => {
        expect(meal.userId).toBe(plan.userId);
      });
    });

    it('should ensure shopping list consistency with meals', () => {
      const plan: WeeklyMealPlan = {
        id: 'plan123',
        userId: 'user123',
        name: 'Test Plan',
        weekStartDate: new Date(),
        meals: [
          {
            id: 'meal1',
            userId: 'user123',
            recipeId: 'recipe1',
            recipeName: 'Test Meal',
            mealType: 'dinner',
            dayOfWeek: 0,
            servings: 4,
            estimatedCost: 12,
            requiredIngredients: [
              { name: 'chicken', quantity: '500g', unit: 'g' }
            ]
          }
        ],
        totalEstimatedCost: 12,
        shoppingList: {
          totalCost: 10, // Should be related to meal costs
          estimatedSavings: 2,
          items: [
            {
              productId: 'prod1',
              name: 'chicken', // Should match required ingredients
              quantity: 0.5,
              unit: 'kg',
              estimatedCost: 8,
              category: 'protein'
            }
          ],
          storeRecommendations: [],
          bulkBuyingOpportunities: [],
          seasonalSubstitutions: []
        },
        status: 'draft',
        createdAt: new Date()
      };

      // Shopping list should include ingredients from meals
      const mealIngredients = plan.meals.flatMap(meal => 
        meal.requiredIngredients?.map(ing => ing.name.toLowerCase()) || []
      );
      const shoppingItems = plan.shoppingList?.items.map(item => 
        item.name.toLowerCase()
      ) || [];

      const hasMatchingIngredients = mealIngredients.some(ingredient =>
        shoppingItems.includes(ingredient)
      );

      expect(hasMatchingIngredients).toBe(true);
    });
  });

  describe('Edge Case Handling', () => {
    it('should handle empty arrays gracefully', () => {
      const emptyPlan: WeeklyMealPlan = {
        id: 'plan123',
        userId: 'user123',
        name: 'Empty Plan',
        weekStartDate: new Date(),
        meals: [], // Empty meals array
        totalEstimatedCost: 0,
        status: 'draft',
        createdAt: new Date()
      };

      expect(emptyPlan.meals.length).toBe(0);
      expect(emptyPlan.totalEstimatedCost).toBe(0);
    });

    it('should handle undefined optional fields', () => {
      const mealWithUndefineds: MealPlanEntry = {
        id: 'meal1',
        userId: 'user123',
        recipeId: 'recipe1',
        recipeName: 'Minimal Meal',
        mealType: 'lunch',
        dayOfWeek: 2,
        servings: 4,
        estimatedCost: undefined,
        prepTime: undefined,
        nutritionalInfo: undefined,
        tags: undefined
      };

      // Should not throw errors with undefined optionals
      expect(mealWithUndefineds.estimatedCost).toBeUndefined();
      expect(mealWithUndefineds.nutritionalInfo).toBeUndefined();
    });
  });

  describe('Complex Type Relationships', () => {
    it('should handle nested shopping list structure', () => {
      const complexShoppingList = {
        totalCost: 45.50,
        estimatedSavings: 7.25,
        items: [
          {
            productId: 'prod1',
            name: 'Organic Chicken Breast',
            quantity: 1.2,
            unit: 'kg',
            estimatedCost: 14.40,
            category: 'protein',
            store: 'BioCoop',
            alternatives: [
              {
                productId: 'prod1_alt',
                name: 'Regular Chicken Breast',
                estimatedCost: 10.80,
                store: 'SuperMarché'
              }
            ]
          }
        ],
        storeRecommendations: [
          {
            storeId: 'store1',
            storeName: 'BioCoop Centre',
            estimatedTotal: 43.20,
            savings: 2.30,
            distance: 0.8,
            deliveryAvailable: true,
            specialOffers: [
              {
                productId: 'prod2',
                discount: 0.20,
                description: '20% off organic vegetables'
              }
            ]
          }
        ],
        bulkBuyingOpportunities: [
          {
            productId: 'prod3',
            name: 'Pasta',
            currentQuantity: 1,
            bulkQuantity: 5,
            savings: 4.50,
            expirationRisk: 'low'
          }
        ],
        seasonalSubstitutions: [
          {
            originalProduct: 'imported_tomatoes',
            seasonalAlternative: 'local_tomatoes',
            savings: 2.10,
            availabilityPeriod: 'june_september',
            qualityImprovement: true
          }
        ]
      };

      // Validate nested structure
      expect(complexShoppingList.items[0].alternatives).toBeDefined();
      expect(complexShoppingList.storeRecommendations[0].specialOffers).toBeDefined();
      expect(complexShoppingList.bulkBuyingOpportunities[0].expirationRisk).toBeDefined();
      expect(complexShoppingList.seasonalSubstitutions[0].qualityImprovement).toBe(true);
    });

    it('should handle AI-generated metadata', () => {
      const aiMeal: MealPlanEntry = {
        id: 'ai_meal1',
        userId: 'user123',
        recipeId: 'recipe1',
        recipeName: 'AI Recommended Pasta',
        mealType: 'dinner',
        dayOfWeek: 4,
        servings: 4,
        aiGenerated: true,
        confidence: 0.88,
        generatedBy: 'smart_recommender',
        learningSource: 'user_behavior',
        adaptationHistory: [
          {
            timestamp: new Date(),
            reason: 'weather_change',
            changes: ['increased_portions']
          }
        ]
      };

      expect(aiMeal.aiGenerated).toBe(true);
      expect(aiMeal.confidence).toBeGreaterThan(0.8);
      expect(aiMeal.adaptationHistory).toBeDefined();
    });
  });
});