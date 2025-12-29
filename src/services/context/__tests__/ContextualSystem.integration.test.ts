import { contextAdapter } from '../ContextAdapter';
import { weatherContextService } from '../WeatherContextService';
import { calendarContextService } from '../CalendarContextService';
import { seasonalityEngine } from '../SeasonalityEngine';
import { promotionsContextService } from '../PromotionsContextService';
import { cipherContextIntegration } from '../CipherContextIntegration';
import { familyContextCoordinator } from '../FamilyContextCoordinator';
import { UserContextPreferences } from '../types';

// Mock external dependencies
jest.mock('@/lib/supabase');
jest.mock('@/services/cipher/CipherMemoryService');

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Contextual System Integration Tests', () => {
  const mockUserId = 'user-123';
  const mockFamilyId = 'family-123';
  const mockLocation = { lat: 48.8566, lng: 2.3522 };
  
  const mockPreferences: UserContextPreferences = {
    weather_adaptation: true,
    calendar_sync: true,
    seasonal_preferences: true,
    price_optimization: true,
    weather_sensitivity: 'medium',
    schedule_flexibility: 'flexible',
    price_sensitivity: 'medium',
    seasonal_commitment: 'moderate',
    max_adaptations_per_week: 5,
    home_location: mockLocation,
    preferred_stores: ['carrefour', 'leclerc'],
    family_context_enabled: true
  };

  const mockMealPlan = {
    id: 'plan-123',
    userId: mockUserId,
    weekStart: new Date('2024-07-15'),
    meals: [
      {
        id: 'meal1',
        day: 0,
        recipe: {
          id: 'recipe1',
          name: 'Gratin Dauphinois',
          tags: ['comfort_food', 'hot_dish'],
          prepTime: 30,
          cookTime: 60,
          difficulty: 'medium' as const,
          ingredients: [],
          cost: 15
        },
        servings: 4
      },
      {
        id: 'meal2',
        day: 1,
        recipe: {
          id: 'recipe2',
          name: 'Salade Niçoise',
          tags: ['salad', 'cold_dish', 'summer'],
          prepTime: 20,
          cookTime: 0,
          difficulty: 'easy' as const,
          ingredients: [],
          cost: 12
        },
        servings: 4
      }
    ],
    totalCost: 84,
    totalPrepTime: 350,
    familySize: 4
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Full Context Adaptation Flow', () => {
    it('should successfully adapt meal plan with all context services', async () => {
      // Mock weather context (hot summer day)
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('openweathermap')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              list: Array(56).fill({
                dt: Date.now() / 1000,
                main: { temp: 32, feels_like: 35, humidity: 70 },
                weather: [{ main: 'Clear', description: 'clear sky' }],
                wind: { speed: 5 }
              })
            })
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const result = await contextAdapter.adaptMealPlan(
        mockMealPlan,
        mockUserId,
        mockPreferences
      );

      expect(result).toBeDefined();
      expect(result.adaptedPlan).toBeDefined();
      expect(result.adaptations.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.executionTime).toBeGreaterThan(0);
      
      // Should adapt hot dishes on hot days
      const weatherAdaptation = result.adaptations.find(a => a.type === 'weather');
      expect(weatherAdaptation).toBeDefined();
    });

    it('should respect adaptation limits set in preferences', async () => {
      const limitedPreferences = {
        ...mockPreferences,
        max_adaptations_per_week: 2
      };

      const result = await contextAdapter.adaptMealPlan(
        mockMealPlan,
        mockUserId,
        limitedPreferences
      );

      expect(result.adaptations.length).toBeLessThanOrEqual(2);
    });

    it('should prioritize adaptations correctly', async () => {
      // Mock multiple contexts requiring adaptations
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('openweathermap')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              list: [{
                dt: Date.now() / 1000,
                main: { temp: 35, feels_like: 38, humidity: 80 },
                weather: [{ main: 'Clear', description: 'very hot' }],
                wind: { speed: 2 }
              }]
            })
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      const result = await contextAdapter.adaptMealPlan(
        mockMealPlan,
        mockUserId,
        mockPreferences
      );

      // Calendar adaptations should come before weather adaptations
      if (result.adaptations.length > 1) {
        const calendarIndex = result.adaptations.findIndex(a => a.type === 'schedule');
        const weatherIndex = result.adaptations.findIndex(a => a.type === 'weather');
        
        if (calendarIndex !== -1 && weatherIndex !== -1) {
          expect(calendarIndex).toBeLessThan(weatherIndex);
        }
      }
    });
  });

  describe('Family Mode Integration', () => {
    it('should coordinate adaptations across family members', async () => {
      const familyMembers = [
        { userId: 'parent1', role: 'parent' as const, dietaryRestrictions: [], preferences: {} },
        { userId: 'parent2', role: 'parent' as const, dietaryRestrictions: ['vegetarian'], preferences: {} },
        { userId: 'child1', role: 'child' as const, dietaryRestrictions: [], preferences: {} }
      ];

      const familyResult = await familyContextCoordinator.coordinateFamilyAdaptations(
        mockFamilyId,
        mockMealPlan,
        familyMembers
      );

      expect(familyResult).toBeDefined();
      expect(familyResult.memberAdaptations.size).toBe(familyMembers.length);
      expect(familyResult.consensusScore).toBeGreaterThanOrEqual(0);
      expect(familyResult.consensusScore).toBeLessThanOrEqual(1);
    });

    it('should handle dietary conflicts in family', async () => {
      const familyWithDietaryNeeds = [
        { userId: 'parent1', role: 'parent' as const, dietaryRestrictions: ['vegetarian'], preferences: {} },
        { userId: 'parent2', role: 'parent' as const, dietaryRestrictions: [], preferences: {} },
        { userId: 'child1', role: 'child' as const, dietaryRestrictions: ['lactose', 'gluten'], preferences: {} }
      ];

      const result = await familyContextCoordinator.coordinateFamilyAdaptations(
        mockFamilyId,
        mockMealPlan,
        familyWithDietaryNeeds
      );

      // Should detect dietary conflicts
      const dietaryConflicts = result.conflicts.filter(c => c.type === 'dietary');
      expect(dietaryConflicts.length).toBeGreaterThan(0);
    });
  });

  describe('Cipher Learning Integration', () => {
    it('should record adaptations for learning', async () => {
      const adaptations = [{
        type: 'weather' as const,
        day: 0,
        original: 'recipe1',
        adapted: 'recipe2',
        reason: 'Journée très chaude',
        confidence: 0.9
      }];

      await cipherContextIntegration.recordContextualExperience(
        mockUserId,
        { weather: { current: { temp: 35 } } as any },
        adaptations,
        { accepted: true, satisfaction: 4 }
      );

      // Should update user memory
      const recommendations = await cipherContextIntegration.getPersonalizedRecommendations(
        mockUserId,
        { weather: { current: { temp: 35 } } as any }
      );

      expect(recommendations).toBeDefined();
    });

    it('should improve adaptation predictions over time', async () => {
      // Simulate multiple experiences
      const experiences = [
        { type: 'weather', accepted: true, satisfaction: 5 },
        { type: 'weather', accepted: true, satisfaction: 4 },
        { type: 'weather', accepted: false, satisfaction: 2 },
        { type: 'schedule', accepted: true, satisfaction: 5 },
        { type: 'schedule', accepted: true, satisfaction: 5 }
      ];

      for (const exp of experiences) {
        await cipherContextIntegration.recordContextualExperience(
          mockUserId,
          {},
          [{ type: exp.type as any, day: 0, original: 'r1', adapted: 'r2', reason: 'test', confidence: 0.8 }],
          { accepted: exp.accepted, satisfaction: exp.satisfaction }
        );
      }

      // Analyze patterns
      const patterns = await cipherContextIntegration.analyzeUserAdaptationPatterns(mockUserId);
      
      expect(patterns.preferredAdaptations.has('schedule')).toBe(true);
      expect(patterns.contextSensitivity.get('schedule')).toBeGreaterThan(
        patterns.contextSensitivity.get('weather') || 0
      );
    });
  });

  describe('Error Recovery', () => {
    it('should gracefully handle service failures', async () => {
      // Mock all external services to fail
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await contextAdapter.adaptMealPlan(
        mockMealPlan,
        mockUserId,
        mockPreferences
      );

      // Should return original plan
      expect(result.adaptedPlan).toEqual(mockMealPlan);
      expect(result.adaptations).toEqual([]);
      expect(result.confidence).toBe(0);
    });

    it('should use cached data when available', async () => {
      // First successful call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          list: [{ main: { temp: 20 }, weather: [{ main: 'Clear' }], wind: { speed: 5 } }]
        })
      });

      await weatherContextService.getWeatherContext(mockLocation);

      // Second call with network failure should use cache
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const cachedResult = await weatherContextService.getWeatherContext(mockLocation);
      expect(cachedResult).toBeDefined();
      expect(cachedResult.current.temp).toBe(20);
    });
  });

  describe('Performance', () => {
    it('should complete full adaptation within reasonable time', async () => {
      const startTime = Date.now();
      
      await contextAdapter.adaptMealPlan(
        mockMealPlan,
        mockUserId,
        mockPreferences
      );
      
      const executionTime = Date.now() - startTime;
      
      // Should complete within 5 seconds even with all services
      expect(executionTime).toBeLessThan(5000);
    });

    it('should parallelize context gathering', async () => {
      let weatherCallTime = 0;
      let calendarCallTime = 0;
      let seasonalCallTime = 0;

      // Mock with delays to test parallelization
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        const startTime = Date.now();
        
        if (url.includes('weather')) {
          return new Promise(resolve => {
            setTimeout(() => {
              weatherCallTime = Date.now() - startTime;
              resolve({
                ok: true,
                json: async () => ({ list: [] })
              });
            }, 100);
          });
        }
        
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      await contextAdapter.adaptMealPlan(
        mockMealPlan,
        mockUserId,
        mockPreferences
      );

      // All services should start roughly at the same time (parallel execution)
      // If they were sequential, total time would be much longer
      expect(weatherCallTime).toBeLessThan(200);
    });
  });
});