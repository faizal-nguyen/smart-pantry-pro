import { z } from 'zod';
import { allocateRecipeStock, normalizeIngredientName, type StockIngredient, type StockLot, type StockMissing } from './quantities.js';
export const CookingAdjustmentSchema = z.object({
  ingredient_index: z.number().int().nonnegative(),
  // Actual quantity for the whole meal, not per original serving.
  quantity: z.number().finite().nonnegative().max(1e9),
  unit: z.string().trim().min(1).max(40),
  inventory_product_id: z.string().uuid().optional(),
  inventory_id: z.string().uuid().optional(),
}).strict();
export const CookingAdjustmentsSchema = z.array(CookingAdjustmentSchema).max(100);
export type CookingAdjustment = z.infer<typeof CookingAdjustmentSchema>;
export function adjustedCookingIngredients(ingredients: StockIngredient[], base: number, servings: number, adjustments: CookingAdjustment[] = [], outside: number[] = []): StockIngredient[] {
  const used = new Set<number>();
  for (const item of adjustments) {
    if (item.ingredient_index >= ingredients.length || used.has(item.ingredient_index)) throw new Error('INVALID_ALLOCATION');
    used.add(item.ingredient_index);
  }
  return ingredients.map((ingredient,index) => {
    const change = adjustments.find(item => item.ingredient_index === index);
    return { ...ingredient, quantity: outside.includes(index) ? 0 : change?.quantity ?? (ingredient.quantity == null ? null : ingredient.quantity * servings/base),
      unit: change?.unit ?? ingredient.unit, inventory_product_id: change?.inventory_product_id ?? ingredient.inventory_product_id };
  });
}
export function allocateCookingStock(ingredients: StockIngredient[], lots: StockLot[], base: number, servings: number, adjustments: CookingAdjustment[] = [], outside: number[] = []) {
  const actual = adjustedCookingIngredients(ingredients,base,servings,adjustments,outside);
  if (outside.some(index => index < 0 || index >= ingredients.length)) throw new Error('INVALID_ALLOCATION');
  const selectedLots: Record<number,string> = {};
  for (const change of adjustments) if (change.inventory_id) selectedLots[change.ingredient_index] = change.inventory_id;
  return allocateRecipeStock(actual,lots,1,1,{ skip: [...outside,...adjustments.filter(item => item.quantity === 0).map(item => item.ingredient_index)], selectedLots });
}

export interface CookStockPlan {
  adjustments: CookingAdjustment[];
  outside_inventory: number[];
  /** Taken whole from the stock. */
  taken: Array<{ ingredient_index: number; ingredient_name: string; quantity: number; unit: string }>;
  /** The stock held less than the recipe: all of it is taken. */
  partial: Array<{ ingredient_index: number; ingredient_name: string; quantity: number; needed: number; unit: string }>;
  /** Left untouched; no reason when it was declared outside the stock. */
  outside: Array<{ ingredient_index: number; ingredient_name: string; reason?: StockMissing['reason'] }>;
}

const exact = (value: number) => Math.round(value * 1e9) / 1e9;

/**
 * « J'ai cuisiné X » (iPhone 2026-11-08): one ingredient short of the recipe refused the
 * whole cook. What the stock holds is taken, all of it when it holds less than the
 * recipe, and the rest counts as cooked outside the stock, so allocateCookingStock finds
 * nothing missing, as consume_recipe requires.
 */
