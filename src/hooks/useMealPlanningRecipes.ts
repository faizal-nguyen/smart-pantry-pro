import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CatalogRecipe {
  id: string;
  title: string;
  description?: string;
  ingredients_json: any[];
  instructions: string;
  photo_url?: string;
  tags?: string[];
  difficulty: number;
  prep_time: number;
  cook_time: number;
  rest_time?: number;
  servings: number;
  rating_avg?: number;
  rating_count?: number;
  times_added?: number;
  source?: string;
  verified_status: boolean;
  is_premium: boolean;
  nutrition_json?: any;
  created_at: string;
  updated_at: string;
}

export interface UserRecipe {
  id: string;
  user_id: string;
  recipe_id?: string;
  is_from_catalog: boolean;
  custom_title?: string;
  custom_ingredients_json?: any[];
  custom_instructions?: string;
  custom_photo_url?: string;
  custom_modifications?: any;
  personal_notes?: string;
  personal_rating?: number;
  personal_tags?: string[];
  collections?: string[];
  added_date: string;
  last_cooked_date?: string;
  times_cooked: number;
}

export interface RecipeWithDetails extends CatalogRecipe {
  isPersonal: boolean;
  personalData?: UserRecipe;
  estimatedCost: number;
  totalTime: number;
}

export const useMealPlanningRecipes = () => {
  const [catalogRecipes, setCatalogRecipes] = useState<CatalogRecipe[]>([]);
  const [userRecipes, setUserRecipes] = useState<UserRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  // Load verified catalog recipes
  const loadCatalogRecipes = async (limit = 50) => {
    try {
      const { data, error } = await supabase
        .from('recipes_catalog')
        .select('*')
        .eq('verified_status', true)
        .order('rating_avg', { ascending: false, nullsLast: true })
        .order('times_added', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setCatalogRecipes(data || []);
    } catch (error) {
      console.error('Error loading catalog recipes:', error);
    }
  };

  // Load user's personal recipe library
  const loadUserRecipes = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('user_recipes')
        .select('*')
        .eq('user_id', user.user.id)
        .order('added_date', { ascending: false });

      if (error) throw error;
      setUserRecipes(data || []);
    } catch (error) {
      console.error('Error loading user recipes:', error);
    }
  };

  // Search in both catalog and user recipes
  const searchRecipes = async (
    query: string, 
    filters?: {
      difficulty?: number;
      max_time?: number;
      tags?: string[];
      cuisine_type?: string;
    }
  ): Promise<RecipeWithDetails[]> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      // Search in catalog
      let catalogQuery = supabase
        .from('recipes_catalog')
        .select('*')
        .eq('verified_status', true)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`);

      // Apply filters
      if (filters?.difficulty) {
        catalogQuery = catalogQuery.lte('difficulty', filters.difficulty);
      }
      
      if (filters?.max_time) {
        catalogQuery = catalogQuery.lte('prep_time', filters.max_time);
      }

      if (filters?.tags && filters.tags.length > 0) {
        catalogQuery = catalogQuery.overlaps('tags', filters.tags);
      }

      const { data: catalogResults, error: catalogError } = await catalogQuery
        .order('rating_avg', { ascending: false, nullsLast: true })
        .limit(20);

      if (catalogError) throw catalogError;

      // Search in user recipes if authenticated
      let userResults: any[] = [];
      if (user.user) {
        const { data: userRecipeResults, error: userError } = await supabase
          .from('user_recipes')
          .select(`
            *,
            catalog_recipe:recipes_catalog(*)
          `)
          .eq('user_id', user.user.id)
          .or(
            `custom_title.ilike.%${query}%,` +
            `catalog_recipe.title.ilike.%${query}%,` +
            `personal_notes.ilike.%${query}%`
          );

        if (!userError) {
          userResults = userRecipeResults || [];
        }
      }

      // Combine and transform results
      const combinedResults: RecipeWithDetails[] = [];

      // Add catalog recipes
      (catalogResults || []).forEach(recipe => {
        combinedResults.push(transformCatalogRecipe(recipe));
      });

      // Add user recipes
      userResults.forEach(userRecipe => {
        if (userRecipe.is_from_catalog && userRecipe.catalog_recipe) {
          // User recipe based on catalog
          combinedResults.push(transformCatalogRecipe(
            userRecipe.catalog_recipe,
            userRecipe
          ));
        } else if (!userRecipe.is_from_catalog) {
          // Custom user recipe
          combinedResults.push(transformCustomRecipe(userRecipe));
        }
      });

      // Remove duplicates and sort by relevance
      const uniqueResults = combinedResults.filter((recipe, index, array) => 
        array.findIndex(r => r.id === recipe.id) === index
      );

      return uniqueResults.sort((a, b) => {
        // Prioritize personal recipes and high ratings
        if (a.isPersonal && !b.isPersonal) return -1;
        if (!a.isPersonal && b.isPersonal) return 1;
        return (b.rating_avg || 0) - (a.rating_avg || 0);
      });

    } catch (error) {
      console.error('Error searching recipes:', error);
      return [];
    }
  };

  // Get popular recipes from catalog
  const getPopularRecipes = async (limit = 10): Promise<RecipeWithDetails[]> => {
    try {
      const { data, error } = await supabase
        .from('recipes_catalog')
        .select('*')
        .eq('verified_status', true)
        .order('rating_avg', { ascending: false, nullsLast: true })
        .order('times_added', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      return (data || []).map(recipe => transformCatalogRecipe(recipe));
    } catch (error) {
      console.error('Error loading popular recipes:', error);
      return [];
    }
  };

  // Get user's favorite recipes
  const getFavoriteRecipes = async (): Promise<RecipeWithDetails[]> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('user_recipes')
        .select(`
          *,
          catalog_recipe:recipes_catalog(*)
        `)
        .eq('user_id', user.user.id)
        .gte('personal_rating', 4)
        .order('times_cooked', { ascending: false })
        .order('added_date', { ascending: false });

      if (error) throw error;

      return (data || []).map(userRecipe => {
        if (userRecipe.is_from_catalog && userRecipe.catalog_recipe) {
          return transformCatalogRecipe(userRecipe.catalog_recipe, userRecipe);
        } else {
          return transformCustomRecipe(userRecipe);
        }
      });
    } catch (error) {
      console.error('Error loading favorite recipes:', error);
      return [];
    }
  };

  // Transform catalog recipe to unified format
  const transformCatalogRecipe = (
    recipe: CatalogRecipe, 
    personalData?: UserRecipe
  ): RecipeWithDetails => ({
    ...recipe,
    isPersonal: !!personalData,
    personalData,
    estimatedCost: estimateRecipeCost(recipe),
    totalTime: recipe.prep_time + recipe.cook_time + (recipe.rest_time || 0)
  });

  // Transform custom user recipe to unified format
  const transformCustomRecipe = (userRecipe: UserRecipe): RecipeWithDetails => ({
    id: userRecipe.id,
    title: userRecipe.custom_title || 'Recette personnalisée',
    description: userRecipe.personal_notes,
    ingredients_json: userRecipe.custom_ingredients_json || [],
    instructions: userRecipe.custom_instructions || '',
    photo_url: userRecipe.custom_photo_url,
    tags: userRecipe.personal_tags || [],
    difficulty: 3, // Default difficulty for custom recipes
    prep_time: 30, // Default prep time
    cook_time: 30, // Default cook time
    servings: 4, // Default servings
    rating_avg: userRecipe.personal_rating,
    verified_status: false,
    is_premium: false,
    created_at: userRecipe.added_date,
    updated_at: userRecipe.added_date,
    isPersonal: true,
    personalData: userRecipe,
    estimatedCost: 5.0, // Default cost for custom recipes
    totalTime: 60 // Default total time
  });

  // Estimate recipe cost based on ingredients and complexity
  const estimateRecipeCost = (recipe: CatalogRecipe): number => {
    const baseCostPerServing = 3.5;
    const difficultyMultiplier = 1 + (recipe.difficulty - 3) * 0.2;
    const ingredientCount = recipe.ingredients_json?.length || 5;
    const ingredientMultiplier = 1 + (ingredientCount - 5) * 0.1;
    
    const estimatedCost = baseCostPerServing * recipe.servings * difficultyMultiplier * ingredientMultiplier;
    return Math.round(estimatedCost * 100) / 100;
  };

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await Promise.all([
        loadCatalogRecipes(),
        loadUserRecipes()
      ]);
      setLoading(false);
    };

    initializeData();
  }, []);

  return {
    catalogRecipes,
    userRecipes,
    loading,
    searchRecipes,
    getPopularRecipes,
    getFavoriteRecipes,
    loadCatalogRecipes,
    loadUserRecipes,
    
    // Computed values
    totalCatalogRecipes: catalogRecipes.length,
    totalUserRecipes: userRecipes.length,
    recentlyCooked: userRecipes
      .filter(r => r.last_cooked_date)
      .sort((a, b) => new Date(b.last_cooked_date!).getTime() - new Date(a.last_cooked_date!).getTime())
      .slice(0, 5)
  };
};