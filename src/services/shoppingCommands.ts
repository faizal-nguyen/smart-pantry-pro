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

/** What became of the list commands a lost reply had left pending. */
export interface ResumeOutcome {
  /** Ran now, or had already run: their receipts. */
  confirmed: StockCommandResult[];
  /** Refused without effect (row changed or gone); their intention is dropped. */
  refused: number;
  /** Still unconfirmed (network, server, session): their intention is kept. */
  failures: unknown[];
}

/**
 * Sends again the list commands a lost reply left pending, under their identity: the server
 * returns the receipt of one that ran, or runs it now. Nothing is dropped without being counted.
 */
export async function resumePendingShoppingCommands(): Promise<ResumeOutcome> {
  const outcome: ResumeOutcome = { confirmed: [], refused: 0, failures: [] };
  for (const { intent, command } of await pendingIntents(INTENT_PREFIX)) {
    try {
      outcome.confirmed.push(await executeStockCommand(command));
      await finishIntent(intent);
    } catch (failure) {
      if (isRolledBackRefusal(failure)) outcome.refused++;
      else outcome.failures.push(failure);
    }
  }
  return outcome;
}
