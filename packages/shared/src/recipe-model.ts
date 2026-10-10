import type { StockIngredient } from './quantities.js';

export interface InlineRecipeIngredient extends StockIngredient { notes?: string; }
export interface RecipeCatalogRow {
  id: string; title: string; description?: string | null; photo_url?: string | null;
  prep_time?: number | null; cook_time?: number | null; rest_time?: number | null;
  servings?: number | null; difficulty?: number | null; instructions?: string | null; tags?: string[] | null;
  source?: string | null; source_url?: string | null; nutrition_json?: unknown;
  rating_avg?: number | null; rating_count?: number | null; created_at: string; updated_at: string;
  cuisine_category?: string | null;meal_type?: string | null;required_equipment?:string[]|null;meal_style?:'warm'|'fresh'|'comfort'|null;
}
export interface LibraryRecipeRow {
  id: string; user_id: string; recipe_id?: string | null; is_from_catalog: boolean;
  catalog_recipe?: (RecipeCatalogRow & { ingredients_json?: unknown }) | null;
  custom_title?: string | null; custom_ingredients_json?: unknown; custom_instructions?: string | null;
  custom_photo_url?: string | null; personal_notes?: string | null; personal_tags?: string[] | null;
  personal_rating?: number | null; created_at: string; updated_at: string;
  custom_modifications?: { title?: string; ingredients_override?: unknown; instructions_append?: string; servings_multiplier?: number } | null;
}

/** The same media precedence is used by cards, the detail and the server. */
export function resolveRecipeImageUrl(...values: unknown[]): string | null {
  for (const value of values) if (typeof value === 'string' && value.trim()) return value.trim();
  return null;
}

/** Missing preparation/cooking times stay unknown; recorded zero is valid. */
export function recipeDurationMinutes(recipe: { prep_time?: number | null; cook_time?: number | null; rest_time?: number | null }): number | null {
  const { prep_time: prep, cook_time: cook, rest_time: rest } = recipe;
  if (typeof prep !== 'number' || typeof cook !== 'number' || !Number.isFinite(prep) || !Number.isFinite(cook) || prep < 0 || cook < 0) return null;
  if (rest != null && (!Number.isFinite(rest) || rest < 0)) return null;
  return prep + cook + (rest ?? 0);
}

export function normalizeRecipeInstructions(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((line): line is string => typeof line === 'string').map(line => line.trim()).filter(Boolean);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return normalizeRecipeInstructions(parsed);
  } catch { /* Plain text instructions are supported. */ }
  return value.split(/\n+/).map(line => line.trim().replace(/^\d+\.\s*/, '')).filter(Boolean);
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
    image_url: resolveRecipeImageUrl(row.custom_photo_url, catalog?.photo_url),
    image_origin: resolveRecipeImageUrl(row.custom_photo_url) ? 'personal' as const : resolveRecipeImageUrl(catalog?.photo_url) ? 'catalog' as const : null,
    cuisine_category: catalog?.cuisine_category ?? null, meal_type: catalog?.meal_type ?? null,
    prep_time: catalog?.prep_time ?? null, cook_time: catalog?.cook_time ?? null, rest_time: catalog?.rest_time ?? null,
    servings: catalog?.servings && Number.isFinite(catalog.servings * multiplier) && catalog.servings > 0 ? catalog.servings * multiplier : null, difficulty: catalog?.difficulty ?? null,
    instructions: edits.instructions_append ? [...normalizeRecipeInstructions(original),...normalizeRecipeInstructions(edits.instructions_append)].join('\n') : original,
    tags: [...new Set([...(catalog?.tags ?? []),...(row.personal_tags ?? [])])],
    source_type: catalog?.source ?? null, source_url: catalog?.source_url ?? null,
    nutrition_info: catalog?.nutrition_json ?? null, is_public: false,
    rating: row.personal_rating ?? catalog?.rating_avg ?? null, rating_count: catalog?.rating_count ?? null,
    created_at: row.created_at, updated_at: row.updated_at,
    inlineIngredients: normalizeRecipeIngredients(edits.ingredients_override ?? row.custom_ingredients_json ?? catalog?.ingredients_json,multiplier),
  };
}
