/**
 * V11-01 E1: what a week of planned meals needs to buy (PRP V11-01, section 4). Pure functions:
 * the API reads the menu basis, the stock and the list, then calls them; the command
 * menu_add_missing writes what the user kept, bounded again in SQL.
 */
import { z } from 'zod';
import { qualifyLotsOn, type QualifiedLot } from './lot-qualification.js';
import {
  allocateRecipeStock, canAddToShoppingList, convertQuantity, describeUnit, ingredientMatchRank, needsPurchase,
  normalizeIngredientName, type StockIngredient,
} from './quantities.js';
import type { ResolvedStockRecipe } from './stock-commands.js';

/** A meal of the basis (public.menu_shopping_basis) with its resolved recipe, when it has one. */
export interface MenuMealInput {
  id: string; version: number; date: string; meal_type: string;
  /** 'reserve': an earlier meal that takes the stock first; 'target': a meal of the week to shop for. */
  role: 'reserve' | 'target';
  recipe_name: string; servings: number | null; recipe: ResolvedStockRecipe | null;
}
export interface MenuNeedMeal { id: string; date: string; meal_type: string; recipe_name: string; quantity: number | null; unit: string | null }
/** to_buy: a measurable amount to buy; manual: to add by hand (« 1 botte »); verify: in stock, amount or date to check. */
export type MenuNeedStatus = 'to_buy' | 'manual' | 'verify';
export interface MenuNeed {
  key: string; status: MenuNeedStatus; name: string; product_id: string | null;
  quantity: number | null; unit: string | null; meals: MenuNeedMeal[];
  /** Lots of this ingredient whose date is passed at the meal: not counted, named to check. */
  verify_lots?: string[];
}
export interface MenuUncomputable { id: string; date: string; meal_type: string; recipe_name: string; reason: 'NO_RECIPE' | 'NO_SERVINGS' }
export interface MenuAllocation { needs: MenuNeed[]; uncomputable: MenuUncomputable[] }

const MEAL_ORDER: Record<string, number> = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };
const round9 = (value: number) => Math.round(value * 1e9) / 1e9;
const sameIngredient = (ingredient: StockIngredient, lot: { product_id: string; product_name: string }) =>
  (!!ingredient.inventory_product_id && ingredient.inventory_product_id === lot.product_id) || ingredientMatchRank(ingredient.ingredient_name, lot.product_name) > 0;
const inUnit = (quantity: number, from: string | null, to: string | null): number | null => {
  try { return convertQuantity(quantity, from, to); } catch { return null; }
};

/**
 * Allocates the stock meal after meal, in chronological order: each meal takes what is left, its
 * lots judged at its day; a partly covered ingredient keeps what it found (two meals of 200 g with
 * 100 g in stock need 300 g). Earlier meals ('reserve') only take stock; the shortfalls of the
 * target meals are grouped by product and dimension, in the unit of the first one met.
 */
