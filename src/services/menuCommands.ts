/**
 * V11-01 E3b — menu edits (update_menu), saved under one intention per gesture so that a lost reply
 * is sent again under its identity, never doubled.
 */
import type { MenuOperation, StockCommandResult } from '@smart/shared';
import { commandForIntent, executeStockCommand, finishIntent, pendingIntents } from './stockCommands';
import { isRolledBackRefusal } from './stockCommandRefusal';

const INTENT_PREFIX = 'menu-edit:';

export type MenuEntryOperation = Extract<MenuOperation, { entry_id: string }>;

/**
 * One gesture: a meal, at the version the menu showed, with its values. A double tap reuses its command;
 * another value (« − » after a « + » whose reply was lost) is another gesture, not one left blocked.
 */
export function menuEditIntent(operation: MenuEntryOperation): string {
  const { entry_id, expected_version, ...values } = operation;
  return `${INTENT_PREFIX}${entry_id}:${expected_version}:${JSON.stringify(values)}`;
}

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** FNV-1a, 32 bits: a short, stable name for a long payload (not a security measure). */
function digest(value: string): string {
  let hash = FNV_OFFSET;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * V11-01 E3c — a week copy: one gesture per target week and operations (versions included). Under the
 * same prefix, a copy left pending is sent again when Menus opens. A different copy, should two digests
 * meet, is refused by commandForIntent (payload mismatch), never sent under the other's identity.
 */
export function menuCopyIntent(targetWeek: string, operations: MenuOperation[]): string {
  return `${INTENT_PREFIX}copy:${targetWeek}:${digest(JSON.stringify(operations))}`;
}

/** Sends the edit; a lost reply keeps it saved under its gesture. */
export async function updateMenu(intent: string, operations: MenuOperation[]): Promise<StockCommandResult> {
  const command = await commandForIntent('update_menu', intent, { operations });
  const result = await executeStockCommand(command);
  await finishIntent(intent);
  return result;
}

/** What became of the edits a lost reply had left pending. */
export interface MenuResumeOutcome { confirmed: StockCommandResult[]; refused: number; failures: unknown[] }

/** Sends again the edits left pending, under their identity: the server returns or applies them once. */
export async function resumePendingMenuEdits(): Promise<MenuResumeOutcome> {
  const outcome: MenuResumeOutcome = { confirmed: [], refused: 0, failures: [] };
  for (const { intent, command } of await pendingIntents(INTENT_PREFIX)) {
    if (command.command_type !== 'update_menu') continue;
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
