import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Types pour parsing recettes (PRP Cipher)
export interface ParsedRecipe {
  name: string;
  description?: string;
  image_url?: string;
  cuisine_category?: string;
  meal_type?: string;
  prep_time: number;
  cook_time: number;
  servings: number;
  difficulty: number;
  instructions: string;
  ingredients: ParsedIngredient[];
  tags: string[];
  source_url: string;
  confidence: number;
  fallback?: boolean;
}

export interface ParsedIngredient {
  name: string;
  quantity: number;
  unit: string;
  is_essential: boolean;
  notes?: string;
  confidence: number;
}

export interface RecipeParsingResult {
  success: boolean;
  data?: ParsedRecipe;
  error?: string;
  confidence: number;
  parsingMethod: 'structured' | 'dom' | 'ai' | 'fallback';
}

// Hook principal pour parsing recettes (pattern API Cipher)
export const useRecipeParser = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pattern principal adapté de useBarcodeAPI
  const parseRecipeFromURL = async (url: string): Promise<RecipeParsingResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const domain = new URL(url).hostname.toLowerCase();
      
      // Router vers parser spécialisé (pattern Cipher)
      switch (true) {
        case domain.includes('marmiton'):
          return await parseMarmitonRecipe(url);
        case domain.includes('750g'):
          return await parse750gRecipe(url);
        case domain.includes('cuisineaz'):
          return await parseCuisineAZRecipe(url);
        case domain.includes('allrecipe'):
          return await parseAllRecipesRecipe(url);
        default:
          return await parseGenericRecipe(url);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        confidence: 0,
        parsingMethod: 'fallback'
      };
    } finally {
      setLoading(false);
    }
  };
  
  return {
    parseRecipeFromURL,
    loading,
    error
  };
};

// Parser Marmiton (pattern Cipher spécialisé)
const parseMarmitonRecipe = async (url: string): Promise<RecipeParsingResult> => {
  try {
    console.log('🥘 Parsing Marmiton recipe with specialized parser:', url);
    
    // Utiliser le nouveau parser spécialisé Marmiton
    const response = await fetch('/api/parse-recipe-marmiton', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Marmiton parser error:', errorData);
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Parsing failed');
    }
    
    // Si le parser spécialisé n'a pas trouvé d'ingrédients, utiliser l'IA
    if (!result.recipe.ingredients || result.recipe.ingredients.length === 0) {
      console.log('⚠️ No ingredients found with specialized parser, falling back to AI...');
      return await parseWithAI(url, 'marmiton');
    }
    
    return {
      success: true,
      data: result.recipe,
      confidence: result.recipe.confidence || 0.9,
      parsingMethod: result.method || 'structured'
    };
    
  } catch (error) {
    console.error('Error with Marmiton specialized parser:', error);
    
    // Fallback vers parsing IA
    return await parseWithAI(url, 'marmiton');
  }
};

// Parser 750g (pattern Cipher spécialisé)  
const parse750gRecipe = async (url: string): Promise<RecipeParsingResult> => {
  try {
    console.log('🍳 Parsing 750g recipe:', url);
    
    const response = await fetch(`/api/parse-recipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, parser: '750g' })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // 750g utilise souvent JSON-LD
    const structuredData = extractJSONLD(html, 'Recipe');
    if (structuredData) {
      const recipe = normalize750gStructuredData(structuredData);
      return {
        success: true,
        data: recipe,
        confidence: 0.9,
        parsingMethod: 'structured'
      };
    }
    
    // Fallback DOM
    const recipe = parse750gDOM(html, url);
    return {
      success: true,
      data: recipe,
      confidence: 0.7,
      parsingMethod: 'dom'
    };
    
  } catch (error) {
    console.error('Error parsing 750g recipe:', error);
    return await parseWithAI(url, '750g');
  }
};

// Parser générique (pattern Cipher fallback)
const parseGenericRecipe = async (url: string): Promise<RecipeParsingResult> => {
  try {
    console.log('🌐 Parsing generic recipe:', url);
    
    const response = await fetch(`/api/parse-recipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, parser: 'generic' })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Try multiple structured data formats
    const jsonLd = extractJSONLD(html, 'Recipe');
    if (jsonLd) {
      const recipe = normalizeGenericStructuredData(jsonLd);
      return {
        success: true,
        data: recipe,
        confidence: 0.8,
        parsingMethod: 'structured'
      };
    }
    
    // Try microdata
    const microdata = extractMicrodata(html, 'Recipe');
    if (microdata) {
      const recipe = normalizeMicrodataRecipe(microdata);
      return {
        success: true,
        data: recipe,
        confidence: 0.7,
        parsingMethod: 'structured'
      };
    }
    
    // Fallback vers IA
    return await parseWithAI(url, 'generic');
    
  } catch (error) {
    console.error('Error parsing generic recipe:', error);
    
    return {
      success: false,
      error: 'Impossible de parser cette recette',
      confidence: 0,
      parsingMethod: 'fallback'
    };
  }
};

