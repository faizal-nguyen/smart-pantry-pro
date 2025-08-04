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
    const { url, source } = req.body || {};

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`Parsing recipe from: ${url}`);

    // 1. Fetch la page
    const pageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    if (!pageResponse.ok) {
      throw new Error(`Failed to fetch page: ${pageResponse.status}`);
    }

    const html = await pageResponse.text();
    console.log(`Fetched HTML: ${html.length} characters`);

    // 2. Limiter le HTML
    const cleanHtml = html
      .replace(/<script[^>]*>.*?<\/script>/gsi, '')
      .replace(/<style[^>]*>.*?<\/style>/gsi, '')
      .substring(0, 10000);

    // 3. Appel OpenAI simple
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Tu es un assistant qui extrait des recettes. Réponds UNIQUEMENT avec du JSON valide.'
          },
          {
            role: 'user',
            content: `Extrait la recette de ce HTML. Retourne un JSON avec: name, ingredients (array de strings), servings (number), instructions (string).

HTML:
${cleanHtml.substring(0, 3000)}

Retourne UNIQUEMENT le JSON, sans texte avant ou après.`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      })
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      throw new Error(`OpenAI error: ${error}`);
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content;

    console.log('OpenAI response:', content);

    // 4. Parser le JSON
    let recipe;
    try {
      // Nettoyer la réponse
      const cleaned = content
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
        
      recipe = JSON.parse(cleaned);
    } catch (e) {
      // Si le parsing échoue, retourner quand même quelque chose
      recipe = {
        name: "Recette extraite",
        ingredients: ["Voir la page originale"],
        servings: 4,
        instructions: content || "Instructions non disponibles",
        parseError: e.message
      };
    }

    res.status(200).json({
      success: true,
      recipe: recipe,
      method: 'ai-v2'
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Parsing failed'
    });
  }
}