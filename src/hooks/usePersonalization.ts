import { useState, useEffect, useCallback } from 'react';
import { PersonalizationData, OnboardingAnswer } from '@/types/onboarding';
import { PERSONALIZATION_STORAGE_KEY } from '@/config/onboarding';

export const usePersonalization = () => {
  const [personalizationData, setPersonalizationData] = useState<PersonalizationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load personalization data from localStorage
  useEffect(() => {
    const loadPersonalizationData = () => {
      const saved = localStorage.getItem(PERSONALIZATION_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Convert date strings back to Date objects
          if (parsed.onboardingCompletedAt) {
            parsed.onboardingCompletedAt = new Date(parsed.onboardingCompletedAt);
          }
          setPersonalizationData(parsed);
        } catch (error) {
          console.error('Failed to parse personalization data:', error);
        }
      }
      setIsLoading(false);
    };

    loadPersonalizationData();
  }, []);

  const savePersonalizationData = useCallback((answers: OnboardingAnswer[]) => {
    const data: PersonalizationData = {
      householdSize: '',
      dietaryPreferences: [],
      cookingLevel: 1,
      goals: [],
      onboardingCompletedAt: new Date()
    };

    // Process answers to extract personalization data
    answers.forEach(answer => {
      switch (answer.stepId) {
        case 'household-setup':
          data.householdSize = answer.value;
          break;
        case 'dietary-preferences':
          data.dietaryPreferences = Array.isArray(answer.value) ? answer.value : [];
          break;
        case 'cooking-level':
          data.cookingLevel = typeof answer.value === 'number' ? answer.value : 1;
          break;
        case 'goals':
          data.goals = Array.isArray(answer.value) ? answer.value : [];
          break;
        case 'initial-inventory':
          data.initialInventoryScan = answer.value === true;
          break;
      }
    });

    // Save to localStorage
    localStorage.setItem(PERSONALIZATION_STORAGE_KEY, JSON.stringify(data));
    setPersonalizationData(data);
  }, []);

  const updatePersonalizationData = useCallback((updates: Partial<PersonalizationData>) => {
    if (!personalizationData) return;

    const updatedData = {
      ...personalizationData,
      ...updates
    };

    localStorage.setItem(PERSONALIZATION_STORAGE_KEY, JSON.stringify(updatedData));
    setPersonalizationData(updatedData);
  }, [personalizationData]);

  const clearPersonalizationData = useCallback(() => {
    localStorage.removeItem(PERSONALIZATION_STORAGE_KEY);
    setPersonalizationData(null);
  }, []);

  // Helper functions to get specific preferences
  const getHouseholdSize = useCallback(() => {
    return personalizationData?.householdSize || '';
  }, [personalizationData]);

  const getDietaryPreferences = useCallback(() => {
    return personalizationData?.dietaryPreferences || [];
  }, [personalizationData]);

  const getCookingLevel = useCallback(() => {
    return personalizationData?.cookingLevel || 1;
  }, [personalizationData]);

  const getGoals = useCallback(() => {
    return personalizationData?.goals || [];
  }, [personalizationData]);

  const hasDietaryRestriction = useCallback((restriction: string) => {
    return getDietaryPreferences().includes(restriction);
  }, [getDietaryPreferences]);

  const isVegetarian = useCallback(() => {
    return hasDietaryRestriction('vegetarian') || hasDietaryRestriction('vegan');
  }, [hasDietaryRestriction]);

  const isVegan = useCallback(() => {
    return hasDietaryRestriction('vegan');
  }, [hasDietaryRestriction]);

  const isGlutenFree = useCallback(() => {
    return hasDietaryRestriction('gluten-free');
  }, [hasDietaryRestriction]);

  const isLactoseFree = useCallback(() => {
    return hasDietaryRestriction('lactose-free') || hasDietaryRestriction('vegan');
  }, [hasDietaryRestriction]);

  // Get cooking level description
  const getCookingLevelDescription = useCallback(() => {
    const level = getCookingLevel();
    if (level <= 0.33) return { label: 'Débutant', emoji: '🍳' };
    if (level <= 0.66) return { label: 'Intermédiaire', emoji: '👨‍🍳' };
    return { label: 'Expert', emoji: '👨‍🍳✨' };
  }, [getCookingLevel]);

  // Check if user has completed onboarding
  const hasCompletedOnboarding = useCallback(() => {
    return personalizationData !== null;
  }, [personalizationData]);

  return {
    personalizationData,
    isLoading,
    savePersonalizationData,
    updatePersonalizationData,
    clearPersonalizationData,
    getHouseholdSize,
    getDietaryPreferences,
    getCookingLevel,
    getCookingLevelDescription,
    getGoals,
    hasDietaryRestriction,
    isVegetarian,
    isVegan,
    isGlutenFree,
    isLactoseFree,
    hasCompletedOnboarding
  };
};