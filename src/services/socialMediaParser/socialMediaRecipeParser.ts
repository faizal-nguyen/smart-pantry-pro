/**
 * Social Media Recipe Parser
 * Extract recipes from Instagram, TikTok, YouTube, and other social platforms
 */

import { sanitizeInput, isValidUrl } from '@/lib/security';
import { Recipe, RecipeIngredient } from '@/types/recipe';
import { StreamingAIService } from '@/services/ai/streamingAIService';
import { SecureInstagramProxy } from './secureInstagramProxy';

export interface SocialMediaPlatform {
  name: 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'pinterest' | 'twitter';
  patterns: RegExp[];
  requiresAuth?: boolean;
}

export interface ParsedRecipeResult {
  success: boolean;
  recipe?: {
    name: string;
    description?: string;
    ingredients: RecipeIngredient[];
    instructions: string[];
    prepTime?: number;
    cookTime?: number;
    servings?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    tags?: string[];
    imageUrl?: string;
    videoUrl?: string;
    author?: {
      name: string;
      handle?: string;
      platform: string;
    };
  };
  platform?: SocialMediaPlatform['name'];
  error?: string;
  confidence?: number;
}

export class SocialMediaRecipeParser {
  /**
   * Parse recipe from manual text input
   */
  async parseFromText(text: string): Promise<ParsedRecipeResult> {
    try {
      // Extract recipe using AI
      const recipe = await this.aiExtractRecipe(text, { source: 'manual' });
      
      return {
        success: true,
        recipe: {
          ...recipe,
          author: {
            name: 'Import manuel',
            platform: 'manual'
          }
        },
        platform: 'manual' as any,
        confidence: 0.8
      };
    } catch (error: any) {
      console.error('Manual text parsing error:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'extraction'
      };
    }
  }
  private platforms: SocialMediaPlatform[] = [
    {
      name: 'instagram',
      patterns: [
        /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
        /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
        /instagr\.am\/p\/([A-Za-z0-9_-]+)/
      ]
    },
    {
      name: 'tiktok',
      patterns: [
        /tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
        /vm\.tiktok\.com\/([A-Za-z0-9]+)/
      ]
    },
    {
      name: 'youtube',
      patterns: [
        /youtube\.com\/watch\?v=([A-Za-z0-9_-]+)/,
        /youtu\.be\/([A-Za-z0-9_-]+)/,
        /youtube\.com\/shorts\/([A-Za-z0-9_-]+)/
      ]
    },
    {
      name: 'facebook',
      patterns: [
        /facebook\.com\/.*\/videos\/(\d+)/,
        /fb\.watch\/([A-Za-z0-9_-]+)/
      ]
    },
    {
      name: 'pinterest',
      patterns: [
        /pinterest\.com\/pin\/(\d+)/,
        /pin\.it\/([A-Za-z0-9]+)/
      ]
    }
  ];

  /**
   * Parse recipe from social media URL
   */
  async parseFromUrl(url: string): Promise<ParsedRecipeResult> {
    try {
      // Validate URL
      if (!isValidUrl(url)) {
        return {
          success: false,
          error: 'URL invalide'
        };
      }

      // Detect platform
      const platform = this.detectPlatform(url);
      if (!platform) {
        return {
          success: false,
          error: 'Plateforme non supportée'
        };
      }

      // Extract content based on platform
      let content: any;
      switch (platform.name) {
        case 'instagram':
          content = await this.parseInstagram(url);
          break;
        case 'tiktok':
          content = await this.parseTikTok(url);
          break;
        case 'youtube':
          content = await this.parseYouTube(url);
          break;
        case 'pinterest':
          content = await this.parsePinterest(url);
          break;
        default:
          return {
            success: false,
            error: `Parser pour ${platform.name} non implémenté`
          };
      }

      if (!content) {
        return {
          success: false,
          error: 'Impossible d\'extraire le contenu',
          platform: platform.name
        };
      }

      // Extract recipe from content
      const recipe = await this.extractRecipeFromContent(content, platform.name);

      return {
        success: true,
        recipe,
        platform: platform.name,
        confidence: this.calculateConfidence(recipe)
      };

    } catch (error: any) {
      console.error('Social media parsing error:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'extraction'
      };
    }
  }

  /**
   * Detect platform from URL
   */
  private detectPlatform(url: string): SocialMediaPlatform | null {
    for (const platform of this.platforms) {
      for (const pattern of platform.patterns) {
        if (pattern.test(url)) {
          return platform;
        }
      }
    }
    return null;
  }

