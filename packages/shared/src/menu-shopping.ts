/**
 * V11-01 E1: what a week of planned meals needs to buy (PRP V11-01, section 4). Pure functions:
 * the API reads the menu basis, the stock and the list, then calls them; the command
 * menu_add_missing writes what the user kept, bounded again in SQL.
 */
import { z } from 'zod';
import { qualifyLotsOn, type QualifiedLot } from './lot-qualification.js';
import {
  allocateRecipeStock, canAddToShoppingList, convertQuantity, describeUnit, ingredientMatchRank, needsPurchase,
  normalizeIngredientName, type StockIngredient, type StockMissing,
} from './quantities.js';
import type { ResolvedStockRecipe } from './stock-commands.js';

/** A meal of the basis (public.menu_shopping_basis) with its resolved recipe, when it has one. */
export interface MenuMealInput {
  id: string; version: number; date: string; meal_type: string;
  /** 'reserve': an earlier meal that takes the stock first; 'target': a meal of the week to shop for. */
  role: 'reserve' | 'target';
  /** servings null: the recipe's own, as cooking does. */
  recipe_name: string; servings: number | null; recipe: ResolvedStockRecipe | null;
  /** The meal names a recipe that no longer resolves (deleted, no longer shared). */
  recipe_unavailable?: boolean;
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
/**
 * NO_RECIPE: the meal names no recipe; RECIPE_UNAVAILABLE: its recipe no longer resolves; NO_SERVINGS:
 * nothing to scale it by. An earlier meal ('reserve') is named too when its stock could not be reserved.
 */
export interface MenuUncomputable {
  id: string; date: string; meal_type: string; recipe_name: string; role: 'reserve' | 'target';
  reason: 'NO_RECIPE' | 'RECIPE_UNAVAILABLE' | 'NO_SERVINGS';
}
export interface MenuAllocation { needs: MenuNeed[]; uncomputable: MenuUncomputable[] }

const MEAL_ORDER: Record<string, number> = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };
const EPSILON = 1e-9;
const round9 = (value: number) => Math.round(value * 1e9) / 1e9;
const sameIngredient = (ingredient: StockIngredient, lot: { product_id: string; product_name: string }) =>
  (!!ingredient.inventory_product_id && ingredient.inventory_product_id === lot.product_id) || ingredientMatchRank(ingredient.ingredient_name, lot.product_name) > 0;
const inUnit = (quantity: number, from: string | null, to: string | null): number | null => {
  try { return convertQuantity(quantity, from, to); } catch { return null; }
};
const chronological = (a: MenuMealInput, b: MenuMealInput) => a.date.localeCompare(b.date)
  || (MEAL_ORDER[a.meal_type] ?? 4) - (MEAL_ORDER[b.meal_type] ?? 4) || a.id.localeCompare(b.id);

/** Why a meal cannot be counted, or null when it can. */
function uncountable(meal: MenuMealInput): MenuUncomputable['reason'] | null {
  if (!meal.recipe?.ingredients?.length) return meal.recipe_unavailable ? 'RECIPE_UNAVAILABLE' : 'NO_RECIPE';
  return Number(meal.servings ?? meal.recipe.servings) > 0 && Number(meal.recipe.servings) > 0 ? null : 'NO_SERVINGS';
}

/** What one meal lacks of one ingredient, keyed by product (or name) and dimension. */
function gapNeed(meal: MenuMealInput, ingredient: StockIngredient, gap: StockMissing, verify: QualifiedLot[]): MenuNeed {
  const doubtful = [...new Set(verify.filter(lot => sameIngredient(ingredient, lot)).map(lot => lot.product_name))];
  const dimension = describeUnit(gap.unit)?.dimension;
  const status: MenuNeedStatus = !needsPurchase(gap) || doubtful.length ? 'verify' : canAddToShoppingList(gap) && dimension ? 'to_buy' : 'manual';
  const identity = ingredient.inventory_product_id || normalizeIngredientName(gap.ingredient_name);
  const key = `${status}|${identity}|${status === 'to_buy' ? dimension : normalizeIngredientName(gap.unit ?? '')}`;
  const entry: MenuNeedMeal = { id: meal.id, date: meal.date, meal_type: meal.meal_type, recipe_name: meal.recipe_name, quantity: gap.quantity, unit: gap.unit };
  return { key, status, name: gap.ingredient_name, product_id: ingredient.inventory_product_id ?? null, quantity: gap.quantity, unit: gap.unit,
    meals: [entry], ...(doubtful.length ? { verify_lots: doubtful } : {}) };
}

