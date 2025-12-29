import { useState, useEffect, useCallback } from 'react';
import { familyContextCoordinator } from '@/services/context/FamilyContextCoordinator';
import { 
  FamilyContextualState, 
  FamilyAdaptationResult,
  FamilyConflict,
  ConflictResolution 
} from '@/services/context/types';

interface UseFamilyContextOptions {
  familyId: string;
  planId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseFamilyContextReturn {
  familyState: FamilyContextualState | null;
  adaptationResult: FamilyAdaptationResult | null;
  loading: boolean;
  error: Error | null;
  conflicts: FamilyConflict[];
  resolutions: ConflictResolution[];
  consensusScore: number;
  refresh: () => Promise<void>;
  resolveConflict: (conflictId: string, method: string) => Promise<void>;
  updatePreferences: (preferences: Record<string, any>) => Promise<void>;
}

export function useFamilyContext({
  familyId,
  planId,
  autoRefresh = false,
  refreshInterval = 300000 // 5 minutes
}: UseFamilyContextOptions): UseFamilyContextReturn {
  const [familyState, setFamilyState] = useState<FamilyContextualState | null>(null);
  const [adaptationResult, setAdaptationResult] = useState<FamilyAdaptationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadFamilyContext = useCallback(async () => {
    if (!familyId) return;

    try {
      setLoading(true);
      setError(null);

      // Charger l'état de la famille
      const state = await familyContextCoordinator.getFamilyContextualState(familyId);
      setFamilyState(state);

      // Si un plan est fourni, charger les adaptations
      if (planId && state) {
        // TODO: Implémenter la récupération du plan depuis la base
        const basePlan = await fetchMealPlan(planId);
        
        if (basePlan) {
          const result = await familyContextCoordinator.coordinateFamilyAdaptations(
            familyId,
            basePlan,
            state.members
          );
          setAdaptationResult(result);
        }
      }
    } catch (err) {
      console.error('Failed to load family context:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [familyId, planId]);

  // Charger au montage et lors des changements
  useEffect(() => {
    loadFamilyContext();
  }, [loadFamilyContext]);

  // Auto-refresh si activé
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadFamilyContext();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadFamilyContext]);

  const resolveConflict = useCallback(async (conflictId: string, method: string) => {
    if (!adaptationResult) return;

    try {
      // TODO: Implémenter la résolution de conflit
      console.log('Resolving conflict:', conflictId, method);
      
      // Recharger après résolution
      await loadFamilyContext();
    } catch (err) {
      console.error('Failed to resolve conflict:', err);
      setError(err as Error);
    }
  }, [adaptationResult, loadFamilyContext]);

  const updatePreferences = useCallback(async (preferences: Record<string, any>) => {
    if (!familyState) return;

    try {
      // TODO: Implémenter la mise à jour des préférences
      console.log('Updating family preferences:', preferences);
      
      // Recharger après mise à jour
      await loadFamilyContext();
    } catch (err) {
      console.error('Failed to update preferences:', err);
      setError(err as Error);
    }
  }, [familyState, loadFamilyContext]);

  return {
    familyState,
    adaptationResult,
    loading,
    error,
    conflicts: adaptationResult?.conflicts || [],
    resolutions: adaptationResult?.resolutions || [],
    consensusScore: adaptationResult?.consensusScore || familyState?.consensusLevel || 0,
    refresh: loadFamilyContext,
    resolveConflict,
    updatePreferences
  };
}

// Fonction utilitaire pour récupérer un plan de repas
async function fetchMealPlan(planId: string): Promise<any> {
  // TODO: Implémenter l'appel API réel
  // En développement, retourner un plan mock
  return {
    id: planId,
    userId: 'user123',
    weekStart: new Date(),
    meals: [
      {
        id: 'meal1',
        day: 0,
        recipe: {
          id: 'recipe1',
          name: 'Spaghetti Bolognaise',
          tags: ['italian', 'comfort_food'],
          prepTime: 20,
          cookTime: 30,
          difficulty: 'medium',
          ingredients: [],
          cost: 12
        },
        servings: 4
      },
      // ... autres repas
    ],
    totalCost: 84,
    totalPrepTime: 350,
    familySize: 4
  };
}