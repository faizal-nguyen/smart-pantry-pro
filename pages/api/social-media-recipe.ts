import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/auth';
import { rateLimiter } from '@/lib/rateLimiter';
import { validateCORS } from '@/lib/cors';
import { API_RATE_LIMITS, SECURITY_ERROR_MESSAGES } from '@/config/security';
import { socialMediaParser } from '@/services/socialMediaParser/socialMediaRecipeParser';
import { getStreamingAIService } from '@/services/ai/streamingAIService';

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CORS validation
  if (!validateCORS(req, res)) {
    return;
  }

  // Method validation
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract and verify token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ 
        error: SECURITY_ERROR_MESSAGES.UNAUTHORIZED 
      });
    }

    // Verify user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ 
        error: SECURITY_ERROR_MESSAGES.UNAUTHORIZED 
      });
    }

    // Rate limiting - use social media specific limits
    const rateLimitKey = `social_${user.id}`;
    const allowed = await rateLimiter.checkLimit(rateLimitKey, API_RATE_LIMITS.SOCIAL_MEDIA);
    
    if (!allowed) {
      const resetTime = await rateLimiter.getResetTime(rateLimitKey);
      res.setHeader('X-RateLimit-Reset', resetTime.toString());
      return res.status(429).json({ 
        error: API_RATE_LIMITS.SOCIAL_MEDIA.message,
        resetTime 
      });
    }

    const { url, enhanceWithAI = true } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL requise' });
    }

    // Parse recipe from social media
    const parseResult = await socialMediaParser.parseFromUrl(url);

    if (!parseResult.success || !parseResult.recipe) {
      return res.status(400).json({ 
        error: parseResult.error || 'Impossible d\'extraire la recette',
        platform: parseResult.platform
      });
    }

    // Enhance with AI if requested
    if (enhanceWithAI && parseResult.recipe) {
      const enhanced = await enhanceRecipeWithAI(parseResult.recipe);
      if (enhanced) {
        parseResult.recipe = enhanced;
      }
    }

    // Save recipe to database
    const savedRecipe = await saveRecipeToDatabase(parseResult.recipe, user.id);

    // Log extraction
    await logExtraction(user.id, parseResult.platform || 'unknown', !!savedRecipe);

    return res.json({
      success: true,
      recipe: savedRecipe || parseResult.recipe,
      platform: parseResult.platform,
      confidence: parseResult.confidence
    });

  } catch (error: any) {
    console.error('Social media recipe error:', error);
    return res.status(500).json({ 
      error: SECURITY_ERROR_MESSAGES.SERVER_ERROR 
    });
  }
}

/**
 * Enhance recipe with AI
 */
async function enhanceRecipeWithAI(recipe: any): Promise<any> {
  try {
    const aiService = getStreamingAIService(process.env.OPENAI_API_KEY!);
    
    const prompt = `Améliore cette recette extraite des réseaux sociaux.
Complète les informations manquantes et corrige les erreurs.

Recette originale:
${JSON.stringify(recipe, null, 2)}

Retourne la recette améliorée au format JSON avec:
- name: nom amélioré
- description: description complète
- ingredients: [{name, quantity, unit}] avec quantités précises
- instructions: étapes détaillées
- prepTime: temps de préparation en minutes
- cookTime: temps de cuisson en minutes
- servings: nombre de portions
- difficulty: easy|medium|hard
- nutritionEstimate: {calories, proteins, carbs, fats} par portion
- tips: conseils de préparation`;

    const enhanced = await aiService.chat(
      'Tu es un chef expert qui améliore les recettes.',
      prompt
    );

    try {
      const parsed = JSON.parse(enhanced);
      return {
        ...recipe,
        ...parsed,
        enhanced: true
      };
    } catch {
      return recipe;
    }
  } catch (error) {
    console.error('AI enhancement error:', error);
    return recipe;
  }
}

/**
 * Save recipe to database
 */
async function saveRecipeToDatabase(recipe: any, userId: string): Promise<any> {
  try {
    const { data, error } = await supabaseAdmin
      .from('recipes')
      .insert({
        user_id: userId,
        name: recipe.name,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        prep_time: recipe.prepTime,
        cook_time: recipe.cookTime,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        tags: recipe.tags,
        image_url: recipe.imageUrl,
        source: recipe.author ? `${recipe.author.platform}: ${recipe.author.name}` : null,
        is_public: false // Default to private
      })
      .select()
      .single();

    if (error) throw error;
    return data;

  } catch (error) {
    console.error('Failed to save recipe:', error);
    return null;
  }
}

/**
 * Log extraction for analytics
 */
async function logExtraction(
  userId: string, 
  platform: string, 
  success: boolean
) {
  try {
    await supabaseAdmin.from('social_media_extractions').insert({
      user_id: userId,
      platform,
      success,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log extraction:', error);
  }
}

// Export config
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb'
    }
  }
};