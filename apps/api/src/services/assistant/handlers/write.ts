import { StockCommandService } from '../../stock/StockCommandService.js';
import type { StockCommandResult } from '@smart/shared';
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
  CookRecipeArgs,
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
    unit: string | null;
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
      unit: item.unit ?? r.product.unit_type ?? null,
      expiry_date: item.expiry_date ?? null,
      notes: item.notes ?? null,
    });
  }

  return { resolved, ambiguous };
}

/**
 * PRP-226 PR4 — drop the per-user recommendation cache after any
 * mutation that could change scoring (inventory delta, recipe planned,
 * future recipe CRUD). Best-effort : a cache miss is a real (but
 * harmless) regression vs a stale-but-wrong hit, so we never let a
 * writer error bubble up and break the user-facing write.
 */
export async function invalidateRecoCache(ctx: ToolExecutionContext): Promise<void> {
  if (!ctx.eventWriter) return;
  try {
    await ctx.eventWriter.invalidateUserCache(ctx.userId);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[reco.cache] invalidate failed:', err);
  }
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
      unit: r.unit,
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

    if (inserted.length > 0) await invalidateRecoCache(ctx);

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
      unit: r.unit,
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
    if (!ctx.commandId) throw new Error('Identité de commande manquante.');
    const service = new StockCommandService(ctx.userClient);
    let result = await service.getResult(ctx.userId,ctx.commandId);
    if (!result) {
      const preview = await service.preview(ctx.userId,{ id: args.recipe_id, source: 'auto' });
      const day = new Date(`${args.week_start}T12:00:00Z`);
      day.setUTCDate(day.getUTCDate() + args.day_of_week);
      result = await service.execute(ctx.userId,{
        command_id: ctx.commandId, command_type: 'plan_recipe', payload_version: 1,
        payload: { recipe: { id: args.recipe_id, source: preview.recipe.source }, servings: preview.servings,
          date: day.toISOString().slice(0,10), meal_type: args.meal_type },
      });
    }
    return { result: {
      entry_id: result.meal_plan_entry_id!, weekly_meal_plan_id: result.meal_plan_id!,
      recipe_id: args.recipe_id, recipe_name: '', day_of_week: args.day_of_week, meal_type: args.meal_type,
    }, reversibleAction: null }; // Replacement of a meal slot has no safe legacy DELETE inverse.
  }
}

export class CookRecipeHandler implements ToolHandler<CookRecipeArgs,StockCommandResult> {
  async execute(ctx: ToolExecutionContext,args: CookRecipeArgs) {
    if (!ctx.commandId) throw new Error('Identité de commande manquante.');
    const service = new StockCommandService(ctx.userClient);
    let result = await service.getResult(ctx.userId,ctx.commandId);
    if (!result) {
      const preview = await service.preview(ctx.userId,{ id: args.recipe_id, source: 'auto' },args.servings);
      result = await service.execute(ctx.userId,{
        command_id: ctx.commandId, command_type: 'consume_recipe', payload_version: 1,
        payload: { recipe: { id: args.recipe_id, source: preview.recipe.source }, servings: preview.servings,
          recipe_version: preview.recipe.version, outside_inventory: args.outside_inventory },
      });
    }
    return { result, reversibleAction: { tool: '_undo_stock_command', args: { original_command_id: result.command_id } } };
  }
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
    if (!ctx.commandId) throw new Error('Identité de commande manquante.');
    const service = new StockCommandService(ctx.userClient);
    let result = await service.getResult(ctx.userId,ctx.commandId);
    if (!result) {
      const { data, error } = await ctx.userClient.from('inventory').select('id,quantity,unit,stock_version,product:products(unit_type)')
        .eq('user_id',ctx.userId).in('id',args.items.map(item => item.inventory_id));
      if (error) throw error;
      const rows = data as Array<{ id: string; quantity: number; unit: string | null; stock_version: number; product?: { unit_type: string } | { unit_type: string }[] }>;
      result = await service.execute(ctx.userId,{
        command_id: ctx.commandId, command_type: 'consume_inventory', payload_version: 1,
        payload: { items: args.items.map(item => {
          const row = rows.find(lot => lot.id === item.inventory_id);
          if (!row) throw new WriteHandlerError('INVENTORY_NOT_FOUND','Ce lot n’est plus accessible.');
          return { id: row.id, quantity: item.quantity, unit: item.unit ?? row.unit ?? (Array.isArray(row.product) ? row.product[0]?.unit_type : row.product?.unit_type) ?? '', expected_version: Number(row.stock_version) };
        }) },
      });
    }
    return { result: {
      consumed: (result.changes ?? []).map(change => ({ inventory_id: change.id, new_quantity: change.after_quantity,
        consumed_quantity: change.before_quantity - change.after_quantity })), insufficient: [],
    }, reversibleAction: { tool: '_undo_stock_command', args: { original_command_id: result.command_id } } };
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
    if (args.quantity === undefined && args.expiry_date === undefined && args.location === undefined) throw new WriteHandlerError('EMPTY_UPDATE','Aucun champ à modifier.');
    if (!ctx.commandId) throw new Error('Identité de commande manquante.');
    const service = new StockCommandService(ctx.userClient);
    let result = await service.getResult(ctx.userId,ctx.commandId);
    const { data: snapshot, error } = await ctx.userClient.from('inventory').select('id,quantity,unit,stock_version,expiry_date,location,product:products(unit_type)')
      .eq('user_id',ctx.userId).eq('id',args.inventory_id).maybeSingle();
    if (error) throw error;
    if (!snapshot && !result) throw new WriteHandlerError('INVENTORY_NOT_FOUND','Ce lot n’est plus accessible.');
    const row = snapshot as { quantity: number; unit: string | null; stock_version: number; expiry_date: string | null; location: string | null; product?: { unit_type: string } | { unit_type: string }[] };
    if (!result) result = await service.execute(ctx.userId,{
      command_id: ctx.commandId, command_type: 'adjust_inventory', payload_version: 1,
      payload: { items: [{ id: args.inventory_id, quantity: args.quantity ?? row.quantity,
        unit: row.unit ?? (Array.isArray(row.product) ? row.product[0]?.unit_type : row.product?.unit_type) ?? '', expected_version: Number(row.stock_version),
        ...(args.expiry_date !== undefined ? { expiry_date: args.expiry_date } : {}),
        ...(args.location !== undefined ? { location: args.location } : {}),
      }] },
    });
    const change = result.changes?.[0];
    return { result: { inventory_id: args.inventory_id,
      before: { quantity: change?.before_quantity ?? row?.quantity, expiry_date: row?.expiry_date ?? null, location: row?.location ?? null },
      after: { quantity: change?.after_quantity ?? row?.quantity, expiry_date: args.expiry_date ?? row?.expiry_date ?? null, location: args.location ?? row?.location ?? null },
    }, reversibleAction: { tool: '_undo_stock_command', args: { original_command_id: result.command_id } } };
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
  registry.register('cook_recipe', new CookRecipeHandler());
  registry.register('consume_inventory_items', new ConsumeInventoryItemsHandler());
  registry.register('update_inventory_item', new UpdateInventoryItemHandler());
  registry.register('remove_shopping_items', new RemoveShoppingItemsHandler());
}
