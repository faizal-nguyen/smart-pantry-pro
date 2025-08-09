/**
 * Video Recipe Parser
 * Intelligent parsing for video content from YouTube and social media
 * Based on video frame extraction and audio transcription
 */

import { Recipe, RecipeIngredient } from '@/types/recipe';
import { StreamingAIService } from '@/services/ai/streamingAIService';
import { getVideoProcessorAPI, VideoProcessingResult } from '@/services/api/videoProcessorAPI';

export interface VideoParseResult {
  success: boolean;
  recipe?: Recipe;
  frames?: VideoFrame[];
  transcription?: string;
  error?: string;
  confidence: number;
}

export interface VideoFrame {
  timestamp: string;
  ocrText?: string;
  imageUrl?: string;
}

export interface VideoAnalysisOptions {
  extractFrames?: boolean;
  transcribeAudio?: boolean;
  useOCR?: boolean;
  frameInterval?: number; // seconds between frames
}

export class VideoRecipeParser {
  private aiService: StreamingAIService;

  constructor(apiKey?: string) {
    const key = apiKey || import.meta.env.VITE_OPENAI_API_KEY || '';
    // Don't throw error here, let it fail gracefully later if needed
    this.aiService = new StreamingAIService(key);
  }

  /**
   * Parse recipe from video URL (YouTube, Instagram, TikTok)
   */
  async parseFromVideoUrl(
    url: string,
    options: VideoAnalysisOptions = {}
  ): Promise<VideoParseResult> {
    console.log('VideoRecipeParser: parseFromVideoUrl called with:', url, options);
    try {
      // Validate URL
      const platform = this.detectVideoPlatform(url);
      console.log('VideoRecipeParser: Detected platform:', platform);
      
      if (!platform) {
        return {
          success: false,
          error: 'URL non supportée. Utilisez YouTube, Instagram ou TikTok.',
          confidence: 0
        };
      }

      // Check if backend is available
      const videoAPI = getVideoProcessorAPI();
      
      try {
        // Try to use the backend for full processing
        console.log('VideoRecipeParser: Using backend processor...');
        const { task_id } = await videoAPI.processVideoURL(url);
        
        // Wait for processing with progress callback
        const result = await videoAPI.waitForCompletion(task_id, (status) => {
          console.log('Processing progress:', status.progress, status.current_step);
        });
        
        // Convert backend result to recipe
        const recipe = await this.convertBackendResultToRecipe(result);
        
        return {
          success: true,
          recipe,
          frames: this.extractFramesFromResult(result),
          transcription: result.transcription?.text || '',
          confidence: this.calculateConfidenceFromResult(result)
        };
        
      } catch (backendError) {
        console.warn('Backend processing failed, falling back to basic extraction:', backendError);
        // Fall back to original implementation if backend is not available
        return this.fallbackExtraction(url, platform);
      }

    } catch (error) {
      console.error('Video parsing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors du parsing vidéo',
        confidence: 0
      };
    }
  }

  /**
   * Detect video platform from URL
   */
  private detectVideoPlatform(url: string): string | null {
    const patterns = {
      youtube: /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/,
      instagram: /instagram\.com\/(p|reel|tv)\//,
      tiktok: /tiktok\.com\/@[\w.-]+\/video\/\d+/
    };

    for (const [platform, pattern] of Object.entries(patterns)) {
      if (pattern.test(url)) return platform;
    }

    return null;
  }

  /**
   * Extract video metadata based on platform
   */
  private async extractVideoMetadata(url: string, platform: string): Promise<any> {
    // Extract basic info from URL
    let title = 'Recette Vidéo';
    let author = 'Créateur';
    
    try {
      if (platform === 'youtube') {
        // Extract video ID for title hint
        const videoId = this.extractYouTubeVideoId(url);
        title = `Recette YouTube ${videoId ? `(${videoId})` : ''}`;
        author = 'Chaîne YouTube';
      } else if (platform === 'instagram') {
        title = 'Recette Instagram';
        author = 'Compte Instagram';
      } else if (platform === 'tiktok') {
        title = 'Recette TikTok';
        author = 'Créateur TikTok';
      }
    } catch (error) {
      console.error('Metadata extraction error:', error);
    }
    
    return {
      title,
      description: `Vidéo de recette depuis ${platform}`,
      duration: 180,
      author,
      thumbnail: '',
      url
    };
  }

