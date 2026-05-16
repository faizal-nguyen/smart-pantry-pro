/**
 * PRP-221 J5c — HIGH-tier handlers.
 *
 * These tools always require the confirmation_token round-trip — the
 * orchestrator never executes them inline on a /voice or /text call.
 * Per PRP-221 §9, V1 leaves them non-reversible (the user already
 * confirmed). Snapshot-and-restore for clear_* is V1.1.
 *
 *   - delete_recipe                 DELETE recipes (FK cascade ingredients)
 *   - clear_shopping_list           DELETE shopping_list rows for the user
 *   - clear_inventory_category      DELETE inventory rows by JOINed category
 *   - import_recipe_from_url        chains capture + extract + save through
 *                                   the existing SocialImportService
 *
 * `import_recipe_from_url` is the most involved — it's a 3-step pipeline
 * that goes through ~10s of Whisper + GPT for video URLs. Costs are
 * tracked via `extraCostUsd` so the agent's session total reflects them.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  ToolHandlerRegistry,
  type ToolHandler,
  type ToolExecutionContext,
  type ToolExecutionResult,
} from './types.js';
import type {
  DeleteRecipeArgs,
  ClearShoppingListArgs,
  ClearInventoryCategoryArgs,
  ImportRecipeFromUrlArgs,
} from '../schemas/tools.js';
import type { SocialImportService } from '../../imports/SocialImportService.js';

// ---- Errors ---------------------------------------------------------

export class HighHandlerError extends Error {
  constructor(
    readonly code:
      | 'RECIPE_NOT_FOUND'
      | 'CATEGORY_EMPTY'
      | 'IMPORT_FAILED',
    message: string
  ) {
    super(message);
    this.name = 'HighHandlerError';
  }
}

// ---- delete_recipe --------------------------------------------------

export class DeleteRecipeHandler
  implements ToolHandler<DeleteRecipeArgs, { deleted_recipe_id: string }>
{
  async execute(
    ctx: ToolExecutionContext,
    args: DeleteRecipeArgs
  ): Promise<ToolExecutionResult<{ deleted_recipe_id: string }>> {
    // Pre-check ownership so we surface a clear NOT_FOUND instead of a
    // silent no-op (RLS would also block, but a 0-row delete is opaque
    // to the caller).
    const { data: existing, error: readErr } = await ctx.userClient
      .from('recipes')
      .select('id')
      .eq('user_id', ctx.userId)
      .eq('id', args.recipe_id)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!existing) {
      throw new HighHandlerError(
        'RECIPE_NOT_FOUND',
        `Recipe ${args.recipe_id} does not exist or is not yours`
      );
    }

    const { error } = await ctx.userClient
      .from('recipes')
      .delete()
      .eq('user_id', ctx.userId)
      .eq('id', args.recipe_id);
    if (error) throw error;

    // V1: non-reversible. The user already confirmed via
    // confirmation_token. Cascade FK on recipe_ingredients handles
    // children.
    return { result: { deleted_recipe_id: args.recipe_id } };
  }
}

// ---- clear_shopping_list --------------------------------------------

export class ClearShoppingListHandler
  implements ToolHandler<ClearShoppingListArgs, { removed: number }>
{
  async execute(
    ctx: ToolExecutionContext,
    args: ClearShoppingListArgs
  ): Promise<ToolExecutionResult<{ removed: number }>> {
    let q = ctx.userClient
      .from('shopping_list')
      .delete({ count: 'exact' })
      .eq('user_id', ctx.userId);
    if (args.purchased_only) q = q.eq('is_purchased', true);

    const { error, count } = await q;
    if (error) throw error;
    return { result: { removed: count ?? 0 } };
  }
}

// ---- clear_inventory_category ---------------------------------------

export class ClearInventoryCategoryHandler
  implements ToolHandler<ClearInventoryCategoryArgs, { removed: number; category: string }>
{
  async execute(
    ctx: ToolExecutionContext,
    args: ClearInventoryCategoryArgs
  ): Promise<ToolExecutionResult<{ removed: number; category: string }>> {
    // Step 1: find the product_ids in this category. If none, nothing to do.
    const { data: products, error: readErr } = await ctx.userClient
      .from('products')
      .select('id')
      .eq('category', args.category);
    if (readErr) throw readErr;
    const productIds = ((products ?? []) as Array<{ id: string }>).map((p) => p.id);
    if (productIds.length === 0) {
      return { result: { removed: 0, category: args.category } };
    }

    // Step 2: delete inventory rows for those products owned by this user.
    const { error, count } = await ctx.userClient
      .from('inventory')
      .delete({ count: 'exact' })
      .eq('user_id', ctx.userId)
      .in('product_id', productIds);
    if (error) throw error;

    return { result: { removed: count ?? 0, category: args.category } };
  }
}

// ---- import_recipe_from_url -----------------------------------------

export interface ImportRecipeFromUrlResult {
  recipe_id: string | null;
  import_id: string;
  duplicate: boolean;
  /** Filled when extraction succeeded and the row was saved. */
  draft_title?: string;
  cost_usd?: number;
}

