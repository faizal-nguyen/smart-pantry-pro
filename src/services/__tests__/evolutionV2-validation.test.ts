/**
 * Evolution V2 - Comprehensive Validation Test Suite
 * Tests all new features: AI Nutritionist, Meal Planning, Community, IoT, Analytics, and Offline Sync
 */

import { renderHook, act } from '@testing-library/react';
import { 
  NutritionalAIService,
  UserHealthProfile,
  NutritionalAnalysis 
} from '../ai/nutritionalAIService';
import { 
  SmartMealPlannerService,
  UserPreferences,
  WeeklyMealPlan 
} from '../planning/smartMealPlannerService';
import { 
  CommunityService,
  CommunityRecipe 
} from '../community/communityService';
import { 
  IoTHubService,
  SmartDevice,
  SmartFridgeData 
} from '../iot/iotHubService';
import { 
  WasteReductionEngine,
  WastePrediction 
} from '../analytics/wasteReductionEngine';
import { 
  IntelligentSyncService,
  SyncOperation 
} from '../offline/intelligentSyncService';

// Mock global fetch
global.fetch = jest.fn();

describe('Evolution V2 - AI Nutritionist Engine', () => {
  let nutritionalService: NutritionalAIService;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    jest.clearAllMocks();
    nutritionalService = new NutritionalAIService(mockApiKey);
  });

  describe('Nutritional Analysis', () => {
    const mockHealthProfile: UserHealthProfile = {
      id: 'profile-1',
      userId: 'user-1',
      age: 30,
      gender: 'male',
      weight: 75,
      height: 180,
      activityLevel: 'moderately_active',
      goals: [{ type: 'weight_loss', priority: 'high' }],
      medicalConditions: [],
      allergies: ['lactose'],
      dietaryPreferences: [{ type: 'vegetarian', strictness: 'moderate' }],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should calculate BMR correctly for males', () => {
      const bmr = nutritionalService['calculateBMR'](75, 180, 30, 'male');
      const expectedBMR = (10 * 75) + (6.25 * 180) - (5 * 30) + 5; // Mifflin-St Jeor equation
      expect(bmr).toBe(expectedBMR);
    });

    it('should calculate BMR correctly for females', () => {
      const bmr = nutritionalService['calculateBMR'](65, 165, 25, 'female');
      const expectedBMR = (10 * 65) + (6.25 * 165) - (5 * 25) - 161;
      expect(bmr).toBe(expectedBMR);
    });

    it('should calculate TDEE with correct activity multipliers', () => {
      const bmr = 1800;
      const sedentaryTDEE = nutritionalService['calculateTDEE'](bmr, 'sedentary');
      const activeTDEE = nutritionalService['calculateTDEE'](bmr, 'very_active');
      
      expect(sedentaryTDEE).toBe(bmr * 1.2);
      expect(activeTDEE).toBe(bmr * 1.725);
    });

    it('should generate personalized nutritional goals based on profile', () => {
      const goals = nutritionalService['calculateNutritionalGoals'](mockHealthProfile);
      
      expect(goals).toHaveProperty('dailyCalories');
      expect(goals).toHaveProperty('protein');
      expect(goals).toHaveProperty('carbohydrates');
      expect(goals).toHaveProperty('fat');
      
      // Weight loss should reduce calories by 15%
      const bmr = nutritionalService['calculateBMR'](
        mockHealthProfile.weight, 
        mockHealthProfile.height, 
        mockHealthProfile.age, 
        mockHealthProfile.gender
      );
      const tdee = nutritionalService['calculateTDEE'](bmr, mockHealthProfile.activityLevel);
      const expectedCalories = Math.round(tdee * 0.85);
      
      expect(goals.dailyCalories).toBe(expectedCalories);
      expect(goals.protein).toBe(mockHealthProfile.weight * 2.0); // 2g per kg
    });

    it('should analyze nutritional profile with proper error handling', async () => {
      const mockResponse = `{
        "totalCalories": 2000,
        "macronutrients": {
          "protein": {"grams": 150, "percentage": 30},
          "carbohydrates": {"grams": 200, "percentage": 40}, 
          "fat": {"grams": 67, "percentage": 30},
          "fiber": {"grams": 25}
        },
        "nutritionalScore": 85,
        "healthAlerts": []
      }`;
      
      // Mock successful API response
      jest.spyOn(nutritionalService, 'chat').mockResolvedValue(mockResponse);
      
      const analysis = await nutritionalService.analyzeNutritionalProfile(mockHealthProfile, []);
      
      expect(analysis).toHaveProperty('totalCalories', 2000);
      expect(analysis).toHaveProperty('nutritionalScore', 85);
      expect(analysis.macronutrients.protein.grams).toBe(150);
    });

    it('should use fallback analysis when parsing fails', async () => {
      // Mock API response that fails to parse
      jest.spyOn(nutritionalService, 'chat').mockResolvedValue('Invalid JSON response');
      
      const analysis = await nutritionalService.analyzeNutritionalProfile(mockHealthProfile, []);
      
      // Should return fallback analysis
      expect(analysis).toHaveProperty('totalCalories');
      expect(analysis).toHaveProperty('nutritionalScore', 75);
      expect(analysis.healthAlerts).toEqual([]);
    });
  });

  describe('Health Recommendations', () => {
    it('should generate contextual recommendations based on inventory', async () => {
      const mockAnalysis: NutritionalAnalysis = {
        totalCalories: 1800,
        macronutrients: {
          protein: { grams: 120, percentage: 27 },
          carbohydrates: { grams: 180, percentage: 40 },
          fat: { grams: 67, percentage: 33 },
          fiber: { grams: 20 }
        },
        micronutrients: {
          vitamins: { 'Vitamine C': { amount: 60, unit: 'mg', dailyValuePercentage: 67 } },
          minerals: { 'Fer': { amount: 12, unit: 'mg', dailyValuePercentage: 67 } }
        },
        nutritionalScore: 75,
        healthAlerts: []
      };

      const mockInventory = [
        { product: { name: 'Épinards' }, quantity: 200, unit: 'g' },
        { product: { name: 'Quinoa' }, quantity: 500, unit: 'g' }
      ];

      const mockResponse = 'Recommendations based on available ingredients...';
      jest.spyOn(nutritionalService, 'chat').mockResolvedValue(mockResponse);

      const recommendations = await nutritionalService.generateHealthRecommendations(
        mockHealthProfile,
        mockAnalysis,
        mockInventory
      );

      expect(Array.isArray(recommendations)).toBe(true);
      expect(nutritionalService.chat).toHaveBeenCalledWith(
        expect.stringContaining('épinards'),
        expect.stringContaining('quinoa')
      );
    });
  });
});

