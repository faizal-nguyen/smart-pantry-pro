/**
 * Hook pour gérer le catalogue global de recettes
 * Implémente le pattern "Spotify des recettes" - catalogue partagé
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Types pour le catalogue de recettes
export interface CatalogRecipe {
  id: string;
  title: string;
  description?: string;
  ingredients_json: Array<{
    name: string;
    amount: string;
    unit: string;
    notes?: string;
  }>;
  instructions: string;
  photo_url?: string;
  photo_credits?: string;
  nutrition_json?: {
    calories?: number;
    proteins?: number;
    carbs?: number;
    fats?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
  tags: string[];
  difficulty: number; // 1-5
  prep_time: number; // minutes
  cook_time: number; // minutes
  rest_time?: number; // minutes
  servings: number;
  source: string;
  source_url?: string;
  verified_status: boolean;
  rating_avg: number;
  rating_count: number;
  times_added: number;
  is_premium: boolean;
  is_exclusive: boolean;
  created_at: string;
  updated_at: string;
}

export interface CatalogFilters {
  search?: string;
  tags?: string[];
  difficulty?: number[];
  maxPrepTime?: number;
  maxCookTime?: number;
  cuisine?: string[];
  dietary?: string[]; // végétarien, sans-gluten, etc.
  rating?: number; // minimum rating
  isPremium?: boolean;
}

export interface CatalogSortOptions {
  field: 'rating_avg' | 'times_added' | 'prep_time' | 'created_at' | 'title';
  direction: 'asc' | 'desc';
}

// Hook principal pour le catalogue
export function useRecipeCatalog() {
  const [filters, setFilters] = useState<CatalogFilters>({});
  const [sortBy, setSortBy] = useState<CatalogSortOptions>({
    field: 'rating_avg',
    direction: 'desc'
  });
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);

  // Query pour récupérer les recettes du catalogue
  const {
    data: recipes,
    isLoading,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useQuery({
    queryKey: ['recipes-catalog', filters, sortBy, page],
    queryFn: () => fetchCatalogRecipes(filters, sortBy, page, pageSize),
    staleTime: 5 * 60 * 1000, // 5 minutes
    keepPreviousData: true,
  });

  return {
    // Data
    recipes: recipes?.data || [],
    totalCount: recipes?.count || 0,
    
    // Loading states
    isLoading,
    isFetchingNextPage,
    hasNextPage: (recipes?.data?.length || 0) >= pageSize,
    
    // Error handling
    error,
    
    // Actions
    refetch,
    fetchNextPage: () => setPage(prev => prev + 1),
    
    // Filters & sorting
    filters,
    setFilters,
    sortBy,
    setSortBy,
    
    // Pagination
    page,
    setPage,
    pageSize,
  };
}

// Hook pour récupérer une recette spécifique du catalogue
export function useCatalogRecipe(recipeId: string | null) {
  return useQuery({
    queryKey: ['catalog-recipe', recipeId],
    queryFn: () => fetchCatalogRecipe(recipeId!),
    enabled: !!recipeId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook pour noter une recette du catalogue
export function useRateCatalogRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      recipeId, 
      rating, 
      review 
    }: { 
      recipeId: string; 
      rating: number; 
      review?: string; 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data, error } = await supabase
        .from('catalog_ratings')
        .upsert({
          recipe_id: recipeId,
          user_id: user.id,
          rating,
          review_text: review,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalider les caches pertinents
      queryClient.invalidateQueries({ queryKey: ['catalog-recipe', variables.recipeId] });
      queryClient.invalidateQueries({ queryKey: ['recipes-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['user-recipe-rating', variables.recipeId] });
    },
  });
}

// Hook pour obtenir la note personnelle d'une recette
export function useUserRating(recipeId: string | null) {
  return useQuery({
    queryKey: ['user-recipe-rating', recipeId],
    queryFn: async () => {
      if (!recipeId) return null;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('catalog_ratings')
        .select('rating, review_text')
        .eq('recipe_id', recipeId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!recipeId,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook pour récupérer les recettes tendance/populaires
export function useTrendingRecipes() {
  return useQuery({
    queryKey: ['trending-recipes'],
    queryFn: () => fetchTrendingRecipes(),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Hook pour la recherche avec suggestions
export function useRecipeSearch(query: string) {
  return useQuery({
    queryKey: ['recipe-search', query],
    queryFn: () => searchRecipes(query),
    enabled: query.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ====================================================================
// FONCTIONS UTILITAIRES
// ====================================================================

async function fetchCatalogRecipes(
  filters: CatalogFilters,
  sortBy: CatalogSortOptions,
  page: number,
  pageSize: number
) {
  // Fallback: utiliser la table recipes existante temporairement
  let query = supabase
    .from('recipes')
    .select('*', { count: 'exact' })
    .eq('is_public', true);

  // Apply filters
  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  if (filters.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags);
  }

  if (filters.difficulty && filters.difficulty.length > 0) {
    query = query.in('difficulty', filters.difficulty);
  }

  if (filters.maxPrepTime) {
    query = query.lte('prep_time', filters.maxPrepTime);
  }

  if (filters.maxCookTime) {
    query = query.lte('cook_time', filters.maxCookTime);
  }

  if (filters.rating) {
    query = query.gte('rating_avg', filters.rating);
  }

  if (filters.isPremium !== undefined) {
    query = query.eq('is_premium', filters.isPremium);
  }

  // Apply sorting (map to existing fields)
  const sortField = sortBy.field === 'title' ? 'name' : sortBy.field === 'rating_avg' ? 'created_at' : sortBy.field;
  query = query.order(sortField, { ascending: sortBy.direction === 'asc' });

  // Apply pagination
  const start = page * pageSize;
  const end = start + pageSize - 1;
  query = query.range(start, end);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data: (data || []).map(mapRecipeToCatalogRecipe),
    count: count || 0,
  };
}

async function fetchCatalogRecipe(recipeId: string): Promise<CatalogRecipe> {
  // Fallback: utiliser la table recipes existante temporairement
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', recipeId)
    .eq('is_public', true)
    .single();

  if (error) throw error;
  return mapRecipeToCatalogRecipe(data);
}

async function fetchTrendingRecipes() {
  // Fallback: utiliser la table recipes existante temporairement
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(12);

  if (error) throw error;
  return (data || []).map(mapRecipeToCatalogRecipe);
}

async function searchRecipes(query: string) {
  // Fallback: utiliser la table recipes existante temporairement
  const { data, error } = await supabase
    .from('recipes')
    .select('id, name, description, image_url, tags, difficulty, prep_time')
    .eq('is_public', true)
    .ilike('name', `%${query}%`)
    .limit(10);

  if (error) throw error;
  return (data || []).map(recipe => ({
    id: recipe.id,
    title: recipe.name,
    description: recipe.description,
    photo_url: recipe.image_url,
    tags: recipe.tags || [],
    difficulty: recipe.difficulty,
    prep_time: recipe.prep_time,
    rating_avg: 4.0
  }));
}

// Utilitaires pour les filtres
export const RECIPE_TAGS = {
  DIETARY: ['végétarien', 'végétalien', 'sans-gluten', 'sans-lactose', 'keto', 'paleo'],
  CUISINE: ['italien', 'français', 'asiatique', 'mexicain', 'indien', 'méditerranéen'],
  MEAL_TYPE: ['petit-déjeuner', 'déjeuner', 'dîner', 'dessert', 'collation', 'apéritif'],
  COOKING_METHOD: ['four', 'poêle', 'mijoteuse', 'vapeur', 'grill', 'cru'],
  OCCASION: ['rapide', 'comfort food', 'festif', 'healthy', 'batch cooking', 'romantique'],
};

export const DIFFICULTY_LABELS = {
  1: 'Très facile',
  2: 'Facile', 
  3: 'Moyen',
  4: 'Difficile',
  5: 'Expert',
};

// Fonction utilitaire pour mapper une recette existante vers le format CatalogRecipe
function mapRecipeToCatalogRecipe(recipe: any): CatalogRecipe {
  return {
    id: recipe.id,
    title: recipe.name,
    description: recipe.description,
    ingredients_json: recipe.ingredients || [],
    instructions: recipe.instructions || '',
    photo_url: recipe.image_url,
    nutrition_json: recipe.nutrition_data || {},
    tags: recipe.tags || [],
    difficulty: recipe.difficulty || 3,
    prep_time: recipe.prep_time || 30,
    cook_time: recipe.cook_time || 30,
    rest_time: 0,
    servings: recipe.servings || 4,
    source: recipe.source || 'user',
    source_url: recipe.source_url,
    verified_status: true,
    rating_avg: 4.0,
    rating_count: 0,
    times_added: 0,
    is_premium: false,
    is_exclusive: false,
    created_at: recipe.created_at,
    updated_at: recipe.updated_at,
  };
}

export function formatCookingTime(prepTime: number, cookTime: number, restTime?: number): string {
  const total = prepTime + cookTime + (restTime || 0);
  
  if (total < 60) {
    return `${total} min`;
  }
  
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  
  if (minutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h${minutes.toString().padStart(2, '0')}`;
}