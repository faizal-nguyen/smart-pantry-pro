import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { InventoryItem } from "./useInventory";
import { RecipeIngredient } from "./useRecipes";

// Types pour analyse inventaire ↔ recettes (PRP Cipher)
export interface InventoryMatch {
  ingredient: RecipeIngredient;
  inventoryItem: InventoryItem;
  matchType: 'exact' | 'fuzzy' | 'substitution';
  confidence: number;
}

export interface MissingIngredient {
  ingredient: RecipeIngredient;
  estimatedPrice: number;
  urgency: 'high' | 'medium' | 'low';
  possibleSubstitutions?: Substitution[];
}

export interface Substitution {
  original: string;
  substitute: string;
  ratio: number;
  notes: string;
  confidence: number;
}

export interface InventoryAnalysis {
  recipeId: string;
  canMake: boolean;
  confidence: number;
  availableIngredients: InventoryMatch[];
  missingIngredients: MissingIngredient[];
  possibleSubstitutions: Substitution[];
  estimatedCost: number; // Coût des ingrédients manquants
  totalRecipeCost: number; // Coût total de la recette
  shoppingList: ShoppingListItem[];
  lastAnalyzed: Date;
}

export interface ShoppingListItem {
  ingredient: RecipeIngredient;
  quantity: number;
  unit: string;
  estimatedPrice: number;
  priority: number;
  storeSection: string;
}

// Hook principal avec cache intelligent (pattern Cipher)
export const useRecipeInventoryAnalysis = (recipeId: string) => {
  const { data: analysis, isLoading, error, refetch } = useQuery({
    queryKey: ['recipe-inventory-analysis', recipeId],
    queryFn: () => analyzeRecipeInventory(recipeId),
    staleTime: 300000, // 5 minutes (plus court pour éviter les faux positifs)
    cacheTime: 600000, // 10 minutes
    enabled: !!recipeId,
    // Invalider le cache quand l'inventaire change
    refetchOnWindowFocus: true
  });

  return {
    analysis,
    loading: isLoading,
    error,
    refetch,
    isStale: analysis ? new Date().getTime() - analysis.lastAnalyzed.getTime() > 300000 : true
  };
};

// Service d'analyse principal (pattern Cipher intelligence)
export const analyzeRecipeInventory = async (recipeId: string): Promise<InventoryAnalysis> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    // 1. Vérifier cache existant (pattern Cipher performance)
    const cachedAnalysis = await getCachedAnalysis(recipeId, user.user.id);
    if (cachedAnalysis && !isExpired(cachedAnalysis)) {
      console.log('📊 Using cached inventory analysis');
      return cachedAnalysis.analysis_result;
    }

    // 2. Récupérer données recette + inventaire
    const [recipe, inventory] = await Promise.all([
      getRecipeWithIngredients(recipeId),
      getUserInventory(user.user.id)
    ]);

    if (!recipe) {
      throw new Error('Recipe not found');
    }

    // 3. Analyse intelligente ingredient par ingredient
    const analysis: InventoryAnalysis = {
      recipeId,
      canMake: false,
      confidence: 0,
      availableIngredients: [],
      missingIngredients: [],
      possibleSubstitutions: [],
      estimatedCost: 0,
      totalRecipeCost: 0,
      shoppingList: [],
      lastAnalyzed: new Date()
    };

    // 4. Matcher chaque ingrédient avec inventaire (pattern Cipher matching)
    for (const ingredient of recipe.ingredients) {
      const match = await findInventoryMatch(ingredient, inventory);
      
      switch (match.type) {
        case 'exact':
        case 'fuzzy':
          analysis.availableIngredients.push({
            ingredient,
            inventoryItem: match.item,
            matchType: match.type,
            confidence: match.confidence || 1.0
          });
          break;
          
        case 'substitution':
          if (match.substitution) {
            analysis.possibleSubstitutions.push(match.substitution);
          }
          break;
          
        default:
          // Ingrédient manquant
          const estimatedPrice = await getEstimatedPrice(ingredient);
          analysis.missingIngredients.push({
            ingredient,
            estimatedPrice,
            urgency: ingredient.is_essential ? 'high' : 'medium',
            possibleSubstitutions: await findPossibleSubstitutions(ingredient, inventory)
          });
      }
    }

    // 5. Calculs finaux (pattern Cipher intelligence)
    analysis.canMake = determineCanMake(analysis);
    analysis.confidence = calculateOverallConfidence(analysis);
    analysis.estimatedCost = calculateMissingIngredientsCost(analysis);
    analysis.totalRecipeCost = await calculateTotalRecipeCost(recipe.ingredients);
    analysis.shoppingList = generateShoppingList(analysis);

    // 6. Stocker en cache (pattern Cipher performance)
    await cacheAnalysis(recipeId, user.user.id, analysis);

    console.log(`🍳 Recipe analysis completed: ${analysis.canMake ? '✅ Can make' : '❌ Missing ingredients'}`);
    
    return analysis;

  } catch (error) {
    console.error('Error analyzing recipe inventory:', error);
    throw error;
  }
};

