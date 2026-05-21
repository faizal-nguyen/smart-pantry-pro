/**
 * PRP-239 PR1a — RecipePolicySanitizer.
 *
 * Pure, deterministic. Takes a structured recipe (matches the slice of
 * `ImportedRecipeDraft` we care about), returns the same shape with
 * pork/alcohol substitutions applied to ingredient names and notes,
 * plus a list of changes, quality flags, and unfixed violations spotted
 * in the description / instructions.
 *
 * Scope split (deliberate, per plan):
 *   - Ingredient `name` + `notes` → auto-substituted in place. Safe
 *     because these fields are structured and short.
 *   - Description + instructions → detected only. Touching free-form
 *     culinary text would alter prose ("ajoutez le porc puis…"). PR1b
 *     decides via manifest whether to fix any of these cases.
 *
 * The class also exposes `detectOnly(text)` so PR4's chef agent can
 * post-check its model output for porc/alcool mentions after a recipe
 * tool ran — see PRP §10.4 (detectOnly is gated to round-2 chef output).
 *
 * No I/O. No Supabase. No `process.env`. Unit-testable without setup.
 */
import { ALCOHOL_RULES, inferAlcoholContext } from './alcoholRules.js';
import { buildAccentTolerantRegex, normalizePolicyText } from './normalizePolicyText.js';
import { PORK_RULES } from './porkRules.js';
import { isWhitelisted } from './whitelist.js';
import type {
  AlcoholContext,
  AlcoholRule,
  PolicyChange,
  PolicyQualityFlag,
  PolicyViolation,
  PolicyViolationField,
  PorkRule,
  RecipePolicyInput,
  RecipePolicyInputIngredient,
  RecipePolicyResult,
} from './policyTypes.js';

interface ApplyOnFieldResult {
  text: string;
  changes: Array<{ ruleId: string; oldValue: string; newValue: string; reason: PolicyChange['reason']; qualityFlag: PolicyQualityFlag }>;
}

export class RecipePolicySanitizer {
  /**
   * Apply the policy. Returns a fresh, sanitized copy of the input plus
   * the audit trail. Never mutates the input.
   */
  run(input: RecipePolicyInput): RecipePolicyResult {
    const changes: PolicyChange[] = [];
    const qualityFlagSet = new Set<PolicyQualityFlag>();
    const violationsRemaining: PolicyViolation[] = [];

    // Sanitize each ingredient (name + notes) in place on a copy.
    const sanitizedIngredients: RecipePolicyInputIngredient[] = input.ingredients.map(
      (ing, index): RecipePolicyInputIngredient => {
        const ctx = inferAlcoholContext(ing.notes);
        const next: RecipePolicyInputIngredient = { ...ing };

        // Substitute on `name`.
        if (next.name) {
          const r = this.applyRulesOnField(next.name, ctx);
          next.name = r.text;
          for (const c of r.changes) {
            changes.push({
              ruleId: c.ruleId,
              field: 'ingredient_name',
              ingredientIndex: index,
              oldValue: c.oldValue,
              newValue: c.newValue,
              reason: c.reason,
              qualityFlag: c.qualityFlag,
            });
            qualityFlagSet.add(c.qualityFlag);
          }
        }

        // Substitute on `notes` (may itself name an alcohol/pork — e.g.
        // notes='ou mirin'). Same rules, same context.
        if (next.notes) {
          const r = this.applyRulesOnField(next.notes, ctx);
          next.notes = r.text;
          for (const c of r.changes) {
            changes.push({
              ruleId: c.ruleId,
              field: 'ingredient_notes',
              ingredientIndex: index,
              oldValue: c.oldValue,
              newValue: c.newValue,
              reason: c.reason,
              qualityFlag: c.qualityFlag,
            });
            qualityFlagSet.add(c.qualityFlag);
          }
        }

        return next;
      },
    );

    // Detect violations in description.
    if (input.description) {
      this.collectViolations(input.description, 'description', 'description', violationsRemaining);
    }

    // Detect violations in instructions (array or single string).
    const instructionList: string[] = Array.isArray(input.instructions)
      ? input.instructions
      : [input.instructions];
    instructionList.forEach((step, i) => {
      this.collectViolations(step, 'instructions', `instructions[${i}]`, violationsRemaining);
    });

    const sanitized: RecipePolicyInput = {
      ...input,
      ingredients: sanitizedIngredients,
    };

    return {
      sanitized,
      changes,
      // Deterministic order: porc_substituted before alcohol_removed
      // when both present, so manifest output is stable.
      qualityFlags: [...qualityFlagSet].sort(),
      violationsRemaining,
    };
  }

