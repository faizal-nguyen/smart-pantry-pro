import { YouTubeMetadataExtractor } from './youtubeMetadataExtractor';

export interface VideoRecipeBasic {
  title: string;
  description: string;
  ingredients: Array<{
    name: string;
    amount: string;
    unit?: string;
  }>;
  instructions: Array<{
    step: number;
    description: string;
    duration?: string;
  }>;
  metadata: {
    duration: string;
    platform: string;
    processingTime: number;
    confidence: number;
    extractionMethod: 'simulation' | 'basic';
    thumbnail?: {
      url: string;
      width?: number;
      height?: number;
    };
    author?: {
      name: string;
      url?: string;
    };
    language?: string;
  };
}

export interface YouTubeParsingOptionsBasic {
  language?: 'auto' | 'en' | 'fr' | 'hi' | 'ta';
  autoDetectLanguage?: boolean;
  onProgress?: (progress: number) => void;
  quality?: 'fast' | 'balanced' | 'high';
}

export class YouTubeVideoParserBasic {
  private metadataExtractor: YouTubeMetadataExtractor;

  constructor() {
    this.metadataExtractor = new YouTubeMetadataExtractor();
  }

  async parseYouTubeRecipe(
    videoUrl: string,
    options: YouTubeParsingOptionsBasic = {}
  ): Promise<VideoRecipeBasic> {
    console.log('🎬 [YouTubeVideoParserBasic] Starting YouTube recipe extraction (browser-compatible)');
    console.log('🔗 [YouTubeVideoParserBasic] URL:', videoUrl);
    console.log('🌐 [YouTubeVideoParserBasic] Language option:', options.language || 'auto');

    const startTime = Date.now();
    const { onProgress, language = 'auto' } = options;

    try {
      // Phase 1: Extraction des métadonnées YouTube (5-30%)
      console.log('📊 [YouTubeVideoParserBasic] Phase 1: Extracting YouTube metadata...');
      onProgress?.(5);
      
      const metadata = await this.metadataExtractor.extractMetadata(videoUrl);
      console.log('✅ [YouTubeVideoParserBasic] Metadata extracted:', {
        title: metadata.title,
        duration: metadata.duration,
        detectedLanguage: metadata.language
      });
      
      onProgress?.(30);

      // Phase 2: Simulation de transcription (30-80%)
      console.log('🎙️ [YouTubeVideoParserBasic] Phase 2: Simulating transcription...');
      onProgress?.(50);
      
      // Simuler le processus de transcription
      await new Promise(resolve => setTimeout(resolve, 1000));
      onProgress?.(80);

      // Phase 3: Génération de recette de test (80-100%)
      console.log('🤖 [YouTubeVideoParserBasic] Phase 3: Generating test recipe...');
      onProgress?.(90);

      const recipe = this.generateTestRecipe(metadata, language, startTime);
      
      onProgress?.(100);

      const totalTime = Date.now() - startTime;
      console.log(`⏱️ [YouTubeVideoParserBasic] Total processing time: ${totalTime}ms`);
      
      return recipe;

    } catch (error: any) {
      console.error('❌ [YouTubeVideoParserBasic] YouTube parsing error:', error);
      throw new Error(`YouTube recipe parsing failed: ${error.message}`);
    }
  }

  private generateTestRecipe(metadata: any, language: string, startTime: number): VideoRecipeBasic {
    // Traiter 'auto' comme 'fr' par défaut
    const effectiveLanguage = language === 'auto' ? 'fr' : language;
    const ingredients = this.getTestIngredientsByLanguage(effectiveLanguage);
    const instructions = this.getTestInstructionsByLanguage(effectiveLanguage);
    
    return {
      title: metadata.title || 'Test Recipe from YouTube',
      description: `This is a test recipe generated for browser compatibility testing. Original video language: ${language}`,
      ingredients,
      instructions,
      metadata: {
        duration: metadata.duration?.toString() || '300',
        platform: 'youtube',
        processingTime: Date.now() - startTime,
        confidence: 0.85,
        extractionMethod: 'simulation',
        thumbnail: {
          url: metadata.thumbnail?.url || 'https://via.placeholder.com/1280x720/ff0000/ffffff?text=YouTube+Test',
          width: metadata.thumbnail?.width || 1280,
          height: metadata.thumbnail?.height || 720
        },
        author: {
          name: metadata.channelTitle || 'Test Channel',
          url: '#'
        },
        language: metadata.language || language
      }
    };
  }

