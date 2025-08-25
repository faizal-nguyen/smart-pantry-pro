import { AudioExtractor } from './audioExtractor';
import { FrameExtractorBasic } from './frameExtractorBasic';
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
    subRecipes?: Array<{
      name: string;
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
    }>;
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
  private frameExtractor: FrameExtractorBasic;
  private openai: OpenAI;
  private readonly MAX_PROCESSING_TIME = 45000; // 45 seconds

  constructor() {
    console.log('🎆 [FastVideoParser] Initializing...');
    
    this.audioExtractor = new AudioExtractor();
    this.frameExtractor = new FrameExtractorBasic();
    
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    console.log('🔑 [FastVideoParser] OpenAI API Key:', apiKey ? 'Present' : 'Missing');
    
    if (!apiKey) {
      throw new Error('OpenAI API key is required. Please set VITE_OPENAI_API_KEY in your environment.');
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
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
    console.log('📸 [FastVideoParser] Extracting Instagram metadata with thumbnail using Instaloader...');
    
    try {
      // Utiliser notre API qui utilise Instaloader pour extraire les métadonnées
      const metadataUrl = '/api/social/instagram-thumbnail';
      
      // Déterminer si on est côté serveur ou client
      const isServer = typeof window === 'undefined';
      const baseUrl = isServer ? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000') : '';
      
      const response = await fetch(`${baseUrl}${metadataUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: videoUrl })
      });
      
      if (!response.ok) {
        throw new Error(`Instagram thumbnail API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ [FastVideoParser] Instagram metadata received via Instaloader:', data);
      
      if (data.thumbnail_url) {
        return {
          title: data.title || 'Instagram Recipe',
          description: data.description || 'Recipe from Instagram',
          duration: '30', // Instagram ne fournit pas la durée via l'API publique
          thumbnail_url: data.thumbnail_url,
          author_name: data.author_name,
          author_url: data.author_url,
          width: data.metadata?.width,
          height: data.metadata?.height,
          media_type: data.metadata?.is_video ? 'video' : 'image',
          video_url: data.video_url
        };
      } else {
        console.warn('⚠️ [FastVideoParser] No thumbnail found, using fallback');
        return {
          title: data.title || 'Instagram Recipe',
          description: data.description || 'Recipe from Instagram',
          duration: '30',
          error: data.error
        };
      }
    } catch (error) {
      console.warn('⚠️ [FastVideoParser] Instagram metadata extraction failed, using fallback:', error);
      return {
        title: 'Instagram Recipe',
        description: 'Recipe from Instagram',
        duration: '30'
      };
    }
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

    console.log('🤖 [FastVideoParser] Metadata before GPT-4:', metadata);

    // Préparer le prompt optimisé pour GPT-4 Turbo
    const prompt = this.buildOptimizedPrompt(metadata, transcription, frames, platform);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert recipe extraction AI that extracts and translates recipes to French. Extract structured recipe data from the provided video content and translate EVERYTHING to French. Focus on accuracy and completeness. ALL OUTPUT MUST BE IN FRENCH.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 4000, // Increased for complex multi-recipe formats
    });

    const recipeData = JSON.parse(response.choices[0].message.content || '{}');
    
    // IMPORTANT: Passer les métadonnées originales qui contiennent la vignette
    return this.validateAndStructureRecipe(recipeData, metadata, transcription);
  }

  private buildOptimizedPrompt(
    metadata: any, 
    transcription: any, 
    frames: any, 
    platform: string
  ): string {
    return `
Extract a recipe from this video content and translate EVERYTHING to French. Return valid JSON only.

IMPORTANT INSTRUCTIONS:
- If the video contains MULTIPLE recipes (like a thali or full meal), extract ALL recipes and ingredients
- Create a comprehensive "Menu complet" that includes EVERY dish mentioned
- List ALL ingredients with exact quantities for each component
- Include ALL preparation steps in detail
- For complex menus, organize by sub-recipes but include everything
- DO NOT SIMPLIFY - include all details from the transcription

METADATA:
- Title: ${metadata?.title || 'Unknown'}
- Description: ${metadata?.description || 'No description'}
- Duration: ${metadata?.duration || '0'} seconds
- Platform: ${platform}

TRANSCRIPTION:
${transcription?.text || 'No transcription available'}

FRAMES ANALYSIS:
${frames?.description || 'No frame analysis available'}

TRANSLATION EXAMPLES:
- sardines → sardines
- turmeric → curcuma
- red chili powder → poudre de piment rouge
- coriander → coriandre
- curry leaves → feuilles de curry
- gingelly oil/sesame oil → huile de sésame
- shallots → échalotes
- tamarind → tamarin
- coconut milk → lait de coco
- fry → frire
- marinate → mariner
- toor dal → lentilles cassées
- sambar → sambar (curry de lentilles aux légumes)
- rasam → rasam (soupe épicée)
- thali → thali (plateau repas indien)
- payasam → payasam (dessert au lait sucré)
- coconut → noix de coco
- mustard seeds → graines de moutarde
- rice → riz

For SINGLE RECIPE videos, return JSON with this structure IN FRENCH:
{
  "title": "Nom de la recette en français",
  "description": "Brève description en français",
  "ingredients": [
    {
      "name": "nom de l'ingrédient en français",
      "amount": "quantité",
      "unit": "unité de mesure en français"
    }
  ],
  "instructions": [
    {
      "step": 1,
      "description": "description de l'étape en français",
      "duration": "temps si mentionné"
    }
  ],
  "nutritionalInfo": {
    "servings": number,
    "cookingTime": "temps total",
    "difficulty": "facile/moyen/difficile",
    "calories": number
  },
  "confidence": 0.95
}

For MULTIPLE RECIPES (like thali, full meals), return JSON with this structure IN FRENCH:
{
  "title": "Thali Végétarien du Sud de l'Inde - Menu Complet",
  "description": "Description du menu complet avec tous les plats",
  "isMultiRecipe": true,
  "subRecipes": [
    {
      "name": "Sambar",
      "description": "Curry de lentilles aux légumes",
      "ingredients": [{"name": "...", "amount": "...", "unit": "..."}],
      "instructions": [{"step": 1, "description": "...", "duration": "..."}]
    },
    {
      "name": "Rasam",
      "description": "Soupe épicée à la tomate",
      "ingredients": [{"name": "...", "amount": "...", "unit": "..."}],
      "instructions": [{"step": 1, "description": "...", "duration": "..."}]
    }
  ],
  "ingredients": [
    "Liste globale de TOUS les ingrédients avec quantités totales"
  ],
  "instructions": [
    {
      "step": 1,
      "description": "Vue d'ensemble de la préparation",
      "subSteps": "Référence aux sous-recettes"
    }
  ],
  "nutritionalInfo": {
    "servings": number,
    "cookingTime": "temps total pour tout préparer",
    "difficulty": "facile/moyen/difficile"
  },
  "confidence": 0.95
}

IMPORTANT: Include ALL dishes, ALL ingredients, ALL steps. DO NOT SUMMARIZE.
`;
  }

  private validateAndStructureRecipe(
    recipeData: any, 
    metadata: any, 
    transcription: any
  ): VideoRecipe {
    // Handle multi-recipe format (like thali)
    if (recipeData.isMultiRecipe && recipeData.subRecipes) {
      console.log('🍽️ [FastVideoParser] Processing multi-recipe format with', recipeData.subRecipes.length, 'sub-recipes');
      
      // Flatten all ingredients from sub-recipes
      const allIngredients: any[] = [];
      const allInstructions: any[] = [];
      
      // Add overview instruction
      allInstructions.push({
        step: 1,
        description: `Ce menu complet comprend ${recipeData.subRecipes.length} plats différents. Préparez chaque plat selon les instructions détaillées ci-dessous.`
      });
      
      // Process each sub-recipe
      recipeData.subRecipes.forEach((subRecipe: any, index: number) => {
        // Add sub-recipe header instruction
        allInstructions.push({
          step: allInstructions.length + 1,
          description: `\n--- ${subRecipe.name} ---\n${subRecipe.description}`
        });
        
        // Add ingredients with sub-recipe prefix
        if (subRecipe.ingredients) {
          subRecipe.ingredients.forEach((ing: any) => {
            allIngredients.push({
              name: `${ing.name} (pour ${subRecipe.name})`,
              amount: ing.amount,
              unit: ing.unit
            });
          });
        }
        
        // Add instructions with sub-recipe context
        if (subRecipe.instructions) {
          subRecipe.instructions.forEach((inst: any) => {
            allInstructions.push({
              step: allInstructions.length + 1,
              description: `[${subRecipe.name}] ${inst.description}`,
              duration: inst.duration
            });
          });
        }
      });
      
      // Create the unified recipe
      const recipe: VideoRecipe = {
        title: recipeData.title || 'Menu Complet',
        description: recipeData.description || `Menu complet avec ${recipeData.subRecipes.length} plats`,
        ingredients: allIngredients,
        instructions: allInstructions,
        metadata: {
          duration: metadata?.duration || '0',
          platform: metadata?.platform || 'unknown',
          processingTime: 0, // Will be set in finalizeRecipe
          confidence: recipeData.confidence || 0.9,
          extractionMethod: transcription?.text ? 'audio_transcription' : 'metadata_fallback',
          subRecipes: recipeData.subRecipes // Store sub-recipes for reference
        },
        nutritionalInfo: recipeData.nutritionalInfo || {}
      };
      
      return this.addMetadataDetails(recipe, metadata);
    }
    
    // Handle single recipe format
    const recipe: VideoRecipe = {
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
    
    return this.addMetadataDetails(recipe, metadata);
  }
  
  private addMetadataDetails(recipe: VideoRecipe, metadata: any): VideoRecipe {
    // Ajouter la thumbnail si disponible (Instagram)
    if (metadata?.thumbnail_url) {
      console.log('📸 [FastVideoParser] Adding thumbnail to recipe:', metadata.thumbnail_url);
      recipe.metadata.thumbnail = {
        url: metadata.thumbnail_url,
        width: metadata.width,
        height: metadata.height
      };
    } else {
      console.log('⚠️ [FastVideoParser] No thumbnail_url in metadata');
    }

    // Ajouter l'auteur si disponible
    if (metadata?.author_name) {
      recipe.metadata.author = {
        name: metadata.author_name,
        url: metadata.author_url
      };
    }

    return recipe;
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