export function planCookFromStock(ingredients: StockIngredient[], lots: StockLot[], base: number, servings: number, declaredOutside: number[] = []): CookStockPlan {
  const outside = new Set(declaredOutside);
  const reasons = new Map<number, StockMissing['reason']>();
  const needed = (index: number) => { const quantity = ingredients[index].quantity; return quantity == null ? null : quantity * servings / base; };
  let adjustments: CookingAdjustment[] = [];
  // A short ingredient takes what is left, which can leave a later one sharing its lot short:
  // repeat until nothing is missing. From pass n on, anything missing goes outside, so it ends.
  for (let pass = 0; ; pass++) {
    const { missing } = allocateCookingStock(ingredients, lots, base, servings, adjustments, [...outside]);
    if (!missing.length) break;
    for (const item of missing) {
      const index = item.ingredient_index, unit = ingredients[index].unit;
      const asked = adjustments.find(change => change.ingredient_index === index)?.quantity ?? needed(index);
      const have = item.reason === 'INSUFFICIENT_QUANTITY' && asked != null && item.quantity != null ? exact(asked - item.quantity) : 0;
      adjustments = adjustments.filter(change => change.ingredient_index !== index);
      if (have > 0 && unit && pass < ingredients.length) adjustments.push({ ingredient_index: index, quantity: have, unit });
      else {
        outside.add(index);
        if (!reasons.has(index)) reasons.set(index, item.reason === 'INSUFFICIENT_QUANTITY' ? 'NOT_IN_STOCK' : item.reason);
      }
    }
  }
  const allocated = new Set(allocateCookingStock(ingredients, lots, base, servings, adjustments, [...outside]).allocations.map(item => item.ingredient_index));
  const plan: CookStockPlan = { adjustments, outside_inventory: [...outside].sort((a, b) => a - b), taken: [], partial: [], outside: [] };
  ingredients.forEach((ingredient, index) => {
    if (!allocated.has(index)) return;
    const change = adjustments.find(item => item.ingredient_index === index);
    if (change) plan.partial.push({ ingredient_index: index, ingredient_name: ingredient.ingredient_name, quantity: change.quantity, needed: exact(needed(index) ?? 0), unit: change.unit });
    else plan.taken.push({ ingredient_index: index, ingredient_name: ingredient.ingredient_name, quantity: exact(needed(index) ?? 0), unit: ingredient.unit ?? '' });
  });
  plan.outside = plan.outside_inventory.map(index => ({ ingredient_index: index, ingredient_name: ingredients[index].ingredient_name,
    ...(reasons.has(index) ? { reason: reasons.get(index) } : {}) }));
  return plan;
}

// Abbreviations stay as they are (« 2 tsp »); g, kg, ml or « c. à soupe » are never one plain word of 3 letters or more.
const UNIT_ABBREVIATIONS = new Set(['tsp', 'tbsp', 'pcs', 'cas', 'cac']);
/** « 2 unité » reads « 2 unités », « 2 litre » « 2 litres »; 1,5 stays singular, as in French. */
function unitFor(quantity: number, unit: string): string {
  const word = unit.trim();
  if (quantity < 2 || !/^\p{L}{3,}$/u.test(word) || /[sxz]$/i.test(word) || UNIT_ABBREVIATIONS.has(word.toLowerCase())) return word;
  return `${word}s`;
}
const amount = (quantity: number, unit: string) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(quantity)} ${unitFor(quantity, unit)}`.trim();
const sameName = (name: string) => normalizeIngredientName(name);
/** Each ingredient once (iPhone 2026-11-09: « ghee » twice in the same list). */
const names = (items: Array<{ ingredient_name: string }>) => items
  .filter((item, index) => items.findIndex(other => sameName(other.ingredient_name) === sameName(item.ingredient_name)) === index)
  .map(item => item.ingredient_name).join(', ');
/** The same ingredient taken twice in the same unit (rice for two steps) reads as one amount. */
function takenOnce(items: CookStockPlan['taken']): CookStockPlan['taken'] {
  const merged = new Map<string, CookStockPlan['taken'][number]>();
  for (const item of items) {
    const key = `${sameName(item.ingredient_name)}|${sameName(item.unit)}`;
    const seen = merged.get(key);
    merged.set(key, seen ? { ...seen, quantity: seen.quantity + item.quantity } : item);
  }
  return [...merged.values()];
}

/** What a cook takes from the stock, before it is confirmed (planned) or once it is done. */
export function describeCookPlan(plan: CookStockPlan, tense: 'planned' | 'done'): string[] {
  const lines: string[] = [];
  if (plan.taken.length) lines.push(`${tense === 'planned' ? 'Je retire de ton stock' : 'Retiré de ton stock'} : ${takenOnce(plan.taken).map(item => `${item.ingredient_name} ${amount(item.quantity, item.unit)}`).join(', ')}.`);
  if (plan.partial.length) lines.push(`${tense === 'planned' ? 'Je prends tout ce que tu as' : 'Tout ce que tu avais'} : ${plan.partial
    .map(item => `${item.ingredient_name} ${amount(item.quantity, item.unit)} (la recette en demande ${amount(item.needed, item.unit)})`).join(', ')}.`);
  if (!plan.taken.length && !plan.partial.length) lines.push('Rien à retirer de ton stock.');
  const absent = plan.outside.filter(item => item.reason === 'NOT_IN_STOCK');
  const unclear = plan.outside.filter(item => item.reason && item.reason !== 'NOT_IN_STOCK');
  const declared = plan.outside.filter(item => !item.reason);
  if (absent.length) lines.push(`Pas dans ton stock, rien à retirer : ${names(absent)}.`);
  if (unclear.length) lines.push(`Quantité ou unité à préciser, je n’y touche pas : ${names(unclear)}.`);
  if (declared.length) lines.push(`Hors stock, je n’y touche pas : ${names(declared)}.`);
  return lines;
}