// Cache management (pattern Cipher précautions)
const getCachedAnalysis = async (recipeId: string, userId: string) => {
  const { data, error } = await supabase
    .from('recipe_inventory_cache')
    .select('*')
    .eq('recipe_id', recipeId)
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return data;
};

const isExpired = (cachedData: any): boolean => {
  return new Date(cachedData.expires_at) < new Date();
};

const cacheAnalysis = async (recipeId: string, userId: string, analysis: InventoryAnalysis) => {
  try {
    // Utiliser la fonction SQL pour éviter les conflits
    const { error } = await supabase.rpc('upsert_recipe_inventory_cache', {
      p_recipe_id: recipeId,
      p_user_id: userId,
      p_analysis_result: analysis
    });
    
    if (error) {
      console.warn('Failed to cache analysis:', error);
      // Ne pas faire échouer l'analyse si le cache échoue
    }
  } catch (err) {
    console.warn('Cache error (non-blocking):', err);
  }
};

// Helpers pour données
const getRecipeWithIngredients = async (recipeId: string) => {
  const [recipeResult, ingredientsResult] = await Promise.all([
    supabase.from('recipes').select('*').eq('id', recipeId).single(),
    supabase.from('recipe_ingredients').select('*').eq('recipe_id', recipeId)
  ]);

  if (recipeResult.error) throw recipeResult.error;
  
  return {
    ...recipeResult.data,
    ingredients: ingredientsResult.data || []
  };
};

const getUserInventory = async (userId: string): Promise<InventoryItem[]> => {
  const { data, error } = await supabase
    .from('inventory')
    .select(`
      *,
      product:products(*)
    `)
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
};

// Matching intelligent (pattern Cipher)
const findInventoryMatch = async (ingredient: RecipeIngredient, inventory: InventoryItem[]): Promise<{
  type: 'exact' | 'fuzzy' | 'substitution' | 'missing';
  item?: InventoryItem;
  confidence?: number;
  substitution?: Substitution;
}> => {
  // 1. Exact match
  const exactMatch = inventory.find(item => 
    item.product?.name.toLowerCase() === ingredient.ingredient_name.toLowerCase()
  );
  
  if (exactMatch) {
    console.log(`🎯 Exact match found for ${ingredient.ingredient_name}: ${exactMatch.product?.name}`);
    if (hasEnoughQuantity(exactMatch, ingredient)) {
      return { type: 'exact', item: exactMatch, confidence: 1.0 };
    } else {
      console.log(`❌ Not enough quantity: need ${ingredient.quantity} ${ingredient.unit}, have ${exactMatch.quantity} ${exactMatch.unit}`);
    }
  }

  // 2. Fuzzy match avec Levenshtein distance (plus strict)
  const fuzzyMatches = inventory
    .map(item => ({
      item,
      distance: levenshteinDistance(
        ingredient.ingredient_name.toLowerCase(),
        item.product?.name.toLowerCase() || ''
      ),
      similarity: calculateSimilarity(
        ingredient.ingredient_name.toLowerCase(),
        item.product?.name.toLowerCase() || ''
      )
    }))
    // Plus strict: distance <= 1 ET similarité >= 85%
    .filter(match => match.distance <= 1 && match.similarity >= 0.85)
    .sort((a, b) => b.similarity - a.similarity);

  if (fuzzyMatches.length > 0) {
    console.log(`🔍 Fuzzy match candidates for ${ingredient.ingredient_name}:`, 
      fuzzyMatches.map(m => ({
        name: m.item.product?.name,
        distance: m.distance,
        similarity: m.similarity
      }))
    );
    
    if (hasEnoughQuantity(fuzzyMatches[0].item, ingredient)) {
      const confidence = fuzzyMatches[0].similarity;
      console.log(`✅ Accepted fuzzy match: ${fuzzyMatches[0].item.product?.name} (${Math.round(confidence * 100)}% confidence)`);
      return { type: 'fuzzy', item: fuzzyMatches[0].item, confidence };
    }
  }

  // 3. Chercher substitution possible
  const substitution = await findBestSubstitution(ingredient, inventory);
  if (substitution) {
    return { type: 'substitution', substitution };
  }

  // 4. Aucun match trouvé
  return { type: 'missing' };
};