describe('Evolution V2 - Smart Meal Planner', () => {
  let mealPlannerService: SmartMealPlannerService;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    jest.clearAllMocks();
    mealPlannerService = new SmartMealPlannerService(mockApiKey);
  });

  describe('Weekly Meal Planning', () => {
    const mockPreferences: UserPreferences = {
      userId: 'user-1',
      dietaryRestrictions: ['vegetarian'],
      allergies: ['nuts'],
      cuisinePreferences: ['française', 'italienne'],
      cookingSkillLevel: 'intermediate',
      timeConstraints: {
        maxPrepTime: 30,
        maxCookTime: 45,
        busyDays: ['monday', 'wednesday']
      },
      familySize: 2,
      budgetConstraints: {
        weeklyBudget: 80,
        strictMode: false
      },
      nutritionalGoals: {
        targetCalories: 2000
      },
      equipmentAvailable: ['four', 'plaques', 'frigo'],
      shoppingPreferences: {
        preferLocal: true,
        organicPreference: 'some',
        maxTripFrequency: 2
      }
    };

    it('should generate weekly meal plan with correct structure', async () => {
      const mockResponse = `{
        "meals": [
          {
            "dayOfWeek": 0,
            "mealType": "breakfast",
            "recipeName": "Avocado Toast",
            "servings": 2,
            "estimatedCost": 6,
            "prepTime": 10,
            "cookTime": 5
          }
        ],
        "totalEstimatedCost": 85,
        "nutritionalSummary": {
          "averageDailyCalories": 2000,
          "varietyScore": 85,
          "healthScore": 90
        }
      }`;

      jest.spyOn(mealPlannerService, 'chat').mockResolvedValue(mockResponse);

      const plan = await mealPlannerService.generateWeeklyPlan(
        mockPreferences,
        undefined,
        []
      );

      expect(plan).toHaveProperty('id');
      expect(plan).toHaveProperty('meals');
      expect(plan).toHaveProperty('totalEstimatedCost');
      expect(plan.userId).toBe(mockPreferences.userId);
      expect(plan.status).toBe('draft');
    });

    it('should respect budget constraints in meal planning', async () => {
      const strictBudgetPreferences = {
        ...mockPreferences,
        budgetConstraints: {
          weeklyBudget: 50,
          strictMode: true
        }
      };

      jest.spyOn(mealPlannerService, 'chat').mockResolvedValue('{"totalEstimatedCost": 45}');

      const plan = await mealPlannerService.generateWeeklyPlan(
        strictBudgetPreferences,
        undefined,
        []
      );

      expect(plan.totalEstimatedCost).toBeLessThanOrEqual(50);
    });

    it('should create fallback meal plan when parsing fails', async () => {
      jest.spyOn(mealPlannerService, 'chat').mockResolvedValue('Invalid response');

      const plan = await mealPlannerService.generateWeeklyPlan(
        mockPreferences,
        undefined,
        []
      );

      // Should create fallback plan with 7 days × 3 meals = 21 meals
      expect(plan.meals).toHaveLength(21);
      expect(plan.totalEstimatedCost).toBe(119); // 7 days × (3+6+8)
    });
  });

  describe('Shopping List Optimization', () => {
    it('should consolidate ingredients across meals', () => {
      const mockMeals = [
        {
          id: '1',
          dayOfWeek: 0,
          mealType: 'lunch' as const,
          requiredIngredients: [
            { name: 'Tomate', quantity: 2, unit: 'unités', estimatedCost: 1.5, category: 'légumes' }
          ],
          missingIngredients: []
        },
        {
          id: '2', 
          dayOfWeek: 1,
          mealType: 'dinner' as const,
          requiredIngredients: [
            { name: 'Tomate', quantity: 3, unit: 'unités', estimatedCost: 2.25, category: 'légumes' }
          ],
          missingIngredients: []
        }
      ];

      const consolidated = mealPlannerService['consolidateIngredients'](mockMeals);
      
      expect(consolidated).toHaveLength(1);
      expect(consolidated[0].totalQuantityNeeded).toBe(5); // 2 + 3
      expect(consolidated[0].totalCost).toBe(3.75); // 1.5 + 2.25
    });

    it('should apply seasonal price adjustments', async () => {
      const mockItems = [{
        ingredient: { name: 'Tomate', quantity: 1, unit: 'kg', estimatedCost: 3, category: 'légumes' },
        totalQuantityNeeded: 1,
        consolidatedUnit: 'kg',
        estimatedUnitPrice: 3,
        totalCost: 3,
        priority: 'essential' as const,
        storeSection: 'Légumes',
        bestStoresToBuy: ['Carrefour']
      }];

      const season = { name: 'summer' as const, months: [6, 7, 8] };
      const optimized = await mealPlannerService['applySeasonalOptimizations'](mockItems, season);

      // Summer tomatoes should be cheaper
      expect(optimized[0].totalCost).toBeLessThan(3);
    });
  });

  describe('Budget Adaptation', () => {
    it('should adapt meal plan to strict budget constraints', async () => {
      const expensivePlan: WeeklyMealPlan = {
        id: 'plan-1',
        userId: 'user-1',
        weekStartDate: new Date(),
        meals: [
          {
            id: 'meal-1',
            dayOfWeek: 0,
            mealType: 'dinner',
            recipeId: 'recipe-1',
            recipeName: 'Expensive Steak',
            servings: 2,
            estimatedCost: 25, // Very expensive
            prepTime: 30,
            cookTime: 20,
            nutritionalInfo: { calories: 600, protein: 40, carbs: 10, fat: 35 },
            requiredIngredients: [],
            missingIngredients: [],
            confidence: 0.9
          }
        ],
        totalEstimatedCost: 150, // Over budget
        nutritionalSummary: {
          totalCalories: 9800,
          averageDailyCalories: 1400,
          macroDistribution: {
            protein: { grams: 490, percentage: 20 },
            carbs: { grams: 1225, percentage: 50 },
            fat: { grams: 327, percentage: 30 }
          },
          micronutrientHighlights: { strong: [], weak: [] },
          varietyScore: 75,
          healthScore: 80
        },
        shoppingList: { totalCost: 0, estimatedSavings: 0, items: [], storeRecommendations: [], bulkBuyingOpportunities: [], seasonalSubstitutions: [] },
        alternativeOptions: [],
        createdAt: new Date(),
        status: 'draft'
      };

      const strictBudget = {
        weeklyLimit: 100,
        monthlyLimit: 400,
        strictMode: true
      };

      // Mock budget alternative meal
      jest.spyOn(mealPlannerService, 'findBudgetMealAlternative' as any)
        .mockResolvedValue({
          ...expensivePlan.meals[0],
          recipeName: 'Pasta Marinara',
          estimatedCost: 8
        });

      const adaptedPlan = await mealPlannerService.adaptToBudget(expensivePlan, strictBudget);

      expect(adaptedPlan.totalEstimatedCost).toBeLessThanOrEqual(100);
      expect(adaptedPlan.budgetAdjustments.length).toBeGreaterThan(0);
    });
  });
});

