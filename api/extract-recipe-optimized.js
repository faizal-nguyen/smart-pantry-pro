import fetch from 'node-fetch';

// Fonction de traduction et extraction combinée
async function extractAndTranslateRecipe(html, url) {
  const prompt = `Tu es un chef cuisinier français expert en extraction de recettes.
  
Analyse cette page web et extrais la recette en français. Si la recette est déjà en français, garde-la telle quelle. Si elle est dans une autre langue, traduis-la avec précision culinaire.

URL: ${url}

Instructions:
1. Extrais TOUS les ingrédients avec quantités exactes
2. Convertis les mesures si nécessaire (cups → ml/g, fahrenheit → celsius)
3. Utilise le vocabulaire culinaire français approprié
4. Décode les entités HTML (&#x20; = espace, etc.)

IMPORTANT: Retourne UNIQUEMENT un objet JSON avec cette structure exacte:
{
  "name": "Nom de la recette",
  "description": "Description courte",
  "cuisine_type": "Type de cuisine",
  "ingredients": [
    {
      "name": "nom ingrédient",
      "quantity": nombre,
      "unit": "unité",
      "isEssential": true/false
    }
  ],
  "instructions": ["étape 1", "étape 2", ...],
  "prepTime": nombre en minutes,
  "cookTime": nombre en minutes,
  "servings": nombre de portions,
  "difficulty": "Facile/Moyen/Difficile",
  "tags": ["tag1", "tag2"]
}

Contenu HTML à analyser:
${html}`;

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
          content: 'Tu es un chef expert qui extrait et traduit des recettes. Réponds UNIQUEMENT en JSON valide.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', errorText);
    throw new Error('OpenAI API error');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  return JSON.parse(content);
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
    const { url } = req.body || {};
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'OpenAI API key not configured' });
    }
    
    console.log(`🤖 Extracting recipe from URL: ${url}`);
    
    // 1. Fetch avec timeout de 10 secondes
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RecipeExtractor/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
      }
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    
    let html = await response.text();
    
    // 2. Optimiser le HTML - garder seulement le contenu pertinent
    // Chercher les zones de recette communes
    const recipeSelectors = [
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gs,
      /<div[^>]*class=["'][^"']*recipe[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
      /<article[^>]*>[\s\S]*?<\/article>/gi
    ];
    
    let recipeContent = '';
    for (const selector of recipeSelectors) {
      const matches = html.match(selector);
      if (matches) {
        recipeContent += matches.join(' ');
        if (recipeContent.length > 5000) break;
      }
    }
    
    // Si pas de contenu spécifique trouvé, prendre une portion du HTML
    if (recipeContent.length < 1000) {
      recipeContent = html.substring(0, 15000);
    } else {
      recipeContent = recipeContent.substring(0, 15000);
    }
    
    // 3. Extraction et traduction en un seul appel
    const recipe = await extractAndTranslateRecipe(recipeContent, url);
    
    // 4. Validation et nettoyage
    if (!recipe.name || !recipe.ingredients || recipe.ingredients.length === 0) {
      throw new Error('Invalid recipe format');
    }
    
    // Nettoyer les ingrédients
    recipe.ingredients = recipe.ingredients.map(ing => ({
      name: ing.name?.trim() || '',
      quantity: parseFloat(ing.quantity) || 0,
      unit: ing.unit?.trim() || '',
      isEssential: ing.isEssential !== false
    }));
    
    // Assurer les valeurs par défaut
    recipe.prepTime = parseInt(recipe.prepTime) || 15;
    recipe.cookTime = parseInt(recipe.cookTime) || 30;
    recipe.servings = parseInt(recipe.servings) || 4;
    recipe.difficulty = recipe.difficulty || 'Moyen';
    recipe.tags = Array.isArray(recipe.tags) ? recipe.tags : [];
    
    console.log(`✅ Recipe extracted: ${recipe.name}`);
    
    return res.status(200).json({
      success: true,
      recipe: recipe
    });
    
  } catch (error) {
    console.error('❌ Recipe extraction error:', error.message);
    
    // Gestion d'erreurs spécifiques
    if (error.name === 'AbortError') {
      return res.status(504).json({ 
        success: false, 
        error: 'Timeout lors de la récupération de la page' 
      });
    }
    
    if (error.message.includes('JSON')) {
      return res.status(422).json({ 
        success: false, 
        error: 'Impossible de parser la recette' 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Erreur lors de l\'extraction' 
    });
  }
}