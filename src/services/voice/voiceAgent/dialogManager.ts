/**
 * Dialog Manager - Smart Pantry Pro Voice Agent
 * State machine for managing conversational flow
 */

import {
  DialogState,
  DialogContext,
  VoiceIntent,
  VoiceEntity,
  PendingAction,
  ActionType,
  DisambiguationOption,
  CorrectionInfo,
  NLUResult,
  ConversationTurn,
  VoiceResponse,
  ConfirmationStrategy,
} from './types';
import { classifyIntent, extractEntities, extractParsedItems, normalizeTranscript } from './intents';

// ============================================
// INITIAL STATE
// ============================================

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createInitialContext(): DialogContext {
  return {
    state: DialogState.IDLE,
    sessionId: generateSessionId(),
    currentIntent: null,
    entities: [],
    pendingAction: null,
    conversationHistory: [],
    disambiguationOptions: null,
    missingSlots: [],
    lastUpdateTime: Date.now(),
    errorCount: 0,
  };
}

// ============================================
// STATE TRANSITIONS
// ============================================

export type DialogEvent =
  | { type: 'START_LISTENING' }
  | { type: 'STOP_LISTENING' }
  | { type: 'TRANSCRIPT_RECEIVED'; transcript: string; confidence: number }
  | { type: 'NLU_COMPLETE'; result: NLUResult }
  | { type: 'DISAMBIGUATION_REQUIRED'; options: DisambiguationOption[] }
  | { type: 'USER_SELECTED_OPTION'; optionId: string }
  | { type: 'USER_CONFIRMED' }
  | { type: 'USER_DENIED' }
  | { type: 'ACTION_SUCCESS'; result: any }
  | { type: 'ACTION_FAILED'; error: string }
  | { type: 'TIMEOUT' }
  | { type: 'CANCEL' }
  | { type: 'RESET' };

export interface StateTransitionResult {
  newContext: DialogContext;
  sideEffect?: SideEffect;
}

export type SideEffect =
  | { type: 'START_STT' }
  | { type: 'STOP_STT' }
  | { type: 'PROCESS_NLU'; transcript: string }
  | { type: 'EXECUTE_ACTION'; action: PendingAction }
  | { type: 'SPEAK'; response: VoiceResponse }
  | { type: 'SHOW_DISAMBIGUATION'; options: DisambiguationOption[] }
  | { type: 'EMIT_EVENT'; event: string; data?: any };

export function transition(
  context: DialogContext,
  event: DialogEvent
): StateTransitionResult {
  const timestamp = Date.now();

  switch (context.state) {
    case DialogState.IDLE:
      return handleIdleState(context, event, timestamp);

    case DialogState.LISTENING:
      return handleListeningState(context, event, timestamp);

    case DialogState.PROCESSING:
      return handleProcessingState(context, event, timestamp);

    case DialogState.AWAITING_CONFIRMATION:
      return handleAwaitingConfirmationState(context, event, timestamp);

    case DialogState.AWAITING_DISAMBIGUATION:
      return handleAwaitingDisambiguationState(context, event, timestamp);

    case DialogState.AWAITING_SLOT:
      return handleAwaitingSlotState(context, event, timestamp);

    case DialogState.EXECUTING:
      return handleExecutingState(context, event, timestamp);

    case DialogState.RESPONDING:
      return handleRespondingState(context, event, timestamp);

    case DialogState.ERROR:
      return handleErrorState(context, event, timestamp);

    default:
      return { newContext: context };
  }
}

// ============================================
// STATE HANDLERS
// ============================================

function handleIdleState(
  context: DialogContext,
  event: DialogEvent,
  timestamp: number
): StateTransitionResult {
  switch (event.type) {
    case 'START_LISTENING':
      return {
        newContext: {
          ...context,
          state: DialogState.LISTENING,
          lastUpdateTime: timestamp,
        },
        sideEffect: { type: 'START_STT' },
      };

    case 'RESET':
      return {
        newContext: createInitialContext(),
      };

    default:
      return { newContext: context };
  }
}

