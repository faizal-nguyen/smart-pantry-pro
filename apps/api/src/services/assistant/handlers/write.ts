/**
 * PRP-221 J5b — Write handlers (LOW + MEDIUM tiers).
 *
 * 5 LOW :
 *   - add_inventory_items, add_shopping_items
 *   - mark_shopping_items_bought, unmark_shopping_items_bought
 *   - add_recipe_to_meal_plan
 *
 * 3 MEDIUM :
 *   - consume_inventory_items
 *   - update_inventory_item
 *   - remove_shopping_items
 *
 * Every handler returns a `reversibleAction` (when reversibility makes
 * sense) so the orchestrator can record the inverse on the action_log
 * row. Some inverses use the LLM-exposed catalog tools (e.g. the
 * inverse of mark is unmark); others use internal-only handlers
 * (`_remove_inventory_items`, `_restore_*`) registered separately
 * via internal.ts.
 *
 * Each handler is RLS-bound via the user-scoped Supabase client.
 * Failures throw — the orchestrator catches and marks the action_log
 * row as failed.
 */
import type {
  ToolHandler,
  ToolExecutionContext,
  ToolExecutionResult,
  ReversibleAction,
} from './types.js';
import { ToolHandlerRegistry } from './types.js';
import type {
  AddInventoryItemsArgs,
  AddShoppingItemsArgs,
  MarkShoppingItemsBoughtArgs,
  UnmarkShoppingItemsBoughtArgs,
  AddRecipeToMealPlanArgs,
  ConsumeInventoryItemsArgs,
  UpdateInventoryItemArgs,
  RemoveShoppingItemsArgs,
  ItemArg,
} from '../schemas/tools.js';

// ---- Errors ---------------------------------------------------------

export class WriteHandlerError extends Error {
  constructor(
    readonly code:
      | 'PRODUCT_AMBIGUOUS'
      | 'PRODUCT_RESOLVE_FAILED'
      | 'INVENTORY_NOT_FOUND'
      | 'SHOPPING_NOT_FOUND'
      | 'RECIPE_NOT_FOUND'
      | 'INSUFFICIENT_QUANTITY'
      | 'EMPTY_UPDATE'
      | 'WEEKLY_PLAN_FAILED',
    message: string,
    readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'WriteHandlerError';
  }
}

// ---- helpers --------------------------------------------------------

/**
 * Resolve a batch of agent-emitted item names into product_ids.
 * Returns the resolved items + the rejected ones (ambiguous or
 * unresolvable). Resolved items carry their normalized fields.
 */
async function resolveItems(
  ctx: ToolExecutionContext,
  items: ReadonlyArray<ItemArg>
) {
  const resolved: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    expiry_date: string | null;
    notes: string | null;
  }> = [];
  const ambiguous: Array<{
    name: string;
    candidates: Array<{ product_id: string; product_name: string; score: number }>;
  }> = [];

  const results = await ctx.productResolver.resolveBatch(
    ctx.userId,
    items.map((it) => ({ name: it.name, category: it.category, unitType: it.unit }))
  );

  for (let i = 0; i < items.length; i++) {
    const r = results[i];
    const item = items[i];
    if (r.kind === 'ambiguous') {
      ambiguous.push({
        name: item.name,
        candidates: r.candidates.map((c) => ({
          product_id: c.product.id,
          product_name: c.product.name,
          score: c.score,
        })),
      });
      continue;
    }
    resolved.push({
      product_id: r.product.id,
      product_name: r.product.name,
      quantity: item.quantity,
      expiry_date: item.expiry_date ?? null,
      notes: item.notes ?? null,
    });
  }

  return { resolved, ambiguous };
}

// ---- LOW : add_inventory_items --------------------------------------

export interface AddInventoryItemsResult {
  added: Array<{
    inventory_id: string;
    product_id: string;
    product_name: string;
    quantity: number;
  }>;
  ambiguous: Array<{
    name: string;
    candidates: Array<{ product_id: string; product_name: string; score: number }>;
  }>;
}

