import { VercelRequest, VercelResponse } from '@vercel/node';

// API endpoint pour parsing recettes réseaux sociaux (pattern Cipher)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, platform, postId, videoId } = req.body;

    if (!url || !platform) {
      return res.status(400).json({ error: 'URL and platform are required' });
    }

    console.log(`🌐 Parsing ${platform} recipe from: ${url}`);

    let result;
    
    switch (platform) {
      case 'instagram':
        result = await parseInstagramPost(url, postId);
        break;
      case 'facebook':
        result = await parseFacebookPost(url);
        break;
      case 'tiktok':
        result = await parseTikTokVideo(url, videoId);
        break;
      case 'pinterest':
        result = await parsePinterestPin(url);
        break;
      case 'youtube':
        result = await parseYouTubeVideo(url, videoId);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    res.status(200).json(result);

  } catch (error) {
    console.error('Social parsing error:', error);
    
    res.status(500).json({ 
      error: 'Failed to parse social media recipe',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Instagram parser
async function parseInstagramPost(url: string, postId?: string) {
  try {
    // Instagram requires authentication for API access
    // For now, we'll use web scraping as fallback
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Instagram post: ${response.status}`);
    }

    const html = await response.text();
    
    // Extract recipe from caption and comments
    const recipe = extractRecipeFromInstagram(html);
    
    // Extract metadata
    const metadata = extractInstagramMetadata(html);
    
    return {
      recipe,
      ...metadata,
      confidence: recipe ? 0.7 : 0.3
    };
    
  } catch (error) {
    console.error('Instagram parsing error:', error);
    throw error;
  }
}

// Facebook parser
async function parseFacebookPost(url: string) {
  try {
    // Facebook requires authentication for most content
    // Using basic web scraping
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FacebookExternalHit/1.1)'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Facebook post: ${response.status}`);
    }

    const html = await response.text();
    
    // Extract recipe from post content
    const recipe = extractRecipeFromFacebook(html);
    
    return {
      recipe,
      confidence: recipe ? 0.7 : 0.3
    };
    
  } catch (error) {
    console.error('Facebook parsing error:', error);
    throw error;
  }
}

// TikTok parser
async function parseTikTokVideo(url: string, videoId?: string) {
  try {
    // TikTok has anti-scraping measures
    // Using their oEmbed endpoint as alternative
    
    if (videoId) {
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
      const response = await fetch(oembedUrl);
      
      if (response.ok) {
        const data = await response.json();
        
        // Extract recipe from title and description
        const recipe = extractRecipeFromTikTokOembed(data);
        
        return {
          recipe,
          author: data.author_name,
          authorProfile: data.author_url,
          confidence: recipe ? 0.6 : 0.3
        };
      }
    }
    
    // Fallback to web scraping
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 TikTok/27.5.21'
      }
    });

    const html = await response.text();
    const recipe = extractRecipeFromTikTok(html);
    
    return {
      recipe,
      confidence: recipe ? 0.6 : 0.3
    };
    
  } catch (error) {
    console.error('TikTok parsing error:', error);
    throw error;
  }
}

// Pinterest parser
async function parsePinterestPin(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Pinterestbot/1.0)'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Pinterest pin: ${response.status}`);
    }

    const html = await response.text();
    
    // Pinterest often contains links to external recipes
    const externalUrl = extractExternalUrlFromPinterest(html);
    
    if (externalUrl) {
      return {
        externalUrl,
        recipe: null,
        confidence: 0.5
      };
    }
    
    // Try to extract recipe from pin description
    const recipe = extractRecipeFromPinterest(html);
    
    return {
      recipe,
      confidence: recipe ? 0.6 : 0.3
    };
    
  } catch (error) {
    console.error('Pinterest parsing error:', error);
    throw error;
  }
}

// YouTube parser
async function parseYouTubeVideo(url: string, videoId?: string) {
  try {
    if (!videoId) {
      throw new Error('YouTube video ID required');
    }
    
    // Use YouTube oEmbed API
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const oembedResponse = await fetch(oembedUrl);
    
    let metadata = {};
    if (oembedResponse.ok) {
      const oembedData = await oembedResponse.json();
      metadata = {
        author: oembedData.author_name,
        authorProfile: oembedData.author_url,
        title: oembedData.title
      };
    }
    
    // For recipe content, we'd need YouTube Data API
    // For now, return basic structure
    const recipe = {
      name: metadata.title || 'Recette YouTube',
      description: 'Voir la vidéo pour les détails',
      source_url: url,
      source_type: 'youtube',
      video_id: videoId
    };
    
    return {
      recipe,
      ...metadata,
      confidence: 0.5
    };
    
  } catch (error) {
    console.error('YouTube parsing error:', error);
    throw error;
  }
}

// Extraction helpers
function extractRecipeFromInstagram(html: string): any {
  try {
    // Look for recipe patterns in Instagram caption
    const captionMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    if (!captionMatch) return null;
    
    const caption = captionMatch[1];
    
    // Look for recipe indicators
    if (!caption.match(/recette|recipe|ingrédients|ingredients/i)) {
      return null;
    }
    
    // Extract basic recipe structure
    const recipe = {
      name: extractRecipeName(caption),
      description: caption.substring(0, 200),
      ingredients: extractIngredientsFromText(caption),
      instructions: extractInstructionsFromText(caption),
      source_type: 'instagram'
    };
    
    return recipe.name ? recipe : null;
    
  } catch (error) {
    console.error('Instagram extraction error:', error);
    return null;
  }
}