// Parser avec IA OpenAI (pattern Cipher AI)
const parseWithAI = async (url: string, source: string, html?: string): Promise<RecipeParsingResult> => {
  try {
    console.log('🤖 Parsing with AI:', url);
    
    // Si on a déjà le HTML, l'envoyer directement
    const body: any = { url, source };
    if (html) {
      body.html = html;
    }
    
    const response = await fetch(`/api/parse-recipe-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'AI parsing failed');
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'AI parsing failed');
    }
    
    return {
      success: true,
      data: result.recipe,
      confidence: result.confidence || 0.6,
      parsingMethod: 'ai'
    };
    
  } catch (error) {
    console.error('AI parsing failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Parsing IA impossible',
      confidence: 0,
      parsingMethod: 'fallback'
    };
  }
};

// Helpers pour extraction données structurées (patterns Cipher)
const extractJSONLD = (html: string, schemaType: string): any => {
  try {
    // Regex pour extraire JSON-LD
    const jsonLdRegex = /<script[^>]*type=["\']application\/ld\+json["\'][^>]*>(.*?)<\/script>/gsi;
    let match;
    const foundScripts = [];
    
    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const jsonText = match[1].trim();
        // Nettoyer le JSON de caractères problématiques
        const cleanedJson = jsonText
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Supprimer caractères de contrôle
          .replace(/\r?\n/g, ' ') // Remplacer retours ligne
          .replace(/\s+/g, ' '); // Normaliser espaces
          
        const jsonData = JSON.parse(cleanedJson);
        foundScripts.push(jsonData);
        
        // Chercher le type Recipe
        if (jsonData['@type'] === schemaType) {
          console.log('✅ Found direct Recipe JSON-LD');
          return jsonData;
        }
        
        // Chercher dans un array
        if (Array.isArray(jsonData)) {
          const recipe = jsonData.find(item => item['@type'] === schemaType);
          if (recipe) {
            console.log('✅ Found Recipe in JSON-LD array');
            return recipe;
          }
        }
        
        // Chercher dans un graph
        if (jsonData['@graph'] && Array.isArray(jsonData['@graph'])) {
          const recipe = jsonData['@graph'].find(item => item['@type'] === schemaType);
          if (recipe) {
            console.log('✅ Found Recipe in JSON-LD graph');
            return recipe;
          }
        }
      } catch (e) {
        console.warn('Failed to parse JSON-LD:', e.message);
        continue;
      }
    }
    
    console.log(`Found ${foundScripts.length} JSON-LD scripts but no Recipe schema`);
    return null;
  } catch (error) {
    console.error('Error extracting JSON-LD:', error);
    return null;
  }
};

const extractMicrodata = (html: string, itemType: string): any => {
  // Extraction microdata basique (pattern Cipher)
  try {
    const microdataRegex = new RegExp(`itemtype="[^"]*${itemType}"[^>]*>(.*?)</[^>]*>`, 'gsi');
    const match = microdataRegex.exec(html);
    
    if (!match) return null;
    
    const content = match[1];
    
    // Extraction des propriétés microdata
    const propRegex = /itemprop="([^"]*)"[^>]*>([^<]*)</gi;
    const properties: Record<string, string> = {};
    let propMatch;
    
    while ((propMatch = propRegex.exec(content)) !== null) {
      properties[propMatch[1]] = propMatch[2].trim();
    }
    
    return Object.keys(properties).length > 0 ? properties : null;
  } catch (error) {
    console.error('Error extracting microdata:', error);
    return null;
  }
};

