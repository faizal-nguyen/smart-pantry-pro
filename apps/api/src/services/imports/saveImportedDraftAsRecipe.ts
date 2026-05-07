/**
 * Persist a validated `ImportedRecipeDraft` as a row in `recipes` plus
 * its rows in `recipe_ingredients` (PRP-220.16).
 *
 * Wraps the Postgres RPC `public.save_imported_recipe` (defined in
 * supabase/migrations/20260507120001_rpc_save_imported_recipe.sql).
 * The RPC owns:
 *   - atomicity (single PL/pgSQL block, no orphan recipes if the
 *     ingredient insert fails);
 *   - idempotence (partial unique index on `recipes.import_id` + a
 *     same-user pre-check inside the function);
 *   - RLS enforcement (SECURITY INVOKER + auth.uid()).
 *
 * The TS layer is therefore mostly a typed shim: it shapes the draft
 * into the JSON the RPC expects and surfaces the recipe id.
 *
 * The caller is expected to pass a *user-scoped* Supabase client —
 * the one minted by `createUserSupabaseClient(token)` in the auth
 * middleware. A service-role client would defeat the SECURITY INVOKER
 * guarantee.
 */
import type { ImportedRecipeDraft } from '@smart/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  SaveDraftAsRecipeOptions,
  SaveImportedDraftAsRecipe,
} from './saveContract.js';

interface RpcRecipeShape {
  name: string;
  instructions_text: string;
  description?: string;
  prep_time?: number;
  cook_time?: number;
  rest_time?: number;
  servings?: number;
  difficulty?: number;
  cuisine_category?: string;
  meal_type?: string;
  tags: string[];
  image_url?: string;
  source_platform: string;
  source_url?: string;
  source_metadata: Record<string, unknown>;
}

interface RpcIngredientShape {
  name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  is_essential: boolean;
}

export const saveImportedDraftAsRecipe: SaveImportedDraftAsRecipe = async (
  client: SupabaseClient<any, any, any>,
  _userId: string,
  draft: ImportedRecipeDraft,
  options: SaveDraftAsRecipeOptions
): Promise<string> => {
  const recipePayload = buildRecipePayload(draft, options);
  const ingredientsPayload = buildIngredientsPayload(draft);

  const { data, error } = await client.rpc('save_imported_recipe', {
    p_import_id: options.importId,
    p_recipe: recipePayload,
    p_ingredients: ingredientsPayload,
  });

  if (error) {
    throw new Error(
      `save_imported_recipe RPC failed (${error.code ?? 'unknown'}): ${error.message}`
    );
  }
  if (typeof data !== 'string' || data.length === 0) {
    throw new Error('save_imported_recipe returned no recipe id');
  }
  return data;
};

function buildRecipePayload(
  draft: ImportedRecipeDraft,
  options: SaveDraftAsRecipeOptions
): RpcRecipeShape {
  const tags = mergeTags(draft.tags ?? [], options.collections ?? []);

  // The legacy `recipes.instructions` column is NOT NULL TEXT. We
  // serialize the structured `instructions[]` from the draft as a
  // human-readable numbered list so existing read paths (Mes Recettes
  // detail) keep working without migration. The structured array is
  // also preserved inside `source_metadata.instructions` for any
  // future reader that wants it.
  const instructionsText = draft.instructions
    .map((i) => `${i.step}. ${i.description}`)
    .join('\n');

  const sourceMetadata: Record<string, unknown> = {
    canonicalUrl: draft.source.canonicalUrl,
    authorName: draft.source.authorName,
    authorHandle: draft.source.authorHandle,
    authorUrl: draft.source.authorUrl,
    thumbnailUrl: draft.source.thumbnailUrl,
    originalTitle: draft.source.originalTitle,
    originalDescription: draft.source.originalDescription,
    importedAt: draft.source.importedAt,
    extractionMethod: draft.source.extractionMethod,
    confidence: draft.confidence,
    extractionWarnings: draft.extractionWarnings ?? [],
    instructions: draft.instructions,
    personalNotes: options.personalNotes,
  };

  return {
    name: draft.title,
    instructions_text: instructionsText,
    description: draft.description,
    prep_time: draft.prepTimeMinutes,
    cook_time: draft.cookTimeMinutes,
    rest_time: draft.restTimeMinutes,
    servings: draft.servings,
    difficulty: undefined,
    cuisine_category: draft.cuisineCategory,
    meal_type: draft.mealType,
    tags,
    image_url: draft.imageUrl ?? draft.source.thumbnailUrl,
    source_platform: draft.source.platform,
    source_url: draft.source.sourceUrl,
    source_metadata: sourceMetadata,
  };
}

function buildIngredientsPayload(draft: ImportedRecipeDraft): RpcIngredientShape[] {
  return draft.ingredients.map((ing) => ({
    name: ing.name,
    quantity: ing.quantity,
    unit: ing.unit,
    notes: ing.notes,
    is_essential: ing.isEssential ?? true,
  }));
}

function mergeTags(draftTags: readonly string[], collections: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [...draftTags, ...collections]) {
    const trimmed = t.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}
