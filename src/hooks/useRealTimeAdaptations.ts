import { useState, useEffect, useCallback, useRef } from 'react';
import { realTimeAdapter } from '@/services/context/RealTimeAdapter';
import { AdaptationLog, UserContextPreferences } from '@/services/context/types';

interface UseRealTimeAdaptationsOptions {
  userId: string;
  preferences: UserContextPreferences;
  enabled?: boolean;
  autoConnect?: boolean;
  onAdaptationReceived?: (adaptations: AdaptationLog[]) => void;
  onError?: (error: Error) => void;
}

interface UseRealTimeAdaptationsReturn {
  adaptations: AdaptationLog[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  adaptationCount: number;
  connect: () => void;
  disconnect: () => void;
  forceUpdate: () => Promise<void>;
  clearAdaptations: () => void;
  markAdaptationAsApplied: (adaptationId: string) => void;
  markAdaptationAsRejected: (adaptationId: string) => void;
  getAdaptationsByType: (type: string) => AdaptationLog[];
  getHighConfidenceAdaptations: () => AdaptationLog[];
}

/**
 * Hook pour gérer les adaptations contextuelles en temps réel
 * Version corrigée pour éviter les boucles infinies
 */
export function useRealTimeAdaptations(
  options: UseRealTimeAdaptationsOptions
): UseRealTimeAdaptationsReturn {
  const {
    userId,
    preferences,
    enabled = true,
    autoConnect = true,
    onAdaptationReceived,
    onError
  } = options;

  // État du hook
  const [adaptations, setAdaptations] = useState<AdaptationLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [appliedAdaptations, setAppliedAdaptations] = useState<Set<string>>(new Set());
  const [rejectedAdaptations, setRejectedAdaptations] = useState<Set<string>>(new Set());

  // Références stables
  const subscriptionIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const connectionAttemptRef = useRef(false);

  /**
   * Callback pour recevoir les adaptations
   */
  const handleAdaptationsReceived = useCallback((newAdaptations: AdaptationLog[]) => {
    if (!mountedRef.current) return;

    console.log(`📡 Real-time adaptations received: ${newAdaptations.length} items`);

    // Filtrer les adaptations déjà appliquées ou rejetées
    const validAdaptations = newAdaptations.filter(adaptation => 
      !appliedAdaptations.has(adaptation.id) && 
      !rejectedAdaptations.has(adaptation.id)
    );

    setAdaptations(validAdaptations);
    setLastUpdate(new Date());
    setError(null);

    // Notifier le parent si callback fourni
    if (onAdaptationReceived) {
      onAdaptationReceived(validAdaptations);
    }
  }, [appliedAdaptations, rejectedAdaptations, onAdaptationReceived]);

  /**
   * Connexion aux adaptations temps réel
   */
  const connect = useCallback(() => {
    // Éviter les connexions multiples simultanées
    if (connectionAttemptRef.current || subscriptionIdRef.current || !mountedRef.current) {
      return;
    }

    if (!enabled || !userId || !preferences) {
      return;
    }

    connectionAttemptRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const subscriptionId = realTimeAdapter.subscribe(
        userId,
        preferences,
        handleAdaptationsReceived
      );

      subscriptionIdRef.current = subscriptionId;
      setIsConnected(true);
      console.log(`🔗 Connected to real-time adaptations for user ${userId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de connexion';
      setError(errorMessage);
      console.error('Failed to connect to real-time adaptations:', err);
      
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    } finally {
      setIsLoading(false);
      connectionAttemptRef.current = false;
    }
  }, [enabled, userId, preferences, handleAdaptationsReceived, onError]);

  /**
   * Déconnexion des adaptations temps réel
   */
  const disconnect = useCallback(() => {
    if (!subscriptionIdRef.current) {
      return;
    }

    realTimeAdapter.unsubscribe(subscriptionIdRef.current);
    subscriptionIdRef.current = null;
    setIsConnected(false);
    setAdaptations([]);
    setLastUpdate(null);
    console.log(`🔌 Disconnected from real-time adaptations for user ${userId}`);
  }, [userId]);

  /**
   * Force une mise à jour immédiate
   */
  const forceUpdate = useCallback(async () => {
    if (!subscriptionIdRef.current) return;

    setIsLoading(true);
    try {
      await realTimeAdapter.forceUpdate(userId);
      console.log('🔄 Forced real-time adaptation update');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de mise à jour';
      setError(errorMessage);
      console.error('Failed to force update:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Vide la liste des adaptations
   */
  const clearAdaptations = useCallback(() => {
    setAdaptations([]);
    setAppliedAdaptations(new Set());
    setRejectedAdaptations(new Set());
    setLastUpdate(null);
  }, []);

  /**
   * Marque une adaptation comme appliquée
   */
  const markAdaptationAsApplied = useCallback((adaptationId: string) => {
    setAppliedAdaptations(prev => new Set([...prev, adaptationId]));
    setAdaptations(prev => prev.filter(a => a.id !== adaptationId));
    console.log(`✅ Marked adaptation ${adaptationId} as applied`);
  }, []);

  /**
   * Marque une adaptation comme rejetée
   */
  const markAdaptationAsRejected = useCallback((adaptationId: string) => {
    setRejectedAdaptations(prev => new Set([...prev, adaptationId]));
    setAdaptations(prev => prev.filter(a => a.id !== adaptationId));
    console.log(`❌ Marked adaptation ${adaptationId} as rejected`);
  }, []);

  /**
   * Filtre les adaptations par type
   */
  const getAdaptationsByType = useCallback((type: string): AdaptationLog[] => {
    return adaptations.filter(adaptation => adaptation.type === type);
  }, [adaptations]);

  /**
   * Obtient les adaptations avec confiance élevée
   */
  const getHighConfidenceAdaptations = useCallback((): AdaptationLog[] => {
    return adaptations.filter(adaptation => adaptation.confidence > 0.8);
  }, [adaptations]);

  // Effet principal pour la connexion initiale
  useEffect(() => {
    mountedRef.current = true;

    // Connexion initiale si autoConnect est activé
    if (autoConnect && enabled && userId && preferences) {
      // Délai pour éviter les connexions trop rapides au montage
      const timer = setTimeout(() => {
        if (mountedRef.current && !subscriptionIdRef.current) {
          connect();
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        mountedRef.current = false;
        if (subscriptionIdRef.current) {
          disconnect();
        }
      };
    }

    return () => {
      mountedRef.current = false;
      if (subscriptionIdRef.current) {
        disconnect();
      }
    };
  }, []); // Effet unique au montage/démontage

  // Calculer le nombre d'adaptations
  const adaptationCount = adaptations.length;

  return {
    adaptations,
    isConnected,
    isLoading,
    error,
    lastUpdate,
    adaptationCount,
    connect,
    disconnect,
    forceUpdate,
    clearAdaptations,
    markAdaptationAsApplied,
    markAdaptationAsRejected,
    getAdaptationsByType,
    getHighConfidenceAdaptations
  };
}