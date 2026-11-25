import type { SupabaseClient } from '@supabase/supabase-js';
import {
  allocateRecipeStock, allocateCookingStock, canAddToShoppingList, needsPurchase, StockCommandSchema,
  SHOPPING_COMMAND_TYPES, SHOPPING_COMMANDS_CAPABILITY, MENU_COMMANDS_CAPABILITY, MENU_EDIT_CAPABILITY, RECEIPT_COMMANDS_CAPABILITY,
  type RecipeReference, type RecipeStockPreview, type ResolvedStockRecipe,
  type StockCommand, type StockCommandResult, type StockLot,
} from '@smart/shared';
import { NutritionProfileService, ProfileError } from '../recommendations/NutritionProfileService.js';

const MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Reconnecte-toi pour reprendre cette action.',
  ITEM_NOT_FOUND: 'Ce produit ou cet achat n’est plus disponible. Actualise la liste.',
  RECIPE_NOT_FOUND: 'Cette recette n’est plus accessible.',
  RECIPE_CHANGED: 'La recette a changé. Vérifie à nouveau les ingrédients.',
  CONFLICT: 'Le stock ou l’achat a changé. Actualise avant de confirmer.',
  INSUFFICIENT_QUANTITY: 'La quantité disponible ne suffit plus. Vérifie ton stock.',
  QUANTITY_UNKNOWN: 'Une quantité reste à renseigner ou à déclarer hors inventaire.',
  UNIT_UNKNOWN: 'Une unité reste à vérifier.',
  UNIT_INCOMPATIBLE: 'Ces unités ne sont pas convertibles sans information supplémentaire.',
  UNDO_CONFLICT: 'Le stock a changé depuis cette action. L’annulation écraserait une correction.',
  MENU_CHANGED: 'Ce repas a changé dans le menu entre-temps : rien n’a été modifié. Relis le menu avant de recommencer.',
  ALREADY_UNDONE: 'Cette action a déjà été annulée.',
  IDEMPOTENCY_CONFLICT: 'Cette action a déjà un résultat différent. Vérifie son état avant de continuer.',
  INVALID_ALLOCATION: 'Les ingrédients ne correspondent plus au stock sélectionné.',
  INVALID_QUANTITY: 'Vérifie les quantités et les portions.',
  COMMAND_NOT_FOUND: 'Cette opération n’est plus accessible.',
  MIGRATION_REQUIRED: 'Cette action n’est pas encore disponible. Tes données et ta demande sont conservées.',
  INVALID_COMMAND: 'Les données de cette action sont invalides. Vérifie les champs avant de réessayer.',
  DUPLICATE_ITEM: 'Le même article figure deux fois dans cette action.',
  STOCK_CHANGED: 'Le stock ou la liste a changé depuis le calcul des courses. Recalcule avant de confirmer.',
  ALREADY_COOKED: 'Ce repas est déjà marqué cuisiné.',
  MEAL_COOKED: 'Ce repas a déjà été cuisiné : annule d’abord sa cuisson.',
  LEFTOVER_CAPACITY: 'Les restes dépasseraient les portions du repas d’origine.',
  LEFTOVER_ORDER: 'Un reste doit rester après son repas d’origine.',
  // V11-01 E4a: a proposed week, validated or previewed.
  PROPOSAL_EXPIRED: 'Cette proposition a expiré : recalcule-la avant de la valider.',
  PROFILE_CHANGED: 'Ton profil a changé depuis la proposition : recalcule-la avant de la valider.',
  INVALID_PROPOSAL: 'Cette proposition porte sur un jour déjà passé : recalcule-la.',
  PROFILE_UNAVAILABLE: 'Ton profil ne peut pas être lu pour le moment : réessaie dans un instant.',
  // V11-01 E5a: a receipt applied to the list.
  RECEIPT_ALREADY_APPLIED: 'Ce ticket a déjà été rapproché de ta liste.',
  RECEIPT_NOT_FOUND: 'Ce ticket n’est plus disponible : scanne-le à nouveau.',
};

export class StockCommandError extends Error {
  constructor(public readonly code: string, public readonly status = 400) {
    super(MESSAGES[code] ?? 'Impossible de confirmer cette action. Tes données sont conservées.');
    this.name = 'StockCommandError';
  }
}

