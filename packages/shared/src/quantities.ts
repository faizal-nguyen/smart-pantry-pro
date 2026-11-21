export type QuantityDimension = 'mass' | 'volume' | 'count';

const UNITS: Record<string, { unit: string; dimension: QuantityDimension; factor: number }> = {};
function register(unit: string, dimension: QuantityDimension, factor: number, aliases: string[]) {
  for (const alias of [unit, ...aliases]) UNITS[alias] = { unit, dimension, factor };
}
register('g', 'mass', 1, ['gramme', 'grammes', 'gram', 'grams', 'gr']);
register('kg', 'mass', 1000, ['kilogramme', 'kilogrammes', 'kilogram', 'kilograms', 'kilo', 'kilos']);
register('mg', 'mass', 0.001, ['milligramme', 'milligrammes']);
register('ml', 'volume', 1, ['millilitre', 'millilitres', 'milliliter', 'milliliters']);
register('cl', 'volume', 10, ['centilitre', 'centilitres']);
register('dl', 'volume', 100, ['decilitre', 'decilitres']);
register('l', 'volume', 1000, ['litre', 'litres', 'liter', 'liters']);
// Measuring spoons are standard volumes; cups, pinches and cans stay unconverted (sizes vary).
register('c. a soupe', 'volume', 15, ['c.a.s', 'c.a.s.', 'cuillere a soupe', 'cuilleres a soupe', 'tbsp', 'tablespoon', 'tablespoons']);
register('c. a cafe', 'volume', 5, ['c.a.c', 'c.a.c.', 'cuillere a cafe', 'cuilleres a cafe', 'tsp', 'teaspoon', 'teaspoons']);
register('piece', 'count', 1, ['pieces', 'unite', 'unites', 'unit', 'units', 'pcs', 'pc', 'u']);

export function normalizeIngredientName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// A complement after the shared words names another product: "lait de coco" is not "lait".
const COMPLEMENT_WORDS = new Set(['de', 'd', 'du', 'des', 'a', 'au', 'aux', 'en', 'l', 'la', 'le', 'les']);
// Staples whose usual shop name carries a complement ("Sel de mer", "Sucre en poudre").
const SAME_STAPLES = new Set(['sel de mer', 'sel de guerande', 'sucre en poudre', 'sucre de canne', 'poivre en grain']);
// Qualifiers that turn a base ingredient into another product ("lait concentré", "saumon fumé").
const TRANSFORMING_WORDS = new Set(['concentre', 'sucree', 'seche', 'sechee', 'deshydrate', 'deshydratee', 'fume', 'fumee',
  'semoule', 'caramelise', 'caramelisee', 'moulu', 'moulue', 'granule', 'granulee', 'confit', 'confite', 'frit', 'frite']);
const TAP_WATER_WORDS = new Set(['chaude', 'froide', 'tiede', 'bouillante', 'glacee', 'fraiche', 'du', 'robinet']);
// Letters without a decomposed form, so that "đường" keeps its first letter.
const PLAIN_LETTERS: Record<string, string> = { 'œ': 'oe', 'æ': 'ae', 'đ': 'd', 'ð': 'd', 'ø': 'o', 'ł': 'l', 'ß': 'ss' };

/** Accent-, case-, punctuation- and plural-insensitive words of a product or ingredient name. */
export function ingredientNameTokens(value: string): string[] {
  return normalizeIngredientName(value).replace(/[œæđðøłß]/g, letter => PLAIN_LETTERS[letter])
    .split(/[^a-z0-9]+/).filter(Boolean)
    .map(token => token.length > 3 && /[sx]$/.test(token) ? token.slice(0, -1) : token);
}

/**
 * A packaged product keeps the name printed on its pack, brand last
 * ("Mayonnaise Kewpie"): recipes find it by its leading words ("mayonnaise"),
 * and two brands of the same product stay two products. A brand written
 * first ("Kewpie Mayonnaise") moves to the end.
 */
export function productNameWithBrand(name: string, brand?: string | null): string {
  const cleanName = name.trim().replace(/\s+/g, ' ');
  const cleanBrand = (brand ?? '').trim().replace(/\s+/g, ' ');
  const brandWords = ingredientNameTokens(cleanBrand);
  if (!brandWords.length) return cleanName;
  const nameWords = ingredientNameTokens(cleanName);
  if (nameWords.length > brandWords.length && brandWords.every((word, i) => nameWords[i] === word)) {
    const escapedBrand = cleanBrand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rest = cleanName.replace(new RegExp(`^${escapedBrand}[\\s,:\u2013\u2014-]*`, 'i'), '');
    return rest && rest !== cleanName ? `${rest} ${cleanBrand}` : cleanName;
  }
  if (` ${nameWords.join(' ')} `.includes(` ${brandWords.join(' ')} `)) return cleanName;
  return cleanName ? `${cleanName} ${cleanBrand}` : cleanBrand;
}

