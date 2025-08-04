import { VercelRequest, VercelResponse } from '@vercel/node';

// API endpoint pour parsing recettes avec IA (pattern Cipher AI)
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
    const { url, source } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`🤖 AI parsing recipe from: ${url} (source: ${source})`);

    // 1. Fetch page content
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, { 
      headers, 
      signal: controller.signal 
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    let html = await response.text();
    
    // Nettoyer le HTML (pattern Cipher sécurité)
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
    const prompt = `Tu es un expert en parsing de recettes françaises. Analyse ce HTML et extrait les informations de la recette au format JSON.

URL source: ${url}
Source: ${source}

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
- Extrais TOUS les ingrédients avec quantités précises
- Convertis les durées en minutes (30min, 1h30 = 90min)
- Devine la difficulté selon la complexité (1=très facile, 5=très difficile)
- Identifie la catégorie de cuisine
- Si informations manquantes, utilise des valeurs par défaut cohérentes
- Assure-toi que le JSON est parfaitement valide`;

    // 3. Appel OpenAI avec gestion d'erreurs (pattern Cipher précautions)
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from OpenAI');
    }

    // 4. Parser et valider le JSON
    let recipe;
    try {
      // Nettoyer la réponse (enlever markdown si présent)
      const cleanedResponse = aiResponse
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      
      recipe = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('AI Response:', aiResponse);
      throw new Error('Invalid JSON response from AI');
    }

    // 5. Validation et normalisation (pattern Cipher validation)
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
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.map((ing: any) => ({
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
    console.error('Error in AI recipe parsing:', error);
    
    let errorMessage = 'AI parsing failed';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'OpenAI API not configured';
        statusCode = 503;
      } else if (error.name === 'AbortError') {
        errorMessage = 'Request timeout';
        statusCode = 408;
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Invalid response format';
        statusCode = 422;
      }
    }

    res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}