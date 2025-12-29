/**
 * useVoiceAgent - Smart Pantry Pro
 * React hook for the conversational voice interface
 *
 * Usage:
 * ```tsx
 * const {
 *   isListening,
 *   dialogState,
 *   startListening,
 *   stopListening,
 *   lastResponse,
 * } = useVoiceAgent({
 *   onActionExecuted: (result) => { ... },
 *   enableVoiceFeedback: true,
 * });
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  DialogState,
  DialogContext,
  VoiceIntent,
  VoiceResponse,
  PendingAction,
  DisambiguationOption,
  NLUResult,
  ActionResult,
  UseVoiceAgentReturn,
  VoiceAgentCapabilities,
  VoiceAgentEvent,
  VoiceAgentEventHandler,
} from '@/services/voice/voiceAgent/types';
import {
  createInitialContext,
  transition,
} from '@/services/voice/voiceAgent/dialogManager';
import {
  classifyIntent,
  extractEntities,
  extractParsedItems,
} from '@/services/voice/voiceAgent/intents';
import { voiceOutputService } from '@/services/voice/voiceOutputService';
import { useInventory } from './useInventory';
import { useToast } from './use-toast';

// ============================================
// CONFIGURATION
// ============================================

interface UseVoiceAgentOptions {
  // Callbacks
  onActionExecuted?: (result: ActionResult) => void;
  onError?: (error: string) => void;
  onStateChange?: (state: DialogState) => void;
  onEvent?: VoiceAgentEventHandler;

  // Features
  enableVoiceFeedback?: boolean;
  enableVisualFeedback?: boolean;
  enableOptimisticUpdates?: boolean;

  // Timeouts
  listeningTimeout?: number;
  confirmationTimeout?: number;
  disambiguationTimeout?: number;

  // Language
  language?: string;
}

const DEFAULT_OPTIONS: Required<UseVoiceAgentOptions> = {
  onActionExecuted: () => {},
  onError: () => {},
  onStateChange: () => {},
  onEvent: () => {},
  enableVoiceFeedback: true,
  enableVisualFeedback: true,
  enableOptimisticUpdates: true,
  listeningTimeout: 10000,
  confirmationTimeout: 8000,
  disambiguationTimeout: 15000,
  language: 'fr-FR',
};

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useVoiceAgent(
  options: UseVoiceAgentOptions = {}
): UseVoiceAgentReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { toast } = useToast();

  // State
  const [context, setContext] = useState<DialogContext>(createInitialContext());
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState<VoiceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Inventory hook for actions
  const {
    inventory,
    products,
    addProduct,
    addToInventory,
    consumeItem,
    deleteInventoryItem,
    getExpiringItems,
    getLowStockItems,
    searchInventory,
  } = useInventory({ enableVoiceFeedback: opts.enableVoiceFeedback });

  // ============================================
  // SPEECH RECOGNITION
  // ============================================

  const initializeRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error('Speech recognition not supported');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = opts.language;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    return recognition;
  }, [opts.language]);

  // ============================================
  // EVENT EMISSION
  // ============================================

  const emitEvent = useCallback((event: VoiceAgentEvent) => {
    opts.onEvent(event);
  }, [opts]);

  // ============================================
  // CONTEXT UPDATES
  // ============================================

  const updateContext = useCallback((
    event: Parameters<typeof transition>[1]
  ) => {
    setContext(prevContext => {
      const result = transition(prevContext, event);

      // Handle side effects
      if (result.sideEffect) {
        handleSideEffect(result.sideEffect);
      }

      // Notify state change
      if (result.newContext.state !== prevContext.state) {
        opts.onStateChange(result.newContext.state);
        emitEvent({
          type: 'STATE_CHANGED',
          previousState: prevContext.state,
          newState: result.newContext.state,
        });
      }

      return result.newContext;
    });
  }, [opts, emitEvent]);

  // ============================================
  // SIDE EFFECTS
  // ============================================

  const handleSideEffect = useCallback((sideEffect: any) => {
    switch (sideEffect.type) {
      case 'SPEAK':
        if (opts.enableVoiceFeedback && sideEffect.response.speech) {
          voiceOutputService.speak(
            sideEffect.response.speech.text,
            'general'
          );
        }
        if (opts.enableVisualFeedback && sideEffect.response.visual) {
          toast({
            title: sideEffect.response.visual.title,
            description: sideEffect.response.visual.message,
            variant: sideEffect.response.visual.variant === 'error' ? 'destructive' : 'default',
          });
        }
        setLastResponse(sideEffect.response);
        break;

      case 'SHOW_DISAMBIGUATION':
        // Visual display is handled by component
        if (opts.enableVoiceFeedback) {
          const optionsText = sideEffect.options
            .slice(0, 3)
            .map((opt: DisambiguationOption, i: number) => `${i + 1}, ${opt.displayName}`)
            .join('. ');
          voiceOutputService.speak(
            `Quel produit ? ${optionsText}`,
            'general'
          );
        }
        break;
    }
  }, [opts, toast]);

  // ============================================
  // NLU PROCESSING
  // ============================================

  const processNLU = useCallback(async (transcript: string) => {
    setIsProcessing(true);

    try {
      // Classify intent
      const classification = classifyIntent(transcript);

      // Extract entities
      const entities = extractEntities(transcript, classification.intent);

      // Create NLU result
      const nluResult: NLUResult = {
        intent: classification.intent,
        intentConfidence: classification.confidence,
        entities,
        rawTranscript: transcript,
        normalizedTranscript: transcript.toLowerCase(),
        processingTime: Date.now(),
      };

      emitEvent({ type: 'INTENT_RECOGNIZED', result: nluResult });

      // Check for disambiguation needs
      if (nluResult.intent !== VoiceIntent.UNKNOWN) {
        const items = extractParsedItems(transcript);

        if (items.length > 0) {
          // Look for matching products in inventory
          const matches = findProductMatches(items[0].product);

          if (matches.length > 1 && matches[0].matchScore - matches[1].matchScore < 0.1) {
            // Need disambiguation
            updateContext({
              type: 'DISAMBIGUATION_REQUIRED',
              options: matches.slice(0, 3),
            });
            return;
          }
        }
      }

      // Proceed with NLU result
      updateContext({ type: 'NLU_COMPLETE', result: nluResult });

    } catch (err) {
      console.error('NLU processing error:', err);
      setError('Erreur de traitement');
      emitEvent({ type: 'ERROR', error: 'NLU processing failed', recoverable: true });
    } finally {
      setIsProcessing(false);
    }
  }, [emitEvent, updateContext]);

  // ============================================
  // PRODUCT MATCHING
  // ============================================

  const findProductMatches = useCallback((productName: string): DisambiguationOption[] => {
    const normalizedSearch = productName.toLowerCase();

    return products
      .map(product => {
        const normalizedProduct = product.name.toLowerCase();

        // Calculate match score
        let score = 0;

        // Exact match
        if (normalizedProduct === normalizedSearch) {
          score = 1.0;
        }
        // Starts with
        else if (normalizedProduct.startsWith(normalizedSearch)) {
          score = 0.9;
        }
        // Contains
        else if (normalizedProduct.includes(normalizedSearch)) {
          score = 0.7;
        }
        // Partial word match
        else {
          const searchWords = normalizedSearch.split(' ');
          const productWords = normalizedProduct.split(' ');
          const matchingWords = searchWords.filter(sw =>
            productWords.some(pw => pw.includes(sw) || sw.includes(pw))
          );
          score = matchingWords.length / searchWords.length * 0.6;
        }

        // Get current stock info
        const inventoryItem = inventory.find(i => i.product_id === product.id);
        const stockInfo = inventoryItem
          ? `${inventoryItem.quantity} ${product.unit_type} en stock`
          : 'Pas en stock';

        return {
          id: product.id,
          name: product.name,
          displayName: product.name,
          matchScore: score,
          details: stockInfo,
        };
      })
      .filter(match => match.matchScore > 0.3)
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [products, inventory]);

  // ============================================
  // ACTION EXECUTION
  // ============================================

  const executeAction = useCallback(async (action: PendingAction): Promise<ActionResult> => {
    try {
      let result: any;

      switch (action.type) {
        case 'add_to_inventory':
          // Find or create product
          let product = products.find(p =>
            p.name.toLowerCase() === action.params.productName?.toLowerCase()
          );

          if (!product && action.params.productName) {
            product = await addProduct({
              name: action.params.productName,
              category: 'Autres',
              unit_type: action.params.unit || 'unite',
            });
          }

          if (product) {
            await addToInventory({
              product_id: product.id,
              quantity: action.params.quantity || 1,
            });
            result = {
              productName: product.name,
              quantity: action.params.quantity,
            };
          }
          break;

        case 'consume_from_inventory':
          const consumeItem_ = inventory.find(i =>
            i.product?.name.toLowerCase().includes(action.params.productName?.toLowerCase() || '')
          );

          if (consumeItem_) {
            const newQty = Math.max(0, consumeItem_.quantity - (action.params.quantity || 1));
            await consumeItem(consumeItem_.id, action.params.quantity || 1);
            result = {
              productName: consumeItem_.product?.name,
              quantity: action.params.quantity,
              remaining: newQty,
            };
          }
          break;

        case 'remove_from_inventory':
          const removeItem = inventory.find(i =>
            i.product?.name.toLowerCase().includes(action.params.productName?.toLowerCase() || '')
          );

          if (removeItem) {
            await deleteInventoryItem(removeItem.id);
            result = { productName: removeItem.product?.name };
          }
          break;

        case 'search_inventory':
          const searchResults = searchInventory(action.params.searchQuery || action.params.productName || '');
          result = {
            items: searchResults,
            count: searchResults.length,
          };
          break;

        case 'get_expiring_items':
          const expiringItems = getExpiringItems(action.params.daysUntilExpiry || 7);
          result = {
            items: expiringItems,
            count: expiringItems.length,
          };
          break;

        case 'get_low_stock_items':
          const lowStockItems = getLowStockItems(2);
          result = {
            items: lowStockItems,
            count: lowStockItems.length,
          };
          break;
      }

      const actionResult: ActionResult = {
        success: true,
        action: action.type,
        data: result,
        undoable: ['add_to_inventory', 'consume_from_inventory'].includes(action.type),
      };

      updateContext({ type: 'ACTION_SUCCESS', result });
      opts.onActionExecuted(actionResult);
      emitEvent({ type: 'ACTION_EXECUTED', result: actionResult });

      return actionResult;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Action failed';
      updateContext({ type: 'ACTION_FAILED', error: errorMessage });
      opts.onError(errorMessage);
      emitEvent({ type: 'ERROR', error: errorMessage, recoverable: true });

      return {
        success: false,
        action: action.type,
        error: errorMessage,
        undoable: false,
      };
    }
  }, [
    products, inventory, addProduct, addToInventory, consumeItem,
    deleteInventoryItem, searchInventory, getExpiringItems, getLowStockItems,
    updateContext, opts, emitEvent
  ]);

  // ============================================
  // LISTENING CONTROLS
  // ============================================

  const startListening = useCallback(async () => {
    if (isListening) return;

    const recognition = initializeRecognition();
    if (!recognition) {
      setError('Reconnaissance vocale non supportee');
      return;
    }

    recognitionRef.current = recognition;

    // Event handlers
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setCurrentTranscript('');
      updateContext({ type: 'START_LISTENING' });
      emitEvent({ type: 'LISTENING_STARTED' });
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setCurrentTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        emitEvent({
          type: 'TRANSCRIPT_RECEIVED',
          transcript: finalTranscript,
          confidence: event.results[0][0].confidence || 0.8,
          isFinal: true,
        });

        updateContext({
          type: 'TRANSCRIPT_RECEIVED',
          transcript: finalTranscript,
          confidence: event.results[0][0].confidence || 0.8,
        });

        // Process NLU
        processNLU(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);

      let errorMessage = 'Erreur de reconnaissance vocale';
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'Aucune parole detectee';
          updateContext({ type: 'TIMEOUT' });
          break;
        case 'audio-capture':
          errorMessage = 'Probleme avec le microphone';
          break;
        case 'not-allowed':
          errorMessage = 'Permission microphone refusee';
          break;
        case 'network':
          errorMessage = 'Probleme de connexion reseau';
          break;
      }

      setError(errorMessage);
      emitEvent({ type: 'ERROR', error: errorMessage, recoverable: event.error !== 'not-allowed' });
    };

    recognition.onend = () => {
      setIsListening(false);
      emitEvent({ type: 'LISTENING_STOPPED' });
    };

    // Start with timeout
    try {
      recognition.start();

      // Set listening timeout
      timeoutRef.current = setTimeout(() => {
        if (recognitionRef.current && isListening) {
          recognition.stop();
          updateContext({ type: 'TIMEOUT' });
        }
      }, opts.listeningTimeout);

    } catch (err) {
      console.error('Failed to start recognition:', err);
      setError('Impossible de demarrer la reconnaissance vocale');
    }
  }, [isListening, initializeRecognition, updateContext, emitEvent, processNLU, opts.listeningTimeout]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsListening(false);
    updateContext({ type: 'STOP_LISTENING' });
  }, [updateContext]);

  // ============================================
  // USER ACTIONS
  // ============================================

  const cancelAction = useCallback(() => {
    stopListening();
    updateContext({ type: 'CANCEL' });
  }, [stopListening, updateContext]);

  const confirmAction = useCallback(async (): Promise<ActionResult> => {
    if (!context.pendingAction) {
      return {
        success: false,
        action: 'undo_last_action',
        error: 'No pending action',
        undoable: false,
      };
    }

    return executeAction(context.pendingAction);
  }, [context.pendingAction, executeAction]);

  const selectDisambiguation = useCallback((optionId: string) => {
    updateContext({ type: 'USER_SELECTED_OPTION', optionId });
  }, [updateContext]);

  const processManualInput = useCallback(async (text: string) => {
    setCurrentTranscript(text);
    updateContext({
      type: 'TRANSCRIPT_RECEIVED',
      transcript: text,
      confidence: 1.0,
    });
    await processNLU(text);
  }, [updateContext, processNLU]);

  const reset = useCallback(() => {
    stopListening();
    setContext(createInitialContext());
    setCurrentTranscript('');
    setLastResponse(null);
    setError(null);
  }, [stopListening]);

  // ============================================
  // CAPABILITIES
  // ============================================

  const getCapabilities = useCallback((): VoiceAgentCapabilities => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const synthesis = window.speechSynthesis;

    return {
      sttSupported: !!SpeechRecognition,
      ttsSupported: !!synthesis,
      microphonePermission: 'unknown',  // Would need to check permissions API
      preferredVoice: voiceOutputService.getStatus().selectedVoice,
      browserSupport: SpeechRecognition && synthesis ? 'full' : (SpeechRecognition || synthesis ? 'partial' : 'none'),
    };
  }, []);

  // ============================================
  // EFFECTS
  // ============================================

  // Execute pending action when entering EXECUTING state
  useEffect(() => {
    if (context.state === DialogState.EXECUTING && context.pendingAction) {
      executeAction(context.pendingAction);
    }
  }, [context.state, context.pendingAction, executeAction]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // ============================================
  // RETURN
  // ============================================

  return {
    // State
    isListening,
    isProcessing,
    dialogState: context.state,
    currentTranscript,
    lastResponse,
    error,

    // Context
    context,
    disambiguationOptions: context.disambiguationOptions,
    pendingAction: context.pendingAction,

    // Controls
    startListening,
    stopListening,
    cancelAction,
    confirmAction,
    selectDisambiguation,
    processManualInput,

    // Utilities
    reset,
    getCapabilities,
  };
}

export default useVoiceAgent;
