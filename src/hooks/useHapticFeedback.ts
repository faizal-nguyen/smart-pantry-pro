import { useCallback } from 'react';

export type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

interface HapticFeedbackOptions {
  enabled?: boolean;
  fallbackToAudio?: boolean;
}

export const useHapticFeedback = (options: HapticFeedbackOptions = {}) => {
  const { enabled = true, fallbackToAudio = false } = options;

  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const getVibrationPattern = (type: HapticFeedbackType): number | number[] => {
    switch (type) {
      case 'light':
        return 10;
      case 'medium':
        return 20;
      case 'heavy':
        return 50;
      case 'success':
        return [20, 10, 20];
      case 'warning':
        return [30, 20, 30, 20, 30];
      case 'error':
        return [50, 30, 50, 30, 100];
      default:
        return 20;
    }
  };

  const playAudioFeedback = useCallback((type: HapticFeedbackType) => {
    if (!fallbackToAudio) return;

    // Create audio context for web audio feedback
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configure audio based on feedback type
      switch (type) {
        case 'light':
          oscillator.frequency.value = 800;
          gainNode.gain.value = 0.1;
          break;
        case 'medium':
          oscillator.frequency.value = 600;
          gainNode.gain.value = 0.15;
          break;
        case 'heavy':
          oscillator.frequency.value = 400;
          gainNode.gain.value = 0.2;
          break;
        case 'success':
          oscillator.frequency.value = 800;
          gainNode.gain.value = 0.15;
          break;
        case 'warning':
          oscillator.frequency.value = 600;
          gainNode.gain.value = 0.2;
          break;
        case 'error':
          oscillator.frequency.value = 300;
          gainNode.gain.value = 0.25;
          break;
      }

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);

      // Clean up
      setTimeout(() => {
        audioContext.close();
      }, 150);
    } catch (error) {
      console.debug('Audio feedback not available:', error);
    }
  }, [fallbackToAudio]);

  const vibrate = useCallback((type: HapticFeedbackType = 'light') => {
    if (!enabled) return;

    if (isSupported) {
      try {
        const pattern = getVibrationPattern(type);
        navigator.vibrate(pattern);
      } catch (error) {
        console.debug('Vibration not supported:', error);
        playAudioFeedback(type);
      }
    } else {
      playAudioFeedback(type);
    }
  }, [enabled, isSupported, playAudioFeedback]);

  // Specific feedback methods for common shopping actions
  const itemChecked = useCallback(() => vibrate('success'), [vibrate]);
  const itemUnchecked = useCallback(() => vibrate('light'), [vibrate]);
  const itemAdded = useCallback(() => vibrate('medium'), [vibrate]);
  const itemRemoved = useCallback(() => vibrate('warning'), [vibrate]);
  const listCompleted = useCallback(() => vibrate('success'), [vibrate]);
  const error = useCallback(() => vibrate('error'), [vibrate]);

  return {
    vibrate,
    itemChecked,
    itemUnchecked,
    itemAdded,
    itemRemoved,
    listCompleted,
    error,
    isSupported: isSupported || fallbackToAudio
  };
};