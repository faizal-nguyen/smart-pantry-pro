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
  shoppingList: ShoppingListItem[];
  lastAnalyzed: Date;
}

export interface ShoppingListItem {
  ingredient: RecipeIngredient;
  quantity: number;
  unit: string;
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
    refetchOnWindowFocus: true,
    // Éviter de refaire des requêtes si la recette n'existe plus
    retry: (failureCount, error: any) => {
      // Ne pas retenter si c'est une erreur 406 (recette supprimée) ou 404 (non trouvée)
      if (error?.code === 'PGRST116' || error?.message?.includes('JSON object requested, multiple (or no) rows returned')) {
        console.warn(`Recipe ${recipeId} not found - stopping retry attempts`);
        return false;
      }
      // Retenter maximum 2 fois pour les autres erreurs
      return failureCount < 2;
    },
    // Log des erreurs pour debugging
    onError: (error: any) => {
      if (error?.code === 'PGRST116') {
        console.warn(`Recipe ${recipeId} no longer exists - removing from analysis`);
      } else {
        console.error(`Recipe inventory analysis error for ${recipeId}:`, error);
      }
    }
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

    // 1. Récupérer la recette via le résolveur unifié AVANT de toucher
    //    au cache. `recipe_inventory_cache.recipe_id` a une FK vers
    //    `recipes(id)` ; un id `user_recipes` wrapper la viole. Si la
    //    source n'est pas `recipes`, on skip le cache (read + write) et
    //    on recalcule à chaque fois — acceptable pour une page detail
    //    et bien moins bruyant qu'un cycle "406 → cleanup → re-insert
    //    fail → 23503" qui spamait la console.
    const [recipe, inventory] = await Promise.all([
      getRecipeWithIngredients(recipeId),
      getUserInventory(user.user.id)
    ]);
    const cacheableId: string | null =
      recipe.source === 'recipes' ? recipe.canonicalId : null;

    // Phase 3 — pre-fetch authoritative matches from the server-side
    // RPC (direct FK + semantic fallback via embeddings). The map keys
    // are recipe_ingredients.id; misses fall back to the legacy
    // Levenshtein path inside findInventoryMatch.
    const serverMatches = cacheableId
      ? await loadServerMatches(recipe.canonicalId, user.user.id, inventory)
      : new Map<string, ServerMatch>();

    if (cacheableId) {
      const cachedAnalysis = await getCachedAnalysis(cacheableId, user.user.id);
      if (cachedAnalysis && !isExpired(cachedAnalysis)) {
        console.log('📊 Using cached inventory analysis');
        return cachedAnalysis.analysis_result;
      }
    }

    if (!recipe) {
      throw new Error(`RECIPE_NOT_FOUND: Recipe ${recipeId} not found`);
    }

    // 3. Analyse intelligente ingredient par ingredient
    const analysis: InventoryAnalysis = {
      recipeId,
      canMake: false,
      confidence: 0,
      availableIngredients: [],
      missingIngredients: [],
      possibleSubstitutions: [],
      shoppingList: [],
      lastAnalyzed: new Date()
    };

