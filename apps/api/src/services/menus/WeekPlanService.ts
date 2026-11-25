/**
 * V11-01 E4a (D7) — a proposed week (PRP V11-01 §6): recipes for the empty slots asked for, read from
 * the recommendation engine without any write (no event writer: no event, no cache, no recipe counted
 * as shown). Stateless: identified by an imprint of its inputs and of the versions it read, valid
 * 30 minutes. The screen validates it as one update_menu; the assistant (V11-04) will call it as is.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  allocateMenuStock, menuSlotKey, WEEK_PROPOSAL_TTL_MINUTES, WeekProposalSchema,
  type MenuAllocation, type MenuMealInput, type ProposedMeal, type RecipeReference, type WeekProposal, type WeekProposalRequest, type WeekProposalSlot,
} from '@smart/shared';
import type { MemoryService } from '../assistant/MemoryService.js';
import { NutritionProfileService, ProfileError } from '../recommendations/NutritionProfileService.js';
import { StockCommandError } from '../stock/StockCommandService.js';
import { RecommendationEngine } from '../recommendations/RecommendationEngine.js';
import type { RecommendationContext, RecommendationResult, RecommendedRecipeView } from '../recommendations/types.js';
import { MenuShoppingService, proposedMealId } from './MenuShoppingService.js';
import { assertFreeSlots, imprint, readWeekMenu } from './weekMenu.js';

/** The engine's widest list: enough candidates for a week of one meal type. */
const CANDIDATES_PER_BUCKET = 20;
/** Servings when neither the request, the profile nor the recipe gives any. */
const DEFAULT_SERVINGS = 2;
const MINUTE_MS = 60_000;
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type Slot = { date: string; meal_type: MealType };
type EmptyCause = 'NO_COMPATIBLE_RECIPE' | 'POOL_EXHAUSTED';
type Placement = { kind: 'pick'; slot: Slot; recipe: RecommendedRecipeView } | { kind: 'empty'; cause: EmptyCause };

export interface WeekPlanOptions {
  engine?: RecommendationEngine;
  /** Read-only taste memory, as the recommendations route uses it. */
  memoryService?: MemoryService;
  now?: () => Date;
}

/** The engine's candidates in its order: cookable, almost, farther; never to verify nor excluded. */
const candidatesOf = (result: RecommendationResult | undefined) => result ? [...result.cookable_now, ...result.almost_cookable, ...result.recent_suggestions] : [];
/** Reasons the engine gave about stock are judged again for the week: a lot may be promised earlier. */
const aboutStock = (code: string) => code.startsWith('STOCK') || code === 'NEAR_DATE';
/** Days to the closest date among the lots a recipe uses; none: last. */
const nearDays = (recipe: RecommendedRecipeView) =>
  Math.min(...(recipe.expiring_ingredients_used ?? []).map(lot => lot.days_to_expiry), Number.POSITIVE_INFINITY);
const MEAL_ORDER: Record<MealType, number> = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };
const byMoment = (a: Slot, b: Slot) => a.date.localeCompare(b.date) || MEAL_ORDER[a.meal_type] - MEAL_ORDER[b.meal_type];

export class WeekPlanService {
  private readonly engine: RecommendationEngine;
  private readonly shopping: MenuShoppingService;
  private readonly now: () => Date;

  constructor(private readonly client: SupabaseClient, private readonly options: WeekPlanOptions = {}) {
    this.engine = options.engine ?? new RecommendationEngine();
    this.shopping = new MenuShoppingService(client);
    this.now = options.now ?? (() => new Date());
  }

