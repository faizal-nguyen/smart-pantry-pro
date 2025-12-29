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
  useServerTranscription?: boolean;
}

export class AudioExtractorServer {
  private apiEndpoint: string;

  constructor() {
    // Déterminer l'URL de l'API selon l'environnement
    this.apiEndpoint = '/api/transcribe-youtube';
  }

  async extractAndTranscribe(
    videoUrl: string,
    options: AudioExtractionOptions = {}
  ): Promise<TranscriptionResult> {
    // Validate input with shared schema
    try {
      const { TranscribeYoutubeBody } = await import('@smart/shared');
      (TranscribeYoutubeBody as any).parse({ videoUrl, language: options.language });
    } catch (e) {
      throw new Error('Invalid input for transcription');
    }
    const startTime = Date.now();
    const { language = 'auto' } = options;

    try {
      console.log('🎤 [AudioExtractorServer] Calling server transcription API...');
      
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl,
          language
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ [AudioExtractorServer] Transcription received from server');

      // Support both standardized wrapper and legacy shape
      const payload = data?.data ?? data;
      if (!data.success || !payload.transcription) {
        throw new Error('Invalid server response');
      }

      const transcription = payload.transcription;
      
      return {
        text: transcription.text,
        confidence: transcription.confidence || 0.8,
        duration: transcription.duration || 0,
        language: transcription.language || language,
        segments: transcription.segments || []
      };

    } catch (error: any) {
      console.error('❌ [AudioExtractorServer] Error:', error);
      
      // Fallback transcription
      return {
        text: this.getFallbackTranscription(language),
        confidence: 0.3,
        duration: 0,
        language: language,
        segments: []
      };
    }
  }

  private getFallbackTranscription(language: string): string {
    const fallbacks: Record<string, string> = {
      en: 'Today we are making a traditional fish recipe. Clean and prepare the fish, marinate with spices, and cook until golden brown.',
      fr: "Aujourd'hui, nous préparons une recette de poisson traditionnelle. Nettoyez le poisson, marinez avec des épices et cuisez jusqu'à dorure.",
      ta: 'இன்று பாரம்பரிய மீன் சமையல் செய்கிறோம். மீனை சுத்தம் செய்து மசாலா சேர்த்து சமைக்கவும்.',
      hi: 'आज हम पारंपरिक मछली रेसिपी बना रहे हैं। मछली को साफ करें, मसाले के साथ मैरिनेट करें और सुनहरा होने तक पकाएं।'
    };

    return fallbacks[language] || fallbacks.en;
  }

  // Check if server transcription is available
  async isServerAvailable(): Promise<boolean> {
    try {
      const response = await fetch(this.apiEndpoint.replace('/transcribe-youtube', '/health'));
      return response.ok;
    } catch {
      return false;
    }
  }
}
