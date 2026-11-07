import { z } from 'zod';
import type { ImportedRecipeDraft } from './recipe-import.js';

export const ImportedRecipeQualitySchema = z.object({
  state: z.enum(['inspiration', 'needs_completion', 'reviewable']),
  unknowns: z.array(z.object({ path: z.string(), label: z.string() })),
  metadata_only: z.boolean(),
  can_save: z.boolean(),
  requires_acknowledgement: z.boolean(),
});
export type ImportedRecipeQuality = z.infer<typeof ImportedRecipeQualitySchema>;

/** Completeness is independent of a model's confidence. Unknowns never become defaults. */
export function assessImportedRecipeQuality(
  draft: ImportedRecipeDraft,
  options: { sourceReviewed?: boolean } = {},
): ImportedRecipeQuality {
  const unknowns: ImportedRecipeQuality['unknowns'] = [];
  const add = (path: string, label: string) => unknowns.push({ path, label });
  const hasIngredients = draft.ingredients.length > 0 && draft.ingredients.every(i => i.name.trim());
  const hasSteps = draft.instructions.length > 0 && draft.instructions.every(i => i.description.trim());
  const metadataOnly = ['metadata', 'oembed', 'ai_inference'].includes(draft.source.extractionMethod);
  if (!draft.title.trim()) add('title', 'Nom du plat à compléter');
  if (!hasIngredients) add('ingredients', 'Ingrédients à compléter depuis la source');
  if (!hasSteps) add('instructions', 'Étapes à compléter depuis la source');
  if (metadataOnly && !options.sourceReviewed) add('source', 'Vérifier les ingrédients et les étapes dans la source');
  draft.ingredients.forEach((ingredient, index) => {
    if (ingredient.quantity == null || !Number.isFinite(ingredient.quantity) || ingredient.quantity <= 0)
      add(`ingredients.${index}.quantity`, `Quantité de ${ingredient.name} à vérifier`);
    if (!ingredient.unit?.trim()) add(`ingredients.${index}.unit`, `Unité de ${ingredient.name} à vérifier`);
  });
  if (draft.servings == null) add('servings', 'Nombre de portions à vérifier');
  if (draft.prepTimeMinutes == null && draft.cookTimeMinutes == null)
    add('duration', 'Durée de préparation et de cuisson à vérifier');
  const canSave = !!draft.title.trim() && hasIngredients && hasSteps && (!metadataOnly || !!options.sourceReviewed);
  return {
    state: !hasIngredients || !hasSteps ? 'inspiration' : unknowns.length ? 'needs_completion' : 'reviewable',
    unknowns, metadata_only: metadataOnly, can_save: canSave,
    requires_acknowledgement: canSave && unknowns.length > 0,
  };
}