export class AddInventoryItemsHandler
  implements ToolHandler<AddInventoryItemsArgs, AddInventoryItemsResult>
{
  async execute(
    ctx: ToolExecutionContext,
    args: AddInventoryItemsArgs
  ): Promise<ToolExecutionResult<AddInventoryItemsResult>> {
    const { resolved, ambiguous } = await resolveItems(ctx, args.items);
    if (resolved.length === 0) {
      return {
        result: { added: [], ambiguous },
        reversibleAction: null,
      };
    }

    const payload = resolved.map((r) => ({
      user_id: ctx.userId,
      product_id: r.product_id,
      quantity: r.quantity,
      expiry_date: r.expiry_date,
    }));

    const { data, error } = await ctx.userClient
      .from('inventory')
      .insert(payload)
      .select('id, product_id, quantity');
    if (error) throw error;

    const inserted = ((data ?? []) as Array<{ id: string; product_id: string; quantity: number }>);

    const added: AddInventoryItemsResult['added'] = inserted.map((row, i) => ({
      inventory_id: row.id,
      product_id: row.product_id,
      product_name: resolved[i]?.product_name ?? '',
      quantity: row.quantity,
    }));

    const reversibleAction: ReversibleAction | null =
      inserted.length > 0
        ? {
            tool: '_remove_inventory_items',
            args: { inventory_ids: inserted.map((r) => r.id) },
          }
        : null;

    return { result: { added, ambiguous }, reversibleAction };
  }
}

// ---- LOW : add_shopping_items ---------------------------------------

export interface AddShoppingItemsResult {
  added: Array<{
    shopping_item_id: string;
    product_id: string;
    product_name: string;
    quantity: number;
  }>;
  ambiguous: AddInventoryItemsResult['ambiguous'];
}

export class AddShoppingItemsHandler
  implements ToolHandler<AddShoppingItemsArgs, AddShoppingItemsResult>
{
  async execute(
    ctx: ToolExecutionContext,
    args: AddShoppingItemsArgs
  ): Promise<ToolExecutionResult<AddShoppingItemsResult>> {
    const { resolved, ambiguous } = await resolveItems(ctx, args.items);
    if (resolved.length === 0) {
      return { result: { added: [], ambiguous }, reversibleAction: null };
    }

    const payload = resolved.map((r) => ({
      user_id: ctx.userId,
      product_id: r.product_id,
      quantity: r.quantity,
      is_purchased: false,
    }));

    const { data, error } = await ctx.userClient
      .from('shopping_list')
      .insert(payload)
      .select('id, product_id, quantity');
    if (error) throw error;

    const inserted = ((data ?? []) as Array<{ id: string; product_id: string; quantity: number }>);
    const added = inserted.map((row, i) => ({
      shopping_item_id: row.id,
      product_id: row.product_id,
      product_name: resolved[i]?.product_name ?? '',
      quantity: row.quantity,
    }));

    const reversibleAction: ReversibleAction | null =
      inserted.length > 0
        ? {
            tool: 'remove_shopping_items',
            args: { shopping_item_ids: inserted.map((r) => r.id) },
          }
        : null;

    return { result: { added, ambiguous }, reversibleAction };
  }
}

// ---- LOW : mark_shopping_items_bought / unmark ----------------------

async function flipShoppingItemsPurchased(
  ctx: ToolExecutionContext,
  ids: string[],
  newValue: boolean
) {
  // Filter to ids that actually belong to the user (RLS would reject
  // others anyway, but we want a reliable updated count).
  const { data: existing, error: readErr } = await ctx.userClient
    .from('shopping_list')
    .select('id, is_purchased')
    .eq('user_id', ctx.userId)
    .in('id', ids);
  if (readErr) throw readErr;

  const validIds = ((existing ?? []) as Array<{ id: string; is_purchased: boolean }>).map(
    (r) => r.id
  );
  if (validIds.length === 0) {
    throw new WriteHandlerError(
      'SHOPPING_NOT_FOUND',
      `No shopping_list rows match ${ids.length} ids`
    );
  }

  const { error } = await ctx.userClient
    .from('shopping_list')
    .update({ is_purchased: newValue })
    .eq('user_id', ctx.userId)
    .in('id', validIds);
  if (error) throw error;

  return validIds;
}

