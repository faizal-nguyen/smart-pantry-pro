/**
 * Adapter draft canonique → payload legacy ExtractedRecipeModal.
 *
 * PRP-232 PR2 — extrait de `src/pages/Recipes.tsx` lors du split. C'est un
 * pont PRP-220.08 entre la nouvelle inbox (`CurrentDraftResponse`) et la
 * modale historique. À supprimer quand PRP-220.16/17 réécrira la modale.
 */
import type { ImportedRecipeDraftRow, SocialImport } from './types';

export interface LegacyExtractedRecipePayload {
  title: string;
  description: string;
  ingredients: { name: string; amount: string; unit: string }[];
  instructions: { step: number; description: string }[];
  metadata: {
    confidence: number;
    platform: string;
    extractionMethod: string;
    thumbnail: string | null | undefined;
    servings: number | null | undefined;
  };
  sourceUrl: string;
  importId: string;
}

export function draftToLegacyPayload(
  socialImport: Pick<SocialImport, 'id' | 'source_url'>,
  draft: ImportedRecipeDraftRow
): LegacyExtractedRecipePayload {
  const d = draft.draft_json;
  return {
    title: d.title,
    description: d.description ?? '',
    ingredients: d.ingredients.map(i => ({
      name: i.name,
      amount: i.quantity != null ? String(i.quantity) : '',
      unit: i.unit ?? '',
    })),
    instructions: d.instructions.map(s => ({
      step: s.step,
      description: s.description,
    })),
    metadata: {
      confidence: d.confidence,
      platform: d.source.platform,
      extractionMethod: d.source.extractionMethod,
      thumbnail: d.imageUrl ?? d.source.thumbnailUrl,
      servings: d.servings,
    },
    sourceUrl: socialImport.source_url,
    importId: socialImport.id,
  };
}