/** Maps a stock command or menu basis RPC error to the API's codes (also used by MenuShoppingService). */
export function databaseError(error: { message: string; code?: string }): never {
  const code = Object.keys(MESSAGES).find(key => error.message === key || error.message.startsWith(`${key}:`));
  if (code) throw new StockCommandError(code, code === 'UNAUTHORIZED' ? 401 : ['CONFLICT','RECIPE_CHANGED','UNDO_CONFLICT','MENU_CHANGED','IDEMPOTENCY_CONFLICT','ALREADY_UNDONE',
    'STOCK_CHANGED','ALREADY_COOKED','MEAL_COOKED','LEFTOVER_CAPACITY','LEFTOVER_ORDER','RECEIPT_ALREADY_APPLIED'].includes(code) ? 409 : 400);
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

  private async checkProposal(userId: string, proposal: { profile_version?: number; expires_at?: string }): Promise<void> {
    if (!(Date.parse(String(proposal.expires_at)) > Date.now())) throw new StockCommandError('PROPOSAL_EXPIRED', 409);
    // A profile that cannot be read is answered as unavailable (nothing written), never as a failed write.
    const { profile } = await new NutritionProfileService(this.client).read(userId).catch((error: unknown) => {
      if (error instanceof ProfileError) throw new StockCommandError(error.code === 'MIGRATION_REQUIRED' ? 'MIGRATION_REQUIRED' : 'PROFILE_UNAVAILABLE', 503);
      throw error;
    });
    // A legacy profile (user_meal_preferences) stays at version 0: its edits are not seen here, nor by the engine.
    if (profile.version !== proposal.profile_version) throw new StockCommandError('PROFILE_CHANGED', 409);
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
    const requiresMetadata=(command.command_type==='transfer_shopping' || command.command_type==='adjust_inventory') && command.payload.items.some(item=>item.date_kind!==undefined || item.quantity_quality!==undefined);
    // V11-05 E2: an older database would refuse these types; the client keeps the request (503).
    const requiresShopping = (SHOPPING_COMMAND_TYPES as readonly string[]).includes(command.command_type);
    // V11-01 E1: a week's shopping, and cooking linked to a planned meal.
    const requiresMenu = command.command_type==='menu_add_missing'
      || command.command_type==='consume_recipe' && command.payload.meal_plan_entry_id!==undefined;
    // V11-01 E3: the editable menu.
    const requiresMenuEdit = command.command_type==='update_menu';
    // V11-01 E5a: a receipt applied to the list.
    const requiresReceipt = command.command_type==='reconcile_receipt';
    if (requiresRoutine || requiresMetadata || requiresShopping || requiresMenu || requiresMenuEdit || requiresReceipt) {
      const required = requiresReceipt ? RECEIPT_COMMANDS_CAPABILITY : requiresMenuEdit ? MENU_EDIT_CAPABILITY : requiresMenu ? MENU_COMMANDS_CAPABILITY
        : requiresShopping ? SHOPPING_COMMANDS_CAPABILITY : requiresMetadata ? 3 : 2;
      const capabilities = await this.client.rpc('stock_routine_capabilities');
      if (capabilities.error || typeof capabilities.data!=='number' || capabilities.data<required) throw new StockCommandError('MIGRATION_REQUIRED',503);
    }
    // V11-01 E4a: after the receipt (a command sent again returns what it did), a proposed week is
    // written only while it is valid and on the profile it was computed with; its slots' versions
    // guard the menu itself (MENU_CHANGED).
    if (command.command_type==='update_menu' && command.payload.proposal) await this.checkProposal(userId, command.payload.proposal);
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
        // Products in stock with an amount to verify are not bought again; unmeasured
        // amounts are left to the user (the client names them) unless nothing else can be added.
        const toBuy = preview.missing.filter(needsPurchase);
        const addable = toBuy.filter(canAddToShoppingList);
        const unknown = toBuy.find(missing => !canAddToShoppingList(missing));
        if (!addable.length && unknown) throw new StockCommandError(unknown.quantity == null || unknown.quantity <= 0 ? 'QUANTITY_UNKNOWN' : 'UNIT_UNKNOWN');
        allocations = addable.map(({ ingredient_index, quantity, unit }) => ({ ingredient_index, quantity, unit }));
      }
    }
    const { data, error } = await this.client.rpc('execute_stock_command', { p_command: command, p_allocations: allocations });
    if (error) databaseError(error);
    if (!data || data.status !== 'confirmed') throw new StockCommandError('STOCK_WRITE_FAILED',500);
    return data as StockCommandResult;
  }
}
