import { useState, useEffect, useCallback } from 'react';
import { contextAdapter } from '@/services/context/ContextAdapter';
import { 
  AdaptedMealPlan,
  UserContextPreferences, 
  AdaptationLog 
} from '@/services/context/types';

interface UseContextualAdaptationOptions {
  userId?: string;
  enabled?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseContextualAdaptationReturn {
  adaptedPlan: AdaptedMealPlan | null;
  adaptations: AdaptationLog[];
  isAdapting: boolean;
  error: Error | null;
  confidence: number;
  executionTime: number;
  preferences: UserContextPreferences | null;
  adaptPlan: (basePlan: any) => Promise<void>;
  refreshContext: () => Promise<void>;
  updatePreferences: (newPrefs: Partial<UserContextPreferences>) => Promise<void>;
  applyAdaptation: (adaptationId: string) => Promise<void>;
  rejectAdaptation: (adaptationId: string) => Promise<void>;
}

export function useContextualAdaptation(
  options: UseContextualAdaptationOptions = {}
): UseContextualAdaptationReturn {
  const { 
    userId, 
    enabled = true, 
    autoRefresh = false, 
    refreshInterval = 300000 // 5 minutes
  } = options;

  const [adaptedPlan, setAdaptedPlan] = useState<AdaptedMealPlan | null>(null);
  const [isAdapting, setIsAdapting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [preferences, setPreferences] = useState<UserContextPreferences | null>(null);

  // Charger les préférences utilisateur au démarrage
  useEffect(() => {
    if (userId && enabled) {
      loadUserPreferences();
    }
  }, [userId, enabled]);

  // Auto-refresh si activé
  useEffect(() => {
    if (!autoRefresh || !adaptedPlan) return;

    const interval = setInterval(() => {
      refreshContext();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, adaptedPlan]);

  const loadUserPreferences = async () => {
    if (!userId) return;

    try {
      // Simuler les préférences par défaut
      // En production, récupérer depuis Supabase
      const defaultPreferences: UserContextPreferences = {
        weather_adaptation: true,
        calendar_sync: false, // Désactivé par défaut car nécessite auth
        seasonal_preferences: true,
        price_optimization: true,
        weather_sensitivity: 'medium',
        schedule_flexibility: 'flexible',
        price_sensitivity: 'medium',
        seasonal_commitment: 'moderate',
        max_adaptations_per_week: 5,
        home_location: { lat: 48.8566, lng: 2.3522 }, // Paris par défaut
        preferred_stores: ['carrefour', 'leclerc'],
        family_context_enabled: false
      };

      setPreferences(defaultPreferences);
    } catch (err) {
      console.error('Failed to load user preferences:', err);
      setError(err as Error);
    }
  };

  const adaptPlan = useCallback(async (basePlan: any) => {
    if (!userId || !preferences || !enabled) return;

    setIsAdapting(true);
    setError(null);

    try {
      const result = await contextAdapter.adaptMealPlan(
        basePlan,
        userId,
        preferences
      );

      setAdaptedPlan(result);
      
      // Log pour debugging
      console.log(`✅ Plan adapté avec ${result.adaptations.length} adaptations en ${result.executionTime.toFixed(0)}ms`);
    } catch (err) {
      console.error('Failed to adapt meal plan:', err);
      setError(err as Error);
    } finally {
      setIsAdapting(false);
    }
  }, [userId, preferences, enabled]);

  const refreshContext = useCallback(async () => {
    if (adaptedPlan?.originalPlan) {
      await adaptPlan(adaptedPlan.originalPlan);
    }
  }, [adaptedPlan, adaptPlan]);

  const updatePreferences = useCallback(async (newPrefs: Partial<UserContextPreferences>) => {
    if (!preferences) return;

    const updatedPrefs = { ...preferences, ...newPrefs };
    setPreferences(updatedPrefs);

    // TODO: Sauvegarder dans Supabase
    console.log('Preferences updated:', newPrefs);

    // Re-adapter si un plan existe
    if (adaptedPlan?.originalPlan) {
      await adaptPlan(adaptedPlan.originalPlan);
    }
  }, [preferences, adaptedPlan, adaptPlan]);

  const applyAdaptation = useCallback(async (adaptationId: string) => {
    if (!adaptedPlan) return;

    try {
      const adaptation = adaptedPlan.adaptations.find(a => 
        `${a.type}_${a.day}_${a.adapted}` === adaptationId
      );

      if (adaptation) {
        // Appliquer l'adaptation au plan
        console.log('Applying adaptation:', adaptation);
        
        // TODO: Enregistrer le feedback positif dans Cipher
        // await cipherContextIntegration.recordContextualExperience(...)
      }
    } catch (err) {
      console.error('Failed to apply adaptation:', err);
      setError(err as Error);
    }
  }, [adaptedPlan]);

  const rejectAdaptation = useCallback(async (adaptationId: string) => {
    if (!adaptedPlan) return;

    try {
      const adaptation = adaptedPlan.adaptations.find(a => 
        `${a.type}_${a.day}_${a.adapted}` === adaptationId
      );

      if (adaptation) {
        console.log('Rejecting adaptation:', adaptation);
        
        // TODO: Enregistrer le feedback négatif dans Cipher
        // await cipherContextIntegration.recordContextualExperience(...)
      }
    } catch (err) {
      console.error('Failed to reject adaptation:', err);
      setError(err as Error);
    }
  }, [adaptedPlan]);

  return {
    adaptedPlan,
    adaptations: adaptedPlan?.adaptations || [],
    isAdapting,
    error,
    confidence: adaptedPlan?.confidence || 0,
    executionTime: adaptedPlan?.executionTime || 0,
    preferences,
    adaptPlan,
    refreshContext,
    updatePreferences,
    applyAdaptation,
    rejectAdaptation
  };
}