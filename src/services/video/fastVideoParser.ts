import { AudioExtractor } from './audioExtractor';
import { FrameExtractor } from './frameExtractor';
import OpenAI from 'openai';

export interface VideoRecipe {
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
    extractionMethod: 'audio_transcription' | 'frame_analysis' | 'metadata_fallback';
  };
  nutritionalInfo?: {
    servings?: number;
    cookingTime?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    calories?: number;
  };
}

export interface ProgressCallback {
  (progress: number): void;
}

export interface ParsingOptions {
  onProgress?: ProgressCallback;
  timeout?: number;
  quality?: 'fast' | 'balanced' | 'high';
}

export class FastVideoParser {
  private audioExtractor: AudioExtractor;
  private frameExtractor: FrameExtractor;
  private openai: OpenAI;
  private readonly MAX_PROCESSING_TIME = 45000; // 45 seconds

  constructor() {
    console.log('🎆 [FastVideoParser] Initializing...');
    
    this.audioExtractor = new AudioExtractor();
    this.frameExtractor = new FrameExtractor();
    
    const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    console.log('🔑 [FastVideoParser] OpenAI API Key:', apiKey ? 'Present' : 'Missing');
    
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
    
    console.log('✅ [FastVideoParser] Initialization complete');
  }

  async parseVideoRecipe(
    videoUrl: string, 
    platform: string, 
    options: ParsingOptions = {}
  ): Promise<VideoRecipe> {
    console.log('🎬 [FastVideoParser] Starting parseVideoRecipe');
    console.log('🔗 [FastVideoParser] URL:', videoUrl);
    console.log('📱 [FastVideoParser] Platform:', platform);
    console.log('⚙️ [FastVideoParser] Options:', options);
    
    const startTime = Date.now();
    const { onProgress, timeout = this.MAX_PROCESSING_TIME, quality = 'balanced' } = options;

    try {
      console.log('🚀 [FastVideoParser] Phase 1: Starting extraction...');
      onProgress?.(5);

      // Phase 1: Extraction parallèle (5-20%)
      console.log('🎯 [FastVideoParser] Launching parallel extraction...');
      const extractionPromises = await this.parallelExtraction(videoUrl, platform, onProgress);
      
      console.log('✅ [FastVideoParser] Extraction promises created');
      onProgress?.(20);

      // Phase 2: Traitement parallèle des données (20-80%)
      console.log('📊 [FastVideoParser] Phase 2: Processing results...');
      const processingResults = await Promise.allSettled(extractionPromises);
      
      console.log('📋 [FastVideoParser] Processing results:');
      processingResults.forEach((result, index) => {
        const taskName = ['Metadata', 'Audio', 'Frames'][index];
        console.log(`  ${index + 1}️⃣ ${taskName}:`, result.status === 'fulfilled' ? 'Success' : 'Failed');
        if (result.status === 'rejected') {
          console.error(`     Error: ${result.reason}`);
        }
      });
      
      onProgress?.(80);

      // Phase 3: Synthèse avec GPT-4 (80-95%)
      console.log('🤖 [FastVideoParser] Phase 3: GPT-4 synthesis...');
      const recipe = await this.synthesizeWithGPT4(processingResults, platform, quality);
      
      console.log('✅ [FastVideoParser] GPT-4 synthesis complete');
      console.log('🍳 [FastVideoParser] Recipe title:', recipe?.title || 'Unknown');
      
      onProgress?.(95);

      // Phase 4: Finalisation (95-100%)
      console.log('🎯 [FastVideoParser] Phase 4: Finalizing...');
      const finalRecipe = this.finalizeRecipe(recipe, platform, startTime);
      
      const totalTime = Date.now() - startTime;
      console.log(`⏱️ [FastVideoParser] Total processing time: ${totalTime}ms (${Math.round(totalTime / 1000)}s)`);
      console.log('🎉 [FastVideoParser] Recipe extraction complete!');
      
      onProgress?.(100);

      return finalRecipe;

    } catch (error: any) {
      console.error('❌ [FastVideoParser] Video parsing error:', error);
      console.error('💥 [FastVideoParser] Error stack:', error.stack);
      throw new Error(`Video parsing failed: ${error.message}`);
    }
  }

  private async parallelExtraction(
    videoUrl: string, 
    platform: string, 
    onProgress?: ProgressCallback
  ): Promise<Promise<any>[]> {
    const promises: Promise<any>[] = [];

    // 1. Extraction metadata (très rapide)
    promises.push(this.extractMetadata(videoUrl, platform));
    onProgress?.(8);

    // 2. Extraction audio pour transcription (3-5 sec)
    promises.push(this.audioExtractor.extractAndTranscribe(videoUrl));
    onProgress?.(12);

    // 3. Extraction de 3-5 frames clés (sans téléchargement)
    promises.push(this.frameExtractor.extractKeyFrames(videoUrl, { count: 5 }));
    onProgress?.(16);

    return promises;
  }