/**
 * Factory the router constructs once per request from the user-scoped
 * client + the existing SocialImportService dependencies (extraction
 * service, save RPC).
 */
export type SocialImportServiceFactory = (
  userClient: SupabaseClient<any, any, any>
) => SocialImportService;

export class ImportRecipeFromUrlHandler
  implements ToolHandler<ImportRecipeFromUrlArgs, ImportRecipeFromUrlResult>
{
  constructor(private readonly buildService: SocialImportServiceFactory) {}

  async execute(
    ctx: ToolExecutionContext,
    args: ImportRecipeFromUrlArgs
  ): Promise<ToolExecutionResult<ImportRecipeFromUrlResult>> {
    const service = this.buildService(ctx.userClient);
    let totalCost = 0;

    // 1. Capture (idempotent on hash → returns existing row when seen).
    let captured;
    try {
      captured = await service.capture(ctx.userId, args.url);
    } catch (err) {
      throw new HighHandlerError(
        'IMPORT_FAILED',
        err instanceof Error ? err.message : 'capture failed'
      );
    }

    // If we've already imported this URL and it has a recipe, return early.
    if (captured.duplicate && captured.import.recipe_id) {
      return {
        result: {
          recipe_id: captured.import.recipe_id,
          import_id: captured.import.id,
          duplicate: true,
        },
        // Non-reversible (the agent could call delete_recipe to undo).
      };
    }

    // 2. Extract — runs Whisper + GPT for video; fast for static pages.
    let extractResult;
    try {
      extractResult = await service.extract(ctx.userId, captured.import.id);
    } catch (err) {
      // If extract failed, leave the import row in 'failed' state (the
      // service does that internally) and surface it.
      throw new HighHandlerError(
        'IMPORT_FAILED',
        err instanceof Error ? err.message : 'extract failed'
      );
    }
    if (extractResult.cost?.usd) totalCost += extractResult.cost.usd;

    // 3. Save the freshly extracted draft as a recipe.
    let saveResult;
    try {
      saveResult = await service.save(
        ctx.userClient,
        ctx.userId,
        captured.import.id,
        {}
      );
    } catch (err) {
      throw new HighHandlerError(
        'IMPORT_FAILED',
        err instanceof Error ? err.message : 'save failed'
      );
    }

    return {
      result: {
        recipe_id: saveResult.recipeId,
        import_id: captured.import.id,
        duplicate: false,
        draft_title: extractResult.draft.title,
        cost_usd: totalCost,
      },
      extraCostUsd: totalCost,
    };
  }
}

// ---- registration helper --------------------------------------------

export interface HighHandlersDeps {
  buildSocialImportService: SocialImportServiceFactory;
}

export function registerHighHandlers(
  registry: ToolHandlerRegistry,
  deps: HighHandlersDeps
): void {
  registry.register('delete_recipe', new DeleteRecipeHandler());
  registry.register('clear_shopping_list', new ClearShoppingListHandler());
  registry.register('clear_inventory_category', new ClearInventoryCategoryHandler());
  registry.register(
    'import_recipe_from_url',
    new ImportRecipeFromUrlHandler(deps.buildSocialImportService)
  );
}
