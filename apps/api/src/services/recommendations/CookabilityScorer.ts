import { allocateRecipeStock, type StockLot } from '@smart/shared';
/**
 * PRP-226 PR2 — CookabilityScorer.
 *
 * Pure functions matching a recipe's essential ingredients against an
 * inventory snapshot. Reproduces the V0 behaviour from
 * `SuggestRecipesForContextHandler` (PRP-224 Sprint 2) with one
 * deliberate change: cookability is returned as a continuous score
 * `[0, 1]` instead of a binary so the engine can blend it with the
 * other parts of the composite formula.
 *
 * No I/O. Tested by `__tests__/CookabilityScorer.test.ts`.
 */

import type {
  InventorySnapshot,
  RecipeWithIngredients,
} from './types.js';

export interface CookabilityResult {
  /** Continuous 0..1 — 1 when nothing is missing nor unknown. */
  score: number;
  total_essential: number;
  linked_essential: number;
  missing_count: number;
  missing_ingredients: string[];
  unlinked: boolean;
  unlinked_count: number;
  unknown_ingredients: string[];
  /** Sum of `missing_count + unlinked_count`, the legacy "almost score". */
  combined_gap: number;
}

const NO_ESSENTIALS_SCORE = 0;

/**
 * Compute cookability for one recipe given the user's inventory.
 *
 * Rules :
 *   - `essentials.length === 0` → score 0 (recipe excluded from cookable
 *     bucket — same as V0).
 *   - `combined_gap === 0` → score 1 (fully cookable).
 *   - Otherwise → linear degradation : `1 - combined_gap / total_essential`
 *     clamped to `[0, 1]`. This keeps cookability monotonic with the
 *     amount of stuff the user already has.
 *   - Quantity comparison only applies when the linked product
 *     resolves; unit incompatibilities are treated as unknown (the
 *     ingredient is still essential but we cannot verify stock).
 */
export function scoreCookability(
  recipe: RecipeWithIngredients,
  inventory: InventorySnapshot,
  requestedServings?: number,
): CookabilityResult {
  const ings = recipe.recipe_ingredients ?? [];
  const essentials = ings.filter((i) => i.is_essential !== false);

  const empty: CookabilityResult = {
    score: NO_ESSENTIALS_SCORE,
    total_essential: 0,
    linked_essential: 0,
    missing_count: 0,
    missing_ingredients: [],
    unlinked: false,
    unlinked_count: 0,
    unknown_ingredients: [],
    combined_gap: 0,
  };
  if (essentials.length === 0) return empty;

  const lots: StockLot[] = inventory.lots ?? [...inventory.byProduct].map(([id,row]) => ({
    id, product_id: id, product_name: row.productName ?? '', quantity: row.quantity,
    unit: row.unit ?? null, stock_version: 0, expiry_date: row.expiryDate,
  }));
  const checked = allocateRecipeStock(ings,lots,recipe.servings ?? 4,requestedServings ?? recipe.servings ?? 4);
  const gaps = checked.missing.filter(item => item.is_essential);
  const unknown = gaps.filter(item => ['QUANTITY_UNKNOWN','UNIT_UNKNOWN','UNIT_INCOMPATIBLE'].includes(item.reason)
    || (item.reason === 'NOT_IN_STOCK' && !ings[item.ingredient_index].inventory_product_id));
  const missing = gaps.filter(item => !unknown.includes(item));
  return {
    score: Math.max(0, 1 - gaps.length / essentials.length),
    total_essential: essentials.length, linked_essential: essentials.length - unknown.length,
    missing_count: missing.length, missing_ingredients: missing.map(item => item.ingredient_name),
    unlinked: unknown.length > 0, unlinked_count: unknown.length,
    unknown_ingredients: unknown.map(item => item.ingredient_name), combined_gap: gaps.length,
  };
}

/**
 * Penalty for the missing/unknown gap, used by the composite formula
 * as a malus. Mirrors how the V0 handler treated "unknown unknowns".
 *
 * Returns `[0, 1]` :
 *   - 0 when nothing is missing,
 *   - linear up to 1 when the gap reaches the `almostThreshold`,
 *   - 1 beyond the threshold (caps the malus so a single recipe with
 *     many missing items doesn't dominate the negative side).
 */
export function missingPenaltyFromGap(combinedGap: number, almostThreshold: number): number {
  if (combinedGap <= 0) return 0;
  if (almostThreshold <= 0) return 1;
  return Math.min(1, combinedGap / almostThreshold);
}
