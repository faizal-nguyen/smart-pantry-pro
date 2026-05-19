/**
 * PRP-221 J5a — Read tool handlers.
 *
 * Six handlers, all RLS-bound via the user-scoped Supabase client.
 * They never mutate state, so no `reversibleAction` is returned.
 *
 * The shapes returned to the LLM are flat and human-readable :
 * `name`, `category`, `unit`, `quantity` etc. live on the row even
 * when the underlying SQL has them via JOIN on `products`. This
 * matters because the LLM prompts handle the *result* of read tools
 * as user context — flat shapes survive truncation better than
 * nested.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  ToolHandler,
  ToolExecutionContext,
  ToolExecutionResult,
} from './types.js';
import type {
  ReadInventoryArgs,
  ReadShoppingListArgs,
  ReadRecentRecipesArgs,
  ReadMealPlanArgs,
  FindCookableArgs,
  SearchRecipesArgs,
  FindRecipesUsingIngredientArgs,
  SuggestRecipesForContextArgs,
} from '../schemas/tools.js';

// ---- Flat output shapes ---------------------------------------------

export interface InventoryItemView {
  id: string;
  product_id: string;
  product_name: string;
  category: string;
  unit_type: string;
  image_url: string | null;
  quantity: number;
  expiry_date: string | null;
  location: string | null;
  /** Days until expiry (negative if past). null when expiry_date is null. */
  days_to_expiry: number | null;
}

export interface ShoppingItemView {
  id: string;
  product_id: string;
  product_name: string;
  category: string;
  unit_type: string;
  quantity: number;
  is_purchased: boolean;
  priority: number | null;
  estimated_price: number | null;
  store_section: string | null;
}

export interface RecipeSummaryView {
  id: string;
  name: string;
  description: string | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  image_url: string | null;
  cuisine_category: string | null;
  meal_type: string | null;
  tags: string[] | null;
}

export interface MealPlanEntryView {
  id: string;
  week_start_date: string;
  day_of_week: number;
  meal_type: string;
  recipe_id: string | null;
  recipe_name: string | null;
  servings: number | null;
}

export interface CookableRecipeView {
  id: string;
  name: string;
  prep_time: number | null;
  cook_time: number | null;
  image_url: string | null;
  total_essential: number;
  /** Essentials currently linked to inventory_product_id. */
  linked_essential: number;
  /** Essentials we know we lack (in linked subset only). */
  missing_count: number;
  missing_ingredients: string[];
  /**
   * True when at least one essential ingredient is unlinked
   * (`inventory_product_id IS NULL`). Cookability is a best-effort estimate.
   */
  unlinked: boolean;
  /** Count of essentials whose inventory link is missing. */
  unlinked_count: number;
}

// ---- helpers ---------------------------------------------------------

function daysToExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const exp = new Date(expiryDate);
  if (Number.isNaN(exp.getTime())) return null;
  const now = new Date();
  const ms = exp.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

interface RawProduct {
  id?: string;
  name?: string;
  category?: string | null;
  unit_type?: string | null;
  image_url?: string | null;
}

interface RawInventoryRow {
  id: string;
  product_id: string;
  quantity: number;
  expiry_date: string | null;
  location: string | null;
  products: RawProduct | RawProduct[] | null;
}

function flattenProduct(p: RawProduct | RawProduct[] | null | undefined): RawProduct {
  if (!p) return {};
  return Array.isArray(p) ? (p[0] ?? {}) : p;
}

// ---- handlers --------------------------------------------------------

