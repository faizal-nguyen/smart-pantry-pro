/**
 * Bridge between the canonical `ImportedRecipeDraft` (PRP-220.06) and
 * the legacy `ExtractedRecipe` shape consumed by the existing
 * `ExtractedRecipeModal` (`src/components/recipes/ExtractedRecipeModal.tsx`).
 *
 * Until that component is fully rewritten (likely as part of PRP-220.12
 * Inbox UI), the modal keeps its own props shape. This bridge lets new
 * code (the inbox flow, the AddRecipeDialog initialDraft path) produce
 * `ImportedRecipeDraft` values and still feed the existing modal.
 *
 * Both directions are intentionally lossy at the edges (the modal
 * carries `metadata.thumbnail` as a richer object, while the draft
 * stores it as a flat URL); the bridge keeps the lossless subset.
 */
import type { ImportedRecipeDraft } from '@smart/shared';
import { parseImportedRecipeDraft } from '@smart/shared';

import { computeConfidence } from '../helpers/confidence.js';

export interface ExtractedRecipeIngredient {
  name: string;
  amount: string;
  unit: string;
}

export interface ExtractedRecipeInstruction {
  step: number;
  description: string;
}

export interface ExtractedRecipeMetadata {
  duration?: string;
  servings?: number;
  confidence: number;
  processingTime?: number;
  platform: string;
  extractionMethod: string;
  thumbnail?: string;
}

export interface ExtractedRecipe {
  title: string;
  description: string;
  ingredients: ExtractedRecipeIngredient[];
  instructions: ExtractedRecipeInstruction[];
  metadata: ExtractedRecipeMetadata;
}

/**
 * Convert an `ImportedRecipeDraft` into the shape the existing modal
 * expects. Numeric quantities are stringified (the modal carries them
 * as strings to keep its native input bindings simple).
 */
export function draftToExtractedRecipe(draft: ImportedRecipeDraft): ExtractedRecipe {
  return {
    title: draft.title,
    description: draft.description ?? '',
    ingredients: draft.ingredients.map((ing) => ({
      name: ing.name,
      amount: ing.quantity !== undefined ? String(ing.quantity) : '',
      unit: ing.unit ?? '',
    })),
    instructions: draft.instructions.map((inst) => ({
      step: inst.step,
      description: inst.description,
    })),
    metadata: {
      duration: durationLabel(draft.prepTimeMinutes, draft.cookTimeMinutes),
      servings: draft.servings,
      confidence: draft.confidence,
      platform: draft.source.platform,
      extractionMethod: draft.source.extractionMethod,
      thumbnail: draft.source.thumbnailUrl ?? draft.imageUrl,
    },
  };
}

/**
 * Convert the user-edited modal output back into a canonical draft.
 * Used when the modal `onConfirm` fires and the caller wants to
 * persist via the new pipeline (PRP-220.16 saveImportedDraftAsRecipe).
 *
 * The original draft is required so we can preserve provenance fields
 * that the modal does not surface (canonicalUrl, importedAt, raw
 * source data, etc.). Confidence is recomputed because the user may
 * have added/removed ingredients during editing.
 */
export function extractedRecipeToDraft(
  edited: ExtractedRecipe,
  base: ImportedRecipeDraft
): ImportedRecipeDraft {
  const ingredients = edited.ingredients
    .map((ing) => ({
      name: ing.name?.trim(),
      quantity: parseAmount(ing.amount),
      unit: ing.unit?.trim() || undefined,
    }))
    .filter((i): i is { name: string; quantity?: number; unit?: string } => Boolean(i.name));

  const instructions = edited.instructions
    .map((inst, idx) => ({
      step: idx + 1,
      description: inst.description?.trim() ?? '',
    }))
    .filter((i) => i.description.length > 0);

  const ingredientWithQuantityCount = ingredients.filter((i) => i.quantity !== undefined).length;
  const hasOversizedIngredient = ingredients.some((i) => i.name.length > 150);
  const { confidence, warnings } = computeConfidence({
    hasTitle: Boolean(edited.title?.trim()),
    ingredientCount: ingredients.length,
    ingredientWithQuantityCount,
    instructionCount: instructions.length,
    hasImage: Boolean(edited.metadata.thumbnail || base.imageUrl),
    hasTimes: base.prepTimeMinutes !== undefined || base.cookTimeMinutes !== undefined,
    hasServings: edited.metadata.servings !== undefined,
    hasOversizedIngredient,
    extractionMethod: base.source.extractionMethod,
  });

  return parseImportedRecipeDraft({
    ...base,
    title: edited.title.trim().slice(0, 300),
    description: edited.description?.slice(0, 3000) || base.description,
    ingredients,
    instructions,
    servings: edited.metadata.servings ?? base.servings,
    confidence,
    extractionWarnings: warnings,
    source: {
      ...base.source,
      thumbnailUrl: edited.metadata.thumbnail ?? base.source.thumbnailUrl,
    },
    // tags + image + times are preserved from base
  });
}

function parseAmount(amount: string | undefined): number | undefined {
  if (!amount) return undefined;
  const trimmed = amount.trim();
  if (!trimmed) return undefined;
  if (trimmed.includes('/')) {
    const [num, den] = trimmed.split('/').map(Number);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return undefined;
    return num / den;
  }
  const n = Number(trimmed.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

function durationLabel(prep?: number, cook?: number): string | undefined {
  const parts: string[] = [];
  if (prep) parts.push(`Préparation: ${prep} min`);
  if (cook) parts.push(`Cuisson: ${cook} min`);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}