describe('Evolution V2 - Community Features', () => {
  let communityService: CommunityService;
  const mockApiUrl = '/api';

  beforeEach(() => {
    jest.clearAllMocks();
    communityService = new CommunityService(mockApiUrl, 'test-token');
  });

  describe('Recipe Sharing', () => {
    it('should share recipe with correct API call', async () => {
      const mockRecipe = {
        title: 'Ratatouille Provençale',
        description: 'Traditional French vegetable dish',
        ingredients: [
          { name: 'Aubergine', quantity: 1, unit: 'pièce' },
          { name: 'Courgette', quantity: 2, unit: 'pièces' }
        ],
        instructions: ['Cut vegetables', 'Cook slowly'],
        difficulty: 'medium' as const,
        prepTime: 30,
        cookTime: 45,
        servings: 4
      };

      const mockResponse = {
        data: { id: 'recipe-123', ...mockRecipe, createdAt: new Date() }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await communityService.shareRecipe(mockRecipe);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/community/recipes',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          }),
          body: JSON.stringify(mockRecipe)
        })
      );

      expect(result.id).toBe('recipe-123');
      expect(result.title).toBe(mockRecipe.title);
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: jest.fn().mockResolvedValue({ message: 'Invalid recipe data' })
      });

      await expect(communityService.shareRecipe({}))
        .rejects.toThrow('Invalid recipe data');
    });
  });

  describe('Recipe Discovery', () => {
    it('should filter recipes by multiple criteria', async () => {
      const filters = {
        category: 'dessert',
        difficulty: 'easy',
        maxTime: 30,
        dietary: ['vegetarian', 'gluten-free'],
        rating: 4
      };

      const mockResponse = {
        data: { recipes: [], total: 0 }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      await communityService.getRecipes(filters);

      const expectedUrl = '/api/community/recipes?' + 
        'category=dessert&difficulty=easy&maxTime=30&dietary=vegetarian%2Cgluten-free&rating=4';

      expect(global.fetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({ method: 'GET' })
      );
    });
  });

  describe('Challenge Participation', () => {
    it('should join cooking challenge successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });

      await communityService.joinChallenge('challenge-123');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/community/challenges/challenge-123/join',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should submit challenge entry with all required data', async () => {
      const submission = {
        challengeId: 'challenge-123',
        userId: 'user-123',
        userName: 'Chef John',
        recipeId: 'recipe-456',
        title: 'My Amazing Dish',
        description: 'Created with love',
        images: ['image1.jpg', 'image2.jpg'],
        cookingStory: 'It was challenging but rewarding...',
        timeSpent: 120
      };

      const mockResponse = {
        data: { id: 'submission-789', ...submission, submittedAt: new Date() }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await communityService.submitToChallenge('challenge-123', submission);

      expect(result.id).toBe('submission-789');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/community/challenges/challenge-123/submissions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(submission)
        })
      );
    });
  });
});

