"use client";

import { useEffect, useCallback, useState, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';

type GestureType = 
  | 'swipe_up'
  | 'swipe_down' 
  | 'swipe_left'
  | 'swipe_right'
  | 'long_press'
  | 'double_tap'
  | 'pinch'
  | 'shake'
  | 'twist';

type ActionType = 
  | 'panic_mode'
  | 'quick_plan'
  | 'repeat_week'
  | 'survival_mode'
  | 'empty_fridge'
  | 'smart_suggest'
  | 'batch_cooking'
  | 'reset_week';

interface GestureConfig {
  enabled: boolean;
  sensitivity: number;
  hapticFeedback: boolean;
  visualFeedback: boolean;
  confirmationRequired: boolean;
}

interface GestureMapping {
  [key: string]: ActionType;
}

interface GestureState {
  isDetecting: boolean;
  lastGesture: GestureType | null;
  lastAction: ActionType | null;
  gestureCount: number;
  confidenceScore: number;
}

interface UseGesturesProps {
  onAction: (action: ActionType, gesture: GestureType, confidence: number) => void;
  onGestureDetected?: (gesture: GestureType, confidence: number) => void;
  gestureMapping?: Partial<GestureMapping>;
  config?: Partial<GestureConfig>;
  enabled?: boolean;
  element?: HTMLElement | null;
}

const defaultGestureMapping: GestureMapping = {
  'swipe_up': 'panic_mode',
  'swipe_down': 'quick_plan',
  'swipe_left': 'survival_mode',
  'swipe_right': 'repeat_week',
  'long_press': 'empty_fridge',
  'double_tap': 'smart_suggest',
  'shake': 'panic_mode',
  'twist': 'batch_cooking'
};

const defaultConfig: GestureConfig = {
  enabled: true,
  sensitivity: 0.7,
  hapticFeedback: true,
  visualFeedback: true,
  confirmationRequired: false
};

export const useQuickActionGestures = ({
  onAction,
  onGestureDetected,
  gestureMapping = {},
  config = {},
  enabled = true,
  element = null
}: UseGesturesProps) => {
  const [gestureState, setGestureState] = useState<GestureState>({
    isDetecting: false,
    lastGesture: null,
    lastAction: null,
    gestureCount: 0,
    confidenceScore: 0
  });

  const [showGestureHint, setShowGestureHint] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Références pour tracking
  const lastTapTime = useRef<number>(0);
  const tapCount = useRef<number>(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const shakeThreshold = useRef<number>(15);
  const lastAcceleration = useRef<{x: number, y: number, z: number}>({ x: 0, y: 0, z: 0 });
  const shakeCount = useRef<number>(0);
  const twistStartAngle = useRef<number | null>(null);

  const finalConfig = { ...defaultConfig, ...config };
  const finalMapping = { ...defaultGestureMapping, ...gestureMapping };

  /**
   * Fournit un feedback haptique si supporté
   */
  const triggerHaptic = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (!finalConfig.hapticFeedback) return;

    if ('vibrate' in navigator) {
      const patterns = {
        light: [50],
        medium: [100, 50, 100],
        heavy: [200, 100, 200]
      };
      navigator.vibrate(patterns[intensity]);
    }
  }, [finalConfig.hapticFeedback]);

  /**
   * Affiche un feedback visuel pour le geste
   */
  const triggerVisualFeedback = useCallback((gesture: GestureType, confidence: number) => {
    if (!finalConfig.visualFeedback) return;

    setShowGestureHint(true);
    setGestureState(prev => ({
      ...prev,
      lastGesture: gesture,
      confidenceScore: confidence,
      isDetecting: true
    }));

    // Masquer après 2 secondes
    setTimeout(() => {
      setShowGestureHint(false);
      setGestureState(prev => ({ ...prev, isDetecting: false }));
    }, 2000);
  }, [finalConfig.visualFeedback]);

  /**
   * Execute une action basée sur un geste
   */
  const executeGestureAction = useCallback((gesture: GestureType, confidence: number) => {
    const action = finalMapping[gesture];
    if (!action) return;

    setGestureState(prev => ({
      ...prev,
      lastGesture: gesture,
      lastAction: action,
      gestureCount: prev.gestureCount + 1,
      confidenceScore: confidence
    }));

    onGestureDetected?.(gesture, confidence);

    if (finalConfig.confirmationRequired && confidence < 0.8) {
      // Demander confirmation pour les gestes peu fiables
      if (confirm(`Exécuter l'action "${action}" ? (Confiance: ${Math.round(confidence * 100)}%)`)) {
        onAction(action, gesture, confidence);
      }
    } else {
      onAction(action, gesture, confidence);
    }

    triggerHaptic(confidence > 0.8 ? 'heavy' : 'medium');
    triggerVisualFeedback(gesture, confidence);
  }, [finalMapping, finalConfig.confirmationRequired, onAction, onGestureDetected, triggerHaptic, triggerVisualFeedback]);

  /**
   * Configuration des swipe gestures
   */
  const swipeHandlers = useSwipeable({
    onSwipedUp: (eventData) => {
      const confidence = Math.min(1, eventData.velocity / 2);
      executeGestureAction('swipe_up', confidence);
    },
    onSwipedDown: (eventData) => {
      const confidence = Math.min(1, eventData.velocity / 2);
      executeGestureAction('swipe_down', confidence);
    },
    onSwipedLeft: (eventData) => {
      const confidence = Math.min(1, eventData.velocity / 2);
      executeGestureAction('swipe_left', confidence);
    },
    onSwipedRight: (eventData) => {
      const confidence = Math.min(1, eventData.velocity / 2);
      executeGestureAction('swipe_right', confidence);
    },
    onSwiping: () => {
      setGestureState(prev => ({ ...prev, isDetecting: true }));
    },
    preventDefaultTouchmoveEvent: true,
    trackMouse: false, // Seulement touch
    delta: 50, // Distance minimale
    velocityThreshold: 0.3
  });

  /**
   * Gestion des tap gestures (simple, double, long press)
   */
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (!enabled || !finalConfig.enabled) return;

    const now = Date.now();
    tapCount.current += 1;

    // Long press detection
    longPressTimer.current = setTimeout(() => {
      if (tapCount.current === 1) {
        executeGestureAction('long_press', 0.9);
        tapCount.current = 0;
      }
    }, 800);

    // Double tap detection
    if (now - lastTapTime.current < 300 && tapCount.current === 2) {
      clearTimeout(longPressTimer.current!);
      executeGestureAction('double_tap', 0.85);
      tapCount.current = 0;
    }

    lastTapTime.current = now;

    // Reset tap count après délai
    setTimeout(() => {
      if (tapCount.current === 1) {
        tapCount.current = 0;
      }
    }, 400);
  }, [enabled, finalConfig.enabled, executeGestureAction]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  }, []);

  /**
   * Détection du shake via accelerometer
   */
  const handleDeviceMotion = useCallback((event: DeviceMotionEvent) => {
    if (!enabled || !finalConfig.enabled) return;
    if (!event.accelerationIncludingGravity) return;

    const { x = 0, y = 0, z = 0 } = event.accelerationIncludingGravity;
    
    const deltaX = Math.abs(x - lastAcceleration.current.x);
    const deltaY = Math.abs(y - lastAcceleration.current.y);
    const deltaZ = Math.abs(z - lastAcceleration.current.z);
    
    const acceleration = deltaX + deltaY + deltaZ;

    if (acceleration > shakeThreshold.current * finalConfig.sensitivity) {
      shakeCount.current += 1;
      
      // Shake détecté après 3 mouvements rapides
      if (shakeCount.current >= 3) {
        const confidence = Math.min(1, acceleration / (shakeThreshold.current * 2));
        executeGestureAction('shake', confidence);
        shakeCount.current = 0;
      }
      
      // Reset counter après 500ms
      setTimeout(() => {
        if (shakeCount.current > 0) shakeCount.current -= 1;
      }, 500);
    }
    
    lastAcceleration.current = { x, y, z };
  }, [enabled, finalConfig.enabled, finalConfig.sensitivity, executeGestureAction]);

  /**
   * Détection du twist (rotation)
   */
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!enabled || !finalConfig.enabled) return;
    if (event.touches.length !== 2) return;

    const touch1 = event.touches[0];
    const touch2 = event.touches[1];
    
    const angle = Math.atan2(
      touch2.pageY - touch1.pageY,
      touch2.pageX - touch1.pageX
    ) * (180 / Math.PI);

    if (twistStartAngle.current === null) {
      twistStartAngle.current = angle;
    } else {
      const angleDiff = Math.abs(angle - twistStartAngle.current);
      
      if (angleDiff > 45) { // 45 degrés de rotation
        const confidence = Math.min(1, angleDiff / 90);
        executeGestureAction('twist', confidence);
        twistStartAngle.current = null;
      }
    }
  }, [enabled, finalConfig.enabled, executeGestureAction]);

  const handleTouchEndTwist = useCallback(() => {
    twistStartAngle.current = null;
  }, []);

  /**
   * Calibration automatique du seuil de shake
   */
  const calibrateShakeThreshold = useCallback(() => {
    setIsCalibrating(true);
    const measurements: number[] = [];
    let measurementCount = 0;

    const calibrationHandler = (event: DeviceMotionEvent) => {
      if (!event.accelerationIncludingGravity) return;
      
      const { x = 0, y = 0, z = 0 } = event.accelerationIncludingGravity;
      const total = Math.abs(x) + Math.abs(y) + Math.abs(z);
      measurements.push(total);
      measurementCount++;

      if (measurementCount >= 50) { // 50 mesures
        const average = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
        const variance = measurements.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / measurements.length;
        const stdDev = Math.sqrt(variance);
        
        // Seuil = moyenne + 2 écarts-types
        shakeThreshold.current = average + (2 * stdDev);
        
        window.removeEventListener('devicemotion', calibrationHandler);
        setIsCalibrating(false);
      }
    };

    window.addEventListener('devicemotion', calibrationHandler);
    
    // Arrêter la calibration après 5 secondes max
    setTimeout(() => {
      window.removeEventListener('devicemotion', calibrationHandler);
      setIsCalibrating(false);
    }, 5000);
  }, []);

  /**
   * Setup des event listeners
   */
  useEffect(() => {
    if (!enabled || !finalConfig.enabled) return;

    const targetElement = element || document;

    // Touch events
    targetElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    targetElement.addEventListener('touchend', handleTouchEnd, { passive: false });
    targetElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    targetElement.addEventListener('touchend', handleTouchEndTwist, { passive: false });

    // Device motion pour shake
    if (window.DeviceMotionEvent) {
      // Demander permission sur iOS 13+
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        (DeviceMotionEvent as any).requestPermission()
          .then((response: string) => {
            if (response === 'granted') {
              window.addEventListener('devicemotion', handleDeviceMotion);
            }
          })
          .catch(console.error);
      } else {
        window.addEventListener('devicemotion', handleDeviceMotion);
      }
    }

    return () => {
      targetElement.removeEventListener('touchstart', handleTouchStart);
      targetElement.removeEventListener('touchend', handleTouchEnd);
      targetElement.removeEventListener('touchmove', handleTouchMove);
      targetElement.removeEventListener('touchend', handleTouchEndTwist);
      window.removeEventListener('devicemotion', handleDeviceMotion);
      
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, [
    enabled,
    finalConfig.enabled,
    element,
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
    handleTouchEndTwist,
    handleDeviceMotion
  ]);

  /**
   * Calibration initiale
   */
  useEffect(() => {
    if (enabled && finalConfig.enabled && typeof window !== 'undefined' && window.DeviceMotionEvent) {
      // Calibrer automatiquement au premier chargement
      const timer = setTimeout(calibrateShakeThreshold, 1000);
      return () => clearTimeout(timer);
    }
  }, [enabled, finalConfig.enabled, calibrateShakeThreshold]);

  /**
   * Méthodes publiques
   */
  const startGestureDetection = useCallback(() => {
    setGestureState(prev => ({ ...prev, isDetecting: true }));
  }, []);

  const stopGestureDetection = useCallback(() => {
    setGestureState(prev => ({ ...prev, isDetecting: false }));
  }, []);

  const resetGestureStats = useCallback(() => {
    setGestureState({
      isDetecting: false,
      lastGesture: null,
      lastAction: null,
      gestureCount: 0,
      confidenceScore: 0
    });
  }, []);

  const getGestureMapping = useCallback(() => finalMapping, [finalMapping]);

  const updateGestureMapping = useCallback((newMapping: Partial<GestureMapping>) => {
    Object.assign(finalMapping, newMapping);
  }, [finalMapping]);

  const isGestureSupported = useCallback((gesture: GestureType): boolean => {
    switch (gesture) {
      case 'shake':
        return typeof window !== 'undefined' && !!window.DeviceMotionEvent;
      case 'pinch':
      case 'twist':
        return 'ontouchstart' in window;
      default:
        return 'ontouchstart' in window;
    }
  }, []);

  return {
    // État
    gestureState,
    showGestureHint,
    isCalibrating,
    
    // Handlers pour swipe (à attacher à l'élément)
    swipeHandlers,
    
    // Contrôles
    startGestureDetection,
    stopGestureDetection,
    resetGestureStats,
    calibrateShakeThreshold,
    
    // Configuration
    getGestureMapping,
    updateGestureMapping,
    isGestureSupported,
    
    // Utilitaires
    triggerHaptic,
    executeGestureAction
  };
};

