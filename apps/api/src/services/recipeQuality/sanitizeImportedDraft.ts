/**
 * PRP-239 PR1b — Adapter: `ImportedRecipeDraft` → policy-sanitized draft.
 *
 * Bridges the importer surface (`@smart/shared#ImportedRecipeDraft`) and
 * the `RecipePolicySanitizer` contract from PR1a. Pure, deterministic,
 * no I/O — drop-in inside `SocialImportService.save()` so every saved
 * draft is policy-clean.
 *
 * Field mapping :
 *   draft.title              → input.name
 *   draft.description        → input.description
 *   draft.instructions[].description ↦ input.instructions[i]
 *   draft.ingredients[i]     → input.ingredients[i]  (name/quantity/unit/notes/isEssential)
 *
 * The sanitizer only rewrites ingredient name + notes (see
 * RecipePolicySanitizer scope). Description and instructions are
 * detected-only and surface in `violationsRemaining` so the caller can
 * log a metric / open a backlog ticket; we never silently rewrite
 * culinary prose from V1.
 */
import type { ImportedRecipeDraft } from '@smart/shared';

import { RecipePolicySanitizer, recipePolicySanitizer } from './RecipePolicySanitizer.js';
import type {
  PolicyChange,
  PolicyQualityFlag,
  PolicyViolation,
  RecipePolicyInput,
} from './policyTypes.js';

export interface SanitizedImportedDraft {
  /** The same draft shape, with ingredient name/notes substitutions applied. */
  sanitized: ImportedRecipeDraft;
  /** `true` iff at least one ingredient field was rewritten. */
  hasChanges: boolean;
  /** Deduplicated quality flags from this run (e.g. `porc_substituted`). */
  qualityFlags: PolicyQualityFlag[];
  /** Detailed changes the sanitizer applied (one per substituted field). */
  changes: PolicyChange[];
  /** Detected-but-not-fixed violations in description/instructions. */
  violationsRemaining: PolicyViolation[];
}

export function sanitizeImportedDraft(
  draft: ImportedRecipeDraft,
  sanitizer: RecipePolicySanitizer = recipePolicySanitizer,
): SanitizedImportedDraft {
  const input: RecipePolicyInput = {
    sourceUrl: draft.source.sourceUrl,
    name: draft.title,
    description: draft.description ?? null,
    instructions: draft.instructions.map((i) => i.description),
    ingredients: draft.ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity ?? null,
      unit: i.unit ?? null,
      notes: i.notes ?? null,
      isEssential: i.isEssential,
    })),
  };

  const result = sanitizer.run(input);

  if (result.changes.length === 0) {
    return {
      sanitized: draft,
      hasChanges: false,
      qualityFlags: [],
      changes: [],
      violationsRemaining: result.violationsRemaining,
    };
  }

  // Splice sanitized values back onto the draft. We keep every other
  // field byte-identical so we don't accidentally drop `rawText`,
  // `isEssential`, or downstream draft metadata.
  const sanitizedIngredients = draft.ingredients.map((ing, i) => {
    const next = result.sanitized.ingredients[i];
    if (!next) return ing;
    const out = { ...ing };
    if (next.name !== ing.name) out.name = next.name;
    const newNotes = next.notes ?? undefined;
    if (newNotes !== ing.notes) out.notes = newNotes;
    return out;
  });

  return {
    sanitized: {
      ...draft,
      ingredients: sanitizedIngredients,
    },
    hasChanges: true,
    qualityFlags: result.qualityFlags,
    changes: result.changes,
    violationsRemaining: result.violationsRemaining,
  };
}
