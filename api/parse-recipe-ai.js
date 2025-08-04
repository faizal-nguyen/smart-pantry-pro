// Fonction de retry avec backoff exponentiel
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.log(`🔄 Retry ${i + 1}/${maxRetries} après ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

export default async function handler(req, res) {
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
    // Parse body if needed
    let body = req.body;
    
    // Si c'est undefined, essayer de lire le stream
    if (!body && req.readable) {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const rawBody = Buffer.concat(chunks).toString();
      try {
        body = JSON.parse(rawBody);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON', details: e.message });
      }
    } else if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON', details: e.message });
      }
    }
    
    const { url, source, html: providedHtml } = body || {};

    if (!url && !providedHtml) {
      return res.status(400).json({ error: 'URL or HTML is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`🤖 AI parsing recipe from: ${url || 'provided HTML'} (source: ${source})`);

    let html;
    
    // 1. Use provided HTML or fetch page content
    if (providedHtml) {
      html = providedHtml;
      console.log('📄 Using provided HTML content');
    } else {
      // Fetch page content if not provided
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      let response;
      try {
        response = await fetch(url, { 
          headers, 
          signal: controller.signal 
        });
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error('⏱️ Timeout lors du fetch de l\'URL après 15 secondes');
          throw new Error('Timeout: La page a mis trop de temps à répondre');
        }
        console.error('❌ Erreur lors du fetch:', fetchError);
        throw new Error(`Impossible de récupérer la page: ${fetchError.message}`);
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`);
      }

      html = await response.text();
    }
    
    // Nettoyer le HTML
    html = html
      .replace(/<script[^>]*>.*?<\/script>/gsi, '')
      .replace(/<style[^>]*>.*?<\/style>/gsi, '')
      .replace(/<nav[^>]*>.*?<\/nav>/gsi, '')
      .replace(/<footer[^>]*>.*?<\/footer>/gsi, '')
      .replace(/<aside[^>]*>.*?<\/aside>/gsi, '')
      .replace(/<!--.*?-->/gs, '');

    // Limiter la taille pour l'API OpenAI
    if (html.length > 15000) {
      html = html.substring(0, 15000);
    }

    // 2. Prompt optimisé pour extraction de recettes françaises
    const prompt = `Tu es un expert en parsing de recettes françaises, spécialisé dans ${source || 'sites de cuisine'}. Analyse ce HTML et extrait TOUTES les informations de la recette au format JSON.

URL source: ${url || 'Non fournie'}
Source: ${source || 'Générique'}

${source === 'marmiton' ? `IMPORTANT pour Marmiton:
- Les ingrédients peuvent être dans des structures MuiGrid-root ou des listes
- Cherche les patterns: "200 g de farine", "2 oeufs", etc.
- Décode les entités HTML (&#x20; = espace, &#xE0; = à, etc.)
- Les instructions sont souvent dans des sections "preparation" ou "recipe-preparation"` : ''}

HTML à analyser:
${html}

Retourne UNIQUEMENT un objet JSON valide avec cette structure exacte:
{
  "name": "nom de la recette",
  "description": "description courte",
  "image_url": "URL de l'image principale",
  "cuisine_category": "Française|Italienne|Asiatique|Méditerranéenne|Végétarienne|Végan",
  "meal_type": "breakfast|lunch|dinner|dessert|appetizer",
  "prep_time": nombre_minutes_preparation,
  "cook_time": nombre_minutes_cuisson, 
  "servings": nombre_personnes,
  "difficulty": 1-5,
  "instructions": "instructions étape par étape, séparées par des \\n",
  "ingredients": [
    {
      "name": "nom ingrédient",
      "quantity": nombre,
      "unit": "unité (g, ml, c.à.s, etc.)",
      "is_essential": true/false,
      "notes": "notes optionnelles"
    }
  ],
  "tags": ["tag1", "tag2"],
  "source_url": "${url}"
}

IMPORTANT:
- Extrais TOUS les ingrédients avec quantités précises (cherche PARTOUT dans le HTML)
- Décode TOUTES les entités HTML (&#x20;, &#xE0;, etc.) en caractères normaux
- Convertis les durées en minutes (30min, 1h30 = 90min)
- Devine la difficulté selon la complexité (1=très facile, 5=très difficile)
- Identifie la catégorie de cuisine
- Si informations manquantes, utilise des valeurs par défaut cohérentes
- Assure-toi que le JSON est parfaitement valide
- NE JAMAIS retourner un tableau vide pour les ingrédients - cherche plus profondément`;

    // 3. Appel OpenAI avec retry
    console.log('🔄 Calling OpenAI API...');
    const openaiResponse = await retryWithBackoff(async () => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Tu es un expert en extraction de recettes. Tu réponds UNIQUEMENT avec du JSON valide, sans texte supplémentaire.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('❌ OpenAI API error:', response.status);
        console.error('Error response:', errorBody);
        throw new Error(`OpenAI API error: ${response.status} - ${errorBody}`);
      }
      
      return response;
    }, 3, 2000);

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from OpenAI');
    }

    // 4. Parser et valider le JSON
    console.log('Raw AI Response:', aiResponse);
    
    let recipe;
    try {
      // Nettoyer la réponse (enlever markdown si présent)
      const cleanedResponse = aiResponse
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      
      console.log('Cleaned response:', cleanedResponse.substring(0, 200) + '...');
      
      recipe = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError.message);
      console.error('AI Response (first 500 chars):', aiResponse.substring(0, 500));
      
      // Essayer de retourner une version simplifiée
      return res.status(200).json({
        success: true,
        recipe: {
          name: "Recette importée",
          description: "Parsing en cours d'amélioration",
          ingredients: [
            { name: "Voir la recette originale", quantity: 1, unit: "unité", is_essential: true }
          ],
          instructions: aiResponse || "Instructions non disponibles",
          prep_time: 30,
          cook_time: 30,
          servings: 4,
          source_url: url
        },
        confidence: 0.3,
        method: 'ai-fallback',
        debug: {
          error: parseError.message,
          rawResponse: aiResponse.substring(0, 500)
        }
      });
    }

    // 5. Validation et normalisation
    const normalizedRecipe = {
      name: recipe.name || 'Recette importée',
      description: recipe.description || '',
      image_url: recipe.image_url || '',
      cuisine_category: recipe.cuisine_category || '',
      meal_type: recipe.meal_type || '',
      prep_time: Math.max(5, parseInt(recipe.prep_time) || 30),
      cook_time: Math.max(0, parseInt(recipe.cook_time) || 30),
      servings: Math.max(1, parseInt(recipe.servings) || 4),
      difficulty: Math.min(5, Math.max(1, parseInt(recipe.difficulty) || 2)),
      instructions: recipe.instructions || 'Instructions à compléter',
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.map((ing) => ({
        name: ing.name || 'Ingrédient',
        quantity: parseFloat(ing.quantity) || 1,
        unit: ing.unit || 'unité',
        is_essential: ing.is_essential !== false,
        notes: ing.notes || ''
      })) : [],
      tags: Array.isArray(recipe.tags) ? recipe.tags : [],
      source_url: url,
      confidence: 0.8,
      fallback: false
    };

    // 6. Validation finale
    if (!normalizedRecipe.name || normalizedRecipe.ingredients.length === 0) {
      throw new Error('Recipe parsing incomplete - missing essential data');
    }

    console.log(`✅ AI parsed recipe: ${normalizedRecipe.name} with ${normalizedRecipe.ingredients.length} ingredients`);

    res.status(200).json({
      success: true,
      recipe: normalizedRecipe,
      confidence: 0.8,
      method: 'ai'
    });

  } catch (error) {
    console.error('❌ Error in AI recipe parsing:', error);
    
    let errorMessage = 'AI parsing failed';
    let statusCode = 500;

    if (error.message) {
      if (error.message.includes('API key')) {
        errorMessage = 'OpenAI API not configured';
        statusCode = 503;
      } else if (error.message.includes('Timeout')) {
        errorMessage = 'Request timeout';
        statusCode = 408;
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Invalid response format';
        statusCode = 422;
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Failed to fetch recipe page';
        statusCode = 502;
      } else if (error.message.includes('OpenAI API error')) {
        errorMessage = 'AI service temporarily unavailable';
        statusCode = 503;
      }
    }

    res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      details: error.message || 'Unknown error'
    });
  }
}