/**
 * PRP-226 PR2 — RecommendationEngine orchestrator.
 *
 * Loads the user's recipes + inventory, runs the deterministic
 * scorers (cookability / expiry / preference / time / novelty /
 * nutrition / effort), buckets the results into the legacy 3-bucket
 * shape (`cookable_now` / `almost_cookable` / `recent_suggestions`),
 * and surfaces explainable reasons.
 *
 * The engine NEVER calls an LLM. PRP-226 §0 locks "scoring source of
 * truth = serveur déterministe ; LLM explique seulement".
 *
 * Output shape is backward compatible : `RecommendedRecipeView`
 * extends `CookableRecipeView` so the existing assistant handler +
 * frontend (PRP-224 Sprint 2) keep working unchanged.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { RecipeSummaryView } from '../assistant/handlers/read.js';
import {
  missingPenaltyFromGap,
  scoreCookability,
  type CookabilityResult,
} from './CookabilityScorer.js';
import { scoreExpiry } from './ExpiryScorer.js';
import { scorePreference } from './PreferenceScorer.js';
import type {
  InventorySnapshot,
  RecipeWithIngredients,
  RecommendationContext,
  RecommendationResult,
  RecommendationScore,
  RecommendationScoreParts,
  RecommendedRecipeView,
  SuggestedRecipeAction,
} from './types.js';

// ---- Tuning constants ------------------------------------------------

const DEFAULT_ALMOST_THRESHOLD = 3;
const DEFAULT_LIMIT_PER_BUCKET = 6;
const DEFAULT_NEAR_EXPIRY_DAYS = 7;

/** Score formula (PRP §7.1) — sum to 100, missingPenalty subtracts up to 20. */
const WEIGHTS = {
  cookability: 40,
  expiryUrgency: 18,
  preferenceMatch: 14,
  timeFit: 10,
  novelty: 7,
  effortFit: 6,
  nutritionFit: 5,
  missingPenalty: 20,
} as const;

// ---- Public types ---------------------------------------------------

export interface RecommendationExecutionContext {
  userId: string;
  /** User-scoped Supabase client (RLS-bound for recipe + inventory reads). */
  userClient: SupabaseClient<any, any, any>;
  /** Optional admin client for engine-internal writes (events, cache) — wired in PR3. */
  serviceClient?: SupabaseClient<any, any, any>;
  /** Inject for deterministic tests. Defaults to `new Date()`. */
  now?: Date;
  conversationId?: string;
  assistantMessageId?: string;
}

// ---- Engine ----------------------------------------------------------

