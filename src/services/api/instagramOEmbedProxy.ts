/**
 * Instagram oEmbed API Proxy Example
 * This would be implemented as a backend API endpoint to securely handle Instagram oEmbed requests
 * 
 * Example implementation for Next.js API routes or Express.js
 */

export interface ProxyRequest {
  url: string;
}

export interface ProxyResponse {
  success: boolean;
  data?: {
    title?: string;
    caption?: string;
    author_name?: string;
    thumbnail_url?: string;
    html?: string;
  };
  error?: string;
}

/**
 * Example Next.js API handler: /pages/api/social/instagram-oembed.ts
 * or Express.js route: /api/social/instagram-oembed
 */
export async function handleInstagramOEmbedProxy(
  request: ProxyRequest,
  config: {
    facebookAppId: string;
    facebookAppSecret: string;
  }
): Promise<ProxyResponse> {
  try {
    // Validate request
    if (!request.url) {
      return { 
        success: false, 
        error: 'URL is required' 
      };
    }

    // Validate Instagram URL format
    const instagramPatterns = [
      /^https?:\/\/(www\.)?instagram\.com\/p\/[A-Za-z0-9_-]+/,
      /^https?:\/\/(www\.)?instagram\.com\/reel\/[A-Za-z0-9_-]+/,
    ];
    
    const isValidInstagramUrl = instagramPatterns.some(pattern => 
      pattern.test(request.url)
    );
    
    if (!isValidInstagramUrl) {
      return { 
        success: false, 
        error: 'Invalid Instagram URL format' 
      };
    }

    // Generate app access token (server-side only)
    const accessToken = `${config.facebookAppId}|${config.facebookAppSecret}`;

    // Make request to Facebook Graph API
    const oEmbedUrl = `https://graph.facebook.com/v18.0/instagram_oembed`;
    const params = new URLSearchParams({
      url: request.url,
      access_token: accessToken
    });

    const response = await fetch(`${oEmbedUrl}?${params}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'SmartPantryPro/1.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      
      // Handle specific Facebook API errors
      if (response.status === 403) {
        return {
          success: false,
          error: 'Facebook API access forbidden. Check app permissions and review status.'
        };
      } else if (response.status === 400) {
        return {
          success: false,
          error: 'Invalid request. The Instagram URL may be private or deleted.'
        };
      } else if (response.status === 429) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.'
        };
      }

      return {
        success: false,
        error: `Facebook API error: ${response.status} ${response.statusText}`
      };
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        title: data.title,
        caption: data.caption,
        author_name: data.author_name,
        thumbnail_url: data.thumbnail_url,
        html: data.html
      }
    };

  } catch (error) {
    console.error('Instagram oEmbed proxy error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    };
  }
}

/**
 * Configuration validation
 */
export function validateProxyConfig(config: {
  facebookAppId?: string;
  facebookAppSecret?: string;
}): boolean {
  return !!(config.facebookAppId && config.facebookAppSecret);
}

/**
 * Rate limiting helper (implement based on your backend framework)
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private maxRequests: number = 10,
    private windowMs: number = 60000 // 1 minute
  ) {}

  isAllowed(clientId: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(clientId) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(clientId, validRequests);
    return true;
  }
}