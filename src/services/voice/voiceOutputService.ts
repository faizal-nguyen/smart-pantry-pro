/**
 * Voice Output Service - Text-to-Speech (TTS) for Smart Pantry Pro
 * Phase 1 Implementation: Web Speech API synthesis with French optimization
 *
 * Features:
 * - Natural French voice with multiple voice options
 * - Context-aware responses for pantry actions
 * - Adjustable speech parameters (rate, pitch, volume)
 * - Queue management for sequential announcements
 * - Interruption handling
 */

export interface VoiceOutputConfig {
  lang: string;
  rate: number;        // 0.1 to 10
  pitch: number;       // 0 to 2
  volume: number;      // 0 to 1
  voiceName?: string;  // Preferred voice name
}

export interface SpeechQueueItem {
  text: string;
  priority: 'low' | 'normal' | 'high';
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

export type VoiceContext =
  | 'inventory_add'
  | 'inventory_remove'
  | 'inventory_search'
  | 'expiration_alert'
  | 'low_stock'
  | 'recipe_suggestion'
  | 'shopping_list'
  | 'confirmation'
  | 'error'
  | 'greeting'
  | 'general';

// Pre-defined response templates for different contexts
const RESPONSE_TEMPLATES: Record<VoiceContext, string[]> = {
  inventory_add: [
    "C'est noté, j'ai ajouté {item} à votre inventaire.",
    "Parfait, {item} a été ajouté.",
    "{item} est maintenant dans votre garde-manger.",
    "Ajouté ! {item} est bien enregistré."
  ],
  inventory_remove: [
    "D'accord, j'ai retiré {item} de l'inventaire.",
    "{item} a été supprimé.",
    "Supprimé ! {item} n'est plus dans la liste."
  ],
  inventory_search: [
    "Voici ce que j'ai trouvé pour {item}.",
    "J'ai trouvé des résultats pour {item}.",
    "Recherche terminée pour {item}."
  ],
  expiration_alert: [
    "Attention, {item} expire bientôt.",
    "Alerte : {item} va périmer dans {days} jours.",
    "N'oubliez pas d'utiliser {item}, il expire bientôt."
  ],
  low_stock: [
    "Il reste peu de {item}. Pensez à en racheter.",
    "Stock bas : {item}. Voulez-vous l'ajouter à la liste de courses ?",
    "Alerte stock : {item} est presque épuisé."
  ],
  recipe_suggestion: [
    "Je vous propose une recette avec {item}.",
    "Avec {item}, vous pourriez cuisiner...",
    "Voici une idée de recette utilisant {item}."
  ],
  shopping_list: [
    "J'ai ajouté {item} à votre liste de courses.",
    "{item} est sur la liste de courses.",
    "Liste mise à jour avec {item}."
  ],
  confirmation: [
    "C'est fait !",
    "Terminé !",
    "Parfait, c'est noté.",
    "D'accord !"
  ],
  error: [
    "Désolé, je n'ai pas compris.",
    "Pouvez-vous répéter ?",
    "Une erreur s'est produite.",
    "Je n'ai pas pu effectuer cette action."
  ],
  greeting: [
    "Bonjour ! Comment puis-je vous aider ?",
    "Bienvenue dans Smart Pantry. Que souhaitez-vous faire ?",
    "Je suis là pour vous aider avec votre garde-manger."
  ],
  general: [
    "{message}"
  ]
};

export class VoiceOutputService {
  private synthesis: SpeechSynthesis | null = null;
  private isSupported: boolean = false;
  private isSpeaking: boolean = false;
  private isPaused: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speechQueue: SpeechQueueItem[] = [];
  private availableVoices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private isEnabled: boolean = true;

  private config: VoiceOutputConfig = {
    lang: 'fr-FR',
    rate: 1.0,
    pitch: 1.0,
    volume: 0.9,
    voiceName: undefined
  };

  constructor(config?: Partial<VoiceOutputConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.initialize();
  }

