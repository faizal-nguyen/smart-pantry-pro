import type { SupabaseClient } from '@supabase/supabase-js';
import {
  allocateRecipeStock, allocateCookingStock, StockCommandSchema,
  type RecipeReference, type RecipeStockPreview, type ResolvedStockRecipe,
  type StockCommand, type StockCommandResult, type StockLot,
} from '@smart/shared';

const MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Reconnectez-vous pour reprendre cette action.',
  ITEM_NOT_FOUND: 'Ce produit ou cet achat n’est plus disponible. Actualisez la liste.',
  RECIPE_NOT_FOUND: 'Cette recette n’est plus accessible.',
  RECIPE_CHANGED: 'La recette a changé. Vérifiez à nouveau les ingrédients.',
  CONFLICT: 'Le stock ou l’achat a changé. Actualisez avant de confirmer.',
  INSUFFICIENT_QUANTITY: 'La quantité disponible ne suffit plus. Vérifiez le stock.',
  QUANTITY_UNKNOWN: 'Une quantité reste à renseigner ou à déclarer hors inventaire.',
  UNIT_UNKNOWN: 'Une unité reste à vérifier.',
  UNIT_INCOMPATIBLE: 'Ces unités ne sont pas convertibles sans information supplémentaire.',
  UNDO_CONFLICT: 'Le stock a changé depuis cette action. L’annulation écraserait une correction.',
  ALREADY_UNDONE: 'Cette action a déjà été annulée.',
  IDEMPOTENCY_CONFLICT: 'Cette intention a déjà un résultat différent. Vérifiez son état avant de continuer.',
  INVALID_ALLOCATION: 'Les ingrédients ne correspondent plus au stock sélectionné.',
  INVALID_QUANTITY: 'Vérifiez les quantités et les portions.',
  COMMAND_NOT_FOUND: 'Cette opération n’est plus accessible.',
  MIGRATION_REQUIRED: 'Les nouvelles commandes ne sont pas encore disponibles. Vos données et cette intention restent conservées.',
  INVALID_COMMAND: 'Les données de cette action sont invalides. Vérifiez les champs avant de réessayer.',
};

export class StockCommandError extends Error {
  constructor(public readonly code: string, public readonly status = 400) {
    super(MESSAGES[code] ?? 'Impossible de confirmer cette action. Vos données sont conservées.');
    this.name = 'StockCommandError';
  }
}

