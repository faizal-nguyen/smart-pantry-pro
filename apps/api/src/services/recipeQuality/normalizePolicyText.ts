/**
 * PRP-239 PR1a — Unicode-safe text helpers for policy matching.
 *
 * Two distinct jobs:
 *
 *   1. `normalizePolicyText(input)` — normalize raw text into a
 *      comparison-friendly form (lowercase, NFD, strip diacritics, trim,
 *      collapse whitespace). Used by the whitelist and by any caller
 *      that wants a stable key for lookups. Postgres equivalent:
 *      `lower(unaccent(trim(value)))` (see migration
 *      `20260508120000_products_augmentation_assistant.sql`,
 *      `products.normalized_name`).
 *
 *   2. `buildAccentTolerantRegex(token)` — compile a rule token (e.g.
 *      `'porc hache'`) into a regex that matches the same token in raw
 *      French text, accent-and-case-insensitive, with anchors that
 *      block partial-word matches. Lets `RecipePolicySanitizer` perform
 *      surgical substitutions on the original string so we keep
 *      surrounding context (e.g. `porc haché ou thon` → `boeuf haché ou
 *      thon`, preserving `ou thon`).
 *
 * Why not `\b` on raw text: JS `\b` is ASCII-only. `bœuf` or `crème`
 * boundary detection becomes unreliable. The explicit
 * `(^|[^a-z0-9])X([^a-z0-9]|$)` anchor we use throughout is unambiguous.
 */

/**
 * Pipeline:
 *   1. NFD-decompose (`é` → `e` + combining acute)
 *   2. Strip combining marks (`\p{Diacritic}`)
 *   3. Lowercase
 *   4. Trim + collapse interior whitespace runs
 */
export function normalizePolicyText(input: string): string {
  if (!input) return '';
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// Per-vowel/consonant classes covering the diacritic forms we see in
// French + transliterated culinary terms. Lowercase only — the resulting
// regex always carries the `i` flag.
const ACCENT_CLASSES: Record<string, string> = {
  a: '[aàâäãå]',
  e: '[eéèêë]',
  i: '[iîïì]',
  o: '[oôöòõ]',
  u: '[uùûüũ]',
  y: '[yÿý]',
  c: '[cç]',
  n: '[nñ]',
};

const REGEX_METACHARS = new Set([
  '.',
  '*',
  '+',
  '?',
  '^',
  '$',
  '{',
  '}',
  '(',
  ')',
  '|',
  '[',
  ']',
  '\\',
  '/',
]);

/**
 * Compile a normalized token (e.g. `'porc hache'` — already lowercase,
 * no diacritics) into an accent- and case-tolerant regex matching the
 * same token in raw French text.
 *
 *   buildAccentTolerantRegex('porc hache')
 *     → /(^|[^a-z0-9])porc\s+hach[eéèêë]([^a-z0-9]|$)/i
 *
 * Whitespace runs in the token become `\s+` so `'porc  hache'` (double
 * space) still matches.
 *
 * The returned regex carries `i` (case-insensitive) and exposes two
 * captures: `$1` = the leading boundary char, `$2` = the trailing one.
 * Callers preserve them when substituting:
 *
 *   text.replace(rgx, (_, p1, p2) => `${p1}boeuf hache${p2}`)
 */
export function buildAccentTolerantRegex(normalizedToken: string): RegExp {
  if (!normalizedToken) {
    throw new Error('buildAccentTolerantRegex requires a non-empty token');
  }
  const lower = normalizedToken.toLowerCase();
  let body = '';
  for (const ch of lower) {
    if (ch === ' ') {
      body += '\\s+';
    } else if (ACCENT_CLASSES[ch]) {
      body += ACCENT_CLASSES[ch];
    } else if (REGEX_METACHARS.has(ch)) {
      body += '\\' + ch;
    } else {
      body += ch;
    }
  }
  return new RegExp(`(^|[^a-z0-9])${body}([^a-z0-9]|$)`, 'i');
}
