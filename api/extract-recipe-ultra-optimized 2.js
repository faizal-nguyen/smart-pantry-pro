import * as cheerio from 'cheerio';

// Fonction pour extraire les données structurées (JSON-LD, microdata)
function extractStructuredData(html) {
  const $ = cheerio.load(html);
  
  // Chercher JSON-LD
  const jsonLdScripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < jsonLdScripts.length; i++) {
    try {
      const data = JSON.parse($(jsonLdScripts[i]).html());
      if (data['@type'] === 'Recipe' || (Array.isArray(data['@graph']) && data['@graph'].some(item => item['@type'] === 'Recipe'))) {
        return JSON.stringify(data);
      }
    } catch (e) {
      // Ignorer les erreurs de parsing
    }
  }
  
  // Chercher microdata
  const recipeElement = $('[itemtype*="schema.org/Recipe"]').first();
  if (recipeElement.length) {
    return recipeElement.html();
  }
  
  return null;
}

// Fonction pour extraire le contenu pertinent avec sélecteurs
function extractRelevantContent(html) {
  const $ = cheerio.load(html);
  
  // Supprimer les éléments inutiles
  $('script, style, nav, header, footer, aside, .ads, .comments, .social-share').remove();
  
  // Sélecteurs prioritaires pour les recettes
  const recipeSelectors = [
    '.recipe-card',
    '.recipe-content',
    '[class*="recipe-"]',
    '.ingredients',
    '.instructions',
    '.directions',
    '[id*="recipe"]',
    'article',
    'main'
  ];
  
  // Chercher le contenu avec les sélecteurs
  for (const selector of recipeSelectors) {
    const element = $(selector).first();
    if (element.length && element.text().length > 100) {
      // Garder uniquement le texte et les structures importantes
      const cleanedHtml = element.html()
        .replace(/<img[^>]*>/g, '') // Supprimer les images
        .replace(/<video[^>]*>.*?<\/video>/g, '') // Supprimer les vidéos
        .replace(/\s+/g, ' ') // Normaliser les espaces
        .trim();
      
      if (cleanedHtml.length > 100) {
        return cleanedHtml.substring(0, 5000); // Max 5KB
      }
    }
  }
  
  // Fallback: extraire le body principal
  const body = $('body').html() || html;
  return body.substring(0, 5000);
}

// Fonction pour détecter si le contenu nécessite une traduction
function needsTranslation(content) {
  // Mots-clés français courants
  const frenchKeywords = ['beurre', 'farine', 'œuf', 'sel', 'poivre', 'cuire', 'ajouter'];
  const lowerContent = content.toLowerCase();
  const frenchCount = frenchKeywords.filter(word => lowerContent.includes(word)).length;
  
  // Si plus de 2 mots français trouvés, pas besoin de traduction
  return frenchCount < 2;
}

// Fonction pour choisir le modèle optimal
function selectOptimalModel(content, needsTranslation) {
  // Pour les recettes simples en anglais sans traduction
  if (!needsTranslation && content.length < 3000) {
    return 'gpt-3.5-turbo';
  }
  // Pour les recettes complexes ou nécessitant une traduction
  return 'gpt-4o-mini';
}

// Cache en mémoire simple
const recipeCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 heures

// Sites problématiques connus (SPA, paywalls, etc.)
const PROBLEMATIC_SITES = [
  'cookdtv.com',
  'instagram.com',
  'facebook.com',
  'tiktok.com',
  'pinterest.com',
  'youtube.com'
];

function getCachedRecipe(url) {
  const cached = recipeCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('✨ Cache hit for URL:', url);
    return cached.recipe;
  }
  return null;
}