// Substitutions intelligentes (pattern Cipher base de données)
const findBestSubstitution = async (ingredient: RecipeIngredient, inventory: InventoryItem[]): Promise<Substitution | null> => {
  const { data: substitutions } = await supabase
    .from('ingredient_substitutions')
    .select('*')
    .eq('original_ingredient', ingredient.ingredient_name.toLowerCase());

  if (!substitutions || substitutions.length === 0) return null;

  // Chercher dans l'inventaire si on a le substitut
  for (const sub of substitutions) {
    const substituteMatch = inventory.find(item =>
      item.product?.name.toLowerCase().includes(sub.substitute_ingredient.toLowerCase())
    );

    if (substituteMatch) {
      return {
        original: ingredient.ingredient_name,
        substitute: sub.substitute_ingredient,
        ratio: sub.ratio,
        notes: sub.notes || '',
        confidence: 0.8
      };
    }
  }

  return null;
};

const findPossibleSubstitutions = async (ingredient: RecipeIngredient, inventory: InventoryItem[]): Promise<Substitution[]> => {
  const substitution = await findBestSubstitution(ingredient, inventory);
  return substitution ? [substitution] : [];
};

// Algorithmes de matching (pattern Cipher)
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

const hasEnoughQuantity = (inventoryItem: InventoryItem, ingredient: RecipeIngredient): boolean => {
  if (!ingredient.quantity) return true; // Si pas de quantité spécifiée, on assume que c'est OK
  
  // Conversion d'unités basique
  const convertedQuantity = convertToCommonUnit(
    inventoryItem.quantity,
    inventoryItem.unit || 'g',
    ingredient.unit || 'g'
  );
  
  // Vérifier avec une marge de tolérance de 10%
  return convertedQuantity >= (ingredient.quantity * 0.9);
};

// Conversion d'unités basique
const convertToCommonUnit = (quantity: number, fromUnit: string, toUnit: string): number => {
  // Normaliser les unités
  const from = fromUnit.toLowerCase().trim();
  const to = toUnit.toLowerCase().trim();
  
  // Si même unité, pas de conversion
  if (from === to) return quantity;
  
  // Table de conversion basique
  const conversions: Record<string, number> = {
    // Poids (base: grammes)
    'g': 1,
    'gr': 1,
    'gramme': 1,
    'grammes': 1,
    'kg': 1000,
    'kilogramme': 1000,
    'kilogrammes': 1000,
    'mg': 0.001,
    'milligramme': 0.001,
    'milligrammes': 0.001,
    // Volume (base: ml)
    'ml': 1,
    'millilitre': 1,
    'millilitres': 1,
    'l': 1000,
    'litre': 1000,
    'litres': 1000,
    'cl': 10,
    'centilitre': 10,
    'centilitres': 10,
    'dl': 100,
    'decilitre': 100,
    'decilitres': 100,
    // Cuillères
    'c.à.s': 15, // ml
    'c.à.c': 5,  // ml
    'cuillère à soupe': 15,
    'cuillère à café': 5,
    'cas': 15,
    'cac': 5,
    // Unités
    'unité': 1,
    'unités': 1,
    'pièce': 1,
    'pièces': 1
  };
  
  // Si les deux unités sont dans la table de conversion
  if (conversions[from] && conversions[to]) {
    // Convertir en unité de base puis vers l'unité cible
    const baseQuantity = quantity * conversions[from];
    return baseQuantity / conversions[to];
  }
  
  // Si pas de conversion possible, retourner la quantité originale
  console.warn(`Impossible de convertir de ${from} vers ${to}`);
  return quantity;
};

// Calcul de similarité plus précis
const calculateSimilarity = (str1: string, str2: string): number => {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : 1 - (distance / maxLength);
};

// Calculs d'analyse (pattern Cipher)
const determineCanMake = (analysis: InventoryAnalysis): boolean => {
  const essentialMissing = analysis.missingIngredients.filter(mi => mi.ingredient.is_essential);
  
  // Peut faire si aucun ingrédient essentiel manquant, ou si substitutions disponibles
  return essentialMissing.length === 0 || 
         (essentialMissing.length <= 2 && analysis.possibleSubstitutions.length > 0);
};

