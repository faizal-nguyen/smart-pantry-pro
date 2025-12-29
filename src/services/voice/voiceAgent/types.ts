/**
 * Voice Agent Types - Smart Pantry Pro
 * Complete type definitions for the conversational voice interface
 */

// ============================================
// INTENT TYPES
// ============================================

export enum VoiceIntent {
  // === MUTATIONS ===
  ADD_ITEM = 'add_item',           // "Ajoute 2 packs de yaourts"
  CONSUME_ITEM = 'consume_item',   // "J'ai utilise 3 oeufs"
  REMOVE_ITEM = 'remove_item',     // "J'ai fini le lait" / "Supprime le beurre"
  UPDATE_QUANTITY = 'update_qty',  // "Il reste 5 pommes"

  // === QUERIES ===
  CHECK_STOCK = 'check_stock',     // "Il me reste combien de riz?"
  CHECK_EXPIRY = 'check_expiry',   // "Qu'est-ce qui expire bientot?"
  SEARCH_ITEM = 'search_item',     // "Est-ce que j'ai du parmesan?"
  LIST_CATEGORY = 'list_category', // "Qu'est-ce que j'ai en legumes?"
  LIST_LOW_STOCK = 'list_low_stock', // "Qu'est-ce qui manque?"

  // === SHOPPING LIST ===
  ADD_TO_SHOPPING = 'add_shopping',    // "Ajoute du lait a la liste"
  CHECK_SHOPPING = 'check_shopping',   // "Qu'est-ce qu'il faut acheter?"

  // === CONVERSATION ===
  CONFIRM = 'confirm',             // "Oui" / "C'est bon"
  DENY = 'deny',                   // "Non" / "Annule"
  CORRECT = 'correct',             // "Non pas 3, j'ai dit 2"
  HELP = 'help',                   // "Aide" / "Que peux-tu faire?"
  CANCEL = 'cancel',               // "Annuler" / "Stop"
  REPEAT = 'repeat',               // "Repete" / "Quoi?"

  // === FALLBACK ===
  UNKNOWN = 'unknown'
}

// ============================================
// ENTITY TYPES
// ============================================

export enum EntityType {
  PRODUCT = 'product',       // Nom du produit
  QUANTITY = 'quantity',     // Nombre
  UNIT = 'unit',            // kg, L, pieces, etc.
  BRAND = 'brand',          // Marque (optionnel)
  VARIANT = 'variant',      // demi-ecreme, bio, etc.
  LOCATION = 'location',    // frigo, placard, congelateur
  EXPIRY_DATE = 'expiry',   // Date de peremption
  TIME_REFERENCE = 'time',  // "bientot", "cette semaine"
  CATEGORY = 'category',    // fruits, legumes, etc.
}

export interface VoiceEntity {
  type: EntityType;
  value: string | number;
  rawValue: string;      // Valeur originale dans le transcript
  confidence: number;
  startIndex?: number;   // Position dans le transcript
  endIndex?: number;
  normalized?: string;   // Valeur normalisee
}

// ============================================
// NLU RESULT TYPES
// ============================================

export interface NLUResult {
  intent: VoiceIntent;
  intentConfidence: number;
  entities: VoiceEntity[];
  rawTranscript: string;
  normalizedTranscript: string;
  alternatives?: Array<{
    intent: VoiceIntent;
    confidence: number;
  }>;
  processingTime: number;
}

export interface ParsedItem {
  product: string;
  quantity: number;
  unit: string;
  variant?: string;
  brand?: string;
  confidence: number;
}

// ============================================
// DIALOG STATE TYPES
// ============================================

export enum DialogState {
  IDLE = 'idle',                    // En attente
  LISTENING = 'listening',          // Ecoute active
  PROCESSING = 'processing',        // Traitement NLU
  AWAITING_CONFIRMATION = 'awaiting_confirmation',  // Attente confirmation
  AWAITING_DISAMBIGUATION = 'awaiting_disambiguation',  // Attente choix
  AWAITING_SLOT = 'awaiting_slot',  // Attente info manquante
  EXECUTING = 'executing',          // Execution action
  RESPONDING = 'responding',        // Generation reponse
  ERROR = 'error',                  // Erreur
}

export interface ConversationTurn {
  timestamp: number;
  speaker: 'user' | 'system';
  transcript?: string;
  nluResult?: NLUResult;
  action?: PendingAction;
  response?: VoiceResponse;
}

export interface DialogContext {
  state: DialogState;
  sessionId: string;
  currentIntent: VoiceIntent | null;
  entities: VoiceEntity[];
  pendingAction: PendingAction | null;
  conversationHistory: ConversationTurn[];
  disambiguationOptions: DisambiguationOption[] | null;
  missingSlots: string[];
  lastUpdateTime: number;
  errorCount: number;
  lastError?: string;
}

// ============================================
// ACTION TYPES
// ============================================

export interface PendingAction {
  type: ActionType;
  params: ActionParams;
  requiresConfirmation: boolean;
  confirmationMessage?: string;
  confidence: number;
  createdAt: number;
}

export type ActionType =
  | 'add_to_inventory'
  | 'consume_from_inventory'
  | 'remove_from_inventory'
  | 'update_inventory_quantity'
  | 'add_to_shopping_list'
  | 'search_inventory'
  | 'get_expiring_items'
  | 'get_low_stock_items'
  | 'get_category_items'
  | 'undo_last_action';