    // 4. Matcher chaque ingrédient avec inventaire (pattern Cipher matching)
    for (const ingredient of recipe.ingredients) {
      const match = await findInventoryMatch(ingredient, inventory, serverMatches);
      
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
          analysis.missingIngredients.push({
            ingredient,
            urgency: ingredient.is_essential ? 'high' : 'medium',
            possibleSubstitutions: await findPossibleSubstitutions(ingredient, inventory)
          });
      }
    }

    // 5. Calculs finaux (pattern Cipher intelligence)
    analysis.canMake = determineCanMake(analysis);
    analysis.confidence = calculateOverallConfidence(analysis);
    analysis.shoppingList = generateShoppingList(analysis);

    // 6. Stocker en cache (pattern Cipher performance).
    //    Only write the cache for sources that satisfy the FK
    //    (`recipe_inventory_cache.recipe_id` → `recipes(id)`). Catalog
    //    wrappers recalculate on every visit, no cache.
    if (cacheableId) {
      await cacheAnalysis(cacheableId, user.user.id, analysis);
    }

    console.log(`🍳 Recipe analysis completed: ${analysis.canMake ? '✅ Can make' : '❌ Missing ingredients'}`);
    
    return analysis;

  } catch (error: any) {
    // Gestion spécifique des recettes supprimées
    if (error.message?.includes('RECIPE_NOT_FOUND')) {
      console.warn(`🗑️ Recipe ${recipeId} has been deleted - cannot analyze inventory`);
      // Nettoyer le cache pour cette recette
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        await cleanupOrphanedCacheEntries(recipeId, user.user.id);
      }
      throw new Error(`Recipe ${recipeId} no longer exists`);
    }
    
    // Log et re-throw les autres erreurs
    console.error('Error analyzing recipe inventory:', error);
    throw error;
  }
};

