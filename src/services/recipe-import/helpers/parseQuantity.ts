/**
 * Pull a numeric quantity + unit out of a single ingredient line.
 *
 * Examples:
 *   "200 g flour"       -> { quantity: 200, unit: 'g',     rest: 'flour' }
 *   "1/2 cup sugar"     -> { quantity: 0.5, unit: 'cup',   rest: 'sugar' }
 *   "2 c.s. olive oil"  -> { quantity: 2,   unit: 'c.s.',  rest: 'olive oil' }
 *   "salt to taste"     -> { rest: 'salt to taste' }
 *
 * Always returns the original `raw`; never throws. The fallback when no
 * pattern matches is an object with only `rest = raw` so the adapter
 * still ends up with a non-empty ingredient name.
 */

const NUMBER = /\d+(?:[.,]\d+)?|\d+\/\d+/;
const UNIT = /[a-zA-ZµμéèàâäçîïôöùûüÿæœÉÈÀÂÄÇÎÏÔÖÙÛÜŸÆŒ°/.\-]+/;
const QUANTITY_LINE = new RegExp(
  '^(' + NUMBER.source + ')\\s*(' + UNIT.source + ')?\\s*(.*)$'
);

export interface ParsedQuantity {
  raw: string;
  quantity?: number;
  unit?: string;
  rest?: string;
}

export function parseQuantity(raw: string): ParsedQuantity {
  const trimmed = raw.trim();
  if (!trimmed) return { raw };

  const m = QUANTITY_LINE.exec(trimmed);
  if (!m) return { raw, rest: trimmed };

  const numText = m[1];
  const unitOrName = m[2]?.trim();
  const rest = m[3]?.trim();

  const quantity = parseNumber(numText);
  if (quantity === undefined) return { raw, rest: trimmed };

  // If the captured "unit" looks like a real unit, treat it as such.
  // Otherwise it is probably the start of the ingredient name.
  if (unitOrName && looksLikeUnit(unitOrName)) {
    return {
      raw,
      quantity,
      unit: unitOrName,
      rest: rest || undefined,
    };
  }

  // No unit detected, just a quantity prefix.
  const remainder = [unitOrName, rest].filter(Boolean).join(' ').trim();
  return {
    raw,
    quantity,
    rest: remainder || undefined,
  };
}

function parseNumber(text: string): number | undefined {
  if (text.includes('/')) {
    const [num, den] = text.split('/').map(Number);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return undefined;
    return num / den;
  }
  const n = Number(text.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

const KNOWN_UNITS = new Set(
  [
    'g', 'kg', 'mg',
    'ml', 'cl', 'dl', 'l',
    'oz', 'lb', 'fl', 'fl.oz',
    'cup', 'cups', 'tasse', 'tasses',
    'tsp', 'tbsp', 'tbs', 'tbl',
    'c', 'cc', 'cs', 'c.s.', 'c.c.', 'c.a.s.', 'c.a.c.',
    'cuillere', 'cuilleres', 'cuillère', 'cuillères',
    'pinch', 'pincee', 'pincée',
    'piece', 'pieces', 'pièce', 'pièces',
    'tranche', 'tranches', 'slice', 'slices',
    'gousse', 'gousses', 'clove', 'cloves',
    '°c', '°f',
  ].map((u) => u.toLowerCase())
);

function looksLikeUnit(token: string): boolean {
  const lower = token.toLowerCase().replace(/\.$/, '');
  if (KNOWN_UNITS.has(lower)) return true;
  // Short uppercase/hyphenated tokens of <= 6 chars without a digit
  // are likely abbreviations rather than ingredient names.
  if (token.length <= 6 && !/\d/.test(token) && /^[\p{L}.\-/]+$/u.test(token)) {
    // But "salt", "sugar" would also be <=6 chars - require at least one
    // dot, hyphen, slash, or non-ascii to be considered a unit.
    if (/[./\-°µμé]/.test(token)) return true;
  }
  return false;
}
