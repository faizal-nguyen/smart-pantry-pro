import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { PersonalizationData, OnboardingAnswer } from '@/types/onboarding';
import { PERSONALIZATION_STORAGE_KEY } from '@/config/onboarding';
import { useAuthSessionOptional } from '@/hooks/useAuthenticatedUser';

const PREFERENCES_EVENT = 'smart-pantry-preferences-change';
const STORAGE_UNAVAILABLE = 'storage-unavailable';
function subscribe(listener: () => void) {
  window.addEventListener(PREFERENCES_EVENT,listener);
  window.addEventListener('storage',listener);
  return () => {
    window.removeEventListener(PREFERENCES_EVENT,listener);
    window.removeEventListener('storage',listener);
  };
}
function emptyPreferences(): PersonalizationData {
  return { householdSize: '', dietaryPreferences: [], cookingLevel: 1, goals: [], onboardingCompletedAt: new Date() };
}

/** Local preferences and their work files belong to one authenticated account.
 * The unowned legacy value is kept, but never imported into an arbitrary account.
 * Server synchronization and nutritional policy remain part of V10-03.
 */
export const usePersonalization = () => {
  const { user, isLoading } = useAuthSessionOptional();
  const key = user ? `v10-personalization:${user.id}:cooking` : isLoading ? null : 'v10-draft:anonymous:personalization';
  const read = useCallback(() => {
    if (!key) return null;
    try { return localStorage.getItem(key); } catch { return STORAGE_UNAVAILABLE; }
  },[key]);
  const raw = useSyncExternalStore(subscribe,read,() => null);
  const parsed = useMemo((): { data: PersonalizationData | null; error: string | null } => {
    if (!raw) return { data: null, error: null };
    if (raw === STORAGE_UNAVAILABLE) return { data: null, error: 'Les préférences ne peuvent pas être relues sur cet appareil.' };
    try {
      const value = JSON.parse(raw) as PersonalizationData;
      if (!value || typeof value.householdSize !== 'string' || !Array.isArray(value.dietaryPreferences) ||
          !value.dietaryPreferences.every(item => typeof item === 'string') || !Array.isArray(value.goals) ||
          !value.goals.every(item => typeof item === 'string') || !Number.isFinite(value.cookingLevel)) throw new Error();
      const completed = new Date(value.onboardingCompletedAt);
      if (!Number.isFinite(completed.getTime())) throw new Error();
      return { data: { ...value, onboardingCompletedAt: completed }, error: null };
    } catch { return { data: null, error: 'Les préférences enregistrées sont illisibles. Elles sont conservées ; vérifie-les avant de les remplacer.' }; }
  },[raw]);
  const personalizationData = parsed.data;
  let hasUnassignedLegacyPreferences = false;
  try { hasUnassignedLegacyPreferences = !!user && !raw && !!localStorage.getItem(PERSONALIZATION_STORAGE_KEY); } catch { /* Read error is already visible. */ }

  const persist = useCallback((value: PersonalizationData | null) => {
    if (!key || isLoading) throw new Error('Connecte-toi pour enregistrer les préférences de ce compte.');
    if (parsed.error) throw new Error(parsed.error);
    try {
      if (value) {
        const encoded = JSON.stringify(value);
        localStorage.setItem(key,encoded);
        if (localStorage.getItem(key) !== encoded) throw new Error();
      } else localStorage.removeItem(key);
    } catch { throw new Error('Impossible d’enregistrer les préférences sur cet appareil. Ta saisie est conservée.'); }
    window.dispatchEvent(new Event(PREFERENCES_EVENT));
  },[key,isLoading,parsed.error]);

  const savePersonalizationData = useCallback((answers: OnboardingAnswer[]) => {
    const data = emptyPreferences();
    for (const answer of answers) {
      switch (answer.stepId) {
        case 'household-setup': data.householdSize = typeof answer.value === 'string' ? answer.value : ''; break;
        case 'dietary-preferences': data.dietaryPreferences = Array.isArray(answer.value) ? answer.value.filter(item => typeof item === 'string') : []; break;
        case 'cooking-level': data.cookingLevel = typeof answer.value === 'number' ? answer.value : 1; break;
        case 'goals': data.goals = Array.isArray(answer.value) ? answer.value.filter(item => typeof item === 'string') : []; break;
        case 'initial-inventory': data.initialInventoryScan = answer.value === true; break;
      }
    }
    persist(data);
  },[persist]);
  const updatePersonalizationData = useCallback((updates: Partial<PersonalizationData>) => {
    persist({ ...(personalizationData ?? emptyPreferences()), ...updates });
  },[personalizationData,persist]);
  const clearPersonalizationData = useCallback(() => persist(null),[persist]);
  const getHouseholdSize = useCallback(() => personalizationData?.householdSize || '',[personalizationData]);
  const getDietaryPreferences = useCallback(() => personalizationData?.dietaryPreferences || [],[personalizationData]);
  const getCookingLevel = useCallback(() => personalizationData?.cookingLevel || 1,[personalizationData]);
  const getGoals = useCallback(() => personalizationData?.goals || [],[personalizationData]);
  const hasDietaryRestriction = useCallback((restriction: string) => getDietaryPreferences().includes(restriction),[getDietaryPreferences]);
  const isVegetarian = useCallback(() => hasDietaryRestriction('vegetarian') || hasDietaryRestriction('vegan'),[hasDietaryRestriction]);
  const isVegan = useCallback(() => hasDietaryRestriction('vegan'),[hasDietaryRestriction]);
  const isGlutenFree = useCallback(() => hasDietaryRestriction('gluten-free'),[hasDietaryRestriction]);
  const isLactoseFree = useCallback(() => hasDietaryRestriction('lactose-free') || hasDietaryRestriction('vegan'),[hasDietaryRestriction]);
  const getCookingLevelDescription = useCallback(() => {
    const level = getCookingLevel();
    if (level <= 0.33) return { label: 'Débutant', emoji: '🍳' };
    if (level <= 0.66) return { label: 'Intermédiaire', emoji: '👨‍🍳' };
    return { label: 'Expert', emoji: '👨‍🍳✨' };
  },[getCookingLevel]);
  const hasCompletedOnboarding = useCallback(() => personalizationData !== null,[personalizationData]);
  return { personalizationData, isLoading, error: parsed.error, hasUnassignedLegacyPreferences,
    savePersonalizationData, updatePersonalizationData, clearPersonalizationData, getHouseholdSize,
    getDietaryPreferences, getCookingLevel, getCookingLevelDescription, getGoals, hasDietaryRestriction,
    isVegetarian, isVegan, isGlutenFree, isLactoseFree, hasCompletedOnboarding };
};
