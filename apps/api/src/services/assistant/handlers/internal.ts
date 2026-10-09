import { createHash } from 'node:crypto';
import { StockCommandService } from '../../stock/StockCommandService.js';
/**
 * PRP-221 J5b — Internal handlers used ONLY as reversible_action targets.
 *
 * These tool names are NOT exposed to the LLM. They live outside
 * TOOL_SPECS, so the agent can't invoke them directly. They exist so
 * a write handler can declare a precise inverse on its action_log row,
 * which is replayed when the user calls /actions/:id/undo.
 *
 * Naming convention : leading underscore (`_remove_inventory_items`)
 * to stand out in logs and avoid collision with future LLM-exposed tools.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  ToolHandlerRegistry,
  type ToolHandler,
  type ToolExecutionContext,
  type ToolExecutionResult,
} from './types.js';
import { invalidateRecoCache } from './write.js';

export class UndoStockCommandInternalHandler implements ToolHandler<{ original_command_id: string }> {
  async execute(ctx: ToolExecutionContext,args: { original_command_id: string }) {
    // A separate stable UUID for the inverse; retry after a lost response returns its receipt.
    const hex = createHash('sha256').update(`v10-undo:${ctx.userId}:${args.original_command_id}`).digest('hex');
    const commandId = `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20,32)}`;
    const result = await new StockCommandService(ctx.userClient).execute(ctx.userId,{
      command_id: commandId, command_type: 'undo_stock', payload_version: 1,
      payload: { original_command_id: args.original_command_id },
    });
    return { result };
  }
}

// ---- _remove_inventory_items ----------------------------------------

export interface RemoveInventoryItemsArgs {
  inventory_ids: string[];
}

export class RemoveInventoryItemsInternalHandler
  implements ToolHandler<RemoveInventoryItemsArgs, { removed: number }>
{
  async execute(
    ctx: ToolExecutionContext,
    args: RemoveInventoryItemsArgs
  ): Promise<ToolExecutionResult<{ removed: number }>> {
    if (args.inventory_ids.length === 0) return { result: { removed: 0 } };
    const { error, count } = await ctx.userClient
      .from('inventory')
      .delete({ count: 'exact' })
      .eq('user_id', ctx.userId)
      .in('id', args.inventory_ids);
    if (error) throw error;
    await invalidateRecoCache(ctx);
    return { result: { removed: count ?? 0 } };
  }
}

// ---- _restore_inventory_quantities ----------------------------------

/**
 * Restore inventory quantities by re-adding `delta` to each row's
 * current quantity. Used as the inverse of consume_inventory_items.
 */
export interface RestoreInventoryQuantitiesArgs {
  deltas: Array<{ inventory_id: string; quantity: number }>;
}

export class RestoreInventoryQuantitiesInternalHandler
  implements ToolHandler<RestoreInventoryQuantitiesArgs, { restored: number }>
{
  async execute(
    ctx: ToolExecutionContext,
    args: RestoreInventoryQuantitiesArgs
  ): Promise<ToolExecutionResult<{ restored: number }>> {
    if (args.deltas.length === 0) return { result: { restored: 0 } };

    const ids = args.deltas.map((d) => d.inventory_id);
    const { data: current, error: readErr } = await ctx.userClient
      .from('inventory')
      .select('id, quantity')
      .eq('user_id', ctx.userId)
      .in('id', ids);
    if (readErr) throw readErr;

    const currentById = new Map<string, number>(
      ((current ?? []) as Array<{ id: string; quantity: number }>).map((r) => [r.id, r.quantity])
    );

    let restored = 0;
    for (const d of args.deltas) {
      if (!currentById.has(d.inventory_id)) continue;
      const newQty = (currentById.get(d.inventory_id) ?? 0) + d.quantity;
      const { error } = await ctx.userClient
        .from('inventory')
        .update({ quantity: newQty })
        .eq('user_id', ctx.userId)
        .eq('id', d.inventory_id);
      if (error) throw error;
      restored += 1;
    }
    if (restored > 0) await invalidateRecoCache(ctx);
    return { result: { restored } };
  }
}

// ---- _restore_inventory_item_snapshot --------------------------------