export class MarkShoppingItemsBoughtHandler
  implements ToolHandler<MarkShoppingItemsBoughtArgs, { updated: number; ids: string[] }>
{
  async execute(
    ctx: ToolExecutionContext,
    args: MarkShoppingItemsBoughtArgs
  ): Promise<ToolExecutionResult<{ updated: number; ids: string[] }>> {
    const ids = await flipShoppingItemsPurchased(ctx, args.shopping_item_ids, true);
    return {
      result: { updated: ids.length, ids },
      reversibleAction: {
        tool: 'unmark_shopping_items_bought',
        args: { shopping_item_ids: ids },
      },
    };
  }
}

export class UnmarkShoppingItemsBoughtHandler
  implements ToolHandler<UnmarkShoppingItemsBoughtArgs, { updated: number; ids: string[] }>
{
  async execute(
    ctx: ToolExecutionContext,
    args: UnmarkShoppingItemsBoughtArgs
  ): Promise<ToolExecutionResult<{ updated: number; ids: string[] }>> {
    const ids = await flipShoppingItemsPurchased(ctx, args.shopping_item_ids, false);
    return {
      result: { updated: ids.length, ids },
      reversibleAction: {
        tool: 'mark_shopping_items_bought',
        args: { shopping_item_ids: ids },
      },
    };
  }
}

// ---- LOW : add_recipe_to_meal_plan ----------------------------------

export interface AddRecipeToMealPlanResult {
  entry_id: string;
  weekly_meal_plan_id: string;
  recipe_id: string;
  recipe_name: string;
  day_of_week: number;
  meal_type: string;
}

export class AddRecipeToMealPlanHandler
  implements ToolHandler<AddRecipeToMealPlanArgs, AddRecipeToMealPlanResult>
{
  async execute(
    ctx: ToolExecutionContext,
    args: AddRecipeToMealPlanArgs
  ): Promise<ToolExecutionResult<AddRecipeToMealPlanResult>> {
    // 1. Fetch the recipe (need name + servings + prep_time + cook_time
    //    to populate meal_plan_entries). Also enforces ownership via RLS.
    const { data: recipe, error: recipeErr } = await ctx.userClient
      .from('recipes')
      .select('id, name, servings, prep_time, cook_time')
      .eq('user_id', ctx.userId)
      .eq('id', args.recipe_id)
      .maybeSingle();
    if (recipeErr) throw recipeErr;
    if (!recipe) {
      throw new WriteHandlerError('RECIPE_NOT_FOUND', `Recipe ${args.recipe_id} not found`);
    }
    const r = recipe as {
      id: string;
      name: string;
      servings: number | null;
      prep_time: number | null;
      cook_time: number | null;
    };

    // 2. Find or create the weekly_meal_plans row for this user/week.
    const planId = await findOrCreateWeeklyPlan(ctx, args.week_start);

    // 3. Insert the entry.
    const { data: entry, error: insertErr } = await ctx.userClient
      .from('meal_plan_entries')
      .insert({
        meal_plan_id: planId,
        day_of_week: args.day_of_week,
        meal_type: args.meal_type,
        recipe_id: r.id,
        recipe_name: r.name,
        servings: r.servings ?? 1,
        prep_time: r.prep_time ?? 0,
        cook_time: r.cook_time ?? 0,
      })
      .select('id')
      .single();
    if (insertErr) throw insertErr;
    const entryId = (entry as { id: string }).id;

    return {
      result: {
        entry_id: entryId,
        weekly_meal_plan_id: planId,
        recipe_id: r.id,
        recipe_name: r.name,
        day_of_week: args.day_of_week,
        meal_type: args.meal_type,
      },
      reversibleAction: {
        tool: '_remove_meal_plan_entries',
        args: { entry_ids: [entryId] },
      },
    };
  }
}

