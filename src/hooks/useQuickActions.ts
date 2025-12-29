"use client";

import { useState, useCallback, useEffect } from 'react';
import { quickActionsEngine } from '@/services/quick-actions/QuickActionsEngine';

interface ActionContext {
  userId: string;
  familySize?: number;
  preferences?: UserPreferences;
  currentWeek?: Date;
  triggerMethod?: 'button' | 'shortcut' | 'gesture' | 'voice' | 'auto';
}

interface ActionResult {
  success: boolean;
  data?: any;
  message?: string;
  warnings?: string;
  error?: string;
  metadata?: {
    executionTime?: number;
    itemsProcessed?: number;
    changes?: string[];
  };
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

interface ActionStats {
  totalActions: number;
  successRate: number;
  averageTime: number;
  mostUsedAction: string;
  preferredTrigger: string;
  actionBreakdown: Record<string, any[]>;
}

export function useQuickActions() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [actionHistory, setActionHistory] = useState<Array<{
    actionId: string;
    timestamp: Date;
    result: ActionResult;
  }>>([]);
  const [actionStats, setActionStats] = useState<ActionStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Charger les statistiques au démarrage
  useEffect(() => {
    loadActionStats();
  }, []);

  /**
   * Exécute une quick action
   */
  const executeAction = useCallback(async (
    actionId: string, 
    context: ActionContext, 
    params?: any
  ): Promise<ActionResult> => {
    if (isExecuting) {
      throw new Error('Une action est déjà en cours d\'exécution');
    }

    setIsExecuting(true);
    setCurrentAction(actionId);
    setError(null);
    
    try {
      const result = await quickActionsEngine.executeAction(actionId, context, params);
      
      // Ajouter à l'historique
      setActionHistory(prev => [{
        actionId,
        timestamp: new Date(),
        result
      }, ...prev.slice(0, 9)]); // Garder seulement les 10 dernières actions

      // Mettre à jour les stats
      await loadActionStats(context.userId);

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      
      const errorResult: ActionResult = {
        success: false,
        error: errorMessage,
        message: 'L\'action a échoué'
      };

      setActionHistory(prev => [{
        actionId,
        timestamp: new Date(),
        result: errorResult
      }, ...prev.slice(0, 9)]);

      return errorResult;
    } finally {
      setIsExecuting(false);
      setCurrentAction(null);
    }
  }, [isExecuting]);