  private initialize(): void {
    if (typeof window === 'undefined') {
      console.warn('VoiceOutputService: Window not available (SSR)');
      return;
    }

    this.synthesis = window.speechSynthesis;

    if (!this.synthesis) {
      console.warn('VoiceOutputService: Speech Synthesis not supported');
      this.isSupported = false;
      return;
    }

    this.isSupported = true;
    this.loadVoices();

    // Chrome loads voices asynchronously
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  private loadVoices(): void {
    if (!this.synthesis) return;

    this.availableVoices = this.synthesis.getVoices();

    // Prioritize French voices
    const frenchVoices = this.availableVoices.filter(
      voice => voice.lang.startsWith('fr')
    );

    // Preference order: specified voice > local French > any French > default
    if (this.config.voiceName) {
      this.selectedVoice = this.availableVoices.find(
        v => v.name === this.config.voiceName
      ) || null;
    }

    if (!this.selectedVoice && frenchVoices.length > 0) {
      // Prefer local/offline voices
      const localFrench = frenchVoices.find(v => v.localService);
      // Prefer natural-sounding voices (usually contain "Google" or "Microsoft")
      const naturalVoice = frenchVoices.find(
        v => v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Thomas') || v.name.includes('Amélie')
      );

      this.selectedVoice = naturalVoice || localFrench || frenchVoices[0];
    }

    if (!this.selectedVoice && this.availableVoices.length > 0) {
      this.selectedVoice = this.availableVoices[0];
    }

    console.log('VoiceOutputService: Loaded voices', {
      total: this.availableVoices.length,
      french: frenchVoices.length,
      selected: this.selectedVoice?.name
    });
  }

  /**
   * Speak a message with optional context-aware templating
   */
  async speak(
    message: string,
    context: VoiceContext = 'general',
    variables?: Record<string, string>,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<void> {
    if (!this.isSupported || !this.isEnabled) {
      console.warn('VoiceOutputService: TTS disabled or not supported');
      return;
    }

    // Get template-based response if context is not 'general'
    let finalMessage = message;
    if (context !== 'general') {
      finalMessage = this.getContextualResponse(context, variables);
    } else if (variables) {
      // Replace variables in custom message
      finalMessage = this.replaceVariables(message, variables);
    }

    return new Promise((resolve, reject) => {
      const queueItem: SpeechQueueItem = {
        text: finalMessage,
        priority,
        onEnd: () => resolve(),
        onError: (error) => reject(error)
      };

      this.addToQueue(queueItem);
      this.processQueue();
    });
  }

  /**
   * Speak a contextual response (convenience method)
   */
  async speakContextual(
    context: VoiceContext,
    variables?: Record<string, string>
  ): Promise<void> {
    const response = this.getContextualResponse(context, variables);
    return this.speak(response, 'general');
  }

  /**
   * Get a random contextual response
   */
  private getContextualResponse(
    context: VoiceContext,
    variables?: Record<string, string>
  ): string {
    const templates = RESPONSE_TEMPLATES[context];
    const randomIndex = Math.floor(Math.random() * templates.length);
    let response = templates[randomIndex];

    if (variables) {
      response = this.replaceVariables(response, variables);
    }

    return response;
  }

  private replaceVariables(
    template: string,
    variables: Record<string, string>
  ): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return result;
  }

  private addToQueue(item: SpeechQueueItem): void {
    if (item.priority === 'high') {
      // High priority: insert at front after any other high priority items
      const lastHighIndex = this.speechQueue.findIndex(i => i.priority !== 'high');
      if (lastHighIndex === -1) {
        this.speechQueue.push(item);
      } else {
        this.speechQueue.splice(lastHighIndex, 0, item);
      }
    } else if (item.priority === 'low') {
      this.speechQueue.push(item);
    } else {
      // Normal priority: insert before low priority items
      const firstLowIndex = this.speechQueue.findIndex(i => i.priority === 'low');
      if (firstLowIndex === -1) {
        this.speechQueue.push(item);
      } else {
        this.speechQueue.splice(firstLowIndex, 0, item);
      }
    }
  }

  private processQueue(): void {
    if (this.isSpeaking || this.speechQueue.length === 0) {
      return;
    }

    const item = this.speechQueue.shift();
    if (!item) return;

    this.speakImmediate(item);
  }

  private speakImmediate(item: SpeechQueueItem): void {
    if (!this.synthesis || !this.isSupported) return;

    const utterance = new SpeechSynthesisUtterance(item.text);

    // Apply configuration
    utterance.lang = this.config.lang;
    utterance.rate = this.config.rate;
    utterance.pitch = this.config.pitch;
    utterance.volume = this.config.volume;

    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }

    // Event handlers
    utterance.onstart = () => {
      this.isSpeaking = true;
      this.currentUtterance = utterance;
      item.onStart?.();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      item.onEnd?.();
      // Process next item in queue
      this.processQueue();
    };

    utterance.onerror = (event) => {
      console.error('VoiceOutputService: Speech error', event);
      this.isSpeaking = false;
      this.currentUtterance = null;
      item.onError?.(new Error(event.error));
      // Continue with next item
      this.processQueue();
    };

    this.synthesis.speak(utterance);
  }

