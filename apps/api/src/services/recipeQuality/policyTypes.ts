/**
 * PRP-239 PR1a — Recipe Policy types.
 *
 * Public contracts for `RecipePolicySanitizer` and `RecipeQualityScanner`.
 * Aligned with `ImportedRecipeDraft` (`packages/shared/src/recipe-import.ts`)
 * so PR1b can feed importer drafts straight in, with a thin adapter that
 * maps `title` → `name`.
 *
 * No I/O, no Supabase, no `process` access — keeps the unit tests trivial
 * (AC §6.8 last bullet).
 */

export type PolicyReason =
  | 'pork_substitution'
  | 'alcohol_removed'
  | 'alcohol_substitution';

export type PolicyQualityFlag = 'porc_substituted' | 'alcohol_removed';

export type PolicyField = 'ingredient_name' | 'ingredient_notes';

export type PolicyViolationField = 'description' | 'instructions';

/**
 * Input shape for the sanitizer. Matches the slice of
 * `ImportedRecipeDraft` we need: enough to spot violations, enough to
 * write back substitutions.
 */
export interface RecipePolicyInputIngredient {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
  isEssential?: boolean;
}

export interface RecipePolicyInput {
  recipeId?: string;
  sourceUrl?: string | null;
  name: string;
  description?: string | null;
  instructions: string[] | string;
  ingredients: RecipePolicyInputIngredient[];
}

/**
 * One auto-applied substitution. `ingredientIndex` lets PR1b
 * cross-reference back to the draft and PR1a tests assert order.
 */
export interface PolicyChange {
  ruleId: string;
  field: PolicyField;
  ingredientIndex: number;
  oldValue: string;
  newValue: string;
  reason: PolicyReason;
  qualityFlag: PolicyQualityFlag;
}

/**
 * One detected violation that the sanitizer chose NOT to auto-fix
 * (description / instructions). PR1b can promote these into manifest
 * entries case-by-case after human review.
 */
export interface PolicyViolation {
  ruleId: string;
  field: PolicyViolationField;
  location: string;
  value: string;
  reason: PolicyReason;
}

export interface RecipePolicyResult {
  sanitized: RecipePolicyInput;
  changes: PolicyChange[];
  qualityFlags: PolicyQualityFlag[];
  violationsRemaining: PolicyViolation[];
}

/**
 * Context passed to alcohol rule resolvers. We infer it from the
 * ingredient `notes` field when the seed/draft annotates it (e.g.
 * `'sauce'`, `'marinade'`, `'dessert'`, `'pate'`) and fall back to
 * `'cooking'` otherwise. This is intentionally small in V1 — PR1b can
 * widen it via the manifest if needed.
 */
export type AlcoholContext =
  | 'cooking'
  | 'sauce'
  | 'marinade'
  | 'dessert'
  | 'pate'
  | 'stir_fry'
  | 'deglaze'
  | 'braise';

/**
 * A pork rule rewrites a normalized token into a non-pork substitute.
 * Matching happens against the normalized form of the ingredient
 * (`normalizePolicyText`). The output text is human-friendly French.
 */
export interface PorkRule {
  ruleId: string;
  /** Regex applied to normalized text. Capture-free, anchored locally. */
  match: RegExp;
  /** Substitute text written back into the field, raw (un-normalized). */
  replacement: string;
  reason: 'pork_substitution';
}

/**
 * Alcohol rules can be context-dependent (mirin → vinegar mix in a
 * sauce, syrup dilution in a dessert). The `resolve()` function picks
 * the substitute given the inferred context.
 */
export interface AlcoholRule {
  ruleId: string;
  match: RegExp;
  resolve: (ctx: AlcoholContext) => string;
  reason: 'alcohol_removed' | 'alcohol_substitution';
}

/**
 * Whitelist entry — text that LOOKS like a violation but isn't (e.g.
 * `beef bacon` contains `bacon`). Matching is against the normalized
 * form of the surrounding text.
 */
export interface WhitelistEntry {
  pattern: RegExp;
  reason: string;
}

/**
 * Scanner-level shape: one input recipe + its source provenance for the
 * manifest output. Provenance is opaque to the sanitizer.
 */
export interface ScannableRecipe {
  sourceFile: string;
  recipe: RecipePolicyInput;
}

/**
 * Manifest change entry — one line in the JSON manifest emitted by the
 * audit script. Sorted deterministically before write (§6.6).
 */
export interface ManifestChange {
  source_file: string;
  recipe_name: string;
  field: PolicyField;
  old_value: string;
  new_value: string;
  rule_id: string;
  quality_flag: PolicyQualityFlag;
}

export interface ManifestViolation {
  source_file: string;
  recipe_name: string;
  field: PolicyViolationField;
  location: string;
  value: string;
  rule_id: string;
}

export interface RecipePolicyManifest {
  version: number;
  generated_at: string;
  changes: ManifestChange[];
  violations_remaining: ManifestViolation[];
}