function extractRecipeFromFacebook(html: string): any {
  try {
    // Extract post content
    const contentMatch = html.match(/<div[^>]*data-testid="post_message"[^>]*>(.*?)<\/div>/s);
    if (!contentMatch) return null;
    
    const content = contentMatch[1].replace(/<[^>]*>/g, ' ').trim();
    
    // Look for recipe patterns
    if (!content.match(/recette|recipe|ingrédients|ingredients/i)) {
      return null;
    }
    
    return {
      name: extractRecipeName(content),
      description: content.substring(0, 200),
      ingredients: extractIngredientsFromText(content),
      instructions: extractInstructionsFromText(content),
      source_type: 'facebook'
    };
    
  } catch (error) {
    console.error('Facebook extraction error:', error);
    return null;
  }
}

function extractRecipeFromTikTok(html: string): any {
  try {
    // Extract video description
    const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
    if (!descMatch) return null;
    
    const description = descMatch[1];
    
    // TikTok recipes are often in hashtags and description
    const recipe = {
      name: extractRecipeName(description),
      description: description,
      ingredients: extractIngredientsFromHashtags(description),
      source_type: 'tiktok'
    };
    
    return recipe.name ? recipe : null;
    
  } catch (error) {
    console.error('TikTok extraction error:', error);
    return null;
  }
}

function extractRecipeFromTikTokOembed(data: any): any {
  if (!data.title) return null;
  
  return {
    name: extractRecipeName(data.title),
    description: data.title,
    source_type: 'tiktok'
  };
}

function extractRecipeFromPinterest(html: string): any {
  try {
    // Extract pin description
    const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    if (!descMatch) return null;
    
    const description = descMatch[1];
    
    return {
      name: extractRecipeName(description),
      description: description,
      ingredients: extractIngredientsFromText(description),
      source_type: 'pinterest'
    };
    
  } catch (error) {
    console.error('Pinterest extraction error:', error);
    return null;
  }
}

function extractExternalUrlFromPinterest(html: string): string | null {
  try {
    // Look for external link in Pinterest pin
    const linkMatch = html.match(/<a[^>]*class="[^"]*externalLink[^"]*"[^>]*href="([^"]+)"/);
    return linkMatch ? linkMatch[1] : null;
  } catch (error) {
    return null;
  }
}

function extractInstagramMetadata(html: string): any {
  try {
    const authorMatch = html.match(/<meta property="twitter:title" content="([^"]+)"/);
    const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    
    return {
      author: authorMatch ? authorMatch[1].split(' on Instagram')[0] : undefined,
      imageUrl: imageMatch ? imageMatch[1] : undefined
    };
  } catch (error) {
    return {};
  }
}

// Recipe parsing helpers
function extractRecipeName(text: string): string {
  // Try to extract recipe name from text
  const patterns = [
    /(?:recette de |recipe for |recette :|recipe :)\s*([^.\n]+)/i,
    /^([^.\n]{5,50})(?:\s*[:-])/,
    /^#?([A-Z][^.\n]{5,50})/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // Fallback: first line or first 50 chars
  const firstLine = text.split(/[\n.!?]/)[0];
  return firstLine.substring(0, 50).trim();
}

function extractIngredientsFromText(text: string): string[] {
  const ingredients: string[] = [];
  
  // Look for ingredient patterns
  const patterns = [
    /(?:ingrédients|ingredients)[:\s]*(.*?)(?:instructions|préparation|method|$)/is,
    /(?:\d+\s*(?:g|kg|ml|l|c\.à\.s|tasse|cup))\s+(?:de\s+)?([^\n,]+)/gi,
    /-\s*([^\n]+)/g // Bullet points
  ];
  
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 2 && match[1].length < 100) {
        ingredients.push(match[1].trim());
      }
    }
  }
  
  return [...new Set(ingredients)].slice(0, 20);
}

function extractIngredientsFromHashtags(text: string): string[] {
  const ingredients: string[] = [];
  
  // Extract hashtags that might be ingredients
  const hashtags = text.match(/#[^\s#]+/g) || [];
  
  for (const tag of hashtags) {
    const cleaned = tag.substring(1).toLowerCase();
    // Filter out common non-ingredient hashtags
    if (!cleaned.match(/recipe|recette|food|yummy|delicious|tiktok|fyp|foryou/)) {
      ingredients.push(cleaned);
    }
  }
  
  return ingredients.slice(0, 15);
}

function extractInstructionsFromText(text: string): string {
  // Look for instruction patterns
  const patterns = [
    /(?:instructions|préparation|method|directions)[:\s]*(.*)/is,
    /(?:1\.|étape 1|step 1)[:\s]*(.*)/is
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return '';
}

// Configuration
export const config = {
  api: {
    responseLimit: '5mb',
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
  maxDuration: 30,
};