/**
 * 0 when the names designate different products, 1 for the same product name,
 * 2 when the product only adds descriptive words to the ingredient ("Lait de coco bio"
 * for "lait de coco"). A more specific ingredient ("citron vert") is never covered by
 * a generic product ("Citron").
 */
export function ingredientMatchRank(ingredientName: string, productName: string): 0 | 1 | 2 {
  const same = normalizeIngredientName(ingredientName);
  if (same && same === normalizeIngredientName(productName)) return 1; // any script, e.g. "味噌"
  const ingredient = ingredientNameTokens(ingredientName);
  const product = ingredientNameTokens(productName);
  if (!ingredient.length || ingredient.length > product.length) return 0;
  if (ingredient.join(' ') === product.join(' ')) return 1;
  if (ingredient.length === product.length || !ingredient.every((token, index) => product[index] === token)) return 0;
  const extra = product.slice(ingredient.length);
  if (COMPLEMENT_WORDS.has(extra[0]) && !SAME_STAPLES.has([...ingredient, ...extra.slice(0, 2)].join(' '))) return 0;
  return extra.some(token => TRANSFORMING_WORDS.has(token)) ? 0 : 2;
}

/** Tap water ("eau", "eau chaude", "eau du robinet") is never tracked as stock. */
export function isAlwaysAvailableIngredient(ingredientName: string): boolean {
  const [head, ...rest] = ingredientNameTokens(ingredientName);
  return head === 'eau' && rest.every(token => TAP_WATER_WORDS.has(token));
}

/** A unit as typed or picked, without accents, case or the "(s)" of "unité(s)". */
function unitName(value: string | null | undefined): string {
  return normalizeIngredientName(value ?? '').replace(/\s*\([sx]\)$/, '');
}

/** Plural-insensitive name of a unit without conversion: "sachets" and "sachet(s)" are "sachet". */
function unitKey(value: string | null | undefined): string {
  const name = unitName(value);
  // Characters, not UTF-16 units, like length() in SQL.
  return [...name].length > 3 && /[sx]$/.test(name) ? name.slice(0, -1) : name;
}

export function describeUnit(value: string | null | undefined) {
  return UNITS[unitName(value)] ?? null;
}

export class QuantityError extends Error {
  constructor(public readonly code: 'UNIT_UNKNOWN' | 'UNIT_INCOMPATIBLE' | 'INVALID_QUANTITY', message: string) {
    super(message);
    this.name = 'QuantityError';
  }
}

export function convertQuantity(quantity: number, from: string | null | undefined, to: string | null | undefined): number {
  if (!Number.isFinite(quantity) || quantity < 0) throw new QuantityError('INVALID_QUANTITY', 'Quantité invalide.');
  const source = describeUnit(from);
  const target = describeUnit(to);
  // A unit without conversion ("sachet", "boîte", "tasse") still counts in itself.
  if (!source && !target && unitKey(from) && unitKey(from) === unitKey(to)) return Math.round(quantity * 1e9) / 1e9;
  if (!source || !target) throw new QuantityError('UNIT_UNKNOWN', 'Unité à vérifier.');
  if (source.dimension !== target.dimension) throw new QuantityError('UNIT_INCOMPATIBLE', 'Ces unités ne sont pas convertibles sans information supplémentaire.');
  return Math.round(quantity * source.factor / target.factor * 1e9) / 1e9;
}

export interface StockIngredient {
  ingredient_name: string;
  quantity?: number | null;
  unit?: string | null;
  inventory_product_id?: string | null;
  is_essential?: boolean;
}

export interface StockLot {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string | null;
  stock_version: number;
  expiry_date?: string | null;
}

export interface TopUpLot {
  id: string;
  quantity: number;
  /** The row unit, or the product unit when the row has none. */
  unit: string | null;
  expiry_date?: string | null;
  location?: string | null;
}

/**
 * The lot of one product that an add tops up instead of creating a row: stock
 * left (an empty lot may carry a stale date), a unit the stock commands can
 * convert, no other place, and the same expiry date — or, for an add without
 * one, the only dated lot. Lots with the same date are interchangeable: the
 * first one wins.
 */
export function findTopUpLot<T extends TopUpLot>(
  lots: readonly T[],
  add: { quantity: number; unit: string | null; expiry_date?: string | null; location?: string | null },
): { lot: T; total: number } | null {
  const fits = lots.flatMap(lot => {
    if (!(lot.quantity > 0) || (add.location && lot.location && add.location !== lot.location)) return [];
    try { return [{ lot, total: Math.round((lot.quantity + convertQuantity(add.quantity, add.unit, lot.unit)) * 1e9) / 1e9 }]; }
    catch { return []; }
  });
  const date = add.expiry_date ?? null;
  const sameDate = fits.filter(({ lot }) => (lot.expiry_date ?? null) === date);
  if (sameDate.length) return sameDate[0];
  return !date && fits.length === 1 ? fits[0] : null;
}

export interface StockAllocation {
  ingredient_index: number;
  inventory_id: string;
  quantity: number;
  unit: string;
  expected_version: number;
}