  /**
   * Get YouTube transcript using YouTube API or scraping
   */
  private async getYouTubeTranscript(url: string): Promise<string> {
    try {
      // Extract video ID
      const videoId = this.extractYouTubeVideoId(url);
      if (!videoId) throw new Error('Invalid YouTube URL');

      // This would use YouTube API or a transcript service
      // For now, we'll return empty string as placeholder
      console.log('Fetching transcript for video:', videoId);
      
      // In real implementation:
      // 1. Try YouTube Data API v3 with captions
      // 2. Fallback to youtube-transcript library
      // 3. Use Whisper AI for audio transcription as last resort
      
      return '';
    } catch (error) {
      console.error('Failed to get YouTube transcript:', error);
      return '';
    }
  }

  /**
   * Convert backend processing result to recipe
   */
  private async convertBackendResultToRecipe(result: VideoProcessingResult): Promise<Recipe> {
    const { metadata, transcription, ocr_results, recipe_data } = result;
    
    // Combine all available text
    let combinedText = '';
    if (metadata.title) combinedText += `Titre: ${metadata.title}\n`;
    if (metadata.description) combinedText += `Description: ${metadata.description}\n\n`;
    if (transcription?.text) combinedText += `Transcription: ${transcription.text}\n\n`;
    if (ocr_results && ocr_results.length > 0) {
      combinedText += 'Texte extrait des images:\n';
      ocr_results.forEach(ocr => {
        combinedText += `[${this.formatTime(ocr.frame_time)}] ${ocr.text}\n`;
      });
    }
    
    // If we have recipe data from backend, use it
    if (recipe_data && recipe_data.ingredients.length > 0) {
      return {
        name: metadata.title || 'Recette vidéo',
        description: metadata.description || '',
        servings: 4,
        prepTime: this.extractTimeFromText(recipe_data.cooking_time) || 15,
        cookTime: this.extractTimeFromText(recipe_data.cooking_time) || 30,
        totalTime: 45,
        difficulty: 'medium',
        ingredients: recipe_data.ingredients.map((ing, idx) => ({
          id: `ing-${idx}`,
          name: ing,
          quantity: 0,
          unit: '',
          notes: ''
        })),
        instructions: recipe_data.instructions.map((inst, idx) => ({
          step: idx + 1,
          text: inst,
          duration: 0
        })),
        cuisine: '',
        course: 'Plat principal',
        tags: ['vidéo', metadata.platform],
        images: metadata.thumbnail_url ? [metadata.thumbnail_url] : [],
        videoUrl: result.download_links.video,
        author: {
          name: metadata.author || 'Créateur vidéo',
          platform: metadata.platform
        }
      };
    }
    
    // Otherwise, use AI to extract recipe from combined text
    return this.extractRecipeWithAI(combinedText, metadata);
  }

  /**
   * Extract frames information from backend result
   */
  private extractFramesFromResult(result: VideoProcessingResult): VideoFrame[] {
    if (!result.ocr_results) return [];
    
    return result.ocr_results.map(ocr => ({
      timestamp: this.formatTime(ocr.frame_time),
      ocrText: ocr.text,
      imageUrl: ocr.frame_path
    }));
  }

  /**
   * Calculate confidence from backend result
   */
  private calculateConfidenceFromResult(result: VideoProcessingResult): number {
    let confidence = 0.5;
    
    if (result.transcription && result.transcription.text.length > 100) confidence += 0.2;
    if (result.ocr_results && result.ocr_results.length > 3) confidence += 0.1;
    if (result.recipe_data && result.recipe_data.ingredients.length > 3) confidence += 0.1;
    if (result.recipe_data && result.recipe_data.instructions.length > 3) confidence += 0.1;
    
    return Math.min(confidence, 1);
  }

