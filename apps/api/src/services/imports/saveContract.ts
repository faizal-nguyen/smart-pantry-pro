/**
 * Contract for the "persist a validated draft as a real recipe" step
 * the save endpoint orchestrates (PRP-220.11). The actual
 * implementation lands in PRP-220.16.
 *
 * The contract intentionally covers only what the orchestrator needs
 * to know: turn a draft + import id + optional UX fields into a
 * recipe id (UUID). The implementation owns idempotence (re-running
 * with the same import id should return the same recipe id, see
 * PRP-220.16 unique index on `recipes.import_id`).
 */
import type { ImportedRecipeDraft } from '@smart/shared';

import type { SupabaseClient } from '@supabase/supabase-js';

export interface SaveDraftAsRecipeOptions {
  importId: string;
  collections?: string[];
  personalNotes?: string;
}

export type SaveImportedDraftAsRecipe = (
  /** User-scoped Supabase client (already RLS-bound). */
  client: SupabaseClient<any, any, any>,
  userId: string,
  draft: ImportedRecipeDraft,
  options: SaveDraftAsRecipeOptions
) => Promise<string>;

/**
 * Default placeholder used when no real save service has been wired.
 * Throws a domain error so the route maps it to 422 SAVE_FAILED.
 */
export const notImplementedSaveImportedDraftAsRecipe: SaveImportedDraftAsRecipe = async () => {
  throw new Error(
    '[PRP-220.16] saveImportedDraftAsRecipe is not wired yet. ' +
      'Provide an implementation when constructing SocialImportService.'
  );
};