// Normaliseurs spécialisés (patterns Cipher)
const normalizeMarmitonStructuredData = (data: any): ParsedRecipe => {
  console.log('📋 Normalizing Marmiton structured data');
  
  // Gérer les différents formats de yield
  let servings = 4;
  if (data.recipeYield) {
    if (typeof data.recipeYield === 'string') {
      const match = data.recipeYield.match(/\d+/);
      servings = match ? parseInt(match[0]) : 4;
    } else if (typeof data.recipeYield === 'number') {
      servings = data.recipeYield;
    } else if (Array.isArray(data.recipeYield) && data.recipeYield.length > 0) {
      servings = parseInt(data.recipeYield[0]) || 4;
    }
  }
  
  // Gérer les images (format Marmiton spécifique)
  let imageUrl = '';
  if (data.image) {
    if (typeof data.image === 'string') {
      imageUrl = data.image;
    } else if (data.image.url) {
      imageUrl = data.image.url;
    } else if (Array.isArray(data.image) && data.image.length > 0) {
      imageUrl = typeof data.image[0] === 'string' ? data.image[0] : data.image[0].url || '';
    }
  }
  
  return {
    name: data.name || 'Recette sans nom',
    description: data.description || '',
    image_url: imageUrl,
    cuisine_category: data.recipeCuisine || guessCuisineFromName(data.name),
    meal_type: data.recipeCategory || guessMealTypeFromName(data.name),
    prep_time: parseDuration(data.prepTime) || 15,
    cook_time: parseDuration(data.cookTime) || 30,
    servings,
    difficulty: guessDifficultyFromInstructions(data.recipeInstructions),
    instructions: normalizeInstructions(data.recipeInstructions),
    ingredients: normalizeIngredients(data.recipeIngredient),
    tags: extractTagsFromData(data),
    source_url: data.url || data['@id'] || '',
    confidence: 0.9
  };
};

const normalize750gStructuredData = (data: any): ParsedRecipe => {
  return {
    name: data.name || 'Recette sans nom',
    description: data.description || '',
    image_url: data.image?.url || data.image || '',
    cuisine_category: guessCuisineFromName(data.name),
    meal_type: guessMealTypeFromName(data.name),
    prep_time: parseDuration(data.prepTime) || 30,
    cook_time: parseDuration(data.cookTime) || 30,
    servings: parseInt(data.recipeYield) || 4,
    difficulty: guessDifficultyFromInstructions(data.recipeInstructions),
    instructions: normalizeInstructions(data.recipeInstructions),
    ingredients: normalizeIngredients(data.recipeIngredient),
    tags: extractTagsFromData(data),
    source_url: data.url || '',
    confidence: 0.9
  };
};

const normalizeGenericStructuredData = (data: any): ParsedRecipe => {
  return {
    name: data.name || 'Recette importée',
    description: data.description || '',
    image_url: data.image?.url || data.image || '',
    cuisine_category: guessCuisineFromName(data.name),
    meal_type: guessMealTypeFromName(data.name),
    prep_time: parseDuration(data.prepTime) || 30,
    cook_time: parseDuration(data.cookTime) || 30,
    servings: parseInt(data.recipeYield) || 4,
    difficulty: guessDifficultyFromInstructions(data.recipeInstructions),
    instructions: normalizeInstructions(data.recipeInstructions),
    ingredients: normalizeIngredients(data.recipeIngredient),
    tags: extractTagsFromData(data),
    source_url: data.url || '',
    confidence: 0.8
  };
};

