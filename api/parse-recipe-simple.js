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
      throw new Error('OpenAI API key not configured');
    }

    console.log(`🤖 Testing OpenAI API with URL: ${url}`);

    // Test simple avec OpenAI
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
            content: 'Tu es un assistant qui extrait des recettes. Réponds toujours en JSON valide.'
          },
          {
            role: 'user',
            content: `Donne-moi un exemple simple de recette au format JSON avec ces champs: name, ingredients (array), servings (number). URL: ${url}`
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const data = await openaiResponse.json();
    const content = data.choices?.[0]?.message?.content;

    console.log('OpenAI response:', content);

    let recipe;
    try {
      recipe = JSON.parse(content);
    } catch (e) {
      // Si ce n'est pas du JSON valide, renvoyer le texte
      recipe = { rawResponse: content };
    }

    res.status(200).json({
      success: true,
      recipe: recipe,
      message: 'OpenAI API is working!'
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'API failed'
    });
  }
}