export class ReadInventoryHandler implements ToolHandler<ReadInventoryArgs, { items: InventoryItemView[] }> {
  async execute(
    ctx: ToolExecutionContext,
    args: ReadInventoryArgs
  ): Promise<ToolExecutionResult<{ items: InventoryItemView[] }>> {
    let q = ctx.userClient
      .from('inventory')
      .select(
        'id, product_id, quantity, expiry_date, location, products(id, name, category, unit_type, image_url)'
      )
      .eq('user_id', ctx.userId);

    if (args.category) q = q.eq('products.category', args.category);
    if (args.search) q = q.ilike('products.name', `%${args.search}%`);

    const { data, error } = await q.order('updated_at', { ascending: false }).limit(200);
    if (error) throw error;

    const rows = ((data ?? []) as RawInventoryRow[])
      .map((row) => {
        const p = flattenProduct(row.products);
        // PostgREST returns NULL on the joined product when the filter
        // (category / search) excluded it. We drop those rows here so
        // the LLM doesn't see partials.
        if (!p.id) return null;
        return {
          id: row.id,
          product_id: row.product_id,
          product_name: p.name ?? '',
          category: p.category ?? '',
          unit_type: p.unit_type ?? '',
          image_url: p.image_url ?? null,
          quantity: row.quantity,
          expiry_date: row.expiry_date,
          location: row.location,
          days_to_expiry: daysToExpiry(row.expiry_date),
        } satisfies InventoryItemView;
      })
      .filter((x): x is InventoryItemView => x !== null);

    const filtered =
      args.near_expiry_days !== undefined
        ? rows.filter(
            (r) =>
              r.days_to_expiry !== null &&
              r.days_to_expiry >= 0 &&
              r.days_to_expiry <= args.near_expiry_days!
          )
        : rows;

    return { result: { items: filtered } };
  }
}

interface RawShoppingRow {
  id: string;
  product_id: string;
  quantity: number;
  is_purchased: boolean;
  priority: number | null;
  estimated_price: number | null;
  store_section: string | null;
  products: RawProduct | RawProduct[] | null;
}

