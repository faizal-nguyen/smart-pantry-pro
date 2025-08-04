// Enhanced voice parser pour recettes avec vocabulaire culinaire (pattern Cipher)
export interface ParsedRecipeVoice {
  success: boolean;
  recipeName?: string;
  ingredients: ParsedIngredientVoice[];
  instructions?: string;
  cookingTime?: number;
  prepTime?: number;
  servings?: number;
  confidence: number;
  originalText: string;
  errors?: string[];
}

export interface ParsedIngredientVoice {
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
  isEssential: boolean;
  confidence: number;
}

// Vocabulaire culinaire français étendu (pattern Cipher)
const FRENCH_COOKING_VOCABULARY = {
  quantities: {
    'un': 1, 'une': 1, 'deux': 2, 'trois': 3, 'quatre': 4, 'cinq': 5,
    'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9, 'dix': 10,
    'onze': 11, 'douze': 12, 'treize': 13, 'quatorze': 14, 'quinze': 15,
    'seize': 16, 'dix-sept': 17, 'dix-huit': 18, 'dix-neuf': 19, 'vingt': 20,
    'demi': 0.5, 'moitié': 0.5, 'quart': 0.25, 'trois quarts': 0.75,
    'centaine': 100, 'dizaine': 10, 'douzaine': 12
  },

  units: {
    // Mesures de cuisine spécialisées
    'cuillère à soupe': 'c.à.s', 'cuillères à soupe': 'c.à.s', 'cuiller à soupe': 'c.à.s',
    'c.à.s': 'c.à.s', 'cas': 'c.à.s', 'cs': 'c.à.s', 'cuillerée à soupe': 'c.à.s',
    'cuillère à café': 'c.à.c', 'cuillères à café': 'c.à.c', 'cuiller à café': 'c.à.c',
    'c.à.c': 'c.à.c', 'cac': 'c.à.c', 'cc': 'c.à.c', 'cuillerée à café': 'c.à.c',
    
    'tasse': 'tasse', 'tasses': 'tasse', 'verre': 'verre', 'verres': 'verre',
    'bol': 'bol', 'bols': 'bol', 'récipient': 'récipient',
    
    'pincée': 'pincée', 'pincées': 'pincée', 'soupçon': 'pincée',
    'poignée': 'poignée', 'poignées': 'poignée',
    'noix': 'noix', 'noisette': 'noisette',
    
    // Mesures traditionnelles
    'kg': 'kg', 'kilo': 'kg', 'kilos': 'kg', 'kilogramme': 'kg', 'kilogrammes': 'kg',
    'g': 'g', 'gramme': 'g', 'grammes': 'g',
    'l': 'L', 'litre': 'L', 'litres': 'L',
    'ml': 'ml', 'millilitre': 'ml', 'millilitres': 'ml',
    'cl': 'cl', 'centilitre': 'cl', 'centilitres': 'cl',
    'dl': 'dl', 'décilitre': 'dl', 'décilitres': 'dl',
    
    // Unités spécifiques ingrédients
    'gousse': 'gousse', 'gousses': 'gousse', 'ail': 'gousse',
    'branche': 'branche', 'branches': 'branche',
    'feuille': 'feuille', 'feuilles': 'feuille',
    'oeuf': 'œuf', 'oeufs': 'œuf', 'œuf': 'œuf', 'œufs': 'œuf',
    'jaune': 'jaune d\'œuf', 'jaunes': 'jaune d\'œuf',
    'blanc': 'blanc d\'œuf', 'blancs': 'blanc d\'œuf',
    'tranche': 'tranche', 'tranches': 'tranche',
    'morceau': 'morceau', 'morceaux': 'morceau',
    'bout': 'morceau', 'bouts': 'morceau'
  },

  cookingVerbs: [
    'préparer', 'préparé', 'cuire', 'cuit', 'faire cuire', 'faire',
    'mélanger', 'mélangé', 'remuer', 'battre', 'fouetter',
    'hacher', 'haché', 'couper', 'coupé', 'découper',
    'éplucher', 'pelé', 'peler', 'nettoyer', 'laver',
    'ajouter', 'ajouté', 'verser', 'versé', 'incorporer',
    'assaisonner', 'saler', 'poivrer', 'goûter', 'rectifier'
  ],

  recipeIntentions: [
    'recette de', 'pour faire', 'comment faire', 'ingrédients pour',
    'je veux faire', 'préparation de', 'cuisiner', 'préparer'
  ],

  timeKeywords: {
    'minute': 1, 'minutes': 1, 'min': 1,
    'heure': 60, 'heures': 60, 'h': 60,
    'seconde': 1/60, 'secondes': 1/60, 'sec': 1/60
  },

  servingKeywords: [
    'personne', 'personnes', 'pers', 'part', 'parts', 'portion', 'portions',
    'convive', 'convives', 'assiette', 'assiettes'
  ],

  commonIngredients: {
    // Légumes
    'tomate': 'tomate', 'tomates': 'tomate', 'courgette': 'courgette', 'courgettes': 'courgette',
    'carotte': 'carotte', 'carottes': 'carotte', 'oignon': 'oignon', 'oignons': 'oignon',
    'ail': 'ail', 'échalote': 'échalote', 'échalotes': 'échalote',
    'poivron': 'poivron', 'poivrons': 'poivron', 'champignon': 'champignon', 'champignons': 'champignon',
    
    // Herbes et épices
    'persil': 'persil', 'ciboulette': 'ciboulette', 'basilic': 'basilic',
    'thym': 'thym', 'romarin': 'romarin', 'laurier': 'laurier',
    'sel': 'sel', 'poivre': 'poivre', 'paprika': 'paprika',
    
    // Produits de base
    'farine': 'farine', 'sucre': 'sucre', 'beurre': 'beurre',
    'huile': 'huile', 'vinaigre': 'vinaigre', 'moutarde': 'moutarde',
    'crème': 'crème', 'lait': 'lait', 'fromage': 'fromage',
    
    // Viandes et poissons
    'poulet': 'poulet', 'bœuf': 'bœuf', 'porc': 'porc', 'agneau': 'agneau',
    'poisson': 'poisson', 'saumon': 'saumon', 'thon': 'thon', 'crevettes': 'crevettes'
  }
};

