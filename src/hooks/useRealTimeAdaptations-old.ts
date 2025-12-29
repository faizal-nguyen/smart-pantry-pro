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
 * Simplifie l'intégration du système d'adaptations dans les composants React
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

  // Références pour éviter les re-renders
  const subscriptionIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const preferencesRef = useRef(preferences);
  const isConnectedRef = useRef(false);

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
  const connectInternal = useCallback(() => {
    setIsLoading(true);
    setError(null);

    try {
      const subscriptionId = realTimeAdapter.subscribe(
        userId,
        preferencesRef.current || preferences,
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
    }
  }, [userId, handleAdaptationsReceived, onError]);

  const connect = useCallback(() => {
    if (!enabled || isConnected || !userId || !preferences) {
      return;
    }
    connectInternal();
  }, [enabled, isConnected, userId, preferences, connectInternal]);

  /**
   * Déconnexion des adaptations temps réel
   */
  const disconnect = useCallback(() => {
    if (!isConnected || !subscriptionIdRef.current) {
      return;
    }

    realTimeAdapter.unsubscribe(subscriptionIdRef.current);
    subscriptionIdRef.current = null;
    setIsConnected(false);
    setAdaptations([]);
    setLastUpdate(null);
    console.log(`🔌 Disconnected from real-time adaptations for user ${userId}`);
  }, [isConnected, userId]);

  /**
   * Force une mise à jour immédiate
   */
  const forceUpdate = useCallback(async () => {
    if (!isConnected) return;

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
  }, [isConnected, userId]);

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

  // Effet pour la connexion automatique
  useEffect(() => {
    if (autoConnect && enabled && !isConnected) {
      connect();
    }

    // Nettoyage à la déconnexion du composant
    return () => {
      mountedRef.current = false;
      if (isConnected) {
        disconnect();
      }
    };
  }, [autoConnect, enabled]); // Retirer isConnected, connect et disconnect pour éviter les boucles

  // Effet pour surveiller les changements de préférences
  const preferencesRef = useRef(preferences);
  useEffect(() => {
    // Vérifier si les préférences ont vraiment changé
    const hasPreferencesChanged = JSON.stringify(preferences) !== JSON.stringify(preferencesRef.current);
    
    if (hasPreferencesChanged && isConnected && subscriptionIdRef.current) {
      preferencesRef.current = preferences;
      // Reconnecter avec nouvelles préférences
      disconnect();
      setTimeout(() => {
        if (mountedRef.current && enabled) {
          connect();
        }
      }, 100);
    }
  }, [preferences]); // Retirer les dépendances qui causent la boucle

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