/**
 * PRP-239 PR1a — RecipeQualityScanner.
 *
 * Batch wrapper around `RecipePolicySanitizer`. Takes a list of
 * `ScannableRecipe` items (recipe + source provenance), runs each
 * through the sanitizer, and emits a deterministic JSON manifest ready
 * to be archived in git.
 *
 * Determinism is a hard requirement (PRP §6.6). Two consecutive runs on
 * the same input must produce byte-identical output once serialized —
 * otherwise PR1b's "apply manifest" migration becomes a moving target.
 *
 * Sort order (final manifest, before serialize):
 *
 *   changes:               source_file, recipe_name, field,  rule_id,  old_value (asc)
 *   violations_remaining:  source_file, recipe_name, field,  location, rule_id (asc)
 *
 * Pure, in-memory. The actual seed-parsing CLI lives in
 * `scripts/audit-recipe-policy.ts`.
 */
import { RecipePolicySanitizer, recipePolicySanitizer } from './RecipePolicySanitizer.js';
import type {
  ManifestChange,
  ManifestViolation,
  RecipePolicyManifest,
  ScannableRecipe,
} from './policyTypes.js';

const MANIFEST_VERSION = 1;

export interface ScanOptions {
  /** Override the timestamp written into the manifest (test stability). */
  generatedAt?: string;
}

export class RecipeQualityScanner {
  constructor(private readonly sanitizer: RecipePolicySanitizer = recipePolicySanitizer) {}

  scan(items: readonly ScannableRecipe[], opts: ScanOptions = {}): RecipePolicyManifest {
    const changes: ManifestChange[] = [];
    const violations: ManifestViolation[] = [];

    for (const item of items) {
      const result = this.sanitizer.run(item.recipe);
      for (const c of result.changes) {
        changes.push({
          source_file: item.sourceFile,
          recipe_name: item.recipe.name,
          field: c.field,
          old_value: c.oldValue,
          new_value: c.newValue,
          rule_id: c.ruleId,
          quality_flag: c.qualityFlag,
        });
      }
      for (const v of result.violationsRemaining) {
        violations.push({
          source_file: item.sourceFile,
          recipe_name: item.recipe.name,
          field: v.field,
          location: v.location,
          value: v.value,
          rule_id: v.ruleId,
        });
      }
    }

    changes.sort((a, b) =>
      cmp(a.source_file, b.source_file) ||
      cmp(a.recipe_name, b.recipe_name) ||
      cmp(a.field, b.field) ||
      cmp(a.rule_id, b.rule_id) ||
      cmp(a.old_value, b.old_value),
    );

    violations.sort((a, b) =>
      cmp(a.source_file, b.source_file) ||
      cmp(a.recipe_name, b.recipe_name) ||
      cmp(a.field, b.field) ||
      cmp(a.location, b.location) ||
      cmp(a.rule_id, b.rule_id),
    );

    return {
      version: MANIFEST_VERSION,
      generated_at: opts.generatedAt ?? new Date().toISOString(),
      changes,
      violations_remaining: violations,
    };
  }

  /**
   * Convenience: pretty-print a manifest for archival in git. Two
   * spaces indent, trailing newline. Used by the CLI and tests.
   */
  static serialize(manifest: RecipePolicyManifest): string {
    return `${JSON.stringify(manifest, null, 2)}\n`;
  }
}

function cmp(a: string, b: string): number {
  // Locale-independent — `localeCompare` would diverge between CI hosts.
  return a < b ? -1 : a > b ? 1 : 0;
}

export const recipeQualityScanner = new RecipeQualityScanner();
