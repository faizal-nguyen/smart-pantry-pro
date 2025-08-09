// Since the TypeScript file can't be imported directly, we'll implement the proxy logic here
async function handleInstagramOEmbedProxy(request, config) {
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

// Facebook App credentials from environment variables
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

export default async function handler(req, res) {
  // Method validation
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate credentials are configured
    if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
      console.error('[Instagram oEmbed] Missing Facebook credentials');
      return res.status(200).json({ 
        success: false,
        error: 'Instagram integration not configured',
        requiresManualInput: true
      });
    }

    console.log(`[Instagram oEmbed] Processing request for URL: ${url}`);

    // Handle the Instagram oEmbed request using the proxy service
    const result = await handleInstagramOEmbedProxy(
      { url },
      {
        facebookAppId: FACEBOOK_APP_ID,
        facebookAppSecret: FACEBOOK_APP_SECRET
      }
    );

    if (!result.success) {
      console.error(`[Instagram oEmbed] Failed: ${result.error}`);
      
      // Return 200 with fallback flag for client-side handling
      return res.status(200).json({
        ...result,
        requiresManualInput: true
      });
    }

    console.log(`[Instagram oEmbed] Success: Retrieved data for ${result.data?.author_name}`);
    
    // Return successful response
    return res.status(200).json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('[Instagram oEmbed] Unexpected error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message 
    });
  }
}