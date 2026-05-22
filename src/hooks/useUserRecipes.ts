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

  // Champ legacy / import — type de cuisine au format libre.
  // Sert de source autoritaire dans inferCuisineKey() avant de
  // fallback sur les tags. Vide pour les rows `user_recipes`
  // (catalog) car la cuisine vit alors dans catalog_recipe.tags.
  cuisine_category?: string;

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

  // PRP-239 PR3 — facets extracted from ingredients. Populated for legacy
  // `recipes` rows by RecipeFacetExtractor (Phase 3 backfill). Optional
  // because `user_recipes` (catalog pointers) doesn't have its own facets
  // yet — those land in V2.
  recipe_facets?: {
    protein_families?: string[];
    protein_cuts?: string[];
    dietary_flags?: string[];
    quality_flags?: string[];
  };
}

export interface UserRecipeFilters {
  search?: string;
  collections?: string[];
  tags?: string[];
  isCustom?: boolean;
  hasBeenCooked?: boolean;
  rating?: number;
  // PRP-239 PR3 — protein/cut/dietary filters. Multi-select within
  // each axis (OR), combined across axes (AND). E.g. families=['poulet','boeuf']
  // + cuts=['hache'] returns recipes that have poulet OR boeuf AND hache.
  proteinFamilies?: string[];
  proteinCuts?: string[];
  dietaryFlags?: string[];
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

  // The library has two storage layers (PRP-031 "Spotify" architecture):
  //   1. `recipes`       — legacy/standalone recipes owned by the user
  //                        (imports Instagram/YouTube, manual SQL inserts).
  //   2. `user_recipes`  — pointers into the global `recipes_catalog`
  //                        with optional per-user customisation.
  // We must read BOTH and merge, otherwise catalog-added recipes are
  // silently invisible (cf. 2026-05-17 audit: 19 legacy + 11 catalog).
  const [legacyRes, userLibRes] = await Promise.all([
    supabase.from('recipes').select('*').eq('user_id', user.id),
    supabase
      .from('user_recipes')
      .select('*, catalog_recipe:recipes_catalog(*)')
      .eq('user_id', user.id),
  ]);

  if (legacyRes.error) throw legacyRes.error;
  // user_recipes/catalog can be missing on environments not yet migrated;
  // we degrade to legacy-only instead of failing the whole query.
  if (userLibRes.error) {
    console.warn('[useUserRecipes] user_recipes read failed, falling back to legacy only:', userLibRes.error.message);
  }

  const merged: UserRecipe[] = [
    ...(legacyRes.data || []).map(mapRecipeToUserRecipe),
    ...((userLibRes.data || []) as any[]).map(mapUserRecipesRowToUserRecipe),
  ];

  // Filters and sort run in-memory across the merged set. Two reasons:
  // - the legacy `recipes` table doesn't carry `collections` / `personal_*`
  //   columns, so duplicating the filter SQL is brittle.
  // - the merged set is small (tens of rows per user in practice).
  const filtered = applyUserRecipeFilters(merged, filters);
  return sortUserRecipes(filtered, sortBy, sortDirection);
}

