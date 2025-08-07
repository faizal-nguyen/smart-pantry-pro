import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/auth';
import { rateLimiter } from '@/lib/rateLimiter';
import { validateCORS } from '@/lib/cors';
import { sanitizeInput } from '@/lib/security';
import { getStreamingAIService } from '@/services/ai/streamingAIService';
import { SECURITY_ERROR_MESSAGES, API_RATE_LIMITS } from '@/config/security';

// Initialize Supabase client with service role
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

    // Rate limiting
    const rateLimitKey = `ai_${user.id}`;
    const allowed = await rateLimiter.checkLimit(rateLimitKey, API_RATE_LIMITS.OPENAI);
    
    if (!allowed) {
      const resetTime = await rateLimiter.getResetTime(rateLimitKey);
      res.setHeader('X-RateLimit-Reset', resetTime.toString());
      return res.status(429).json({ 
        error: API_RATE_LIMITS.OPENAI.message,
        resetTime 
      });
    }

    // Validate and sanitize input
    const { message, context, mode = 'text', stream = true } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Message is required' 
      });
    }

    const sanitizedMessage = sanitizeInput(message);
    if (sanitizedMessage.length > 1000) {
      return res.status(400).json({ 
        error: 'Message too long (max 1000 characters)' 
      });
    }

    // Log interaction (anonymized)
    await logInteraction(user.id, mode, sanitizedMessage.length);

    // Get AI service
    const aiService = getStreamingAIService(process.env.OPENAI_API_KEY!);

    // Prepare system prompt with context
    const systemPrompt = buildSystemPrompt(context);

    if (stream) {
      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Content-Encoding', 'none');

      // Stream response
      await aiService.streamChat(
        systemPrompt,
        sanitizedMessage,
        (chunk) => {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        },
        (error) => {
          console.error('Streaming error:', error);
          res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        }
      );

      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      // Non-streaming response
      const response = await aiService.chat(systemPrompt, sanitizedMessage);
      res.json({ response });
    }

  } catch (error: any) {
    console.error('AI Assistant error:', error);
    
    // Handle specific errors
    if (error.message?.includes('rate limit')) {
      return res.status(429).json({ 
        error: API_RATE_LIMITS.OPENAI.message 
      });
    }

    if (error.message?.includes('context length')) {
      return res.status(400).json({ 
        error: 'Conversation too long. Please start a new conversation.' 
      });
    }

    // Generic error
    return res.status(500).json({ 
      error: SECURITY_ERROR_MESSAGES.SERVER_ERROR 
    });
  }
}

/**
 * Build system prompt with context
 */
function buildSystemPrompt(context: any): string {
  const basePrompt = `Tu es un assistant culinaire intelligent pour Smart Pantry Pro.
Tu aides les utilisateurs à:
- Gérer leur inventaire alimentaire
- Trouver des recettes adaptées à leurs ingrédients
- Éviter le gaspillage alimentaire
- Planifier leurs repas
- Créer des listes de courses intelligentes

Réponds toujours en français de manière amicale et concise.
Si l'utilisateur mentionne des produits, vérifie leur inventaire et leurs dates de péremption.`;

  let contextPrompt = '\n\nContexte actuel:';

  // Add inventory context
  if (context?.inventory?.length > 0) {
    contextPrompt += '\n\nInventaire:';
    context.inventory.forEach((item: any) => {
      contextPrompt += `\n- ${item.product?.name}: ${item.quantity} ${item.unit}`;
      if (item.expiry_date) {
        const daysUntil = Math.ceil(
          (new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntil <= 3) {
          contextPrompt += ` (expire dans ${daysUntil} jours!)`;
        }
      }
    });
  }

  // Add expiry alerts
  if (context?.expiryAlerts?.length > 0) {
    contextPrompt += '\n\nAlertes de péremption:';
    context.expiryAlerts.forEach((alert: any) => {
      const urgency = alert.type === 'expired' ? '🔴 EXPIRÉ' : 
                     alert.type === 'critical' ? '🟠 URGENT' : '🟡 ATTENTION';
      contextPrompt += `\n${urgency}: ${alert.product} (${alert.daysUntil} jours)`;
    });
  }

  // Add recipes context
  if (context?.recipes?.length > 0) {
    contextPrompt += '\n\nRecettes récentes:';
    context.recipes.slice(0, 5).forEach((recipe: any) => {
      contextPrompt += `\n- ${recipe.name}`;
    });
  }

  // Add season
  if (context?.season) {
    contextPrompt += `\n\nSaison actuelle: ${context.season}`;
  }

  return basePrompt + contextPrompt;
}

/**
 * Log interaction for analytics (anonymized)
 */
async function logInteraction(
  userId: string, 
  mode: string, 
  messageLength: number
) {
  try {
    await supabaseAdmin.from('ai_interactions').insert({
      user_id: userId,
      mode,
      message_length: messageLength,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Log error but don't block request
    console.error('Failed to log interaction:', error);
  }
}

// Export config for body size limit
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10kb'
    }
  }
};