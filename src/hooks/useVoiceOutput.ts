/**
 * useVoiceOutput - React hook for Text-to-Speech integration
 * Phase 1 Implementation: Voice feedback for Smart Pantry actions
 *
 * Features:
 * - Easy integration with React components
 * - Auto-announce inventory changes
 * - Configurable voice settings
 * - Queue management UI state
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  voiceOutputService,
  VoiceOutputConfig,
  VoiceContext
} from '@/services/voice/voiceOutputService';

interface VoiceOutputStatus {
  isSupported: boolean;
  isEnabled: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  queueLength: number;
  selectedVoice: string | null;
}

interface UseVoiceOutputOptions {
  enabled?: boolean;
  config?: Partial<VoiceOutputConfig>;
  autoGreet?: boolean;
}

interface UseVoiceOutputReturn {
  // Status
  status: VoiceOutputStatus;
  isSpeaking: boolean;
  isSupported: boolean;
  isEnabled: boolean;

  // Core functions
  speak: (
    message: string,
    context?: VoiceContext,
    variables?: Record<string, string>
  ) => Promise<void>;
  speakContextual: (
    context: VoiceContext,
    variables?: Record<string, string>
  ) => Promise<void>;

  // Control functions
  interrupt: () => void;
  pause: () => void;
  resume: () => void;
  setEnabled: (enabled: boolean) => void;
  setConfig: (config: Partial<VoiceOutputConfig>) => void;

  // Convenience functions for Smart Pantry
  announceItemAdded: (
    itemName: string,
    quantity?: number,
    unit?: string
  ) => Promise<void>;
  announceItemRemoved: (itemName: string) => Promise<void>;
  announceExpiration: (
    itemName: string,
    daysUntilExpiry: number
  ) => Promise<void>;
  announceLowStock: (itemName: string) => Promise<void>;
  announceShoppingListAdd: (itemName: string) => Promise<void>;
  announceError: (customMessage?: string) => Promise<void>;
  greet: () => Promise<void>;
  confirm: () => Promise<void>;

  // Voice selection
  availableVoices: SpeechSynthesisVoice[];
  frenchVoices: SpeechSynthesisVoice[];
}

export const useVoiceOutput = (
  options: UseVoiceOutputOptions = {}
): UseVoiceOutputReturn => {
  const { enabled = true, config, autoGreet = false } = options;

  const [status, setStatus] = useState<VoiceOutputStatus>({
    isSupported: false,
    isEnabled: enabled,
    isSpeaking: false,
    isPaused: false,
    queueLength: 0,
    selectedVoice: null
  });

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [frenchVoices, setFrenchVoices] = useState<SpeechSynthesisVoice[]>([]);

  const hasGreeted = useRef(false);
  const updateInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize and update status
  useEffect(() => {
    // Apply initial config
    if (config) {
      voiceOutputService.setConfig(config);
    }

    voiceOutputService.setEnabled(enabled);

    // Initial status
    const initialStatus = voiceOutputService.getStatus();
    setStatus(initialStatus);
    setAvailableVoices(voiceOutputService.getVoices());
    setFrenchVoices(voiceOutputService.getFrenchVoices());

    // Poll for status updates while speaking
    updateInterval.current = setInterval(() => {
      const currentStatus = voiceOutputService.getStatus();
      setStatus(currentStatus);

      // Update voices if they've been loaded
      const voices = voiceOutputService.getVoices();
      if (voices.length > 0 && availableVoices.length === 0) {
        setAvailableVoices(voices);
        setFrenchVoices(voiceOutputService.getFrenchVoices());
      }
    }, 100);

    return () => {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
    };
  }, [config, enabled]);

  // Auto-greet on mount
  useEffect(() => {
    if (autoGreet && status.isSupported && status.isEnabled && !hasGreeted.current) {
      hasGreeted.current = true;
      // Delay greeting slightly for better UX
      setTimeout(() => {
        voiceOutputService.greet();
      }, 500);
    }
  }, [autoGreet, status.isSupported, status.isEnabled]);

  // Core speak function
  const speak = useCallback(
    async (
      message: string,
      context: VoiceContext = 'general',
      variables?: Record<string, string>
    ): Promise<void> => {
      return voiceOutputService.speak(message, context, variables);
    },
    []
  );

  // Contextual speak
  const speakContextual = useCallback(
    async (
      context: VoiceContext,
      variables?: Record<string, string>
    ): Promise<void> => {
      return voiceOutputService.speakContextual(context, variables);
    },
    []
  );

  // Control functions
  const interrupt = useCallback(() => {
    voiceOutputService.interrupt();
  }, []);

  const pause = useCallback(() => {
    voiceOutputService.pause();
  }, []);

  const resume = useCallback(() => {
    voiceOutputService.resume();
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    voiceOutputService.setEnabled(value);
    setStatus(prev => ({ ...prev, isEnabled: value }));
  }, []);

  const setConfig = useCallback((newConfig: Partial<VoiceOutputConfig>) => {
    voiceOutputService.setConfig(newConfig);
    const updatedStatus = voiceOutputService.getStatus();
    setStatus(updatedStatus);
  }, []);

  // Convenience functions
  const announceItemAdded = useCallback(
    async (itemName: string, quantity?: number, unit?: string): Promise<void> => {
      return voiceOutputService.announceItemAdded(itemName, quantity, unit);
    },
    []
  );

  const announceItemRemoved = useCallback(
    async (itemName: string): Promise<void> => {
      return voiceOutputService.announceItemRemoved(itemName);
    },
    []
  );

  const announceExpiration = useCallback(
    async (itemName: string, daysUntilExpiry: number): Promise<void> => {
      return voiceOutputService.announceExpiration(itemName, daysUntilExpiry);
    },
    []
  );

  const announceLowStock = useCallback(
    async (itemName: string): Promise<void> => {
      return voiceOutputService.announceLowStock(itemName);
    },
    []
  );

  const announceShoppingListAdd = useCallback(
    async (itemName: string): Promise<void> => {
      return voiceOutputService.announceShoppingListAdd(itemName);
    },
    []
  );

  const announceError = useCallback(
    async (customMessage?: string): Promise<void> => {
      return voiceOutputService.announceError(customMessage);
    },
    []
  );

  const greet = useCallback(async (): Promise<void> => {
    return voiceOutputService.greet();
  }, []);

  const confirm = useCallback(async (): Promise<void> => {
    return voiceOutputService.confirm();
  }, []);

  return {
    // Status
    status,
    isSpeaking: status.isSpeaking,
    isSupported: status.isSupported,
    isEnabled: status.isEnabled,

    // Core functions
    speak,
    speakContextual,

    // Control functions
    interrupt,
    pause,
    resume,
    setEnabled,
    setConfig,

    // Convenience functions
    announceItemAdded,
    announceItemRemoved,
    announceExpiration,
    announceLowStock,
    announceShoppingListAdd,
    announceError,
    greet,
    confirm,

    // Voice selection
    availableVoices,
    frenchVoices
  };
};

/**
 * useVoiceSettings - Hook for voice configuration UI
 * Use this in settings pages to let users configure voice output
 */
