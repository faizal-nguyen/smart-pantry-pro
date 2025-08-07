/**
 * Secure Instagram oEmbed Proxy
 * Handles Facebook/Instagram oEmbed API requests server-side to avoid exposing tokens
 */

export interface InstagramOEmbedResponse {
  success: boolean;
  data?: {
    title?: string;
    caption?: string;
    author_name?: string;
    thumbnail_url?: string;
    html?: string;
  };
  error?: string;
  requiresManualInput?: boolean;
}

export class SecureInstagramProxy {
  /**
   * Fetch Instagram oEmbed data through secure backend proxy
   */
  static async fetchInstagramOEmbed(url: string): Promise<InstagramOEmbedResponse> {
    try {
      // Check if we have a backend proxy endpoint configured
      const proxyEndpoint = '/api/social/instagram-oembed';
      
      const response = await fetch(proxyEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          data: data.data,
          error: undefined
        };
      } else if (response.status === 404) {
        // Backend proxy not implemented yet
        console.warn('Instagram oEmbed proxy not available. Using fallback mode.');
        return {
          success: false,
          error: 'Backend proxy not configured',
          requiresManualInput: true
        };
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}`,
          requiresManualInput: true
        };
      }
    } catch (error) {
      console.error('Instagram oEmbed proxy error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        requiresManualInput: true
      };
    }
  }

  /**
   * Generate app access token from app ID and secret (server-side only)
   */
  static generateAppAccessToken(appId: string, appSecret: string): string {
    return `${appId}|${appSecret}`;
  }

  /**
   * Validate Instagram URL format
   */
  static isValidInstagramUrl(url: string): boolean {
    const instagramPatterns = [
      /^https?:\/\/(www\.)?instagram\.com\/p\/[A-Za-z0-9_-]+/,
      /^https?:\/\/(www\.)?instagram\.com\/reel\/[A-Za-z0-9_-]+/,
      /^https?:\/\/instagr\.am\/p\/[A-Za-z0-9_-]+/
    ];
    
    return instagramPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Extract post ID from Instagram URL
   */
  static extractPostId(url: string): string | null {
    const patterns = [
      /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
      /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
      /instagr\.am\/p\/([A-Za-z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }
}