function databaseError(error: { message: string; code?: string }): never {
  const code = Object.keys(MESSAGES).find(key => error.message === key || error.message.startsWith(`${key}:`));
  if (code) throw new StockCommandError(code, code === 'UNAUTHORIZED' ? 401 : ['CONFLICT','RECIPE_CHANGED','UNDO_CONFLICT','IDEMPOTENCY_CONFLICT','ALREADY_UNDONE'].includes(code) ? 409 : 400);
  if (error.code === 'PGRST202' || error.code === '42P01' || error.code === '42703') throw new StockCommandError('MIGRATION_REQUIRED', 503);
  throw new StockCommandError('STOCK_WRITE_FAILED', 500);
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

interface Receipt { command_type: string; payload: unknown; result: StockCommandResult }
interface InventoryRow {
  id: string; product_id: string; quantity: number; unit: string | null; stock_version: number; expiry_date: string | null;
  product: { name: string; unit_type: string } | { name: string; unit_type: string }[] | null;
}

/** Always constructed with a verified user-scoped client, never the admin client. */
export class StockCommandService {
  constructor(private readonly client: SupabaseClient) {}

  async getResult(userId: string, commandId: string): Promise<StockCommandResult | null> {
    return (await this.receipt(userId, commandId))?.result ?? null;
  }

  private async receipt(userId: string, commandId: string): Promise<Receipt | null> {
    const { data, error } = await this.client.from('stock_commands')
      .select('command_type,payload,result').eq('user_id', userId).eq('command_id', commandId).maybeSingle();
    if (error) databaseError(error);
    return data as Receipt | null;
  }

  async preview(userId: string, recipe: RecipeReference, requestedServings?: number): Promise<RecipeStockPreview> {
    const { data, error } = await this.client.rpc('resolve_stock_recipe', { p_recipe_id: recipe.id, p_source: recipe.source });
    if (error) databaseError(error);
    if (!data) throw new StockCommandError('RECIPE_NOT_FOUND', 404);
    const resolved = data as ResolvedStockRecipe;
    const servings = requestedServings ?? resolved.servings;
    const { data: rows, error: stockError } = await this.client.from('inventory')
      .select('id,product_id,quantity,unit,stock_version,expiry_date,product:products(name,unit_type)')
      .eq('user_id', userId).order('id');
    if (stockError) databaseError(stockError);
    const lots: StockLot[] = ((rows ?? []) as InventoryRow[]).map(row => {
      const product = Array.isArray(row.product) ? row.product[0] : row.product;
      return {
      id: row.id, product_id: row.product_id, quantity: Number(row.quantity),
      unit: row.unit ?? product?.unit_type ?? null, stock_version: Number(row.stock_version),
      product_name: product?.name ?? '', expiry_date: row.expiry_date,
    }; });
    return { recipe: resolved, servings, lots, ...allocateRecipeStock(resolved.ingredients, lots, resolved.servings, servings) };
  }

  async execute(userId: string, input: unknown): Promise<StockCommandResult> {
    const command: StockCommand = StockCommandSchema.parse(input);
    // Check the receipt before reading a stock that our first attempt may have changed.
    const existing = await this.receipt(userId, command.command_id);
    if (existing) {
      if (existing.command_type !== command.command_type || canonical(existing.payload) !== canonical(command.payload)) throw new StockCommandError('IDEMPOTENCY_CONFLICT',409);
      return existing.result;
    }
    const requiresRoutine = command.command_type==='transfer_shopping' && command.payload.items.some(item => item.quantity !== undefined || item.unit !== undefined)
      || command.command_type==='consume_recipe' && (command.payload.adjustments?.length ?? 0)>0;
    if (requiresRoutine) {
      const capabilities = await this.client.rpc('stock_routine_capabilities');
      if (capabilities.error || capabilities.data!==2) throw new StockCommandError('MIGRATION_REQUIRED',503);
    }
    let allocations: unknown[] = [];
    if (command.command_type === 'consume_recipe' || command.command_type === 'recipe_add_missing') {
      const preview = await this.preview(userId, command.payload.recipe, command.payload.servings);
      if (command.command_type === 'consume_recipe') {
        if (preview.recipe.version !== command.payload.recipe_version) throw new StockCommandError('RECIPE_CHANGED',409);
        const outside = new Set(command.payload.outside_inventory);
        let actual;
        try { actual = allocateCookingStock(preview.recipe.ingredients,preview.lots,preview.recipe.servings,preview.servings,command.payload.adjustments,command.payload.outside_inventory); }
        catch { throw new StockCommandError('INVALID_ALLOCATION'); }
        if (actual.missing.some(missing => !outside.has(missing.ingredient_index))) throw new StockCommandError('INSUFFICIENT_QUANTITY',409);
        allocations = actual.allocations.filter(allocation => !outside.has(allocation.ingredient_index));
      } else {
        const unknown = preview.missing.find(missing => missing.quantity == null || missing.quantity <= 0 || ['QUANTITY_UNKNOWN','UNIT_UNKNOWN','UNIT_INCOMPATIBLE'].includes(missing.reason));
        if (unknown) throw new StockCommandError(unknown.reason);
        allocations = preview.missing.map(({ ingredient_index, quantity, unit }) => ({ ingredient_index, quantity, unit }));
      }
    }
    const { data, error } = await this.client.rpc('execute_stock_command', { p_command: command, p_allocations: allocations });
    if (error) databaseError(error);
    if (!data || data.status !== 'confirmed') throw new StockCommandError('STOCK_WRITE_FAILED',500);
    return data as StockCommandResult;
  }
}
