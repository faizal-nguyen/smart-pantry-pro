/**
 * Unified recipe lookup across the three historical storage layers:
 *
 *   1. `recipes`            — legacy user-owned recipes (Instagram imports,
 *                              SQL inserts, anything created before the
 *                              "Spotify" architecture).
 *   2. `user_recipes`       — pointer table (PRP-031) linking the user
 *                              to either a `recipes_catalog` entry or a
 *                              fully custom payload.
 *   3. `recipes_catalog`    — global recipe catalogue.
 *
 * Why this exists: clicking a "library" card may carry an id from any of
 * the three tables. Consumers (RecipeDetail, useRecipes, the inventory
 * analyser) used to assume `recipes` only, which produces PGRST116
 * (404-equivalent) for catalog-backed library entries and falsely flags
 * the recipe as "deleted".
 *
 * The helper returns a `UnifiedRecipe` shape that matches the existing
 * `Recipe` interface used across the codebase, plus a `source` tag so
 * consumers can branch when they really need to (e.g. ingredients live
 * in a JSONB column for catalog rows, in `recipe_ingredients` table for
 * legacy rows).
 */
import { supabase } from '@/integrations/supabase/client';

export type RecipeSource = 'recipes' | 'user_recipes_catalog' | 'recipes_catalog';

export interface UnifiedRecipeIngredient {
  ingredient_name: string;
  quantity?: number;
  unit?: string;
  is_essential: boolean;
  notes?: string;
}

export interface UnifiedRecipe {
  id: string;
  source: RecipeSource;
  // Identifier that points at the canonical row in its own table.
  // For `user_recipes_catalog`, this is the `recipes_catalog.id`, useful
  // when downstream services key off a "real" recipe id.
  canonicalId: string;
  user_id: string | null;
  name: string;
  description?: string | null;
  image_url?: string | null;
  cuisine_category?: string | null;
  meal_type?: string | null;
  prep_time: number;
  cook_time: number;
  rest_time?: number;
  servings: number;
  difficulty: number;
  instructions: string;
  tags: string[];
  source_type?: string | null;
  source_url?: string | null;
  nutrition_info?: unknown;
  is_public: boolean;
  rating?: number | null;
  rating_count?: number | null;
  created_at: string;
  updated_at: string;
  // Inline ingredients for catalog-backed rows (catalog stores them as
  // JSONB). Legacy `recipes` rows leave this undefined and consumers
  // should fetch from the `recipe_ingredients` table as before.
  inlineIngredients?: UnifiedRecipeIngredient[];
}