const normalizeMicrodataRecipe = (microdata: any): ParsedRecipe => {
  // Normalisation microdata vers ParsedRecipe (pattern Cipher)
  return {
    name: microdata.name || 'Recette microdata',
    description: microdata.description || '',
    image_url: microdata.image || '',
    cuisine_category: guessCuisineFromName(microdata.name || ''),
    meal_type: guessMealTypeFromName(microdata.name || ''),
    prep_time: parseDuration(microdata.prepTime) || 30,
    cook_time: parseDuration(microdata.cookTime) || 30,
    servings: parseInt(microdata.recipeYield) || 4,
    difficulty: 2,
    instructions: microdata.recipeInstructions || 'Instructions à compléter',
    ingredients: microdata.recipeIngredient ? 
      microdata.recipeIngredient.split(',').map((ing: string) => ({
        name: ing.trim(),
        quantity: 1,
        unit: 'unité',
        is_essential: true,
        confidence: 0.7
      })) : [],
    tags: [],
    source_url: '',
    confidence: 0.7
  };
};

// Parsers DOM spécialisés (pattern Cipher fallback)
const parseMarmitonDOM = (html: string, url: string): ParsedRecipe => {
  // Parsing DOM amélioré pour Marmiton (pattern Cipher)
  try {
    // Helper pour décoder les entités HTML
    const decodeHTMLEntities = (text: string): string => {
      const entities: Record<string, string> = {
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
        '&#xF4;': 'ô',
        '&#xF9;': 'ù',
        '&#xE7;': 'ç',
        '&#x3A;': ':',
        '&#x3B;': ';',
        '&#x21;': '!',
        '&#x3F;': '?',
        '&#x2C;': ',',
        '&nbsp;': ' '
      };
      
      let decoded = text;
      for (const [entity, char] of Object.entries(entities)) {
        decoded = decoded.replace(new RegExp(entity, 'gi'), char);
      }
      
      // Décoder les entités numériques restantes
      decoded = decoded.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec)));
      decoded = decoded.replace(/&#x([0-9A-F]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
      
      return decoded;
    };
    
    // Extraction titre - Marmiton 2024 structure
    const titleMatch = html.match(/<h1[^>]*class="[^"]*recipe-name[^"]*"[^>]*>([^<]+)</i) ||
                      html.match(/<h1[^>]*class="[^"]*recipe-title[^"]*"[^>]*>([^<]+)</i) ||
                      html.match(/<h1[^>]*class="[^"]*SHRD__sc[^"]*"[^>]*>([^<]+)</i) ||
                      html.match(/<h1[^>]*data-testid="recipe-title"[^>]*>([^<]+)</i) ||
                      html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                      html.match(/property="og:title"[^>]*content="([^"]+)"/i);
    const name = titleMatch ? decodeHTMLEntities(titleMatch[1].trim().replace(' - Marmiton', '')) : 'Recette Marmiton';
    
    // Extraction description
    const descMatch = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i) ||
                     html.match(/<div[^>]*class="[^"]*recipe-description[^"]*"[^>]*>([^<]+)</i);
    const description = descMatch ? decodeHTMLEntities(descMatch[1].trim()) : '';
    
    // Extraction image
    const imgMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) ||
                    html.match(/<img[^>]*class="[^"]*recipe-media[^"]*"[^>]*src="([^"]+)"/i);
    const image_url = imgMatch ? imgMatch[1] : '';
    
    // Temps de préparation/cuisson - Marmiton utilise des formats variés
    const prepMatch = html.match(/(?:préparation|prep)[^0-9]*(\d+)[^0-9]*(?:min|h)/i) ||
                     html.match(/data-prep-time="(\d+)"/i);
    const cookMatch = html.match(/(?:cuisson|cook)[^0-9]*(\d+)[^0-9]*(?:min|h)/i) ||
                     html.match(/data-cook-time="(\d+)"/i);
    
    // Portions
    const servingsMatch = html.match(/(?:pour|serves?)[^0-9]*(\d+)[^0-9]*(?:personnes?|pers)/i) ||
                         html.match(/data-servings="(\d+)"/i);
    
    // Extraction des ingrédients - Marmiton structure 2024
    const ingredients: ParsedIngredient[] = [];
    
    // Essayer plusieurs patterns pour les ingrédients (Marmiton utilise des structures variées)
    const ingredientPatterns = [
      // Patterns modernes Marmiton
      /<li[^>]*class="[^"]*ingredient[^"]*"[^>]*>(.*?)<\/li>/gi,
      /<div[^>]*class="[^"]*recipe-ingredient[^"]*"[^>]*>(.*?)<\/div>/gi,
      /<span[^>]*class="[^"]*ingredient-[^"]*"[^>]*>(.*?)<\/span>/gi,
      // Pattern pour la structure avec quantité et nom séparés
      /<div[^>]*class="[^"]*MuiGrid-root[^"]*"[^>]*>.*?<span[^>]*>([^<]+)<\/span>.*?<span[^>]*>([^<]+)<\/span>.*?<\/div>/gi,
      // Pattern pour les listes d'ingrédients dans des divs
      /<div[^>]*data-ingredient[^>]*>(.*?)<\/div>/gi,
      // Pattern générique pour trouver des listes d'ingrédients
      /(?:Ingr[ée]dients|INGREDIENTS)[^<]*<[^>]*>(.*?)<\/(?:ul|ol|div)>/si
    ];
    
    for (const pattern of ingredientPatterns) {
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        let ingText = '';
        
        // Gérer le cas où on a quantité et nom séparés
        if (match[2]) {
          ingText = `${match[1]} ${match[2]}`;
        } else {
          ingText = match[1];
        }
        
        // Nettoyer et décoder le texte
        ingText = decodeHTMLEntities(
          ingText
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        );
        
        if (ingText && ingText.length > 2) {
          // Parser l'ingrédient pour extraire quantité et nom
          const { quantity, unit, name } = parseIngredientText(ingText);
          if (name && name.length > 1) {
            ingredients.push({
              name: decodeHTMLEntities(name),
              quantity,
              unit,
              is_essential: true,
              confidence: 0.7
            });
          }
        }
      }
      if (ingredients.length > 0) break;
    }
    
    // Si aucun ingrédient trouvé, essayer de chercher dans une section plus large
    if (ingredients.length === 0) {
      // Chercher la section ingrédients
      const ingredientSectionMatch = html.match(/(?:Ingr[ée]dients|INGREDIENTS)[^<]*<[^>]*>([\s\S]*?)(?:<h\d|<div[^>]*class="[^"]*(?:instructions|preparation|etapes))/i);
      if (ingredientSectionMatch) {
        const section = ingredientSectionMatch[1];
        // Extraire tout texte qui ressemble à un ingrédient
        const lines = section.split(/\n|<br|<\/li>|<\/div>|<\/p>/i);
        for (const line of lines) {
          const cleanLine = decodeHTMLEntities(
            line.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
          );
          if (cleanLine && cleanLine.length > 5 && cleanLine.length < 200) {
            const { quantity, unit, name } = parseIngredientText(cleanLine);
            if (name && name.length > 1) {
              ingredients.push({
                name: decodeHTMLEntities(name),
                quantity,
                unit,
                is_essential: true,
                confidence: 0.6
              });
            }
          }
        }
      }
    }
    
    // Extraction des instructions
    let instructions = '';
    
    // Essayer plusieurs patterns pour les instructions
    const instructionPatterns = [
      /<div[^>]*class="[^"]*recipe-preparation[^"]*"[^>]*>(.*?)<\/div>/si,
      /<ol[^>]*class="[^"]*recipe-steps[^"]*"[^>]*>(.*?)<\/ol>/si,
      /<div[^>]*class="[^"]*preparation[^"]*"[^>]*>(.*?)<\/div>/si
    ];
    
    for (const pattern of instructionPatterns) {
      const match = html.match(pattern);
      if (match) {
        // Extraire chaque étape
        const stepsHtml = match[1];
        const stepMatches = stepsHtml.matchAll(/<li[^>]*>(.*?)<\/li>/gi);
        const steps = [];
        let stepNum = 1;
        
        for (const stepMatch of stepMatches) {
          const stepText = stepMatch[1]
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (stepText && stepText.length > 10) {
            steps.push(`${stepNum}. ${stepText}`);
            stepNum++;
          }
        }
        
        if (steps.length > 0) {
          instructions = steps.join('\n');
          break;
        }
      }
    }
    
    // Si pas d'instructions structurées, essayer de trouver du texte
    if (!instructions) {
      const fallbackMatch = html.match(/(?:préparation|instructions?|étapes?)[^<]*<[^>]*>(.*?)<\/[^>]+>/si);
      if (fallbackMatch) {
        instructions = fallbackMatch[1]
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
    }
    
    // Difficulté
    const diffMatch = html.match(/(?:difficulté|difficulty)[^0-9]*(\d)/i) ||
                     html.match(/data-difficulty="(\d+)"/i);
    const difficulty = diffMatch ? parseInt(diffMatch[1]) : 2;
    
    return {
      name,
      description,
      image_url,
      cuisine_category: guessCuisineFromName(name),
      meal_type: guessMealTypeFromName(name),
      prep_time: prepMatch ? parseInt(prepMatch[1]) : 15,
      cook_time: cookMatch ? parseInt(cookMatch[1]) : 30,
      servings: servingsMatch ? parseInt(servingsMatch[1]) : 4,
      difficulty: Math.min(5, Math.max(1, difficulty)),
      instructions: instructions || 'Voir la recette sur Marmiton pour les instructions complètes',
      ingredients,
      tags: extractTagsFromRecipe(name, description),
      source_url: url,
      confidence: ingredients.length > 0 ? 0.7 : 0.5
    };
  } catch (error) {
    console.error('Error parsing Marmiton DOM:', error);
    return createFallbackRecipe(url, 'Recette Marmiton');
  }
};

