import * as cheerio from 'cheerio';

// Fonction pour décoder les entités HTML
function decodeHTMLEntities(text) {
  if (!text) return '';
  
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x20;': ' ',
    '&#xE0;': 'à',
    '&#xE8;': 'è',
    '&#xE9;': 'é',
    '&#xEA;': 'ê',
    '&#xEB;': 'ë',
    '&#xF4;': 'ô',
    '&#xF9;': 'ù',
    '&#xE7;': 'ç',
    '&#x3A;': ':',
    '&#x3B;': ';',
    '&#x21;': '!',
    '&#x3F;': '?',
    '&#x2C;': ',',
    '&nbsp;': ' ',
    '&#xE2;': 'â',
    '&#xEE;': 'î',
    '&#xFB;': 'û',
    '&#xF6;': 'ö',
    '&#xFC;': 'ü',
    '&#xE4;': 'ä'
  };
  
  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'gi'), char);
  }
  
  // Décoder les entités numériques
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec)));
  decoded = decoded.replace(/&#x([0-9A-F]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
  
  return decoded.trim();
}

// Parser les quantités et unités
function parseIngredientLine(text) {
  if (!text) return null;
  
  // Nettoyer le texte
  text = decodeHTMLEntities(text.trim());
  if (!text || text.length < 2) return null;
  
  // Patterns pour extraire quantité, unité et nom
  const patterns = [
    // "200 g de farine", "2 c. à soupe d'huile"
    /^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|cl|dl|c\.?\s*à\s*s\.?|c\.?\s*à\s*c\.?|cuillères?\s*à\s*soupe|cuillères?\s*à\s*café|tasse|verre|pincée|poignée|gousse|tranche|feuille)\s+(?:de\s+|d[''])?(.+)$/i,
    // "2 oeufs", "1 tomate", "quelques feuilles de basilic"
    /^(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|quelques)\s+(.+)$/i,
    // "sel, poivre" (sans quantité)
    /^(.+)$/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (match.length === 4) {
        // Pattern avec quantité, unité et nom
        return {
          quantity: parseFloat(match[1].replace(',', '.')) || 1,
          unit: normalizeUnit(match[2]),
          name: match[3].trim()
        };
      } else if (match.length === 3) {
        // Pattern avec quantité et nom
        const quantity = parseQuantityWord(match[1]);
        return {
          quantity,
          unit: 'unité',
          name: match[2].trim()
        };
      } else {
        // Pattern nom seul
        return {
          quantity: 1,
          unit: 'selon goût',
          name: match[1].trim()
        };
      }
    }
  }
  
  return {
    quantity: 1,
    unit: 'unité',
    name: text
  };
}

// Convertir les mots en nombres
function parseQuantityWord(word) {
  const numbers = {
    'un': 1, 'une': 1, 'deux': 2, 'trois': 3, 'quatre': 4,
    'cinq': 5, 'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9, 'dix': 10,
    'quelques': 3
  };
  return numbers[word.toLowerCase()] || parseFloat(word) || 1;
}

// Normaliser les unités
function normalizeUnit(unit) {
  const unitMap = {
    'c. à s.': 'c.à.s',
    'c à s': 'c.à.s',
    'cuillère à soupe': 'c.à.s',
    'cuillères à soupe': 'c.à.s',
    'c. à c.': 'c.à.c',
    'c à c': 'c.à.c',
    'cuillère à café': 'c.à.c',
    'cuillères à café': 'c.à.c'
  };
  
  const normalized = unit.toLowerCase().trim();
  return unitMap[normalized] || normalized;
}

