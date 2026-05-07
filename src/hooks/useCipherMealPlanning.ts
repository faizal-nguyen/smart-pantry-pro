/**
 * Enhanced Meal Planning Hook with Cipher Encryption and Family Mode
 * Integrates intelligent navigation and secure data handling
 */

import { useState, useCallback, useEffect } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { useMealPlanningAnalysis } from './useMealPlanningAnalysis';
import { useFamilyMode } from './useFamilyMode';
import { cipherMealPlanning } from '@/services/navigation-intelligence/CipherMealPlanningIntegration';
import { familyContextualIntelligence } from '@/services/navigation-intelligence/FamilyContextualIntelligence';
import { toast } from 'sonner';

export interface CipherMealPlanningState {
  encryptedPlanId: string | null;
  isEncrypting: boolean;
  isDecrypting: boolean;
  familyAdaptations: Record<string, any>;
  navigationSuggestions: Array<{
    type: 'navigation' | 'action' | 'reminder';
    suggestion: string;
    icon: string;
    priority: number;
    action: () => void;
  }>;
  securityStatus: {
    isEncrypted: boolean;
    lastEncrypted?: Date;
    encryptionVersion: string;
  };
}

export function useCipherMealPlanning() {
  const user = useUser();
  const { 
    currentPlan, 
    generateWeeklyPlan, 
    optimizeShoppingList,
    userPreferences,
    saveMealPlan
  } = useMealPlanningAnalysis();
  
  // P0.1 fix: useFamilyMode exposes `availableProfiles`, not
  // `familyProfiles` (cf. types/family-mode.ts). The previous name
  // resolved to undefined and crashed `/kitchen/meal-planning` on every
  // visit (`Cannot read properties of undefined (reading 'length')`).
  // Default to [] so a future contract drift surfaces as an empty
  // family rather than a runtime crash.
  const {
    isFamilyModeActive,
    currentProfile,
    availableProfiles = [],
    switchProfile,
  } = useFamilyMode();

  const [state, setState] = useState<CipherMealPlanningState>({
    encryptedPlanId: null,
    isEncrypting: false,
    isDecrypting: false,
    familyAdaptations: {},
    navigationSuggestions: [],
    securityStatus: {
      isEncrypted: false,
      encryptionVersion: '1.0'
    }
  });

  // Load navigation suggestions on context change
  useEffect(() => {
    if (user && currentProfile) {
      updateNavigationSuggestions();
    }
  }, [user, currentProfile, currentPlan, isFamilyModeActive]);

  // Update family adaptations when family mode changes
  useEffect(() => {
    if (isFamilyModeActive && currentPlan && availableProfiles.length > 0) {
      generateFamilyAdaptations();
    }
  }, [isFamilyModeActive, availableProfiles, currentPlan]);

  /**
   * Generate and encrypt meal plan with Cipher integration
   */
  const generateSecureMealPlan = useCallback(async (
    customPreferences?: any
  ) => {
    if (!user) {
      toast.error('Utilisateur non connecté');
      return;
    }

    try {
      // Generate meal plan
      await generateWeeklyPlan(customPreferences);

      // If plan was generated, encrypt it
      if (currentPlan) {
        await encryptMealPlan();
      }
    } catch (error) {
      console.error('Failed to generate secure meal plan:', error);
      toast.error('Erreur lors de la génération sécurisée du plan');
    }
  }, [user, generateWeeklyPlan, currentPlan]);

  /**
   * Encrypt current meal plan with Cipher
   */
  const encryptMealPlan = useCallback(async () => {
    if (!currentPlan || !user) return;

    setState(prev => ({ ...prev, isEncrypting: true }));

    try {
      const mealPlanData = {
        id: currentPlan.id,
        userId: user.id,
        weekStartDate: currentPlan.weekStartDate,
        meals: currentPlan.meals,
        familyMembers: isFamilyModeActive ? availableProfiles : undefined,
        budgetGoal: userPreferences?.budgetConstraints.weeklyBudget,
        nutritionalGoals: userPreferences?.nutritionalGoals,
        contextData: {
          season: getCurrentSeason(),
          weather: await getWeatherContext(),
          events: []
        }
      };

      const encryptedId = await cipherMealPlanning.storeEncryptedMealPlan(
        mealPlanData,
        {
          familyMode: isFamilyModeActive,
          currentProfile,
          contextualData: {
            timeOfDay: new Date().getHours(),
            dayOfWeek: new Date().getDay()
          }
        }
      );

      setState(prev => ({
        ...prev,
        encryptedPlanId: encryptedId,
        isEncrypting: false,
        securityStatus: {
          isEncrypted: true,
          lastEncrypted: new Date(),
          encryptionVersion: '1.0'
        }
      }));

      toast.success('Plan de repas chiffré avec succès');
    } catch (error) {
      console.error('Failed to encrypt meal plan:', error);
      setState(prev => ({ ...prev, isEncrypting: false }));
      toast.error('Erreur lors du chiffrement');
    }
  }, [currentPlan, user, isFamilyModeActive, availableProfiles, userPreferences, currentProfile]);

  /**
   * Decrypt and retrieve meal plan
   */
  const decryptMealPlan = useCallback(async (planId: string) => {
    if (!user) return;

    setState(prev => ({ ...prev, isDecrypting: true }));

    try {
      const result = await cipherMealPlanning.retrieveAndDecryptMealPlan(
        planId,
        user.id,
        {
          familyMode: isFamilyModeActive,
          requestContext: {
            currentProfile: currentProfile?.id
          }
        }
      );

      // Apply any Cipher suggestions
      if (result.suggestions.length > 0) {
        toast.info(`${result.suggestions.length} suggestions disponibles`);
      }

      setState(prev => ({ ...prev, isDecrypting: false }));
    } catch (error) {
      console.error('Failed to decrypt meal plan:', error);
      setState(prev => ({ ...prev, isDecrypting: false }));
      toast.error('Erreur lors du déchiffrement');
    }
  }, [user, isFamilyModeActive, currentProfile]);

  /**
   * Generate family-adapted meal plan
   */
  const generateFamilyAdaptations = useCallback(async () => {
    if (!currentPlan || !user) return;

    try {
      const optimized = await cipherMealPlanning.optimizeMealPlanForFamily(
        {
          id: currentPlan.id,
          userId: user.id,
          weekStartDate: currentPlan.weekStartDate,
          meals: currentPlan.meals,
          familyMembers: availableProfiles,
          budgetGoal: userPreferences?.budgetConstraints.weeklyBudget,
          nutritionalGoals: userPreferences?.nutritionalGoals
        },
        {
          familyMode: true,
          stressLevel: 2, // Normal stress
          timeConstraints: 45, // 45 minutes max
          currentInventory: [] // TODO: Get from inventory
        }
      );

      setState(prev => ({
        ...prev,
        familyAdaptations: optimized.adaptations
      }));

      // Apply adaptations to current plan
      if (Object.keys(optimized.adaptations).length > 0) {
        toast.info(optimized.explanation);
      }
    } catch (error) {
      console.error('Failed to generate family adaptations:', error);
    }
  }, [currentPlan, user, availableProfiles, userPreferences]);

  /**
   * Update navigation suggestions based on context
   */
  const updateNavigationSuggestions = useCallback(async () => {
    if (!user) return;

    try {
      const suggestions = await cipherMealPlanning.generateNavigationSuggestions(
        user.id,
        {
          timeOfDay: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
          hasActivePlan: !!currentPlan,
          lastPlanDate: currentPlan?.weekStartDate,
          inventoryStatus: 'medium', // TODO: Get from inventory
          familyMode: isFamilyModeActive
        }
      );

      setState(prev => ({
        ...prev,
        navigationSuggestions: suggestions
      }));
    } catch (error) {
      console.error('Failed to update navigation suggestions:', error);
    }
  }, [user, currentPlan, isFamilyModeActive]);

  /**
   * Handle smart navigation action
   */
  const handleSmartNavigation = useCallback(async (action: string, data?: any) => {
    // Log navigation pattern for learning
    try {
      await cipherMealPlanning.analyzeMealPlanningPatterns(
        user?.id || 'anonymous',
        {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days
          end: new Date()
        }
      );
    } catch (error) {
      console.error('Failed to analyze patterns:', error);
    }

    // Execute the action
    switch (action) {
      case 'show_meal_planning_reminder':
        toast.info('C\'est le moment idéal pour planifier vos repas de la semaine!');
        break;
      case 'generate_shopping_list':
        if (currentPlan) {
          await optimizeShoppingList(currentPlan);
        }
        break;
      case 'show_budget_optimizer':
        toast.info('Optimisez votre budget repas');
        break;
      default:
        console.log('Unhandled smart navigation:', action, data);
    }
  }, [user, currentPlan, optimizeShoppingList]);

  /**
   * Switch family profile with meal plan adaptation
   */
  const switchFamilyProfile = useCallback(async (profileId: string) => {
    if (!isFamilyModeActive) return;

    try {
      // Switch profile
      await switchProfile(profileId);

      // If we have a meal plan, adapt it for the new profile
      if (currentPlan) {
        await generateFamilyAdaptations();
      }

      // Update navigation suggestions for new profile
      await updateNavigationSuggestions();
    } catch (error) {
      console.error('Failed to switch family profile:', error);
      toast.error('Erreur lors du changement de profil');
    }
  }, [isFamilyModeActive, switchProfile, currentPlan, generateFamilyAdaptations, updateNavigationSuggestions]);

  /**
   * Get family-adapted suggestions
   */
  const getFamilyAdaptedSuggestions = useCallback(async () => {
    if (!isFamilyModeActive || !user || !currentProfile) return [];

    try {
      const intelligence = await familyContextualIntelligence.getFamilyAdaptedIntelligence(
        `family_${user.id}`,
        currentProfile.id,
        'kitchen'
      );

      return intelligence.personalizedSuggestions;
    } catch (error) {
      console.error('Failed to get family adapted suggestions:', error);
      return [];
    }
  }, [isFamilyModeActive, user, currentProfile]);

  return {
    // Original meal planning features
    currentPlan,
    generateWeeklyPlan: generateSecureMealPlan,
    optimizeShoppingList,
    userPreferences,

    // Cipher encryption features
    ...state,
    encryptMealPlan,
    decryptMealPlan,

    // Family mode features
    isFamilyModeActive,
    currentProfile,
    availableProfiles,
    switchFamilyProfile,
    getFamilyAdaptedSuggestions,

    // Navigation intelligence
    handleSmartNavigation,
    updateNavigationSuggestions,

    // Computed values
    isSecure: state.securityStatus.isEncrypted,
    canEncrypt: !!currentPlan && !state.isEncrypting,
    hasFamilyAdaptations: Object.keys(state.familyAdaptations).length > 0
  };
}

// Helper functions
function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

async function getWeatherContext(): Promise<string> {
  // In production, this would call a weather API
  // For now, return a mock value
  return 'sunny';
}