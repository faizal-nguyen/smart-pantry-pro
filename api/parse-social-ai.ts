import { VercelRequest, VercelResponse } from '@vercel/node';

// AI fallback pour parsing social media (pattern Cipher)
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
    const { url, platform } = req.body;

    if (!url || !platform) {
      return res.status(400).json({ error: 'URL and platform are required' });
    }

    console.log(`🤖 AI parsing ${platform} recipe from: ${url}`);

    // Fetch the page content
    const pageContent = await fetchPageContent(url);
    
    if (!pageContent) {
      throw new Error('Failed to fetch page content');
    }

    // Extract recipe using AI (OpenAI API)
    const recipe = await extractRecipeWithAI(pageContent, platform);
    
    // Extract metadata
    const metadata = extractSocialMetadata(pageContent, platform);
    
    return res.status(200).json({
      recipe,
      ...metadata,
      confidence: recipe ? 0.6 : 0.2
    });

  } catch (error) {
    console.error('Social AI parsing error:', error);
    
    res.status(500).json({ 
      error: 'Failed to parse social media recipe with AI',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Fetch page content with proper headers
async function fetchPageContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.text();
  } catch (error) {
    console.error('Error fetching page content:', error);
    return null;
  }
}

// Extract recipe using OpenAI API
async function extractRecipeWithAI(content: string, platform: string): Promise<any> {
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not found in environment variables');
      console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('OPENAI') || k.includes('API')));
      console.warn('Falling back to basic extraction');
      return extractRecipeBasic(content);
    }

    // Debug: Log API key presence
    console.log('✅ OPENAI_API_KEY found for social parsing');

    // Prepare prompt for OpenAI
    const prompt = `
    Extract recipe information from this ${platform} post content.
    Look for:
    - Recipe name
    - List of ingredients with quantities
    - Cooking instructions
    - Prep time, cook time, servings
    - Any special notes or tips
    
    Content:
    ${content.substring(0, 3000)} // Limit content length
    
    Return the recipe in this JSON format:
    {
      "name": "recipe name",
      "ingredients": ["ingredient 1", "ingredient 2"],
      "instructions": "step by step instructions",
      "prep_time": number in minutes,
      "cook_time": number in minutes,
      "servings": number,
      "source_type": "${platform}"
    }
    `;

    console.log('🔄 Calling OpenAI API for social media parsing...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that extracts recipe information from social media posts. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('❌ OpenAI API error:', response.status);
      console.error('Error response:', errorBody);
      return extractRecipeBasic(content);
    }

    const data = await response.json();
    const recipeText = data.choices[0]?.message?.content;
    
    if (!recipeText) {
      return extractRecipeBasic(content);
    }

    try {
      const recipe = JSON.parse(recipeText);
      return recipe;
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return extractRecipeBasic(content);
    }

  } catch (error) {
    console.error('❌ OpenAI extraction error:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    return extractRecipeBasic(content);
  }
}

