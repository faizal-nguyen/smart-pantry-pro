/**
 * Social Media Recipe Parser
 * Extract recipes from Instagram, TikTok, YouTube, and other social platforms
 */

import { sanitizeInput, isValidUrl } from '@/lib/security';
import { Recipe, RecipeIngredient } from '@/types/recipe';

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
    // Instagram requires special handling due to their anti-scraping measures
    // In production, this would use Instagram's Basic Display API
    
    // For now, we'll use a mock implementation
    // In real implementation, this would:
    // 1. Use Instagram oEmbed API for public posts
    // 2. Extract caption and comments
    // 3. Use AI to parse recipe from caption/comments

    const postId = this.extractPostId(url, 'instagram');
    
    return {
      caption: 'Mock Instagram recipe content',
      comments: [],
      mediaUrl: `https://instagram.com/p/${postId}/media`,
      author: {
        username: 'chef_example',
        name: 'Example Chef'
      }
    };
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
    // This would call OpenAI to extract structured recipe data
    // For now, return mock data
    
    // In production:
    // 1. Send text to OpenAI with specific prompt
    // 2. Extract ingredients, instructions, times, etc.
    // 3. Handle multiple languages
    // 4. Validate extracted data

    return {
      name: 'Recette extraite',
      description: 'Description de la recette',
      ingredients: [
        '2 tomates',
        '1 oignon',
        '200g de pâtes'
      ],
      instructions: [
        'Couper les légumes',
        'Faire cuire les pâtes',
        'Mélanger le tout'
      ],
      prepTime: 15,
      cookTime: 20,
      servings: 4,
      difficulty: 'easy'
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