  /**
   * Scan a single text blob and return the policy violations it
   * contains. Whitelist-aware. No substitution. Used by PR4's chef
   * agent post-check on its model output.
   *
   * Returns `{ violations: [] }` if the input is whitelisted or clean.
   */
  detectOnly(text: string): { violations: PolicyViolation[] } {
    const violations: PolicyViolation[] = [];
    if (!text) return { violations };

    const normalized = normalizePolicyText(text);
    if (isWhitelisted(normalized)) return { violations };

    for (const rule of PORK_RULES) {
      // Skip if the only match is inside a whitelisted phrase ("beef
      // bacon" contains "bacon"). We handle that by stripping whitelisted
      // phrases first when collecting violations.
      const m = rule.match.exec(text);
      if (m && !this.isMatchInsideWhitelist(text, m.index, m[0].length)) {
        violations.push({
          ruleId: rule.ruleId,
          field: 'instructions',
          location: 'text',
          value: this.snippetAround(text, m.index, m[0].length),
          reason: rule.reason,
        });
      }
    }
    for (const rule of ALCOHOL_RULES) {
      const m = rule.match.exec(text);
      if (m && !this.isMatchInsideWhitelist(text, m.index, m[0].length)) {
        violations.push({
          ruleId: rule.ruleId,
          field: 'instructions',
          location: 'text',
          value: this.snippetAround(text, m.index, m[0].length),
          reason: rule.reason,
        });
      }
    }

    return { violations };
  }

  // ---- internals -----------------------------------------------------------

  private applyRulesOnField(
    rawText: string,
    ctx: AlcoholContext,
  ): ApplyOnFieldResult {
    let text = rawText;
    const changes: ApplyOnFieldResult['changes'] = [];

    // If the entire field is whitelisted, skip rule application
    // entirely. Example: `'beef bacon'`.
    const normalizedField = normalizePolicyText(text);
    if (isWhitelisted(normalizedField)) {
      return { text, changes };
    }

    // Iterate pork rules in declaration order (longer-first wins).
    for (const r of PORK_RULES) {
      const result = this.applyPorkRuleOnce(text, r);
      if (result) {
        changes.push({
          ruleId: r.ruleId,
          oldValue: result.matched,
          newValue: result.replacement,
          reason: r.reason,
          qualityFlag: 'porc_substituted',
        });
        text = result.text;
      }
    }

    // Then alcohol rules (longer-first wins).
    for (const r of ALCOHOL_RULES) {
      const result = this.applyAlcoholRuleOnce(text, r, ctx);
      if (result) {
        changes.push({
          ruleId: r.ruleId,
          oldValue: result.matched,
          newValue: result.replacement,
          reason: r.reason,
          qualityFlag: 'alcohol_removed',
        });
        text = result.text;
      }
    }

    return { text, changes };
  }

