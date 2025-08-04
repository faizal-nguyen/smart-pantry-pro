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
  estimatedCost: number;
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
    staleTime: 3600000, // 1 heure (pattern Cipher précautions)
    cacheTime: 3600000,
    enabled: !!recipeId
  });

  return {
    analysis,
    loading: isLoading,
    error,
    refetch,
    isStale: analysis ? new Date().getTime() - analysis.lastAnalyzed.getTime() > 3600000 : true
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
    analysis.estimatedCost = calculateTotalCost(analysis);
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
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1h expiration

  await supabase
    .from('recipe_inventory_cache')
    .upsert({
      recipe_id: recipeId,
      user_id: userId,
      analysis_result: analysis,
      expires_at: expiresAt.toISOString()
    });
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
  
  if (exactMatch && hasEnoughQuantity(exactMatch, ingredient)) {
    return { type: 'exact', item: exactMatch, confidence: 1.0 };
  }

  // 2. Fuzzy match avec Levenshtein distance
  const fuzzyMatches = inventory
    .map(item => ({
      item,
      distance: levenshteinDistance(
        ingredient.ingredient_name.toLowerCase(),
        item.product?.name.toLowerCase() || ''
      )
    }))
    .filter(match => match.distance <= 2)
    .sort((a, b) => a.distance - b.distance);

  if (fuzzyMatches.length > 0 && hasEnoughQuantity(fuzzyMatches[0].item, ingredient)) {
    const confidence = Math.max(0.5, 1 - (fuzzyMatches[0].distance / 10));
    return { type: 'fuzzy', item: fuzzyMatches[0].item, confidence };
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
  
  // TODO: Conversion d'unités plus sophistiquée
  return inventoryItem.quantity >= ingredient.quantity;
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

const calculateTotalCost = (analysis: InventoryAnalysis): number => {
  return analysis.missingIngredients.reduce((sum, missing) => sum + missing.estimatedPrice, 0);
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
  // TODO: Intégrer avec APIs prix (OpenFoodFacts, courses U, etc.)
  // Pour l'instant, estimation basique
  const basePrices: Record<string, number> = {
    'tomate': 2.5,
    'oignon': 1.8,
    'ail': 3.0,
    'huile': 4.5,
    'sel': 1.0,
    'poivre': 5.0,
    'default': 3.0
  };
  
  const ingredientName = ingredient.ingredient_name.toLowerCase();
  const basePrice = basePrices[ingredientName] || basePrices.default;
  const quantity = ingredient.quantity || 1;
  
  return basePrice * (quantity / 100); // Prix au 100g/ml
};

const getStoreSectionForIngredient = (ingredientName: string): string => {
  const sections: Record<string, string> = {
    'tomate': 'Fruits et légumes',
    'oignon': 'Fruits et légumes',
    'ail': 'Fruits et légumes',
    'lait': 'Produits laitiers',
    'beurre': 'Produits laitiers',
    'viande': 'Boucherie',
    'poisson': 'Poissonnerie',
    'pâtes': 'Épicerie',
    'riz': 'Épicerie',
    'huile': 'Épicerie',
    'sel': 'Épicerie',
    'poivre': 'Épicerie'
  };
  
  const name = ingredientName.toLowerCase();
  return sections[name] || 'Autres';
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