  private getTestIngredientsByLanguage(language: string) {
    const ingredients = {
      fr: [
        { name: 'Poulet', amount: '500', unit: 'g' },
        { name: 'Oignon', amount: '1', unit: 'pièce' },
        { name: 'Ail', amount: '2', unit: 'gousses' },
        { name: 'Huile d\'olive', amount: '2', unit: 'cas' }
      ],
      en: [
        { name: 'Chicken breast', amount: '500', unit: 'g' },
        { name: 'Onion', amount: '1', unit: 'piece' },
        { name: 'Garlic', amount: '2', unit: 'cloves' },
        { name: 'Olive oil', amount: '2', unit: 'tbsp' }
      ],
      hi: [
        { name: 'चिकन', amount: '500', unit: 'ग्राम' },
        { name: 'प्याज', amount: '1', unit: 'टुकड़ा' },
        { name: 'लहसुन', amount: '2', unit: 'कलियाँ' },
        { name: 'तेल', amount: '2', unit: 'चम्मच' }
      ],
      ta: [
        { name: 'கோழி இறைச்சி', amount: '500', unit: 'கிராம்' },
        { name: 'வெங்காயம்', amount: '1', unit: 'எண்ணிக்கை' },
        { name: 'பூண்டு', amount: '2', unit: 'பற்கள்' },
        { name: 'எண்ணெய்', amount: '2', unit: 'மேசை கரண்டி' }
      ]
    };
    
    return ingredients[language as keyof typeof ingredients] || ingredients.en;
  }

  private getTestInstructionsByLanguage(language: string) {
    const instructions = {
      fr: [
        { step: 1, description: 'Couper le poulet en morceaux', duration: '5min' },
        { step: 2, description: 'Faire chauffer l\'huile dans une poêle', duration: '2min' },
        { step: 3, description: 'Faire revenir l\'oignon et l\'ail', duration: '3min' },
        { step: 4, description: 'Ajouter le poulet et cuire', duration: '15min' }
      ],
      en: [
        { step: 1, description: 'Cut chicken into pieces', duration: '5min' },
        { step: 2, description: 'Heat oil in a pan', duration: '2min' },
        { step: 3, description: 'Sauté onion and garlic', duration: '3min' },
        { step: 4, description: 'Add chicken and cook', duration: '15min' }
      ],
      hi: [
        { step: 1, description: 'चिकन को टुकड़ों में काटें', duration: '5min' },
        { step: 2, description: 'पैन में तेल गरम करें', duration: '2min' },
        { step: 3, description: 'प्याज और लहसुन भूनें', duration: '3min' },
        { step: 4, description: 'चिकन डालकर पकाएं', duration: '15min' }
      ],
      ta: [
        { step: 1, description: 'கோழி இறைச்சியை துண்டுகளாக வெட்டவும்', duration: '5min' },
        { step: 2, description: 'வாணலியில் எண்ணெய் சூடாக்கவும்', duration: '2min' },
        { step: 3, description: 'வெங்காயம் மற்றும் பூண்டை வதக்கவும்', duration: '3min' },
        { step: 4, description: 'கோழி இறைச்சி சேர்த்து சமைக்கவும்', duration: '15min' }
      ]
    };
    
    return instructions[language as keyof typeof instructions] || instructions.en;
  }

  // Méthode utilitaire pour vérifier si une URL est YouTube
  isYouTubeUrl(url: string): boolean {
    const patterns = [
      /youtube\.com\/watch/,
      /youtu\.be\//,
      /youtube\.com\/embed/,
      /youtube\.com\/v\//
    ];
    
    return patterns.some(pattern => pattern.test(url));
  }

  // Obtenir les langues supportées
  getSupportedLanguages(): Array<{ code: string; name: string; api: string }> {
    return [
      { code: 'fr', name: 'Français', api: 'simulation' },
      { code: 'en', name: 'English', api: 'simulation' },
      { code: 'hi', name: 'हिन्दी', api: 'simulation' },
      { code: 'ta', name: 'தமிழ்', api: 'simulation' },
      { code: 'auto', name: 'Auto-détection (Français)', api: 'simulation' }
    ];
  }
}