const calculateOverallConfidence = (analysis: InventoryAnalysis): number => {
  const totalIngredients = analysis.availableIngredients.length + analysis.missingIngredients.length;
  if (totalIngredients === 0) return 0;
  
  const availableScore = analysis.availableIngredients.reduce((sum, match) => sum + match.confidence, 0);
  const substitutionScore = analysis.possibleSubstitutions.length * 0.6; // Substitutions ont 60% confidence
  
  return Math.min(1.0, (availableScore + substitutionScore) / totalIngredients);
};

const calculateMissingIngredientsCost = (analysis: InventoryAnalysis): number => {
  return analysis.missingIngredients.reduce((sum, missing) => sum + missing.estimatedPrice, 0);
};

const calculateTotalRecipeCost = async (ingredients: RecipeIngredient[]): Promise<number> => {
  let totalCost = 0;
  
  for (const ingredient of ingredients) {
    const price = await getEstimatedPrice(ingredient);
    totalCost += price;
  }
  
  return Math.round(totalCost * 100) / 100;
};

const generateShoppingList = (analysis: InventoryAnalysis): ShoppingListItem[] => {
  return analysis.missingIngredients.map((missing, index) => ({
    ingredient: missing.ingredient,
    quantity: missing.ingredient.quantity || 1,
    unit: missing.ingredient.unit || 'unité',
    estimatedPrice: missing.estimatedPrice,
    priority: missing.urgency === 'high' ? 3 : missing.urgency === 'medium' ? 2 : 1,
    storeSection: getStoreSectionForIngredient(missing.ingredient.ingredient_name)
  }));
};

