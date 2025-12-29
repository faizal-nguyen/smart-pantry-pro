"use client";

import { useState, useCallback, useEffect } from 'react';
import { panicEngine } from '@/services/panic-mode/PanicEngine';

interface PanicContext {
  userId: string;
  timeAvailable: number;
  stressLevel: 1 | 2 | 3 | 4 | 5;
  familyMembers: number;
  currentLocation?: { lat: number; lng: number };
  inventory?: InventoryItem[];
  preferences?: UserPreferences;
  triggerType?: 'manual' | 'automatic' | 'time_based' | 'context_based' | 'shake' | 'gesture';
}

interface PanicSolution {
  id: string;
  type: 'instant' | 'delivery' | 'prepared' | 'restaurant';
  title: string;
  description: string;
  timeRequired: number;
  estimatedCost?: number;
  difficulty: 'trivial' | 'easy' | 'medium';
  confidence: number;
  steps?: string[];
  ingredients?: Array<{name: string; amount: number; unit: string}>;
  restaurant?: any;
  recipe?: any;
  category?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
  category?: string;
}

interface UserPreferences {
  cuisines: string[];
  dietaryRestrictions: string[];
  budgetConstraints: {
    weeklyBudget: number;
    maxMealCost: number;
  };
  timeConstraints: {
    maxPrepTime: number;
    maxCookTime: number;
  };
  familySize: number;
}

interface PanicPreferences {
  maxCookingTime: number;
  preferredSolutionType: 'instant' | 'delivery' | 'prepared' | 'any';
  favoriteRecipes: string[];
  blockedRestaurants: string[];
  autoTriggerEnabled: boolean;
  autoTriggerTime: string;
  notificationAdvance: number;
}