/** Two needs of one key add up, in the unit of the first one met. */
function mergeNeed(known: MenuNeed | undefined, next: MenuNeed): MenuNeed {
  if (!known) return next;
  const added = known.quantity == null || next.quantity == null ? null : inUnit(next.quantity, next.unit, known.unit);
  const verifyLots = [...new Set([...(known.verify_lots ?? []), ...(next.verify_lots ?? [])])];
  return { ...known, quantity: added == null ? null : round9((known.quantity ?? 0) + added), meals: [...known.meals, ...next.meals],
    ...(verifyLots.length ? { verify_lots: verifyLots } : {}) };
}

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
  for (const meal of [...meals].sort(chronological)) {
    const reason = uncountable(meal);
    const recipe = meal.recipe;
    if (reason || !recipe) {
      // A meal without recipe reserves nothing; one whose stock could not be reserved is named.
      const why = reason ?? 'NO_RECIPE';
      if (meal.role === 'target' || why !== 'NO_RECIPE') {
        uncomputable.push({ id: meal.id, date: meal.date, meal_type: meal.meal_type, recipe_name: meal.recipe_name, role: meal.role, reason: why });
      }
      continue;
    }
    const { eligible, verify } = qualifyLotsOn(lots.map(lot => ({ ...lot, quantity: remaining.get(lot.id) ?? 0 })), meal.date);
    const result = allocateRecipeStock(recipe.ingredients, eligible, recipe.servings, Number(meal.servings ?? recipe.servings), { reservePartial: true });
    for (const taken of result.allocations) {
      remaining.set(taken.inventory_id, Math.max(0, round9((remaining.get(taken.inventory_id) ?? 0) - taken.quantity)));
    }
    if (meal.role !== 'target') continue;
    for (const gap of result.missing) {
      const next = gapNeed(meal, recipe.ingredients[gap.ingredient_index], gap, verify);
      needs.set(next.key, mergeNeed(needs.get(next.key), next));
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
/** The amount the list is compared with: only a measurable need to buy has one. */
const amountToBuy = (need: MenuNeed): number | null => (need.status === 'to_buy' ? need.quantity : null);
/** 1: the need's product or its very name; 2: a longer name (« tomate » for « tomate cerise »); 0: another product. */
const matchStrength = (need: MenuNeed, row: MenuShoppingRow): 0 | 1 | 2 =>
  need.product_id && row.product_id === need.product_id ? 1 : ingredientMatchRank(need.name, row.product_name);
/** D16: a row an add may top up: unchecked, of the need's product (or its very name), in a convertible unit. */
const canTopUp = (need: MenuNeed, row: MenuShoppingRow) => !row.is_purchased && inUnit(1, row.unit, need.unit) != null
  && (need.product_id ? row.product_id === need.product_id : ingredientMatchRank(need.name, row.product_name) === 1);

interface Coverage { listed: number; purchased: number }

/**
 * What the list covers of each need, each row counted once: the closest matches take first, then
 * the longer names; unchecked rows before bought ones awaiting storage, the oldest first.
 * Returns the coverage of each need and what each row has left, in its unit.
 */
function coverNeeds(needs: MenuNeed[], rows: MenuShoppingRow[]) {
  const left = new Map(rows.map(row => [row.id, Number(row.quantity)]));
  const covered = new Map<string, Coverage>();
  const order = [...rows].sort((a, b) => Number(a.is_purchased) - Number(b.is_purchased) || byAge(a, b));
  for (const pass of [1, 2] as const) {
    for (const need of needs) {
      const quantity = amountToBuy(need);
      if (quantity == null) continue;
      let got = covered.get(need.key) ?? { listed: 0, purchased: 0 };
      for (const row of order.filter(item => matchStrength(need, item) === pass)) {
        const wanted = inUnit(round9(quantity - got.listed - got.purchased), need.unit, row.unit);
        const available = left.get(row.id) ?? 0;
        if (wanted == null || wanted <= EPSILON || available <= EPSILON) continue;
        const taken = Math.min(available, wanted);
        left.set(row.id, round9(available - taken));
        const amount = inUnit(taken, row.unit, need.unit) ?? 0;
        got = row.is_purchased ? { ...got, purchased: round9(got.purchased + amount) } : { ...got, listed: round9(got.listed + amount) };
      }
      covered.set(need.key, got);
    }
  }
  return { left, covered };
}

/** The line of one need: covered by the list, or what remains to add on the oldest row of the product. */
function needLine(need: MenuNeed, rows: MenuShoppingRow[], coverage: Coverage | undefined): MenuShoppingLine {
  const base = { key: need.key, name: need.name, product_id: need.product_id, unit: need.unit, meals: need.meals, ...(need.verify_lots ? { verify_lots: need.verify_lots } : {}) };
  const quantity = amountToBuy(need);
  if (quantity == null) return { ...base, state: need.status === 'to_buy' ? 'manual' : need.status, quantity: need.quantity };
  const { listed, purchased } = coverage ?? { listed: 0, purchased: 0 };
  const amounts = { listed_quantity: listed, purchased_quantity: purchased };
  const missing = round9(quantity - listed - purchased);
  if (missing <= EPSILON) return { ...base, ...amounts, state: listed >= quantity - EPSILON ? 'listed' : 'purchased_pending', quantity };
  const target = rows.filter(row => canTopUp(need, row)).sort(byAge)[0];
  return { ...base, ...amounts, state: 'to_add', quantity: missing, product_id: need.product_id ?? target?.product_id ?? null,
    ...(target ? { target: { id: target.id, expected_version: Number(target.stock_version) } } : {}) };
}

/**
 * One add per row topped up: a recipe linked to the product and another naming it would otherwise
 * both target the row at the same version, and the second add of the confirmation would conflict.
 */
function mergeTargets(lines: MenuShoppingLine[]): MenuShoppingLine[] {
  return lines.reduce<MenuShoppingLine[]>((merged, line) => {
    const at = line.target ? merged.findIndex(item => item.target?.id === line.target?.id) : -1;
    const first = at < 0 ? undefined : merged[at];
    const quantity = first ? inUnit(line.quantity ?? 0, line.unit, first.unit) : null;
    if (!first || quantity == null) return [...merged, line];
    const plus = (known = 0, extra = 0) => round9(known + (inUnit(extra, line.unit, first.unit) ?? 0));
    const combined: MenuShoppingLine = { ...first, quantity: round9((first.quantity ?? 0) + quantity), meals: [...first.meals, ...line.meals],
      listed_quantity: plus(first.listed_quantity, line.listed_quantity), purchased_quantity: plus(first.purchased_quantity, line.purchased_quantity) };
    return merged.map((item, index) => (index === at ? combined : item));
  }, []);
}

/** The menu's share of each row this week (the sum of its contributions) and its last contribution. */
function menuShares(contributions: MenuContribution[]) {
  const shares = new Map<string, { total: number; last: MenuContribution }>();
  for (const item of [...contributions].sort((a, b) => a.id - b.id)) {
    shares.set(item.shopping_id, { total: round9((shares.get(item.shopping_id)?.total ?? 0) + Number(item.quantity)), last: item });
  }
  return shares;
}

/**
 * D2: what a row holds beyond the week's needs, within the menu's share, while nobody changed the
 * row since the menu's last write. A row a meal still names without an amount to compare stays.
 */
function excessLines(needs: MenuNeed[], rows: MenuShoppingRow[], contributions: MenuContribution[], left: Map<string, number>): MenuShoppingLine[] {
  const shares = menuShares(contributions);
  const held = (row: MenuShoppingRow) => needs.some(need => matchStrength(need, row) > 0 && (amountToBuy(need) == null || inUnit(1, row.unit, need.unit) == null));
  return [...rows].sort(byAge).flatMap((row): MenuShoppingLine[] => {
    const share = shares.get(row.id);
    if (!share || !row.unit || row.is_purchased || share.last.line_version_after !== Number(row.stock_version) || held(row)) return [];
    const excess = round9(Math.min(left.get(row.id) ?? 0, share.total, Number(row.quantity)));
    if (excess <= EPSILON) return [];
    return [{ key: `excess|${row.id}`, state: 'excess', name: row.product_name, product_id: row.product_id, quantity: excess, unit: row.unit, meals: [],
      reduction: { id: row.id, expected_version: Number(row.stock_version), quantity: excess, unit: row.unit } }];
  });
}

/**
 * The review's lines: the list covers the needs (each row once), the rest is to add; a row the menu
 * topped up beyond what the week needs is proposed back, within the menu's share (excess).
 */
export function menuShoppingLines(needs: MenuNeed[], rows: MenuShoppingRow[], contributions: MenuContribution[]): MenuShoppingLine[] {
  const { left, covered } = coverNeeds(needs, rows);
  return [...mergeTargets(needs.map(need => needLine(need, rows, covered.get(need.key)))), ...excessLines(needs, rows, contributions, left)];
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
