import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Types adaptés du PRP Cipher Enhanced
export interface Recipe {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  cuisine_category?: string;
  meal_type?: string;
  prep_time: number;
  cook_time: number;
  rest_time?: number;
  servings: number;
  difficulty: number; // 1-5
  instructions: string;
  tags?: string[];
  source_type?: string;
  source_url?: string;
  nutrition_info?: any;
  is_public: boolean;
  rating?: number;
  rating_count?: number;
  user_id: string;
  created_at: string;
  updated_at: string;
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
  nutrition_data?: any;
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

  // Fetch recipes avec pattern useInventory
  const fetchRecipes = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .or(`user_id.eq.${user.user.id},is_public.eq.true`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecipes(data || []);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    }
  };

  // Fetch une recette avec ses ingrédients
  const fetchRecipeWithIngredients = async (recipeId: string): Promise<RecipeWithIngredients | null> => {
    try {
      const [recipeResult, ingredientsResult] = await Promise.all([
        supabase
          .from('recipes')
          .select('*')
          .eq('id', recipeId)
          .single(),
        supabase
          .from('recipe_ingredients')
          .select('*')
          .eq('recipe_id', recipeId)
          .order('order_index', { ascending: true })
      ]);

      if (recipeResult.error) throw recipeResult.error;
      if (ingredientsResult.error) throw ingredientsResult.error;

      return {
        ...recipeResult.data,
        ingredients: ingredientsResult.data || []
      };
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
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // 1. Ajouter la recette
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert([{
          ...recipeData,
          user_id: user.user.id
        }])
        .select()
        .single();

      if (recipeError) throw recipeError;

      // 2. Ajouter les ingrédients
      if (ingredients.length > 0) {
        const ingredientsWithRecipeId = ingredients.map((ingredient, index) => ({
          ...ingredient,
          recipe_id: recipe.id,
          order_index: index
        }));

        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientsWithRecipeId);

        if (ingredientsError) throw ingredientsError;
      }

      setRecipes(prev => [recipe, ...prev]);
      console.log(`🍳 Recette complète ajoutée: ${recipeData.name} avec ${ingredients.length} ingrédients`);
      
      return recipe;
    } catch (error) {
      console.error('Error adding recipe with ingredients:', error);
      throw error;
    }
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
      return data;
    } catch (error) {
      console.error('Error updating recipe:', error);
      throw error;
    }
  };

  // Supprimer recette (pattern deleteInventory Cipher)
  const deleteRecipe = async (id: string) => {
    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRecipes(prev => prev.filter(recipe => recipe.id !== id));
      console.log(`🗑️ Recette supprimée: ${id}`);
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

      // Supprimer les champs auto-générés
      delete (duplicatedRecipeData as any).id;
      delete (duplicatedRecipeData as any).user_id;
      delete (duplicatedRecipeData as any).created_at;
      delete (duplicatedRecipeData as any).updated_at;

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

  return {
    // Data
    recipes,
    collections,
    loading,
    
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