export function allocateMenuStock(meals: MenuMealInput[], lots: QualifiedLot[]): MenuAllocation {
  const remaining = new Map(lots.map(lot => [lot.id, Math.max(0, Number(lot.quantity))]));
  const needs = new Map<string, MenuNeed>();
  const uncomputable: MenuUncomputable[] = [];
  const ordered = [...meals].sort((a, b) => a.date.localeCompare(b.date)
    || (MEAL_ORDER[a.meal_type] ?? 4) - (MEAL_ORDER[b.meal_type] ?? 4) || a.id.localeCompare(b.id));
  for (const meal of ordered) {
    const named = { id: meal.id, date: meal.date, meal_type: meal.meal_type, recipe_name: meal.recipe_name };
    if (!meal.recipe?.ingredients?.length) { if (meal.role === 'target') uncomputable.push({ ...named, reason: 'NO_RECIPE' }); continue; }
    if (!(Number(meal.servings) > 0) || !(Number(meal.recipe.servings) > 0)) { if (meal.role === 'target') uncomputable.push({ ...named, reason: 'NO_SERVINGS' }); continue; }
    const recipe = meal.recipe;
    const { eligible, verify } = qualifyLotsOn(lots.map(lot => ({ ...lot, quantity: remaining.get(lot.id) ?? 0 })), meal.date);
    const result = allocateRecipeStock(recipe.ingredients, eligible, recipe.servings, Number(meal.servings), { reservePartial: true });
    for (const taken of result.allocations) {
      remaining.set(taken.inventory_id, Math.max(0, round9((remaining.get(taken.inventory_id) ?? 0) - taken.quantity)));
    }
    if (meal.role !== 'target') continue;
    for (const gap of result.missing) {
      const ingredient = recipe.ingredients[gap.ingredient_index];
      const doubtful = [...new Set(verify.filter(lot => sameIngredient(ingredient, lot)).map(lot => lot.product_name))];
      const status: MenuNeedStatus = !needsPurchase(gap) || doubtful.length ? 'verify' : canAddToShoppingList(gap) ? 'to_buy' : 'manual';
      const identity = ingredient.inventory_product_id || normalizeIngredientName(gap.ingredient_name);
      const family = status === 'to_buy' ? describeUnit(gap.unit)!.dimension : normalizeIngredientName(gap.unit ?? '');
      const key = `${status}|${identity}|${family}`;
      const entry: MenuNeedMeal = { ...named, quantity: gap.quantity, unit: gap.unit };
      const known = needs.get(key);
      if (!known) {
        needs.set(key, { key, status, name: gap.ingredient_name, product_id: ingredient.inventory_product_id ?? null,
          quantity: gap.quantity, unit: gap.unit, meals: [entry], ...(doubtful.length ? { verify_lots: doubtful } : {}) });
        continue;
      }
      const added = known.quantity == null || gap.quantity == null ? null : inUnit(gap.quantity, gap.unit, known.unit);
      needs.set(key, { ...known, quantity: added == null ? null : round9((known.quantity ?? 0) + added), meals: [...known.meals, entry],
        ...(doubtful.length ? { verify_lots: [...new Set([...(known.verify_lots ?? []), ...doubtful])] } : {}) });
    }
  }
  return { needs: [...needs.values()], uncomputable };
}

/** A row of the shopping list as the review reads it. */
export interface MenuShoppingRow {
  id: string; product_id: string; product_name: string; quantity: number; unit: string | null;
  is_purchased: boolean; stock_version: number; created_at?: string | null;
}
/** What a menu_add_missing put on a row this week (negative for a reduction), in the row's unit. */
export interface MenuContribution { id: number; shopping_id: string; quantity: number; unit: string | null; line_version_after: number | null }
export type MenuLineState = 'to_add' | 'listed' | 'purchased_pending' | 'manual' | 'verify' | 'excess';
export interface MenuShoppingLine {
  key: string; state: MenuLineState; name: string; product_id: string | null;
  /** to_add: the amount to add; listed or purchased_pending: the need; excess: the amount to take back. */
  quantity: number | null; unit: string | null;
  listed_quantity?: number; purchased_quantity?: number;
  /** to_add: the oldest unchecked row of the product, topped up at its version (V11-05 D16). */
  target?: { id: string; expected_version: number };
  /** excess: the menu's share to take back from a row nobody changed since (D2). */
  reduction?: { id: string; expected_version: number; quantity: number; unit: string };
  meals: MenuNeedMeal[]; verify_lots?: string[];
}

const byAge = (a: MenuShoppingRow, b: MenuShoppingRow) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')) || a.id.localeCompare(b.id);

/**
 * The review's lines: unchecked rows, then bought rows awaiting storage, cover a need; the rest is
 * to add. A row the menu topped up holds more than the week needs: the surplus, within the menu's
 * share and while the row is unchanged since, is proposed back as an excess.
 */