export class RecommendationEngine {
  /**
   * Main entry point used by `SuggestRecipesForContextHandler`. Loads
   * recipes + inventory in parallel, scores every candidate, and
   * returns the 3-bucket result.
   */
  async suggestForUser(
    ctx: RecommendationExecutionContext,
    input: RecommendationContext,
  ): Promise<RecommendationResult> {
    const limit = input.limitPerBucket ?? DEFAULT_LIMIT_PER_BUCKET;
    const almostThreshold = input.almostThreshold ?? DEFAULT_ALMOST_THRESHOLD;
    const nearExpiryDays = input.nearExpiryDays ?? DEFAULT_NEAR_EXPIRY_DAYS;
    const includeRecent = input.includeRecentFallback ?? true;
    const now = ctx.now ?? new Date();

    const [recipes, inventory] = await Promise.all([
      this.loadRecipes(ctx, input),
      this.loadInventory(ctx),
    ]);

    const cookableNow: RecommendedRecipeView[] = [];
    const almostCookable: RecommendedRecipeView[] = [];
    const recent: RecipeSummaryView[] = [];

    for (const recipe of recipes) {
      // Time limit is a HARD constraint — if the user said "20 min",
      // showing a 60-min recipe even in the fallback bucket is
      // misleading. We mirror the V0 handler behaviour and drop the
      // recipe entirely so neither `recent_suggestions` nor the
      // cookable buckets surface it.
      if (!fitsTimeLimit(recipe, input.timeLimitMinutes)) {
        continue;
      }

      // Always keep a "recent" view of every (time-eligible) recipe —
      // used for the fallback bucket. Deduped against the cookable
      // buckets below.
      recent.push(toRecipeSummary(recipe));

      const cookability = scoreCookability(recipe, inventory);
      // Recipes with zero essentials cannot land in the cookable
      // buckets (we don't know what to check) — they still feed
      // recent_suggestions via the loop above.
      if (cookability.total_essential === 0) continue;

      const expiry = scoreExpiry(recipe, inventory, { now, nearExpiryDays });
      const preference = scorePreference(recipe, { userId: ctx.userId });

      const parts: RecommendationScoreParts = {
        cookability: cookability.score,
        expiryUrgency: applyGoalBoost(expiry.score, input.goal, 'expiry'),
        preferenceMatch: preference.score,
        timeFit: scoreTimeFit(recipe, input),
        novelty: 0.5, // PR6 will populate from recipe_interactions.
        nutritionFit: 0.5, // PR6 will populate from products.nutrition_json.
        effortFit: scoreEffortFit(recipe),
        missingPenalty: missingPenaltyFromGap(cookability.combined_gap, almostThreshold),
      };

      const score = computeTotalScore(parts);
      const reasons = buildReasons({
        cookability,
        expiry,
        goal: input.goal,
        recipe,
      });

      const view: RecommendedRecipeView = {
        // CookableRecipeView fields :
        id: recipe.id,
        name: recipe.name,
        prep_time: recipe.prep_time,
        cook_time: recipe.cook_time,
        image_url: recipe.image_url,
        total_essential: cookability.total_essential,
        linked_essential: cookability.linked_essential,
        missing_count: cookability.missing_count,
        missing_ingredients: cookability.missing_ingredients,
        unlinked: cookability.unlinked,
        unlinked_count: cookability.unlinked_count,
        // RecommendedRecipeView additions :
        description: recipe.description,
        servings: recipe.servings,
        cuisine_category: recipe.cuisine_category,
        meal_type: recipe.meal_type,
        tags: recipe.tags,
        unknown_ingredients: cookability.unknown_ingredients,
        score_total: score.total,
        score_parts: score.parts,
        reasons,
        expiring_ingredients_used: expiry.expiring_ingredients,
        suggested_actions: suggestActions(cookability),
      };

      if (cookability.combined_gap === 0) {
        cookableNow.push(view);
      } else if (cookability.combined_gap <= almostThreshold) {
        almostCookable.push(view);
      }
    }

    // Sort cookable buckets by score desc, then alpha for determinism.
    const sortByScore = (a: RecommendedRecipeView, b: RecommendedRecipeView) => {
      if (a.score_total !== b.score_total) return b.score_total - a.score_total;
      return a.name.localeCompare(b.name);
    };
    cookableNow.sort(sortByScore);
    almostCookable.sort(sortByScore);

    // Dedupe recent vs cookable buckets and apply the limit.
    const seen = new Set<string>([
      ...cookableNow.map((r) => r.id),
      ...almostCookable.map((r) => r.id),
    ]);
    const recentDeduped = includeRecent ? recent.filter((r) => !seen.has(r.id)) : [];

    return {
      cookable_now: cookableNow.slice(0, limit),
      almost_cookable: almostCookable.slice(0, limit),
      recent_suggestions: recentDeduped.slice(0, limit),
      total_user_recipes: recent.length,
    };
  }

  // ---- Data loaders -------------------------------------------------

  private async loadRecipes(
    ctx: RecommendationExecutionContext,
    input: RecommendationContext,
  ): Promise<RecipeWithIngredients[]> {
    let q = ctx.userClient
      .from('recipes')
      .select(
        'id, name, description, prep_time, cook_time, servings, image_url, cuisine_category, meal_type, tags, created_at, recipe_ingredients(id, ingredient_name, quantity, unit, inventory_product_id, is_essential)'
      )
      .eq('user_id', ctx.userId)
      .order('created_at', { ascending: false });

    if (input.query?.trim()) {
      q = q.ilike('name', `%${input.query.trim()}%`);
    }
    if (input.mealType) {
      q = q.eq('meal_type', input.mealType);
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as RecipeWithIngredients[];
  }

  private async loadInventory(
    ctx: RecommendationExecutionContext,
  ): Promise<InventorySnapshot> {
    const { data, error } = await ctx.userClient
      .from('inventory')
      .select('product_id, quantity, expiry_date, products(name)')
      .eq('user_id', ctx.userId);
    if (error) throw error;

    const byProduct = new Map<
      string,
      { quantity: number; expiryDate: string | null; productName: string | null }
    >();
    for (const row of (data ?? []) as Array<{
      product_id: string;
      quantity: number;
      expiry_date: string | null;
      products?: { name?: string | null } | null;
    }>) {
      const prev = byProduct.get(row.product_id);
      const productName = row.products?.name ?? prev?.productName ?? null;
      const expiryDate = pickEarlierExpiry(prev?.expiryDate ?? null, row.expiry_date ?? null);
      byProduct.set(row.product_id, {
        quantity: (prev?.quantity ?? 0) + row.quantity,
        expiryDate,
        productName,
      });
    }
    return { byProduct };
  }
}

// ---- Helpers --------------------------------------------------------

function fitsTimeLimit(recipe: RecipeWithIngredients, limit?: number): boolean {
  if (!limit || limit <= 0) return true;
  const total = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);
  if (total === 0) return true; // unknown time = let it through, scorer penalises
  return total <= limit;
}