// Cache management (pattern Cipher précautions)
const getCachedAnalysis = async (recipeId: string, userId: string) => {
  try {
    const { data, error } = await supabase
      .from('recipe_inventory_cache')
      .select('*')
      .eq('recipe_id', recipeId)
      .eq('user_id', userId)
      .single();

    // Si erreur 406 ou PGRST116, la recette n'existe plus - nettoyer le cache
    if (error?.code === 'PGRST116') {
      console.log(`🧹 Nettoyage cache pour recette supprimée: ${recipeId}`);
      await cleanupOrphanedCacheEntries(recipeId, userId);
      return null;
    }
    
    if (error) {
      console.warn('Cache lookup error (non-blocking):', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.warn('Failed to get cached analysis:', error);
    return null;
  }
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

// Helpers pour données.
//
// Resolves the recipe via the unified lookup (legacy `recipes`, then
// `user_recipes` wrapper, then `recipes_catalog`). RECIPE_NOT_FOUND is
// only thrown when ALL three sources miss — that is the *only* case that
// warrants the cache-cleanup path. Before this change, library cards
// backed by the catalog hit `recipes` only, returned PGRST116, and
// triggered an infinite cleanup loop.
const getRecipeWithIngredients = async (recipeId: string) => {
  try {
    const { fetchUnifiedRecipe } = await import('@/lib/recipeSource');
    const recipe = await fetchUnifiedRecipe(recipeId);

    if (!recipe) {
      throw new Error(`RECIPE_NOT_FOUND: Recipe ${recipeId} not found in any source`);
    }

    // Catalog-backed rows ship ingredients inline as JSONB. Legacy
    // `recipes` rows use the dedicated `recipe_ingredients` table.
    let ingredients: any[];
    if (recipe.inlineIngredients && recipe.inlineIngredients.length > 0) {
      ingredients = recipe.inlineIngredients.map((it, idx) => ({
        id: `${recipe.id}-${idx}`,
        recipe_id: recipe.canonicalId,
        ingredient_name: it.ingredient_name,
        quantity: it.quantity,
        unit: it.unit,
        is_essential: it.is_essential,
        notes: it.notes,
      }));
    } else {
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', recipe.canonicalId);
      if (error) {
        console.warn(`⚠️ Error fetching ingredients for recipe ${recipeId}:`, error);
      }
      ingredients = data || [];
    }

    return {
      ...recipe,
      ingredients,
    };
  } catch (error: any) {
    if (error.message?.includes('RECIPE_NOT_FOUND')) {
      throw error;
    }
    console.error(`Error fetching recipe ${recipeId} with ingredients:`, error);
    throw error;
  }
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

// Phase 3 — server-side match cached for a single analysis call.
export interface ServerMatch {
  inventoryItem: InventoryItem;
  kind: 'direct' | 'semantic';
  score: number;
}

interface ServerMatchRow {
  recipe_ingredient_id: string;
  inventory_id: string | null;
  inventory_product_id: string | null;
  inventory_product_name: string | null;
  inventory_quantity: number | null;
  match_kind: 'direct' | 'semantic' | 'missing';
  match_score: number;
}

const loadServerMatches = async (
  recipeId: string,
  userId: string,
  inventory: InventoryItem[],
): Promise<Map<string, ServerMatch>> => {
  const out = new Map<string, ServerMatch>();
  try {
    const { data, error } = await supabase.rpc(
      'assistant_match_recipe_ingredients_to_inventory',
      {
        p_recipe_id: recipeId,
        p_user_id: userId,
        p_min_score: 0.85,
      },
    );
    if (error) {
      console.warn('[recipe-match] RPC failed, falling back to Levenshtein:', error.message);
      return out;
    }
    const rows = (data ?? []) as ServerMatchRow[];
    const inventoryById = new Map(inventory.map((it) => [it.id, it]));
    for (const row of rows) {
      if (row.match_kind === 'missing' || !row.inventory_id) continue;
      const item = inventoryById.get(row.inventory_id);
      if (!item) continue;
      out.set(row.recipe_ingredient_id, {
        inventoryItem: item,
        kind: row.match_kind,
        score: row.match_score ?? 1,
      });
    }
  } catch (err) {
    console.warn('[recipe-match] RPC threw, falling back to Levenshtein:', err);
  }
  return out;
};

// Matching intelligent (pattern Cipher) — server RPC first, Levenshtein
// fallback for legacy/catalog ingredients that aren't backed by a real
// recipe_ingredients row.
const findInventoryMatch = async (
  ingredient: RecipeIngredient,
  inventory: InventoryItem[],
  serverMatches: Map<string, ServerMatch> = new Map(),
): Promise<{
  type: 'exact' | 'fuzzy' | 'substitution' | 'missing';
  item?: InventoryItem;
  confidence?: number;
  substitution?: Substitution;
}> => {
  // 0. Server-side authoritative match (Phase 3 — direct FK + semantic
  //    fallback via pgvector embeddings). If the RPC already resolved
  //    this ingredient, trust it.
  //
  //    Quantity sufficiency used to gate this match, but that was
  //    wrong: recipe units (ml, c. à soupe) rarely line up with
  //    inventory units (unit, bottles, packs) so the conversion
  //    returns ~0 and the match was discarded — users were told they
  //    didn't have ingredients they clearly had. We now ALWAYS return
  //    the server match; insufficient-quantity is a soft UX hint that
  //    the consumer can surface separately if needed, not a yes/no
  //    gate on availability.
  const serverHit = serverMatches.get(ingredient.id);
  if (serverHit) {
    console.log(
      `🎯 Server ${serverHit.kind} match for ${ingredient.ingredient_name} → ${serverHit.inventoryItem.product?.name} (${Math.round(serverHit.score * 100)}%)`,
    );
    return {
      type: serverHit.kind === 'direct' ? 'exact' : 'fuzzy',
      item: serverHit.inventoryItem,
      confidence: serverHit.score,
    };
  }

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

// Fonction de nettoyage pour les entrées de cache orphelines
const cleanupOrphanedCacheEntries = async (recipeId: string, userId: string) => {
  try {
    console.log(`🧹 Cleaning up orphaned cache entries for recipe ${recipeId}`);
    
    const { error } = await supabase
      .from('recipe_inventory_cache')
      .delete()
      .eq('recipe_id', recipeId)
      .eq('user_id', userId);
    
    if (error) {
      console.warn('Failed to cleanup orphaned cache entry:', error);
    } else {
      console.log(`✅ Cleaned up cache for deleted recipe ${recipeId}`);
    }
  } catch (error) {
    console.warn('Cleanup error (non-blocking):', error);
  }
};

// Fonction utilitaire pour nettoyer toutes les entrées orphelines d'un utilisateur
export const cleanupAllOrphanedCacheEntries = async (userId: string) => {
  try {
    console.log('🧹 Starting cleanup of all orphaned cache entries...');
    
    // 1. Récupérer toutes les entrées de cache de l'utilisateur
    const { data: cacheEntries, error: cacheError } = await supabase
      .from('recipe_inventory_cache')
      .select('recipe_id, id')
      .eq('user_id', userId);
    
    if (cacheError) {
      console.error('Error fetching cache entries:', cacheError);
      return;
    }
    
    if (!cacheEntries || cacheEntries.length === 0) {
      console.log('No cache entries found for user');
      return;
    }
    
    // 2. Récupérer toutes les recettes existantes
    const { data: existingRecipes, error: recipesError } = await supabase
      .from('recipes')
      .select('id');
    
    if (recipesError) {
      console.error('Error fetching recipes:', recipesError);
      return;
    }
    
    // 3. Identifier les entrées orphelines
    const existingRecipeIds = new Set(existingRecipes?.map(r => r.id) || []);
    const orphanedEntries = cacheEntries.filter(entry => !existingRecipeIds.has(entry.recipe_id));
    
    if (orphanedEntries.length > 0) {
      console.log(`Found ${orphanedEntries.length} orphaned cache entries`);
      
      // 4. Supprimer les entrées orphelines
      const orphanedIds = orphanedEntries.map(entry => entry.id);
      const { error: deleteError } = await supabase
        .from('recipe_inventory_cache')
        .delete()
        .in('id', orphanedIds);
      
      if (deleteError) {
        console.error('Error deleting orphaned entries:', deleteError);
      } else {
        console.log(`✅ Cleaned up ${orphanedEntries.length} orphaned cache entries`);
      }
    } else {
      console.log('No orphaned cache entries found');
    }
  } catch (error) {
    console.error('Cleanup all orphaned entries error:', error);
  }
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


const generateShoppingList = (analysis: InventoryAnalysis): ShoppingListItem[] => {
  return analysis.missingIngredients.map((missing) => ({
    ingredient: missing.ingredient,
    quantity: missing.ingredient.quantity || 1,
    unit: missing.ingredient.unit || 'unité',
    priority: missing.urgency === 'high' ? 3 : missing.urgency === 'medium' ? 2 : 1,
    storeSection: getStoreSectionForIngredient(missing.ingredient.ingredient_name)
  }));
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
    if (recipeIds.length === 0) return;
    
    setLoading(true);
    try {
      // Analyser chaque recette individuellement, en gérant les erreurs
      const results = await Promise.allSettled(
        recipeIds.map(async (id) => {
          try {
            const analysis = await analyzeRecipeInventory(id);
            return { id, analysis };
          } catch (error: any) {
            // Log les recettes supprimées mais ne pas faire échouer tout le batch
            if (error.message?.includes('no longer exists')) {
              console.warn(`⚠️ Skipping deleted recipe ${id} in batch analysis`);
            } else {
              console.error(`Error analyzing recipe ${id}:`, error);
            }
            return null;
          }
        })
      );

      // Filtrer les résultats valides et construire le map
      const analysisMap = results.reduce((acc, result) => {
        if (result.status === 'fulfilled' && result.value) {
          const { id, analysis } = result.value;
          acc[id] = analysis;
        }
        return acc;
      }, {} as Record<string, InventoryAnalysis>);

      setAnalyses(analysisMap);
      
      // Log le résumé
      const successCount = Object.keys(analysisMap).length;
      const failedCount = recipeIds.length - successCount;
      console.log(`📊 Batch analysis completed: ${successCount} success, ${failedCount} failed/skipped`);
      
    } catch (error) {
      console.error('Error in multiple recipe analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (recipeIds.length > 0) {
      analyzeMultiple();
    } else {
      // Si pas de recettes, nettoyer les analyses
      setAnalyses({});
    }
  }, [recipeIds.join(',')]);

  return {
    analyses,
    loading,
    refetch: analyzeMultiple
  };
};