/**
 * Composant de feedback visuel pour les gestes
 */
export const GestureFeedback: React.FC<{
  visible: boolean;
  gesture: GestureType | null;
  confidence: number;
  action: ActionType | null;
}> = ({ visible, gesture, confidence, action }) => {
  if (!visible || !gesture) return null;

  const getGestureEmoji = (gesture: GestureType): string => {
    const emojis = {
      'swipe_up': '⬆️',
      'swipe_down': '⬇️',
      'swipe_left': '⬅️',
      'swipe_right': '➡️',
      'long_press': '👆',
      'double_tap': '👆👆',
      'shake': '🤳',
      'twist': '🔄',
      'pinch': '👌'
    };
    return emojis[gesture] || '✋';
  };

  const getActionLabel = (action: ActionType): string => {
    const labels = {
      'panic_mode': 'Mode Panique',
      'quick_plan': 'Plan Rapide',
      'repeat_week': 'Répéter Semaine',
      'survival_mode': 'Mode Survie',
      'empty_fridge': 'Vider Frigo',
      'smart_suggest': 'Suggestions IA',
      'batch_cooking': 'Batch Cooking',
      'reset_week': 'Reset Semaine'
    };
    return labels[action] || action;
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div className="bg-black/80 text-white rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
        <div className="text-center space-y-2">
          <div className="text-4xl animate-pulse">
            {getGestureEmoji(gesture)}
          </div>
          <div className="font-bold text-lg">
            {gesture.replace('_', ' ').toUpperCase()}
          </div>
          {action && (
            <div className="text-sm text-gray-300">
              → {getActionLabel(action)}
            </div>
          )}
          <div className="text-xs text-gray-400">
            Confiance: {Math.round(confidence * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
};