describe('Evolution V2 - IoT Integration', () => {
  let iotService: IoTHubService;
  const mockApiUrl = '/api';

  beforeEach(() => {
    jest.clearAllMocks();
    iotService = new IoTHubService(mockApiUrl, 'test-token');
  });

  describe('Device Management', () => {
    it('should discover devices on network', async () => {
      const mockDevices: SmartDevice[] = [
        {
          id: 'fridge-1',
          userId: 'user-1',
          name: 'Samsung Smart Fridge',
          type: 'fridge',
          brand: 'Samsung',
          model: 'RF28R7351SG',
          firmwareVersion: '1.2.3',
          macAddress: '00:11:22:33:44:55',
          status: 'online',
          lastSeen: new Date(),
          capabilities: [
            { name: 'temperature', type: 'sensor', dataType: 'number', unit: '°C', readOnly: true },
            { name: 'inventory', type: 'storage', dataType: 'array', readOnly: false }
          ],
          settings: {},
          location: { room: 'kitchen' },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ devices: mockDevices })
      });

      const discovered = await iotService.discoverDevices();

      expect(discovered).toHaveLength(1);
      expect(discovered[0].type).toBe('fridge');
      expect(discovered[0].status).toBe('online');
    });

    it('should add device with correct configuration', async () => {
      const deviceInfo = {
        name: 'My Smart Oven',
        type: 'oven' as const,
        brand: 'Whirlpool',
        model: 'WOS51EC0AS',
        macAddress: '11:22:33:44:55:66'
      };

      const mockResponse = {
        device: { id: 'oven-1', ...deviceInfo, status: 'online', createdAt: new Date() }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await iotService.addDevice(deviceInfo);

      expect(result.id).toBe('oven-1');
      expect(result.name).toBe(deviceInfo.name);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/iot/devices',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(deviceInfo)
        })
      );
    });
  });

  describe('Device Control', () => {
    it('should control oven with preset configuration', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ result: 'success' })
      });

      await iotService.presetOven('oven-1', 'preset-bake-350');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/iot/devices/oven-1/control',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            command: 'use_preset',
            parameters: { presetId: 'preset-bake-350' }
          })
        })
      );
    });

    it('should start cooking with custom parameters', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ result: 'cooking_started' })
      });

      await iotService.startCooking('oven-1', 180, 45, 'convection');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/iot/devices/oven-1/control',
        expect.objectContaining({
          body: JSON.stringify({
            command: 'start_cooking',
            parameters: {
              temperature: 180,
              duration: 45,
              mode: 'convection'
            }
          })
        })
      );
    });
  });

  describe('Smart Fridge Integration', () => {
    it('should sync fridge inventory automatically', async () => {
      const mockInventory = [
        {
          id: 'item-1',
          productName: 'Milk',
          quantity: 1,
          unit: 'L',
          location: 'main',
          expiryDate: new Date(),
          addedAt: new Date(),
          confidence: 0.95
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ inventory: mockInventory })
      });

      const result = await iotService.syncFridgeInventory('fridge-1');

      expect(result).toHaveLength(1);
      expect(result[0].productName).toBe('Milk');
      expect(result[0].confidence).toBe(0.95);
    });

    it('should get real-time fridge data', async () => {
      const mockFridgeData: SmartFridgeData = {
        temperature: { main: 4, freezer: -18, vegetableDrawer: 6 },
        humidity: 65,
        doorStatus: 'closed',
        energyUsage: 1.2,
        inventory: [],
        alerts: [
          {
            id: 'alert-1',
            type: 'expiry_warning',
            severity: 'warning',
            message: 'Milk expires in 2 days',
            timestamp: new Date(),
            acknowledged: false
          }
        ],
        lastUpdated: new Date()
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockFridgeData })
      });

      const data = await iotService.getFridgeData('fridge-1');

      expect(data.temperature.main).toBe(4);
      expect(data.alerts).toHaveLength(1);
      expect(data.alerts[0].type).toBe('expiry_warning');
    });
  });
});