  async propose(userId: string, request: WeekProposalRequest): Promise<WeekProposal> {
    const now = this.now();
    const slots = (request.slots as Slot[]).slice().sort(byMoment);
    const keep = (request.keep ?? []) as Array<ProposedMeal & Slot>;
    const [week, stock] = await Promise.all([readWeekMenu(this.client, userId, request.week_start), this.shopping.weekStock(userId, request.week_start)]);
    assertFreeSlots(week, stock.basis.as_of, [...slots, ...keep]);

    // Already on the week's menu, kept or set aside: never proposed.
    const left = new Set([...week.meals.flatMap(meal => meal.recipe_ids), ...keep.map(meal => String(meal.recipe.id)), ...(request.avoid ?? []).map(recipe => String(recipe.id))]);
    const types = [...new Set(slots.map(slot => slot.meal_type))];
    const results = new Map(await Promise.all(types.map(async type => [type, await this.suggest(userId, now, type, request, [...left])] as const)));
    // Results read on different profile versions (an edit during the reads): the oldest, so that the
    // validation errs towards PROFILE_CHANGED. Kept slots only (a recomputation): the profile itself.
    const profileVersion = results.size ? Math.min(...[...results.values()].map(item => Number(item.profile_version ?? 0)))
      : await this.profileVersion(userId);
    // Nothing left for a type once the week's own recipes are out: compatible recipes exist, all placed.
    const drained = new Set<MealType>();
    await Promise.all(types.filter(type => left.size && !candidatesOf(results.get(type)).length).map(async type => {
      if (candidatesOf(await this.suggest(userId, now, type, request, [], 1)).length) drained.add(type);
    }));

    const chosen = this.place(slots, results, left, drained);
    const kept = await this.shopping.resolveMeals(keep);
    const picks = [...chosen.values()].flatMap(placement => placement.kind === 'pick' ? [placement] : []);
    const proposed = await this.shopping.resolveMeals(picks.map(({ slot, recipe }) => ({
      date: slot.date, meal_type: slot.meal_type, recipe: recipe.reference, servings: this.servings(request, recipe),
    })) as ProposedMeal[]);
    // Saved, kept and proposed meals take their stock in the order of the week, each at its date.
    const allocation = allocateMenuStock([...stock.meals, ...kept, ...proposed], stock.lots);

    const proposalSlots: WeekProposalSlot[] = [
      ...keep.map((meal, index) => this.filled('kept', meal, kept[index], allocation, null, meal.recipe)),
      ...slots.map(slot => {
        const placement = chosen.get(menuSlotKey(slot));
        if (!placement || placement.kind === 'empty') {
          return { status: 'empty' as const, date: slot.date, meal_type: slot.meal_type, cause: placement?.kind === 'empty' ? placement.cause : 'NO_COMPATIBLE_RECIPE' as EmptyCause };
        }
        const meal = proposed.find(item => item.id === proposedMealId(slot))!;
        return this.filled('proposed', { ...slot, servings: Number(meal.servings) }, meal, allocation, placement.recipe);
      }),
    ].sort(byMoment);
    const versions = { menu_version: week.version, context_revision: stock.basis.context_revision, profile_version: profileVersion };
    // The same request in another order is the same proposal; what was placed is part of it.
    const identity = {
      request: { ...request, slots, keep: [...keep].sort(byMoment), avoid: [...(request.avoid ?? [])].map(recipe => `${recipe.id}|${recipe.source}`).sort(),
        constraints: request.constraints ? { ...request.constraints, excludedIngredients: [...(request.constraints.excludedIngredients ?? [])].sort() } : null },
      ...versions, as_of: stock.basis.as_of,
      placed: proposalSlots.map(item => [menuSlotKey(item), item.status === 'empty' ? item.cause : `${item.recipe.reference.id}|${item.recipe.servings}`]),
    };
    const proposal: WeekProposal = {
      proposal_id: imprint(identity), week_start: request.week_start,
      calculated_at: now.toISOString(), expires_at: new Date(now.getTime() + WEEK_PROPOSAL_TTL_MINUTES * MINUTE_MS).toISOString(),
      ...versions, slots: proposalSlots,
    };
    // What leaves the API is what the screen (and the assistant) accept.
    return WeekProposalSchema.parse(proposal);
  }

  private async profileVersion(userId: string): Promise<number> {
    try { return (await new NutritionProfileService(this.client).read(userId)).profile.version; }
    catch (error) {
      if (error instanceof ProfileError) throw new StockCommandError(error.code === 'MIGRATION_REQUIRED' ? 'MIGRATION_REQUIRED' : 'PROFILE_UNAVAILABLE', 503);
      throw error;
    }
  }