function applyUserRecipeFilters(
  rows: UserRecipe[],
  filters: UserRecipeFilters
): UserRecipe[] {
  return rows.filter(r => {
    if (filters.collections?.length) {
      const hit = filters.collections.some(c => r.collections.includes(c));
      if (!hit) return false;
    }
    if (filters.tags?.length) {
      const hit = filters.tags.some(t => r.personal_tags.includes(t));
      if (!hit) return false;
    }
    if (filters.isCustom !== undefined) {
      if (filters.isCustom === r.is_from_catalog) return false;
    }
    if (filters.hasBeenCooked !== undefined) {
      const cooked = !!r.last_cooked_date;
      if (filters.hasBeenCooked !== cooked) return false;
    }
    if (filters.rating && (r.personal_rating ?? 0) < filters.rating) {
      return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = [
        r.custom_title,
        r.personal_notes,
        r.catalog_recipe?.title,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    // PRP-239 PR3 — facet filters. A recipe with no recipe_facets
    // (catalog rows pre-backfill, custom recipes) passes the family
    // filter only when the filter is empty, so we don't silently drop
    // user-owned data that hasn't been classified yet.
    const facets = r.recipe_facets ?? {};
    if (filters.proteinFamilies?.length) {
      const have = facets.protein_families ?? [];
      const hit = filters.proteinFamilies.some((f) => have.includes(f));
      if (!hit) return false;
    }
    if (filters.proteinCuts?.length) {
      const have = facets.protein_cuts ?? [];
      const hit = filters.proteinCuts.some((c) => have.includes(c));
      if (!hit) return false;
    }
    if (filters.dietaryFlags?.length) {
      const have = facets.dietary_flags ?? [];
      // Dietary filters are AND (recipe must have ALL the requested flags).
      // Otherwise selecting "végétarien + vegan" would return recipes
      // that match either, defeating the purpose of stacking constraints.
      const all = filters.dietaryFlags.every((f) => have.includes(f));
      if (!all) return false;
    }
    return true;
  });
}

function sortUserRecipes(
  rows: UserRecipe[],
  sortBy: string,
  sortDirection: 'asc' | 'desc'
): UserRecipe[] {
  const dir = sortDirection === 'asc' ? 1 : -1;
  const key = (r: UserRecipe): number => {
    switch (sortBy) {
      case 'last_cooked_date':
        return r.last_cooked_date ? new Date(r.last_cooked_date).getTime() : 0;
      case 'times_cooked':
        return r.times_cooked || 0;
      case 'personal_rating':
        return r.personal_rating || 0;
      case 'added_date':
      default:
        return r.added_date ? new Date(r.added_date).getTime() : 0;
    }
  };
  return [...rows].sort((a, b) => (key(a) - key(b)) * dir);
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

/**
 * Tags affichables sur la carte recette. Concatène personal_tags +
 * catalog tags + ingrédients-cuisine inférés depuis le titre. Dédupe
 * lowercase, garde l'ordre d'apparition (personal_tags d'abord car
 * c'est l'intention du user).
 */
export function getRecipeTags(recipe: UserRecipe): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (raw: string | null | undefined) => {
    if (!raw) return;
    const t = raw.trim();
    if (!t) return;
    const k = t.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(t);
  };
  for (const t of recipe.personal_tags ?? []) push(t);
  for (const t of recipe.catalog_recipe?.tags ?? []) push(t);
  return out;
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

// Maps a row from the legacy `recipes` table (user-owned, standalone)
// to the unified `UserRecipe` shape. Personal metadata (rating, tags,
// collections, cook history) doesn't exist on that table, so we leave
// it empty rather than fabricating a `personal_rating: 4` that would
// turn every legacy recipe into a fake favorite.
function mapRecipeToUserRecipe(recipe: any): UserRecipe {
  return {
    id: recipe.id,
    user_id: recipe.user_id,
    recipe_id: undefined,
    is_from_catalog: false,
    custom_title: recipe.name,
    custom_ingredients_json: recipe.ingredients || [],
    custom_instructions: recipe.instructions || '',
    custom_photo_url: recipe.image_url,
    custom_modifications: {},
    cuisine_category: recipe.cuisine_category ?? undefined,
    personal_notes: recipe.description,
    personal_rating: undefined,
    personal_tags: recipe.tags || [],
    collections: [],
    added_date: recipe.created_at,
    last_cooked_date: undefined,
    times_cooked: 0,
    is_shared: false,
    shared_with: [],
    created_at: recipe.created_at,
    updated_at: recipe.updated_at,
    recipe_facets: recipe.recipe_facets ?? undefined,
  };
}

// Maps a `user_recipes` row (with embedded `recipes_catalog` via the
// `catalog_recipe` alias) to the unified `UserRecipe` shape.
function mapUserRecipesRowToUserRecipe(row: any): UserRecipe {
  return {
    id: row.id,
    user_id: row.user_id,
    recipe_id: row.recipe_id ?? undefined,
    is_from_catalog: !!row.is_from_catalog,
    custom_title: row.custom_title ?? undefined,
    custom_ingredients_json: row.custom_ingredients_json ?? undefined,
    custom_instructions: row.custom_instructions ?? undefined,
    custom_photo_url: row.custom_photo_url ?? undefined,
    custom_modifications: row.custom_modifications || {},
    personal_notes: row.personal_notes ?? undefined,
    personal_rating: row.personal_rating ?? undefined,
    personal_tags: row.personal_tags || [],
    collections: row.collections || [],
    added_date: row.added_date || row.created_at,
    last_cooked_date: row.last_cooked_date ?? undefined,
    times_cooked: row.times_cooked || 0,
    is_shared: !!row.is_shared,
    shared_with: row.shared_with || [],
    created_at: row.created_at,
    updated_at: row.updated_at,
    catalog_recipe: row.catalog_recipe ?? undefined,
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