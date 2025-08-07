import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { RateLimiter, RateLimitPresets } from '../_shared/rateLimiter.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Validate required environment variables
if (!openAIApiKey) {
  throw new Error('OPENAI_API_KEY is required but not set');
}
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase configuration is required but not set');
}

// CORS configuration with environment-based origins
const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://smartpantrypro.com',
  'https://app.smartpantrypro.com'
];

const corsHeaders = (origin: string | null) => {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
  
  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else if (Deno.env.get('ENVIRONMENT') === 'development') {
    // Allow localhost in development
    headers['Access-Control-Allow-Origin'] = origin || 'http://localhost:5173';
  }
  
  return headers;
};

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
const rateLimiter = new RateLimiter(supabaseUrl!, supabaseServiceKey!, RateLimitPresets.AI);

serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    const { message, userId } = await req.json();

    if (!message || !userId) {
      throw new Error('Message and userId are required');
    }

    // Check rate limit
    const rateLimit = await rateLimiter.checkLimit(userId, 'recipe-assistant');
    
    if (!rateLimit.allowed) {
      const resetTime = new Date(rateLimit.resetTime).toISOString();
      return new Response(
        JSON.stringify({ 
          error: 'Trop de requêtes. Réessayez après ' + resetTime,
          resetTime: resetTime
        }), 
        {
          status: 429,
          headers: { 
            ...headers, 
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': RateLimitPresets.AI.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime
          },
        }
      );
    }

    console.log('Fetching user inventory for userId:', userId);

    // Fetch user's inventory
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventory')
      .select(`
        quantity,
        expiry_date,
        location,
        product:products(name, category, unit_type)
      `)
      .eq('user_id', userId);

    if (inventoryError) {
      console.error('Error fetching inventory:', inventoryError);
      throw new Error('Failed to fetch inventory');
    }

    console.log('Inventory fetched:', inventory?.length, 'items');
    
    // Fetch user's recipes and public recipes
    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select(`
        id,
        name,
        description,
        cuisine_category,
        meal_type,
        prep_time,
        cook_time,
        servings,
        difficulty,
        tags,
        recipe_ingredients (
          ingredient_name,
          quantity,
          unit,
          is_essential
        )
      `)
      .or(`user_id.eq.${userId},is_public.eq.true`)
      .limit(50);

    if (recipesError) {
      console.error('Error fetching recipes:', recipesError);
    }

    console.log('Recipes fetched:', recipes?.length, 'recipes');

    // Format inventory for AI
    const inventoryText = inventory?.map(item => 
      `${item.quantity} ${item.product?.unit_type} de ${item.product?.name} (${item.product?.category})`
    ).join(', ') || 'Aucun produit en stock';

    console.log('Formatted inventory:', inventoryText);
    
    // Format recipes for AI
    const recipesText = recipes?.map(recipe => {
      const ingredients = recipe.recipe_ingredients?.map(ing => 
        `${ing.quantity || ''} ${ing.unit || ''} ${ing.ingredient_name}`.trim()
      ).join(', ');
      return `- ${recipe.name} (${recipe.cuisine_category || 'Non catégorisé'}, ${recipe.prep_time + recipe.cook_time} min): ${ingredients}`;
    }).join('\n') || 'Aucune recette disponible';
    
    console.log('Formatted recipes preview:', recipesText.substring(0, 200) + '...');

    // Prepare system prompt
    const systemPrompt = `Tu es un assistant culinaire expert avec accès à une base de données de recettes et à l'inventaire de l'utilisateur.

**Inventaire actuel de l'utilisateur :**
${inventoryText}

**Recettes disponibles dans la base de données :**
${recipesText}

Règles importantes :
1. TOUJOURS vérifier d'abord les recettes existantes dans la base de données avant de proposer de nouvelles recettes
2. Pour chaque recette suggérée, vérifier précisément quels ingrédients sont disponibles dans l'inventaire
3. Indiquer clairement les ingrédients manquants avec les quantités nécessaires
4. Proposer un bouton d'ajout à la liste de courses pour les ingrédients manquants
5. Garder le caractère authentique et original des recettes (notamment pour les recettes indiennes)
6. Donner des conseils pratiques et des astuces culinaires
7. Répondre de façon conversationnelle et amicale

Quand tu suggères une recette, structure TOUJOURS ta réponse ainsi :
📍 **Nom de la recette**
⏱️ **Temps de préparation** : X min
👥 **Portions** : X personnes
🍳 **Type** : [Catégorie cuisine]

✅ **Ingrédients disponibles** :
- [Liste avec quantités]

❌ **Ingrédients manquants** :
- [Liste avec quantités précises]

📝 **Instructions** :
1. [Etape 1]
2. [Etape 2]
...

💡 **Astuce** : [Conseil ou variante]

Si l'utilisateur demande ce qu'il peut cuisiner, analyser les recettes de la base et proposer 2-3 options réalisables avec ce qu'il a.`;

    console.log('Sending request to OpenAI...');

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('OpenAI response received, length:', aiResponse?.length);

    // Save conversation to database (optional)
    try {
      await supabase
        .from('recipe_conversations')
        .insert({
          user_id: userId,
          user_message: message,
          ai_response: aiResponse,
          inventory_snapshot: inventoryText
        });
      console.log('Conversation saved to database');
    } catch (error) {
      console.error('Error saving conversation:', error);
      // Don't throw, just log - conversation saving is not critical
    }

    return new Response(JSON.stringify({ 
      response: aiResponse,
      inventoryCount: inventory?.length || 0 
    }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in recipe-assistant function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
});