async function findOrCreateWeeklyPlan(
  ctx: ToolExecutionContext,
  weekStart: string
): Promise<string> {
  const { data: existing, error: readErr } = await ctx.userClient
    .from('weekly_meal_plans')
    .select('id')
    .eq('user_id', ctx.userId)
    .eq('week_start_date', weekStart)
    .maybeSingle();
  if (readErr) {
    throw new WriteHandlerError(
      'WEEKLY_PLAN_FAILED',
      readErr.message,
      { weekStart }
    );
  }
  if (existing) return (existing as { id: string }).id;

  const { data: created, error: createErr } = await ctx.userClient
    .from('weekly_meal_plans')
    .insert({ user_id: ctx.userId, week_start_date: weekStart })
    .select('id')
    .single();
  if (createErr) {
    throw new WriteHandlerError('WEEKLY_PLAN_FAILED', createErr.message, { weekStart });
  }
  return (created as { id: string }).id;
}

// ---- MEDIUM : consume_inventory_items -------------------------------

export interface ConsumeInventoryItemsResult {
  consumed: Array<{ inventory_id: string; new_quantity: number; consumed_quantity: number }>;
  insufficient: Array<{ inventory_id: string; available: number; requested: number }>;
}

export class ConsumeInventoryItemsHandler
  implements ToolHandler<ConsumeInventoryItemsArgs, ConsumeInventoryItemsResult>
{
  async execute(
    ctx: ToolExecutionContext,
    args: ConsumeInventoryItemsArgs
  ): Promise<ToolExecutionResult<ConsumeInventoryItemsResult>> {
    const ids = args.items.map((i) => i.inventory_id);
    const { data: rows, error: readErr } = await ctx.userClient
      .from('inventory')
      .select('id, quantity')
      .eq('user_id', ctx.userId)
      .in('id', ids);
    if (readErr) throw readErr;

    const currentById = new Map<string, number>(
      ((rows ?? []) as Array<{ id: string; quantity: number }>).map((r) => [r.id, r.quantity])
    );

    const consumed: ConsumeInventoryItemsResult['consumed'] = [];
    const insufficient: ConsumeInventoryItemsResult['insufficient'] = [];
    const deltas: Array<{ inventory_id: string; quantity: number }> = [];

    for (const item of args.items) {
      const current = currentById.get(item.inventory_id);
      if (current === undefined) {
        insufficient.push({
          inventory_id: item.inventory_id,
          available: 0,
          requested: item.quantity,
        });
        continue;
      }
      if (item.quantity > current) {
        insufficient.push({
          inventory_id: item.inventory_id,
          available: current,
          requested: item.quantity,
        });
        continue;
      }
      const newQty = current - item.quantity;
      const { error } = await ctx.userClient
        .from('inventory')
        .update({ quantity: newQty })
        .eq('user_id', ctx.userId)
        .eq('id', item.inventory_id);
      if (error) throw error;
      consumed.push({
        inventory_id: item.inventory_id,
        new_quantity: newQty,
        consumed_quantity: item.quantity,
      });
      deltas.push({ inventory_id: item.inventory_id, quantity: item.quantity });
    }

    const reversibleAction: ReversibleAction | null =
      deltas.length > 0
        ? {
            tool: '_restore_inventory_quantities',
            args: { deltas },
          }
        : null;

    return { result: { consumed, insufficient }, reversibleAction };
  }
}

// ---- MEDIUM : update_inventory_item ---------------------------------

export interface UpdateInventoryItemResult {
  inventory_id: string;
  before: { quantity: number; expiry_date: string | null; location: string | null };
  after: { quantity: number; expiry_date: string | null; location: string | null };
}

