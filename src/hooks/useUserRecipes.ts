/**
 * Hook pour gérer la bibliothèque personnelle de recettes de l'utilisateur
 * Partie "My Library" du pattern "Spotify des recettes"
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CatalogRecipe } from "./useRecipeCatalog";

// Types pour les recettes utilisateur
export interface UserRecipe {
  id: string;
  user_id: string;
  recipe_id?: string; // Référence vers catalog, null si custom
  is_from_catalog: boolean;
  
  // Contenu custom (si pas du catalogue)
  custom_title?: string;
  custom_ingredients_json?: Array<{
    name: string;
    amount: string;
    unit: string;
    notes?: string;
  }>;
  custom_instructions?: string;
  custom_photo_url?: string;
  
  // Personnalisations
  custom_modifications: {
    title?: string;
    ingredients_override?: any[];
    instructions_append?: string;
    servings_multiplier?: number;
    personal_notes_inline?: string;
  };
  
  // Métadonnées personnelles
  personal_notes?: string;
  personal_rating?: number; // 1-5
  personal_tags: string[];
  collections: string[];
  
  // Historique
  added_date: string;
  last_cooked_date?: string;
  times_cooked: number;
  
  // Partage
  is_shared: boolean;
  shared_with: string[];
  
  created_at: string;
  updated_at: string;
  
  // Relation avec le catalogue (si applicable)
  catalog_recipe?: CatalogRecipe;
}

export interface UserRecipeFilters {
  search?: string;
  collections?: string[];
  tags?: string[];
  isCustom?: boolean;
  hasBeenCooked?: boolean;
  rating?: number;
}

// Hook principal pour les recettes utilisateur
export function useUserRecipes() {
  const [filters, setFilters] = useState<UserRecipeFilters>({});
  const [sortBy, setSortBy] = useState<'added_date' | 'last_cooked_date' | 'times_cooked' | 'personal_rating'>('added_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const queryClient = useQueryClient();

  // Query pour récupérer les recettes de l'utilisateur
  const {
    data: recipes,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['user-recipes', filters, sortBy, sortDirection],
    queryFn: () => fetchUserRecipes(filters, sortBy, sortDirection),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Mutation pour ajouter une recette du catalogue (fallback: return mock)
  const addFromCatalog = useMutation({
    mutationFn: async ({
      catalogRecipeId,
      collections = [],
      personalNotes
    }: {
      catalogRecipeId: string;
      collections?: string[];
      personalNotes?: string;
    }) => {
      // Temporary: just return success without database operation
      return { id: 'temp-' + Date.now(), catalogRecipeId, collections, personalNotes };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-recipes'] });
      queryClient.invalidateQueries({ queryKey: ['user-collections'] });
    }
  });

  // Mutation pour créer une recette custom
  const addCustomRecipe = useMutation({
    mutationFn: async (customRecipe: {
      title: string;
      ingredients: Array<{ name: string; amount: string; unit: string; notes?: string }>;
      instructions: string;
      photo_url?: string;
      collections?: string[];
      personal_notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data, error } = await supabase
        .from('user_recipes')
        .insert({
          user_id: user.id,
          is_from_catalog: false,
          custom_title: customRecipe.title,
          custom_ingredients_json: customRecipe.ingredients,
          custom_instructions: customRecipe.instructions,
          custom_photo_url: customRecipe.photo_url,
          collections: customRecipe.collections || [],
          personal_notes: customRecipe.personal_notes,
          custom_modifications: {}
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-recipes'] });
      queryClient.invalidateQueries({ queryKey: ['user-collections'] });
    }
  });

  // Mutation pour modifier une recette
  const updateRecipe = useMutation({
    mutationFn: async ({
      recipeId,
      updates
    }: {
      recipeId: string;
      updates: Partial<UserRecipe>;
    }) => {
      const { data, error } = await supabase
        .from('user_recipes')
        .update(updates)
        .eq('id', recipeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-recipes'] });
    }
  });

  // Mutation pour supprimer une recette
  const deleteRecipe = useMutation({
    mutationFn: async (recipeId: string) => {
      const { error } = await supabase
        .from('user_recipes')
        .delete()
        .eq('id', recipeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-recipes'] });
      queryClient.invalidateQueries({ queryKey: ['user-collections'] });
    }
  });

  // Mutation pour marquer comme cuite
  const markAsCooked = useMutation({
    mutationFn: async (recipeId: string) => {
      const { data, error } = await supabase
        .from('user_recipes')
        .update({
          last_cooked_date: new Date().toISOString(),
          times_cooked: supabase.sql`times_cooked + 1`
        })
        .eq('id', recipeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-recipes'] });
    }
  });

  return {
    // Data
    recipes: recipes || [],
    
    // Loading states
    isLoading,
    error,
    
    // Actions
    refetch,
    addFromCatalog: addFromCatalog.mutate,
    addFromCatalogAsync: addFromCatalog.mutateAsync,
    addCustomRecipe: addCustomRecipe.mutate,
    addCustomRecipeAsync: addCustomRecipe.mutateAsync,
    updateRecipe: updateRecipe.mutate,
    updateRecipeAsync: updateRecipe.mutateAsync,
    deleteRecipe: deleteRecipe.mutate,
    markAsCooked: markAsCooked.mutate,
    
    // Loading states for mutations
    isAddingFromCatalog: addFromCatalog.isPending,
    isAddingCustom: addCustomRecipe.isPending,
    isUpdating: updateRecipe.isPending,
    isDeleting: deleteRecipe.isPending,
    
    // Filters & sorting
    filters,
    setFilters,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
  };
}

// Hook pour récupérer une recette utilisateur spécifique
export function useUserRecipe(recipeId: string | null) {
  return useQuery({
    queryKey: ['user-recipe', recipeId],
    queryFn: () => fetchUserRecipe(recipeId!),
    enabled: !!recipeId,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook pour vérifier si une recette du catalogue est déjà dans la bibliothèque
export function useIsRecipeInLibrary(catalogRecipeId: string | null) {
  return useQuery({
    queryKey: ['recipe-in-library', catalogRecipeId],
    queryFn: async () => {
      if (!catalogRecipeId) return false;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Fallback: toujours retourner false (pas dans la bibliothèque)
      return false;
    },
    enabled: !!catalogRecipeId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Hook pour gérer les collections d'utilisateur
export function useUserCollections() {
  const queryClient = useQueryClient();

  const { data: collections, isLoading } = useQuery({
    queryKey: ['user-collections'],
    queryFn: fetchUserCollections,
    staleTime: 5 * 60 * 1000,
  });

  const createCollection = useMutation({
    mutationFn: async (collection: {
      name: string;
      description?: string;
      color?: string;
      icon?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data, error } = await supabase
        .from('user_collections')
        .insert({
          user_id: user.id,
          ...collection
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-collections'] });
    }
  });

  const updateCollection = useMutation({
    mutationFn: async ({
      collectionId,
      updates
    }: {
      collectionId: string;
      updates: Partial<{
        name: string;
        description: string;
        color: string;
        icon: string;
      }>;
    }) => {
      const { data, error } = await supabase
        .from('user_collections')
        .update(updates)
        .eq('id', collectionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-collections'] });
    }
  });

  const deleteCollection = useMutation({
    mutationFn: async (collectionId: string) => {
      // First get collection name to remove from recipes
      const { data: collection } = await supabase
        .from('user_collections')
        .select('name')
        .eq('id', collectionId)
        .single();

      if (collection) {
        // Remove collection from all user recipes
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.sql`
            UPDATE user_recipes 
            SET collections = array_remove(collections, ${collection.name})
            WHERE user_id = ${user.id}
          `;
        }
      }

      // Delete the collection
      const { error } = await supabase
        .from('user_collections')
        .delete()
        .eq('id', collectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-collections'] });
      queryClient.invalidateQueries({ queryKey: ['user-recipes'] });
    }
  });

  return {
    collections: collections || [],
    isLoading,
    createCollection: createCollection.mutate,
    updateCollection: updateCollection.mutate,
    deleteCollection: deleteCollection.mutate,
    isCreating: createCollection.isPending,
    isUpdating: updateCollection.isPending,
    isDeleting: deleteCollection.isPending,
  };
}

// ====================================================================
// FONCTIONS UTILITAIRES
// ====================================================================

async function fetchUserRecipes(
  filters: UserRecipeFilters,
  sortBy: string,
  sortDirection: 'asc' | 'desc'
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Utilisateur non connecté');

  // Fallback: utiliser les recettes existantes temporairement
  let query = supabase
    .from('recipes')
    .select('*')
    .eq('user_id', user.id);

  // Apply filters
  if (filters.collections && filters.collections.length > 0) {
    query = query.overlaps('collections', filters.collections);
  }

  if (filters.tags && filters.tags.length > 0) {
    query = query.overlaps('personal_tags', filters.tags);
  }

  if (filters.isCustom !== undefined) {
    query = query.eq('is_from_catalog', !filters.isCustom);
  }

  if (filters.hasBeenCooked !== undefined) {
    if (filters.hasBeenCooked) {
      query = query.not('last_cooked_date', 'is', null);
    } else {
      query = query.is('last_cooked_date', null);
    }
  }

  if (filters.rating) {
    query = query.gte('personal_rating', filters.rating);
  }

  // Apply search
  if (filters.search) {
    query = query.or(`
      custom_title.ilike.%${filters.search}%,
      personal_notes.ilike.%${filters.search}%,
      catalog_recipe.title.ilike.%${filters.search}%
    `);
  }

  // Apply sorting (map field names)
  const sortField = sortBy === 'added_date' ? 'created_at' : sortBy === 'last_cooked_date' ? 'updated_at' : 'created_at';
  query = query.order(sortField, { ascending: sortDirection === 'asc' });

  const { data, error } = await query;

  if (error) throw error;
  return (data || []).map(mapRecipeToUserRecipe);
}

async function fetchUserRecipe(recipeId: string) {
  // Fallback: utiliser la table recipes existante
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', recipeId)
    .single();

  if (error) throw error;
  return mapRecipeToUserRecipe(data);
}

async function fetchUserCollections() {
  // Fallback: retourner des collections par défaut
  return [
    { id: '1', name: 'Favoris', description: 'Mes recettes préférées', color: '#ef4444', icon: 'heart' },
    { id: '2', name: 'Rapides', description: 'Moins de 30 minutes', color: '#22c55e', icon: 'clock' },
    { id: '3', name: 'Comfort Food', description: 'Plats réconfortants', color: '#f59e0b', icon: 'chef-hat' },
  ];
}

// Utilitaires pour obtenir le titre/image d'une recette (catalogue ou custom)
export function getRecipeTitle(recipe: UserRecipe): string {
  if (recipe.custom_modifications?.title) {
    return recipe.custom_modifications.title;
  }
  if (recipe.is_from_catalog && recipe.catalog_recipe) {
    return recipe.catalog_recipe.title;
  }
  return recipe.custom_title || 'Recette sans titre';
}

export function getRecipeImage(recipe: UserRecipe): string | undefined {
  if (recipe.is_from_catalog && recipe.catalog_recipe) {
    return recipe.catalog_recipe.photo_url;
  }
  return recipe.custom_photo_url;
}

export function getRecipeIngredients(recipe: UserRecipe) {
  if (recipe.custom_modifications?.ingredients_override) {
    return recipe.custom_modifications.ingredients_override;
  }
  if (recipe.is_from_catalog && recipe.catalog_recipe) {
    return recipe.catalog_recipe.ingredients_json;
  }
  return recipe.custom_ingredients_json || [];
}

// Fonction utilitaire pour mapper une recette existante vers UserRecipe
function mapRecipeToUserRecipe(recipe: any): UserRecipe {
  return {
    id: recipe.id,
    user_id: recipe.user_id,
    recipe_id: null,
    is_from_catalog: false,
    custom_title: recipe.name,
    custom_ingredients_json: recipe.ingredients || [],
    custom_instructions: recipe.instructions || '',
    custom_photo_url: recipe.image_url,
    custom_modifications: {},
    personal_notes: recipe.description,
    personal_rating: 4,
    personal_tags: recipe.tags || [],
    collections: [],
    added_date: recipe.created_at,
    times_cooked: 0,
    is_shared: false,
    shared_with: [],
    created_at: recipe.created_at,
    updated_at: recipe.updated_at,
  };
}

export function getRecipeInstructions(recipe: UserRecipe): string {
  let baseInstructions = '';
  
  if (recipe.is_from_catalog && recipe.catalog_recipe) {
    baseInstructions = recipe.catalog_recipe.instructions;
  } else {
    baseInstructions = recipe.custom_instructions || '';
  }
  
  if (recipe.custom_modifications?.instructions_append) {
    baseInstructions += '\n\nNotes personnelles:\n' + recipe.custom_modifications.instructions_append;
  }
  
  return baseInstructions;
}