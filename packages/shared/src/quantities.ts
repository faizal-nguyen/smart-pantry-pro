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
register('piece', 'count', 1, ['pieces', 'unite', 'unites', 'unit', 'units', 'pcs', 'pc', 'u']);

export function normalizeIngredientName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function describeUnit(value: string | null | undefined) {
  return UNITS[normalizeIngredientName(value ?? '')] ?? null;
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
    if (options.skip?.includes(index)) return;
    const required = ingredient.quantity == null ? null : Number(ingredient.quantity) * requestedServings / baseServings;
    const absent = (reason: StockMissing['reason'], quantity = required) => missing.push({
      ingredient_index: index, ingredient_name: ingredient.ingredient_name, quantity,
      unit: ingredient.unit ?? null, reason, is_essential: ingredient.is_essential !== false,
    });
    if (required == null || !Number.isFinite(required) || required <= 0) { absent('QUANTITY_UNKNOWN'); return; }
    if (!describeUnit(ingredient.unit)) { absent('UNIT_UNKNOWN'); return; }
    const candidates = ordered.filter(lot => !options.selectedLots?.[index] || lot.id === options.selectedLots[index]).filter(lot => ingredient.inventory_product_id
      ? lot.product_id === ingredient.inventory_product_id
      : normalizeIngredientName(lot.product_name) === normalizeIngredientName(ingredient.ingredient_name));
    if (!candidates.length) { absent('NOT_IN_STOCK'); return; }
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