export class UpdateInventoryItemHandler
  implements ToolHandler<UpdateInventoryItemArgs, UpdateInventoryItemResult>
{
  async execute(
    ctx: ToolExecutionContext,
    args: UpdateInventoryItemArgs
  ): Promise<ToolExecutionResult<UpdateInventoryItemResult>> {
    const update: Record<string, unknown> = {};
    if (args.quantity !== undefined) update.quantity = args.quantity;
    if (args.expiry_date !== undefined) update.expiry_date = args.expiry_date;
    if (args.location !== undefined) update.location = args.location;
    if (Object.keys(update).length === 0) {
      throw new WriteHandlerError('EMPTY_UPDATE', 'No field to update');
    }

    // Snapshot before update.
    const { data: snap, error: readErr } = await ctx.userClient
      .from('inventory')
      .select('quantity, expiry_date, location')
      .eq('user_id', ctx.userId)
      .eq('id', args.inventory_id)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!snap) {
      throw new WriteHandlerError(
        'INVENTORY_NOT_FOUND',
        `Inventory row ${args.inventory_id} not found`
      );
    }
    const before = snap as { quantity: number; expiry_date: string | null; location: string | null };

    const { error } = await ctx.userClient
      .from('inventory')
      .update(update)
      .eq('user_id', ctx.userId)
      .eq('id', args.inventory_id);
    if (error) throw error;

    const after = {
      quantity: args.quantity ?? before.quantity,
      expiry_date: args.expiry_date !== undefined ? args.expiry_date : before.expiry_date,
      location: args.location !== undefined ? args.location : before.location,
    };

    return {
      result: { inventory_id: args.inventory_id, before, after },
      reversibleAction: {
        tool: '_restore_inventory_item_snapshot',
        args: { inventory_id: args.inventory_id, snapshot: before },
      },
    };
  }
}

// ---- MEDIUM : remove_shopping_items ---------------------------------

export interface RemoveShoppingItemsResult {
  removed: number;
  removed_ids: string[];
}

export class RemoveShoppingItemsHandler
  implements ToolHandler<RemoveShoppingItemsArgs, RemoveShoppingItemsResult>
{
  async execute(
    ctx: ToolExecutionContext,
    args: RemoveShoppingItemsArgs
  ): Promise<ToolExecutionResult<RemoveShoppingItemsResult>> {
    // Snapshot the rows before deleting (for undo).
    const { data: snapshots, error: readErr } = await ctx.userClient
      .from('shopping_list')
      .select(
        'id, user_id, product_id, quantity, is_purchased, priority, estimated_price, store_section'
      )
      .eq('user_id', ctx.userId)
      .in('id', args.shopping_item_ids);
    if (readErr) throw readErr;

    const rows = (snapshots ?? []) as Array<{
      id: string;
      user_id: string;
      product_id: string;
      quantity: number;
      is_purchased: boolean;
      priority: number | null;
      estimated_price: number | null;
      store_section: string | null;
    }>;

    if (rows.length === 0) {
      return {
        result: { removed: 0, removed_ids: [] },
        reversibleAction: null,
      };
    }

    const { error } = await ctx.userClient
      .from('shopping_list')
      .delete()
      .eq('user_id', ctx.userId)
      .in('id', rows.map((r) => r.id));
    if (error) throw error;

    return {
      result: { removed: rows.length, removed_ids: rows.map((r) => r.id) },
      reversibleAction: {
        tool: '_restore_shopping_items',
        args: { snapshots: rows },
      },
    };
  }
}

// ---- registration ---------------------------------------------------

export function registerWriteHandlers(registry: ToolHandlerRegistry): void {
  registry.register('add_inventory_items', new AddInventoryItemsHandler());
  registry.register('add_shopping_items', new AddShoppingItemsHandler());
  registry.register('mark_shopping_items_bought', new MarkShoppingItemsBoughtHandler());
  registry.register('unmark_shopping_items_bought', new UnmarkShoppingItemsBoughtHandler());
  registry.register('add_recipe_to_meal_plan', new AddRecipeToMealPlanHandler());
  registry.register('consume_inventory_items', new ConsumeInventoryItemsHandler());
  registry.register('update_inventory_item', new UpdateInventoryItemHandler());
  registry.register('remove_shopping_items', new RemoveShoppingItemsHandler());
}
