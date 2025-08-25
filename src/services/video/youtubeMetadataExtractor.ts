export interface YouTubeVideoMetadata {
  videoId: string;
  title: string;
  description: string;
  duration: number; // en secondes
  thumbnail: {
    url: string;
    width: number;
    height: number;
  };
  publishedAt: string;
  channelTitle: string;
  viewCount?: number;
  likeCount?: number;
  language?: string; // Langue détectée ou spécifiée
}

export class YouTubeMetadataExtractor {
  private apiKey: string;
  private readonly API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

  constructor() {
    this.apiKey = import.meta.env.VITE_YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ YouTube API key not found. Some features may be limited.');
    } else {
      console.log('✅ [YouTubeMetadataExtractor] YouTube API key loaded');
    }
  }

  async extractMetadata(videoUrl: string): Promise<YouTubeVideoMetadata> {
    console.log('🎬 [YouTubeMetadataExtractor] Extracting metadata for:', videoUrl);
    
    const videoId = this.extractVideoId(videoUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    try {
      if (this.apiKey) {
        return await this.extractViaAPI(videoId);
      } else {
        return await this.extractViaOembed(videoId);
      }
    } catch (error) {
      console.error('❌ [YouTubeMetadataExtractor] Error:', error);
      // Fallback basique
      return this.getFallbackMetadata(videoId);
    }
  }

  private async extractViaAPI(videoId: string): Promise<YouTubeVideoMetadata> {
    const url = `${this.API_BASE_URL}/videos?id=${videoId}&key=${this.apiKey}&part=snippet,statistics,contentDetails`;
    
    console.log('🔗 [YouTubeMetadataExtractor] API URL:', url);
    console.log('🔑 [YouTubeMetadataExtractor] API Key length:', this.apiKey.length);
    
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ [YouTubeMetadataExtractor] API Error:', response.status, errorData);
      throw new Error(`YouTube API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found');
    }

    const video = data.items[0];
    const snippet = video.snippet;
    const statistics = video.statistics;
    const contentDetails = video.contentDetails;

    // Convertir la durée ISO 8601 en secondes
    const duration = this.parseDuration(contentDetails.duration);

    // Obtenir la meilleure qualité de thumbnail
    const thumbnail = this.getBestThumbnail(snippet.thumbnails);

    // Détecter la langue depuis le titre/description
    const detectedLanguage = this.detectLanguage(snippet.title + ' ' + snippet.description);

    return {
      videoId,
      title: snippet.title,
      description: snippet.description,
      duration,
      thumbnail,
      publishedAt: snippet.publishedAt,
      channelTitle: snippet.channelTitle,
      viewCount: parseInt(statistics.viewCount) || 0,
      likeCount: parseInt(statistics.likeCount) || 0,
      language: detectedLanguage
    };
  }

  private async extractViaOembed(videoId: string): Promise<YouTubeVideoMetadata> {
    // Méthode alternative sans API key
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`YouTube oEmbed error: ${response.status}`);
    }

    const data = await response.json();

    return {
      videoId,
      title: data.title,
      description: '', // Non disponible via oEmbed
      duration: 0, // Non disponible via oEmbed
      thumbnail: {
        url: data.thumbnail_url,
        width: data.thumbnail_width,
        height: data.thumbnail_height
      },
      publishedAt: '',
      channelTitle: data.author_name,
      language: this.detectLanguage(data.title)
    };
  }

  private extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
      /^([^"&?\/\s]{11})$/ // Just the ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  private parseDuration(duration: string): number {
    // Convertir ISO 8601 duration (PT15M33S) en secondes
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;

    return hours * 3600 + minutes * 60 + seconds;
  }

  private getBestThumbnail(thumbnails: any): { url: string; width: number; height: number } {
    // Priorité : maxres > standard > high > medium > default
    const priority = ['maxres', 'standard', 'high', 'medium', 'default'];
    
    for (const quality of priority) {
      if (thumbnails[quality]) {
        return {
          url: thumbnails[quality].url,
          width: thumbnails[quality].width,
          height: thumbnails[quality].height
        };
      }
    }

    // Fallback
    return {
      url: `https://img.youtube.com/vi/${thumbnails.default?.url || ''}/maxresdefault.jpg`,
      width: 1280,
      height: 720
    };
  }

  private detectLanguage(text: string): string {
    // Détection basique de la langue basée sur des mots-clés
    const patterns = {
      ta: /[\u0B80-\u0BFF]/g, // Tamil Unicode range
      hi: /[\u0900-\u097F]/g, // Hindi/Devanagari Unicode range
      fr: /\b(recette|ingrédients|cuisson|préparation|étape|mélanger|ajouter|faire)\b/gi,
      en: /\b(recipe|ingredients|cooking|preparation|step|mix|add|make)\b/gi
    };

    const counts = {
      ta: (text.match(patterns.ta) || []).length,
      hi: (text.match(patterns.hi) || []).length,
      fr: (text.match(patterns.fr) || []).length,
      en: (text.match(patterns.en) || []).length
    };

    // Retourner la langue avec le plus de correspondances
    let maxCount = 0;
    let detectedLang = 'en'; // Par défaut anglais

    for (const [lang, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        detectedLang = lang;
      }
    }

    console.log('🌐 [YouTubeMetadataExtractor] Language detection:', counts, '→', detectedLang);
    return detectedLang;
  }

  private getFallbackMetadata(videoId: string): YouTubeVideoMetadata {
    return {
      videoId,
      title: 'YouTube Recipe Video',
      description: '',
      duration: 0,
      thumbnail: {
        url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        width: 1280,
        height: 720
      },
      publishedAt: new Date().toISOString(),
      channelTitle: 'Unknown Channel'
    };
  }

  // Méthode utilitaire pour obtenir directement l'URL du thumbnail
  getThumbnailUrl(videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'maxres'): string {
    const qualities = {
      default: 'default',
      medium: 'mqdefault',
      high: 'hqdefault',
      maxres: 'maxresdefault'
    };
    
    return `https://img.youtube.com/vi/${videoId}/${qualities[quality]}.jpg`;
  }
}