const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

// Simple in-memory cache for demo mode
const demoCache = new Map();

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

async function handler(req, res) {
  // CORS Headers
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
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Texte manquant ou invalide' });
    }

    if (!OPENAI_API_KEY) {
      console.log('⚠️ OpenAI API key not configured, using demo mode');
      
      // Check cache first
      if (demoCache.has(text)) {
        console.log('📦 Using cached result');
        return res.status(200).json(demoCache.get(text));
      }
      
      // Parse simple text for better demo
      const items = text.toLowerCase().split(/[,;]/).map((item, index) => {
        const cleanItem = item.trim();
        if (!cleanItem) return null;
        
        // Extract quantity and unit if present
        const quantityMatch = cleanItem.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|litre|kilo|gramme|pièce|unité)?/i);
        const quantity = quantityMatch ? parseFloat(quantityMatch[1].replace(',', '.')) : 1;
        const unit = quantityMatch ? (quantityMatch[2] || 'pièce') : 'pièce';
        const productName = cleanItem.replace(/\d+(?:[.,]\d+)?\s*(kg|g|l|ml|litre|kilo|gramme|pièce|unité)?/i, '').trim();
        
        // Smart categorization
        const { category, storeSection } = categorizeProduct(productName);
        
        return {
          productName: productName || cleanItem,
          quantity,
          unit,
          category,
          storeSection,
          confidence: 0.8
        };
      }).filter(Boolean);
      
      // Demo response for testing
      const demoItems = items.length > 0 ? items : [
        {
          productName: "tomates",
          quantity: 2,
          unit: "kg",
          category: "Légumes",
          storeSection: "Fruits et Légumes",
          confidence: 0.9
        },
        {
          productName: "lait",
          quantity: 1,
          unit: "L",
          category: "Produits laitiers",
          storeSection: "Crémerie",
          confidence: 0.8
        }
      ];
      
      const enrichedItems = demoItems.map((item) => ({
        ...item,
        estimatedPrice: estimatePrice(item),
        addedVia: 'text',
        timestamp: new Date().toISOString()
      }));
      
      const response = {
        success: true,
        items: enrichedItems,
        originalText: text,
        demo: true,
        stats: {
          textLength: text.length,
          itemsCount: enrichedItems.length
        }
      };
      
      // Cache the result
      demoCache.set(text, response);
      
      return res.status(200).json(response);
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
    const enrichedItems = parsed.items.map((item) => ({
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

function categorizeProduct(productName) {
  const product = productName.toLowerCase();
  
  // Fruits et Légumes
  if (product.match(/(tomate|pomme|banane|orange|carotte|courgette|aubergine|poivron|concombre|radis|salade|épinard|brocoli|chou|pomme de terre|oignon|ail|persil|basilic|thym|citron|avocat|kiwi|poire|fraise|raisin|melon|pastèque|mangue|ananas)/)) {
    return { category: 'Fruits et Légumes', storeSection: 'Fruits et Légumes' };
  }
  
  // Boucherie
  if (product.match(/(viande|bœuf|porc|agneau|veau|steak|côte|rôti|escalope|poulet|dinde|canard|jambon|saucisse|merguez|chorizo|lardons)/)) {
    return { category: 'Viandes', storeSection: 'Boucherie' };
  }
  
  // Poissonnerie
  if (product.match(/(poisson|saumon|thon|cabillaud|sole|truite|crevette|moule|huître|crabe|surimi)/)) {
    return { category: 'Poissons', storeSection: 'Poissonnerie' };
  }
  
  // Crémerie / Produits frais
  if (product.match(/(lait|yaourt|fromage|beurre|crème|œuf|mozzarella|emmental|camembert|chèvre|ricotta|mascarpone|parmesan|ravioli|tortellini|gnocchi)/)) {
    return { category: 'Produits laitiers', storeSection: 'Crémerie' };
  }
  
  // Boulangerie
  if (product.match(/(pain|baguette|croissant|brioche|pâtisserie|tarte|gâteau|madeleine|cookie)/)) {
    return { category: 'Boulangerie', storeSection: 'Boulangerie' };
  }
  
  // Épicerie salée
  if (product.match(/(pâte|riz|quinoa|lentille|haricot|pois|farine|huile|vinaigre|moutarde|ketchup|mayonnaise|sauce|épice|sel|poivre|conserve|boîte|olive|cornichon)/)) {
    return { category: 'Épicerie', storeSection: 'Épicerie salée' };
  }
  
  // Épicerie sucrée
  if (product.match(/(sucre|miel|confiture|nutella|chocolat|bonbon|biscuit|céréale|müesli|granola)/)) {
    return { category: 'Sucré', storeSection: 'Épicerie sucrée' };
  }
  
  // Boissons
  if (product.match(/(eau|jus|soda|coca|pepsi|bière|vin|café|thé|tisane|sirop)/)) {
    return { category: 'Boissons', storeSection: 'Boissons' };
  }
  
  // Surgelés (uniquement les vrais surgelés)
  if (product.match(/(surgelé|glace|sorbet|frite|nugget|pizza|plat.*(surgelé|congelé))/)) {
    return { category: 'Surgelés', storeSection: 'Surgelés' };
  }
  
  // Hygiène
  if (product.match(/(savon|shampooing|dentifrice|déodorant|crème|lotion|mouchoir|coton)/)) {
    return { category: 'Hygiène', storeSection: 'Hygiène' };
  }
  
  // Entretien
  if (product.match(/(lessive|liquide.vaisselle|éponge|nettoyant|javel|sac.poubelle|papier.toilette|essuie.tout)/)) {
    return { category: 'Entretien', storeSection: 'Entretien' };
  }
  
  // Par défaut
  return { category: 'Divers', storeSection: 'Autres' };
}

function estimatePrice(item) {
  const priceMap = {
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

export default handler;