function handleListeningState(
  context: DialogContext,
  event: DialogEvent,
  timestamp: number
): StateTransitionResult {
  switch (event.type) {
    case 'STOP_LISTENING':
      return {
        newContext: {
          ...context,
          state: DialogState.IDLE,
          lastUpdateTime: timestamp,
        },
        sideEffect: { type: 'STOP_STT' },
      };

    case 'TRANSCRIPT_RECEIVED':
      const turn: ConversationTurn = {
        timestamp,
        speaker: 'user',
        transcript: event.transcript,
      };

      return {
        newContext: {
          ...context,
          state: DialogState.PROCESSING,
          conversationHistory: [...context.conversationHistory, turn],
          lastUpdateTime: timestamp,
        },
        sideEffect: { type: 'PROCESS_NLU', transcript: event.transcript },
      };

    case 'TIMEOUT':
      return {
        newContext: {
          ...context,
          state: DialogState.IDLE,
          lastUpdateTime: timestamp,
        },
        sideEffect: {
          type: 'SPEAK',
          response: createTimeoutResponse(),
        },
      };

    case 'CANCEL':
      return {
        newContext: {
          ...context,
          state: DialogState.IDLE,
          lastUpdateTime: timestamp,
        },
        sideEffect: { type: 'STOP_STT' },
      };

    default:
      return { newContext: context };
  }
}

function handleProcessingState(
  context: DialogContext,
  event: DialogEvent,
  timestamp: number
): StateTransitionResult {
  switch (event.type) {
    case 'NLU_COMPLETE':
      const { result } = event;

      // Check if it's a conversational intent
      if (isConversationalIntent(result.intent)) {
        return handleConversationalIntent(context, result, timestamp);
      }

      // Check if we need disambiguation
      if (result.intent !== VoiceIntent.UNKNOWN) {
        // Create pending action
        const pendingAction = createPendingAction(result);

        if (pendingAction) {
          return {
            newContext: {
              ...context,
              state: DialogState.EXECUTING,
              currentIntent: result.intent,
              entities: result.entities,
              pendingAction,
              lastUpdateTime: timestamp,
            },
            sideEffect: { type: 'EXECUTE_ACTION', action: pendingAction },
          };
        }
      }

      // Unknown intent or failed to create action
      return {
        newContext: {
          ...context,
          state: DialogState.RESPONDING,
          currentIntent: result.intent,
          lastUpdateTime: timestamp,
        },
        sideEffect: {
          type: 'SPEAK',
          response: createUnknownIntentResponse(),
        },
      };

    case 'DISAMBIGUATION_REQUIRED':
      return {
        newContext: {
          ...context,
          state: DialogState.AWAITING_DISAMBIGUATION,
          disambiguationOptions: event.options,
          lastUpdateTime: timestamp,
        },
        sideEffect: {
          type: 'SHOW_DISAMBIGUATION',
          options: event.options,
        },
      };

    case 'CANCEL':
      return {
        newContext: {
          ...context,
          state: DialogState.IDLE,
          lastUpdateTime: timestamp,
        },
      };

    default:
      return { newContext: context };
  }
}

function handleAwaitingConfirmationState(
  context: DialogContext,
  event: DialogEvent,
  timestamp: number
): StateTransitionResult {
  switch (event.type) {
    case 'USER_CONFIRMED':
      if (context.pendingAction) {
        return {
          newContext: {
            ...context,
            state: DialogState.EXECUTING,
            lastUpdateTime: timestamp,
          },
          sideEffect: { type: 'EXECUTE_ACTION', action: context.pendingAction },
        };
      }
      return {
        newContext: {
          ...context,
          state: DialogState.IDLE,
          lastUpdateTime: timestamp,
        },
      };

    case 'USER_DENIED':
    case 'CANCEL':
      return {
        newContext: {
          ...context,
          state: DialogState.IDLE,
          pendingAction: null,
          lastUpdateTime: timestamp,
        },
        sideEffect: {
          type: 'SPEAK',
          response: createCancelResponse(),
        },
      };

    case 'TIMEOUT':
      return {
        newContext: {
          ...context,
          state: DialogState.IDLE,
          pendingAction: null,
          lastUpdateTime: timestamp,
        },
        sideEffect: {
          type: 'SPEAK',
          response: createConfirmationTimeoutResponse(),
        },
      };

    case 'TRANSCRIPT_RECEIVED':
      // Try to interpret as confirmation/denial
      const classification = classifyIntent(event.transcript);

      if (classification.intent === VoiceIntent.CONFIRM) {
        return transition(context, { type: 'USER_CONFIRMED' });
      } else if (classification.intent === VoiceIntent.DENY) {
        return transition(context, { type: 'USER_DENIED' });
      } else if (classification.intent === VoiceIntent.CORRECT) {
        // Handle correction
        return handleCorrection(context, event.transcript, timestamp);
      }

      // Unclear response
      return {
        newContext: context,
        sideEffect: {
          type: 'SPEAK',
          response: createUnclearConfirmationResponse(),
        },
      };

    default:
      return { newContext: context };
  }
}