// Patterns de reconnaissance spécialisés pour recettes
const RECIPE_PATTERNS = {
  recipeTitle: [
    /(?:recette (?:de |d')?|pour faire |comment faire )(.*?)(?:\.|$|,|pour)/i,
    /(?:je veux faire |préparer |cuisiner )(.*?)(?:\.|$|,|avec|pour)/i,
    /^(.*?)(?:\s+pour \d+|\s+ingrédients|\s+avec)/i
  ],

  ingredientList: [
    /(?:ingrédients?|il faut|avec|mettre)\s*:?\s*(.*?)(?:préparation|instructions?|étapes?|$)/is,
    /(?:pour la recette|pour (?:cette|la) préparation)\s*:?\s*(.*?)(?:préparation|instructions?|$)/is
  ],

  instructions: [
    /(?:préparation|instructions?|étapes?|méthode|comment faire)\s*:?\s*(.*)/is,
    /(?:d'abord|premièrement|ensuite|puis|enfin|pour commencer)\s+(.*)/is
  ],

  cookingTime: [
    /(?:cuisson|cuire|au four)\s*:?\s*(\d+)\s*(min|minutes?|h|heures?)/i,
    /(?:laisser cuire|faire cuire)\s+(?:pendant\s+)?(\d+)\s*(min|minutes?|h|heures?)/i
  ],

  prepTime: [
    /(?:préparation|prep|temps de préparation)\s*:?\s*(\d+)\s*(min|minutes?|h|heures?)/i,
    /(?:préparer en|temps de prep)\s+(\d+)\s*(min|minutes?|h|heures?)/i
  ],

  servings: [
    /(?:pour|serves?)\s+(\d+)\s*(?:personnes?|pers|parts?|portions?)/i,
    /(\d+)\s+(?:personnes?|pers|parts?|portions?)/i
  ]
};

// Fonction principale de parsing vocal pour recettes (pattern Cipher)
export function parseRecipeVoiceInput(text: string): ParsedRecipeVoice {
  const normalizedText = normalizeTextForCooking(text);
  const errors: string[] = [];
  
  try {
    // 1. Extraire le nom de la recette
    const recipeName = extractRecipeNameFrench(normalizedText);
    
    // 2. Extraire les ingrédients
    const ingredients = extractIngredientsAdvanced(normalizedText);
    
    // 3. Extraire les instructions
    const instructions = extractInstructions(normalizedText);
    
    // 4. Extraire les temps de cuisson/préparation
    const cookingTime = extractCookingTime(normalizedText);
    const prepTime = extractPrepTime(normalizedText);
    
    // 5. Extraire le nombre de portions
    const servings = extractServings(normalizedText);
    
    // 6. Calculer la confiance globale
    const confidence = calculateRecipeConfidence({
      recipeName,
      ingredients,
      instructions,
      text: normalizedText
    });
    
    return {
      success: confidence > 0.3,
      recipeName,
      ingredients,
      instructions,
      cookingTime,
      prepTime,
      servings,
      confidence,
      originalText: text,
      errors: errors.length > 0 ? errors : undefined
    };
  
  } catch (error) {
    console.error('Recipe voice parsing error:', error);
    
    return {
      success: false,
      ingredients: [],
      confidence: 0,
      originalText: text,
      errors: ['Erreur lors du parsing vocal']
    };
  }
}

// Normalisation spécialisée pour le vocabulaire culinaire
function normalizeTextForCooking(text: string): string {
  return text
    .toLowerCase()
    .replace(/'/g, "'")
    .replace(/œ/g, 'oe') // Normaliser les œ
    // Corrections phonétiques courantes
    .replace(/\b(?:cas|c a s)\b/g, 'cuillères à soupe')
    .replace(/\b(?:cac|c a c)\b/g, 'cuillères à café')
    .replace(/\boeuf\b/g, 'œuf')
    .replace(/\boeufs\b/g, 'œufs')
    .replace(/[^\w\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extraction du nom de recette avec patterns français
function extractRecipeNameFrench(text: string): string | undefined {
  for (const pattern of RECIPE_PATTERNS.recipeTitle) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 2) {
      return match[1].trim();
    }
  }
  
  // Fallback: premier groupe de mots qui semble être un nom de plat
  const firstSentence = text.split(/[.!?]/)[0];
  const words = firstSentence.split(/\s+/).slice(0, 5);
  
  if (words.length >= 2) {
    // Exclure les mots d'instruction
    const filteredWords = words.filter(word => 
      !FRENCH_COOKING_VOCABULARY.cookingVerbs.includes(word) &&
      !['je', 'tu', 'il', 'nous', 'vous', 'ils', 'avec', 'pour'].includes(word)
    );
    
    if (filteredWords.length >= 2) {
      return filteredWords.join(' ');
    }
  }
  
  return undefined;
}

// Extraction intelligente des ingrédients avec patterns français étendus
function extractIngredientsAdvanced(text: string): ParsedIngredientVoice[] {
  const ingredients: ParsedIngredientVoice[] = [];
  
  // 1. Chercher une section ingrédients explicite
  for (const pattern of RECIPE_PATTERNS.ingredientList) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const ingredientText = match[1];
      const parsed = parseIngredientSection(ingredientText);
      ingredients.push(...parsed);
      break;
    }
  }
  
  // 2. Si pas de section explicite, chercher dans tout le texte
  if (ingredients.length === 0) {
    const parsed = parseIngredientsFromFullText(text);
    ingredients.push(...parsed);
  }
  
  return ingredients;
}

// Parser une section dédiée aux ingrédients
function parseIngredientSection(text: string): ParsedIngredientVoice[] {
  const ingredients: ParsedIngredientVoice[] = [];
  
  // Diviser par des séparateurs communs
  const separators = /[,;]|\bet\b|\bpuis\b|\baussi\b|\bégalement\b|\bplus\b/;
  const parts = text.split(separators);
  
  for (const part of parts) {
    const ingredient = parseIndividualIngredient(part.trim());
    if (ingredient) {
      ingredients.push(ingredient);
    }
  }
  
  return ingredients;
}

// Parser un ingrédient individuel avec quantité et unité
function parseIndividualIngredient(text: string): ParsedIngredientVoice | null {
  if (text.length < 2) return null;
  
  const tokens = text.split(/\s+/);
  let quantity = 1;
  let unit = 'unité';
  let name = '';
  let notes = '';
  let tokenIndex = 0;
  
  // 1. Chercher la quantité (nombre ou texte)
  if (tokenIndex < tokens.length) {
    const quantityNum = convertTextToNumber(tokens[tokenIndex]);
    if (quantityNum !== null) {
      quantity = quantityNum;
      tokenIndex++;
    }
  }
  
  // 2. Chercher l'unité de mesure
  if (tokenIndex < tokens.length) {
    const potentialUnit = tokens[tokenIndex];
    const normalizedUnit = FRENCH_COOKING_VOCABULARY.units[potentialUnit];
    if (normalizedUnit) {
      unit = normalizedUnit;
      tokenIndex++;
    }
    
    // Gérer les unités composées (cuillères à soupe)
    if (tokenIndex < tokens.length - 1) {
      const compositeUnit = `${potentialUnit} ${tokens[tokenIndex]} ${tokens[tokenIndex + 1]}`;
      const normalizedComposite = FRENCH_COOKING_VOCABULARY.units[compositeUnit];
      if (normalizedComposite) {
        unit = normalizedComposite;
        tokenIndex += 2;
      }
    }
  }
  
  // 3. Ignorer les mots de liaison
  while (tokenIndex < tokens.length && ['de', 'd\'', 'du', 'des'].includes(tokens[tokenIndex])) {
    tokenIndex++;
  }
  
  // 4. Extraire le nom de l'ingrédient
  if (tokenIndex < tokens.length) {
    const nameTokens = tokens.slice(tokenIndex);
    name = nameTokens.join(' ');
    
    // Normaliser les noms d'ingrédients courants
    name = FRENCH_COOKING_VOCABULARY.commonIngredients[name] || name;
  }
  
  if (!name) return null;
  
  return {
    name,
    quantity,
    unit,
    notes,
    isEssential: true, // Par défaut, tous les ingrédients sont essentiels
    confidence: calculateIngredientConfidence(name, quantity, unit)
  };
}

// Parser les ingrédients dans tout le texte (sans section dédiée)
function parseIngredientsFromFullText(text: string): ParsedIngredientVoice[] {
  const ingredients: ParsedIngredientVoice[] = [];
  const sentences = text.split(/[.!?]/);
  
  for (const sentence of sentences) {
    // Chercher des patterns d'ingrédients dans chaque phrase
    const matches = sentence.match(/(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|c\.à\.s|c\.à\.c|tasse|verre|pincée|gousse|tranche)?\s+(?:de\s+|d')?([a-zàâäéèêëïîôùûüÿç\s]+)/gi);
    
    if (matches) {
      for (const match of matches) {
        const ingredient = parseIndividualIngredient(match);
        if (ingredient && !ingredients.some(ing => ing.name === ingredient.name)) {
          ingredients.push(ingredient);
        }
      }
    }
  }
  
  return ingredients;
}

// Extraction des instructions de préparation
function extractInstructions(text: string): string | undefined {
  for (const pattern of RECIPE_PATTERNS.instructions) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 10) {
      return match[1].trim();
    }
  }
  
  return undefined;
}

// Extraction du temps de cuisson
function extractCookingTime(text: string): number | undefined {
  for (const pattern of RECIPE_PATTERNS.cookingTime) {
    const match = text.match(pattern);
    if (match) {
      const time = parseInt(match[1]);
      const unit = match[2];
      const multiplier = FRENCH_COOKING_VOCABULARY.timeKeywords[unit] || 1;
      return time * multiplier;
    }
  }
  
  return undefined;
}

// Extraction du temps de préparation
function extractPrepTime(text: string): number | undefined {
  for (const pattern of RECIPE_PATTERNS.prepTime) {
    const match = text.match(pattern);
    if (match) {
      const time = parseInt(match[1]);
      const unit = match[2];
      const multiplier = FRENCH_COOKING_VOCABULARY.timeKeywords[unit] || 1;
      return time * multiplier;
    }
  }
  
  return undefined;
}

// Extraction du nombre de portions
function extractServings(text: string): number | undefined {
  for (const pattern of RECIPE_PATTERNS.servings) {
    const match = text.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  
  return undefined;
}

// Conversion texte vers nombre avec support étendu
function convertTextToNumber(text: string): number | null {
  // Parser comme nombre décimal
  const num = parseFloat(text.replace(',', '.'));
  if (!isNaN(num)) return num;
  
  // Chercher dans le vocabulaire français
  return FRENCH_COOKING_VOCABULARY.quantities[text] || null;
}

// Calcul de la confiance pour un ingrédient
function calculateIngredientConfidence(name: string, quantity: number, unit: string): number {
  let confidence = 0.5;
  
  // Bonus si l'ingrédient est reconnu
  if (FRENCH_COOKING_VOCABULARY.commonIngredients[name]) {
    confidence += 0.2;
  }
  
  // Bonus si l'unité est culinaire
  if (['c.à.s', 'c.à.c', 'tasse', 'pincée', 'gousse'].includes(unit)) {
    confidence += 0.15;
  }
  
  // Bonus si la quantité est raisonnable
  if (quantity > 0 && quantity < 1000) {
    confidence += 0.15;
  }
  
  return Math.min(confidence, 1.0);
}

// Calcul de la confiance globale de la recette
function calculateRecipeConfidence(data: {
  recipeName?: string;
  ingredients: ParsedIngredientVoice[];
  instructions?: string;
  text: string;
}): number {
  let confidence = 0;
  
  // Confiance basée sur le nom de recette
  if (data.recipeName && data.recipeName.length > 2) {
    confidence += 0.2;
  }
  
  // Confiance basée sur les ingrédients
  if (data.ingredients.length > 0) {
    confidence += 0.3;
    const avgIngredientConfidence = data.ingredients.reduce((sum, ing) => sum + ing.confidence, 0) / data.ingredients.length;
    confidence += avgIngredientConfidence * 0.3;
  }
  
  // Confiance basée sur les instructions
  if (data.instructions && data.instructions.length > 10) {
    confidence += 0.2;
  }
  
  return Math.min(confidence, 1.0);
}

// Exemples de phrases supportées pour les recettes
export const recipeExamplePhrases = [
  "Recette de pâtes carbonara avec deux œufs, cent grammes de lardons, une cuillère à soupe de crème et du parmesan",
  "Pour faire une tarte aux pommes il faut deux cents grammes de farine, trois pommes, cent grammes de sucre et du beurre",
  "Ingrédients pour quatre personnes : cinq cents grammes de tomates, deux oignons, une gousse d'ail, basilic et huile d'olive",
  "Préparer une soupe avec un kilo de courge, deux pommes de terre, un oignon, bouillon cube et crème fraîche",
  "Salade César avec une laitue, cent grammes de parmesan, croûtons, anchois et sauce César, cuisson dix minutes"
];