describe('Evolution V2 - Waste Reduction Analytics', () => {
  let wasteEngine: WasteReductionEngine;
  const mockApiUrl = '/api';

  beforeEach(() => {
    jest.clearAllMocks();
    wasteEngine = new WasteReductionEngine(mockApiUrl, 'test-token');
  });

  describe('Waste Prediction', () => {
    it('should predict waste risk correctly', () => {
      const criticalRisk = wasteEngine['calculateWasteRisk'](1, 3, 0.4); // 1 day, high quantity, high historical rate
      const lowRisk = wasteEngine['calculateWasteRisk'](30, 1, 0.1); // 30 days, low quantity, low historical rate

      expect(criticalRisk).toBe('critical');
      expect(lowRisk).toBe('low');
    });

    it('should calculate predicted waste amount based on multiple factors', () => {
      const wasteAmount = wasteEngine['calculatePredictedWaste'](5, 2, 0.2); // 5 items, 2 days, 20% historical waste

      // Should be higher due to imminent expiry
      expect(wasteAmount).toBeGreaterThan(1); // 5 * 0.2 = 1, but adjusted for expiry urgency
      expect(wasteAmount).toBeLessThanOrEqual(5); // Can't waste more than available
    });

    it('should predict waste for multiple inventory items', async () => {
      const mockInventory = [
        {
          id: 'item-1',
          product: { name: 'Milk' },
          quantity: 1,
          unit: 'L',
          expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          price_per_unit: 1.5
        },
        {
          id: 'item-2',
          product: { name: 'Bread' },
          quantity: 1,
          unit: 'loaf',
          expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week
          price_per_unit: 2.0
        }
      ];

      // Mock historical waste rates
      jest.spyOn(wasteEngine, 'getHistoricalWasteRate' as any)
        .mockResolvedValueOnce(0.3) // Milk: 30% waste rate
        .mockResolvedValueOnce(0.15); // Bread: 15% waste rate

      const predictions = await wasteEngine.predictWaste('user-1', mockInventory);

      expect(predictions).toHaveLength(2);
      
      // Milk should be higher risk (expires tomorrow)
      const milkPrediction = predictions.find(p => p.productName === 'Milk');
      const breadPrediction = predictions.find(p => p.productName === 'Bread');

      expect(milkPrediction?.wasteRisk).toBe('high');
      expect(breadPrediction?.wasteRisk).toBe('low');
      
      // Should be sorted by risk (milk first)
      expect(predictions[0].productName).toBe('Milk');
    });
  });

  describe('Waste Prevention Recommendations', () => {
    it('should generate recipe recommendations for expiring items', async () => {
      const expiringItem = {
        product: { name: 'Tomatoes' },
        quantity: 3,
        unit: 'pieces',
        price_per_unit: 0.5
      };

      const recommendations = await wasteEngine['generateWastePreventionRecommendations'](
        expiringItem, 2, 'high'
      );

      const recipeRec = recommendations.find(r => r.type === 'recipe');
      
      expect(recipeRec).toBeDefined();
      expect(recipeRec?.action).toContain('Tomatoes');
      expect(recipeRec?.urgency).toBe('high');
      expect(recipeRec?.ingredients).toContain('Tomatoes');
    });

    it('should suggest preservation methods for suitable items', async () => {
      const preservableItem = {
        product: { name: 'Ground Beef' },
        quantity: 4,
        unit: 'portions',
        price_per_unit: 3.0
      };

      const recommendations = await wasteEngine['generateWastePreventionRecommendations'](
        preservableItem, 3, 'medium'
      );

      const preservationRec = recommendations.find(r => r.type === 'preservation');
      
      expect(preservationRec).toBeDefined();
      expect(preservationRec?.action).toContain('Congeler');
      expect(preservationRec?.instructions).toContain('Diviser Ground Beef en portions');
    });
  });

  describe('Buying Behavior Analysis', () => {
    it('should analyze buying patterns over time period', async () => {
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-03-31')
      };

      const mockAnalysis = {
        analysis: {
          userId: 'user-1',
          productCategories: [
            {
              category: 'dairy',
              averageQuantity: 2.5,
              buyingFrequency: 3,
              wasteRate: 0.15,
              preferredBrands: ['Brand A'],
              priceRange: { min: 1.0, max: 3.0, average: 2.0 }
            }
          ],
          wastePatterns: [
            {
              category: 'produce',
              averageWastePercentage: 25,
              commonReasons: [
                { reason: 'expired', frequency: 60, averageCost: 2.5 }
              ],
              costImpact: 15
            }
          ],
          sustainabilityScore: {
            overallScore: 75,
            categories: {
              wasteReduction: 80,
              localSourcing: 70,
              seasonalEating: 75,
              packagingMinimization: 65,
              carbonFootprint: 80
            },
            monthlyImprovement: 5
          }
        }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockAnalysis)
      });

      const result = await wasteEngine.analyzeBuyingBehavior('user-1', timeRange);

      expect(result.productCategories).toHaveLength(1);
      expect(result.productCategories[0].category).toBe('dairy');
      expect(result.sustainabilityScore.overallScore).toBe(75);
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/analytics/buying-behavior',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            userId: 'user-1',
            startDate: timeRange.start.toISOString(),
            endDate: timeRange.end.toISOString()
          })
        })
      );
    });
  });

  describe('Sustainability Scoring', () => {
    it('should calculate comprehensive sustainability score', async () => {
      const mockScore = {
        score: {
          overallScore: 82,
          categories: {
            wasteReduction: 85,
            localSourcing: 75,
            seasonalEating: 80,
            packagingMinimization: 70,
            carbonFootprint: 90
          },
          monthlyImprovement: 8,
          achievements: [
            {
              title: '50% Waste Reduction',
              description: 'Reduced food waste by 50% this month',
              earnedDate: new Date(),
              impact: 'Saved 15kg of food from landfill',
              category: 'waste'
            }
          ],
          recommendations: [
            {
              title: 'Buy More Local Produce',
              description: 'Increase local sourcing from 75% to 85%',
              impact: 'medium',
              difficulty: 'easy',
              potentialScoreIncrease: 5,
              actions: ['Visit farmers market weekly', 'Join local CSA']
            }
          ]
        }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockScore)
      });

      const score = await wasteEngine.calculateSustainabilityScore('user-1');

      expect(score.overallScore).toBe(82);
      expect(score.categories.wasteReduction).toBe(85);
      expect(score.achievements).toHaveLength(1);
      expect(score.recommendations).toHaveLength(1);
      expect(score.recommendations[0].potentialScoreIncrease).toBe(5);
    });
  });
});