/**
 * Restore a single inventory row from a pre-update snapshot. Inverse
 * of update_inventory_item. The snapshot is exactly the columns we
 * touch via update — quantity, expiry_date, location.
 */
export interface RestoreInventoryItemSnapshotArgs {
  inventory_id: string;
  snapshot: {
    quantity?: number;
    expiry_date?: string | null;
    location?: string | null;
  };
}

export class RestoreInventoryItemSnapshotInternalHandler
  implements ToolHandler<RestoreInventoryItemSnapshotArgs, { restored: boolean }>
{
  async execute(
    ctx: ToolExecutionContext,
    args: RestoreInventoryItemSnapshotArgs
  ): Promise<ToolExecutionResult<{ restored: boolean }>> {
    throw new Error('Cette ancienne action ne dispose pas d’une version de stock. Corrigez le lot manuellement après vérification.');
  }
}

// ---- _restore_shopping_items -----------------------------------------

/**
 * Re-INSERT shopping_list rows from snapshots. Inverse of
 * remove_shopping_items.
 */
export interface RestoreShoppingItemsArgs {
  snapshots: Array<{
    id?: string;
    user_id: string;
    product_id: string;
    quantity: number;
    is_purchased: boolean;
    priority: number | null;
    estimated_price: number | null;
    store_section: string | null;
  }>;
}

export class RestoreShoppingItemsInternalHandler
  implements ToolHandler<RestoreShoppingItemsArgs, { restored: number }>
{
  async execute(
    ctx: ToolExecutionContext,
    args: RestoreShoppingItemsArgs
  ): Promise<ToolExecutionResult<{ restored: number }>> {
    const rows = args.snapshots.filter((s) => s.user_id === ctx.userId);
    if (rows.length === 0) return { result: { restored: 0 } };

    const payload = rows.map((s) => ({
      // Keep the original id if available; otherwise let the DB assign one.
      ...(s.id ? { id: s.id } : {}),
      user_id: s.user_id,
      product_id: s.product_id,
      quantity: s.quantity,
      is_purchased: s.is_purchased,
      priority: s.priority,
      estimated_price: s.estimated_price,
      store_section: s.store_section,
    }));

    const { error, count } = await ctx.userClient
      .from('shopping_list')
      .insert(payload, { count: 'exact' });
    if (error) throw error;
    return { result: { restored: count ?? rows.length } };
  }
}

// ---- _remove_meal_plan_entries ---------------------------------------

export interface RemoveMealPlanEntriesArgs {
  entry_ids: string[];
}

export class RemoveMealPlanEntriesInternalHandler
  implements ToolHandler<RemoveMealPlanEntriesArgs, { removed: number }>
{
  async execute(
    ctx: ToolExecutionContext,
    args: RemoveMealPlanEntriesArgs
  ): Promise<ToolExecutionResult<{ removed: number }>> {
    if (args.entry_ids.length === 0) return { result: { removed: 0 } };
    const { error, count } = await ctx.userClient
      .from('meal_plan_entries')
      .delete({ count: 'exact' })
      .in('id', args.entry_ids);
    if (error) throw error;
    await invalidateRecoCache(ctx);
    return { result: { removed: count ?? 0 } };
  }
}

// ---- registration helper --------------------------------------------

export const INTERNAL_TOOL_NAMES = [
  '_undo_stock_command',
  '_remove_inventory_items',
  '_restore_inventory_quantities',
  '_restore_inventory_item_snapshot',
  '_restore_shopping_items',
  '_remove_meal_plan_entries',
] as const;

export function registerInternalHandlers(registry: ToolHandlerRegistry): void {
  registry.register('_undo_stock_command',new UndoStockCommandInternalHandler());
  registry.register('_remove_inventory_items', new RemoveInventoryItemsInternalHandler());
  registry.register(
    '_restore_inventory_quantities',
    new RestoreInventoryQuantitiesInternalHandler()
  );
  registry.register(
    '_restore_inventory_item_snapshot',
    new RestoreInventoryItemSnapshotInternalHandler()
  );
  registry.register('_restore_shopping_items', new RestoreShoppingItemsInternalHandler());
  registry.register('_remove_meal_plan_entries', new RemoveMealPlanEntriesInternalHandler());
}
