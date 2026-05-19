/**
 * PRP-226 PR2 — ExpiryScorer.
 *
 * Pure functions that quantify "how urgent is it to cook this recipe
 * before the user's pantry goes to waste". Reads
 * `inventory.expiry_date` per linked ingredient and rolls them up
 * into a single 0..1 score.
 *
 * Rules (PRP §7.3) :
 *   - expired or today : strong bonus
 *   - 1-3 days         : main anti-waste bonus
 *   - 4-7 days         : small bonus
 *   - no expiry        : neutral
 *
 * No I/O. Tested by `__tests__/ExpiryScorer.test.ts`.
 */

import type {
  ExpiringIngredientHint,
  InventorySnapshot,
  RecipeWithIngredients,
} from './types.js';

const DEFAULT_NEAR_EXPIRY_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ExpiryResult {
  /** Continuous 0..1, summed across the recipe's expiring ingredients. */
  score: number;
  /** Sorted by days_to_expiry asc (most urgent first). */
  expiring_ingredients: ExpiringIngredientHint[];
}

/**
 * Days between `expiryIso` and `now`. Negative when already past.
 * Returns `null` when the row has no expiry_date.
 */
export function daysUntilExpiry(expiryIso: string | null, now: Date): number | null {
  if (!expiryIso) return null;
  const expiry = new Date(expiryIso);
  if (Number.isNaN(expiry.getTime())) return null;
  // Round to integer days, floor toward zero so "today" is 0.
  return Math.floor((expiry.getTime() - now.getTime()) / MS_PER_DAY);
}

/**
 * Per-ingredient bonus :
 *   - expired         (days <  0) : 1.0
 *   - today           (days == 0) : 1.0
 *   - 1-3 days        : 0.8
 *   - 4-7 days        : 0.4
 *   - > nearExpiryDays: 0
 *   - no expiry       : 0 (neutral)
 */
export function bonusForDays(days: number | null, nearExpiryDays: number): number {
  if (days === null) return 0;
  if (days <= 0) return 1;
  if (days <= 3) return 0.8;
  if (days <= Math.max(7, nearExpiryDays)) return 0.4;
  return 0;
}

/**
 * Aggregate expiry urgency across a recipe's essential linked
 * ingredients. Returns the max bonus (single most urgent product
 * dominates) + a small bump per additional near-expiry hit (caps at
 * +0.2 so a 5-ingredient recipe doesn't run away vs a 1-ingredient one).
 */
export function scoreExpiry(
  recipe: RecipeWithIngredients,
  inventory: InventorySnapshot,
  opts: { now: Date; nearExpiryDays?: number },
): ExpiryResult {
  const near = opts.nearExpiryDays ?? DEFAULT_NEAR_EXPIRY_DAYS;
  const ings = recipe.recipe_ingredients ?? [];
  const essentials = ings.filter((i) => i.is_essential !== false && i.inventory_product_id);

  const hits: ExpiringIngredientHint[] = [];
  let topBonus = 0;
  let extraHits = 0;

  for (const ing of essentials) {
    const inv = inventory.byProduct.get(ing.inventory_product_id!);
    if (!inv) continue;
    const days = daysUntilExpiry(inv.expiryDate, opts.now);
    if (days === null) continue;
    const bonus = bonusForDays(days, near);
    if (bonus > 0) {
      if (bonus > topBonus) topBonus = bonus;
      else extraHits += 1;
      if (days <= near) {
        hits.push({
          product_id: ing.inventory_product_id!,
          product_name: inv.productName ?? ing.ingredient_name,
          days_to_expiry: days,
        });
      }
    }
  }

  hits.sort((a, b) => a.days_to_expiry - b.days_to_expiry);
  const score = Math.min(1, topBonus + Math.min(0.2, extraHits * 0.05));
  return { score, expiring_ingredients: hits };
}