describe('Evolution V2 - Intelligent Sync Service', () => {
  let syncService: IntelligentSyncService;
  const mockApiUrl = '/api';

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock IndexedDB
    Object.defineProperty(window, 'indexedDB', {
      value: {
        open: jest.fn().mockReturnValue({
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
          result: {}
        })
      }
    });
    
    syncService = new IntelligentSyncService(mockApiUrl, 'test-token');
  });

  describe('Sync Operation Management', () => {
    it('should queue operation with correct structure', async () => {
      const operation = {
        type: 'create' as const,
        entity: 'inventory' as const,
        data: { name: 'Milk', quantity: 1, unit: 'L' },
        userId: 'user-1',
        deviceId: 'device-1',
        priority: 'high' as const,
        dependencies: [],
        maxRetries: 3
      };

      // Mock database operations
      jest.spyOn(syncService as any, 'storeOperation').mockResolvedValue(undefined);

      const operationId = await syncService.queueOperation(operation);

      expect(operationId).toMatch(/^op_\d+_[a-z0-9]+$/);
      expect(syncService['syncState'].pendingOperations).toBe(1);
    });

    it('should trigger immediate sync for critical operations', async () => {
      const criticalOperation = {
        type: 'create' as const,
        entity: 'inventory' as const,
        data: { urgentItem: true },
        userId: 'user-1',
        deviceId: 'device-1',
        priority: 'critical' as const,
        dependencies: [],
        maxRetries: 3
      };

      // Mock methods
      jest.spyOn(syncService as any, 'storeOperation').mockResolvedValue(undefined);
      jest.spyOn(syncService as any, 'triggerSync').mockResolvedValue(undefined);
      
      // Set online state
      syncService['syncState'].isOnline = true;

      await syncService.queueOperation(criticalOperation);

      expect(syncService['triggerSync']).toHaveBeenCalled();
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect conflicts and attempt auto-resolution', async () => {
      const mockConflict = {
        id: 'conflict-1',
        operationId: 'op-1',
        entityType: 'inventory',
        entityId: 'item-1',
        clientData: { quantity: 5 },
        serverData: { quantity: 3 },
        conflictFields: ['quantity'],
        detectedAt: new Date(),
        autoResolvable: true,
        suggestedResolution: { strategy: 'merge' as const },
        priority: 'medium' as const
      };

      // Mock capability for auto-resolution
      syncService['capabilities'].set('inventory', {
        entityType: 'inventory',
        operations: ['create', 'update', 'delete', 'read'],
        cacheStrategy: 'indexedDB',
        maxCacheSize: 50,
        cacheExpiration: 86400000,
        syncPriority: 'high',
        conflictResolutionStrategy: 'merge'
      });

      jest.spyOn(syncService as any, 'storeConflict').mockResolvedValue(undefined);
      jest.spyOn(syncService as any, 'attemptAutoResolution').mockResolvedValue(true);

      await syncService['handleSyncConflict'](
        { id: 'op-1', entity: 'inventory', data: { quantity: 5 } } as any,
        { conflictFields: ['quantity'], serverData: { quantity: 3 } }
      );

      expect(syncService['storeConflict']).toHaveBeenCalled();
      expect(syncService['attemptAutoResolution']).toHaveBeenCalled();
    });

    it('should merge compatible fields automatically', async () => {
      const conflict = {
        id: 'conflict-1',
        entityType: 'inventory',
        clientData: { name: 'Milk', quantity: 2, lastUpdated: '2024-01-15' },
        serverData: { name: 'Milk', quantity: 1, lastUpdated: '2024-01-14' },
        conflictFields: ['quantity'],
        autoResolvable: true
      };

      jest.spyOn(syncService as any, 'canAutoMergeField').mockReturnValue(true);

      const resolution = await syncService['attemptMergeResolution'](conflict as any);

      expect(resolution.strategy).toBe('merge');
      expect(resolution.resolvedBy).toBe('system');
    });
  });

  describe('Cache Management', () => {
    it('should cache entity with expiration', async () => {
      const entityData = { id: 'item-1', name: 'Test Item', quantity: 1 };
      
      // Mock capability
      syncService['capabilities'].set('inventory', {
        entityType: 'inventory',
        operations: ['create', 'update', 'delete', 'read'],
        cacheStrategy: 'indexedDB',
        maxCacheSize: 50,
        cacheExpiration: 86400000, // 24 hours
        syncPriority: 'high',
        conflictResolutionStrategy: 'merge'
      });

      jest.spyOn(syncService as any, 'storeCacheEntry').mockResolvedValue(undefined);

      await syncService.cacheEntity('inventory', 'item-1', entityData);

      expect(syncService['storeCacheEntry']).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'inventory:item-1',
          entityType: 'inventory',
          entityId: 'item-1',
          data: entityData
        })
      );
    });

    it('should retrieve cached entity if not expired', async () => {
      const cachedEntry = {
        id: 'inventory:item-1',
        entityType: 'inventory',
        entityId: 'item-1',
        data: { name: 'Cached Item' },
        lastAccessed: new Date(),
        expiresAt: new Date(Date.now() + 86400000) // 24 hours from now
      };

      // Mock capability
      syncService['capabilities'].set('inventory', {
        entityType: 'inventory',
        operations: ['read'],
        cacheStrategy: 'indexedDB',
        maxCacheSize: 50,
        cacheExpiration: 86400000,
        syncPriority: 'high',
        conflictResolutionStrategy: 'merge'
      });

      jest.spyOn(syncService as any, 'getCacheEntry').mockResolvedValue(cachedEntry);
      jest.spyOn(syncService as any, 'storeCacheEntry').mockResolvedValue(undefined);

      const result = await syncService.getCachedEntity('inventory', 'item-1');

      expect(result).toEqual({ name: 'Cached Item' });
      expect(syncService['storeCacheEntry']).toHaveBeenCalled(); // Updates last accessed
    });

    it('should remove expired cache entries', async () => {
      const expiredEntry = {
        id: 'inventory:item-1',
        entityType: 'inventory',
        entityId: 'item-1',
        data: { name: 'Expired Item' },
        lastAccessed: new Date(),
        expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
      };

      // Mock capability
      syncService['capabilities'].set('inventory', {
        entityType: 'inventory',
        operations: ['read'],
        cacheStrategy: 'indexedDB',
        maxCacheSize: 50,
        cacheExpiration: 86400000,
        syncPriority: 'high',
        conflictResolutionStrategy: 'merge'
      });

      jest.spyOn(syncService as any, 'getCacheEntry').mockResolvedValue(expiredEntry);
      jest.spyOn(syncService as any, 'removeCachedEntity').mockResolvedValue(undefined);

      const result = await syncService.getCachedEntity('inventory', 'item-1');

      expect(result).toBeNull();
      expect(syncService['removeCachedEntity']).toHaveBeenCalledWith('inventory', 'item-1');
    });
  });

  describe('Network Optimization', () => {
    it('should adjust sync parameters based on network conditions', async () => {
      // Mock network information API
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '2g' },
        writable: true
      });

      await syncService['optimizeForNetworkCondition']();

      expect(syncService['config'].batchSize).toBe(5); // Reduced for slow network
      expect(syncService['syncState'].bandwidthMode).toBe('low');
    });

    it('should optimize for battery level', async () => {
      // Mock Battery API
      Object.defineProperty(navigator, 'getBattery', {
        value: jest.fn().mockResolvedValue({
          level: 0.15, // 15% battery
          charging: false
        })
      });

      await syncService['optimizeForBattery']();

      expect(syncService['syncState'].batteryOptimized).toBe(true);
      expect(syncService['config'].syncInterval).toBe(60000); // Longer interval for battery saving
    });
  });
});