  /** One read of the engine for a meal type, without writer: nothing is recorded. */
  private suggest(userId: string, now: Date, mealType: MealType, request: WeekProposalRequest, left: string[], limit = CANDIDATES_PER_BUCKET): Promise<RecommendationResult> {
    const constraints = request.constraints ?? {};
    const input: RecommendationContext = {
      mealType, servings: request.servings, limitPerBucket: limit, includeRecentFallback: true,
      timeLimitMinutes: constraints.timeLimitMinutes, excludedIngredients: constraints.excludedIngredients,
      dietaryFlag: constraints.dietaryFlag, goal: constraints.goal, excludeRecipeIds: left,
    };
    return this.engine.suggestForUser({ userId, userClient: this.client, now, memoryService: this.options.memoryService }, input);
  }

  /**
   * Meal types in the order of their first slot; for each, the first distinct candidates in the
   * engine's order (cookable, almost, farther; never to verify nor excluded), not yet placed; then
   * those using a lot close to its date go to the earliest slots of that type.
   */
  private place(slots: Slot[], results: Map<MealType, RecommendationResult>, left: Set<string>, drained: Set<MealType>) {
    const used = new Set(left);
    const chosen = new Map<string, Placement>();
    for (const type of [...new Set(slots.map(slot => slot.meal_type))]) {
      const own = slots.filter(slot => slot.meal_type === type).sort(byMoment);
      const result = results.get(type);
      const candidates = candidatesOf(result);
      const picks: RecommendedRecipeView[] = [];
      for (const candidate of candidates) {
        const id = String(candidate.reference?.id ?? candidate.id);
        if (picks.length === own.length) break;
        if (used.has(id)) continue;
        used.add(id);
        picks.push(candidate);
      }
      picks.sort((a, b) => nearDays(a) - nearDays(b));
      own.forEach((slot, index) => chosen.set(menuSlotKey(slot), picks[index]
        ? { kind: 'pick', slot, recipe: picks[index] } : { kind: 'empty', cause: candidates.length || drained.has(type) ? 'POOL_EXHAUSTED' : 'NO_COMPATIBLE_RECIPE' }));
    }
    return chosen;
  }

  private servings(request: WeekProposalRequest, recipe: RecommendedRecipeView): number {
    return Math.min(100, Math.max(1, Math.round(request.servings ?? recipe.servings ?? DEFAULT_SERVINGS)));
  }

  /** A filled slot: its recipe, the engine's reasons not about stock, and what the week leaves it to buy or check. */
  private filled(status: 'proposed' | 'kept', slot: Slot & { servings: number }, meal: MenuMealInput, allocation: MenuAllocation,
    recipe: RecommendedRecipeView | null, requested?: RecipeReference): WeekProposalSlot {
    const missing = allocation.needs.flatMap(need => need.meals.filter(item => item.id === meal.id)
      .map(item => ({ name: need.name, quantity: item.quantity, unit: item.unit, status: need.status })));
    const unknown = allocation.uncomputable.some(item => item.id === meal.id);
    const availability = missing.some(item => item.status === 'to_buy') ? 'to_buy' as const
      : missing.length || unknown ? 'to_check' as const : 'in_stock' as const;
    // The engine's reference, else the resolved recipe's, else (a kept recipe gone since) the one given.
    const reference = recipe?.reference ?? (meal.recipe ? { id: meal.recipe.id, source: meal.recipe.source } : requested);
    return {
      status, date: slot.date, meal_type: slot.meal_type,
      recipe: {
        reference: { id: String(reference?.id ?? ''), source: reference?.source ?? 'auto' },
        name: recipe?.name ?? meal.recipe_name, image_url: recipe?.image_url ?? null,
        duration_minutes: recipe?.duration_minutes ?? null, servings: slot.servings,
      },
      reasons: (recipe?.reason_codes ?? []).filter(reason => !aboutStock(reason.code)).map(reason => reason.text),
      availability, missing,
    };
  }
}
