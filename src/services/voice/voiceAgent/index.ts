/**
 * Voice Agent - Smart Pantry Pro
 * Main entry point for the conversational voice interface
 */

// Types
export * from './types';

// Intent Recognition
export {
  classifyIntent,
  extractEntities,
  extractParsedItems,
  normalizeTranscript,
  textToNumber,
  normalizeUnit,
  INTENT_PATTERNS,
  FRENCH_NORMALIZATION,
} from './intents';

// Dialog Management
export {
  createInitialContext,
  transition,
} from './dialogManager';

// Re-export common types for convenience
export type {
  VoiceIntent,
  VoiceEntity,
  EntityType,
  DialogState,
  DialogContext,
  NLUResult,
  ParsedItem,
  PendingAction,
  ActionType,
  ActionResult,
  DisambiguationOption,
  VoiceResponse,
  VoiceAgentConfig,
  UseVoiceAgentReturn,
} from './types';