export interface StockMissing {
  ingredient_index: number;
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
  reason: 'NOT_IN_STOCK' | 'INSUFFICIENT_QUANTITY' | 'QUANTITY_UNKNOWN' | 'UNIT_UNKNOWN' | 'UNIT_INCOMPATIBLE';
  is_essential: boolean;
}

/** Absent or insufficient stock must be bought; other reasons mean "in stock, amount to verify". */
export function needsPurchase(missing: { reason?: StockMissing['reason'] }): boolean {
  return missing.reason === 'NOT_IN_STOCK' || missing.reason === 'INSUFFICIENT_QUANTITY';
}

/** The shopping list only holds measurable amounts; "1 botte" or "au goût" is added by hand. */
export function canAddToShoppingList(missing: StockMissing): boolean {
  return needsPurchase(missing) && missing.quantity != null && missing.quantity > 0 && !!describeUnit(missing.unit);
}

/** Reserve lots once across the whole recipe, including repeated ingredients. */
export function allocateRecipeStock(
  ingredients: StockIngredient[], lots: StockLot[], baseServings: number, requestedServings: number,
  options: { skip?: number[]; selectedLots?: Record<number,string> } = {},
): { allocations: StockAllocation[]; missing: StockMissing[] } {
  if (!Number.isFinite(baseServings) || baseServings <= 0 || !Number.isFinite(requestedServings) || requestedServings <= 0) {
    throw new QuantityError('INVALID_QUANTITY', 'Nombre de portions invalide.');
  }
  const allocations: StockAllocation[] = [];
  const missing: StockMissing[] = [];
  const remaining = new Map(lots.map(lot => [lot.id, Math.max(0, Number(lot.quantity))]));
  const ordered = [...lots].sort((a, b) => (a.expiry_date ?? '9999-12-31').localeCompare(b.expiry_date ?? '9999-12-31') || a.id.localeCompare(b.id));
  ingredients.forEach((ingredient, index) => {
    if (options.skip?.includes(index) || isAlwaysAvailableIngredient(ingredient.ingredient_name)) return;
    const required = ingredient.quantity == null ? null : Number(ingredient.quantity) * requestedServings / baseServings;
    const absent = (reason: StockMissing['reason'], quantity = required) => missing.push({
      ingredient_index: index, ingredient_name: ingredient.ingredient_name, quantity,
      unit: ingredient.unit ?? null, reason, is_essential: ingredient.is_essential !== false,
    });
    const rank = (lot: StockLot) => ingredient.inventory_product_id && lot.product_id === ingredient.inventory_product_id
      ? 1 : ingredientMatchRank(ingredient.ingredient_name, lot.product_name);
    // Same-named products first, then more specific ones; expiry order is kept within each group.
    const candidates = ordered.filter(lot => !options.selectedLots?.[index] || lot.id === options.selectedLots[index])
      .map(lot => ({ lot, rank: rank(lot) })).filter(match => match.rank > 0)
      .sort((a, b) => a.rank - b.rank).map(match => match.lot);
    // Unknown amounts or units only mean "to verify" when the product is actually in stock.
    const inStock = candidates.some(lot => (remaining.get(lot.id) ?? 0) > 0);
    if (!candidates.length) { absent('NOT_IN_STOCK'); return; }
    if (required == null || !Number.isFinite(required) || required <= 0) { absent(inStock ? 'QUANTITY_UNKNOWN' : 'NOT_IN_STOCK'); return; }
    // "1 sachet" is taken from a lot in sachets; against grams it stays to verify (below).
    if (!unitKey(ingredient.unit) || (!describeUnit(ingredient.unit) && !inStock)) { absent(inStock ? 'UNIT_UNKNOWN' : 'NOT_IN_STOCK'); return; }
    let needed = required;
    const proposed: StockAllocation[] = [];
    let incompatible: StockMissing['reason'] | null = null;
    for (const lot of candidates) {
      const have = remaining.get(lot.id) ?? 0;
      if (have <= 0 || needed <= 1e-9) continue;
      try {
        const available = convertQuantity(have, lot.unit, ingredient.unit);
        const taking = Math.min(needed, available);
        if (taking <= 0) continue;
        proposed.push({ ingredient_index: index, inventory_id: lot.id,
          quantity: convertQuantity(taking, ingredient.unit, lot.unit), unit: lot.unit!, expected_version: lot.stock_version });
        needed = Math.max(0, Math.round((needed - taking) * 1e9) / 1e9);
      } catch (error) {
        if (!(error instanceof QuantityError)) throw error;
        incompatible = error.code === 'UNIT_INCOMPATIBLE' ? 'UNIT_INCOMPATIBLE' : 'UNIT_UNKNOWN';
      }
    }
    if (needed > 1e-9) { absent(incompatible ?? 'INSUFFICIENT_QUANTITY', needed); return; }
    for (const allocation of proposed) {
      remaining.set(allocation.inventory_id, (remaining.get(allocation.inventory_id) ?? 0) - allocation.quantity);
      allocations.push(allocation);
    }
  });
  return { allocations, missing };
}
