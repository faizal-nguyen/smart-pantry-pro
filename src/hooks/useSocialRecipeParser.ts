import { useState } from "react";
import { ParsedRecipe, RecipeParsingResult } from "./useRecipeParser";

// Types pour parsing social media (pattern Cipher)
export interface SocialParsingResult extends RecipeParsingResult {
  platform?: 'instagram' | 'facebook' | 'tiktok' | 'pinterest' | 'youtube';
  author?: string;
  authorProfile?: string;
  likes?: number;
  views?: number;
  embedUrl?: string;
}

// Hook principal pour parsing réseaux sociaux (pattern Cipher)
export const useSocialRecipeParser = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pattern principal adapté de useRecipeParser
  const parseRecipeFromSocial = async (url: string): Promise<SocialParsingResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const domain = new URL(url).hostname.toLowerCase();
      
      // Router vers parser spécialisé (pattern Cipher)
      switch (true) {
        case domain.includes('instagram.com'):
          return await parseInstagramRecipe(url);
        case domain.includes('facebook.com') || domain.includes('fb.com'):
          return await parseFacebookRecipe(url);
        case domain.includes('tiktok.com'):
          return await parseTikTokRecipe(url);
        case domain.includes('pinterest.com'):
          return await parsePinterestRecipe(url);
        case domain.includes('youtube.com') || domain.includes('youtu.be'):
          return await parseYouTubeRecipe(url);
        default:
          throw new Error('Plateforme sociale non supportée');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        confidence: 0,
        parsingMethod: 'fallback'
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    parseRecipeFromSocial,
    loading,
    error
  };
};

// Parser Instagram (pattern Cipher spécialisé)
const parseInstagramRecipe = async (url: string): Promise<SocialParsingResult> => {
  try {
    console.log('📸 Parsing Instagram recipe:', url);
    
    // Extract post ID from URL (support both /p/ and /reel/ formats)
    const postIdMatch = url.match(/\/(p|reel)\/([A-Za-z0-9_-]+)/);
    if (!postIdMatch) {
      throw new Error('Invalid Instagram URL');
    }
    
    const postId = postIdMatch[2];
    
    // Call our API endpoint
    const response = await fetch('/api/parse-social', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        url, 
        platform: 'instagram',
        postId 
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      data: result.recipe,
      confidence: result.confidence || 0.7,
      parsingMethod: 'social',
      platform: 'instagram',
      author: result.author,
      authorProfile: result.authorProfile,
      likes: result.likes,
      embedUrl: `https://www.instagram.com/p/${postId}/embed`
    };
    
  } catch (error) {
    console.error('Error parsing Instagram recipe:', error);
    
    // Fallback vers parsing IA
    return await parseWithSocialAI(url, 'instagram');
  }
};

// Parser Facebook (pattern Cipher spécialisé)
const parseFacebookRecipe = async (url: string): Promise<SocialParsingResult> => {
  try {
    console.log('📘 Parsing Facebook recipe:', url);
    
    const response = await fetch('/api/parse-social', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        url, 
        platform: 'facebook' 
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      data: result.recipe,
      confidence: result.confidence || 0.7,
      parsingMethod: 'social',
      platform: 'facebook',
      author: result.author,
      authorProfile: result.authorProfile,
      likes: result.likes,
      views: result.views
    };
    
  } catch (error) {
    console.error('Error parsing Facebook recipe:', error);
    return await parseWithSocialAI(url, 'facebook');
  }
};

