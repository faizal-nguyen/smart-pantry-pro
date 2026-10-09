import { mapLibraryRecipe, normalizeRecipeIngredients, type LibraryRecipeRow, type RecipeCatalogRow, type RecipeReference } from '@smart/shared';
import { supabase } from '@/integrations/supabase/client';
import type { Recipe } from '@/hooks/useRecipes';

export type RecipeSource = Exclude<RecipeReference['source'], 'auto'>;
export interface UnifiedRecipeIngredient {
  ingredient_name: string; quantity?: number; unit?: string; is_essential: boolean;
  notes?: string; inventory_product_id?: string;
}
export interface UnifiedRecipe extends Omit<Recipe, 'user_id'> {
  source: RecipeSource; canonicalId: string; user_id: string | null;
  inlineIngredients?: UnifiedRecipeIngredient[];
}
const cache = new Map<string, { value: UnifiedRecipe; at: number } | { inflight: Promise<UnifiedRecipe | null> }>();
let generation = 0;
export function invalidateUnifiedRecipeCache(id?: string): void {
  generation++;
  if (!id) cache.clear();
  else for (const key of cache.keys()) if (key.endsWith(`:${id}`)) cache.delete(key);
}

/** Cache and ownership use the same account; an old response cannot repopulate a new session. */
export async function fetchUnifiedRecipe(id: string): Promise<UnifiedRecipe | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const owner = session?.user.id ?? null;
  const key = `${owner ?? 'public'}:${id}`;
  const saved = cache.get(key);
  if (saved && 'inflight' in saved) return saved.inflight;
  if (saved && 'value' in saved && Date.now() - saved.at < 30_000) return saved.value;
  const started = generation;
  const inflight = resolveRecipe(id,owner);
  cache.set(key,{ inflight });
  try {
    const value = await inflight;
    const current = await supabase.auth.getSession();
    if ((current.data.session?.user.id ?? null) !== owner) throw new Error('Le compte a changé. Rouvrez cette recette.');
    if (generation === started && value) cache.set(key,{ value, at: Date.now() });
    else if (generation === started) cache.delete(key);
    return value;
  } catch (error) {
    if (generation === started) cache.delete(key);
    throw error;
  }
}

async function resolveRecipe(id: string, owner: string | null): Promise<UnifiedRecipe | null> {
  const legacy = await supabase.from('recipes').select('*').eq('id',id)
    .or(owner ? `user_id.eq.${owner},is_public.eq.true` : 'is_public.eq.true').maybeSingle();
  if (legacy.error) throw legacy.error;
  if (legacy.data) return { ...legacy.data, source: 'recipes', canonicalId: id } as UnifiedRecipe;
  if (owner) {
    const library = await supabase.from('user_recipes').select('*, catalog_recipe:recipes_catalog(*)')
      .eq('id',id).eq('user_id',owner).maybeSingle();
    if (library.error) throw library.error;
    if (library.data) return mapLibraryRecipe(library.data as LibraryRecipeRow) as UnifiedRecipe;
  }
  const catalog = await supabase.from('recipes_catalog').select('*').eq('id',id).maybeSingle();
  if (catalog.error) throw catalog.error;
  if (!catalog.data) return null;
  const row = catalog.data as RecipeCatalogRow & { ingredients_json?: unknown };
  const mapped = mapLibraryRecipe({ id, user_id: '', is_from_catalog: true, catalog_recipe: row, created_at: row.created_at, updated_at: row.updated_at });
  return { ...mapped, source: 'recipes_catalog', user_id: null, is_public: true,
    inlineIngredients: normalizeRecipeIngredients(row.ingredients_json) } as UnifiedRecipe;
}