export interface ActionParams {
  productId?: string;
  productName?: string;
  quantity?: number;
  unit?: string;
  category?: string;
  daysUntilExpiry?: number;
  searchQuery?: string;
}

export interface ActionResult {
  success: boolean;
  action: ActionType;
  data?: any;
  error?: string;
  affectedItems?: Array<{
    id: string;
    name: string;
    previousQuantity?: number;
    newQuantity?: number;
  }>;
  undoable: boolean;
  undoAction?: PendingAction;
}

// ============================================
// DISAMBIGUATION TYPES
// ============================================

export interface DisambiguationOption {
  id: string;
  name: string;
  displayName: string;
  matchScore: number;
  details?: string;  // e.g., "500g en stock"
}

export interface DisambiguationResult {
  selectedOption: DisambiguationOption | null;
  selectionMethod: 'voice' | 'touch' | 'timeout' | 'cancel';
  confidence: number;
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface VoiceResponse {
  // Vocal response
  speech: {
    text: string;
    ssml?: string;
    priority: 'high' | 'normal' | 'low';
    interruptible: boolean;
  };

  // Visual response
  visual?: {
    type: 'toast' | 'inline' | 'modal' | 'highlight';
    variant: 'success' | 'warning' | 'error' | 'info';
    title?: string;
    message: string;
    duration?: number;
    action?: {
      label: string;
      actionType: 'undo' | 'confirm' | 'dismiss' | 'navigate';
      payload?: any;
    };
  };

  // Haptic feedback (mobile)
  haptic?: {
    type: 'success' | 'warning' | 'error' | 'selection';
  };

  // State update
  nextState?: DialogState;
  contextUpdate?: Partial<DialogContext>;
}

// ============================================
// CORRECTION TYPES
// ============================================

export interface CorrectionInfo {
  type: 'quantity' | 'product' | 'action' | 'unit';
  originalValue: any;
  correctedValue: any;
  confidence: number;
  affectedEntityIndex?: number;
}

// ============================================
// CONFIGURATION TYPES
// ============================================

export interface VoiceAgentConfig {
  // STT Configuration
  stt: {
    primaryProvider: 'web-speech' | 'whisper-api' | 'deepgram';
    fallbackProvider?: 'web-speech' | 'whisper-api';
    language: string;
    continuous: boolean;
    interimResults: boolean;
    confidenceThreshold: number;
  };

  // NLU Configuration
  nlu: {
    useLLMFallback: boolean;
    llmModel?: string;
    confidenceThreshold: number;
    maxRetries: number;
  };

  // Dialog Configuration
  dialog: {
    confirmationStrategy: ConfirmationStrategy;
    timeoutMs: number;
    maxConversationTurns: number;
    enableCorrections: boolean;
  };

  // Response Configuration
  response: {
    enableVoice: boolean;
    enableVisual: boolean;
    enableHaptic: boolean;
    voiceRate: number;
    voicePitch: number;
  };
}

export enum ConfirmationStrategy {
  ALWAYS_VOICE = 'always_voice',
  CRITICAL_ONLY = 'critical_only',
  VISUAL_WITH_UNDO = 'visual_with_undo',
  NONE = 'none',
  ADAPTIVE = 'adaptive',
}

// ============================================
// EVENT TYPES
// ============================================

export type VoiceAgentEvent =
  | { type: 'LISTENING_STARTED' }
  | { type: 'LISTENING_STOPPED' }
  | { type: 'TRANSCRIPT_RECEIVED'; transcript: string; confidence: number; isFinal: boolean }
  | { type: 'INTENT_RECOGNIZED'; result: NLUResult }
  | { type: 'DISAMBIGUATION_REQUIRED'; options: DisambiguationOption[] }
  | { type: 'CONFIRMATION_REQUIRED'; action: PendingAction }
  | { type: 'ACTION_EXECUTED'; result: ActionResult }
  | { type: 'RESPONSE_GENERATED'; response: VoiceResponse }
  | { type: 'ERROR'; error: string; recoverable: boolean }
  | { type: 'STATE_CHANGED'; previousState: DialogState; newState: DialogState }
  | { type: 'SESSION_ENDED'; reason: 'completed' | 'timeout' | 'cancelled' | 'error' };

export type VoiceAgentEventHandler = (event: VoiceAgentEvent) => void;

// ============================================
// HOOK RETURN TYPE
// ============================================

export interface UseVoiceAgentReturn {
  // State
  isListening: boolean;
  isProcessing: boolean;
  dialogState: DialogState;
  currentTranscript: string;
  lastResponse: VoiceResponse | null;
  error: string | null;

  // Context
  context: DialogContext;
  disambiguationOptions: DisambiguationOption[] | null;
  pendingAction: PendingAction | null;

  // Controls
  startListening: () => Promise<void>;
  stopListening: () => void;
  cancelAction: () => void;
  confirmAction: () => Promise<ActionResult>;
  selectDisambiguation: (optionId: string) => void;
  processManualInput: (text: string) => Promise<void>;

  // Utilities
  reset: () => void;
  getCapabilities: () => VoiceAgentCapabilities;
}

export interface VoiceAgentCapabilities {
  sttSupported: boolean;
  ttsSupported: boolean;
  microphonePermission: 'granted' | 'denied' | 'prompt' | 'unknown';
  preferredVoice: string | null;
  browserSupport: 'full' | 'partial' | 'none';
}