const parse750gDOM = (html: string, url: string): ParsedRecipe => {
  // Parsing DOM basique pour 750g (pattern Cipher)
  try {
    // Extraction titre
    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                      html.match(/<title>([^<]+)<\/title>/i);
    const name = titleMatch ? titleMatch[1].replace(' - 750g', '').trim() : 'Recette 750g';

    // Extraction description
    const descMatch = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
    const description = descMatch ? descMatch[1] : '';

    // Extraction image
    const imgMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
    const image_url = imgMatch ? imgMatch[1] : '';

    return {
      name,
      description,
      image_url,
      cuisine_category: guessCuisineFromName(name),
      meal_type: guessMealTypeFromName(name),
      prep_time: 30,
      cook_time: 30,
      servings: 4,
      difficulty: 2,
      instructions: 'Instructions à compléter après import DOM',
      ingredients: [],
      tags: ['750g'],
      source_url: url,
      confidence: 0.5
    };
  } catch (error) {
    console.error('Error parsing 750g DOM:', error);
    return createFallbackRecipe(url, 'Recette 750g');
  }
};

// Helpers de normalisation (patterns Cipher)
const parseDuration = (duration: string): number => {
  if (!duration) return 0;
  
  // Format ISO 8601 (PT30M)
  const isoMatch = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (isoMatch) {
    const hours = parseInt(isoMatch[1] || '0');
    const minutes = parseInt(isoMatch[2] || '0');
    return hours * 60 + minutes;
  }
  
  // Format textuel (30 min, 1h30, etc.)
  const textMatch = duration.match(/(\d+)\s*h(?:\s*(\d+))?|(\d+)\s*min/i);
  if (textMatch) {
    if (textMatch[1]) { // Format heures
      const hours = parseInt(textMatch[1]);
      const minutes = parseInt(textMatch[2] || '0');
      return hours * 60 + minutes;
    } else if (textMatch[3]) { // Format minutes
      return parseInt(textMatch[3]);
    }
  }
  
  return 30; // Fallback
};