// Parser TikTok (pattern Cipher spécialisé)
const parseTikTokRecipe = async (url: string): Promise<SocialParsingResult> => {
  try {
    console.log('🎵 Parsing TikTok recipe:', url);
    
    // Extract video ID from URL
    const videoIdMatch = url.match(/\/video\/(\d+)/);
    if (!videoIdMatch) {
      throw new Error('Invalid TikTok URL');
    }
    
    const videoId = videoIdMatch[1];
    
    const response = await fetch('/api/parse-social', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        url, 
        platform: 'tiktok',
        videoId 
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      data: result.recipe,
      confidence: result.confidence || 0.6,
      parsingMethod: 'social',
      platform: 'tiktok',
      author: result.author,
      authorProfile: result.authorProfile,
      likes: result.likes,
      views: result.views,
      embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`
    };
    
  } catch (error) {
    console.error('Error parsing TikTok recipe:', error);
    return await parseWithSocialAI(url, 'tiktok');
  }
};

// Parser Pinterest (pattern Cipher spécialisé)
const parsePinterestRecipe = async (url: string): Promise<SocialParsingResult> => {
  try {
    console.log('📌 Parsing Pinterest recipe:', url);
    
    const response = await fetch('/api/parse-social', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        url, 
        platform: 'pinterest' 
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Pinterest often links to external recipe sites
    if (result.externalUrl && !result.recipe) {
      // Try to parse the external URL
      const { parseRecipeFromURL } = await import('./useRecipeParser');
      const externalResult = await parseRecipeFromURL(result.externalUrl);
      
      return {
        ...externalResult,
        platform: 'pinterest',
        author: result.author
      };
    }
    
    return {
      success: true,
      data: result.recipe,
      confidence: result.confidence || 0.7,
      parsingMethod: 'social',
      platform: 'pinterest',
      author: result.author,
      likes: result.likes
    };
    
  } catch (error) {
    console.error('Error parsing Pinterest recipe:', error);
    return await parseWithSocialAI(url, 'pinterest');
  }
};

// Parser YouTube (pattern Cipher spécialisé)
const parseYouTubeRecipe = async (url: string): Promise<SocialParsingResult> => {
  try {
    console.log('📺 Parsing YouTube recipe:', url);
    
    // Extract video ID
    const videoIdMatch = url.match(/(?:v=|\/embed\/|youtu\.be\/)([^&\n?#]+)/);
    if (!videoIdMatch) {
      throw new Error('Invalid YouTube URL');
    }
    
    const videoId = videoIdMatch[1];
    
    const response = await fetch('/api/parse-social', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        url, 
        platform: 'youtube',
        videoId 
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      data: result.recipe,
      confidence: result.confidence || 0.7,
      parsingMethod: 'social',
      platform: 'youtube',
      author: result.author,
      authorProfile: result.authorProfile,
      likes: result.likes,
      views: result.views,
      embedUrl: `https://www.youtube.com/embed/${videoId}`
    };
    
  } catch (error) {
    console.error('Error parsing YouTube recipe:', error);
    return await parseWithSocialAI(url, 'youtube');
  }
};

// Parser avec IA pour réseaux sociaux (pattern Cipher AI)
const parseWithSocialAI = async (
  url: string, 
  platform: string
): Promise<SocialParsingResult> => {
  try {
    console.log('🤖 Parsing social media with AI:', url);
    
    const response = await fetch('/api/parse-social-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, platform })
    });
    
    if (!response.ok) {
      throw new Error('AI parsing failed');
    }
    
    const result = await response.json();
    
    return {
      success: true,
      data: result.recipe,
      confidence: result.confidence || 0.5,
      parsingMethod: 'ai',
      platform: platform as any,
      author: result.author,
      likes: result.likes,
      views: result.views
    };
    
  } catch (error) {
    console.error('Social AI parsing failed:', error);
    
    return {
      success: false,
      error: 'Parsing réseaux sociaux impossible',
      confidence: 0,
      parsingMethod: 'fallback'
    };
  }
};

// Helpers pour extraction de métadonnées sociales
export const extractInstagramMetadata = (html: string): any => {
  try {
    // Instagram stocke les données dans window._sharedData
    const sharedDataMatch = html.match(/window\._sharedData = ({.+?});/);
    if (sharedDataMatch) {
      const sharedData = JSON.parse(sharedDataMatch[1]);
      const media = sharedData?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
      
      if (media) {
        return {
          author: media.owner?.username,
          authorProfile: `https://instagram.com/${media.owner?.username}`,
          likes: media.edge_media_preview_like?.count,
          caption: media.edge_media_to_caption?.edges?.[0]?.node?.text,
          imageUrl: media.display_url
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting Instagram metadata:', error);
    return null;
  }
};

export const extractTikTokMetadata = (html: string): any => {
  try {
    // TikTok stocke les données dans __UNIVERSAL_DATA_FOR_REHYDRATION__
    const dataMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>({.+?})<\/script>/);
    if (dataMatch) {
      const data = JSON.parse(dataMatch[1]);
      const video = data?.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct;
      
      if (video) {
        return {
          author: video.author?.uniqueId,
          authorProfile: `https://tiktok.com/@${video.author?.uniqueId}`,
          likes: video.stats?.diggCount,
          views: video.stats?.playCount,
          description: video.desc,
          videoUrl: video.video?.downloadAddr
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting TikTok metadata:', error);
    return null;
  }
};