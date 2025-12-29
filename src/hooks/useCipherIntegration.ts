"use client";

import { useState, useEffect, useCallback } from 'react';
import { cipherMemory } from '@/services/cipher/CipherMemoryService';
import { useQuickActions } from './useQuickActions';
import { usePanicMode } from './usePanicMode';

interface CipherContext {
  userId: string;
  sessionId: string;
  currentAction?: string;
  familyMode: boolean;
  contextData: Record<string, any>;
}

interface CipherRecommendation {
  recommendation: string;
  confidence: number;
  reasoning: string;
  priority: number;
  actionType?: 'panic' | 'quick_action' | 'family_coordination';
}

interface SystemAdaptation {
  adaptations: Record<string, any>;
  confidence: number;
  explanation: string;
}

export function useCipherIntegration() {
  const [cipherContext, setCipherContext] = useState<CipherContext | null>(null);
  const [isLearning, setIsLearning] = useState(false);
  const [recommendations, setRecommendations] = useState<CipherRecommendation[]>([]);
  const [systemAdaptations, setSystemAdaptations] = useState<Record<string, SystemAdaptation>>({});
  const [learningInsights, setLearningInsights] = useState<any>(null);

  const { executeAction } = useQuickActions();
  const { triggerPanicMode } = usePanicMode();

  /**
   * Initialise le contexte Cipher pour la session
   */
  const initializeCipher = useCallback(async (
    userId: string,
    options: {
      familyMode?: boolean;
      sessionData?: Record<string, any>;
    } = {}
  ) => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const context: CipherContext = {
      userId,
      sessionId,
      familyMode: options.familyMode || false,
      contextData: {
        ...options.sessionData,
        startTime: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown'
      }
    };

    setCipherContext(context);

    // Charger les adaptations système existantes
    await loadSystemAdaptations(context);

    // Générer des recommandations initiales
    await generateRecommendations(context);

    console.log('Cipher integration initialized for session:', sessionId);
  }, []);

  /**
   * Enregistre une expérience dans le système Cipher
   */
  const recordExperience = useCallback(async (
    event: {
      type: 'panic_triggered' | 'action_executed' | 'solution_selected' | 'feedback_given';
      data: any;
      outcome: 'success' | 'failure' | 'partial';
      satisfaction?: number;
    }
  ) => {
    if (!cipherContext) return;

    setIsLearning(true);

    try {
      await cipherMemory.recordExperience(cipherContext, event);

      // Régénérer les recommandations après apprentissage
      await generateRecommendations(cipherContext);

      // Mettre à jour les adaptations si nécessaire
      if (event.outcome === 'failure' || (event.satisfaction && event.satisfaction < 3)) {
        await loadSystemAdaptations(cipherContext);
      }

      console.log(`Experience recorded: ${event.type} (${event.outcome})`);
    } catch (error) {
      console.error('Failed to record experience:', error);
    } finally {
      setIsLearning(false);
    }
  }, [cipherContext]);

  /**
   * Exécute une quick action avec intégration Cipher
   */
  const executeActionWithCipher = useCallback(async (
    actionId: string,
    params?: any
  ) => {
    if (!cipherContext) return null;

    // Enregistrer le début de l'action
    await recordExperience({
      type: 'action_executed',
      data: { actionId, params, timestamp: new Date() },
      outcome: 'partial' // En cours
    });

    try {
      // Adapter les paramètres basés sur l'apprentissage Cipher
      const adaptedParams = await adaptActionParameters(actionId, params);

      // Exécuter l'action
      const result = await executeAction(actionId, {
        userId: cipherContext.userId,
        familySize: cipherContext.familyMode ? 4 : 2, // Exemple d'adaptation
        triggerMethod: 'cipher' as const,
        ...adaptedParams
      });

      // Enregistrer le résultat
      await recordExperience({
        type: 'action_executed',
        data: { 
          actionId, 
          params: adaptedParams,
          result,
          executionTime: Date.now()
        },
        outcome: result.success ? 'success' : 'failure',
        satisfaction: result.success ? 4 : 2
      });

      return result;
    } catch (error) {
      await recordExperience({
        type: 'action_executed',
        data: { actionId, error: error instanceof Error ? error.message : 'Unknown error' },
        outcome: 'failure',
        satisfaction: 1
      });

      throw error;
    }
  }, [cipherContext, executeAction, recordExperience]);

  /**
   * Déclenche panic mode avec intégration Cipher
   */
  const triggerPanicWithCipher = useCallback(async (
    stressLevel: 1 | 2 | 3 | 4 | 5,
    additionalContext?: Record<string, any>
  ) => {
    if (!cipherContext) return [];

    const panicContext = {
      userId: cipherContext.userId,
      timeAvailable: 30,
      stressLevel,
      familyMembers: cipherContext.familyMode ? 4 : 2,
      triggerType: 'manual' as const,
      ...additionalContext
    };

    // Enregistrer le déclenchement
    await recordExperience({
      type: 'panic_triggered',
      data: { 
        stressLevel, 
        context: panicContext, 
        familyMode: cipherContext.familyMode 
      },
      outcome: 'partial'
    });

    try {
      // Déclencher panic mode
      const solutions = await triggerPanicMode(panicContext);

      // Enregistrer le succès
      await recordExperience({
        type: 'panic_triggered',
        data: {
          stressLevel,
          solutionsCount: solutions.length,
          solutionTypes: solutions.map(s => s.type)
        },
        outcome: 'success',
        satisfaction: solutions.length > 0 ? 4 : 2
      });

      return solutions;
    } catch (error) {
      await recordExperience({
        type: 'panic_triggered',
        data: { stressLevel, error: error instanceof Error ? error.message : 'Unknown' },
        outcome: 'failure',
        satisfaction: 1
      });

      throw error;
    }
  }, [cipherContext, triggerPanicMode, recordExperience]);

  /**
   * Enregistre la sélection d'une solution
   */
  const recordSolutionSelection = useCallback(async (
    solutionId: string,
    solutionType: string,
    userSatisfaction: number = 3
  ) => {
    if (!cipherContext) return;

    await recordExperience({
      type: 'solution_selected',
      data: {
        solutionId,
        solutionType,
        timestamp: new Date(),
        familyMode: cipherContext.familyMode
      },
      outcome: userSatisfaction >= 3 ? 'success' : 'failure',
      satisfaction: userSatisfaction
    });
  }, [cipherContext, recordExperience]);

  /**
   * Intègre les données family mode dans Cipher
   */
  const integrateFamilyModeData = useCallback(async (
    familyData: {
      members: Array<{id: string; name: string; preferences: any}>;
      interactions: Array<{action: string; member: string; outcome: string}>;
      conflicts: Array<{issue: string; resolution: string; satisfaction: number}>;
    }
  ) => {
    if (!cipherContext) return;

    try {
      await cipherMemory.integrateFamilyModeData(cipherContext.userId, familyData);
      
      // Recharger les adaptations après intégration
      await loadSystemAdaptations(cipherContext);
      
      // Régénérer les recommandations
      await generateRecommendations(cipherContext);

      console.log('Family mode data integrated successfully');
    } catch (error) {
      console.error('Failed to integrate family mode data:', error);
    }
  }, [cipherContext]);

  /**
   * Optimise les performances système
   */
  const optimizeSystemPerformance = useCallback(async () => {
    if (!cipherContext) return null;

    try {
      const optimizations = await cipherMemory.optimizeSystemPerformance(cipherContext.userId);
      
      setLearningInsights(prev => ({
        ...prev,
        performanceOptimizations: optimizations
      }));

      return optimizations;
    } catch (error) {
      console.error('Failed to optimize system performance:', error);
      return null;
    }
  }, [cipherContext]);

  /**
   * Obtient les insights d'apprentissage
   */
  const getLearningInsights = useCallback(async () => {
    if (!cipherContext) return null;

    try {
      const insights = {
        recommendations: recommendations.slice(0, 5),
        adaptations: Object.keys(systemAdaptations).length,
        learningActive: isLearning,
        sessionData: {
          sessionId: cipherContext.sessionId,
          familyMode: cipherContext.familyMode,
          startTime: cipherContext.contextData.startTime
        }
      };

      setLearningInsights(insights);
      return insights;
    } catch (error) {
      console.error('Failed to get learning insights:', error);
      return null;
    }
  }, [cipherContext, recommendations, systemAdaptations, isLearning]);

  // === MÉTHODES PRIVÉES ===

  const generateRecommendations = async (context: CipherContext) => {
    try {
      const [panicRecs, actionRecs, familyRecs] = await Promise.all([
        cipherMemory.getContextualRecommendations(context, 'panic_solutions'),
        cipherMemory.getContextualRecommendations(context, 'quick_actions'),
        context.familyMode 
          ? cipherMemory.getContextualRecommendations(context, 'family_coordination')
          : Promise.resolve([])
      ]);

      const allRecommendations: CipherRecommendation[] = [
        ...panicRecs.map(r => ({ ...r, actionType: 'panic' as const })),
        ...actionRecs.map(r => ({ ...r, actionType: 'quick_action' as const })),
        ...familyRecs.map(r => ({ ...r, actionType: 'family_coordination' as const }))
      ];

      setRecommendations(
        allRecommendations
          .sort((a, b) => b.priority - a.priority)
          .slice(0, 10)
      );
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
    }
  };

  const loadSystemAdaptations = async (context: CipherContext) => {
    try {
      const [panicAdaptations, actionAdaptations, familyAdaptations] = await Promise.all([
        cipherMemory.adaptSystemBehavior(context, 'panic_engine'),
        cipherMemory.adaptSystemBehavior(context, 'quick_actions'),
        context.familyMode 
          ? cipherMemory.adaptSystemBehavior(context, 'family_coordinator')
          : Promise.resolve({ adaptations: {}, confidence: 0, explanation: '' })
      ]);

      setSystemAdaptations({
        panic_engine: panicAdaptations,
        quick_actions: actionAdaptations,
        ...(context.familyMode && { family_coordinator: familyAdaptations })
      });
    } catch (error) {
      console.error('Failed to load system adaptations:', error);
    }
  };

  const adaptActionParameters = async (
    actionId: string,
    originalParams: any
  ): Promise<any> => {
    const adaptations = systemAdaptations.quick_actions?.adaptations || {};
    const adaptedParams = { ...originalParams };

    // Appliquer les adaptations spécifiques à l'action
    if (adaptations.defaultActions?.includes(actionId)) {
      adaptedParams.priority = 'high';
    }

    if (adaptations.executionOrder) {
      adaptedParams.orderHint = adaptations.executionOrder.indexOf(actionId);
    }

    return adaptedParams;
  };

  return {
    // État
    cipherContext,
    isLearning,
    recommendations,
    systemAdaptations,
    learningInsights,

    // Actions principales
    initializeCipher,
    recordExperience,

    // Intégrations avec les systèmes existants
    executeActionWithCipher,
    triggerPanicWithCipher,
    recordSolutionSelection,

    // Gestion family mode
    integrateFamilyModeData,

    // Optimisation et insights
    optimizeSystemPerformance,
    getLearningInsights
  };
}