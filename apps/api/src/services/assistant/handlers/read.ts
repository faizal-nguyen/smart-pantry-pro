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
}

/**
 * One-shot recipe suggestion. Wraps the same data sources as
 * `find_cookable_recipes` + `read_recent_recipes` and returns a
 * structured 3-bucket response so the LLM never lands on "empty" with
 * nothing to propose. Saves one LLM round-trip vs chaining the two tools.
 */
export class SuggestRecipesForContextHandler
  implements ToolHandler<SuggestRecipesForContextArgs, SuggestRecipesResult>
{
  async execute(
    ctx: ToolExecutionContext,
    args: SuggestRecipesForContextArgs
  ): Promise<ToolExecutionResult<SuggestRecipesResult>> {
    const limit = args.limit_per_bucket ?? 6;
    const almostThreshold = args.almost_threshold ?? 3;
    const maxPrep = args.max_prep_time;
    const query = args.query?.trim();

    let recipesQuery = ctx.userClient
      .from('recipes')
      .select(
        'id, name, description, prep_time, cook_time, servings, image_url, cuisine_category, meal_type, tags, created_at, recipe_ingredients(id, ingredient_name, quantity, inventory_product_id, is_essential)'
      )
      .eq('user_id', ctx.userId)
      .order('created_at', { ascending: false });

    if (query) recipesQuery = recipesQuery.ilike('name', `%${query}%`);

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

    type RawWithMeta = RawRecipeWithIngs & {
      description: string | null;
      servings: number | null;
      cuisine_category: string | null;
      meal_type: string | null;
      tags: string[] | null;
      created_at: string;
    };

    const cookableNow: CookableRecipeView[] = [];
    const almostCookable: CookableRecipeView[] = [];
    const recent: RecipeSummaryView[] = [];

    for (const r of (recipesRes.data ?? []) as RawWithMeta[]) {
      if (maxPrep !== undefined && r.prep_time !== null && r.prep_time > maxPrep) {
        continue;
      }

      // Always keep a "recent" view of every recipe.
      recent.push({
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
      });

      const ings = r.recipe_ingredients ?? [];
      const essentials = ings.filter((i) => i.is_essential !== false);
      if (essentials.length === 0) continue; // can't bucket cookability without essentials

      const linked = essentials.filter((i) => i.inventory_product_id);
      const unlinkedCount = essentials.length - linked.length;

      const missing: string[] = [];
      for (const ing of linked) {
        const have = inventoryByProduct.get(ing.inventory_product_id!) ?? 0;
        if (have < ing.quantity) missing.push(ing.ingredient_name);
      }

      const view: CookableRecipeView = {
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
      };

      const score = missing.length + unlinkedCount;
      if (score === 0) cookableNow.push(view);
      else if (score <= almostThreshold) almostCookable.push(view);
    }

    // Sort the cookable buckets: lower score first, then alpha.
    const byScoreThenName = (a: CookableRecipeView, b: CookableRecipeView) => {
      const aScore = a.missing_count + a.unlinked_count;
      const bScore = b.missing_count + b.unlinked_count;
      if (aScore !== bScore) return aScore - bScore;
      return a.name.localeCompare(b.name);
    };
    cookableNow.sort(byScoreThenName);
    almostCookable.sort(byScoreThenName);

    // Dedupe recent against the two cookable buckets.
    const seen = new Set<string>([
      ...cookableNow.map((r) => r.id),
      ...almostCookable.map((r) => r.id),
    ]);
    const recentDeduped = recent.filter((r) => !seen.has(r.id));

    return {
      result: {
        cookable_now: cookableNow.slice(0, limit),
        almost_cookable: almostCookable.slice(0, limit),
        recent_suggestions: recentDeduped.slice(0, limit),
        total_user_recipes: recent.length,
      },
    };
  }
}

// ---- Convenience registration helper --------------------------------

import { ToolHandlerRegistry } from './types.js';

export function registerReadHandlers(registry: ToolHandlerRegistry): void {
  registry.register('read_inventory', new ReadInventoryHandler());
  registry.register('read_shopping_list', new ReadShoppingListHandler());
  registry.register('read_recent_recipes', new ReadRecentRecipesHandler());
  registry.register('read_meal_plan', new ReadMealPlanHandler());
  registry.register('search_recipes', new SearchRecipesHandler());
  registry.register('find_cookable_recipes', new FindCookableRecipesHandler());
  registry.register('suggest_recipes_for_context', new SuggestRecipesForContextHandler());
}