  private async extractMetadata(videoUrl: string, platform: string): Promise<any> {
    try {
      // Utilise des APIs rapides pour récupérer les métadonnées
      switch (platform) {
        case 'youtube':
          return await this.extractYouTubeMetadata(videoUrl);
        case 'tiktok':
          return await this.extractTikTokMetadata(videoUrl);
        case 'instagram':
          return await this.extractInstagramMetadata(videoUrl);
        default:
          return await this.extractGenericMetadata(videoUrl);
      }
    } catch (error) {
      console.warn('Metadata extraction failed:', error);
      return { title: '', description: '', duration: '0' };
    }
  }

  private async extractYouTubeMetadata(videoUrl: string): Promise<any> {
    // Utilise l'API YouTube ou extraction rapide
    const videoId = this.extractYouTubeVideoId(videoUrl);
    if (!videoId) throw new Error('Invalid YouTube URL');

    // Simulation - dans un vrai cas, utiliser l'API YouTube
    return {
      title: 'YouTube Recipe Video',
      description: 'Recipe extracted from YouTube video',
      duration: '600' // 10 minutes
    };
  }

  private async extractTikTokMetadata(videoUrl: string): Promise<any> {
    // Extraction rapide des métadonnées TikTok
    return {
      title: 'TikTok Recipe',
      description: 'Quick recipe from TikTok',
      duration: '60' // 1 minute typique
    };
  }

  private async extractInstagramMetadata(videoUrl: string): Promise<any> {
    // Utilise l'API Instagram ou oEmbed
    return {
      title: 'Instagram Recipe',
      description: 'Recipe from Instagram',
      duration: '30'
    };
  }

  private async extractGenericMetadata(videoUrl: string): Promise<any> {
    // Extraction générique
    return {
      title: 'Recipe Video',
      description: 'Recipe extracted from video',
      duration: '300'
    };
  }

  private async synthesizeWithGPT4(
    results: PromiseSettledResult<any>[],
    platform: string,
    quality: string
  ): Promise<VideoRecipe> {
    const metadata = this.getResult(results[0]);
    const transcription = this.getResult(results[1]);
    const frames = this.getResult(results[2]);

    // Préparer le prompt optimisé pour GPT-4 Turbo
    const prompt = this.buildOptimizedPrompt(metadata, transcription, frames, platform);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert recipe extraction AI. Extract structured recipe data from the provided video content. Focus on accuracy and completeness.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 2000,
    });

    const recipeData = JSON.parse(response.choices[0].message.content || '{}');
    return this.validateAndStructureRecipe(recipeData, metadata, transcription);
  }

  private buildOptimizedPrompt(
    metadata: any, 
    transcription: any, 
    frames: any, 
    platform: string
  ): string {
    return `
Extract a recipe from this video content. Return valid JSON only.

METADATA:
- Title: ${metadata?.title || 'Unknown'}
- Description: ${metadata?.description || 'No description'}
- Duration: ${metadata?.duration || '0'} seconds
- Platform: ${platform}

TRANSCRIPTION:
${transcription?.text || 'No transcription available'}

FRAMES ANALYSIS:
${frames?.description || 'No frame analysis available'}

Return JSON with this exact structure:
{
  "title": "Recipe name",
  "description": "Brief description",
  "ingredients": [
    {
      "name": "ingredient name",
      "amount": "quantity",
      "unit": "unit of measure"
    }
  ],
  "instructions": [
    {
      "step": 1,
      "description": "step description",
      "duration": "time if mentioned"
    }
  ],
  "nutritionalInfo": {
    "servings": number,
    "cookingTime": "total time",
    "difficulty": "easy/medium/hard",
    "calories": number
  },
  "confidence": 0.95
}
`;
  }

  private validateAndStructureRecipe(
    recipeData: any, 
    metadata: any, 
    transcription: any
  ): VideoRecipe {
    // Validation et structure des données
    return {
      title: recipeData.title || metadata?.title || 'Untitled Recipe',
      description: recipeData.description || 'Recipe extracted from video',
      ingredients: Array.isArray(recipeData.ingredients) ? recipeData.ingredients : [],
      instructions: Array.isArray(recipeData.instructions) ? recipeData.instructions : [],
      metadata: {
        duration: metadata?.duration || '0',
        platform: metadata?.platform || 'unknown',
        processingTime: 0, // Will be set in finalizeRecipe
        confidence: recipeData.confidence || 0.8,
        extractionMethod: transcription?.text ? 'audio_transcription' : 'metadata_fallback'
      },
      nutritionalInfo: recipeData.nutritionalInfo || {}
    };
  }

  private finalizeRecipe(recipe: VideoRecipe, platform: string, startTime: number): VideoRecipe {
    const processingTime = Date.now() - startTime;
    
    return {
      ...recipe,
      metadata: {
        ...recipe.metadata,
        processingTime,
        platform
      }
    };
  }

  private getResult(result: PromiseSettledResult<any>): any {
    return result.status === 'fulfilled' ? result.value : null;
  }

  private extractYouTubeVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }
}