function setCachedRecipe(url, recipe) {
  recipeCache.set(url, {
    recipe,
    timestamp: Date.now()
  });
  
  // Limiter la taille du cache (max 100 entrées)
  if (recipeCache.size > 100) {
    const firstKey = recipeCache.keys().next().value;
    recipeCache.delete(firstKey);
  }
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
    
    // Vérifier si le site est problématique
    const isProblematicSite = PROBLEMATIC_SITES.some(site => url.includes(site));
    if (isProblematicSite) {
      console.log('⚠️ Problematic site detected:', url);
      return res.status(400).json({
        success: false,
        error: 'Ce site nécessite une extraction manuelle. Utilisez le formulaire pour saisir la recette.'
      });
    }
    
    // Vérifier le cache
    const cachedRecipe = getCachedRecipe(url);
    if (cachedRecipe) {
      return res.status(200).json({
        success: true,
        recipe: cachedRecipe,
        cached: true
      });
    }
    
    console.log(`🚀 Optimized extraction for: ${url}`);
    const startTime = Date.now();
    
    // 1. Fetch la page avec un timeout court
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RecipeBot/1.0)',
        'Accept': 'text/html',
        'Accept-Language': 'fr,en'
      },
      signal: AbortSignal.timeout(5000) // 5 secondes max
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    
    const html = await response.text();
    console.log(`📄 HTML fetched in ${Date.now() - startTime}ms`);
    
    // 2. Extraction intelligente du contenu
    let relevantContent = extractStructuredData(html);
    const isStructuredData = !!relevantContent;
    
    if (!relevantContent) {
      relevantContent = extractRelevantContent(html);
    }
    
    console.log(`📊 Content extracted: ${relevantContent.length} chars (structured: ${isStructuredData})`);
    
    // 3. Déterminer si une traduction est nécessaire
    const translationNeeded = needsTranslation(relevantContent);
    const model = selectOptimalModel(relevantContent, translationNeeded);
    
    console.log(`🤖 Using model: ${model} (translation: ${translationNeeded})`);
    
    // 4. Prompt optimisé selon le contexte
    const prompt = isStructuredData ? 
      `Extract recipe from this structured data. ${translationNeeded ? 'Translate to French.' : ''} Return JSON only:` :
      `Extract recipe information. ${translationNeeded ? 'Translate everything to French.' : ''} Return this exact JSON structure:
{
  "name": "recipe name",
  "description": "short description",
  "cuisine_type": "cuisine type",
  "meal_type": "breakfast|lunch|dinner|dessert|appetizer|snack",
  "prep_time": minutes as number,
  "cook_time": minutes as number,
  "servings": number,
  "difficulty": "easy|medium|hard",
  "ingredients": [{"name": "ingredient", "quantity": number, "unit": "unit", "notes": "optional"}],
  "instructions": ["step 1", "step 2"],
  "tags": ["tag1", "tag2"],
  "image_url": "main image URL if found"
}`;

    // 5. Appel API OpenAI optimisé
    const openaiStart = Date.now();
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a recipe extraction expert. Extract recipe data and return valid JSON only.'
          },
          {
            role: 'user',
            content: `${prompt}\n\nContent:\n${relevantContent}`
          }
        ],
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      }),
    });
    
    if (!openaiResponse.ok) {
      throw new Error('OpenAI API error');
    }
    
    const openaiData = await openaiResponse.json();
    console.log(`🤖 OpenAI response in ${Date.now() - openaiStart}ms`);
    
    const content = openaiData.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }
    
    // 6. Parser et normaliser la réponse
    let recipe;
    try {
      recipe = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Content received:', content);
      throw new Error(`Invalid JSON response: ${parseError.message}`);
    }
    
    // Normaliser les données
    const normalizedRecipe = {
      name: recipe.name || 'Recette sans nom',
      description: recipe.description || '',
      cuisine_type: recipe.cuisine_type || 'Non spécifié',
      meal_type: recipe.meal_type || 'dinner',
      prep_time: parseInt(recipe.prep_time) || 15,
      cook_time: parseInt(recipe.cook_time) || 30,
      total_time: recipe.total_time || (parseInt(recipe.prep_time || 15) + parseInt(recipe.cook_time || 30)),
      servings: parseInt(recipe.servings) || 4,
      difficulty: recipe.difficulty || 'medium',
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.map(ing => ({
        name: ing.name || '',
        quantity: parseFloat(ing.quantity) || 1,
        unit: ing.unit || 'unité',
        notes: ing.notes || ''
      })).filter(ing => ing.name) : [],
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
      nutrition: recipe.nutrition || null,
      tags: Array.isArray(recipe.tags) ? recipe.tags : [],
      image_url: recipe.image_url || '',
      source_url: url
    };
    
    // Validation pour éviter les recettes vides
    const isValidRecipe = normalizedRecipe.name !== 'Recette sans nom' && 
                         normalizedRecipe.ingredients.length > 0 && 
                         normalizedRecipe.instructions.length > 0;
    
    if (!isValidRecipe) {
      console.error('⚠️ Recipe extraction returned empty data');
      
      // Pour les sites SPA comme cookdtv.com, suggérer l'extraction manuelle
      if (url.includes('cookdtv.com')) {
        throw new Error('Ce site nécessite une extraction manuelle. Copiez-collez la recette dans le formulaire.');
      }
      
      throw new Error('Extraction incomplète - données essentielles manquantes. Essayez de copier-coller la recette manuellement.');
    }
    
    // 7. Mettre en cache
    setCachedRecipe(url, normalizedRecipe);
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ Recipe extracted in ${totalTime}ms (model: ${model})`);
    
    res.status(200).json({
      success: true,
      recipe: normalizedRecipe,
      performance: {
        total_time_ms: totalTime,
        model_used: model,
        content_size: relevantContent.length,
        structured_data: isStructuredData
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract recipe'
    });
  }
}