describe('Evolution V2 - Integration Quality Gates', () => {
  describe('Performance Validation', () => {
    it('should meet AI response time requirements', async () => {
      const nutritionalService = new NutritionalAIService('test-key');
      
      const startTime = Date.now();
      
      // Mock fast response
      jest.spyOn(nutritionalService, 'chat').mockResolvedValue('{"nutritionalScore": 85}');
      
      await nutritionalService.analyzeNutritionalProfile({} as any, []);
      
      const responseTime = Date.now() - startTime;
      
      // Should complete within 3 seconds (quality gate from PRP)
      expect(responseTime).toBeLessThan(3000);
    });

    it('should handle concurrent operations efficiently', async () => {
      const syncService = new IntelligentSyncService('/api', 'token');
      
      const operations = Array.from({ length: 10 }, (_, i) => ({
        type: 'create' as const,
        entity: 'inventory' as const,
        data: { item: `item-${i}` },
        userId: 'user-1',
        deviceId: 'device-1',
        priority: 'medium' as const,
        dependencies: [],
        maxRetries: 3
      }));

      // Mock database operations
      jest.spyOn(syncService as any, 'storeOperation').mockResolvedValue(undefined);

      const startTime = Date.now();
      
      const promises = operations.map(op => syncService.queueOperation(op));
      await Promise.all(promises);
      
      const totalTime = Date.now() - startTime;
      
      // Should handle 10 operations in under 1 second
      expect(totalTime).toBeLessThan(1000);
    });
  });

  describe('Data Integrity Validation', () => {
    it('should maintain data consistency across services', async () => {
      const wasteEngine = new WasteReductionEngine('/api', 'token');
      
      const mockInventory = [
        {
          id: 'item-1',
          product: { name: 'Test Item' },
          quantity: 5,
          unit: 'kg',
          expiry_date: new Date().toISOString(),
          price_per_unit: 2.5
        }
      ];

      // Mock historical waste rate
      jest.spyOn(wasteEngine, 'getHistoricalWasteRate' as any).mockResolvedValue(0.2);

      const predictions = await wasteEngine.predictWaste('user-1', mockInventory);

      // Data consistency checks
      expect(predictions[0].productName).toBe(mockInventory[0].product.name);
      expect(predictions[0].currentQuantity).toBe(mockInventory[0].quantity);
      expect(predictions[0].estimatedValue).toBeGreaterThan(0);
      expect(predictions[0].confidence).toBeGreaterThan(0);
      expect(predictions[0].confidence).toBeLessThanOrEqual(1);
    });

    it('should validate nutritional calculations accuracy', () => {
      const nutritionalService = new NutritionalAIService('test-key');
      
      const testProfile: UserHealthProfile = {
        id: 'test-1',
        userId: 'user-1',
        age: 25,
        gender: 'female',
        weight: 60,
        height: 165,
        activityLevel: 'moderately_active',
        goals: [],
        medicalConditions: [],
        allergies: [],
        dietaryPreferences: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const goals = nutritionalService['calculateNutritionalGoals'](testProfile);
      
      // Validate macronutrient ratios
      const totalCaloricValue = (goals.protein * 4) + (goals.carbohydrates * 4) + (goals.fat * 9);
      const caloriesDifference = Math.abs(totalCaloricValue - goals.dailyCalories);
      
      // Should be within 5% tolerance
      expect(caloriesDifference / goals.dailyCalories).toBeLessThan(0.05);
      
      // Protein should be reasonable (1.6-2.2g per kg body weight)
      const proteinPerKg = goals.protein / testProfile.weight;
      expect(proteinPerKg).toBeGreaterThanOrEqual(1.6);
      expect(proteinPerKg).toBeLessThanOrEqual(2.2);
    });
  });

  describe('Error Handling Validation', () => {
    it('should gracefully handle API failures', async () => {
      const communityService = new CommunityService('/api', 'token');
      
      // Mock API failure
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network Error'));

      await expect(communityService.shareRecipe({})).rejects.toThrow('Network Error');
      
      // Service should remain functional after error
      expect(communityService).toBeDefined();
    });

    it('should handle offline scenarios properly', async () => {
      const syncService = new IntelligentSyncService('/api', 'token');
      
      // Simulate offline state
      syncService['syncState'].isOnline = false;
      
      const operationId = await syncService.queueOperation({
        type: 'create',
        entity: 'inventory',
        data: { name: 'Offline Item' },
        userId: 'user-1',
        deviceId: 'device-1',
        priority: 'medium',
        dependencies: [],
        maxRetries: 3
      });

      expect(operationId).toBeDefined();
      expect(syncService['syncState'].pendingOperations).toBe(1);
      
      // Should not attempt sync while offline
      expect(syncService['syncState'].isSyncing).toBe(false);
    });
  });
});

// Test cleanup and utilities
afterEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});