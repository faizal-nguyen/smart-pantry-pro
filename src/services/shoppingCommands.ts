import { SHOPPING_COMMAND_TYPES, type StockCommand, type StockCommandResult } from '@smart/shared';
import { executeStockCommand, finishIntent, pendingIntents } from './stockCommands';
import { isRolledBackRefusal } from './stockCommandRefusal';

/** Saved list intentions, apart from the transfer (`shopping-transfer`) that has its own review. */
const INTENT_PREFIX = 'shopping-list:';

/** The saved-intention key of a list gesture (one per gesture: a double tap reuses its command). */
export const shoppingIntent = (gesture: string): string => INTENT_PREFIX + gesture;

/** Sends one list command saved under its intention: a lost reply is replayed, never doubled. */
export async function sendShoppingCommand(intent: string, command: StockCommand): Promise<StockCommandResult> {
  if (!(SHOPPING_COMMAND_TYPES as readonly string[]).includes(command.command_type)) throw new Error('Cette action ne concerne pas la liste de courses.');
  const result = await executeStockCommand(command);
  await finishIntent(intent);
  return result;
}

/**
 * Sends again the list commands a lost reply left pending, under their identity: the server
 * returns the receipt of one that ran, or runs it now. A refused one is dropped with its intent.
 */
export async function resumePendingShoppingCommands(): Promise<{ resumed: number; failures: unknown[] }> {
  let resumed = 0;
  const failures: unknown[] = [];
  for (const { intent, command } of await pendingIntents(INTENT_PREFIX)) {
    try {
      await executeStockCommand(command);
      await finishIntent(intent);
      resumed++;
    } catch (failure) {
      if (!isRolledBackRefusal(failure)) failures.push(failure);
    }
  }
  return { resumed, failures };
}