  /**
   * Interrupt current speech and clear queue
   */
  interrupt(): void {
    if (!this.synthesis) return;

    this.synthesis.cancel();
    this.speechQueue = [];
    this.isSpeaking = false;
    this.currentUtterance = null;
  }

  /**
   * Pause current speech
   */
  pause(): void {
    if (!this.synthesis || !this.isSpeaking) return;
    this.synthesis.pause();
    this.isPaused = true;
  }

  /**
   * Resume paused speech
   */
  resume(): void {
    if (!this.synthesis || !this.isPaused) return;
    this.synthesis.resume();
    this.isPaused = false;
  }

  /**
   * Enable/disable voice output
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.interrupt();
    }
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<VoiceOutputConfig>): void {
    this.config = { ...this.config, ...config };

    // Reload voice if voice name changed
    if (config.voiceName) {
      this.selectedVoice = this.availableVoices.find(
        v => v.name === config.voiceName
      ) || this.selectedVoice;
    }
  }

  /**
   * Get available French voices
   */
  getFrenchVoices(): SpeechSynthesisVoice[] {
    return this.availableVoices.filter(v => v.lang.startsWith('fr'));
  }

  /**
   * Get all available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    return this.availableVoices;
  }

  /**
   * Get current status
   */
  getStatus(): {
    isSupported: boolean;
    isEnabled: boolean;
    isSpeaking: boolean;
    isPaused: boolean;
    queueLength: number;
    selectedVoice: string | null;
    config: VoiceOutputConfig;
  } {
    return {
      isSupported: this.isSupported,
      isEnabled: this.isEnabled,
      isSpeaking: this.isSpeaking,
      isPaused: this.isPaused,
      queueLength: this.speechQueue.length,
      selectedVoice: this.selectedVoice?.name || null,
      config: { ...this.config }
    };
  }

  /**
   * Check if TTS is supported
   */
  checkSupport(): boolean {
    return this.isSupported;
  }

  // =========================================
  // Convenience methods for Smart Pantry
  // =========================================

  /**
   * Announce item added to inventory
   */
  announceItemAdded(itemName: string, quantity?: number, unit?: string): Promise<void> {
    const item = quantity && unit
      ? `${quantity} ${unit} de ${itemName}`
      : itemName;
    return this.speakContextual('inventory_add', { item });
  }

  /**
   * Announce item removed from inventory
   */
  announceItemRemoved(itemName: string): Promise<void> {
    return this.speakContextual('inventory_remove', { item: itemName });
  }

  /**
   * Announce expiration alert
   */
  announceExpiration(itemName: string, daysUntilExpiry: number): Promise<void> {
    return this.speakContextual('expiration_alert', {
      item: itemName,
      days: daysUntilExpiry.toString()
    });
  }

  /**
   * Announce low stock alert
   */
  announceLowStock(itemName: string): Promise<void> {
    return this.speakContextual('low_stock', { item: itemName });
  }

  /**
   * Announce shopping list addition
   */
  announceShoppingListAdd(itemName: string): Promise<void> {
    return this.speakContextual('shopping_list', { item: itemName });
  }

  /**
   * Announce error
   */
  announceError(customMessage?: string): Promise<void> {
    if (customMessage) {
      return this.speak(customMessage, 'general');
    }
    return this.speakContextual('error');
  }

  /**
   * Announce greeting
   */
  greet(): Promise<void> {
    return this.speakContextual('greeting');
  }

  /**
   * Simple confirmation
   */
  confirm(): Promise<void> {
    return this.speakContextual('confirmation');
  }
}

// Export singleton instance
export const voiceOutputService = new VoiceOutputService();