function handleAwaitingDisambiguationState(
  context: DialogContext,
  event: DialogEvent,
  timestamp: number
): StateTransitionResult {
  switch (event.type) {
    case 'USER_SELECTED_OPTION':
      const selectedOption = context.disambiguationOptions?.find(
        opt => opt.id === event.optionId
      );

      if (selectedOption && context.pendingAction) {
        // Update pending action with selected product
        const updatedAction: PendingAction = {
          ...context.pendingAction,
          params: {
            ...context.pendingAction.params,
            productId: selectedOption.id,
            productName: selectedOption.name,
          },
        };

        return {
          newContext: {
            ...context,
            state: DialogState.EXECUTING,
            pendingAction: updatedAction,
            disambiguationOptions: null,
            lastUpdateTime: timestamp,
          },
          sideEffect: { type: 'EXECUTE_ACTION', action: updatedAction },
        };
      }

      return {
        newContext: {
          ...context,
          state: DialogState.IDLE,
          disambiguationOptions: null,
          lastUpdateTime: timestamp,
        },
      };

    case 'TRANSCRIPT_RECEIVED':
      // Try to match transcript to an option
      const matchedOption = matchDisambiguationOption(
        event.transcript,
        context.disambiguationOptions || []
      );

      if (matchedOption) {
        return transition(context, {
          type: 'USER_SELECTED_OPTION',
          optionId: matchedOption.id,
        });
      }

      // Check for cancel intent
      const classification = classifyIntent(event.transcript);
      if (classification.intent === VoiceIntent.CANCEL ||
          classification.intent === VoiceIntent.DENY) {
        return transition(context, { type: 'CANCEL' });
      }

      // Unclear selection
      return {
        newContext: context,
        sideEffect: {
          type: 'SPEAK',
          response: createUnclearSelectionResponse(context.disambiguationOptions || []),
        },
      };

    case 'TIMEOUT':
    case 'CANCEL':
      return {
        newContext: {
          ...context,
          state: DialogState.IDLE,
          disambiguationOptions: null,
          pendingAction: null,
          lastUpdateTime: timestamp,
        },
        sideEffect: {
          type: 'SPEAK',
          response: createDisambiguationTimeoutResponse(),
        },
      };

    default:
      return { newContext: context };
  }
}

function handleAwaitingSlotState(
  context: DialogContext,
  event: DialogEvent,
  timestamp: number
): StateTransitionResult {
  switch (event.type) {
    case 'TRANSCRIPT_RECEIVED':
      // Extract the missing slot value from transcript
      const entities = extractEntities(event.transcript, context.currentIntent!);
      const updatedEntities = [...context.entities, ...entities];

      // Check if all slots are filled
      const stillMissing = context.missingSlots.filter(
        slot => !updatedEntities.some(e => e.type.toString() === slot)
      );

      if (stillMissing.length === 0 && context.pendingAction) {
        // All slots filled, execute
        return {
          newContext: {
            ...context,
            state: DialogState.EXECUTING,
            entities: updatedEntities,
            missingSlots: [],
            lastUpdateTime: timestamp,
          },
          sideEffect: { type: 'EXECUTE_ACTION', action: context.pendingAction },
        };
      }

      // Still missing slots
      return {
        newContext: {
          ...context,
          entities: updatedEntities,
          missingSlots: stillMissing,
          lastUpdateTime: timestamp,
        },
        sideEffect: {
          type: 'SPEAK',
          response: createSlotPromptResponse(stillMissing[0]),
        },
      };

    case 'TIMEOUT':
    case 'CANCEL':
      return {
        newContext: {
          ...context,
          state: DialogState.IDLE,
          missingSlots: [],
          pendingAction: null,
          lastUpdateTime: timestamp,
        },
      };

    default:
      return { newContext: context };
  }
}

