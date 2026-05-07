/**
 * Adapter for the AddRecipeDialog manual entry shape (snake_case fields,
 * structured ingredient list, single instructions string) into the
 * canonical ImportedRecipeDraft (PRP-220.07).
 */
import {
  parseImportedRecipeDraft,
  type ImportedRecipeDraft,
  type ImportedIngredient,
  type ImportedInstruction,
} from '@smart/shared';

import { parseDurationToMinutes } from '../helpers/parseDuration.js';

export interface ManualRecipeInput {
  name: string;
  description?: string;
  prep_time?: number | string;
  cook_time?: number | string;
  rest_time?: number | string;
  servings?: number;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  cuisine_category?: string;
  meal_type?: string;
  image_url?: string;
  ingredients: Array<{
    name: string;
    amount?: string | number;
    unit?: string;
    notes?: string;
    is_essential?: boolean;
  }>;
  /** Newline- or numbered-list separated instructions. */
  instructions: string;
  tags?: string[];
}

export function manualToDraft(input: ManualRecipeInput): ImportedRecipeDraft {
  const ingredients: ImportedIngredient[] = (input.ingredients ?? [])
    .map((i): ImportedIngredient | null => {
      const name = (i.name ?? '').trim();
      if (!name) return null;
      const out: ImportedIngredient = { name: name.slice(0, 200) };
      const quantity = parseAmount(i.amount);
      if (quantity !== undefined) out.quantity = quantity;
      const unit = i.unit?.trim();
      if (unit) out.unit = unit;
      const notes = i.notes?.trim();
      if (notes) out.notes = notes;
      if (i.is_essential !== undefined) out.isEssential = i.is_essential;
      return out;
    })
    .filter((x): x is ImportedIngredient => x !== null);

  const instructions: ImportedInstruction[] = splitInstructions(input.instructions ?? '').map(
    (description, idx) => ({
      step: idx + 1,
      description: description.slice(0, 2000),
    })
  );

  return parseImportedRecipeDraft({
    title: input.name.trim().slice(0, 300),
    description: input.description?.slice(0, 3000),
    ingredients,
    instructions,
    prepTimeMinutes: parseDurationToMinutes(input.prep_time),
    cookTimeMinutes: parseDurationToMinutes(input.cook_time),
    restTimeMinutes: parseDurationToMinutes(input.rest_time),
    servings: input.servings,
    difficulty: input.difficulty,
    cuisineCategory: input.cuisine_category,
    mealType: input.meal_type,
    imageUrl: input.image_url,
    tags: input.tags ?? [],
    confidence: 1,
    extractionWarnings: [],
    source: {
      platform: 'manual',
      importedAt: new Date().toISOString(),
      extractionMethod: 'manual_text',
    },
  });
}

function parseAmount(amount: string | number | undefined): number | undefined {
  if (amount === undefined || amount === null) return undefined;
  if (typeof amount === 'number') return Number.isFinite(amount) ? amount : undefined;
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

/**
 * Split a free-form instructions blob into individual steps. Handles
 * numbered prefixes ("1.", "1)", "Étape 1:") and blank-line separation.
 */
function splitInstructions(blob: string): string[] {
  const cleaned = blob.replace(/\r/g, '').trim();
  if (!cleaned) return [];

  const stripLeadingNumber = (s: string): string =>
    s.replace(/^\s*(?:\d+[.)]|étape\s*\d+\s*:)\s*/i, '').trim();

  // If the user used numbered prefixes, split on them (keep order).
  const numbered = cleaned.split(/\n\s*(?:\d+[.)]|étape\s*\d+\s*:)\s*/i);
  if (numbered.length > 1) {
    return numbered.map(stripLeadingNumber).filter(Boolean);
  }

  // Otherwise split on blank lines, then on single newlines.
  const blocks = cleaned.split(/\n{2,}/);
  if (blocks.length > 1) return blocks.map(stripLeadingNumber).filter(Boolean);
  return cleaned.split(/\n/).map(stripLeadingNumber).filter(Boolean);
}