export function menuShoppingLines(needs: MenuNeed[], rows: MenuShoppingRow[], contributions: MenuContribution[]): MenuShoppingLine[] {
  const lines: MenuShoppingLine[] = [];
  const surplus = new Map<string, { need: MenuNeed; left: number }>();
  const matches = (need: MenuNeed, row: MenuShoppingRow) =>
    (!!need.product_id && row.product_id === need.product_id) || ingredientMatchRank(need.name, row.product_name) > 0;
  for (const need of needs) {
    const base = { key: need.key, name: need.name, product_id: need.product_id, unit: need.unit, meals: need.meals, ...(need.verify_lots ? { verify_lots: need.verify_lots } : {}) };
    if (need.status !== 'to_buy' || need.quantity == null) { lines.push({ ...base, state: need.status === 'to_buy' ? 'manual' : need.status, quantity: need.quantity }); continue; }
    const covering = rows.filter(row => matches(need, row)).flatMap(row => {
      const quantity = inUnit(Number(row.quantity), row.unit, need.unit);
      return quantity == null ? [] : [{ row, quantity }];
    });
    const unchecked = covering.filter(item => !item.row.is_purchased);
    const listed = round9(unchecked.reduce((sum, item) => sum + item.quantity, 0));
    const purchased = round9(covering.filter(item => item.row.is_purchased).reduce((sum, item) => sum + item.quantity, 0));
    const missing = round9(need.quantity - listed - purchased);
    const amounts = { listed_quantity: listed, purchased_quantity: purchased };
    if (listed > need.quantity + 1e-9) surplus.set(need.key, { need, left: round9(listed - need.quantity) });
    if (missing <= 1e-9) { lines.push({ ...base, ...amounts, state: listed >= need.quantity - 1e-9 ? 'listed' : 'purchased_pending', quantity: need.quantity }); continue; }
    const oldest = unchecked.map(item => item.row).sort(byAge)[0];
    lines.push({ ...base, ...amounts, state: 'to_add', quantity: missing, product_id: need.product_id ?? oldest?.product_id ?? null,
      ...(oldest ? { target: { id: oldest.id, expected_version: Number(oldest.stock_version) } } : {}) });
  }
  // Excess: the menu's share of a row, while unchanged since its last menu write, not beyond the surplus.
  const shares = new Map<string, { total: number; last: MenuContribution }>();
  for (const item of [...contributions].sort((a, b) => a.id - b.id)) {
    const known = shares.get(item.shopping_id);
    shares.set(item.shopping_id, { total: round9((known?.total ?? 0) + Number(item.quantity)), last: item });
  }
  for (const row of [...rows].sort(byAge)) {
    const share = shares.get(row.id);
    if (!share || row.is_purchased || share.last.line_version_after !== Number(row.stock_version) || share.total <= 1e-9) continue;
    const [ownerKey, owner] = [...surplus.entries()].find(([, item]) => matches(item.need, row)) ?? [];
    const covered = needs.some(need => need.status === 'to_buy' && matches(need, row) && inUnit(1, row.unit, need.unit) != null);
    const room = owner ? inUnit(owner.left, owner.need.unit, row.unit) : covered ? 0 : Number(row.quantity);
    const excess = round9(Math.min(room ?? 0, share.total, Number(row.quantity)));
    if (excess <= 1e-9) continue;
    if (owner && ownerKey) surplus.set(ownerKey, { ...owner, left: round9(owner.left - (inUnit(excess, row.unit, owner.need.unit) ?? 0)) });
    lines.push({ key: `excess|${row.id}`, state: 'excess', name: row.product_name, product_id: row.product_id, quantity: excess, unit: row.unit, meals: [],
      reduction: { id: row.id, expected_version: Number(row.stock_version), quantity: excess, unit: row.unit ?? '' } });
  }
  return lines;
}

const isMonday = (day: string) => {
  const date = new Date(`${day}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day && date.getUTCDay() === 1;
};
/** POST /api/v1/menus/shopping-preview: the Monday of the week to shop for. */
export const MenuShoppingPreviewRequestSchema = z.object({
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isMonday, { message: 'week_start is a Monday' }),
}).strict();

/** The review of a week's shopping, with the three tokens menu_add_missing is confirmed against. */
export interface MenuShoppingPreview {
  week_start: string; as_of: string; menu_version: string; context_revision: number;
  lines: MenuShoppingLine[];
  meals: Array<{ id: string; date: string; meal_type: string; recipe_name: string; role: 'reserve' | 'target' }>;
  uncomputable: MenuUncomputable[];
}
