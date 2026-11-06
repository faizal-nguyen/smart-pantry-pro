import type { ImportedRecipeDraft, ImportedRecipeQuality } from '@smart/shared';
import type { SaveDraftAsRecipeOptions } from './saveContract.js';
import { sanitizeImportedDraft } from '../recipeQuality/sanitizeImportedDraft.js';

export interface ImportAdaptation { path: string; from: string; to: string }
export function importAdaptations(draft: ImportedRecipeDraft, stored?: ImportedRecipeDraft): ImportAdaptation[] {
  const policy = sanitizeImportedDraft(draft);
  const result = new Map<string, ImportAdaptation>();
  const add = (index: number, field: 'name' | 'notes', from: string | undefined, to: string | undefined) => {
    if (from === to) return;
    const path = `ingredients.${index}.${field}`;
    result.set(path, { path, from: from ?? '', to: to ?? '' });
  };
  for (const change of policy.changes) {
    const field = change.field === 'ingredient_name' ? 'name' : 'notes';
    add(change.ingredientIndex, field, draft.ingredients[change.ingredientIndex]?.[field],
      policy.sanitized.ingredients[change.ingredientIndex]?.[field]);
  }
  // A manually edited substitution still needs the same visible confirmation
  // as an automatic one. The immutable draft is the provenance of the change.
  if (stored) for (const change of sanitizeImportedDraft(stored).changes) {
    const field = change.field === 'ingredient_name' ? 'name' : 'notes';
    add(change.ingredientIndex, field, stored.ingredients[change.ingredientIndex]?.[field],
      policy.sanitized.ingredients[change.ingredientIndex]?.[field]);
  }
  return [...result.values()];
}

export class ImportReviewError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: 409 | 422 = 422) {
    super(message);
    this.name = 'ImportReviewError';
  }
}

export interface ReviewedSaveOptions extends SaveDraftAsRecipeOptions {
  expectedRevision?: number;
  draftEdited?: boolean;
  quality?: ImportedRecipeQuality;
  acknowledgeUnknowns?: boolean;
  sourceReviewed?: boolean;
  acknowledgeAdaptations?: boolean;
  adaptations?: ImportAdaptation[];
  editProvenance?: {
    base_revision: number;
    edited_fields: string[];
    reviewed_at: string;
    source_reviewed: boolean;
  };
}

/** A form may edit culinary fields, but it cannot replace a source receipt. */
export function preserveImportProvenance(edited: ImportedRecipeDraft, stored: ImportedRecipeDraft): ImportedRecipeDraft {
  return {
    ...edited,
    source: structuredClone(stored.source),
    imageUrl: stored.imageUrl,
    confidence: stored.confidence,
    extractionWarnings: [...new Set([...(stored.extractionWarnings ?? []), ...(edited.extractionWarnings ?? [])])],
  };
}

export function editedRecipeFields(stored: ImportedRecipeDraft, edited: ImportedRecipeDraft): string[] {
  return Object.keys(edited).filter((key) =>
    !['source', 'confidence', 'extractionWarnings', 'imageUrl'].includes(key) &&
    JSON.stringify(stored[key as keyof ImportedRecipeDraft]) !== JSON.stringify(edited[key as keyof ImportedRecipeDraft]),
  );
}