  /**
   * Parse Instagram content
   */
  private async parseInstagram(url: string): Promise<any> {
    try {
      // Validate Instagram URL first
      if (!SecureInstagramProxy.isValidInstagramUrl(url)) {
        throw new Error('URL Instagram invalide');
      }

      // Try secure backend proxy first (recommended approach)
      const proxyResult = await SecureInstagramProxy.fetchInstagramOEmbed(url);
      
      if (proxyResult.success && proxyResult.data) {
        return {
          caption: proxyResult.data.title || proxyResult.data.caption || '',
          author: {
            username: proxyResult.data.author_name || 'unknown',
            name: proxyResult.data.author_name || 'Unknown'
          },
          mediaUrl: proxyResult.data.thumbnail_url,
          embedHtml: proxyResult.data.html
        };
      }

      // Fallback to client-side approach if proxy is not available
      const facebookToken = import.meta.env.VITE_FACEBOOK_ACCESS_TOKEN;
      
      if (facebookToken && facebookToken.trim() !== '') {
        console.warn('⚠️ Using client-side Facebook token (not recommended for production)');
        
        try {
          const oEmbedUrl = `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${facebookToken}`;
          const response = await fetch(oEmbedUrl);
          
          if (response.ok) {
            const data = await response.json();
            return {
              caption: data.title || data.caption || '',
              author: {
                username: data.author_name || 'unknown',
                name: data.author_name || 'Unknown'
              },
              mediaUrl: data.thumbnail_url,
              embedHtml: data.html
            };
          } else {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.warn(`Instagram oEmbed API error: ${response.status} ${response.statusText}`);
            console.warn('Response:', errorText);
          }
        } catch (oEmbedError) {
          console.warn('Instagram oEmbed network error:', oEmbedError);
        }
      }
      
      // Final fallback: Manual input with clear instructions
      const postId = SecureInstagramProxy.extractPostId(url);
      
      return {
        caption: this.getManualInputMessage(!!facebookToken),
        comments: [],
        mediaUrl: `https://instagram.com/p/${postId}/`,
        author: {
          username: 'instagram_user',
          name: 'Instagram User'
        },
        needsManualInput: true,
        configurationMissing: !facebookToken,
        postId
      };
    } catch (error) {
      console.error('Instagram parsing error:', error);
      return null;
    }
  }

  /**
   * Generate appropriate message for manual input based on configuration
   */
  private getManualInputMessage(hasToken: boolean): string {
    if (!hasToken) {
      return `🔧 Configuration manquante: Instagram oEmbed nécessite un token Facebook.

Instructions pour configurer:
1. Créez une app Facebook sur developers.facebook.com
2. Ajoutez le produit oEmbed et soumettez pour révision
3. Ajoutez VITE_FACEBOOK_ACCESS_TOKEN à .env.local

En attendant, copiez le texte de la publication Instagram ci-dessous :`;
    } else {
      return `⚠️ Erreur d'API: Impossible d'accéder à Instagram automatiquement.
Cela peut être dû à:
- Token Facebook expiré ou invalide
- Permissions oEmbed non approuvées
- Restrictions d'accès Instagram

Copiez le texte de la publication Instagram ci-dessous :`;
    }
  }

  /**
   * Parse TikTok content
   */
  private async parseTikTok(url: string): Promise<any> {
    // TikTok parsing would use their oEmbed API
    // https://developers.tiktok.com/doc/embed-videos

    const videoId = this.extractPostId(url, 'tiktok');
    
    try {
      const oEmbedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
      const response = await fetch(oEmbedUrl);
      
      if (!response.ok) {
        throw new Error('TikTok oEmbed failed');
      }

      const data = await response.json();
      
      return {
        title: data.title,
        description: data.description,
        author: {
          name: data.author_name,
          url: data.author_url
        },
        thumbnailUrl: data.thumbnail_url,
        videoId
      };
    } catch (error) {
      console.error('TikTok parsing error:', error);
      return null;
    }
  }

  /**
   * Parse YouTube content
   */
  private async parseYouTube(url: string): Promise<any> {
    const videoId = this.extractPostId(url, 'youtube');
    
    try {
      // YouTube oEmbed API
      const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const response = await fetch(oEmbedUrl);
      
      if (!response.ok) {
        throw new Error('YouTube oEmbed failed');
      }

      const data = await response.json();
      
      // In production, would also use YouTube Data API for description
      return {
        title: data.title,
        author: {
          name: data.author_name,
          url: data.author_url
        },
        thumbnailUrl: data.thumbnail_url,
        videoId,
        // Description would come from YouTube Data API
        description: ''
      };
    } catch (error) {
      console.error('YouTube parsing error:', error);
      return null;
    }
  }

