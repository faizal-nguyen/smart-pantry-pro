/**
 * French Voice Recognition Service for Smart Pantry Pro
 * Optimized for food-related vocabulary and French language patterns
 */

export interface VoiceRecognitionConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  grammars?: SpeechGrammarList;
}

export interface RecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  alternatives: Array<{
    transcript: string;
    confidence: number;
  }>;
}

export class FrenchVoiceRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private retryCount = 0;
  private maxRetries = 3;

  constructor() {
    this.initializeRecognition();
  }

  private initializeRecognition() {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    
    // Configure for French language
    this.recognition.lang = 'fr-FR';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;

    // Add French food grammar if supported
    if ('SpeechGrammarList' in window) {
      const grammar = this.createFrenchFoodGrammar();
      const speechRecognitionList = new window.SpeechGrammarList();
      speechRecognitionList.addFromString(grammar, 1);
      this.recognition.grammars = speechRecognitionList;
    }
  }

  private createFrenchFoodGrammar(): string {
    // JSGF grammar format for better food recognition
    return `
      #JSGF V1.0;
      grammar frenchfood;
      
      public <command> = <action> <quantity> <unit> [de] <product>;
      
      <action> = ajoute | ajouter | retire | retirer | enlève | enlever | 
                 modifie | modifier | change | changer | met | mettre;
      
      <quantity> = un | une | deux | trois | quatre | cinq | six | sept | 
                   huit | neuf | dix | <number>;
      
      <number> = /\\d+/;
      
      <unit> = gramme | grammes | kilogramme | kilogrammes | kilo | kilos |
               litre | litres | millilitre | millilitres | 
               paquet | paquets | boîte | boîtes | pot | pots |
               tranche | tranches | morceau | morceaux |
               bouteille | bouteilles | sachet | sachets |
               douzaine | douzaines | pièce | pièces;
      
      <product> = ${this.getGrammarProducts()};
    `;
  }

  private getGrammarProducts(): string {
    // Return top 100 most common French food items for grammar
    const commonProducts = [
      'lait', 'pain', 'beurre', 'fromage', 'yaourt', 'oeufs', 'farine',
      'sucre', 'sel', 'poivre', 'huile', 'vinaigre', 'pâtes', 'riz',
      'tomates', 'pommes de terre', 'carottes', 'oignons', 'ail',
      'poulet', 'boeuf', 'porc', 'poisson', 'jambon', 'saucisson',
      'pommes', 'bananes', 'oranges', 'citrons', 'fraises'
    ];
    
    return commonProducts.join(' | ');
  }

  /**
   * Start listening for voice input
   */
  async startListening(
    onResult: (result: RecognitionResult) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    if (!this.recognition) {
      throw new Error('La reconnaissance vocale n\'est pas supportée sur ce navigateur');
    }

    if (this.isListening) {
      console.warn('Already listening');
      return;
    }

    return new Promise((resolve, reject) => {
      this.recognition!.onstart = () => {
        this.isListening = true;
        this.retryCount = 0;
        console.log('Voice recognition started');
        resolve();
      };

      this.recognition!.onresult = (event) => {
        const results = this.processResults(event);
        results.forEach(result => onResult(result));
      };

      this.recognition!.onerror = (event) => {
        console.error('Voice recognition error:', event.error);
        
        // Handle common errors
        switch (event.error) {
          case 'no-speech':
            // Silence timeout - restart if continuous mode
            if (this.recognition?.continuous) {
              this.restartRecognition();
            }
            break;
          
          case 'network':
            // Network error - retry with exponential backoff
            if (this.retryCount < this.maxRetries) {
              setTimeout(() => {
                this.retryCount++;
                this.restartRecognition();
              }, Math.pow(2, this.retryCount) * 1000);
            } else if (onError) {
              onError(new Error('Erreur réseau. Vérifiez votre connexion.'));
            }
            break;
          
          case 'not-allowed':
            if (onError) {
              onError(new Error('Accès au microphone refusé'));
            }
            this.stopListening();
            break;
          
          default:
            if (onError) {
              onError(new Error(`Erreur de reconnaissance: ${event.error}`));
            }
        }
      };

      this.recognition!.onend = () => {
        this.isListening = false;
        console.log('Voice recognition ended');
        
        // Restart if it ended unexpectedly
        if (this.recognition?.continuous && this.isListening) {
          this.restartRecognition();
        }
      };

      try {
        this.recognition!.start();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Process recognition results
   */
  private processResults(event: SpeechRecognitionEvent): RecognitionResult[] {
    const results: RecognitionResult[] = [];
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const alternatives: Array<{ transcript: string; confidence: number }> = [];
      
      // Collect all alternatives
      for (let j = 0; j < result.length; j++) {
        alternatives.push({
          transcript: this.normalizeTranscript(result[j].transcript),
          confidence: result[j].confidence || 0
        });
      }
      
      // Create result object
      results.push({
        transcript: alternatives[0].transcript,
        confidence: alternatives[0].confidence,
        isFinal: result.isFinal,
        alternatives
      });
    }
    
    return results;
  }

  /**
   * Normalize French transcript
   */
  private normalizeTranscript(transcript: string): string {
    return transcript
      .toLowerCase()
      .trim()
      // Normalize French numbers
      .replace(/\bun\b/g, '1')
      .replace(/\bdeux\b/g, '2')
      .replace(/\btrois\b/g, '3')
      .replace(/\bquatre\b/g, '4')
      .replace(/\bcinq\b/g, '5')
      .replace(/\bsix\b/g, '6')
      .replace(/\bsept\b/g, '7')
      .replace(/\bhuit\b/g, '8')
      .replace(/\bneuf\b/g, '9')
      .replace(/\bdix\b/g, '10')
      // Normalize units
      .replace(/\bkilogrammes?\b/g, 'kg')
      .replace(/\bkilos?\b/g, 'kg')
      .replace(/\bgrammes?\b/g, 'g')
      .replace(/\blitres?\b/g, 'L')
      .replace(/\bmillilitres?\b/g, 'ml');
  }

  /**
   * Restart recognition after error
   */
  private restartRecognition(): void {
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
      } catch (error) {
        console.error('Failed to restart recognition:', error);
      }
    }
  }

  /**
   * Check if voice recognition is supported
   */
  static isSupported(): boolean {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  /**
   * Request microphone permission
   */
  static async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }
}

// Export singleton instance
export const voiceRecognition = new FrenchVoiceRecognitionService();