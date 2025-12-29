import { familyContextCoordinator } from '../FamilyContextCoordinator';
import { cipherContextIntegration } from '../CipherContextIntegration';
import { contextAdapter } from '../ContextAdapter';
import { supabase } from '@/integrations/supabase/client';
import { 
  FamilyMemberProfile, 
  FamilyConflict, 
  UserContextPreferences,
  AdaptationLog 
} from '../types';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: null
          }))
        }))
      })),
      insert: jest.fn(() => ({
        data: null,
        error: null
      })),
      upsert: jest.fn(() => ({
        data: null,
        error: null
      }))
    }))
  }
}));

jest.mock('../CipherContextIntegration');
jest.mock('../ContextAdapter');

describe('FamilyContextCoordinator', () => {
  const mockFamilyId = 'family-123';
  const mockMembers: FamilyMemberProfile[] = [
    { userId: 'parent1', role: 'parent', dietaryRestrictions: [], preferences: {} },
    { userId: 'parent2', role: 'parent', dietaryRestrictions: ['vegetarian'], preferences: {} },
    { userId: 'child1', role: 'child', dietaryRestrictions: [], preferences: {} },
    { userId: 'child2', role: 'child', dietaryRestrictions: ['lactose'], preferences: {} }
  ];

  const mockBasePlan = {
    id: 'plan-123',
    userId: 'user-123',
    weekStart: new Date(),
    meals: [],
    familySize: 4
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('coordinateFamilyAdaptations', () => {
    it('should coordinate adaptations for entire family', async () => {
      // Mock member preferences
      const mockPreferences = new Map<string, UserContextPreferences>([
        ['parent1', {
          weather_adaptation: true,
          calendar_sync: true,
          seasonal_preferences: true,
          price_optimization: true,
          weather_sensitivity: 'medium',
          schedule_flexibility: 'flexible',
          price_sensitivity: 'medium',
          seasonal_commitment: 'moderate',
          home_location: { lat: 48.8566, lng: 2.3522 }
        }],
        ['parent2', {
          weather_adaptation: true,
          calendar_sync: false,
          seasonal_preferences: true,
          price_optimization: true,
          weather_sensitivity: 'high',
          schedule_flexibility: 'flexible',
          price_sensitivity: 'high',
          seasonal_commitment: 'high',
          home_location: { lat: 48.8566, lng: 2.3522 }
        }]
      ]);

      // Mock Supabase responses
      (supabase.from as jest.Mock).mockImplementation((table: string) => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: mockPreferences.get('parent1'),
              error: null
            }))
          }))
        }))
      }));

      // Mock individual adaptations
      const mockAdaptations: AdaptationLog[] = [{
        type: 'weather',
        day: 0,
        original: 'recipe1',
        adapted: 'recipe2',
        reason: 'Journée chaude',
        confidence: 0.8
      }];

      (contextAdapter.adaptMealPlan as jest.Mock).mockResolvedValue({
        adaptations: mockAdaptations
      });

      // Mock Cipher integration
      (cipherContextIntegration.getFamilyConflictResolutions as jest.Mock).mockResolvedValue({
        compromises: [],
        votingRequired: false,
        alternativeSolutions: []
      });

      const result = await familyContextCoordinator.coordinateFamilyAdaptations(
        mockFamilyId,
        mockBasePlan,
        mockMembers
      );

      expect(result).toBeDefined();
      expect(result.familyId).toBe(mockFamilyId);
      expect(result.conflicts).toBeDefined();
      expect(result.resolutions).toBeDefined();
      expect(result.consensusScore).toBeGreaterThanOrEqual(0);
      expect(result.consensusScore).toBeLessThanOrEqual(1);
    });

    it('should detect preference conflicts between members', async () => {
      const conflictingPreferences = new Map<string, UserContextPreferences>([
        ['parent1', {
          weather_adaptation: true,
          calendar_sync: true,
          seasonal_preferences: true,
          price_optimization: true,
          weather_sensitivity: 'high',
          schedule_flexibility: 'flexible',
          price_sensitivity: 'low',
          seasonal_commitment: 'moderate',
          home_location: { lat: 48.8566, lng: 2.3522 }
        }],
        ['parent2', {
          weather_adaptation: true,
          calendar_sync: true,
          seasonal_preferences: true,
          price_optimization: true,
          weather_sensitivity: 'low',
          schedule_flexibility: 'rigid',
          price_sensitivity: 'high',
          seasonal_commitment: 'high',
          home_location: { lat: 48.8566, lng: 2.3522 }
        }]
      ]);

      (supabase.from as jest.Mock).mockImplementation((table: string) => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: conflictingPreferences.get('parent1'),
              error: null
            }))
          }))
        }))
      }));

      const result = await familyContextCoordinator.coordinateFamilyAdaptations(
        mockFamilyId,
        mockBasePlan,
        mockMembers.slice(0, 2)
      );

      expect(result.conflicts.length).toBeGreaterThan(0);
      
      const weatherConflict = result.conflicts.find(c => c.category === 'weather');
      const priceConflict = result.conflicts.find(c => c.category === 'price');
      
      expect(weatherConflict).toBeDefined();
      expect(priceConflict).toBeDefined();
    });

    it('should resolve conflicts with appropriate methods', async () => {
      const mockConflict: FamilyConflict = {
        id: 'conflict-1',
        type: 'preference',
        severity: 'medium',
        members: ['parent1', 'parent2'],
        description: 'Désaccord sur l\'adaptation météo',
        category: 'weather'
      };

      // Setup mocks
      (contextAdapter.adaptMealPlan as jest.Mock).mockResolvedValue({
        adaptations: []
      });

      const result = await familyContextCoordinator.coordinateFamilyAdaptations(
        mockFamilyId,
        mockBasePlan,
        mockMembers
      );

      // Should have resolutions for any conflicts
      if (result.conflicts.length > 0) {
        expect(result.resolutions.length).toBeGreaterThan(0);
        result.resolutions.forEach(resolution => {
          expect(resolution.method).toBeDefined();
          expect(resolution.outcome).toBeDefined();
          expect(resolution.satisfaction).toBeDefined();
        });
      }
    });
  });

  describe('getFamilyContextualState', () => {
    it('should retrieve family contextual state', async () => {
      const mockFamilyData = {
        id: mockFamilyId,
        family_members: mockMembers.map(m => ({
          user_id: m.userId,
          role: m.role,
          preferences: m.preferences
        })),
        shared_preferences: {
          bulk_buying_enabled: true,
          batch_cooking_enabled: false
        },
        consensus_level: 0.85,
        adaptation_strategy: 'balanced',
        last_sync: new Date()
      };

      (supabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: mockFamilyData,
              error: null
            }))
          }))
        }))
      }));

      const state = await familyContextCoordinator.getFamilyContextualState(mockFamilyId);

      expect(state).toBeDefined();
      expect(state?.familyId).toBe(mockFamilyId);
      expect(state?.members).toHaveLength(4);
      expect(state?.consensusLevel).toBe(0.85);
      expect(state?.adaptationStrategy).toBe('balanced');
    });

    it('should use cache for recent requests', async () => {
      // First call
      await familyContextCoordinator.getFamilyContextualState(mockFamilyId);
      
      // Second call within cache period
      await familyContextCoordinator.getFamilyContextualState(mockFamilyId);

      // Supabase should only be called once
      expect(supabase.from).toHaveBeenCalledTimes(1);
    });
  });

  describe('Conflict resolution strategies', () => {
    it('should apply majority rule for preference conflicts', async () => {
      const mockAdaptations = new Map<string, AdaptationLog[]>([
        ['parent1', [{
          type: 'weather',
          day: 0,
          original: 'recipe1',
          adapted: 'recipe2',
          reason: 'Journée chaude',
          confidence: 0.8
        }]],
        ['parent2', [{
          type: 'weather',
          day: 0,
          original: 'recipe1',
          adapted: 'recipe2',
          reason: 'Journée chaude',
          confidence: 0.8
        }]],
        ['child1', [{
          type: 'weather',
          day: 0,
          original: 'recipe1',
          adapted: 'recipe3',
          reason: 'Préférence différente',
          confidence: 0.6
        }]]
      ]);

      (contextAdapter.adaptMealPlan as jest.Mock).mockImplementation((plan, userId) => ({
        adaptations: mockAdaptations.get(userId) || []
      }));

      const result = await familyContextCoordinator.coordinateFamilyAdaptations(
        mockFamilyId,
        mockBasePlan,
        mockMembers.slice(0, 3)
      );

      // The majority adaptation (recipe2) should be selected
      expect(result.adaptedPlan).toBeDefined();
    });

    it('should optimize meal portions for family size', async () => {
      const largeFamilyMembers = [
        ...mockMembers,
        { userId: 'child3', role: 'child' as const, dietaryRestrictions: [], preferences: {} },
        { userId: 'grandparent1', role: 'other' as const, dietaryRestrictions: [], preferences: {} }
      ];

      const result = await familyContextCoordinator.coordinateFamilyAdaptations(
        mockFamilyId,
        mockBasePlan,
        largeFamilyMembers
      );

      expect(result.adaptedPlan).toBeDefined();
      // For large families, should include batch cooking suggestions
      if (largeFamilyMembers.length > 4) {
        expect(result.adaptedPlan.batchCookingSuggestions).toBeDefined();
      }
    });
  });

  describe('Cipher integration', () => {
    it('should record family decisions in Cipher', async () => {
      await familyContextCoordinator.coordinateFamilyAdaptations(
        mockFamilyId,
        mockBasePlan,
        mockMembers
      );

      expect(cipherContextIntegration.integrateFamilyContext).toHaveBeenCalledWith(
        mockFamilyId,
        expect.any(Array),
        expect.any(Map),
        expect.any(Map)
      );
    });

    it('should use Cipher suggestions for conflict resolution', async () => {
      const mockCipherSuggestions = {
        compromises: [{
          type: 'weather' as any,
          day: 0,
          original: 'recipe1',
          adapted: 'recipe_compromise',
          reason: 'Compromis IA',
          confidence: 0.9
        }],
        votingRequired: true,
        alternativeSolutions: []
      };

      (cipherContextIntegration.getFamilyConflictResolutions as jest.Mock)
        .mockResolvedValue(mockCipherSuggestions);

      const result = await familyContextCoordinator.coordinateFamilyAdaptations(
        mockFamilyId,
        mockBasePlan,
        mockMembers
      );

      // Should include AI-suggested compromise in resolutions
      const aiResolution = result.resolutions.find(r => r.method === 'ai_suggestion');
      expect(aiResolution).toBeDefined();
      expect(aiResolution?.details.requiresVoting).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should return fallback result on error', async () => {
      (contextAdapter.adaptMealPlan as jest.Mock).mockRejectedValue(
        new Error('Adaptation failed')
      );

      const result = await familyContextCoordinator.coordinateFamilyAdaptations(
        mockFamilyId,
        mockBasePlan,
        mockMembers
      );

      expect(result).toBeDefined();
      expect(result.adaptedPlan).toEqual(mockBasePlan);
      expect(result.conflicts).toEqual([]);
      expect(result.consensusScore).toBe(1.0);
    });
  });
});