const normalizeInstructions = (instructions: any): string => {
  if (!instructions) return '';
  
  if (typeof instructions === 'string') {
    return instructions;
  }
  
  if (Array.isArray(instructions)) {
    return instructions.map((step, index) => {
      const text = typeof step === 'string' ? step : step.text || step.name || '';
      return `${index + 1}. ${text}`;
    }).join('\n');
  }
  
  return '';
};

const normalizeIngredients = (ingredients: any): ParsedIngredient[] => {
  if (!ingredients || !Array.isArray(ingredients)) {
    return [];
  }
  
  return ingredients.map((ingredient, index) => {
    if (typeof ingredient === 'string') {
      // Parse ingredient text "200g de tomates"
      const parsed = parseIngredientText(ingredient);
      return {
        name: parsed.name,
        quantity: parsed.quantity,
        unit: parsed.unit,
        is_essential: true,
        confidence: 0.8
      };
    }
    
    // Structured ingredient object
    return {
      name: ingredient.name || ingredient.ingredient || 'Ingrédient inconnu',
      quantity: parseFloat(ingredient.amount) || 1,
      unit: ingredient.unit || 'unité',
      is_essential: true,
      confidence: 0.9
    };
  });
};

const parseIngredientText = (text: string): { name: string; quantity: number; unit: string } => {
  // Patterns français pour ingrédients
  const patterns = [
    // "200g de tomates", "2 cuillères à soupe d'huile"
    /^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|c\.?à\.?s\.?|c\.?à\.?c\.?|cuillères?\s+à\s+soupe|cuillères?\s+à\s+café|tasse|verre|pincée|gousse|tranche)\s+(?:de\s+|d[''])?(.+)$/i,
    // "2 tomates", "une pincée de sel"
    /^(un|une|\d+)\s+(.+)$/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let quantity = 1;
      let unit = 'unité';
      let name = text;
      
      if (match[1] && match[2] && match[3]) {
        // Format avec quantité + unité + nom
        quantity = parseFloat(match[1].replace(',', '.')) || 1;
        unit = normalizeUnit(match[2]);
        name = match[3].trim();
      } else if (match[1] && match[2]) {
        // Format simple quantité + nom
        quantity = match[1] === 'un' || match[1] === 'une' ? 1 : parseFloat(match[1]) || 1;
        name = match[2].trim();
      }
      
      return { name, quantity, unit };
    }
  }
  
  return { name: text, quantity: 1, unit: 'unité' };
};