export class ReadShoppingListHandler
  implements ToolHandler<ReadShoppingListArgs, { items: ShoppingItemView[] }>
{
  async execute(
    ctx: ToolExecutionContext,
    args: ReadShoppingListArgs
  ): Promise<ToolExecutionResult<{ items: ShoppingItemView[] }>> {
    let q = ctx.userClient
      .from('shopping_list')
      .select(
        'id, product_id, quantity, is_purchased, priority, estimated_price, store_section, products(id, name, category, unit_type)'
      )
      .eq('user_id', ctx.userId);

    if (args.purchased !== undefined) q = q.eq('is_purchased', args.purchased);

    const { data, error } = await q
      .order('priority', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;

    const items = ((data ?? []) as RawShoppingRow[]).map((row) => {
      const p = flattenProduct(row.products);
      return {
        id: row.id,
        product_id: row.product_id,
        product_name: p.name ?? '',
        category: p.category ?? '',
        unit_type: p.unit_type ?? '',
        quantity: row.quantity,
        is_purchased: row.is_purchased,
        priority: row.priority,
        estimated_price: row.estimated_price,
        store_section: row.store_section,
      } satisfies ShoppingItemView;
    });

    return { result: { items } };
  }
}

interface RawRecipeRow {
  id: string;
  name: string;
  description: string | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  image_url: string | null;
  cuisine_category: string | null;
  meal_type: string | null;
  tags: string[] | null;
  created_at: string;
}

export class ReadRecentRecipesHandler
  implements ToolHandler<ReadRecentRecipesArgs, { recipes: RecipeSummaryView[] }>
{
  async execute(
    ctx: ToolExecutionContext,
    args: ReadRecentRecipesArgs
  ): Promise<ToolExecutionResult<{ recipes: RecipeSummaryView[] }>> {
    const limit = args.limit ?? 10;
    let q = ctx.userClient
      .from('recipes')
      .select(
        'id, name, description, prep_time, cook_time, servings, image_url, cuisine_category, meal_type, tags, created_at'
      )
      .eq('user_id', ctx.userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (args.search) q = q.ilike('name', `%${args.search}%`);

    const { data, error } = await q;
    if (error) throw error;

    const recipes = ((data ?? []) as RawRecipeRow[]).map((r) => ({
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
    }));

    return { result: { recipes } };
  }
}

export class SearchRecipesHandler
  implements ToolHandler<SearchRecipesArgs, { recipes: RecipeSummaryView[] }>
{
  async execute(
    ctx: ToolExecutionContext,
    args: SearchRecipesArgs
  ): Promise<ToolExecutionResult<{ recipes: RecipeSummaryView[] }>> {
    const limit = args.limit ?? 10;
    const safe = args.query.replace(/[%_]/g, '\\$&'); // escape ILIKE wildcards
    const { data, error } = await ctx.userClient
      .from('recipes')
      .select(
        'id, name, description, prep_time, cook_time, servings, image_url, cuisine_category, meal_type, tags'
      )
      .eq('user_id', ctx.userId)
      .ilike('name', `%${safe}%`)
      .limit(limit);
    if (error) throw error;
    return { result: { recipes: (data ?? []) as RecipeSummaryView[] } };
  }
}

export interface RecipeUsingIngredientView extends RecipeSummaryView {
  /** The literal recipe_ingredients.ingredient_name row that matched. */
  matched_ingredient: string;
}

export class FindRecipesUsingIngredientHandler
  implements ToolHandler<FindRecipesUsingIngredientArgs, { recipes: RecipeUsingIngredientView[] }>
{
  async execute(
    ctx: ToolExecutionContext,
    args: FindRecipesUsingIngredientArgs
  ): Promise<ToolExecutionResult<{ recipes: RecipeUsingIngredientView[] }>> {
    const limit = args.limit ?? 12;
    const safe = args.ingredient.replace(/[%_]/g, '\\$&');

    // Join recipe_ingredients → recipes (inner) so RLS on recipes
    // scopes the result to the calling user. We grab a few extra rows
    // to dedupe later — same recipe can match via multiple ingredients.
    const fetchTarget = Math.min(limit * 4, 200);
    const { data, error } = await ctx.userClient
      .from('recipe_ingredients')
      .select(
        'ingredient_name, recipes!inner(id, name, description, prep_time, cook_time, servings, image_url, cuisine_category, meal_type, tags, user_id)',
      )
      .ilike('ingredient_name', `%${safe}%`)
      .limit(fetchTarget);
    if (error) throw error;

    const seen = new Map<string, RecipeUsingIngredientView>();
    for (const row of (data ?? []) as unknown as Array<{
      ingredient_name: string;
      recipes: {
        id: string;
        name: string;
        description: string | null;
        prep_time: number | null;
        cook_time: number | null;
        servings: number | null;
        image_url: string | null;
        cuisine_category: string | null;
        meal_type: string | null;
        tags: string[] | null;
        user_id: string;
      };
    }>) {
      const r = row.recipes;
      if (!r || r.user_id !== ctx.userId) continue;
      if (seen.has(r.id)) continue;
      seen.set(r.id, {
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
        matched_ingredient: row.ingredient_name,
      });
      if (seen.size >= limit) break;
    }

    return { result: { recipes: Array.from(seen.values()) } };
  }
}

interface RawMealPlanEntry {
  id: string;
  day_of_week: number;
  meal_type: string;
  recipe_id: string | null;
  recipe_name: string | null;
  servings: number | null;
}
interface RawWeeklyMealPlan {
  id: string;
  user_id: string;
  week_start_date: string;
  meal_plan_entries: RawMealPlanEntry[] | null;
}

export class ReadMealPlanHandler
  implements ToolHandler<ReadMealPlanArgs, { entries: MealPlanEntryView[] }>
{
  async execute(
    ctx: ToolExecutionContext,
    args: ReadMealPlanArgs
  ): Promise<ToolExecutionResult<{ entries: MealPlanEntryView[] }>> {
    const { data, error } = await ctx.userClient
      .from('weekly_meal_plans')
      .select('id, user_id, week_start_date, meal_plan_entries(id, day_of_week, meal_type, recipe_id, recipe_name, servings)')
      .eq('user_id', ctx.userId)
      .eq('week_start_date', args.week_start)
      .maybeSingle();
    if (error) {
      // weekly_meal_plans may not exist in some envs (cf. types.augmented).
      // Surface as empty rather than failing the whole agent turn.
      return { result: { entries: [] } };
    }

    const plan = data as RawWeeklyMealPlan | null;
    const rawEntries = plan?.meal_plan_entries ?? [];
    const entries = rawEntries.map((e) => ({
      id: e.id,
      week_start_date: plan!.week_start_date,
      day_of_week: e.day_of_week,
      meal_type: e.meal_type,
      recipe_id: e.recipe_id,
      recipe_name: e.recipe_name,
      servings: e.servings,
    } satisfies MealPlanEntryView));

    return { result: { entries } };
  }
}

interface RawRecipeWithIngs {
  id: string;
  name: string;
  prep_time: number | null;
  cook_time: number | null;
  image_url: string | null;
  recipe_ingredients: Array<{
    id: string;
    ingredient_name: string;
    quantity: number;
    inventory_product_id: string | null;
    is_essential: boolean | null;
  }> | null;
}

interface InventorySnapshotRow {
  product_id: string;
  quantity: number;
}

/**
 * Match recipes against the user's inventory. Two evolutions vs PRP-221 §5.1:
 *
 *  - Default `max_missing_ingredients` is 3 (was 0). Hard-zero defaulted to
 *    "user has every single ingredient at the right quantity" which almost
 *    never happens in practice, so the LLM saw `recipes: []` and refused
 *    to propose anything.
 *  - Recipes with unlinked essentials (`inventory_product_id IS NULL`) are
 *    no longer silently dropped — they are returned with `unlinked: true`
 *    and `unlinked_count`. Cookability becomes a best-effort estimate
 *    rather than a binary, and the LLM/UI can mark them as approximate.
 *    Most user-imported recipes (URL/OCR) ship without product linkage,
 *    so the strict path was excluding them en masse.
 */
export class FindCookableRecipesHandler
  implements ToolHandler<FindCookableArgs, { recipes: CookableRecipeView[] }>
{
  async execute(
    ctx: ToolExecutionContext,
    args: FindCookableArgs
  ): Promise<ToolExecutionResult<{ recipes: CookableRecipeView[] }>> {
    const maxMissing = args.max_missing_ingredients ?? 3;
    const maxPrep = args.max_prep_time;

    const recipesQuery = ctx.userClient
      .from('recipes')
      .select(
        'id, name, prep_time, cook_time, image_url, recipe_ingredients(id, ingredient_name, quantity, inventory_product_id, is_essential)'
      )
      .eq('user_id', ctx.userId);

    const [recipesRes, invRes] = await Promise.all([
      recipesQuery,
      ctx.userClient.from('inventory').select('product_id, quantity').eq('user_id', ctx.userId),
    ]);

    if (recipesRes.error) throw recipesRes.error;
    if (invRes.error) throw invRes.error;

    const inventory = (invRes.data ?? []) as InventorySnapshotRow[];
    const inventoryByProduct = new Map<string, number>();
    for (const inv of inventory) {
      inventoryByProduct.set(inv.product_id, (inventoryByProduct.get(inv.product_id) ?? 0) + inv.quantity);
    }

    const out: CookableRecipeView[] = [];

    for (const r of (recipesRes.data ?? []) as RawRecipeWithIngs[]) {
      if (maxPrep !== undefined && r.prep_time !== null && r.prep_time > maxPrep) {
        continue;
      }

      const ings = r.recipe_ingredients ?? [];
      const essentials = ings.filter((i) => i.is_essential !== false);
      if (essentials.length === 0) continue;

      const linked = essentials.filter((i) => i.inventory_product_id);
      const unlinkedCount = essentials.length - linked.length;

      const missing: string[] = [];
      for (const ing of linked) {
        const have = inventoryByProduct.get(ing.inventory_product_id!) ?? 0;
        if (have < ing.quantity) missing.push(ing.ingredient_name);
      }

      // Effective missing = known-missing (linked subset) + unknowns we
      // cannot verify. Treats "unlinked" as "we don't know if you have it".
      const effectiveMissing = missing.length + unlinkedCount;
      if (effectiveMissing > maxMissing) continue;

      out.push({
        id: r.id,
        name: r.name,
        prep_time: r.prep_time,
        cook_time: r.cook_time,
        image_url: r.image_url,
        total_essential: essentials.length,
        linked_essential: linked.length,
        missing_count: missing.length,
        missing_ingredients: missing,
        unlinked: unlinkedCount > 0,
        unlinked_count: unlinkedCount,
      });
    }

    // Fully cookable first (no missing, no unknowns), then by missing count,
    // then alphabetical.
    out.sort((a, b) => {
      const aScore = a.missing_count + a.unlinked_count;
      const bScore = b.missing_count + b.unlinked_count;
      if (aScore !== bScore) return aScore - bScore;
      return a.name.localeCompare(b.name);
    });

    return { result: { recipes: out.slice(0, 20) } };
  }
}

// ---- Suggest recipes for context (3-bucket convenience tool) --------

export interface SuggestRecipesResult {
  /** Cookable now: missing_count + unlinked_count == 0. */
  cookable_now: CookableRecipeView[];
  /** Almost cookable: 1..almost_threshold missing or unknown. */
  almost_cookable: CookableRecipeView[];
  /** Recent recipes regardless of inventory match (deduped vs the two above). */
  recent_suggestions: RecipeSummaryView[];
  /** Total recipes the user has, useful for the LLM to phrase fallbacks. */
  total_user_recipes: number;
  /**
   * PRP-226 PR4 — id of the `recommendation_events` row this call
   * produced. The assistant persists it in
   * `assistant_messages.metadata.recipe_proposals.event_id` so each
   * frontend action (« j'ai cuisiné », « ajouter les manquants », …)
   * can attribute itself back to the originating recommendation.
   * Absent when the writer is not wired (legacy tests).
   */
  event_id?: string;
}

/**
 * One-shot recipe suggestion. Thin wrapper around the
 * `RecommendationEngine` (PRP-226 PR2) — the engine handles the SQL
 * queries, the scoring + bucketing, and the explainable reasons. This
 * handler just adapts the assistant tool args to a
 * `RecommendationContext` and adapts the engine result back to the
 * legacy `SuggestRecipesResult` shape so the frontend (PRP-224 Sprint
 * 2) keeps working unchanged.
 *
 * PRP-226 PR2 also accepts the new args (`meal_type`, `goal`,
 * `servings`) introduced by PR1. Score parts and reasons are returned
 * as additional fields on each recipe — backward compatible with
 * `CookableRecipeView`.
 */
import { RecommendationEngine } from '../../recommendations/RecommendationEngine.js';
import type {
  RecommendationContext,
  RecommendedRecipeView,
} from '../../recommendations/types.js';

export class SuggestRecipesForContextHandler
  implements ToolHandler<SuggestRecipesForContextArgs, SuggestRecipesResult>
{
  private readonly engine: RecommendationEngine;

  constructor(engine?: RecommendationEngine) {
    this.engine = engine ?? new RecommendationEngine();
  }

  async execute(
    ctx: ToolExecutionContext,
    args: SuggestRecipesForContextArgs
  ): Promise<ToolExecutionResult<SuggestRecipesResult>> {
    const recommendationContext: RecommendationContext = {
      query: args.query,
      mealType: args.meal_type,
      goal: args.goal,
      timeLimitMinutes: args.max_prep_time,
      servings: args.servings,
      almostThreshold: args.almost_threshold,
      limitPerBucket: args.limit_per_bucket,
      // PRP-226 PR4 — forward the raw transcript so it lands in
      // `recommendation_events.request_text`. Stripped from the JSONB
      // `context` by the writer (PR3 sanitiseContext).
      requestText: ctx.requestText,
    };

    // PRP-226 PR4 — prefer the shared engine + writer from the route
    // ctx so cache + audit run in production. Tests that don't inject
    // them fall back to the local engine and skip the audit log (PR2
    // behaviour preserved).
    const engine = ctx.recommendationEngine ?? this.engine;
    const result = await engine.suggestForUser(
      {
        userId: ctx.userId,
        userClient: ctx.userClient,
        eventWriter: ctx.eventWriter,
        memoryService: ctx.memoryService,
        conversationId: ctx.conversationId,
      },
      recommendationContext,
    );

    // The engine returns `RecommendedRecipeView` which extends
    // `CookableRecipeView` ; the legacy shape is satisfied
    // structurally so the cast is widening only.
    return {
      result: {
        cookable_now: result.cookable_now as unknown as CookableRecipeView[],
        almost_cookable: result.almost_cookable as unknown as CookableRecipeView[],
        recent_suggestions: result.recent_suggestions,
        total_user_recipes: result.total_user_recipes,
        event_id: result.event_id,
      },
    };
  }
}

// Re-export so callers depending on the engine's wider shape can opt
// into the score + reasons without breaking the legacy contract.
export type { RecommendedRecipeView };

// ---- Convenience registration helper --------------------------------

import { ToolHandlerRegistry } from './types.js';

export function registerReadHandlers(registry: ToolHandlerRegistry): void {
  registry.register('read_inventory', new ReadInventoryHandler());
  registry.register('read_shopping_list', new ReadShoppingListHandler());
  registry.register('read_recent_recipes', new ReadRecentRecipesHandler());
  registry.register('read_meal_plan', new ReadMealPlanHandler());
  registry.register('search_recipes', new SearchRecipesHandler());
  registry.register('find_recipes_using_ingredient', new FindRecipesUsingIngredientHandler());
  registry.register('find_cookable_recipes', new FindCookableRecipesHandler());
  registry.register('suggest_recipes_for_context', new SuggestRecipesForContextHandler());
}
