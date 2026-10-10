import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mapLibraryRecipe, type LibraryRecipeRow, type StockIngredient, type RecipeReference } from "@smart/shared";
import { fetchUnifiedRecipe, invalidateUnifiedRecipeCache } from "@/lib/recipeSource";
import { saveRecipeWithIngredients } from "@/services/recipePersistence";
import { dispatchAgentDbChanged, useAgentDbInvalidation } from "@/lib/agentEvents";

// Types adaptés du PRP Cipher Enhanced
export interface Recipe {
  id: string;
  name: string;
  description?: string;
  image_url?: string | null;
  image_origin?: 'personal' | 'catalog' | null;
  cuisine_category?: string;
  meal_type?: string;
  prep_time: number | null;
  cook_time: number | null;
  rest_time?: number | null;
  servings: number | null;
  difficulty: number | null; // 1-5 when known
  source?: 'recipes' | 'user_recipes' | 'recipes_catalog';
  canonicalId?: string;
  instructions: string;
  tags?: string[];
  source_type?: string;
  source_url?: string;
  nutrition_info?: unknown;
  is_public: boolean;
  rating?: number;
  rating_count?: number;
  user_id: string;
  created_at: string;
  updated_at: string;
  inlineIngredients?: StockIngredient[];
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_name: string;
  quantity?: number;
  unit?: string;
  is_essential: boolean;
  notes?: string;
  order_index?: number;
  inventory_product_id?: string;
  calories_per_unit?: number;
  nutrition_data?: unknown;
}

export interface RecipeWithIngredients extends Recipe {
  ingredients: RecipeIngredient[];
}