// Estimation prix (pattern Cipher avec APIs externes)
const getEstimatedPrice = async (ingredient: RecipeIngredient): Promise<number> => {
  // Base de prix étendue et plus réaliste (prix moyens en €/kg ou €/L)
  const basePrices: Record<string, number> = {
    // Légumes (€/kg)
    'tomate': 2.5,
    'tomates': 2.5,
    'oignon': 1.8,
    'oignons': 1.8,
    'onion': 1.8,
    'onions': 1.8,
    'ail': 6.0,
    'carotte': 1.5,
    'carottes': 1.5,
    'pomme de terre': 1.2,
    'pommes de terre': 1.2,
    'poivron': 3.5,
    'poivrons': 3.5,
    'courgette': 2.0,
    'courgettes': 2.0,
    'aubergine': 2.8,
    'aubergines': 2.8,
    'salade': 1.5,
    'épinards': 4.0,
    'champignon': 5.0,
    'champignons': 5.0,
    
    // Fruits (€/kg)
    'pomme': 2.0,
    'pommes': 2.0,
    'banane': 1.8,
    'bananes': 1.8,
    'orange': 2.2,
    'oranges': 2.2,
    'citron': 2.5,
    'citrons': 2.5,
    
    // Viandes (€/kg)
    'poulet': 8.0,
    'boeuf': 15.0,
    'porc': 7.0,
    'agneau': 18.0,
    'veau': 20.0,
    'viande hachée': 9.0,
    
    // Poissons (€/kg)
    'saumon': 18.0,
    'cabillaud': 15.0,
    'thon': 12.0,
    'crevettes': 20.0,
    
    // Produits laitiers
    'lait': 1.2, // €/L
    'milk': 1.2,
    'beurre': 8.0, // €/kg
    'crème': 3.0, // €/L
    'crème fraîche': 3.0,
    'fromage': 12.0, // €/kg
    'yaourt': 2.0, // €/kg
    'oeufs': 3.0, // €/douzaine -> environ 0.25€/unité
    'oeuf': 0.25, // €/unité
    
    // Épicerie (€/kg ou €/L)
    'farine': 1.0,
    'sucre': 1.2,
    'sugar': 1.2,
    'pâtes': 2.0,
    'riz': 2.5,
    'huile': 3.0, // €/L
    "huile d'olive": 6.0,
    'olive oil': 6.0,
    'vinaigre': 2.0,
    'sel': 0.8,
    'salt': 0.8,
    'poivre': 20.0, // Épices chères au kg
    'pepper': 20.0,
    'paprika': 15.0,
    'cumin': 18.0,
    'curry': 12.0,
    'herbes de provence': 25.0,
    'thym': 30.0,
    'basilic': 40.0,
    'persil': 15.0,
    'coriandre': 20.0,
    'gingembre': 10.0,
    'ginger': 10.0,
    
    // Pain et viennoiseries
    'pain': 3.0,
    'baguette': 1.0, // €/unité
    
    // Conserves (€/kg)
    'tomates pelées': 2.0,
    'concentré de tomates': 4.0,
    'haricots': 2.5,
    'maïs': 3.0,
    
    // Ingrédients manquants ajoutés
    'eau': 0.001, // €/L (pratiquement gratuit)
    'water': 0.001,
    'feuilles de curry': 40.0, // €/kg (cher mais utilisé en petite quantité)
    'curry leaves': 40.0,
    'lentilles': 3.0,
    'lentilles toor': 4.0,
    'poireau': 2.5,
    'leek': 2.5,
    'asperges': 8.0,
    'asparagus': 8.0,
    'maïs doux': 3.0,
    'sweet corn': 3.0,
    'poivron rouge': 3.5,
    'red bell pepper': 3.5,
    'bell pepper': 3.5,
    'pâte de tamarin': 10.0,
    'tamarind paste': 10.0,
    'poudre de sambar': 15.0,
    'sambar powder': 15.0,
    'poudre de rasam': 15.0,
    'rasam powder': 15.0,
    'graines de moutarde': 8.0,
    'mustard seeds': 8.0,
    'asafoetida': 50.0,
    'asafoetida (hing)': 50.0,
    'hing': 50.0,
    'ghee': 15.0,
    'flank steak': 25.0,
    'pistaches': 30.0,
    'pistachios': 30.0,
    'noix de cajou': 25.0,
    'cashews': 25.0,
    'chopped cashews': 25.0,
    'amandes': 20.0,
    'almonds': 20.0,
    'raisins secs': 8.0,
    'raisins': 8.0,
    'lait concentré': 3.5,
    'condensed milk': 3.5,
    'poudre de cardamome': 80.0,
    'cardamom powder': 80.0,
    'safran': 5000.0, // Très cher au kg !
    'saffron': 5000.0,
    
    // Ingrédients supplémentaires pour recettes indiennes
    'curcuma': 12.0,
    'turmeric': 12.0,
    'turmeric powder': 12.0,
    'poudre de curcuma': 12.0,
    'poudre de chili': 15.0,
    'chili powder': 15.0,
    'piment rouge': 15.0,
    'red chili powder': 15.0,
    'garam masala': 20.0,
    'fenugrec': 10.0,
    'fenugreek': 10.0,
    'fenugreek seeds': 10.0,
    'graines de fenugrec': 10.0,
    'fenouil': 8.0,
    'fennel': 8.0,
    'fennel seeds': 8.0,
    'graines de fenouil': 8.0,
    'clou de girofle': 40.0,
    'cloves': 40.0,
    'cannelle': 25.0,
    'cinnamon': 25.0,
    'cinnamon stick': 25.0,
    'bâton de cannelle': 25.0,
    'noix de coco': 5.0,
    'coconut': 5.0,
    'grated coconut': 5.0,
    'noix de coco râpée': 5.0,
    'lait de coco': 3.0, // €/L
    'coconut milk': 3.0,
    'jaggery': 5.0,
    'tamarind': 10.0,
    'tamarin': 10.0,
    'dal': 3.5,
    'urad dal': 4.0,
    'chana dal': 3.5,
    'moong dal': 4.0,
    'toor dal': 4.0,
    'masoor dal': 3.0,
    'basmati rice': 3.5,
    'riz basmati': 3.5,
    'paneer': 15.0,
    'methi': 12.0,
    'fenugreek leaves': 12.0,
    'dried fenugreek leaves': 25.0,
    'kasuri methi': 25.0,
    'ajwain': 15.0,
    'carom seeds': 15.0,
    'kalonji': 12.0,
    'nigella seeds': 12.0,
    'black mustard seeds': 8.0,
    'graines de moutarde noire': 8.0,
    'sesame seeds': 10.0,
    'graines de sésame': 10.0,
    'poppy seeds': 25.0,
    'graines de pavot': 25.0,
    'dry red chili': 20.0,
    'piment rouge sec': 20.0,
    'green chili': 8.0,
    'piment vert': 8.0,
    'mint leaves': 15.0,
    'feuilles de menthe': 15.0,
    'pudina': 15.0,
    'dhania': 15.0,
    'coriander leaves': 15.0,
    'feuilles de coriandre': 15.0,
    'curry powder': 12.0,
    'poudre de curry': 12.0,
    'besan': 2.5,
    'gram flour': 2.5,
    'farine de pois chiche': 2.5,
    'atta': 1.5,
    'whole wheat flour': 1.5,
    'farine de blé complet': 1.5,
    'maida': 1.2,
    'all purpose flour': 1.2,
    'farine tout usage': 1.2,
    'semolina': 2.0,
    'semoule': 2.0,
    'sooji': 2.0,
    'rava': 2.0,
    
    // Par défaut
    'default': 3.0
  };
  
  // Recherche du prix avec gestion des pluriels et variantes
  const ingredientName = ingredient.ingredient_name.toLowerCase().trim();
  let basePrice = basePrices[ingredientName];
  
  // Si pas trouvé, chercher une correspondance partielle
  if (!basePrice) {
    for (const [key, price] of Object.entries(basePrices)) {
      if (ingredientName.includes(key) || key.includes(ingredientName)) {
        basePrice = price;
        break;
      }
    }
  }
  
  // Utiliser le prix par défaut si toujours pas trouvé
  if (!basePrice) {
    basePrice = basePrices.default;
    console.log(`⚠️ Prix non trouvé pour "${ingredientName}", utilisation du prix par défaut`);
  }
  
  // Calculer le prix en fonction de la quantité et de l'unité
  const quantity = ingredient.quantity || 1;
  const unit = (ingredient.unit || 'g').toLowerCase();
  
  // Debug log pour les feuilles de curry
  if (ingredientName.includes('curry') && ingredientName.includes('feuille')) {
    console.log(`🍃 Calcul prix feuilles de curry:`, {
      ingredient: ingredientName,
      quantity,
      unit,
      basePrice,
      unitLowerCase: unit
    });
  }
  
  // Conversion en prix final selon l'unité
  let finalPrice = basePrice;
  
  // Ajustement selon l'unité
  if (unit.includes('kg') || unit.includes('kilogramme')) {
    finalPrice = basePrice * quantity;
  } else if (unit === 'g' || unit.includes('gramme') || unit.includes('gram')) {
    finalPrice = basePrice * (quantity / 1000);
    console.log(`🥩 Calcul prix viande: ${quantity}g × ${basePrice}€/kg ÷ 1000 = ${finalPrice}€`);
  } else if (unit.includes('l') || unit.includes('litre')) {
    finalPrice = basePrice * quantity;
  } else if (unit.includes('ml') || unit.includes('millilitre')) {
    finalPrice = basePrice * (quantity / 1000);
  } else if (unit.includes('cl') || unit.includes('centilitre')) {
    finalPrice = basePrice * (quantity / 100);
  } else if (unit.includes('c.à.s') || unit.includes('cuillère à soupe')) {
    // 1 cuillère à soupe ≈ 15ml
    finalPrice = basePrice * (quantity * 15 / 1000);
  } else if (unit.includes('c.à.c') || unit.includes('cuillère à café')) {
    // 1 cuillère à café ≈ 5ml
    finalPrice = basePrice * (quantity * 5 / 1000);
  } else if (unit.includes('tasse') || unit.includes('cup')) {
    // 1 tasse ≈ 250ml
    finalPrice = basePrice * (quantity * 250 / 1000);
    console.log(`☕ Calcul prix tasse: ${quantity} tasses × ${basePrice}€/L × 0.25L = ${finalPrice}€`);
  } else if (unit.includes('verre')) {
    // 1 verre ≈ 200ml
    finalPrice = basePrice * (quantity * 200 / 1000);
  } else if (unit.includes('feuille') || unit.includes('leaf') || unit.includes('leaves')) {
    // Pour les feuilles (curry, laurier, etc.), prix très bas
    // Mais distinguer entre différents types de feuilles
    if (ingredientName.includes('curry') || ingredientName.includes('laurier') || ingredientName.includes('bay')) {
      finalPrice = 0.01 * quantity; // Feuilles d'aromates: 1 centime par feuille
    } else if (ingredientName.includes('menthe') || ingredientName.includes('mint') || 
               ingredientName.includes('coriandre') || ingredientName.includes('coriander')) {
      finalPrice = 0.05 * quantity; // Herbes fraîches: 5 centimes par feuille
    } else {
      finalPrice = 0.02 * quantity; // Autres feuilles: 2 centimes par feuille
    }
  } else if (unit.includes('pincée') || unit.includes('pointe') || unit.includes('pinch')) {
    // Une pincée ≈ 1g pour les épices
    finalPrice = basePrice * (quantity / 1000);
  } else if (unit.includes('gousse') || unit.includes('clove')) {
    // Pour l'ail: 1 gousse ≈ 5g
    if (ingredientName.includes('ail') || ingredientName.includes('garlic')) {
      finalPrice = basePrice * (quantity * 5 / 1000);
    } else {
      // Pour autres (ex: clou de girofle), prix unitaire
      finalPrice = basePrice * (quantity / 100);
    }
  } else if (unit.includes('bâton') || unit.includes('stick')) {
    // Pour la cannelle: 1 bâton ≈ 5g
    finalPrice = basePrice * (quantity * 5 / 1000);
  } else if (unit.includes('pod')) {
    // Pour la cardamome: 1 pod ≈ 0.2g
    finalPrice = basePrice * (quantity * 0.2 / 1000);
  } else if (unit.includes('unité') || unit.includes('pièce')) {
    // Pour les unités, on estime un poids moyen
    const unitWeights: Record<string, number> = {
      'tomate': 0.15, // 150g
      'oignon': 0.1, // 100g
      'carotte': 0.08, // 80g
      'pomme de terre': 0.2, // 200g
      'oeuf': 1, // Prix déjà par unité
      'citron': 0.1, // 100g
      'orange': 0.2, // 200g
      'banane': 0.15, // 150g
      'default': 0.1 // 100g par défaut
    };
    
    const unitWeight = unitWeights[ingredientName] || unitWeights.default;
    if (ingredientName === 'oeuf' || ingredientName === 'oeufs') {
      finalPrice = basePrice * quantity;
    } else {
      finalPrice = basePrice * quantity * unitWeight;
    }
  } else {
    // Pour les autres unités non reconnues
    // Vérifier si c'est un nombre seul (ex: "2" pour "2 oeufs")
    if (!isNaN(parseFloat(unit)) || unit === '' || unit === 'unité' || unit === 'unités') {
      // Cas spécial pour les feuilles de curry sans unité spécifiée
      if (ingredientName.includes('curry') && ingredientName.includes('feuille')) {
        finalPrice = 0.01 * quantity; // 1 centime par feuille
        console.log(`🍃 Prix spécial feuilles de curry sans unité: ${quantity} × 0.01€ = ${finalPrice}€`);
      } 
      // Cas spécial pour l'eau avec unité "tasse (250ml)" ou similaire
      else if ((ingredientName === 'eau' || ingredientName === 'water' || ingredientName.includes('eau')) && 
               (unit.includes('tasse') || unit.includes('250ml') || unit.includes('cup'))) {
        // 4 tasses = 1L = 0.001€
        finalPrice = basePrice * (quantity * 250 / 1000);
        console.log(`💧 Prix spécial eau: ${quantity} tasses × ${basePrice}€/L × 0.25L = ${finalPrice}€`);
      } else {
        // C'est probablement une quantité unitaire
        const unitWeights: Record<string, number> = {
          'tomate': 0.15, // 150g
          'oignon': 0.1, // 100g  
          'carotte': 0.08, // 80g
          'pomme de terre': 0.2, // 200g
          'oeuf': 1, // Prix déjà par unité
          'citron': 0.1, // 100g
          'orange': 0.2, // 200g
          'banane': 0.15, // 150g
          'feuilles de curry': 0.0001, // Les feuilles de curry pèsent très peu (0.1g par feuille)
          'curry leaves': 0.0001,
          'default': 0.1 // 100g par défaut
        };
        
        const unitWeight = unitWeights[ingredientName] || unitWeights.default;
        if (ingredientName === 'oeuf' || ingredientName === 'oeufs' || ingredientName === 'egg' || ingredientName === 'eggs') {
          finalPrice = basePrice * quantity;
        } else {
          finalPrice = basePrice * quantity * unitWeight;
        }
      }
    } else {
      // Vraiment non reconnu, estimation basée sur petite quantité
      finalPrice = basePrice * (quantity * 0.01);
      console.log(`⚠️ Unité non reconnue "${unit}" pour "${ingredientName}", estimation du prix`);
    }
  }
  
  // Arrondir à 2 décimales
  return Math.round(finalPrice * 100) / 100;
};