const normalizeUnit = (unit: string): string => {
  const unitMap: Record<string, string> = {
    'cuillère à soupe': 'c.à.s',
    'cuillères à soupe': 'c.à.s',
    'c.à.s.': 'c.à.s',
    'cas': 'c.à.s',
    'cuillère à café': 'c.à.c',
    'cuillères à café': 'c.à.c',
    'c.à.c.': 'c.à.c',
    'cac': 'c.à.c'
  };
  
  return unitMap[unit.toLowerCase()] || unit;
};

// Helpers d'analyse intelligente (patterns Cipher)
const guessCuisineFromName = (name: string): string => {
  const cuisines: Record<string, string[]> = {
    'Française': ['coq au vin', 'ratatouille', 'pot-au-feu', 'bouillabaisse'],
    'Italienne': ['pasta', 'pizza', 'risotto', 'carbonara', 'pesto', 'tiramisu'],
    'Asiatique': ['curry', 'pad thai', 'sushi', 'ramen', 'wok'],
    'Méditerranéenne': ['tapenade', 'tzatziki', 'moussaka'],
    'Végétarienne': ['végé', 'vegan', 'tofu', 'quinoa']
  };
  
  const lowerName = name.toLowerCase();
  
  for (const [cuisine, keywords] of Object.entries(cuisines)) {
    if (keywords.some(keyword => lowerName.includes(keyword))) {
      return cuisine;
    }
  }
  
  return '';
};

