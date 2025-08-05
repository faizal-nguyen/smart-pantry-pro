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
    // Parse body
    let body = req.body;
    if (!body && req.readable) {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const rawBody = Buffer.concat(chunks).toString();
      try {
        body = JSON.parse(rawBody);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON' });
      }
    }
    
    const { url } = body || {};
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'OpenAI API key not configured' });
    }
    
    console.log(`🤖 Extracting recipe from URL: ${url}`);
    
    // 1. Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    
    let html = await response.text();
    
    // Limiter la taille du HTML
    if (html.length > 20000) {
      // Garder le contenu principal (head + body partiel)
      const headEnd = html.indexOf('</head>');
      const bodyStart = html.indexOf('<body');
      if (headEnd > 0 && bodyStart > 0) {
        const head = html.substring(0, headEnd + 7);
        const body = html.substring(bodyStart, Math.min(html.length, bodyStart + 15000));
        html = head + body;
      } else {
        html = html.substring(0, 20000);
      }
    }
    
    // 2. Prompt optimisé pour OpenAI
    const prompt = `Tu es un expert en extraction de recettes de cuisine. Analyse cette page web et extrais TOUTES les informations de la recette.

URL: ${url}

IMPORTANT: 
- Extrais TOUS les ingrédients avec leurs quantités exactes
- Décode les entités HTML (&#x20; = espace, &#xE0; = à, &#xE9; = é, etc.)
- Les quantités doivent être des nombres (pas de texte)
- Retourne UNIQUEMENT du JSON valide, sans commentaires

HTML à analyser:
${html}

Retourne un objet JSON avec cette structure EXACTE:
{
  "name": "Nom exact de la recette",
  "description": "Description courte de la recette",
  "cuisine_type": "Type de cuisine (Française, Italienne, Asiatique, etc.)",
  "meal_type": "breakfast|lunch|dinner|dessert|appetizer|snack",
  "prep_time": nombre_en_minutes,
  "cook_time": nombre_en_minutes,
  "total_time": nombre_en_minutes,
  "servings": nombre_de_portions,
  "difficulty": "easy|medium|hard",
  "ingredients": [
    {
      "name": "nom de l'ingrédient",
      "quantity": nombre_decimal,
      "unit": "g|kg|ml|l|cl|c.à.s|c.à.c|unité|pincée|selon goût",
      "notes": "précisions optionnelles"
    }
  ],
  "instructions": [
    "Étape 1: description",
    "Étape 2: description"
  ],
  "nutrition": {
    "calories": nombre_par_portion,
    "protein": nombre_en_g,
    "carbs": nombre_en_g,
    "fat": nombre_en_g
  },
  "tags": ["tag1", "tag2"],
  "image_url": "URL de l'image principale"
}`;
    
    // 3. Appel à OpenAI
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
            content: 'Tu es un assistant spécialisé dans l\'extraction de recettes. Tu réponds UNIQUEMENT avec du JSON valide, sans aucun texte supplémentaire.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    });
    
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error('OpenAI API error');
    }
    
    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from OpenAI');
    }
    
    // 4. Parser et valider la réponse
    let recipe;
    try {
      recipe = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid JSON response from OpenAI');
    }
    
    // 5. Normaliser et valider les données
    const normalizedRecipe = {
      name: recipe.name || 'Recette sans nom',
      description: recipe.description || '',
      cuisine_type: recipe.cuisine_type || 'Non spécifié',
      meal_type: recipe.meal_type || 'dinner',
      prep_time: parseInt(recipe.prep_time) || 15,
      cook_time: parseInt(recipe.cook_time) || 30,
      total_time: parseInt(recipe.total_time) || parseInt(recipe.prep_time || 15) + parseInt(recipe.cook_time || 30),
      servings: parseInt(recipe.servings) || 4,
      difficulty: recipe.difficulty || 'medium',
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.map(ing => ({
        name: ing.name || '',
        quantity: parseFloat(ing.quantity) || 1,
        unit: ing.unit || 'unité',
        notes: ing.notes || ''
      })).filter(ing => ing.name) : [],
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions : 
                   typeof recipe.instructions === 'string' ? recipe.instructions.split('\n').filter(s => s.trim()) : [],
      nutrition: recipe.nutrition || null,
      tags: Array.isArray(recipe.tags) ? recipe.tags : [],
      image_url: recipe.image_url || '',
      source_url: url
    };
    
    // Vérifier qu'on a au moins le nom et des ingrédients
    if (!normalizedRecipe.name || normalizedRecipe.ingredients.length === 0) {
      throw new Error('Extraction incomplète - données essentielles manquantes');
    }
    
    console.log(`✅ Recipe extracted: ${normalizedRecipe.name} with ${normalizedRecipe.ingredients.length} ingredients`);
    
    res.status(200).json({
      success: true,
      recipe: normalizedRecipe
    });
    
  } catch (error) {
    console.error('❌ Error extracting recipe:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract recipe'
    });
  }
}