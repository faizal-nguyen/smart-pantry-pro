// API endpoint pour traduction en batch avec cache
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
    const { texts, sourceLang = 'en', targetLang = 'fr', context = 'culinary' } = req.body;
    
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ error: 'Texts array is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'OpenAI API key not configured' });
    }

    console.log(`🌐 Translating batch of ${texts.length} texts...`);

    // Limiter à 50 textes par batch
    const batchTexts = texts.slice(0, 50);

    // Construire le prompt de traduction
    const translationPrompt = `Tu es un chef cuisinier français expert en traduction culinaire.

Traduis ces ${batchTexts.length} textes de l'${sourceLang === 'en' ? 'anglais' : sourceLang} vers le ${targetLang === 'fr' ? 'français' : targetLang}.

IMPORTANT pour la traduction culinaire:
1. Utilise le vocabulaire culinaire approprié
2. Convertis les mesures (cups → tasses/ml, oz → g, etc.)
3. Garde les noms d'épices indiennes avec explication si nécessaire
4. Fahrenheit → Celsius pour les températures

Textes à traduire:
${batchTexts.map((text, idx) => `[${idx}]: ${text}`).join('\n')}

Retourne un objet JSON avec cette structure:
{
  "translations": [
    "traduction du texte 0",
    "traduction du texte 1",
    ...
  ]
}

IMPORTANT: L'ordre des traductions DOIT correspondre exactement à l'ordre des textes originaux.`;

    // Appel OpenAI pour traduction
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
            content: 'Tu es un traducteur culinaire expert. Tu réponds UNIQUEMENT avec du JSON valide.'
          },
          {
            role: 'user',
            content: translationPrompt
          }
        ],
        temperature: 0.3,
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

    // Parser la réponse
    let translationData;
    try {
      translationData = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Calculer le coût
    const tokensUsed = openaiData.usage?.total_tokens || 0;
    const cost = (tokensUsed / 1000) * 0.0015; // Prix GPT-4-mini

    console.log(`✅ Translated ${batchTexts.length} texts - Cost: €${cost.toFixed(3)}`);

    res.status(200).json({
      success: true,
      translations: translationData.translations || [],
      cost: cost,
      tokensUsed: tokensUsed
    });

  } catch (error) {
    console.error('❌ Translation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to translate texts'
    });
  }
}