/**
 * PRP-239 PR1a — Recipe policy whitelist (§6.5).
 *
 * Texts that LOOK like a porc/alcool violation but aren't. Patterns are
 * matched against the normalized form of the surrounding text (see
 * `normalizePolicyText.ts`). Lowercase + diacritics-stripped only.
 *
 * Rules of thumb for adding entries:
 *   - The pattern must be specific enough to never swallow a real
 *     violation (e.g. `beef bacon` is fine; `bacon` alone is not).
 *   - The reason is mandatory — it's surfaced when auditing skips.
 *   - Use `(^|[^a-z0-9])X([^a-z0-9]|$)` anchors instead of `\b`. JS `\b`
 *     does not understand non-ASCII word characters reliably even after
 *     normalization (e.g. ligatures), and our anchors are unambiguous.
 */
import type { WhitelistEntry } from './policyTypes.js';

export const RECIPE_POLICY_WHITELIST: readonly WhitelistEntry[] = [
  {
    pattern: /(^|[^a-z0-9])beef bacon([^a-z0-9]|$)/,
    reason: 'Allowed non-pork substitute; do not rewrite.',
  },
  {
    pattern: /(^|[^a-z0-9])former en saucisse([^a-z0-9]|$)/,
    reason: 'Verb phrase, not an ingredient.',
  },
  {
    pattern: /(^|[^a-z0-9])sans porc([^a-z0-9]|$)/,
    reason: 'Negative mention, not a violation.',
  },
  {
    pattern: /(^|[^a-z0-9])sans alcool([^a-z0-9]|$)/,
    reason: 'Negative mention, not a violation.',
  },
  {
    pattern: /(^|[^a-z0-9])chorizo de boeuf([^a-z0-9]|$)/,
    reason: 'Post-substitution form — already converted from pork chorizo.',
  },
] as const;

/**
 * `true` if any whitelist entry covers the given normalized text.
 *
 * Callers pass already-normalized text so we don't double-normalize on
 * every rule iteration (hot path during seed audits).
 */
export function isWhitelisted(normalizedText: string): boolean {
  for (const entry of RECIPE_POLICY_WHITELIST) {
    if (entry.pattern.test(normalizedText)) return true;
  }
  return false;
}
