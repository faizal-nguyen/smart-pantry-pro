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

  const linked = essentials.filter((i) => i.inventory_product_id);
  const unlinkedCount = essentials.length - linked.length;
  const unknownIngredients = essentials
    .filter((i) => !i.inventory_product_id)
    .map((i) => i.ingredient_name);

  const missing: string[] = [];
  for (const ing of linked) {
    const have = inventory.byProduct.get(ing.inventory_product_id!)?.quantity ?? 0;
    if (have < ing.quantity) {
      missing.push(ing.ingredient_name);
    }
  }

  const combinedGap = missing.length + unlinkedCount;
  const score =
    combinedGap === 0 ? 1 : Math.max(0, 1 - combinedGap / essentials.length);

  return {
    score,
    total_essential: essentials.length,
    linked_essential: linked.length,
    missing_count: missing.length,
    missing_ingredients: missing,
    unlinked: unlinkedCount > 0,
    unlinked_count: unlinkedCount,
    unknown_ingredients: unknownIngredients,
    combined_gap: combinedGap,
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