// Basic recipe extraction without AI
function extractRecipeBasic(content: string): any {
  // Remove HTML tags
  const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Look for recipe indicators
  if (!text.match(/recette|recipe|ingrédients|ingredients|cuisine|cooking/i)) {
    return null;
  }

  // Try to extract recipe name
  let name = 'Recette';
  const namePatterns = [
    /recette\s+(?:de\s+)?([^.!?\n]{3,50})/i,
    /recipe\s+(?:for\s+)?([^.!?\n]{3,50})/i,
    /([A-Z][^.!?\n]{5,50})(?:\s*[-–—])/,
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      name = match[1].trim();
      break;
    }
  }

  // Extract ingredients
  const ingredients: string[] = [];
  
  // Look for ingredient patterns
  const ingredientSection = text.match(/(?:ingrédients|ingredients)[:\s]*(.*?)(?:instructions|préparation|method|étapes|$)/is);
  if (ingredientSection) {
    const ingText = ingredientSection[1];
    
    // Split by common separators
    const potentialIngredients = ingText.split(/[•\-,\n]/);
    
    for (const ing of potentialIngredients) {
      const cleaned = ing.trim();
      if (cleaned.length > 2 && cleaned.length < 100) {
        // Check if it looks like an ingredient (contains quantity or food words)
        if (cleaned.match(/\d+|une?|deux|trois|quelques|tasse|cuillère|gramme|ml|kg/i)) {
          ingredients.push(cleaned);
        }
      }
    }
  }

  // Extract instructions
  let instructions = '';
  const instructionPatterns = [
    /(?:instructions|préparation|method|étapes)[:\s]*(.*?)$/is,
    /(?:1\.|étape 1)[:\s]*(.*?)$/is
  ];
  
  for (const pattern of instructionPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      instructions = match[1].trim().substring(0, 500);
      break;
    }
  }

  // Extract times
  let prep_time = 15;
  let cook_time = 30;
  
  const prepMatch = text.match(/(?:prep|préparation)[:\s]*(\d+)\s*(?:min|minutes?)/i);
  if (prepMatch) {
    prep_time = parseInt(prepMatch[1]);
  }
  
  const cookMatch = text.match(/(?:cuisson|cook)[:\s]*(\d+)\s*(?:min|minutes?|h|heures?)/i);
  if (cookMatch) {
    cook_time = parseInt(cookMatch[1]);
    // Convert hours to minutes
    if (text.match(/(?:h|heures?)/i)) {
      cook_time *= 60;
    }
  }

  // Extract servings
  let servings = 4;
  const servingsMatch = text.match(/(?:pour|serves?|portions?)[:\s]*(\d+)\s*(?:personnes?|pers|servings?)?/i);
  if (servingsMatch) {
    servings = parseInt(servingsMatch[1]);
  }

  return {
    name,
    ingredients: ingredients.length > 0 ? ingredients : ['Voir la publication pour les ingrédients'],
    instructions: instructions || 'Voir la publication pour les instructions',
    prep_time,
    cook_time,
    servings,
    source_type: 'social'
  };
}

// Extract social media metadata
function extractSocialMetadata(html: string, platform: string): any {
  const metadata: any = {};

  try {
    // Extract author
    const authorPatterns = [
      /<meta property="og:title" content="([^"]+)"/,
      /<meta name="twitter:title" content="([^"]+)"/,
      /<meta property="article:author" content="([^"]+)"/
    ];
    
    for (const pattern of authorPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        // Extract author name from title
        const authorMatch = match[1].match(/^(.+?)(?:\s+on\s+|\s+sur\s+|:|\s+-\s+)/);
        if (authorMatch) {
          metadata.author = authorMatch[1].trim();
          break;
        }
      }
    }

    // Extract image
    const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    if (imageMatch) {
      metadata.imageUrl = imageMatch[1];
    }

    // Platform specific extractions
    switch (platform) {
      case 'instagram':
        // Instagram specific
        const igDataMatch = html.match(/window\._sharedData = ({.+?});/);
        if (igDataMatch) {
          try {
            const igData = JSON.parse(igDataMatch[1]);
            const media = igData?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
            if (media) {
              metadata.likes = media.edge_media_preview_like?.count;
              metadata.author = media.owner?.username;
              metadata.authorProfile = `https://instagram.com/${media.owner?.username}`;
            }
          } catch (e) {
            console.error('Failed to parse Instagram data:', e);
          }
        }
        break;

      case 'tiktok':
        // TikTok specific
        const tikTokDataMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>({.+?})<\/script>/);
        if (tikTokDataMatch) {
          try {
            const tikTokData = JSON.parse(tikTokDataMatch[1]);
            const video = tikTokData?.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct;
            if (video) {
              metadata.author = video.author?.uniqueId;
              metadata.authorProfile = `https://tiktok.com/@${video.author?.uniqueId}`;
              metadata.likes = video.stats?.diggCount;
              metadata.views = video.stats?.playCount;
            }
          } catch (e) {
            console.error('Failed to parse TikTok data:', e);
          }
        }
        break;

      case 'pinterest':
        // Pinterest specific
        const pinDataMatch = html.match(/<script[^>]*>window\.__INITIAL_STATE__=({.+?})<\/script>/);
        if (pinDataMatch) {
          try {
            const pinData = JSON.parse(pinDataMatch[1]);
            // Pinterest data structure varies, basic extraction
            metadata.author = 'Pinterest User';
          } catch (e) {
            console.error('Failed to parse Pinterest data:', e);
          }
        }
        break;
    }

  } catch (error) {
    console.error('Metadata extraction error:', error);
  }

  return metadata;
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