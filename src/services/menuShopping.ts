/**
 * V11-01 E2 — the week's shopping: the preview read from the API, and its confirmation, saved
 * under one intention per week so that a lost reply resends the very same command.
 */
import { MenuShoppingPreviewRequestSchema, MenuShoppingPreviewSchema, type MenuShoppingPreview, type StockCommand, type StockCommandResult } from '@smart/shared';
import { ApiError, apiPost } from '@/lib/api';
import type { MenuAddMissingPayload } from '@/lib/menuShoppingReview';
import { commandForIntent, executeStockCommand, finishIntent, pendingIntent } from './stockCommands';

type MenuAddMissingCommand = Extract<StockCommand, { command_type: 'menu_add_missing' }>;

/** One saved confirmation per week. */
export const menuShoppingIntent = (week: string): string => `menu-shopping:${week}`;

/** The week's lines and tokens, checked before they are shown. */
export async function fetchMenuShoppingPreview(owner: string, week: string, signal?: AbortSignal): Promise<MenuShoppingPreview> {
  const request = MenuShoppingPreviewRequestSchema.parse({ week_start: week });
  const result = await apiPost<unknown>('/v1/menus/shopping-preview', request, { expectedUserId: owner, signal });
  const checked = MenuShoppingPreviewSchema.safeParse(result);
  if (!checked.success || checked.data.week_start !== request.week_start) {
    throw new ApiError('Les courses reçues ne correspondent pas à cette semaine. Réessaie.', { status: 503, code: 'INVALID_MENU_SHOPPING_PREVIEW' });
  }
  return checked.data;
}

/** The confirmation a lost reply left for this week, if any. */
export async function pendingMenuShopping(week: string): Promise<MenuAddMissingCommand | null> {
  const command = await pendingIntent(menuShoppingIntent(week));
  if (command && command.command_type !== 'menu_add_missing') throw new Error('Une autre action reste à vérifier pour cette semaine.');
  return command;
}

/** Sends what the user kept. A double tap or a retry reuses the saved command. */
export async function confirmMenuShopping(week: string, payload: MenuAddMissingPayload): Promise<StockCommandResult> {
  const intent = menuShoppingIntent(week);
  const command = await commandForIntent('menu_add_missing', intent, payload);
  const result = await executeStockCommand(command);
  await finishIntent(intent);
  return result;
}

/** Sends again the saved confirmation, unchanged; null when none is pending. */
export async function resendMenuShopping(week: string): Promise<StockCommandResult | null> {
  const command = await pendingMenuShopping(week);
  if (!command) return null;
  const result = await executeStockCommand(command);
  await finishIntent(menuShoppingIntent(week));
  return result;
}
