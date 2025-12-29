/**
 * Integration Tests - Navigation Intelligence avec Family Mode et Cipher
 * Tests d'intégration complète pour PRP-040.3
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock Supabase client to avoid module loading issues
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }
}));

// Mock cipher service
jest.mock('@/services/cipher/CipherMemoryService', () => ({
  cipherMemory: {
    getSecurityConfig: jest.fn(() => Promise.resolve({})),
    configureFamilySupervision: jest.fn(() => Promise.resolve()),
    recordSecureBehaviorData: jest.fn(() => Promise.resolve()),
    recordSecurityEvent: jest.fn(() => Promise.resolve()),
    getContextualRecommendations: jest.fn(() => Promise.resolve([])),
    recordExperience: jest.fn(() => Promise.resolve()),
    getUserPersonalization: jest.fn(() => Promise.resolve({ preferences: {}, learningProgress: { expertiseLevel: { pantry: 0, kitchen: 0, shopping: 0, assistant: 0, insights: 0, games: 0, settings: 0, social: 0 } } })),
    recordPersonalizationData: jest.fn(() => Promise.resolve()),
    updateUserPersonalization: jest.fn(() => Promise.resolve()),
    recordBehaviorData: jest.fn(() => Promise.resolve())
  }
}));
import { 
  navigationPredictor,
  contextAnalyzer,
  personalizationEngine,
  behaviorTracker,
  smartSuggestions
} from '@/services/navigation-intelligence';
import { familyContextualIntelligence } from '@/services/navigation-intelligence/FamilyContextualIntelligence';
import { cipherSecurityIntegration } from '@/services/navigation-intelligence/CipherSecurityIntegration';
import { FamilyProfile, NavigationSection } from '@/types/family-mode';

// Mock data
const mockParentProfile: FamilyProfile = {
  id: 'parent-123',
  name: 'Parent Test',
  type: 'parent',
  age: 35,
  avatar: null,
  isActive: true,
  createdAt: new Date(),
  lastActiveAt: new Date(),
  restrictions: {
    allowedSections: ['pantry', 'kitchen', 'shopping', 'assistant', 'insights'],
    blockedFeatures: [],
    allergenAlerts: [],
    dietaryRestrictions: [],
    requireParentalApproval: false,
    logAllActivities: true,
    shareLocationInStore: false
  },
  preferences: {
    theme: 'light',
    language: 'fr',
    colorScheme: 'default',
    fontSize: 'medium',
    simplifiedUI: false,
    voiceEnabled: true,
    hapticFeedback: true,
    soundEffects: false
  }
};

const mockChildProfile: FamilyProfile = {
  id: 'child-456',
  name: 'Enfant Test',
  type: 'child',
  age: 8,
  avatar: null,
  isActive: true,
  createdAt: new Date(),
  lastActiveAt: new Date(),
  restrictions: {
    allowedSections: ['pantry', 'kitchen', 'games'],
    blockedFeatures: ['shopping', 'advanced'],
    allergenAlerts: [],
    dietaryRestrictions: [],
    activeHours: {
      start: "08:00",
      end: "20:00"
    },
    requireParentalApproval: true,
    logAllActivities: true,
    shareLocationInStore: false
  },
  preferences: {
    theme: 'child-friendly',
    language: 'fr',
    colorScheme: 'colorful',
    fontSize: 'large',
    simplifiedUI: true,
    voiceEnabled: true,
    hapticFeedback: true,
    soundEffects: true
  }
};

describe('Navigation Intelligence Integration', () => {
  const familyId = 'family-test-789';
  const testUserId = 'user-test-123';

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup
  });

  describe('Basic Intelligence Services', () => {
    it('should analyze context correctly', async () => {
      const context = await contextAnalyzer.analyzeCurrentContext();
      
      expect(context).toBeDefined();
      expect(context.time).toBeDefined();
      expect(context.external).toBeDefined();
      expect(context.inventory).toBeDefined();
      expect(context.user).toBeDefined();
      
      expect(typeof context.time.hour).toBe('number');
      expect(context.time.hour).toBeGreaterThanOrEqual(0);
      expect(context.time.hour).toBeLessThanOrEqual(23);
    });

    it('should generate contextual suggestions', async () => {
      const context = await contextAnalyzer.analyzeCurrentContext();
      const suggestions = contextAnalyzer.generateContextualSuggestions(
        context,
        'kitchen'
      );
      
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThanOrEqual(0);
      
      if (suggestions.length > 0) {
        const suggestion = suggestions[0];
        expect(suggestion).toHaveProperty('id');
        expect(suggestion).toHaveProperty('type');
        expect(suggestion).toHaveProperty('confidence');
        expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
        expect(suggestion.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should predict navigation patterns', async () => {
      // Enregistrer quelques patterns
      navigationPredictor.recordNavigation(testUserId, 'pantry', 'kitchen', {
        mealTime: 'dinner'
      });
      navigationPredictor.recordNavigation(testUserId, 'kitchen', 'shopping', {
        mealTime: 'dinner'
      });
      
      // Prédire
      const predictions = await navigationPredictor.predictNextSections(
        testUserId,
        'pantry',
        { mealTime: 'dinner' }
      );
      
      expect(Array.isArray(predictions)).toBe(true);
      
      if (predictions.length > 0) {
        const prediction = predictions[0];
        expect(prediction).toHaveProperty('section');
        expect(prediction).toHaveProperty('confidence');
        expect(prediction).toHaveProperty('reasoning');
      }
    });

    it('should track user behavior', async () => {
      const interaction = {
        userId: testUserId,
        sessionId: 'session-test',
        timestamp: new Date(),
        type: 'click' as const,
        target: {
          element: 'generate-plan-button',
          section: 'kitchen' as NavigationSection,
          feature: 'meal_planning'
        },
        context: {
          pageLoadTime: 500,
          sessionDuration: 120000,
          deviceType: 'desktop' as const
        },
        outcome: {
          success: true,
          timeToComplete: 2000
        },
        metadata: {
          userAgent: 'test-agent',
          viewport: { width: 1920, height: 1080 }
        }
      };

      await behaviorTracker.trackInteraction(interaction);
      
      const metrics = behaviorTracker.getUserPerformanceMetrics(testUserId);
      expect(metrics).toBeDefined();
      expect(typeof metrics.efficiency).toBe('number');
      expect(typeof metrics.errorRate).toBe('number');
    });
  });

  describe('Family Mode Integration', () => {
    it('should activate family intelligence', async () => {
      const familyState = await familyContextualIntelligence.activateFamilyIntelligence(
        familyId,
        [mockParentProfile, mockChildProfile],
        mockParentProfile,
        {
          supervisionLevel: 'medium',
          sharedInventory: true,
          coordinatedPlanning: true
        }
      );

      expect(familyState).toBeDefined();
      expect(familyState.familyId).toBe(familyId);
      expect(familyState.activeMembers).toHaveLength(2);
      expect(familyState.currentPrimaryUser).toEqual(mockParentProfile);
      expect(familyState.supervisionMode.level).toBe('medium');
    });

    it('should generate family-adapted suggestions', async () => {
      // Activer le mode famille
      await familyContextualIntelligence.activateFamilyIntelligence(
        familyId,
        [mockParentProfile, mockChildProfile],
        mockChildProfile,
        {
          supervisionLevel: 'high',
          sharedInventory: true,
          coordinatedPlanning: false
        }
      );

      // Générer suggestions pour enfant
      const familyRecommendations = await familyContextualIntelligence.generateFamilyContextualSuggestions(
        familyId,
        'kitchen',
        mockChildProfile
      );

      expect(Array.isArray(familyRecommendations)).toBe(true);
      
      if (familyRecommendations.length > 0) {
        const rec = familyRecommendations[0];
        expect(rec).toHaveProperty('familyContext');
        expect(rec.familyContext).toHaveProperty('childSafe');
        expect(rec.familyContext.childSafe).toBe(true);
        
        if (rec.suggestion.familyAdaptation) {
          expect(rec.suggestion.familyAdaptation.childFriendly).toBe(true);
          expect(rec.suggestion.familyAdaptation.safetyLevel).not.toBe('restricted');
        }
      }
    });

    it('should handle profile switching', async () => {
      // Activer famille
      await familyContextualIntelligence.activateFamilyIntelligence(
        familyId,
        [mockParentProfile, mockChildProfile],
        mockParentProfile,
        {
          supervisionLevel: 'medium',
          sharedInventory: true,
          coordinatedPlanning: true
        }
      );

      // Changer de profil
      const transition = await familyContextualIntelligence.handleFamilyProfileSwitch(
        familyId,
        mockParentProfile,
        mockChildProfile,
        'kitchen'
      );

      expect(transition).toBeDefined();
      expect(transition.adaptedContext).toBeDefined();
      expect(transition.adaptedContext.family).toBeDefined();
      expect(transition.adaptedContext.family?.activeProfile).toEqual(mockChildProfile);
      expect(transition.restrictionsChanged).toBe(true);
      expect(transition.supervisionRequired).toBe(true);
    });

    it('should adapt suggestions for children', async () => {
      const context = await contextAnalyzer.analyzeCurrentContext();
      const childContext = contextAnalyzer.updateFamilyContext(context, mockChildProfile, {
        childrenPresent: true,
        supervisionLevel: 'high',
        safetyRestrictionsActive: true
      });

      const suggestions = contextAnalyzer.generateContextualSuggestions(
        childContext,
        'kitchen',
        mockChildProfile
      );

      expect(Array.isArray(suggestions)).toBe(true);
      
      // Vérifier l'adaptation pour enfants
      suggestions.forEach(suggestion => {
        if (suggestion.familyAdaptation) {
          expect(suggestion.familyAdaptation.childFriendly).toBe(true);
          expect(['safe', 'caution']).toContain(suggestion.familyAdaptation.safetyLevel);
        }
      });
    });
  });

  describe('Cipher Security Integration', () => {
    it('should secure contextual data', async () => {
      const testContext = {
        personalData: 'test data',
        behaviorData: ['action1', 'action2'],
        familyData: {
          memberIds: ['parent-123', 'child-456']
        }
      };

      const securedData = await cipherSecurityIntegration.secureContextualData(
        testUserId,
        testContext,
        mockParentProfile
      );

      expect(securedData).toBeDefined();
      expect(securedData.userId).toBe(testUserId);
      expect(securedData.encryptedData).toBeDefined();
      expect(securedData.dataHash).toBeDefined();
      expect(securedData.accessLevel).toBe('family');
      expect(securedData.familyVisibility).toBeDefined();
    });

    it('should verify child action security', async () => {
      // Activer la supervision
      await cipherSecurityIntegration.enableChildSupervision(
        familyId,
        mockChildProfile,
        mockParentProfile,
        {
          level: 'high',
          allowedSections: ['pantry', 'kitchen', 'games'],
          notifyParentOn: ['shopping', 'sharing']
        }
      );

      // Tester action autorisée
      const safeAction = await cipherSecurityIntegration.verifyChildAction(
        familyId,
        mockChildProfile,
        {
          type: 'navigate',
          target: 'kitchen'
        }
      );

      expect(safeAction.allowed).toBe(true);

      // Tester action restreinte
      const restrictedAction = await cipherSecurityIntegration.verifyChildAction(
        familyId,
        mockChildProfile,
        {
          type: 'navigate',
          target: 'shopping'
        }
      );

      expect(restrictedAction.allowed).toBe(false);
      expect(restrictedAction.requiresApproval).toBe(true);
      expect(restrictedAction.reason).toContain('autorisation parentale');
    });

    it('should encrypt and decrypt data correctly', async () => {
      const testData = {
        preferences: { theme: 'dark', notifications: true },
        behaviorData: ['click', 'navigate', 'search'],
        familyContext: { childPresent: true }
      };

      // Chiffrer
      const securedData = await cipherSecurityIntegration.secureContextualData(
        testUserId,
        testData,
        mockParentProfile
      );

      // Déchiffrer
      const decryptedData = await cipherSecurityIntegration.decryptContextualData(
        securedData,
        testUserId,
        mockParentProfile
      );

      expect(decryptedData).toEqual(testData);
    });

    it('should generate security audit report', async () => {
      // Générer quelques événements d'audit
      await cipherSecurityIntegration.secureContextualData(
        testUserId,
        { test: 'data' },
        mockParentProfile
      );

      const report = await cipherSecurityIntegration.generateSecurityAuditReport(
        familyId,
        {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date()
        }
      );

      expect(report).toBeDefined();
      expect(typeof report.totalEvents).toBe('number');
      expect(Array.isArray(report.securityIncidents)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe('Smart Suggestions Integration', () => {
    it('should generate smart suggestions for meal planning', async () => {
      const suggestionContext = {
        userId: testUserId,
        currentSection: 'kitchen' as NavigationSection,
        timeOfDay: 19, // Heure du dîner
        dayOfWeek: 3, // Mercredi
        sessionDuration: 300000, // 5 minutes
        recentActions: ['view_recipes', 'check_inventory'],
        familyProfile: mockParentProfile,
        currentInventory: [
          { name: 'Lait', expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
          { name: 'Œufs', expiryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) }
        ],
        weatherContext: {
          temperature: 5,
          condition: 'cold'
        },
        budgetStatus: {
          remaining: 25,
          percentUsed: 75
        }
      };

      const suggestions = await smartSuggestions.generateSuggestions(suggestionContext);

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);

      // Vérifier qu'il y a des suggestions pour les produits qui expirent
      const expirySuggestion = suggestions.find(s => 
        s.title.includes('expirent') || s.description.includes('expir')
      );
      expect(expirySuggestion).toBeDefined();
      if (expirySuggestion) {
        expect(expirySuggestion.priority).toBe('high');
        expect(expirySuggestion.confidence).toBeGreaterThan(0.8);
      }

      // Vérifier qu'il y a des suggestions pour le temps froid
      const weatherSuggestion = suggestions.find(s =>
        s.description.includes('chaud') || s.description.includes('réconfortant')
      );
      expect(weatherSuggestion).toBeDefined();
    });

    it('should adapt suggestions for child profiles', async () => {
      const childSuggestionContext = {
        userId: testUserId,
        currentSection: 'kitchen' as NavigationSection,
        timeOfDay: 16, // Après-midi
        dayOfWeek: 6, // Samedi
        sessionDuration: 120000,
        recentActions: [],
        familyProfile: mockChildProfile
      };

      const suggestions = await smartSuggestions.generateSuggestions(childSuggestionContext);

      expect(Array.isArray(suggestions)).toBe(true);
      
      // Vérifier l'adaptation pour enfants
      suggestions.forEach(suggestion => {
        if (suggestion.familyAdaptation) {
          expect(suggestion.familyAdaptation.childFriendly).toBe(true);
          expect(suggestion.familyAdaptation.safetyLevel).not.toBe('restricted');
          
          // Vérifier l'adaptation du langage
          expect(suggestion.familyAdaptation.adaptedLanguage).toBeDefined();
          expect(suggestion.familyAdaptation.adaptedLanguage.length).toBeGreaterThan(0);
        }
      });
    });

    it('should secure family suggestions with cipher', async () => {
      const testSuggestions = [
        {
          id: 'test-suggestion-1',
          type: 'navigation' as const,
          title: 'Test Suggestion',
          description: 'Test description with sensitive data',
          icon: 'ChefHat',
          confidence: 0.8,
          priority: 'medium' as const,
          action: {
            type: 'navigate' as const,
            target: 'shopping',
            data: { personalInfo: 'sensitive' }
          },
          context: {
            trigger: 'test',
            reasoning: [],
            timeRelevant: false,
            familyRelevant: true
          },
          presentation: {
            urgent: false,
            dismissible: true,
            autoHide: false
          }
        }
      ];

      const securedSuggestions = await cipherSecurityIntegration.secureFamilySuggestions(
        familyId,
        testSuggestions,
        mockChildProfile
      );

      expect(Array.isArray(securedSuggestions)).toBe(true);
      
      // Certaines suggestions peuvent être filtrées pour sécurité
      securedSuggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('familyAdaptation');
        if (suggestion.familyAdaptation) {
          expect(suggestion.familyAdaptation.safetyLevel).toBeDefined();
        }
      });
    });
  });

  describe('Personalization Engine', () => {
    it('should create user personalization', async () => {
      const personalization = await personalizationEngine.getUserPersonalization(testUserId);

      expect(personalization).toBeDefined();
      expect(personalization.userId).toBe(testUserId);
      expect(personalization.preferences).toBeDefined();
      expect(personalization.adaptations).toBeDefined();
      expect(personalization.learningProgress).toBeDefined();
    });

    it('should generate smart defaults', async () => {
      const defaults = await personalizationEngine.generateSmartDefaults(
        testUserId,
        mockParentProfile
      );

      expect(defaults).toBeDefined();
      expect(defaults.homepage).toBeDefined();
      expect(Array.isArray(defaults.quickActions)).toBe(true);
      expect(Array.isArray(defaults.preferredShortcuts)).toBe(true);
      expect(defaults.contextualShortcuts instanceof Map).toBe(true);
    });

    it('should adapt defaults for children', async () => {
      const childDefaults = await personalizationEngine.generateSmartDefaults(
        testUserId,
        mockChildProfile
      );

      expect(childDefaults).toBeDefined();
      
      // Vérifier adaptations enfant
      expect(childDefaults.quickActions.some(action => 
        action.includes('fun') || action.includes('easy')
      )).toBe(true);
      
      // Notifications adaptées
      expect(childDefaults.notifications.types).not.toContain('budget');
      expect(childDefaults.notifications.types).not.toContain('advanced');
    });

    it('should learn from behavior data', async () => {
      const behaviorData = {
        mostUsedFeatures: [
          { feature: 'recipe_browser', usage: 50 },
          { feature: 'meal_planning', usage: 30 }
        ],
        navigationPatterns: [
          { from: 'pantry', to: 'kitchen', frequency: 20 },
          { from: 'kitchen', to: 'shopping', frequency: 15 }
        ],
        timeSpentPerSection: {
          kitchen: 1800, // 30 minutes
          pantry: 600,   // 10 minutes
          shopping: 300,  // 5 minutes
          assistant: 120,
          insights: 60,
          games: 0,
          settings: 0,
          social: 0
        },
        errorPatterns: ['timeout_error'],
        discoveredFeatures: ['voice_input', 'ai_suggestions']
      };

      await personalizationEngine.updateFromBehavior(testUserId, behaviorData);
      
      const updatedPersonalization = await personalizationEngine.getUserPersonalization(testUserId);
      
      expect(updatedPersonalization.preferences.favoriteFeatures).toContain('recipe_browser');
      expect(updatedPersonalization.preferences.quickAccessItems).toContain('kitchen');
      expect(updatedPersonalization.learningProgress.expertiseLevel.kitchen).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Family Meal Planning Flow', () => {
    it('should complete full family meal planning with intelligence', async () => {
      // 1. Activer famille
      const familyState = await familyContextualIntelligence.activateFamilyIntelligence(
        familyId,
        [mockParentProfile, mockChildProfile],
        mockParentProfile,
        {
          supervisionLevel: 'medium',
          sharedInventory: true,
          coordinatedPlanning: true
        }
      );

      expect(familyState).toBeDefined();

      // 2. Analyser contexte
      const context = await contextAnalyzer.analyzeCurrentContext();
      const familyContext = contextAnalyzer.updateFamilyContext(context, mockParentProfile, {
        childrenPresent: true,
        supervisionLevel: 'medium',
        safetyRestrictionsActive: true
      });

      expect(familyContext.family).toBeDefined();

      // 3. Générer suggestions intelligentes
      const suggestionContext = {
        userId: testUserId,
        currentSection: 'kitchen' as NavigationSection,
        timeOfDay: familyContext.time.hour,
        dayOfWeek: familyContext.time.dayOfWeek,
        sessionDuration: 300000,
        recentActions: [],
        familyProfile: mockParentProfile
      };

      const suggestions = await smartSuggestions.generateSuggestions(suggestionContext);
      expect(Array.isArray(suggestions)).toBe(true);

      // 4. Sécuriser les suggestions
      const securedSuggestions = await cipherSecurityIntegration.secureFamilySuggestions(
        familyId,
        suggestions,
        mockParentProfile
      );

      expect(Array.isArray(securedSuggestions)).toBe(true);

      // 5. Changer de profil vers enfant
      const childTransition = await familyContextualIntelligence.handleFamilyProfileSwitch(
        familyId,
        mockParentProfile,
        mockChildProfile,
        'kitchen'
      );

      expect(childTransition.supervisionRequired).toBe(true);
      expect(childTransition.transitionSuggestions.length).toBeGreaterThanOrEqual(0);

      // 6. Vérifier sécurité action enfant
      const childActionCheck = await cipherSecurityIntegration.verifyChildAction(
        familyId,
        mockChildProfile,
        {
          type: 'navigate',
          target: 'kitchen'
        }
      );

      expect(childActionCheck.allowed).toBe(true);

      // 7. Tester action restreinte enfant
      const restrictedActionCheck = await cipherSecurityIntegration.verifyChildAction(
        familyId,
        mockChildProfile,
        {
          type: 'navigate',
          target: 'shopping' // Non autorisé pour cet enfant
        }
      );

      expect(restrictedActionCheck.allowed).toBe(false);
      expect(restrictedActionCheck.requiresApproval).toBe(true);
    });

    it('should handle family coordination conflicts', async () => {
      const conflictingSuggestions = [
        {
          memberId: mockParentProfile.id,
          suggestions: [{
            id: 'parent-suggestion',
            type: 'action' as const,
            title: 'Budget optimization',
            description: 'Optimize weekly budget',
            icon: 'DollarSign',
            confidence: 0.8,
            priority: 'high' as const,
            action: { type: 'execute' as const, target: 'optimize_budget' },
            context: {
              trigger: 'budget',
              reasoning: [],
              timeRelevant: false,
              familyRelevant: true
            },
            presentation: {
              urgent: true,
              dismissible: true,
              autoHide: false
            }
          }]
        },
        {
          memberId: mockChildProfile.id,
          suggestions: [{
            id: 'child-suggestion',
            type: 'family' as const,
            title: 'Fun cooking',
            description: 'Cook together',
            icon: 'Star',
            confidence: 0.9,
            priority: 'medium' as const,
            action: { type: 'navigate' as const, target: 'games' },
            context: {
              trigger: 'fun',
              reasoning: [],
              timeRelevant: false,
              familyRelevant: true
            },
            presentation: {
              urgent: false,
              dismissible: true,
              autoHide: true
            }
          }]
        }
      ];

      const coordination = await familyContextualIntelligence.coordinateFamilySuggestions(
        familyId,
        conflictingSuggestions
      );

      expect(coordination).toBeDefined();
      expect(Array.isArray(coordination.resolvedSuggestions)).toBe(true);
      expect(Array.isArray(coordination.compromiseOptions)).toBe(true);
      expect(typeof coordination.votingRequired).toBe('boolean');
    });
  });

  describe('Performance and Analytics', () => {
    it('should track suggestion performance metrics', async () => {
      // Simuler quelques interactions avec suggestions
      await smartSuggestions.markSuggestionShown('test-user', 'suggestion-1', {});
      await smartSuggestions.handleSuggestionAction('test-user', 'suggestion-1', 'accept');

      const metrics = smartSuggestions.getSuggestionMetrics('test-user');

      expect(metrics).toBeDefined();
      expect(typeof metrics.totalShown).toBe('number');
      expect(typeof metrics.acceptanceRate).toBe('number');
      expect(metrics.acceptanceRate).toBeGreaterThanOrEqual(0);
      expect(metrics.acceptanceRate).toBeLessThanOrEqual(1);
    });

    it('should provide navigation prediction statistics', async () => {
      // Enregistrer quelques patterns
      for (let i = 0; i < 5; i++) {
        navigationPredictor.recordNavigation(
          testUserId,
          'pantry',
          'kitchen',
          { mealTime: 'dinner' }
        );
      }

      const stats = navigationPredictor.getModelStatistics(testUserId);

      expect(stats).toBeDefined();
      expect(typeof stats.totalPatterns).toBe('number');
      expect(typeof stats.averageAccuracy).toBe('number');
      expect(Array.isArray(stats.mostFrequentTransitions)).toBe(true);
      expect(stats.temporalDistribution instanceof Map).toBe(true);
    });

    it('should analyze user behavior patterns', async () => {
      const analysis = await behaviorTracker.analyzeBehaviorPatterns(testUserId);

      expect(analysis).toBeDefined();
      expect(Array.isArray(analysis.patterns)).toBe(true);
      expect(Array.isArray(analysis.insights)).toBe(true);
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });
  });

  describe('Integration with Existing Meal Planning', () => {
    it('should integrate with existing meal planning engine', async () => {
      // Tester que l'intelligence s'intègre bien avec le moteur existant
      const mealPlanningEngine = await import('@/services/planning/core/MealPlanningEngine');
      
      expect(mealPlanningEngine.mealPlanningEngine).toBeDefined();
      expect(mealPlanningEngine.intelligentMealPlanningEngine).toBeDefined();
      
      // Vérifier que l'IA est activée
      expect(mealPlanningEngine.mealPlanningEngine.isAIEnabled()).toBe(true);
    });

    it('should work with contextual adaptations panel', async () => {
      // Test d'intégration avec le composant existant ContextualAdaptationsPanel
      const context = await contextAnalyzer.analyzeCurrentContext();
      
      // Vérifier que les données sont compatibles
      expect(context).toHaveProperty('time');
      expect(context).toHaveProperty('inventory');
      expect(context).toHaveProperty('external');
      expect(context).toHaveProperty('user');
    });
  });
});

describe('Error Handling and Edge Cases', () => {
  it('should handle missing family profile gracefully', async () => {
    const suggestions = await smartSuggestions.generateSuggestions({
      userId: 'test-user',
      currentSection: 'kitchen',
      timeOfDay: 12,
      dayOfWeek: 3,
      sessionDuration: 0,
      recentActions: []
      // No familyProfile
    });

    expect(Array.isArray(suggestions)).toBe(true);
    // Should not crash
  });

  it('should handle invalid cipher data', async () => {
    const invalidSecureData = {
      userId: 'test',
      encryptedData: 'invalid-encrypted-data',
      dataHash: 'invalid-hash',
      timestamp: new Date(),
      accessLevel: 'private' as const
    };

    await expect(
      cipherSecurityIntegration.decryptContextualData(
        invalidSecureData,
        'test',
        mockParentProfile
      )
    ).rejects.toThrow();
  });

  it('should handle network failures gracefully', async () => {
    // Mock network failure
    const originalFetch = global.fetch;
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error'))) as any;

    try {
      const context = await contextAnalyzer.analyzeCurrentContext();
      
      // Should return default context instead of crashing
      expect(context).toBeDefined();
      expect(context.external.weather).toBe('cloudy'); // Default value
    } finally {
      global.fetch = originalFetch;
    }
  });
});