const guessMealTypeFromName = (name: string): string => {
  const mealTypes: Record<string, string[]> = {
    'breakfast': ['petit déjeuner', 'pancake', 'muesli', 'porridge'],
    'lunch': ['salade', 'sandwich', 'quiche'],
    'dinner': ['pot-au-feu', 'coq au vin', 'lasagne'],
    'dessert': ['tarte', 'gâteau', 'mousse', 'tiramisu', 'crème'],
    'appetizer': ['apéritif', 'tapas', 'verrine']
  };
  
  const lowerName = name.toLowerCase();
  
  for (const [type, keywords] of Object.entries(mealTypes)) {
    if (keywords.some(keyword => lowerName.includes(keyword))) {
      return type;
    }
  }
  
  return '';
};

const guessDifficultyFromInstructions = (instructions: any): number => {
  if (!instructions) return 2;
  
  const text = JSON.stringify(instructions).toLowerCase();
  const complexWords = ['temperature', 'bain-marie', 'tempérer', 'fouetter', 'monter en neige'];
  const simpleWords = ['mélanger', 'ajouter', 'verser'];
  
  const complexCount = complexWords.filter(word => text.includes(word)).length;
  const simpleCount = simpleWords.filter(word => text.includes(word)).length;
  
  if (complexCount > simpleCount) return 4;
  if (complexCount > 0) return 3;
  return 2;
};

const extractTagsFromData = (data: any): string[] => {
  const tags: string[] = [];
  
  if (data.recipeCategory) {
    tags.push(data.recipeCategory);
  }
  
  if (data.recipeCuisine) {
    tags.push(data.recipeCuisine);
  }
  
  if (data.keywords) {
    const keywords = Array.isArray(data.keywords) ? data.keywords : [data.keywords];
    tags.push(...keywords);
  }
  
  return tags.filter(Boolean);
};

const extractTagsFromRecipe = (name: string, description: string): string[] => {
  const tags: string[] = [];
  const text = `${name} ${description}`.toLowerCase();
  
  // Tags basés sur des mots-clés
  const tagMap: Record<string, string[]> = {
    'rapide': ['rapide', 'quick', '15 min', '10 min'],
    'facile': ['facile', 'simple', 'easy'],
    'végétarien': ['végétarien', 'vegetarian', 'végé'],
    'végan': ['végan', 'vegan'],
    'sans gluten': ['sans gluten', 'gluten free'],
    'dessert': ['dessert', 'gâteau', 'tarte', 'mousse'],
    'apéritif': ['apéritif', 'tapas', 'entrée'],
    'plat principal': ['plat principal', 'main course'],
    'salade': ['salade', 'salad'],
    'soupe': ['soupe', 'soup', 'potage']
  };
  
  for (const [tag, keywords] of Object.entries(tagMap)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      tags.push(tag);
    }
  }
  
  return tags;
};

const createFallbackRecipe = (url: string, name: string): ParsedRecipe => {
  return {
    name,
    description: 'Recette importée - détails à compléter',
    prep_time: 30,
    cook_time: 30,
    servings: 4,
    difficulty: 2,
    instructions: 'Instructions à compléter après import',
    ingredients: [],
    tags: ['importé'],
    source_url: url,
    confidence: 0.3,
    fallback: true
  };
};

// Parsers supplémentaires
const parseCuisineAZRecipe = async (url: string): Promise<RecipeParsingResult> => {
  // TODO: Implémenter parser CuisineAZ
  return await parseGenericRecipe(url);
};

const parseAllRecipesRecipe = async (url: string): Promise<RecipeParsingResult> => {
  // TODO: Implémenter parser AllRecipes
  return await parseGenericRecipe(url);
};