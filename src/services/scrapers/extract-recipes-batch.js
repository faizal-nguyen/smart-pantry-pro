// API endpoint pour extraire plusieurs recettes en batch avec OpenAI
export default async function handler(req, res) {
  // CORS headers - Allow localhost development
  const origin = req.headers.origin;
  const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173', 'https://smart-pantry-pro.vercel.app'];
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { urls } = req.body;
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'URLs array is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'OpenAI API key not configured' });
    }

    console.log(`🤖 Extracting batch of ${urls.length} recipes...`);

    // Limiter à 5 URLs par batch pour éviter timeout
    const batchUrls = urls.slice(0, 5);
    const recipes = [];

    // Fetch toutes les pages en parallèle
    const pagePromises = batchUrls.map(url => 
      fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        }
      }).then(r => r.text()).catch(() => null)
    );

    const pages = await Promise.all(pagePromises);

    // Construire le prompt pour extraction en batch
    const batchPrompt = `Tu es un expert en extraction de recettes de cuisine indiennes.
    
Je te donne ${pages.filter(p => p).length} pages HTML de recettes. Extrais TOUTES les informations pour CHAQUE recette.

${pages.map((html, idx) => html ? `
=== RECETTE ${idx + 1} (URL: ${batchUrls[idx]}) ===
${html.substring(0, 15000)}
` : '').join('\n')}

Pour CHAQUE recette, retourne un objet avec cette structure EXACTE:
{
  "name": "Nom exact de la recette",
  "description": "Description courte",
  "ingredients": [
    {
      "name": "nom de l'ingrédient",
      "quantity": nombre_decimal,
      "unit": "g|kg|ml|l|cup|tsp|tbsp|piece",
      "isEssential": true/false
    }
  ],
  "instructions": [
    "Étape 1 complète",
    "Étape 2 complète"
  ],
  "prepTime": nombre_minutes,
  "cookTime": nombre_minutes,
  "servings": nombre_portions,
  "difficulty": "easy|medium|hard",
  "dietaryInfo": ["vegetarian", "vegan", etc],
  "spiceLevel": 1-5,
  "sourceUrl": "URL de la recette"
}

IMPORTANT: Retourne un ARRAY JSON contenant TOUTES les recettes extraites.`;

    // Appel OpenAI pour extraction batch
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
            content: 'Tu es un assistant spécialisé dans l\'extraction de recettes indiennes. Tu réponds UNIQUEMENT avec du JSON valide.'
          },
          {
            role: 'user',
            content: batchPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
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

    // Parser la réponse
    let extractedData;
    try {
      extractedData = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Extraire les recettes (peut être un array ou un objet avec propriété recipes)
    const extractedRecipes = Array.isArray(extractedData) 
      ? extractedData 
      : (extractedData.recipes || [extractedData]);

    // Calculer le coût approximatif
    const tokensUsed = openaiData.usage?.total_tokens || 0;
    const cost = (tokensUsed / 1000) * 0.0015; // Prix approximatif GPT-4-mini

    console.log(`✅ Extracted ${extractedRecipes.length} recipes - Cost: €${cost.toFixed(3)}`);

    res.status(200).json({
      success: true,
      recipes: extractedRecipes,
      cost: cost,
      tokensUsed: tokensUsed
    });

  } catch (error) {
    console.error('❌ Batch extraction error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract recipes'
    });
  }
}