export function usePanicMode() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSolutions, setLastSolutions] = useState<PanicSolution[]>([]);
  const [panicPreferences, setPanicPreferences] = useState<PanicPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Charger les préférences de panic au démarrage
  useEffect(() => {
    loadPanicPreferences();
  }, []);

  /**
   * Déclenche le mode panique et retourne les solutions
   */
  const triggerPanicMode = useCallback(async (context: PanicContext): Promise<PanicSolution[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Enrichir le contexte avec les préférences utilisateur si disponibles
      const enrichedContext = {
        ...context,
        preferences: await getUserPreferences(context.userId),
        inventory: await getUserInventory(context.userId)
      };

      // Déclencher le moteur de panic
      const solutions = await panicEngine.triggerPanic(enrichedContext);
      
      setLastSolutions(solutions);
      
      // Log analytics
      trackPanicEvent({
        userId: context.userId,
        triggerType: context.triggerType || 'manual',
        solutionCount: solutions.length,
        timestamp: new Date().toISOString()
      });

      return solutions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue lors du panic mode';
      setError(errorMessage);
      
      // Retourner des solutions d'urgence en cas d'erreur
      const fallbackSolutions: PanicSolution[] = [
        {
          id: 'emergency-fallback-1',
          type: 'delivery',
          title: 'Commander une pizza',
          description: 'Solution de secours fiable',
          timeRequired: 25,
          difficulty: 'trivial',
          confidence: 90,
          estimatedCost: 15
        },
        {
          id: 'emergency-fallback-2',
          type: 'instant',
          title: 'Pâtes express',
          description: 'Rapide avec les basiques du placard',
          timeRequired: 10,
          difficulty: 'trivial',
          confidence: 85
        }
      ];
      
      setLastSolutions(fallbackSolutions);
      return fallbackSolutions;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Déclenche un panic mode automatique basé sur l'heure
   */
  const triggerAutoPanic = useCallback(async (userId: string): Promise<PanicSolution[]> => {
    const context: PanicContext = {
      userId,
      timeAvailable: 45, // Plus de temps pour l'auto-trigger
      stressLevel: 3, // Niveau moyen pour auto
      familyMembers: 2, // Valeur par défaut, sera enrichie
      triggerType: 'automatic'
    };

    return triggerPanicMode(context);
  }, [triggerPanicMode]);

  /**
   * Déclenche panic mode par gesture (shake, etc.)
   */
  const triggerGesturePanic = useCallback(async (userId: string, gestureType: string): Promise<PanicSolution[]> => {
    const context: PanicContext = {
      userId,
      timeAvailable: 30,
      stressLevel: 4, // Plus élevé pour les gestes
      familyMembers: 2,
      triggerType: 'gesture'
    };

    return triggerPanicMode(context);
  }, [triggerPanicMode]);

  /**
   * Charge les préférences de panic mode de l'utilisateur
   */
  const loadPanicPreferences = useCallback(async (userId?: string): Promise<void> => {
    if (!userId) return;
    
    try {
      // Simulé pour le moment - à implémenter avec Supabase
      const preferences: PanicPreferences = {
        maxCookingTime: 15,
        preferredSolutionType: 'any',
        favoriteRecipes: [],
        blockedRestaurants: [],
        autoTriggerEnabled: true,
        autoTriggerTime: '18:00',
        notificationAdvance: 30
      };
      
      setPanicPreferences(preferences);
    } catch (err) {
      console.warn('Failed to load panic preferences:', err);
    }
  }, []);

  /**
   * Sauvegarde les préférences de panic mode
   */
  const savePanicPreferences = useCallback(async (userId: string, preferences: Partial<PanicPreferences>): Promise<void> => {
    try {
      // À implémenter avec Supabase
      setPanicPreferences(prev => prev ? { ...prev, ...preferences } : null);
    } catch (err) {
      console.error('Failed to save panic preferences:', err);
      throw err;
    }
  }, []);

  /**
   * Obtient l'inventaire de l'utilisateur pour le contexte
   */
  const getUserInventory = useCallback(async (userId: string): Promise<InventoryItem[]> => {
    try {
      // Simulé - à implémenter avec l'API
      return [
        { id: '1', name: 'pâtes', quantity: 500, unit: 'g', category: 'carbs' },
        { id: '2', name: 'tomates', quantity: 3, unit: 'pcs', category: 'vegetables' },
        { id: '3', name: 'ail', quantity: 1, unit: 'bulbe', category: 'aromatics' }
      ];
    } catch (err) {
      console.warn('Failed to get user inventory:', err);
      return [];
    }
  }, []);

  /**
   * Obtient les préférences utilisateur pour enrichir le contexte
   */
  const getUserPreferences = useCallback(async (userId: string): Promise<UserPreferences | undefined> => {
    try {
      // Simulé - à implémenter avec l'API
      return {
        cuisines: ['italien', 'français'],
        dietaryRestrictions: [],
        budgetConstraints: {
          weeklyBudget: 80,
          maxMealCost: 25
        },
        timeConstraints: {
          maxPrepTime: 20,
          maxCookTime: 30
        },
        familySize: 2
      };
    } catch (err) {
      console.warn('Failed to get user preferences:', err);
      return undefined;
    }
  }, []);

  /**
   * Enregistre la sélection d'une solution pour analytics
   */
  const recordSolutionSelection = useCallback(async (solutionId: string, userId: string): Promise<void> => {
    try {
      // Analytics tracking
      trackPanicSolutionSelected({
        solutionId,
        userId,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Failed to record solution selection:', err);
    }
  }, []);

  /**
   * Obtient les statistiques d'utilisation du panic mode
   */
  const getPanicStats = useCallback(async (userId: string): Promise<any> => {
    try {
      // À implémenter avec l'API analytics
      return {
        totalPanics: 12,
        averageResolutionTime: 18,
        preferredSolutionType: 'instant',
        successRate: 0.92,
        peakPanicHour: 18,
        weeklyTrend: [2, 3, 1, 4, 2, 1, 0] // Dernière semaine
      };
    } catch (err) {
      console.warn('Failed to get panic stats:', err);
      return null;
    }
  }, []);

  /**
   * Vérifie si l'auto-trigger doit se déclencher
   */
  const checkAutoTrigger = useCallback((): boolean => {
    if (!panicPreferences?.autoTriggerEnabled) return false;
    
    const now = new Date();
    const [hours, minutes] = panicPreferences.autoTriggerTime.split(':').map(Number);
    
    return now.getHours() === hours && now.getMinutes() === minutes;
  }, [panicPreferences]);

  // Fonctions utilitaires pour analytics
  const trackPanicEvent = (event: any) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'panic_triggered', {
        user_id: event.userId,
        trigger_type: event.triggerType,
        solution_count: event.solutionCount,
        timestamp: event.timestamp
      });
    }
  };

  const trackPanicSolutionSelected = (event: any) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'panic_solution_selected', {
        solution_id: event.solutionId,
        user_id: event.userId,
        timestamp: event.timestamp
      });
    }
  };

  return {
    // État
    isLoading,
    lastSolutions,
    panicPreferences,
    error,

    // Actions principales
    triggerPanicMode,
    triggerAutoPanic,
    triggerGesturePanic,

    // Gestion des préférences
    loadPanicPreferences,
    savePanicPreferences,

    // Analytics et tracking
    recordSolutionSelection,
    getPanicStats,

    // Utilitaires
    checkAutoTrigger
  };
}