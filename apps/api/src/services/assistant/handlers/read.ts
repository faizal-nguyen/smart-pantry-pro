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
  missing_count: number;
  missing_ingredients: string[];
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
 * V1 strict (PRP-221 §5.1) : only recipes whose essential ingredients
 * all have `inventory_product_id IS NOT NULL` are eligible. Legacy
 * recipes with unlinked ingredients are silently excluded.
 */
export class FindCookableRecipesHandler
  implements ToolHandler<FindCookableArgs, { recipes: CookableRecipeView[] }>
{
  async execute(
    ctx: ToolExecutionContext,
    args: FindCookableArgs
  ): Promise<ToolExecutionResult<{ recipes: CookableRecipeView[] }>> {
    const maxMissing = args.max_missing_ingredients ?? 0;
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

      // V1 strict: drop recipes with any unlinked essential ingredient
      const hasUnlinked = essentials.some((i) => !i.inventory_product_id);
      if (hasUnlinked) continue;

      const missing: string[] = [];
      for (const ing of essentials) {
        const have = inventoryByProduct.get(ing.inventory_product_id!) ?? 0;
        if (have < ing.quantity) missing.push(ing.ingredient_name);
      }

      if (missing.length > maxMissing) continue;

      out.push({
        id: r.id,
        name: r.name,
        prep_time: r.prep_time,
        cook_time: r.cook_time,
        image_url: r.image_url,
        total_essential: essentials.length,
        missing_count: missing.length,
        missing_ingredients: missing,
      });
    }

    out.sort((a, b) => a.missing_count - b.missing_count || a.name.localeCompare(b.name));

    return { result: { recipes: out.slice(0, 20) } };
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
}
