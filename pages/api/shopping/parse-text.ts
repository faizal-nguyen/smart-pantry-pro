import { NextApiRequest, NextApiResponse } from 'next';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

const DEFAULT_STORE_SECTIONS = [
  'Fruits et Légumes',
  'Boucherie',
  'Poissonnerie', 
  'Crémerie',
  'Boulangerie',
  'Épicerie salée',
  'Épicerie sucrée',
  'Boissons',
  'Surgelés',
  'Hygiène',
  'Entretien',
  'Autres'
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Texte manquant ou invalide' });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }
    
    // Prompt système optimisé
    const systemPrompt = `Tu es un assistant expert en courses.
    
Analyse le texte pour extraire TOUS les produits mentionnés.
Le texte peut être :
- Une liste simple (tomates, lait, pain)
- Une liste avec quantités (2kg tomates, 1L lait)
- Une recette (pour la tarte: farine, beurre, pommes)
- Une note désorganisée
- Un message WhatsApp/SMS
- Une liste à puces

Pour chaque produit :
- productName: nom du produit (sans la quantité)
- quantity: quantité numérique (défaut: 1)
- unit: unité (pièce, kg, g, L, ml, paquet, boîte, etc.)
- category: catégorie générale
- storeSection: rayon parmi [${DEFAULT_STORE_SECTIONS.join(', ')}]
- confidence: niveau de confiance 0-1

Règles importantes :
- Extrais TOUS les produits même s'ils sont mal orthographiés
- Devine intelligemment les quantités manquantes
- Normalise les unités (litre→L, kilogramme→kg)
- "un" ou "une" = quantity: 1
- "du" ou "de la" = quantity: 1, unit: selon produit
- Sépare les produits composés (ex: "pain et beurre" → 2 items)

Retourne UNIQUEMENT un JSON valide.`;

    const userPrompt = `Extrais TOUS les produits de ce texte :
"${text}"

Format JSON requis :
{
  "items": [
    {
      "productName": "string",
      "quantity": number,
      "unit": "string",
      "category": "string",
      "storeSection": "string",
      "confidence": number
    }
  ]
}`;

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const parsed = JSON.parse(
      data.choices[0].message.content || '{"items":[]}'
    );
    
    // Enrichissement avec prix estimés
    const enrichedItems = parsed.items.map((item: any) => ({
      ...item,
      estimatedPrice: estimatePrice(item),
      addedVia: 'text',
      timestamp: new Date().toISOString()
    }));
    
    res.status(200).json({
      success: true,
      items: enrichedItems,
      originalText: text,
      stats: {
        textLength: text.length,
        itemsCount: enrichedItems.length
      }
    });
    
  } catch (error) {
    console.error('Erreur parsing texte:', error);
    res.status(500).json({ error: 'Erreur lors de l\'analyse du texte' });
  }
}

function estimatePrice(item: any): number {
  const priceMap: Record<string, number> = {
    'Fruits et Légumes': 2.5,
    'Boucherie': 8.5,
    'Poissonnerie': 12,
    'Crémerie': 3.5,
    'Boulangerie': 2,
    'Épicerie salée': 3,
    'Épicerie sucrée': 3.5,
    'Boissons': 2.5,
    'Surgelés': 4,
    'Hygiène': 4.5,
    'Entretien': 5,
    'Autres': 3
  };
  
  return (priceMap[item.storeSection] || 3) * item.quantity;
}