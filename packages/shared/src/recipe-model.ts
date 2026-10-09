import type { StockIngredient } from './quantities.js';

export interface InlineRecipeIngredient extends StockIngredient { notes?: string; }
export interface RecipeCatalogRow {
  id: string; title: string; description?: string | null; photo_url?: string | null;
  prep_time?: number | null; cook_time?: number | null; rest_time?: number | null;
  servings?: number | null; difficulty?: number | null; instructions?: string | null; tags?: string[] | null;
  source?: string | null; source_url?: string | null; nutrition_json?: unknown;
  rating_avg?: number | null; rating_count?: number | null; created_at: string; updated_at: string;
}
export interface LibraryRecipeRow {
  id: string; user_id: string; recipe_id?: string | null; is_from_catalog: boolean;
  catalog_recipe?: (RecipeCatalogRow & { ingredients_json?: unknown }) | null;
  custom_title?: string | null; custom_ingredients_json?: unknown; custom_instructions?: string | null;
  custom_photo_url?: string | null; personal_notes?: string | null; personal_tags?: string[] | null;
  personal_rating?: number | null; created_at: string; updated_at: string;
  custom_modifications?: { title?: string; ingredients_override?: unknown; instructions_append?: string; servings_multiplier?: number } | null;
}

export function normalizeRecipeIngredients(value: unknown, multiplier = 1): InlineRecipeIngredient[] {
  if (!Array.isArray(value)) return [];
  return value.map(raw => {
    const item = raw && typeof raw === 'object' ? raw as Record<string, unknown> : { name: typeof raw === 'string' ? raw : '' };
    const amount = item.quantity ?? item.amount;
    const parsed = typeof amount === 'number' ? amount : typeof amount === 'string' && /^\d+([.,]\d+)?$/.test(amount) ? Number(amount.replace(',','.')) : NaN;
    return {
      ingredient_name: String(item.ingredient_name ?? item.name ?? ''),
      quantity: Number.isFinite(parsed) && parsed > 0 ? parsed * multiplier : undefined,
      unit: typeof item.unit === 'string' ? item.unit : undefined,
      inventory_product_id: typeof item.inventory_product_id === 'string' ? item.inventory_product_id : typeof item.product_id === 'string' ? item.product_id : undefined,
      is_essential: item.is_essential !== false,
      notes: typeof item.notes === 'string' ? item.notes : undefined,
    };
  });
}

/** Keep the library identity and apply customizations before any stock calculation. */
export function mapLibraryRecipe(row: LibraryRecipeRow) {
  const catalog = row.is_from_catalog ? row.catalog_recipe : null;
  const edits = row.custom_modifications ?? {};
  const multiplier = edits.servings_multiplier ?? 1;
  if (!Number.isFinite(multiplier) || multiplier <= 0) throw new Error('Nombre de portions personnalisé invalide.');
  const original = catalog?.instructions ?? row.custom_instructions ?? '';
  return {
    id: row.id, source: 'user_recipes' as const, canonicalId: catalog?.id ?? row.id, user_id: row.user_id,
    name: edits.title ?? row.custom_title ?? catalog?.title ?? 'Recette sans titre',
    description: catalog?.description ?? row.personal_notes ?? null,
    image_url: row.custom_photo_url ?? catalog?.photo_url ?? null,
    cuisine_category: null, meal_type: null,
    prep_time: catalog?.prep_time ?? 0, cook_time: catalog?.cook_time ?? 0, rest_time: catalog?.rest_time ?? 0,
    servings: (catalog?.servings ?? 4) * multiplier, difficulty: catalog?.difficulty ?? 3,
    instructions: edits.instructions_append ? `${original}\n${edits.instructions_append}` : original,
    tags: [...new Set([...(catalog?.tags ?? []),...(row.personal_tags ?? [])])],
    source_type: catalog?.source ?? null, source_url: catalog?.source_url ?? null,
    nutrition_info: catalog?.nutrition_json ?? null, is_public: false,
    rating: row.personal_rating ?? catalog?.rating_avg ?? null, rating_count: catalog?.rating_count ?? null,
    created_at: row.created_at, updated_at: row.updated_at,
    inlineIngredients: normalizeRecipeIngredients(edits.ingredients_override ?? catalog?.ingredients_json ?? row.custom_ingredients_json,multiplier),
  };
}
