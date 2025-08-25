// Simplified version without external dependencies for development

export default async function handler(req, res) {
  // CORS headers are already handled by the main server
  
  // Method validation
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract and verify token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ 
        error: 'Unauthorized - No token provided' 
      });
    }

    // For now, skip user verification to test the endpoint
    // In production, uncomment this:
    /*
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ 
        error: 'Unauthorized - Invalid token' 
      });
    }
    */

    // Validate and sanitize input
    const { message, context, mode = 'text', stream = true } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Message is required' 
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({ 
        error: 'Message too long (max 1000 characters)' 
      });
    }

    // Prepare system prompt with context
    const systemPrompt = buildSystemPrompt(context);

    // Mock response for development
    const mockResponse = {
      response: "Je suis l'assistant culinaire de Smart Pantry Pro. Cette fonctionnalité est en cours de développement. Comment puis-je vous aider avec vos recettes et votre inventaire ?",
      context: context,
      mode: mode
    };

    if (stream) {
      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Content-Encoding', 'none');

      // Mock streaming response
      const words = mockResponse.response.split(' ');
      for (const word of words) {
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: word + ' ' } }] })}\n\n`);
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate typing
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      // Non-streaming response
      res.json({ 
        response: mockResponse.response 
      });
    }

  } catch (error) {
    console.error('AI Assistant error:', error);
    
    // Handle specific errors
    if (error.message?.includes('rate limit')) {
      return res.status(429).json({ 
        error: 'Too many requests. Please try again later.' 
      });
    }

    if (error.message?.includes('context length')) {
      return res.status(400).json({ 
        error: 'Conversation too long. Please start a new conversation.' 
      });
    }

    // Generic error
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}

/**
 * Build system prompt with context
 */
function buildSystemPrompt(context) {
  const basePrompt = `Tu es un assistant culinaire intelligent pour Smart Pantry Pro.
Tu aides les utilisateurs à:
- Gérer leur inventaire alimentaire
- Trouver des recettes adaptées à leurs ingrédients
- Éviter le gaspillage alimentaire
- Planifier leurs repas
- Créer des listes de courses intelligentes

Règles importantes:
1. TOUJOURS vérifier l'inventaire actuel avant de répondre
2. PRIORISER les recettes déjà enregistrées dans la base de données
3. Suggérer des recettes basées sur les ingrédients disponibles
4. Alerter sur les produits proches de la péremption
5. Répondre en français de manière amicale et concise`;

  let contextPrompt = '\n\nContexte actuel:';

  // Add inventory context with limits for token optimization
  if (context?.inventory?.length > 0) {
    contextPrompt += `\n\nInventaire (${context.totalInventoryItems || context.inventory.length} produits au total):`;
    // Limit to most relevant items to avoid token overflow
    const inventoryToShow = context.inventory.slice(0, 40);
    inventoryToShow.forEach((item) => {
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
    if (context.inventory.length > 40) {
      contextPrompt += `\n... et ${context.inventory.length - 40} autres produits en stock`;
    }
  }

  // Add expiry alerts
  if (context?.expiryAlerts?.length > 0) {
    contextPrompt += '\n\nAlertes de péremption:';
    context.expiryAlerts.forEach((alert) => {
      const urgency = alert.type === 'expired' ? '🔴 EXPIRÉ' : 
                     alert.type === 'critical' ? '🟠 URGENT' : '🟡 ATTENTION';
      contextPrompt += `\n${urgency}: ${alert.product} (${alert.daysUntil} jours)`;
    });
  }

  // Add recipes context with more details
  if (context?.recipes?.length > 0) {
    contextPrompt += `\n\nRecettes enregistrées (${context.totalRecipes || context.recipes.length} au total):`;
    // Show more recipes with details
    context.recipes.slice(0, 10).forEach((recipe) => {
      contextPrompt += `\n- ${recipe.name}`;
      if (recipe.cook_time) {
        contextPrompt += ` (${recipe.cook_time} min)`;
      }
      if (recipe.difficulty) {
        contextPrompt += ` - ${recipe.difficulty}`;
      }
      // Add main ingredients if available
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        const mainIngredients = recipe.ingredients.slice(0, 3).map(i => i.name).join(', ');
        contextPrompt += ` - Ingrédients: ${mainIngredients}`;
        if (recipe.ingredients.length > 3) {
          contextPrompt += ` et ${recipe.ingredients.length - 3} autres`;
        }
      }
    });
    if (context.recipes.length > 10) {
      contextPrompt += `\n... et ${context.recipes.length - 10} autres recettes disponibles`;
    }
  }

  // Add season
  if (context?.season) {
    contextPrompt += `\n\nSaison actuelle: ${context.season}`;
  }

  // Add specific instructions for recipe queries
  contextPrompt += `\n\nInstructions spécifiques:
- Si l'utilisateur demande une recette, cherche D'ABORD dans les recettes enregistrées ci-dessus
- Donne la recette complète avec les ingrédients et les étapes si elle existe dans la base
- Vérifie si tous les ingrédients de la recette sont disponibles dans l'inventaire
- Propose des alternatives si certains ingrédients manquent`;

  return basePrompt + contextPrompt;
}