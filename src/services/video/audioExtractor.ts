import { createClient, DeepgramResponse } from '@deepgram/sdk';

export interface TranscriptionResult {
  text: string;
  confidence: number;
  duration: number;
  language: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
    confidence: number;
  }>;
}

export interface AudioExtractionOptions {
  language?: string;
  model?: 'nova-2' | 'nova' | 'enhanced';
  smart_format?: boolean;
  punctuate?: boolean;
  diarize?: boolean;
}

export class AudioExtractor {
  private deepgram: any;
  private readonly MAX_DURATION = 600; // 10 minutes max

  constructor() {
    if (process.env.DEEPGRAM_API_KEY) {
      this.deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    } else {
      console.warn('Deepgram API key not found. Audio extraction will use fallback.');
    }
  }

  async extractAndTranscribe(
    videoUrl: string,
    options: AudioExtractionOptions = {}
  ): Promise<TranscriptionResult> {
    const startTime = Date.now();

    try {
      if (!this.deepgram) {
        return this.fallbackTranscription();
      }

      // Configuration optimisée pour la vitesse (3-5 secondes)
      const config = {
        model: options.model || 'nova-2', // Modèle le plus rapide
        language: options.language || 'auto', // Détection automatique
        smart_format: options.smart_format !== false,
        punctuate: options.punctuate !== false,
        diarize: options.diarize || false,
        // Optimisations pour la vitesse
        interim_results: false,
        endpointing: 300, // 300ms de silence pour terminer
        vad_events: true,
        // Paramètres pour les recettes
        keywords: [
          'recipe:10', 'ingredients:10', 'cooking:10', 'bake:8', 'fry:8', 
          'boil:8', 'minutes:8', 'cups:8', 'tablespoons:8', 'teaspoons:8',
          'oven:8', 'temperature:8', 'degrees:8', 'celsius:8', 'fahrenheit:8'
        ]
      };

      // Extraction audio directe depuis l'URL (sans télécharger)
      const response = await this.transcribeFromUrl(videoUrl, config);
      
      const processingTime = Date.now() - startTime;
      console.log(`Audio transcription completed in ${processingTime}ms`);

      return this.processTranscriptionResponse(response, processingTime);

    } catch (error: any) {
      console.error('Audio extraction failed:', error);
      
      // Fallback si Deepgram échoue
      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        console.log('Using fallback transcription due to API limits');
        return this.fallbackTranscription();
      }
      
      throw new Error(`Audio transcription failed: ${error.message}`);
    }
  }

  private async transcribeFromUrl(videoUrl: string, config: any): Promise<DeepgramResponse> {
    console.log('🌊 [AudioExtractor] transcribeFromUrl called');
    console.log('🔗 [AudioExtractor] URL:', videoUrl);
    
    try {
      console.log('📡 [AudioExtractor] Calling Deepgram API...');
      const startApiCall = Date.now();
      // Deepgram peut traiter directement des URLs vidéo
      const { result } = await this.deepgram.listen.prerecorded.transcribeUrl(
        { url: videoUrl },
        config
      );

      const apiTime = Date.now() - startApiCall;
      console.log(`🎯 [AudioExtractor] Deepgram API call took ${apiTime}ms`);
      console.log('📊 [AudioExtractor] Deepgram results received');
      
      return result;
    } catch (error: any) {
      console.error('⚠️ [AudioExtractor] Direct URL transcription failed:', error.message);
      console.error('💥 [AudioExtractor] Error details:', {
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Fallback: extraction d'audio puis transcription
      console.log('🔄 [AudioExtractor] Trying audio extraction fallback...');
      return await this.extractAudioThenTranscribe(videoUrl, config);
    }
  }

  private async extractAudioThenTranscribe(videoUrl: string, config: any): Promise<DeepgramResponse> {
    console.log('🎧 [AudioExtractor] extractAudioThenTranscribe called');
    
    // Utilise ffmpeg ou service d'extraction audio rapide
    const audioBuffer = await this.extractAudioBuffer(videoUrl);
    
    console.log('📤 [AudioExtractor] Transcribing audio buffer...');
    const { result } = await this.deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      config
    );

    console.log('✅ [AudioExtractor] Buffer transcription complete');
    return result;
  }

  private async extractAudioBuffer(videoUrl: string): Promise<Buffer> {
    // Simulation d'extraction audio
    // Dans un vrai cas, utiliser ffmpeg avec des paramètres optimisés pour la vitesse :
    // ffmpeg -i videoUrl -vn -acodec libmp3lame -ab 128k -ar 16000 -ac 1 -f mp3 -t 600 output.mp3
    
    // Pour cette implémentation, nous simulons
    return Buffer.from('audio-data-placeholder');
  }

  private processTranscriptionResponse(
    response: DeepgramResponse, 
    processingTime: number
  ): TranscriptionResult {
    const results = response.results;
    
    if (!results || !results.channels || results.channels.length === 0) {
      throw new Error('No transcription results received');
    }

    const channel = results.channels[0];
    const alternatives = channel.alternatives;
    
    if (!alternatives || alternatives.length === 0) {
      throw new Error('No transcription alternatives found');
    }

    const primary = alternatives[0];
    
    // Extraction des segments avec timing
    const segments = primary.words?.map((word: any) => ({
      start: word.start,
      end: word.end,
      text: word.punctuated_word || word.word,
      confidence: word.confidence
    })) || [];

    return {
      text: primary.transcript || '',
      confidence: primary.confidence || 0.0,
      duration: results.metadata?.duration || 0,
      language: results.metadata?.detected_language || 'unknown',
      segments: this.groupSegmentsByTime(segments)
    };
  }

  private groupSegmentsByTime(words: any[], maxSegmentDuration: number = 30): Array<any> {
    if (!words.length) return [];

    const segments: Array<any> = [];
    let currentSegment = {
      start: words[0].start,
      end: words[0].end,
      text: words[0].text,
      confidence: words[0].confidence,
      wordCount: 1
    };

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const segmentDuration = word.end - currentSegment.start;

      if (segmentDuration <= maxSegmentDuration) {
        // Continuer le segment actuel
        currentSegment.end = word.end;
        currentSegment.text += ' ' + word.text;
        currentSegment.confidence = (currentSegment.confidence + word.confidence) / 2;
        currentSegment.wordCount++;
      } else {
        // Finaliser le segment actuel et commencer un nouveau
        segments.push({
          start: currentSegment.start,
          end: currentSegment.end,
          text: currentSegment.text.trim(),
          confidence: currentSegment.confidence
        });

        currentSegment = {
          start: word.start,
          end: word.end,
          text: word.text,
          confidence: word.confidence,
          wordCount: 1
        };
      }
    }

    // Ajouter le dernier segment
    segments.push({
      start: currentSegment.start,
      end: currentSegment.end,
      text: currentSegment.text.trim(),
      confidence: currentSegment.confidence
    });

    return segments;
  }

  private fallbackTranscription(): TranscriptionResult {
    // Fallback quand Deepgram n'est pas disponible
    return {
      text: 'Recipe transcription not available. Using video metadata and visual analysis.',
      confidence: 0.3,
      duration: 0,
      language: 'unknown',
      segments: []
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.deepgram) return false;
      
      // Test rapide avec un court audio
      const testUrl = 'https://static.deepgram.com/examples/Bueller-Life-moves-pretty-fast.wav';
      await this.transcribeFromUrl(testUrl, { model: 'nova-2', language: 'en' });
      
      return true;
    } catch (error) {
      console.error('Deepgram connection test failed:', error);
      return false;
    }
  }

  // Utilitaire pour optimiser la qualité selon le type de vidéo
  getOptimizedConfig(platform: string): AudioExtractionOptions {
    const baseConfig = {
      smart_format: true,
      punctuate: true,
      diarize: false
    };

    switch (platform) {
      case 'tiktok':
        return {
          ...baseConfig,
          model: 'nova-2', // Le plus rapide pour de courtes vidéos
          language: 'auto'
        };
      
      case 'youtube':
        return {
          ...baseConfig,
          model: 'enhanced', // Meilleure qualité pour le contenu long
          language: 'auto',
          diarize: true // Peut y avoir plusieurs locuteurs
        };
      
      case 'instagram':
        return {
          ...baseConfig,
          model: 'nova-2',
          language: 'auto'
        };
      
      default:
        return {
          ...baseConfig,
          model: 'nova',
          language: 'auto'
        };
    }
  }
}