  /**
   * Parse Pinterest content
   */
  private async parsePinterest(url: string): Promise<any> {
    // Pinterest has limited API access
    // Would need to use their API v5 for full access
    
    const pinId = this.extractPostId(url, 'pinterest');
    
    return {
      pinId,
      // Mock data - in production would use Pinterest API
      title: 'Pinterest Recipe',
      description: 'Recipe from Pinterest',
      imageUrl: `https://pinterest.com/pin/${pinId}/image`
    };
  }

  /**
   * Extract post/video ID from URL
   */
  private extractPostId(url: string, platform: string): string | null {
    const platformConfig = this.platforms.find(p => p.name === platform);
    if (!platformConfig) return null;

    for (const pattern of platformConfig.patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Extract recipe from parsed content using AI
   */
  private async extractRecipeFromContent(
    content: any,
    platform: string
  ): Promise<ParsedRecipeResult['recipe']> {
    // Build text content from various sources
    let textContent = '';
    
    switch (platform) {
      case 'instagram':
        textContent = content.caption || '';
        if (content.comments?.length > 0) {
          textContent += '\n\nCommentaires:\n' + 
            content.comments.slice(0, 10).join('\n');
        }
        break;
        
      case 'tiktok':
      case 'youtube':
        textContent = `${content.title}\n\n${content.description || ''}`;
        break;
        
      case 'pinterest':
        textContent = `${content.title}\n\n${content.description || ''}`;
        break;
    }

    // Use AI to extract recipe structure
    const extractedRecipe = await this.aiExtractRecipe(textContent, content);

    return {
      name: sanitizeInput(extractedRecipe.name || 'Recette sans nom'),
      description: sanitizeInput(extractedRecipe.description || ''),
      ingredients: this.parseIngredients(extractedRecipe.ingredients || []),
      instructions: this.parseInstructions(extractedRecipe.instructions || []),
      prepTime: extractedRecipe.prepTime,
      cookTime: extractedRecipe.cookTime,
      servings: extractedRecipe.servings || 4,
      difficulty: extractedRecipe.difficulty || 'medium',
      tags: this.extractTags(textContent, platform),
      imageUrl: content.thumbnailUrl || content.imageUrl,
      videoUrl: content.videoUrl,
      author: {
        name: content.author?.name || 'Inconnu',
        handle: content.author?.username,
        platform
      }
    };
  }

  /**
   * AI-powered recipe extraction
   */
  private async aiExtractRecipe(text: string, metadata: any): Promise<any> {
    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        console.warn('OpenAI API key not found, using basic extraction');
        return this.basicExtraction(text);
      }

      const aiService = new StreamingAIService(apiKey);
      
      const systemPrompt = `Tu es un expert culinaire qui extrait des recettes à partir de posts sur les réseaux sociaux.
Tu dois TOUJOURS retourner un objet JSON valide, même si tu ne peux pas extraire une recette complète.
NE JAMAIS retourner de texte avant ou après le JSON.
NE JAMAIS dire "Désolé" ou donner des explications.
TOUJOURS commencer directement par { et finir par }

Structure JSON OBLIGATOIRE:
{
  "name": "nom de la recette (ou 'Recette inconnue' si absent)",
  "description": "description courte (ou vide si absent)",
  "ingredients": ["ingrédient 1", "ingrédient 2"] (ou tableau vide si absent),
  "instructions": ["étape 1", "étape 2"] (ou tableau vide si absent),
  "prepTime": 15 (nombre en minutes, 15 par défaut),
  "cookTime": 30 (nombre en minutes, 30 par défaut),
  "servings": 4 (nombre de portions, 4 par défaut),
  "difficulty": "medium" (toujours "easy", "medium" ou "hard")
}`;

      const userMessage = `Extrais la recette de ce texte:\n${text}`;
      
      let result = '';
      await aiService.streamChat(
        systemPrompt,
        userMessage,
        (chunk) => {
          if (chunk.choices?.[0]?.delta?.content) {
            result += chunk.choices[0].delta.content;
          }
        }
      );

      // Clean and parse the JSON response
      try {
        // Remove any text before the first { and after the last }
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.warn('No JSON found in AI response, using basic extraction');
          return this.basicExtraction(text);
        }
        
        const cleanedResult = jsonMatch[0];
        const parsed = JSON.parse(cleanedResult);
        
        // Validate the parsed result has required fields
        if (!parsed.name || typeof parsed.name !== 'string') {
          parsed.name = 'Recette extraite';
        }
        if (!Array.isArray(parsed.ingredients)) {
          parsed.ingredients = [];
        }
        if (!Array.isArray(parsed.instructions)) {
          parsed.instructions = [];
        }
        if (typeof parsed.prepTime !== 'number') {
          parsed.prepTime = 15;
        }
        if (typeof parsed.cookTime !== 'number') {
          parsed.cookTime = 30;
        }
        if (typeof parsed.servings !== 'number') {
          parsed.servings = 4;
        }
        if (!['easy', 'medium', 'hard'].includes(parsed.difficulty)) {
          parsed.difficulty = 'medium';
        }
        
        return parsed;
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        console.log('Raw AI response:', result);
        return this.basicExtraction(text);
      }
      
    } catch (error) {
      console.error('AI extraction failed:', error);
      return this.basicExtraction(text);
    }
  }

  /**
   * Basic extraction fallback when AI is not available
   */
  private basicExtraction(text: string): any {
    // Simple pattern matching for common recipe formats
    const lines = text.split('\n').filter(line => line.trim());
    
    return {
      name: lines[0] || 'Recette sans nom',
      description: lines[1] || '',
      ingredients: lines.filter(line => 
        /^\d+|^-|^•|ingrédient/i.test(line.trim())
      ).slice(0, 10),
      instructions: lines.filter(line => 
        /^étape|^step|faire|cuire|mélanger|ajouter/i.test(line.trim())
      ).slice(0, 10),
      prepTime: 15,
      cookTime: 30,
      servings: 4,
      difficulty: 'medium'
    };
  }

  /**
   * Parse ingredients from text
   */
  private parseIngredients(ingredients: string[]): RecipeIngredient[] {
    return ingredients.map(ing => {
      // Extract quantity and unit using regex
      const match = ing.match(/^(\d+(?:\.\d+)?)\s*(\w+)?\s+(?:de\s+)?(.+)$/);
      
      if (match) {
        return {
          name: sanitizeInput(match[3]),
          quantity: parseFloat(match[1]),
          unit: match[2] || 'unité'
        };
      }

      return {
        name: sanitizeInput(ing),
        quantity: 1,
        unit: 'unité'
      };
    });
  }

  /**
   * Parse instructions from text
   */
  private parseInstructions(instructions: string[]): string[] {
    return instructions.map(instruction => 
      sanitizeInput(instruction.replace(/^\d+\.?\s*/, ''))
    );
  }

  /**
   * Extract tags from content
   */
  private extractTags(text: string, platform: string): string[] {
    const tags: string[] = [platform];
    
    // Extract hashtags
    const hashtags = text.match(/#\w+/g) || [];
    tags.push(...hashtags.map(tag => tag.substring(1).toLowerCase()));

    // Add cuisine type tags
    const cuisineKeywords = {
      italien: ['pasta', 'pizza', 'risotto'],
      français: ['boeuf bourguignon', 'quiche', 'croissant'],
      asiatique: ['sushi', 'ramen', 'curry'],
      mexicain: ['tacos', 'burrito', 'quesadilla']
    };

    for (const [cuisine, keywords] of Object.entries(cuisineKeywords)) {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        tags.push(cuisine);
      }
    }

    // Remove duplicates
    return [...new Set(tags)];
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(recipe: any): number {
    if (!recipe) return 0;

    let score = 0;
    
    // Check completeness
    if (recipe.name) score += 0.2;
    if (recipe.ingredients?.length > 0) score += 0.3;
    if (recipe.instructions?.length > 0) score += 0.3;
    if (recipe.prepTime || recipe.cookTime) score += 0.1;
    if (recipe.servings) score += 0.1;

    return Math.min(score, 1);
  }

  /**
   * Enhanced parsing with video transcription (future feature)
   */
  async parseWithTranscription(
    url: string,
    options: {
      transcribe?: boolean;
      extractFrames?: boolean;
    } = {}
  ): Promise<ParsedRecipeResult> {
    // This would:
    // 1. Download video/audio
    // 2. Use speech-to-text for transcription
    // 3. Extract key frames for visual analysis
    // 4. Combine all data for better recipe extraction

    // For now, use regular parsing
    return this.parseFromUrl(url);
  }
}

// Export singleton instance
export const socialMediaParser = new SocialMediaRecipeParser();