function scoreTimeFit(recipe: RecipeWithIngredients, input: RecommendationContext): number {
  const total = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);
  if (total === 0) {
    // No time info — neutral, with a small hint when caller set a limit
    // (we couldn't verify, raison "temps à vérifier" surfaces).
    return 0.5;
  }
  if (input.timeLimitMinutes && input.timeLimitMinutes > 0) {
    if (total <= input.timeLimitMinutes / 2) return 1;
    if (total <= input.timeLimitMinutes) return 0.8;
    return 0.2;
  }
  // No explicit limit → reward short recipes mildly.
  if (total <= 20) return 0.9;
  if (total <= 40) return 0.7;
  if (total <= 60) return 0.5;
  return 0.3;
}

function scoreEffortFit(recipe: RecipeWithIngredients): number {
  // Cheap heuristic : fewer essential ingredients = less effort.
  const ings = recipe.recipe_ingredients ?? [];
  const essentials = ings.filter((i) => i.is_essential !== false).length;
  if (essentials === 0) return 0.5;
  if (essentials <= 3) return 1;
  if (essentials <= 6) return 0.8;
  if (essentials <= 10) return 0.6;
  return 0.4;
}

function applyGoalBoost(
  raw: number,
  goal: RecommendationContext['goal'],
  axis: 'expiry',
): number {
  if (axis === 'expiry' && goal === 'anti_waste') {
    // Anti-waste users want expiry to dominate ranking.
    return Math.min(1, raw * 1.4);
  }
  return raw;
}

function computeTotalScore(parts: RecommendationScoreParts): RecommendationScore {
  const raw =
    parts.cookability * WEIGHTS.cookability +
    parts.expiryUrgency * WEIGHTS.expiryUrgency +
    parts.preferenceMatch * WEIGHTS.preferenceMatch +
    parts.timeFit * WEIGHTS.timeFit +
    parts.novelty * WEIGHTS.novelty +
    parts.effortFit * WEIGHTS.effortFit +
    parts.nutritionFit * WEIGHTS.nutritionFit -
    parts.missingPenalty * WEIGHTS.missingPenalty;

  const total = Math.max(0, Math.min(100, Math.round(raw)));
  return { total, parts };
}

function buildReasons(input: {
  cookability: CookabilityResult;
  expiry: { expiring_ingredients: { product_name: string; days_to_expiry: number }[] };
  goal: RecommendationContext['goal'];
  recipe: RecipeWithIngredients;
}): string[] {
  const reasons: string[] = [];
  if (input.cookability.combined_gap === 0) {
    reasons.push('Tu as tout en stock');
  } else if (input.cookability.missing_count > 0) {
    reasons.push(
      `${input.cookability.missing_count} ingrédient${
        input.cookability.missing_count > 1 ? 's' : ''
      } manquant${input.cookability.missing_count > 1 ? 's' : ''}`,
    );
  }
  if (input.cookability.unlinked_count > 0) {
    reasons.push(
      `${input.cookability.unlinked_count} ingrédient${
        input.cookability.unlinked_count > 1 ? 's' : ''
      } à vérifier`,
    );
  }
  if (input.expiry.expiring_ingredients.length > 0) {
    const first = input.expiry.expiring_ingredients[0];
    if (first.days_to_expiry <= 0) {
      reasons.push(`Utilise ${first.product_name} (à finir aujourd'hui)`);
    } else if (first.days_to_expiry <= 3) {
      reasons.push(
        `Utilise ${first.product_name} (J-${first.days_to_expiry})`,
      );
    } else {
      reasons.push(`Utilise ${first.product_name} bientôt`);
    }
  }
  const total = (input.recipe.prep_time ?? 0) + (input.recipe.cook_time ?? 0);
  if (total > 0 && total <= 20) {
    reasons.push(`Rapide (${total} min)`);
  }
  if (input.goal === 'anti_waste' && input.expiry.expiring_ingredients.length === 0) {
    // Honest signal — anti_waste asked but the engine didn't find expiry leverage.
    reasons.push('Aucun produit proche péremption — recette neutre côté anti-gaspi');
  }
  return reasons.slice(0, 4);
}

function suggestActions(c: CookabilityResult): SuggestedRecipeAction[] {
  const actions: SuggestedRecipeAction[] = ['open_recipe', 'plan_recipe', 'mark_cooked'];
  if (c.missing_count > 0) actions.splice(1, 0, 'add_missing_to_shopping');
  return actions;
}

function toRecipeSummary(r: RecipeWithIngredients): RecipeSummaryView {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    prep_time: r.prep_time,
    cook_time: r.cook_time,
    servings: r.servings,
    image_url: r.image_url,
    cuisine_category: r.cuisine_category,
    meal_type: r.meal_type,
    tags: r.tags,
  };
}

function pickEarlierExpiry(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() <= new Date(b).getTime() ? a : b;
}