// Parser la durée
function parseDuration(text) {
  if (!text) return 0;
  
  const match = text.match(/(\d+)\s*h(?:\s*(\d+))?|(\d+)\s*min/i);
  if (match) {
    if (match[1]) {
      // Format heures
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2] || '0');
      return hours * 60 + minutes;
    } else if (match[3]) {
      // Format minutes
      return parseInt(match[3]);
    }
  }
  
  return 30; // Valeur par défaut
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
    
    if (!url || !url.includes('marmiton')) {
      return res.status(400).json({ error: 'URL Marmiton requise' });
    }
    
    console.log(`🥘 Parsing Marmiton recipe with specialized parser: ${url}`);
    
    // Fetch la page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extraction du JSON-LD (si disponible)
    let jsonLdData = null;
    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const data = JSON.parse($(elem).html());
        if (data['@type'] === 'Recipe' || (Array.isArray(data) && data.some(item => item['@type'] === 'Recipe'))) {
          jsonLdData = Array.isArray(data) ? data.find(item => item['@type'] === 'Recipe') : data;
        }
      } catch (e) {
        // Ignorer les erreurs de parsing JSON
      }
    });
    
    // Extraction du titre
    let name = '';
    if (jsonLdData?.name) {
      name = decodeHTMLEntities(jsonLdData.name);
    } else {
      // Sélecteurs spécifiques Marmiton
      name = $('h1.SHRD__sc-10plygc-0').text() ||
             $('h1[data-testid="recipe-title"]').text() ||
             $('h1.recipe-title').text() ||
             $('h1').first().text() ||
             $('meta[property="og:title"]').attr('content') || '';
      name = decodeHTMLEntities(name.replace(' - Marmiton', ''));
    }
    
    // Extraction de la description
    let description = '';
    if (jsonLdData?.description) {
      description = decodeHTMLEntities(jsonLdData.description);
    } else {
      description = $('meta[name="description"]').attr('content') ||
                   $('.recipe-description').text() ||
                   '';
      description = decodeHTMLEntities(description);
    }
    
    // Extraction de l'image
    let image_url = '';
    if (jsonLdData?.image) {
      image_url = Array.isArray(jsonLdData.image) ? jsonLdData.image[0] : jsonLdData.image;
      if (typeof image_url === 'object') {
        image_url = image_url.url || '';
      }
    } else {
      image_url = $('meta[property="og:image"]').attr('content') ||
                 $('img.recipe-media').attr('src') ||
                 '';
    }
    
    // Extraction des temps
    let prep_time = 0;
    let cook_time = 0;
    
    if (jsonLdData?.prepTime) {
      prep_time = parseDuration(jsonLdData.prepTime);
    } else {
      // Chercher dans le HTML
      const prepText = $('span:contains("Préparation")').next().text() ||
                      $('div:contains("Préparation")').find('span').text() ||
                      '';
      prep_time = parseDuration(prepText);
    }
    
    if (jsonLdData?.cookTime) {
      cook_time = parseDuration(jsonLdData.cookTime);
    } else {
      const cookText = $('span:contains("Cuisson")').next().text() ||
                      $('div:contains("Cuisson")').find('span').text() ||
                      '';
      cook_time = parseDuration(cookText);
    }
    
    // Extraction des portions
    let servings = 4;
    if (jsonLdData?.recipeYield) {
      const yieldText = String(jsonLdData.recipeYield);
      const match = yieldText.match(/\d+/);
      servings = match ? parseInt(match[0]) : 4;
    } else {
      const servingsText = $('.recipe-infos__quantity').text() ||
                          $('span:contains("Nombre de parts")').next().text() ||
                          '';
      const match = servingsText.match(/\d+/);
      servings = match ? parseInt(match[0]) : 4;
    }
    
    // Extraction des ingrédients - PARTIE CRITIQUE
    const ingredients = [];
    
    if (jsonLdData?.recipeIngredient && Array.isArray(jsonLdData.recipeIngredient)) {
      // Utiliser les données JSON-LD
      for (const ing of jsonLdData.recipeIngredient) {
        const parsed = parseIngredientLine(ing);
        if (parsed && parsed.name) {
          ingredients.push({
            name: parsed.name,
            quantity: parsed.quantity,
            unit: parsed.unit,
            is_essential: true
          });
        }
      }
    }
    
    // Si pas d'ingrédients dans JSON-LD, parser le HTML
    if (ingredients.length === 0) {
      // Sélecteurs modernes Marmiton
      const selectors = [
        '.recipe-ingredients__list li',
        '.RCP__sc-1qnswg8-1 li',
        'div[class*="ingredient"] span',
        '.recipe-ingredient-list li',
        '.recipe-ingredients li',
        // Sélecteur pour la nouvelle structure avec quantité/unité/nom séparés
        '.recipe-ingredients__list .MuiGrid-container'
      ];
      
      for (const selector of selectors) {
        $(selector).each((i, elem) => {
          const $elem = $(elem);
          let ingredientText = '';
          
          // Gérer le cas où quantité et nom sont dans des spans séparés
          const spans = $elem.find('span');
          if (spans.length >= 2) {
            // Assembler les spans
            ingredientText = spans.map((i, span) => $(span).text()).get().join(' ');
          } else {
            ingredientText = $elem.text();
          }
          
          const parsed = parseIngredientLine(ingredientText);
          if (parsed && parsed.name && parsed.name.length > 1) {
            // Éviter les doublons
            const exists = ingredients.some(ing => ing.name === parsed.name);
            if (!exists) {
              ingredients.push({
                name: parsed.name,
                quantity: parsed.quantity,
                unit: parsed.unit,
                is_essential: true
              });
            }
          }
        });
        
        if (ingredients.length > 0) break;
      }
    }
    
    // Extraction des instructions
    let instructions = '';
    
    if (jsonLdData?.recipeInstructions) {
      if (typeof jsonLdData.recipeInstructions === 'string') {
        instructions = decodeHTMLEntities(jsonLdData.recipeInstructions);
      } else if (Array.isArray(jsonLdData.recipeInstructions)) {
        instructions = jsonLdData.recipeInstructions
          .map((step, i) => {
            const text = typeof step === 'string' ? step : step.text || step.name || '';
            return `${i + 1}. ${decodeHTMLEntities(text)}`;
          })
          .join('\n');
      }
    }
    
    if (!instructions) {
      // Parser depuis le HTML
      const steps = [];
      $('.recipe-preparation__list li').each((i, elem) => {
        const stepText = decodeHTMLEntities($(elem).text().trim());
        if (stepText) {
          steps.push(`${i + 1}. ${stepText}`);
        }
      });
      instructions = steps.join('\n');
    }
    
    // Construire la réponse
    const recipe = {
      name: name || 'Recette Marmiton',
      description,
      image_url,
      cuisine_category: 'Française',
      meal_type: guessMealType(name),
      prep_time: prep_time || 15,
      cook_time: cook_time || 30,
      servings,
      difficulty: 2,
      instructions: instructions || 'Voir la recette sur Marmiton',
      ingredients,
      tags: ['Marmiton'],
      source_url: url,
      confidence: ingredients.length > 0 ? 0.9 : 0.5
    };
    
    console.log(`✅ Parsed Marmiton recipe: ${recipe.name} with ${recipe.ingredients.length} ingredients`);
    
    res.status(200).json({
      success: true,
      recipe,
      method: 'marmiton-specialized'
    });
    
  } catch (error) {
    console.error('❌ Error parsing Marmiton recipe:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to parse Marmiton recipe'
    });
  }
}

// Deviner le type de repas
function guessMealType(name) {
  const lowername = name.toLowerCase();
  
  if (lowername.includes('petit déjeuner') || lowername.includes('pancake')) {
    return 'breakfast';
  } else if (lowername.includes('dessert') || lowername.includes('gâteau') || lowername.includes('tarte')) {
    return 'dessert';
  } else if (lowername.includes('apéritif') || lowername.includes('entrée')) {
    return 'appetizer';
  } else if (lowername.includes('soupe') || lowername.includes('salade')) {
    return 'lunch';
  }
  
  return 'dinner';
}