  /**
   * Format time from seconds to string
   */
  private formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Extract time in minutes from text
   */
  private extractTimeFromText(text?: string): number | null {
    if (!text) return null;
    
    const patterns = [
      /(\d+)\s*min/i,
      /(\d+)\s*minutes?/i,
      /(\d+)\s*h(?:ours?)?\s*(\d*)\s*m?/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[2]) {
          // Hours and minutes
          return parseInt(match[1]) * 60 + parseInt(match[2] || '0');
        }
        return parseInt(match[1]);
      }
    }
    
    return null;
  }

  /**
   * Extract recipe using AI from combined text
   */
  private async extractRecipeWithAI(combinedText: string, metadata: any): Promise<Recipe> {
    const systemPrompt = `Tu es un expert culinaire spécialisé dans l'extraction de recettes depuis du contenu vidéo.
Extrais une recette structurée à partir du texte fourni.

Format JSON requis:
{
  "name": "Nom de la recette",
  "description": "Description",
  "servings": 4,
  "prepTime": 15,
  "cookTime": 30,
  "totalTime": 45,
  "difficulty": "easy|medium|hard",
  "ingredients": [{"name": "ingrédient", "quantity": 100, "unit": "g"}],
  "instructions": [{"step": 1, "text": "instruction"}],
  "cuisine": "Type",
  "course": "Plat",
  "tags": ["tag1", "tag2"]
}`;

    try {
      const response = await this.aiService.chat(systemPrompt, combinedText);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const recipe = JSON.parse(jsonMatch[0]);
        return this.validateAndCleanRecipe({
          ...recipe,
          videoUrl: metadata.url,
          author: { name: metadata.author || 'Créateur', platform: metadata.platform }
        });
      }
    } catch (error) {
      console.error('AI extraction failed:', error);
    }
    
    // Return fallback if AI fails
    return this.createFallbackRecipe({ ...metadata, combinedText });
  }

  /**
   * Fallback extraction when backend is not available
   */
  private async fallbackExtraction(url: string, platform: string): Promise<VideoParseResult> {
    console.log('VideoRecipeParser: Using fallback extraction for:', platform);
    
    let metadata = await this.extractVideoMetadata(url, platform);
    
    // Try to get real metadata from Instagram oEmbed API if it's Instagram
    if (platform === 'instagram') {
      try {
        console.log('VideoRecipeParser: Trying Instagram oEmbed API...');
        const response = await fetch('/api/social/instagram-oembed', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.author_name) {
            console.log('VideoRecipeParser: Got Instagram metadata:', data.author_name);
            
            // Extract caption from HTML if available
            let description = metadata.description;
            if (data.html) {
              const captionMatch = data.html.match(/<p[^>]*>([^<]+)<\/p>/);
              if (captionMatch) {
                description = captionMatch[1];
                console.log('VideoRecipeParser: Extracted caption:', description.substring(0, 100) + '...');
              }
            }
            
            // Update metadata with real data
            metadata = {
              ...metadata,
              title: this.generateRecipeTitleFromCaption(description) || `Recette de ${data.author_name}`,
              description: description,
              author: data.author_name,
              thumbnail: data.thumbnail_url || '',
              platform: 'Instagram'
            };
          }
        } else {
          console.log('VideoRecipeParser: Instagram oEmbed failed, using basic metadata');
        }
      } catch (error) {
        console.warn('VideoRecipeParser: Instagram oEmbed error:', error);
      }
    }
    
    const recipe = await this.extractRecipeFromVideoData({
      url,
      platform,
      metadata,
      transcription: '',
      frames: [],
      title: metadata.title,
      description: metadata.description
    });
    
    // Calculate confidence based on available data
    let confidence = 0.3; // Base confidence for fallback
    if (metadata.author && metadata.author !== 'Compte Instagram') confidence += 0.1;
    if (metadata.description && metadata.description.length > 50) confidence += 0.2;
    if (this.containsRecipeKeywords(metadata.description)) confidence += 0.2;
    
    return {
      success: true,
      recipe,
      frames: [],
      transcription: '',
      confidence: Math.min(confidence, 0.8) // Cap at 0.8 for fallback
    };
  }

  /**
   * Generate recipe title from Instagram caption
   */
  private generateRecipeTitleFromCaption(caption: string): string | null {
    if (!caption) return null;
    
    // Look for common recipe patterns in French
    const patterns = [
      /recette\s+de\s+([^.!?]+)/i,
      /comment\s+faire\s+([^.!?]+)/i,
      /([^.!?]+)\s+maison/i,
      /([^.!?]+)\s+traditionnel/i,
      /([^.!?]+)\s+facile/i,
    ];
    
    for (const pattern of patterns) {
      const match = caption.match(pattern);
      if (match && match[1]) {
        return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      }
    }
    
    // Fallback: use first sentence or first 50 chars
    const firstSentence = caption.split(/[.!?]/)[0];
    return firstSentence.length > 5 && firstSentence.length < 80 
      ? firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1)
      : null;
  }

  /**
   * Check if text contains recipe-related keywords
   */
  private containsRecipeKeywords(text: string): boolean {
    if (!text) return false;
    
    const keywords = [
      'recette', 'cuisine', 'cuire', 'préparer', 'ingrédient', 'sauce',
      'mayo', 'mayonnaise', 'poulet', 'chicken', 'congolais', 'traditionnel',
      'plat', 'manger', 'délicieux', 'marinade', 'épices', 'cooking'
    ];
    
    const textLower = text.toLowerCase();
    return keywords.some(keyword => textLower.includes(keyword));
  }

  /**
   * Extract YouTube video ID from URL
   */
  private extractYouTubeVideoId(url: string): string | null {
    const patterns = [
      /[?&]v=([^&#]+)/,
      /youtu\.be\/([^&#]+)/,
      /embed\/([^&#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  /**
   * Extract key frames from video for OCR analysis
   */
  private async extractKeyFrames(
    url: string,
    platform: string,
    interval: number
  ): Promise<VideoFrame[]> {
    // This would use video processing libraries
    // For now, return empty array
    return [];
  }

  /**
   * Extract recipe from combined video data
   */
  private async extractRecipeFromVideoData(data: any): Promise<Recipe> {
    // For now, since we don't have real video processing capabilities,
    // we'll create a simplified extraction based on the URL and metadata
    
    // If we have a title and description, try to extract from that
    if (!data.title && !data.description && !data.transcription) {
      // Fallback: extract basic info from URL
      return this.createFallbackRecipe(data);
    }

    const systemPrompt = `Tu es un expert culinaire spécialisé dans l'extraction de recettes depuis des vidéos.
    
Analyse les informations disponibles et crée une recette structurée.
Si des informations manquent, utilise des valeurs par défaut raisonnables.

Format de sortie JSON requis:
{
  "name": "Nom de la recette",
  "description": "Description",
  "servings": 4,
  "prepTime": 15,
  "cookTime": 30,
  "totalTime": 45,
  "difficulty": "medium",
  "ingredients": [
    {
      "name": "ingrédient exemple",
      "quantity": 100,
      "unit": "g"
    }
  ],
  "instructions": [
    {
      "step": 1,
      "text": "Instruction exemple"
    }
  ],
  "cuisine": "Type de cuisine",
  "course": "Plat principal",
  "tags": ["vidéo", "recette"],
  "videoUrl": "${data.url}"
}`;

    const userMessage = `
URL de la vidéo: ${data.url}
Plateforme: ${data.platform}
${data.title ? `Titre: ${data.title}` : ''}
${data.description ? `Description: ${data.description}` : ''}
${data.transcription ? `Transcription: ${data.transcription}` : ''}

Crée une recette basée sur ces informations. Si les informations sont limitées, génère une recette exemple plausible.`;

    try {
      const response = await this.aiService.chat(systemPrompt, userMessage);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const recipe = JSON.parse(jsonMatch[0]);
        return this.validateAndCleanRecipe(recipe);
      }
      
      // If AI fails, return fallback
      return this.createFallbackRecipe(data);
    } catch (error) {
      console.error('AI extraction error:', error);
      // Return fallback recipe instead of throwing
      return this.createFallbackRecipe(data);
    }
  }

  /**
   * Create a fallback recipe when extraction fails
   */
  private createFallbackRecipe(data: any): Recipe {
    const platform = data.platform || 'vidéo';
    
    return {
      name: data.title || `Recette depuis ${platform}`,
      description: data.description || `Recette importée depuis une vidéo ${platform}. Analyse complète non disponible.`,
      servings: 4,
      prepTime: 15,
      cookTime: 30,
      totalTime: 45,
      difficulty: 'medium',
      ingredients: [
        {
          id: 'ing-1',
          name: 'Ingrédients à définir',
          quantity: 0,
          unit: '',
          notes: 'Veuillez regarder la vidéo pour les détails'
        }
      ],
      instructions: [
        {
          step: 1,
          text: 'Regardez la vidéo pour les instructions détaillées',
          duration: 0
        }
      ],
      cuisine: '',
      course: 'À définir',
      tags: ['vidéo', platform, 'import-vidéo'],
      images: [],
      videoUrl: data.url,
      author: {
        name: data.metadata?.author || 'Créateur vidéo',
        platform: platform
      }
    };
  }

  /**
   * Validate and clean extracted recipe
   */
  private validateAndCleanRecipe(recipe: any): Recipe {
    // Ensure required fields
    return {
      name: recipe.name || 'Recette sans nom',
      description: recipe.description || '',
      servings: parseInt(recipe.servings) || 4,
      prepTime: parseInt(recipe.prepTime) || 0,
      cookTime: parseInt(recipe.cookTime) || 0,
      totalTime: parseInt(recipe.totalTime) || parseInt(recipe.prepTime || 0) + parseInt(recipe.cookTime || 0),
      difficulty: recipe.difficulty || 'medium',
      ingredients: this.validateIngredients(recipe.ingredients || []),
      instructions: this.validateInstructions(recipe.instructions || []),
      nutrition: recipe.nutrition || {},
      cuisine: recipe.cuisine || '',
      course: recipe.course || '',
      tags: Array.isArray(recipe.tags) ? recipe.tags : [],
      images: recipe.images || [],
      videoUrl: recipe.videoUrl,
      author: recipe.author || { name: 'Import vidéo' }
    };
  }

  /**
   * Validate ingredients
   */
  private validateIngredients(ingredients: any[]): RecipeIngredient[] {
    return ingredients.map((ing, index) => ({
      id: `ing-${index}`,
      name: ing.name || 'Ingrédient',
      quantity: parseFloat(ing.quantity) || 0,
      unit: ing.unit || '',
      notes: ing.notes || ''
    }));
  }

  /**
   * Validate instructions
   */
  private validateInstructions(instructions: any[]): any[] {
    return instructions.map((inst, index) => ({
      step: inst.step || index + 1,
      text: inst.text || '',
      duration: parseInt(inst.duration) || 0
    }));
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    recipe: Recipe | undefined,
    transcription: string,
    frames: VideoFrame[]
  ): number {
    if (!recipe) return 0;

    let score = 0.5; // Base score

    // Add points for data availability
    if (transcription && transcription.length > 100) score += 0.2;
    if (frames.length > 5) score += 0.1;
    if (recipe.ingredients.length > 3) score += 0.1;
    if (recipe.instructions.length > 3) score += 0.1;

    return Math.min(score, 1);
  }

  /**
   * Extract recipe from direct video file
   */
  async parseFromVideoFile(
    file: File,
    options: VideoAnalysisOptions = {}
  ): Promise<VideoParseResult> {
    try {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        return {
          success: false,
          error: 'Le fichier doit être une vidéo',
          confidence: 0
        };
      }

      // For local files, we would need to:
      // 1. Upload to temporary storage
      // 2. Process with ffmpeg for frame extraction
      // 3. Use Whisper for transcription
      // 4. Apply OCR on frames
      
      return {
        success: false,
        error: 'L\'analyse de fichiers vidéo locaux n\'est pas encore supportée',
        confidence: 0
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors du parsing',
        confidence: 0
      };
    }
  }
}

// Singleton instance
let videoParserInstance: VideoRecipeParser | null = null;

export function getVideoRecipeParser(apiKey?: string): VideoRecipeParser {
  if (!videoParserInstance) {
    videoParserInstance = new VideoRecipeParser(apiKey);
  }
  return videoParserInstance;
}