function handleExecutingState(
  context: DialogContext,
  event: DialogEvent,
  timestamp: number
): StateTransitionResult {
  switch (event.type) {
    case 'ACTION_SUCCESS':
      return {
        newContext: {
          ...context,
          state: DialogState.RESPONDING,
          pendingAction: null,
          lastUpdateTime: timestamp,
        },
        sideEffect: {
          type: 'SPEAK',
          response: createSuccessResponse(context.currentIntent!, event.result),
        },
      };

    case 'ACTION_FAILED':
      return {
        newContext: {
          ...context,
          state: DialogState.ERROR,
          errorCount: context.errorCount + 1,
          lastError: event.error,
          lastUpdateTime: timestamp,
        },
        sideEffect: {
          type: 'SPEAK',
          response: createErrorResponse(event.error),
        },
      };

    default:
      return { newContext: context };
  }
}

function handleRespondingState(
  context: DialogContext,
  event: DialogEvent,
  timestamp: number
): StateTransitionResult {
  // After response, return to idle
  return {
    newContext: {
      ...context,
      state: DialogState.IDLE,
      currentIntent: null,
      entities: [],
      lastUpdateTime: timestamp,
    },
  };
}

function handleErrorState(
  context: DialogContext,
  event: DialogEvent,
  timestamp: number
): StateTransitionResult {
  switch (event.type) {
    case 'RESET':
      return {
        newContext: createInitialContext(),
      };

    case 'START_LISTENING':
      // Allow retry
      if (context.errorCount < 3) {
        return {
          newContext: {
            ...context,
            state: DialogState.LISTENING,
            lastUpdateTime: timestamp,
          },
          sideEffect: { type: 'START_STT' },
        };
      }
      return { newContext: context };

    default:
      return { newContext: context };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function isConversationalIntent(intent: VoiceIntent): boolean {
  return [
    VoiceIntent.CONFIRM,
    VoiceIntent.DENY,
    VoiceIntent.CANCEL,
    VoiceIntent.CORRECT,
    VoiceIntent.HELP,
    VoiceIntent.REPEAT,
  ].includes(intent);
}

function handleConversationalIntent(
  context: DialogContext,
  result: NLUResult,
  timestamp: number
): StateTransitionResult {
  switch (result.intent) {
    case VoiceIntent.HELP:
      return {
        newContext: {
          ...context,
          state: DialogState.RESPONDING,
          lastUpdateTime: timestamp,
        },
        sideEffect: {
          type: 'SPEAK',
          response: createHelpResponse(),
        },
      };

    case VoiceIntent.CANCEL:
      return {
        newContext: {
          ...context,
          state: DialogState.IDLE,
          pendingAction: null,
          disambiguationOptions: null,
          lastUpdateTime: timestamp,
        },
        sideEffect: {
          type: 'SPEAK',
          response: createCancelResponse(),
        },
      };

    default:
      return {
        newContext: {
          ...context,
          state: DialogState.IDLE,
          lastUpdateTime: timestamp,
        },
      };
  }
}

function handleCorrection(
  context: DialogContext,
  transcript: string,
  timestamp: number
): StateTransitionResult {
  // Extract correction info
  const correction = extractCorrection(transcript);

  if (correction && context.pendingAction) {
    // Apply correction to pending action
    const updatedAction = applyCorrectionToAction(context.pendingAction, correction);

    return {
      newContext: {
        ...context,
        pendingAction: updatedAction,
        lastUpdateTime: timestamp,
      },
      sideEffect: {
        type: 'SPEAK',
        response: createCorrectionConfirmResponse(correction),
      },
    };
  }

  return { newContext: context };
}

function extractCorrection(transcript: string): CorrectionInfo | null {
  const normalized = normalizeTranscript(transcript);

  // Pattern: "non pas X, j'ai dit Y"
  const quantityPattern = /(?:non\s+)?(?:pas|c'est\s+pas)\s+(\d+).+(?:j'ai\s+dit|c'(?:est|[eé]tait))\s+(\d+)/i;
  const match = quantityPattern.exec(normalized);

  if (match) {
    return {
      type: 'quantity',
      originalValue: parseInt(match[1]),
      correctedValue: parseInt(match[2]),
      confidence: 0.9,
    };
  }

  // Pattern: "en fait X"
  const simplePattern = /(?:en\s+fait|pardon).+?(\d+)/i;
  const simpleMatch = simplePattern.exec(normalized);

  if (simpleMatch) {
    return {
      type: 'quantity',
      originalValue: null,
      correctedValue: parseInt(simpleMatch[1]),
      confidence: 0.7,
    };
  }

  return null;
}

function applyCorrectionToAction(
  action: PendingAction,
  correction: CorrectionInfo
): PendingAction {
  if (correction.type === 'quantity') {
    return {
      ...action,
      params: {
        ...action.params,
        quantity: correction.correctedValue,
      },
    };
  }

  return action;
}

function createPendingAction(result: NLUResult): PendingAction | null {
  const items = extractParsedItems(result.rawTranscript);

  if (items.length === 0) return null;

  const firstItem = items[0];
  let actionType: ActionType;

  switch (result.intent) {
    case VoiceIntent.ADD_ITEM:
      actionType = 'add_to_inventory';
      break;
    case VoiceIntent.CONSUME_ITEM:
      actionType = 'consume_from_inventory';
      break;
    case VoiceIntent.REMOVE_ITEM:
      actionType = 'remove_from_inventory';
      break;
    case VoiceIntent.CHECK_STOCK:
      actionType = 'search_inventory';
      break;
    case VoiceIntent.CHECK_EXPIRY:
      actionType = 'get_expiring_items';
      break;
    case VoiceIntent.LIST_LOW_STOCK:
      actionType = 'get_low_stock_items';
      break;
    case VoiceIntent.ADD_TO_SHOPPING:
      actionType = 'add_to_shopping_list';
      break;
    default:
      return null;
  }

  return {
    type: actionType,
    params: {
      productName: firstItem.product,
      quantity: firstItem.quantity,
      unit: firstItem.unit,
    },
    requiresConfirmation: false,  // Will be determined by strategy
    confidence: result.intentConfidence,
    createdAt: Date.now(),
  };
}

function matchDisambiguationOption(
  transcript: string,
  options: DisambiguationOption[]
): DisambiguationOption | null {
  const normalized = normalizeTranscript(transcript);

  // Check for number selection
  const numberMatch = /^(?:le\s+)?(\d+|un|deux|trois|premier|deuxi[eè]me|troisi[eè]me)$/i.exec(normalized);
  if (numberMatch) {
    const numberMap: Record<string, number> = {
      '1': 0, 'un': 0, 'premier': 0,
      '2': 1, 'deux': 1, 'deuxieme': 1, 'deuxieme': 1,
      '3': 2, 'trois': 2, 'troisieme': 2, 'troisieme': 2,
    };
    const index = numberMap[numberMatch[1].toLowerCase()];
    if (index !== undefined && index < options.length) {
      return options[index];
    }
  }

  // Check for name match
  for (const option of options) {
    if (normalized.includes(option.name.toLowerCase()) ||
        normalized.includes(option.displayName.toLowerCase())) {
      return option;
    }
  }

  return null;
}

// ============================================
// RESPONSE TEMPLATES
// ============================================

function createTimeoutResponse(): VoiceResponse {
  return {
    speech: {
      text: "Je n'ai rien entendu. Voulez-vous reessayer ?",
      priority: 'normal',
      interruptible: true,
    },
    visual: {
      type: 'toast',
      variant: 'warning',
      message: 'Aucune parole detectee',
      duration: 3000,
    },
  };
}

function createUnknownIntentResponse(): VoiceResponse {
  return {
    speech: {
      text: "Desole, je n'ai pas compris. Pouvez-vous reformuler ?",
      priority: 'normal',
      interruptible: true,
    },
    visual: {
      type: 'toast',
      variant: 'warning',
      message: 'Commande non reconnue',
      duration: 3000,
    },
  };
}

function createCancelResponse(): VoiceResponse {
  return {
    speech: {
      text: "D'accord, j'annule.",
      priority: 'normal',
      interruptible: true,
    },
  };
}

function createConfirmationTimeoutResponse(): VoiceResponse {
  return {
    speech: {
      text: "Pas de reponse, j'annule par securite.",
      priority: 'normal',
      interruptible: true,
    },
  };
}

function createUnclearConfirmationResponse(): VoiceResponse {
  return {
    speech: {
      text: "Je n'ai pas compris. Dites oui pour confirmer ou non pour annuler.",
      priority: 'normal',
      interruptible: true,
    },
  };
}

function createUnclearSelectionResponse(options: DisambiguationOption[]): VoiceResponse {
  const optionsList = options
    .slice(0, 3)
    .map((opt, i) => `${i + 1}, ${opt.displayName}`)
    .join('. ');

  return {
    speech: {
      text: `Je n'ai pas compris votre choix. Les options sont : ${optionsList}`,
      priority: 'normal',
      interruptible: true,
    },
  };
}

function createDisambiguationTimeoutResponse(): VoiceResponse {
  return {
    speech: {
      text: "Temps ecoule. L'operation est annulee.",
      priority: 'normal',
      interruptible: true,
    },
  };
}

function createSlotPromptResponse(missingSlot: string): VoiceResponse {
  const prompts: Record<string, string> = {
    product: "Quel produit ?",
    quantity: "Quelle quantite ?",
    unit: "Quelle unite ?",
  };

  return {
    speech: {
      text: prompts[missingSlot] || `Precisez ${missingSlot}`,
      priority: 'normal',
      interruptible: true,
    },
  };
}

function createSuccessResponse(intent: VoiceIntent, result: any): VoiceResponse {
  const templates: Partial<Record<VoiceIntent, string[]>> = {
    [VoiceIntent.ADD_ITEM]: [
      "C'est note, j'ai ajoute {item} a votre inventaire.",
      "Parfait, {item} a ete ajoute.",
    ],
    [VoiceIntent.CONSUME_ITEM]: [
      "Note, {quantity} {item} utilise. Il vous en reste {remaining}.",
      "C'est fait. Stock de {item} mis a jour.",
    ],
    [VoiceIntent.REMOVE_ITEM]: [
      "{item} a ete retire de l'inventaire.",
    ],
    [VoiceIntent.CHECK_STOCK]: [
      "Vous avez {quantity} {item} en stock.",
    ],
    [VoiceIntent.CHECK_EXPIRY]: [
      "{count} produits expirent bientot.",
    ],
  };

  const intentTemplates = templates[intent] || ["Operation effectuee."];
  const template = intentTemplates[Math.floor(Math.random() * intentTemplates.length)];

  // Replace placeholders with actual values
  let text = template;
  if (result) {
    text = text
      .replace('{item}', result.productName || result.item || '')
      .replace('{quantity}', result.quantity?.toString() || '')
      .replace('{remaining}', result.remaining?.toString() || '')
      .replace('{count}', result.count?.toString() || '');
  }

  return {
    speech: {
      text,
      priority: 'normal',
      interruptible: true,
    },
    visual: {
      type: 'toast',
      variant: 'success',
      message: text,
      duration: 3000,
    },
  };
}

function createErrorResponse(error: string): VoiceResponse {
  return {
    speech: {
      text: `Une erreur s'est produite. ${error}`,
      priority: 'high',
      interruptible: false,
    },
    visual: {
      type: 'toast',
      variant: 'error',
      message: error,
      duration: 5000,
    },
  };
}

function createCorrectionConfirmResponse(correction: CorrectionInfo): VoiceResponse {
  return {
    speech: {
      text: `D'accord, j'ai corrige: ${correction.correctedValue} au lieu de ${correction.originalValue}.`,
      priority: 'normal',
      interruptible: true,
    },
  };
}

function createHelpResponse(): VoiceResponse {
  return {
    speech: {
      text: `Vous pouvez dire : ajouter des produits, retirer des oeufs,
             qu'est-ce qui expire bientot, il me reste combien de lait,
             ou annuler pour arreter.`,
      priority: 'normal',
      interruptible: true,
    },
    visual: {
      type: 'modal',
      variant: 'info',
      title: 'Aide vocale',
      message: 'Commandes disponibles: ajouter, retirer, verifier stock, expirations',
    },
  };
}

// ============================================
// EXPORTS
// ============================================

export {
  createInitialContext,
  transition,
};