const getStoreSectionForIngredient = (ingredientName: string): string => {
  const name = ingredientName.toLowerCase().trim();
  
  // Catégories par mots-clés
  const categories = [
    {
      section: 'Fruits et légumes',
      keywords: ['tomate', 'oignon', 'ail', 'carotte', 'pomme de terre', 'pomme', 'poivron', 
                'courgette', 'aubergine', 'salade', 'épinard', 'champignon', 'banane', 
                'orange', 'citron', 'fraise', 'raisin', 'poire', 'pêche', 'abricot',
                'haricot vert', 'petit pois', 'brocoli', 'chou', 'poireau', 'céleri',
                'radis', 'concombre', 'avocat', 'mangue', 'ananas', 'kiwi']
    },
    {
      section: 'Boucherie',
      keywords: ['viande', 'boeuf', 'porc', 'agneau', 'veau', 'poulet', 'dinde', 
                'canard', 'lapin', 'steak', 'côte', 'rôti', 'escalope', 'filet',
                'hachée', 'saucisse', 'merguez', 'chorizo', 'jambon', 'lard', 'bacon']
    },
    {
      section: 'Poissonnerie',
      keywords: ['poisson', 'saumon', 'cabillaud', 'thon', 'truite', 'bar', 'dorade',
                'sole', 'sardine', 'maquereau', 'crevette', 'moule', 'huître',
                'coquille', 'crabe', 'homard', 'calamar', 'poulpe']
    },
    {
      section: 'Produits laitiers',
      keywords: ['lait', 'beurre', 'crème', 'yaourt', 'fromage', 'mozzarella', 
                'parmesan', 'gruyère', 'emmental', 'chèvre', 'roquefort', 'camembert',
                'crème fraîche', 'mascarpone', 'ricotta', 'feta']
    },
    {
      section: 'Boulangerie',
      keywords: ['pain', 'baguette', 'brioche', 'croissant', 'pain de mie', 
                'pain complet', 'pain de campagne', 'viennoiserie']
    },
    {
      section: 'Épicerie salée',
      keywords: ['pâtes', 'riz', 'quinoa', 'boulgour', 'semoule', 'lentille',
                'haricot', 'pois chiche', 'conserve', 'sauce tomate', 'concentré',
                'olive', 'câpre', 'cornichon', 'moutarde', 'mayonnaise', 'ketchup']
    },
    {
      section: 'Épicerie sucrée',
      keywords: ['sucre', 'miel', 'confiture', 'chocolat', 'cacao', 'vanille',
                'biscuit', 'gâteau', 'bonbon', 'céréale']
    },
    {
      section: 'Condiments et épices',
      keywords: ['sel', 'poivre', 'paprika', 'cumin', 'curry', 'cannelle', 'muscade',
                'thym', 'basilic', 'persil', 'coriandre', 'romarin', 'origan',
                'herbe', 'épice', 'safran', 'gingembre', 'curcuma', 'piment']
    },
    {
      section: 'Huiles et vinaigres',
      keywords: ['huile', 'vinaigre', 'huile d\'olive', 'huile de tournesol',
                'vinaigre balsamique', 'vinaigre de vin']
    },
    {
      section: 'Surgelés',
      keywords: ['surgelé', 'congelé', 'glace', 'sorbet']
    },
    {
      section: 'Boissons',
      keywords: ['eau', 'jus', 'soda', 'coca', 'limonade', 'thé', 'café', 
                'vin', 'bière', 'alcool']
    }
  ];
  
  // Chercher la catégorie correspondante
  for (const category of categories) {
    if (category.keywords.some(keyword => name.includes(keyword))) {
      return category.section;
    }
  }
  
  // Catégorie par défaut
  return 'Autres';
};

// Hook pour analyse multiple (pattern Cipher)
export const useMultipleRecipeAnalysis = (recipeIds: string[]) => {
  const [analyses, setAnalyses] = useState<Record<string, InventoryAnalysis>>({});
  const [loading, setLoading] = useState(false);

  const analyzeMultiple = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        recipeIds.map(async (id) => {
          const analysis = await analyzeRecipeInventory(id);
          return { id, analysis };
        })
      );

      const analysisMap = results.reduce((acc, { id, analysis }) => {
        acc[id] = analysis;
        return acc;
      }, {} as Record<string, InventoryAnalysis>);

      setAnalyses(analysisMap);
    } catch (error) {
      console.error('Error analyzing multiple recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (recipeIds.length > 0) {
      analyzeMultiple();
    }
  }, [recipeIds.join(',')]);

  return {
    analyses,
    loading,
    refetch: analyzeMultiple
  };
};