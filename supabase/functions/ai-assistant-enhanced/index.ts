import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { RateLimiter, RateLimitPresets } from '../_shared/rateLimiter.ts';
import { SecurityMiddleware, ValidationPatterns } from '../_shared/security.ts';

// Environment variables with validation
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!openAIApiKey || !supabaseUrl || !supabaseServiceKey) {
  throw new Error('Required environment variables are not set');
}

// Initialize services
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const rateLimiter = new RateLimiter(supabaseUrl, supabaseServiceKey, RateLimitPresets.AI);
const security = new SecurityMiddleware(supabaseUrl, supabaseServiceKey);

// CORS configuration
const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [
  'http://localhost:5173',
  'http://localhost:3000'
];

const corsHeaders = (origin: string | null) => {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
  
  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  
  return security.applySecurityHeaders(new Headers(headers));
};

// Input validation schema
const requestSchema = {
  message: {
    type: 'string' as const,
    required: true,
    maxLength: 1000,
    pattern: ValidationPatterns.safeString
  },
  context: {
    type: 'object' as const,
    required: false
  },
  mode: {
    type: 'string' as const,
    required: false,
    validator: (value: any) => {
      const validModes = ['chat', 'voice', 'visual'];
      return validModes.includes(value) ? null : 'Invalid mode';
    }
  },
  stream: {
    type: 'boolean' as const,
    required: false
  }
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    // Extract and validate JWT
    const { userId, error: authError } = await security.validateAuth(req);
    
    if (authError || !userId) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const { valid, errors } = security.validateInput(body, requestSchema);
    
    if (!valid) {
      return new Response(
        JSON.stringify({ error: 'Données invalides', details: errors }),
        { status: 400, headers }
      );
    }

    // Check rate limit
    const rateLimit = await rateLimiter.checkLimit(userId, 'ai-assistant');
    
    if (!rateLimit.allowed) {
      headers.set('X-RateLimit-Limit', RateLimitPresets.AI.maxRequests.toString());
      headers.set('X-RateLimit-Remaining', '0');
      headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());
      
      return new Response(
        JSON.stringify({ 
          error: 'Limite de requêtes atteinte',
          resetTime: new Date(rateLimit.resetTime).toISOString()
        }),
        { status: 429, headers }
      );
    }

    const { message, context, mode = 'chat', stream = false } = body;

    // Fetch user data with security checks
    const userData = await fetchUserData(userId);
    
    // Handle different modes
    let response;
    switch (mode) {
      case 'voice':
        response = await handleVoiceMode(message, userData, context);
        break;
      case 'visual':
        response = await handleVisualMode(message, userData, context);
        break;
      default:
        response = await handleChatMode(message, userData, context, stream);
    }

    // Add rate limit headers
    headers.set('X-RateLimit-Limit', RateLimitPresets.AI.maxRequests.toString());
    headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());

    // Return response
    if (stream) {
      return new Response(response.body, {
        headers: {
          ...Object.fromEntries(headers.entries()),
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    } else {
      return new Response(
        JSON.stringify(security.sanitizeOutput(response)),
        { headers }
      );
    }

  } catch (error: any) {
    console.error('AI Assistant error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Erreur du service',
        message: Deno.env.get('ENVIRONMENT') === 'development' ? error.message : undefined
      }),
      { status: 500, headers }
    );
  }
});

/**
 * Fetch user data with privacy controls
 */
async function fetchUserData(userId: string) {
  // Fetch inventory with expiry alerts
  const { data: inventory } = await supabase
    .from('inventory')
    .select(`
      id,
      quantity,
      expiry_date,
      location,
      created_at,
      product:products(name, category, unit_type, allergens)
    `)
    .eq('user_id', userId)
    .order('expiry_date', { ascending: true });

  // Calculate expiry alerts
  const expiryAlerts = calculateExpiryAlerts(inventory || []);

  // Fetch user preferences
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Fetch recent recipes
  const { data: recipes } = await supabase
    .from('recipes')
    .select(`
      id,
      name,
      cuisine_category,
      prep_time,
      cook_time,
      servings,
      recipe_ingredients (
        ingredient_name,
        quantity,
        unit
      )
    `)
    .or(`user_id.eq.${userId},is_public.eq.true`)
    .limit(30);

  // Anonymize for AI processing
  return {
    inventory: anonymizeInventory(inventory || []),
    expiryAlerts,
    preferences: anonymizePreferences(preferences),
    recipes: recipes || [],
    season: getCurrentSeason()
  };
}

/**
 * Calculate expiry alerts
 */
function calculateExpiryAlerts(inventory: any[]) {
  const alerts = [];
  const today = new Date();
  
  for (const item of inventory) {
    if (!item.expiry_date) continue;
    
    const expiryDate = new Date(item.expiry_date);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 0) {
      alerts.push({
        productId: item.id,
        productName: item.product?.name,
        type: 'expired',
        daysUntilExpiry,
        message: `${item.product?.name} est expiré depuis ${Math.abs(daysUntilExpiry)} jours`
      });
    } else if (daysUntilExpiry <= 1) {
      alerts.push({
        productId: item.id,
        productName: item.product?.name,
        type: 'critical',
        daysUntilExpiry,
        message: `${item.product?.name} expire demain`
      });
    } else if (daysUntilExpiry <= 3) {
      alerts.push({
        productId: item.id,
        productName: item.product?.name,
        type: 'warning',
        daysUntilExpiry,
        message: `${item.product?.name} expire dans ${daysUntilExpiry} jours`
      });
    }
  }
  
  return alerts;
}

