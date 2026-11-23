import { SHOPPING_COMMAND_TYPES, type ShoppingChange, type StockCommand, type StockCommandResult } from '@smart/shared';
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

const amount = (quantity: number | undefined, unit: string | undefined) => `${quantity ?? ''} ${unit ?? ''}`.trim();

/** What the user reads once the database confirmed a list command. */
export function describeShoppingChanges(changes: ShoppingChange[] = []): string {
  if (changes.length > 1) {
    if (changes.every(change => change.outcome === 'removed')) return `${changes.length} articles retirés des courses.`;
    if (changes.every(change => change.outcome === 'checked')) return `${changes.length} articles cochés.`;
    return `${changes.length} articles mis à jour.`;
  }
  const change = changes[0];
  if (!change) return 'Liste mise à jour.';
  const name = change.name ?? 'Produit';
  switch (change.outcome) {
    case 'merged': return `${name} : ${amount(change.added_quantity, change.unit)} ajouté, ${amount(change.quantity, change.unit)} au total.`;
    case 'created':
      if (change.note === 'unit_incompatible') return `${name} : nouvelle ligne de ${amount(change.quantity, change.unit)}, l’unité diffère de la ligne déjà prévue.`;
      if (change.note === 'purchased_pending') return `${name} : nouvelle ligne de ${amount(change.quantity, change.unit)}, l’achat précédent est déjà coché, à ranger.`;
      return `${name} ajouté aux courses.`;
    case 'checked': return `${name} coché.`;
    case 'unchecked': return `${name} remis à acheter.`;
    case 'unchanged': return `${name} est déjà dans cet état.`;
    case 'updated': return `${name} modifié.`;
    case 'removed': return `${name} retiré des courses.`;
    case 'restored': return `${name} rétabli.`;
  }
}
