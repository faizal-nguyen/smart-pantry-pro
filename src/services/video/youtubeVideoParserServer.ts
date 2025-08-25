import { VideoRecipe, ProgressCallback } from './fastVideoParser';

export interface YouTubeParsingOptionsServer {
  language?: 'auto' | 'en' | 'fr' | 'hi' | 'ta';
  onProgress?: ProgressCallback;
  useServerExtraction?: boolean;
}

export class YouTubeVideoParserServer {
  private apiEndpoint: string;

  constructor() {
    // Utiliser l'API route Next.js pour éviter les problèmes CORS
    this.apiEndpoint = '/api/youtube-extract';
  }

  async parseYouTubeRecipe(
    videoUrl: string,
    options: YouTubeParsingOptionsServer = {}
  ): Promise<VideoRecipe> {
    console.log('🎬 [YouTubeVideoParserServer] Starting server-side extraction');
    console.log('🔗 [YouTubeVideoParserServer] URL:', videoUrl);
    console.log('🌐 [YouTubeVideoParserServer] Language:', options.language || 'auto');

    const { onProgress, language = 'auto' } = options;

    try {
      // Progress: Starting
      onProgress?.(10);

      // Call server API
      console.log('📡 [YouTubeVideoParserServer] Calling server API...');
      console.log('🔗 [YouTubeVideoParserServer] Endpoint:', this.apiEndpoint);
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('⏰ [YouTubeVideoParserServer] Request timed out after 2 minutes');
        controller.abort();
      }, 120000); // 2 minutes timeout
      
      try {
        console.log('🚀 [YouTubeVideoParserServer] Sending request...');
        const response = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoUrl,
            language
          }),
          signal: controller.signal
        });
        
        console.log('📨 [YouTubeVideoParserServer] Response received, status:', response.status);
        clearTimeout(timeoutId);

        onProgress?.(50);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Server API error: ${error.error || 'Unknown error'}`);
        }

        onProgress?.(80);

        console.log('📊 [YouTubeVideoParserServer] Parsing JSON response...');
        const data = await response.json();
        console.log('📋 [YouTubeVideoParserServer] Recipe data:', {
          success: data.success,
          hasRecipe: !!data.recipe,
          ingredientCount: data.recipe?.ingredients?.length || 0,
          instructionCount: data.recipe?.instructions?.length || 0
        });
        
        onProgress?.(100);

        if (!data.success || !data.recipe) {
          throw new Error('Invalid response from server API');
        }

        console.log('✅ [YouTubeVideoParserServer] Recipe extracted successfully');
        return data.recipe;

      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out - server is taking too long to process the video');
        }
        
        throw fetchError;
      }

    } catch (error: any) {
      console.error('❌ [YouTubeVideoParserServer] Error:', error);
      throw new Error(`YouTube recipe extraction failed: ${error.message}`);
    }
  }

  // Check if server extraction is available
  async isServerAvailable(): Promise<boolean> {
    try {
      const response = await fetch(this.apiEndpoint.replace('/youtube-extract', '/health'));
      return response.ok;
    } catch {
      return false;
    }
  }

  // Get supported languages
  getSupportedLanguages(): Array<{ code: string; name: string; api: string }> {
    return [
      { code: 'en', name: 'English', api: 'server' },
      { code: 'fr', name: 'Français', api: 'server' },
      { code: 'hi', name: 'हिन्दी', api: 'server' },
      { code: 'ta', name: 'தமிழ்', api: 'server' },
      { code: 'auto', name: 'Auto-detect', api: 'server' }
    ];
  }

  // Check if URL is YouTube
  isYouTubeUrl(url: string): boolean {
    const patterns = [
      /youtube\.com\/watch/,
      /youtu\.be\//,
      /youtube\.com\/embed/,
      /youtube\.com\/v\//
    ];
    
    return patterns.some(pattern => pattern.test(url));
  }
}