function mapRecipesRow(row: any): UnifiedRecipe {
  return {
    id: row.id,
    source: 'recipes',
    canonicalId: row.id,
    user_id: row.user_id ?? null,
    name: row.name,
    description: row.description ?? null,
    image_url: row.image_url ?? null,
    cuisine_category: row.cuisine_category ?? null,
    meal_type: row.meal_type ?? null,
    prep_time: row.prep_time ?? 0,
    cook_time: row.cook_time ?? 0,
    rest_time: row.rest_time ?? 0,
    servings: row.servings ?? 4,
    difficulty: row.difficulty ?? 3,
    instructions: row.instructions ?? '',
    tags: row.tags ?? [],
    source_type: row.source_type ?? null,
    source_url: row.source_url ?? null,
    nutrition_info: row.nutrition_info ?? null,
    is_public: !!row.is_public,
    rating: row.rating ?? null,
    rating_count: row.rating_count ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapCatalogRow(row: any, opts?: { wrapperId?: string; wrapperUserId?: string | null }): UnifiedRecipe {
  return {
    id: opts?.wrapperId ?? row.id,
    source: opts?.wrapperId ? 'user_recipes_catalog' : 'recipes_catalog',
    canonicalId: row.id,
    user_id: opts?.wrapperUserId ?? null,
    name: row.title,
    description: row.description ?? null,
    image_url: row.photo_url ?? null,
    cuisine_category: null,
    meal_type: null,
    prep_time: row.prep_time ?? 0,
    cook_time: row.cook_time ?? 0,
    rest_time: row.rest_time ?? 0,
    servings: row.servings ?? 4,
    difficulty: row.difficulty ?? 3,
    instructions: row.instructions ?? '',
    tags: row.tags ?? [],
    source_type: row.source ?? null,
    source_url: row.source_url ?? null,
    nutrition_info: row.nutrition_json ?? null,
    is_public: true,
    rating: row.rating_avg ?? null,
    rating_count: row.rating_count ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    inlineIngredients: normalizeInlineIngredients(row.ingredients_json),
  };
}

function normalizeInlineIngredients(json: unknown): UnifiedRecipeIngredient[] | undefined {
  if (!Array.isArray(json)) return undefined;
  return json.map((it: any) => ({
    ingredient_name: it.name ?? it.ingredient_name ?? '',
    quantity: typeof it.amount === 'number' ? it.amount : Number(it.amount) || undefined,
    unit: it.unit ?? undefined,
    is_essential: it.is_essential ?? true,
    notes: it.notes ?? undefined,
  }));
}

// Perf audit 2026-05-19 — RecipeDetail + useRecipeInventoryAnalysis + le
// tracker "viewed" appellent tous fetchUnifiedRecipe au mount. Sans cache,
// chaque ouverture déclenche 3 résolutions identiques (3-9 round-trips
// Supabase au lieu de 1-3). Cache module 30s in-flight + résolu : la
// première résolution est partagée par les autres callers tant qu'on est
// dans la même fenêtre de temps.
const UNIFIED_RECIPE_TTL_MS = 30_000;
const unifiedRecipeCache = new Map<
  string,
  { value: UnifiedRecipe | null; ts: number } | { inflight: Promise<UnifiedRecipe | null> }
>();

/** Invalide le cache module pour un id (à appeler après mutation). */
export function invalidateUnifiedRecipeCache(id?: string): void {
  if (id) {
    unifiedRecipeCache.delete(id);
    return;
  }
  unifiedRecipeCache.clear();
}

/**
 * Resolve a recipe id against `recipes`, then `user_recipes` (joining
 * the catalog), then `recipes_catalog`. Returns `null` if absent
 * everywhere — that is the *only* state that should be treated as
 * "recipe truly deleted" by downstream cleanup logic.
 *
 * Cache module 30s : les callers concurrents (RecipeDetail + analyse
 * inventaire + tracker "viewed") partagent la même résolution.
 */
export async function fetchUnifiedRecipe(id: string): Promise<UnifiedRecipe | null> {
  const cached = unifiedRecipeCache.get(id);
  if (cached) {
    if ('inflight' in cached) {
      return cached.inflight;
    }
    if (Date.now() - cached.ts < UNIFIED_RECIPE_TTL_MS) {
      return cached.value;
    }
  }

  const inflight = fetchUnifiedRecipeUncached(id);
  unifiedRecipeCache.set(id, { inflight });
  try {
    const value = await inflight;
    if (value !== null) {
      // Cache positif uniquement. Ne PAS stocker les null : ils peuvent
      // venir d'une race RLS / propagation Supabase / row pas encore visible.
      // Servir un null cached 30s ferait flasher "Recette non trouvée"
      // pour une recette qui existe désormais.
      unifiedRecipeCache.set(id, { value, ts: Date.now() });
    } else {
      unifiedRecipeCache.delete(id);
    }
    return value;
  } catch (error) {
    unifiedRecipeCache.delete(id);
    throw error;
  }
}

async function fetchUnifiedRecipeUncached(id: string): Promise<UnifiedRecipe | null> {
  // 1. Legacy `recipes` (covers all 19 existing Instagram imports for
  //    the audit user; this is the hot path).
  {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (!error && data) return mapRecipesRow(data);
  }

  // 2. `user_recipes` wrapper — id is the wrapper row, recipe data lives
  //    either inline (custom) or in the joined `recipes_catalog`.
  {
    const { data, error } = await supabase
      .from('user_recipes')
      .select('*, catalog_recipe:recipes_catalog(*)')
      .eq('id', id)
      .maybeSingle();
    if (!error && data) {
      if (data.is_from_catalog && data.catalog_recipe) {
        return mapCatalogRow(data.catalog_recipe, {
          wrapperId: data.id,
          wrapperUserId: data.user_id ?? null,
        });
      }
      // Fully custom user_recipes (no catalog backing) — synthesise from
      // the user_recipes columns themselves.
      return {
        id: data.id,
        source: 'user_recipes_catalog',
        canonicalId: data.id,
        user_id: data.user_id ?? null,
        name: data.custom_title ?? 'Recette sans titre',
        description: data.personal_notes ?? null,
        image_url: data.custom_photo_url ?? null,
        cuisine_category: null,
        meal_type: null,
        prep_time: 0,
        cook_time: 0,
        rest_time: 0,
        servings: 4,
        difficulty: 3,
        instructions: data.custom_instructions ?? '',
        tags: data.personal_tags ?? [],
        source_type: null,
        source_url: null,
        nutrition_info: null,
        is_public: false,
        rating: data.personal_rating ?? null,
        rating_count: null,
        created_at: data.created_at,
        updated_at: data.updated_at,
        inlineIngredients: normalizeInlineIngredients(data.custom_ingredients_json),
      };
    }
  }

  // 3. Direct catalog hit (rare from the library UI but happens if the
  //    nav ever exposes catalog ids directly).
  {
    const { data, error } = await supabase
      .from('recipes_catalog')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (!error && data) return mapCatalogRow(data);
  }

  return null;
}
