import { useState } from "react";
import { ParsedRecipe, RecipeParsingResult } from "./useRecipeParser";
import { socialMediaParser } from "@/services/socialMediaParser/socialMediaRecipeParser";
import { enhancedSocialMediaParser } from "@/services/socialMediaParser/enhancedSocialMediaParser";

// Types pour parsing social media (pattern Cipher)
export interface SocialParsingResult extends RecipeParsingResult {
  platform?: 'instagram' | 'facebook' | 'tiktok' | 'pinterest' | 'youtube';
  author?: string;
  authorProfile?: string;
  likes?: number;
  views?: number;
  embedUrl?: string;
  // Enhanced V2 properties
  extractionMethod?: 'basic' | 'enhanced-ai' | 'enhanced-manual';
  cached?: boolean;
  costSavings?: {
    standardCost: number;
    enhancedCost: number;
    savings: number;
    savingsPercent: number;
  };
  metadata?: {
    publishedDate?: string;
    engagement?: {
      likes?: number;
      views?: number;
      comments?: number;
    };
    hashtags?: string[];
    mentions?: string[];
  };
}

// Enhanced parsing options
export interface EnhancedParsingOptions {
  enableCache?: boolean;
  cacheTimeout?: number; // minutes
  fallbackToBasic?: boolean;
  enhancedAI?: boolean;
  includeMetadata?: boolean;
  includeEngagement?: boolean;
}

// Hook principal pour parsing réseaux sociaux (pattern Cipher)
export const useSocialRecipeParser = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Enhanced parsing with V2 features
  const parseRecipeFromSocialEnhanced = async (
    url: string, 
    manualText?: string,
    options: EnhancedParsingOptions = {}
  ): Promise<SocialParsingResult> => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the enhanced API endpoint
      const response = await fetch('/api/social-extract-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url || undefined,
          manualText: manualText || undefined,
          options: {
            enableCache: options.enableCache ?? true,
            cacheTimeout: options.cacheTimeout ?? 60,
            fallbackToBasic: options.fallbackToBasic ?? true,
            enhancedAI: options.enhancedAI ?? true,
            includeMetadata: options.includeMetadata ?? true,
            includeEngagement: options.includeEngagement ?? false
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Échec du parsing enhanced');
      }
      
      // Convert to our enhanced format
      const parsedRecipe: ParsedRecipe = {
        title: result.recipe?.name || '',
        description: result.recipe?.description,
        ingredients: result.recipe?.ingredients?.map((ing: any) => 
          typeof ing === 'string' ? ing : 
          `${ing.quantity} ${ing.unit} ${ing.name}`.trim()
        ) || [],
        instructions: result.recipe?.instructions || [],
        prepTime: result.recipe?.prepTime?.toString(),
        cookTime: result.recipe?.cookTime?.toString(),
        servings: result.recipe?.servings,
        difficulty: result.recipe?.difficulty,
        tags: result.recipe?.tags,
        imageUrl: result.recipe?.imageUrl,
        videoUrl: result.recipe?.videoUrl,
        author: result.recipe?.author?.name,
        sourceUrl: url
      };
      
      return {
        success: true,
        data: parsedRecipe,
        confidence: result.confidence || 0.8,
        parsingMethod: result.recipe?.extractionMethod || 'enhanced-ai',
        platform: result.platform,
        author: result.recipe?.author?.name,
        authorProfile: result.recipe?.author?.handle,
        // Enhanced V2 properties
        extractionMethod: result.recipe?.extractionMethod,
        cached: result.api?.cached,
        costSavings: result.api?.costSavings,
        metadata: result.recipe?.sourceMetadata
      };
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue enhanced';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        confidence: 0,
        parsingMethod: 'fallback',
        extractionMethod: 'basic'
      };
    } finally {
      setLoading(false);
    }
  };

  // Legacy basic parsing method (backwards compatibility)
  const parseRecipeFromSocial = async (url: string, manualText?: string): Promise<SocialParsingResult> => {
    setLoading(true);
    setError(null);
    
    try {
      let result;
      
      // Use manual text if provided
      if (manualText && manualText.trim()) {
        result = await socialMediaParser.parseFromText(manualText);
      } else {
        // Use the social media parser service directly
        result = await socialMediaParser.parseFromUrl(url);
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Échec du parsing');
      }
      
      // Convert to our format
      const parsedRecipe: ParsedRecipe = {
        title: result.recipe?.name || '',
        description: result.recipe?.description,
        ingredients: result.recipe?.ingredients?.map(ing => 
          `${ing.quantity} ${ing.unit} ${ing.name}`.trim()
        ) || [],
        instructions: result.recipe?.instructions || [],
        prepTime: result.recipe?.prepTime?.toString(),
        cookTime: result.recipe?.cookTime?.toString(),
        servings: result.recipe?.servings,
        difficulty: result.recipe?.difficulty,
        tags: result.recipe?.tags,
        imageUrl: result.recipe?.imageUrl,
        videoUrl: result.recipe?.videoUrl,
        author: result.recipe?.author?.name,
        sourceUrl: url
      };
      
      return {
        success: true,
        data: parsedRecipe,
        confidence: result.confidence || 0.7,
        parsingMethod: 'social',
        platform: result.platform,
        author: result.recipe?.author?.name,
        authorProfile: result.recipe?.author?.handle,
        extractionMethod: 'basic'
      };
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        confidence: 0,
        parsingMethod: 'fallback',
        extractionMethod: 'basic'
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    // Enhanced V2 method (recommended)
    parseRecipeFromSocialEnhanced,
    // Legacy method (backwards compatibility)
    parseRecipeFromSocial,
    loading,
    error
  };
};