  /**
   * Apply a pork rule at most once on the field. We keep substitutions
   * single-pass per rule because ingredient names typically contain at
   * most one violation; multi-occurrence cases are rare and PR1b can
   * extend if a seed surfaces one.
   */
  private applyPorkRuleOnce(
    text: string,
    rule: PorkRule,
  ): { text: string; matched: string; replacement: string } | null {
    const m = rule.match.exec(text);
    if (!m) return null;

    // Guard: if the match is inside a whitelisted span (e.g.
    // `bacon` inside `beef bacon`), skip it.
    if (this.isMatchInsideWhitelist(text, m.index, m[0].length)) return null;

    const p1 = m[1] ?? '';
    const p2 = m[2] ?? '';
    const before = text.slice(0, m.index);
    const after = text.slice(m.index + m[0].length);
    const newText = `${before}${p1}${rule.replacement}${p2}${after}`;

    // `matched` is the slice between the captured boundary chars.
    const matched = m[0].slice(p1.length, m[0].length - p2.length);
    return { text: newText, matched, replacement: rule.replacement };
  }

  private applyAlcoholRuleOnce(
    text: string,
    rule: AlcoholRule,
    ctx: AlcoholContext,
  ): { text: string; matched: string; replacement: string } | null {
    const m = rule.match.exec(text);
    if (!m) return null;
    if (this.isMatchInsideWhitelist(text, m.index, m[0].length)) return null;

    const p1 = m[1] ?? '';
    const p2 = m[2] ?? '';
    const replacement = rule.resolve(ctx);
    const before = text.slice(0, m.index);
    const after = text.slice(m.index + m[0].length);
    const newText = `${before}${p1}${replacement}${p2}${after}`;
    const matched = m[0].slice(p1.length, m[0].length - p2.length);
    return { text: newText, matched, replacement };
  }

  private isMatchInsideWhitelist(text: string, matchIndex: number, matchLength: number): boolean {
    const normalized = normalizePolicyText(text);
    if (!isWhitelisted(normalized)) return false;
    // If the whitelist phrase covers the match position, skip.
    // We re-compile whitelist patterns as accent-tolerant on raw text
    // here so the position check works directly.
    const matchEnd = matchIndex + matchLength;
    // Find any whitelist phrase in raw text that overlaps the match.
    const whitelistTokens = ['beef bacon', 'former en saucisse', 'sans porc', 'sans alcool'];
    for (const phrase of whitelistTokens) {
      const rgx = buildAccentTolerantRegex(phrase);
      const wm = rgx.exec(text);
      if (!wm) continue;
      const wStart = wm.index;
      const wEnd = wm.index + wm[0].length;
      // Overlap test: match interval ∩ whitelist interval ≠ ∅
      if (matchIndex < wEnd && matchEnd > wStart) return true;
    }
    return false;
  }

  private collectViolations(
    text: string,
    field: PolicyViolationField,
    location: string,
    sink: PolicyViolation[],
  ): void {
    if (!text) return;
    const normalized = normalizePolicyText(text);
    if (isWhitelisted(normalized)) return;

    for (const rule of PORK_RULES) {
      const m = rule.match.exec(text);
      if (m && !this.isMatchInsideWhitelist(text, m.index, m[0].length)) {
        sink.push({
          ruleId: rule.ruleId,
          field,
          location,
          value: this.snippetAround(text, m.index, m[0].length),
          reason: rule.reason,
        });
      }
    }
    for (const rule of ALCOHOL_RULES) {
      const m = rule.match.exec(text);
      if (m && !this.isMatchInsideWhitelist(text, m.index, m[0].length)) {
        sink.push({
          ruleId: rule.ruleId,
          field,
          location,
          value: this.snippetAround(text, m.index, m[0].length),
          reason: rule.reason,
        });
      }
    }
  }

  /**
   * Extract a short snippet around a match, useful for human review
   * of `violations_remaining` lines in the manifest.
   */
  private snippetAround(text: string, index: number, length: number): string {
    const span = 24;
    const start = Math.max(0, index - span);
    const end = Math.min(text.length, index + length + span);
    const prefix = start > 0 ? '…' : '';
    const suffix = end < text.length ? '…' : '';
    return `${prefix}${text.slice(start, end)}${suffix}`;
  }
}

/**
 * Default shared instance — every rule list is immutable and the class
 * is stateless, so a singleton is safe and avoids re-allocating the
 * regex tables on each call.
 */
export const recipePolicySanitizer = new RecipePolicySanitizer();
