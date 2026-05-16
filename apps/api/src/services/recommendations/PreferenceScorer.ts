/**
 * PRP-226 PR2 — PreferenceScorer V1 stub.
 *
 * Returns a neutral preference score for every recipe. The real
 * implementation (PR6) will :
 *   - load `preference` / `negative_preference` / `cooking_style` /
 *     `diet_goal` / `recipe_feedback` from MemoryService ;
 *   - load `recipe_interactions` (dismissed / cooked / accepted) ;
 *   - apply substring matching on cuisine_category / tags / name ;
 *   - apply temporal decay so old feedback fades.
 *
 * Keeping the stub as a separate file means PR6 only touches this
 * module + 1 line in RecommendationEngine.
 */

import type { RecipeWithIngredients } from './types.js';

export interface PreferenceContext {
  userId: string;
  // PR6 will plumb memories + interactions here.
}

export interface PreferenceResult {
  /** [-1, 1] — negative when a recipe matches a negative preference. */
  score: number;
  /** Optional reasons to surface alongside the recipe. */
  reasons: string[];
}

export function scorePreference(
  _recipe: RecipeWithIngredients,
  _context: PreferenceContext,
): PreferenceResult {
  // PR6: actual scoring lands here.
  return { score: 0, reasons: [] };
}