export interface RecipeCollection {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// Pattern hook adapté de useInventory Cipher
export const useRecipes = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [collections, setCollections] = useState<RecipeCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,setError] = useState<Error | null>(null);

  // Fetch recipes avec pattern useInventory.
  //
  // The library has two storage layers (PRP-031 "Spotify" architecture):
  //   - `recipes`      : legacy user-owned imports + public catalog rows.
  //   - `user_recipes` : pointer table linking the user to a `recipes_catalog`
  //                      entry (or carrying a fully custom payload).
  // We merge BOTH so that `recipes.find(r => r.id === id)` (used by
  // `RecipeDetail` and `useRecipeInventoryAnalysis`) resolves library cards
  // backed by the catalog. Without this merge those cards trigger spurious
  // "RECIPE_NOT_FOUND" cleanup loops.
  const fetchRecipes = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const [legacy, userLib] = await Promise.all([
        supabase
          .from('recipes')
          .select('*')
          .or(`user_id.eq.${user.user.id},is_public.eq.true`)
          .order('created_at', { ascending: false }),
        supabase
          .from('user_recipes')
          .select('*, catalog_recipe:recipes_catalog(*)')
          .eq('user_id', user.user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (legacy.error) throw legacy.error;
      if (userLib.error) throw userLib.error;

      const merged: Recipe[] = [
        ...((legacy.data as Recipe[] | null) ?? []).map(row => ({ ...row, source: 'recipes' as const, canonicalId: row.id })),
        ...((userLib.data as LibraryRecipeRow[] | null) ?? [])
          .map(mapUserRecipeRowToRecipe)
          .filter((r): r is Recipe => r !== null),
      ];

      setRecipes(merged); setError(null);
    } catch (error) {
      setError(error instanceof Error ? error : new Error('La bibliothèque n’a pas pu être chargée.'));
    }
  };

  // Maps a `user_recipes` row (with `recipes_catalog` joined as `catalog_recipe`)
  // to the Recipe shape consumed by the rest of the app. Returns null when
  // the wrapper has neither a catalog backing nor a custom title (the row
  // would not display usefully).
  function mapUserRecipeRowToRecipe(row: LibraryRecipeRow): Recipe {
    return mapLibraryRecipe(row) as Recipe;
  }

  // Fetch une recette avec ses ingrédients
  const fetchRecipeWithIngredients = async (recipeId: string): Promise<RecipeWithIngredients | null> => {
    try {
      const recipe = await fetchUnifiedRecipe(recipeId);
      if (!recipe) return null;
      if (recipe.inlineIngredients) return { ...recipe, ingredients: recipe.inlineIngredients.map((ingredient,index) => ({
        ...ingredient, id: `${recipeId}:${index}`, recipe_id: recipeId,
      })) } as RecipeWithIngredients;
      const { data, error } = await supabase.from('recipe_ingredients').select('*').eq('recipe_id',recipeId).order('order_index');
      if (error) throw error;
      return { ...recipe, ingredients: data ?? [] } as RecipeWithIngredients;
    } catch (error) {
      console.error('Error fetching recipe with ingredients:', error);
      return null;
    }
  };

  // Fetch collections
  const fetchCollections = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('recipe_collections')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCollections(data || []);
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  // Ajouter recette (pattern addProduct Cipher)
  const addRecipe = async (recipeData: Omit<Recipe, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('recipes')
        .insert([{
          ...recipeData,
          user_id: user.user.id
        }])
        .select()
        .single();

      if (error) throw error;
      
      setRecipes(prev => [data, ...prev]);
      console.log(`✨ Recette ajoutée: ${recipeData.name}`);
      
      return data;
    } catch (error) {
      console.error('Error adding recipe:', error);
      throw error;
    }
  };

  // Ajouter recette avec ingrédients (pattern Cipher complet)
  const addRecipeWithIngredients = async (
    recipeData: Omit<Recipe, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
    ingredients: Omit<RecipeIngredient, 'id' | 'recipe_id'>[]
  ) => {
    const { name, instructions, description, image_url, cuisine_category, meal_type,
      prep_time, cook_time, rest_time, servings, difficulty, tags, is_public, source_type, source_url } = recipeData;
    const recipe = await saveRecipeWithIngredients({
      recipe: { name, instructions, description, image_url, cuisine_category, meal_type, prep_time, cook_time,
        rest_time, servings, difficulty, tags: tags ?? [], is_public, source_type, source_url },
      ingredients: ingredients.map(({ ingredient_name, quantity, unit, is_essential, notes, inventory_product_id }) => ({
        ingredient_name, quantity, unit, is_essential, notes, inventory_product_id,
      })),
    });
    setRecipes(prev => [recipe as Recipe, ...prev.filter(row => row.id !== recipe.id)]);
    return recipe;
  };

  // Mettre à jour recette (pattern updateInventory Cipher)
  const updateRecipe = async (id: string, updates: Partial<Recipe>) => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setRecipes(prev => 
        prev.map(recipe => 
          recipe.id === id ? { ...recipe, ...data } : recipe
        )
      );

      console.log(`📝 Recette mise à jour: ${data.name}`);
      invalidateUnifiedRecipeCache(id);
      dispatchAgentDbChanged(["recipes", "recipe_ingredients"]);
      return data;
    } catch (error) {
      console.error('Error updating recipe:', error);
      throw error;
    }
  };

  // Supprimer recette (pattern deleteInventory Cipher)
  const deleteRecipe = async (id: string, source: RecipeReference['source'] = 'auto') => {
    try {
      const recipe = await fetchUnifiedRecipe(id, source);
      const { data: { user } } = await supabase.auth.getUser();
      if (!recipe || !user || recipe.user_id !== user.id || recipe.source === 'recipes_catalog') throw new Error('Cette recette ne peut pas être supprimée de votre bibliothèque.');
      const { data, error } = await supabase.from(recipe.source === 'user_recipes' ? 'user_recipes' : 'recipes')
        .delete().eq('user_id',user.id).eq('id',id).select('id');
      if (error || data?.length !== 1) throw error ?? new Error('Suppression non confirmée.');
      setRecipes(prev => prev.filter(row => row.id !== id || (row.source ?? 'recipes') !== recipe.source));
      invalidateUnifiedRecipeCache(id); dispatchAgentDbChanged(['recipes','recipe_ingredients','user_recipes']);
    } catch (error) {
      console.error('Error deleting recipe:', error);
      throw error;
    }
  };

  // Dupliquer recette (pattern Cipher)
  const duplicateRecipe = async (recipeId: string) => {
    try {
      const originalRecipe = await fetchRecipeWithIngredients(recipeId);
      if (!originalRecipe) throw new Error('Recipe not found');

      const { ingredients, ...recipeData } = originalRecipe;
      const duplicatedRecipeData = {
        ...recipeData,
        name: `${recipeData.name} (copie)`,
        is_public: false
      };

      // The persistence helper selects only editable recipe fields and creates new identities.

      const duplicatedIngredients = ingredients.map(ingredient => {
        const { id, recipe_id, ...ingredientData } = ingredient;
        return ingredientData;
      });

      return await addRecipeWithIngredients(duplicatedRecipeData, duplicatedIngredients);
    } catch (error) {
      console.error('Error duplicating recipe:', error);
      throw error;
    }
  };

  // Recherche recettes (pattern Cipher)
  const searchRecipes = async (query: string, filters?: {
    cuisine_category?: string;
    meal_type?: string;
    difficulty?: number;
    max_time?: number;
  }) => {
    try {
      let queryBuilder = supabase
        .from('recipes')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .or(`user_id.eq.${(await supabase.auth.getUser()).data.user?.id},is_public.eq.true`);

      if (filters?.cuisine_category) {
        queryBuilder = queryBuilder.eq('cuisine_category', filters.cuisine_category);
      }

      if (filters?.meal_type) {
        queryBuilder = queryBuilder.eq('meal_type', filters.meal_type);
      }

      if (filters?.difficulty) {
        queryBuilder = queryBuilder.eq('difficulty', filters.difficulty);
      }

      if (filters?.max_time) {
        queryBuilder = queryBuilder.lte('prep_time', filters.max_time);
      }

      const { data, error } = await queryBuilder
        .order('rating', { ascending: false, nullsLast: true })
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching recipes:', error);
      return [];
    }
  };

  // Obtenir recettes populaires (pattern Cipher)
  const getPopularRecipes = async (limit = 10) => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('is_public', true)
        .not('rating', 'is', null)
        .order('rating', { ascending: false })
        .order('rating_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching popular recipes:', error);
      return [];
    }
  };

  // Initialize (pattern useInventory Cipher)
  useEffect(() => {
    const initializeRecipes = async () => {
      setLoading(true);
      await Promise.all([
        fetchRecipes(),
        fetchCollections()
      ]);
      setLoading(false);
    };

    initializeRecipes();
  }, []);

  // Real-time subscriptions (pattern Cipher)
  useEffect(() => {
    const recipeSubscription = supabase
      .channel('recipes_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'recipes' },
        (payload) => {
          console.log('🔄 Recipe change detected:', payload);
          fetchRecipes(); // Refresh on changes
        }
      )
      .subscribe();

    return () => {
      recipeSubscription.unsubscribe();
    };
  }, []);

  // PRP-221: belt-and-braces — also refetch on agent-triggered writes
  // even if the Supabase realtime channel hiccups.
  useAgentDbInvalidation(['recipes', 'recipe_ingredients', 'user_recipes'], fetchRecipes);

  return {
    // Data
    recipes,
    collections,
    loading, error,
    
    // Actions CRUD
    addRecipe,
    addRecipeWithIngredients,
    updateRecipe,
    deleteRecipe,
    duplicateRecipe,
    
    // Fetch methods
    fetchRecipes,
    fetchRecipeWithIngredients,
    fetchCollections,
    
    // Search & discovery
    searchRecipes,
    getPopularRecipes,
    
    // Computed
    totalRecipes: recipes.length,
    publicRecipes: recipes.filter(r => r.is_public).length,
    privateRecipes: recipes.filter(r => !r.is_public).length
  };
};