  /**
   * Exécute plusieurs actions en séquence
   */
  const executeActionSequence = useCallback(async (
    actions: Array<{ actionId: string; params?: any }>,
    context: ActionContext
  ): Promise<ActionResult[]> => {
    const results: ActionResult[] = [];
    
    for (const action of actions) {
      const result = await executeAction(action.actionId, context, action.params);
      results.push(result);
      
      // Arrêter si une action échoue
      if (!result.success) {
        break;
      }
      
      // Petite pause entre les actions
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return results;
  }, [executeAction]);

  /**
   * Actions spécialisées avec contexte pré-configuré
   */
  const repeatLastWeek = useCallback(async (userId: string): Promise<ActionResult> => {
    const context: ActionContext = {
      userId,
      triggerMethod: 'button'
    };
    return executeAction('repeat_week', context);
  }, [executeAction]);

  const activateSurvivalMode = useCallback(async (userId: string, familySize?: number): Promise<ActionResult> => {
    const context: ActionContext = {
      userId,
      familySize: familySize || 2,
      triggerMethod: 'button'
    };
    return executeAction('survival_mode', context);
  }, [executeAction]);

  const optimizeFridge = useCallback(async (userId: string): Promise<ActionResult> => {
    const context: ActionContext = {
      userId,
      triggerMethod: 'button'
    };
    return executeAction('empty_fridge', context);
  }, [executeAction]);

  const resetCurrentWeek = useCallback(async (userId: string): Promise<ActionResult> => {
    const context: ActionContext = {
      userId,
      triggerMethod: 'button'
    };
    return executeAction('reset_week', context);
  }, [executeAction]);

  const getSmartSuggestions = useCallback(async (userId: string): Promise<ActionResult> => {
    const context: ActionContext = {
      userId,
      triggerMethod: 'button'
    };
    return executeAction('smart_suggest', context);
  }, [executeAction]);

  const organizeBatchCooking = useCallback(async (userId: string): Promise<ActionResult> => {
    const context: ActionContext = {
      userId,
      triggerMethod: 'button'
    };
    return executeAction('batch_cooking', context);
  }, [executeAction]);

  /**
   * Charge les statistiques d'utilisation
   */
  const loadActionStats = useCallback(async (userId?: string): Promise<void> => {
    if (!userId) return;
    
    try {
      const stats = await quickActionsEngine.getActionStats(userId);
      setActionStats(stats);
    } catch (err) {
      console.warn('Failed to load action stats:', err);
    }
  }, []);

  /**
   * Actions par raccourci clavier
   */
  const executeShortcut = useCallback(async (
    shortcutKey: string, 
    context: ActionContext
  ): Promise<ActionResult | null> => {
    const shortcutMap: Record<string, string> = {
      'r': 'repeat_week',
      's': 'survival_mode',
      'e': 'empty_fridge',
      'x': 'reset_week',
      'i': 'smart_suggest',
      'b': 'batch_cooking'
    };

    const actionId = shortcutMap[shortcutKey.toLowerCase()];
    if (!actionId) return null;

    const contextWithShortcut = {
      ...context,
      triggerMethod: 'shortcut' as const
    };

    return executeAction(actionId, contextWithShortcut);
  }, [executeAction]);

  /**
   * Actions par gesture mobile
   */
  const executeGesture = useCallback(async (
    gestureType: 'swipe_up' | 'swipe_down' | 'long_press' | 'shake',
    context: ActionContext
  ): Promise<ActionResult | null> => {
    const gestureMap: Record<string, string> = {
      'swipe_up': 'smart_suggest',
      'swipe_down': 'reset_week',
      'long_press': 'repeat_week',
      'shake': 'survival_mode'
    };

    const actionId = gestureMap[gestureType];
    if (!actionId) return null;

    const contextWithGesture = {
      ...context,
      triggerMethod: 'gesture' as const
    };

    return executeAction(actionId, contextWithGesture);
  }, [executeAction]);

  /**
   * Annule l'action en cours si possible
   */
  const cancelCurrentAction = useCallback(() => {
    if (!isExecuting) return false;
    
    // Note: L'annulation réelle dépendrait de l'implémentation du moteur
    // Pour le moment, on peut seulement marquer comme annulé
    setIsExecuting(false);
    setCurrentAction(null);
    setError('Action annulée par l\'utilisateur');
    
    return true;
  }, [isExecuting]);

  /**
   * Obtient les actions recommandées selon le contexte
   */
  const getRecommendedActions = useCallback(async (
    context: ActionContext
  ): Promise<Array<{actionId: string, priority: number, reason: string}>> => {
    // Logique simple de recommandation basée sur l'historique et le contexte
    const recommendations = [];

    // Si c'est dimanche soir, recommander la planification
    const now = new Date();
    if (now.getDay() === 0 && now.getHours() >= 18) {
      recommendations.push({
        actionId: 'repeat_week',
        priority: 9,
        reason: 'Préparez la semaine qui arrive'
      });
    }

    // Si beaucoup d'actions récentes ont échoué, recommander survival mode
    const recentFailures = actionHistory.slice(0, 5).filter(a => !a.result.success).length;
    if (recentFailures >= 3) {
      recommendations.push({
        actionId: 'survival_mode',
        priority: 8,
        reason: 'Simplifiez avec des recettes faciles'
      });
    }

    // Si pas d'actions récentes, recommander smart suggest
    if (actionHistory.length === 0) {
      recommendations.push({
        actionId: 'smart_suggest',
        priority: 7,
        reason: 'Découvrez les suggestions personnalisées'
      });
    }

    // Si vendredi, recommander batch cooking pour le week-end
    if (now.getDay() === 5) {
      recommendations.push({
        actionId: 'batch_cooking',
        priority: 6,
        reason: 'Préparez le week-end en avance'
      });
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }, [actionHistory]);

  /**
   * Obtient l'action la plus utilisée par l'utilisateur
   */
  const getFavoriteAction = useCallback((): string | null => {
    if (!actionStats) return null;
    return actionStats.mostUsedAction;
  }, [actionStats]);

  /**
   * Vérifie si une action est disponible
   */
  const isActionAvailable = useCallback((actionId: string): boolean => {
    const availableActions = quickActionsEngine.getAvailableActions();
    return availableActions.some(action => action.id === actionId);
  }, []);

  /**
   * Obtient les informations d'une action
   */
  const getActionInfo = useCallback((actionId: string) => {
    const availableActions = quickActionsEngine.getAvailableActions();
    return availableActions.find(action => action.id === actionId);
  }, []);

  /**
   * Nettoie l'historique d'actions
   */
  const clearActionHistory = useCallback(() => {
    setActionHistory([]);
    setError(null);
  }, []);

  /**
   * Exporte les statistiques d'utilisation
   */
  const exportActionStats = useCallback((): string => {
    const data = {
      stats: actionStats,
      history: actionHistory.slice(0, 50), // Dernières 50 actions
      exportDate: new Date().toISOString()
    };
    
    return JSON.stringify(data, null, 2);
  }, [actionStats, actionHistory]);

  return {
    // État
    isExecuting,
    currentAction,
    actionHistory,
    actionStats,
    error,

    // Actions principales
    executeAction,
    executeActionSequence,

    // Actions spécialisées
    repeatLastWeek,
    activateSurvivalMode,
    optimizeFridge,
    resetCurrentWeek,
    getSmartSuggestions,
    organizeBatchCooking,

    // Interactions
    executeShortcut,
    executeGesture,
    cancelCurrentAction,

    // Utilitaires
    loadActionStats,
    getRecommendedActions,
    getFavoriteAction,
    isActionAvailable,
    getActionInfo,
    clearActionHistory,
    exportActionStats
  };
}