/**
 * Handle chat mode with optional streaming
 */
async function handleChatMode(message: string, userData: any, context: any, stream: boolean) {
  const systemPrompt = buildSystemPrompt(userData);
  
  if (stream) {
    // Create streaming response
    const streamResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
        stream: true
      })
    });

    return streamResponse;
  } else {
    // Regular response
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
        max_tokens: 1500
      })
    });

    const data = await response.json();
    
    return {
      response: data.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu générer une réponse.',
      usage: data.usage,
      expiryAlerts: userData.expiryAlerts
    };
  }
}

/**
 * Handle voice mode with speech-to-text context
 */
async function handleVoiceMode(message: string, userData: any, context: any) {
  // Add voice-specific context
  const voiceContext = {
    ...context,
    isVoiceInput: true,
    requiresSimpleResponse: true
  };
  
  return handleChatMode(message, userData, voiceContext, false);
}

/**
 * Handle visual mode with image analysis context
 */
async function handleVisualMode(message: string, userData: any, context: any) {
  // Visual mode requires image data in context
  if (!context?.imageData) {
    return {
      error: 'Image requise pour le mode visuel'
    };
  }
  
  // Add visual-specific prompting
  const visualMessage = `En analysant cette image: ${message}`;
  
  return handleChatMode(visualMessage, userData, context, false);
}

/**
 * Build system prompt with full context
 */
function buildSystemPrompt(userData: any) {
  const { inventory, expiryAlerts, preferences, recipes, season } = userData;
  
  // Format inventory with alerts
  const inventoryText = formatInventoryWithAlerts(inventory, expiryAlerts);
  
  // Format recipes
  const recipesText = formatRecipes(recipes);
  
  return `Tu es un assistant culinaire français expert avec une connaissance approfondie de la cuisine française et internationale.

**Contexte actuel:**
- Saison: ${season}
- Préférences utilisateur: ${formatPreferences(preferences)}

**Inventaire (${inventory?.length || 0} produits):**
${inventoryText}

**Recettes disponibles (${recipes?.length || 0}):**
${recipesText}

**Règles de communication:**
1. Prioriser ABSOLUMENT les produits qui expirent bientôt (marqués 🚨 ou ⚠️)
2. Proposer des recettes réalisables avec l'inventaire actuel
3. Indiquer clairement les ingrédients manquants avec quantités précises
4. Respecter les allergies et préférences alimentaires
5. Utiliser un ton conversationnel, chaleureux et encourageant
6. Donner des astuces pratiques et alternatives
7. Suggérer comment éviter le gaspillage alimentaire

**Format de réponse pour les recettes:**
📍 **[Nom de la recette]**
⏱️ **Temps total**: [X] minutes
👥 **Portions**: [X] personnes
🏷️ **Type**: [Catégorie]

✅ **Ingrédients disponibles:**
- [Liste avec quantités]

❌ **Ingrédients à acheter:**
- [Liste avec quantités précises]

📝 **Préparation:**
1. [Étapes claires et numérotées]

💡 **Astuce anti-gaspi**: [Conseil pour utiliser les restes ou produits qui expirent]

**Toujours terminer par une question engageante pour continuer la conversation.**`;
}

// Helper functions
function formatInventoryWithAlerts(inventory: any[], alerts: any[]) {
  if (!inventory || inventory.length === 0) {
    return 'Inventaire vide';
  }
  
  const alertMap = new Map(alerts.map(a => [a.productId, a]));
  
  return inventory
    .map(item => {
      const alert = alertMap.get(item.id);
      const emoji = alert?.type === 'expired' ? '💀' : 
                   alert?.type === 'critical' ? '🚨' : 
                   alert?.type === 'warning' ? '⚠️' : '';
      
      return `${emoji} ${item.quantity} ${item.product?.unit_type || 'unité'} de ${item.product?.name}${
        alert ? ` (${alert.message})` : ''
      }`;
    })
    .join('\n');
}

function formatRecipes(recipes: any[]) {
  if (!recipes || recipes.length === 0) {
    return 'Aucune recette enregistrée';
  }
  
  return recipes
    .slice(0, 10)
    .map(r => `- ${r.name} (${r.prep_time + r.cook_time}min, ${r.servings} pers)`)
    .join('\n');
}

function formatPreferences(prefs: any) {
  if (!prefs) return 'Aucune préférence définie';
  
  const items = [];
  if (prefs.dietary_restrictions) items.push(`Régime: ${prefs.dietary_restrictions}`);
  if (prefs.allergies) items.push(`Allergies: ${prefs.allergies.join(', ')}`);
  if (prefs.favorite_cuisines) items.push(`Cuisines préférées: ${prefs.favorite_cuisines.join(', ')}`);
  
  return items.join(' | ') || 'Aucune préférence définie';
}

function getCurrentSeason() {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'Printemps';
  if (month >= 5 && month <= 7) return 'Été';
  if (month >= 8 && month <= 10) return 'Automne';
  return 'Hiver';
}

function anonymizeInventory(inventory: any[]) {
  return inventory.map(item => ({
    ...item,
    id: 'ANON_' + item.id.substring(0, 8),
    created_at: undefined
  }));
}

function anonymizePreferences(prefs: any) {
  if (!prefs) return null;
  
  return {
    dietary_restrictions: prefs.dietary_restrictions,
    allergies: prefs.allergies,
    favorite_cuisines: prefs.favorite_cuisines,
    // Remove personal identifiers
    email_notifications: undefined,
    phone: undefined
  };
}