export const useVoiceSettings = () => {
  const [config, setConfigState] = useState<VoiceOutputConfig>({
    lang: 'fr-FR',
    rate: 1.0,
    pitch: 1.0,
    volume: 0.9
  });

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string | null>(null);

  useEffect(() => {
    const status = voiceOutputService.getStatus();
    setConfigState(status.config);
    setSelectedVoiceName(status.selectedVoice);

    // Load voices after a short delay (Chrome async loading)
    const loadVoices = () => {
      const frenchVoices = voiceOutputService.getFrenchVoices();
      if (frenchVoices.length > 0) {
        setVoices(frenchVoices);
      } else {
        // Fallback to all voices
        setVoices(voiceOutputService.getVoices());
      }
    };

    loadVoices();
    // Retry after 100ms for Chrome
    setTimeout(loadVoices, 100);
  }, []);

  const updateConfig = useCallback((updates: Partial<VoiceOutputConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfigState(newConfig);
    voiceOutputService.setConfig(updates);
  }, [config]);

  const selectVoice = useCallback((voiceName: string) => {
    setSelectedVoiceName(voiceName);
    voiceOutputService.setConfig({ voiceName });
  }, []);

  const testVoice = useCallback(() => {
    voiceOutputService.speak(
      'Bonjour ! Ceci est un test de la synthèse vocale.',
      'general'
    );
  }, []);

  return {
    config,
    voices,
    selectedVoiceName,
    updateConfig,
    selectVoice,
    testVoice
  };
};

export default useVoiceOutput;
