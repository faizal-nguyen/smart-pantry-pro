import { useCallback, useEffect, useRef, useState } from 'react';
import { useRefreshWeeklyMenu, type MenuEntryView } from '@/hooks/useWeeklyMenu';
import { changeMessage, copyRefusal, menuRefusal, proposalRefusal, slotDate, undoRefusal, type MenuChange, type MenuSlotRef } from '@/lib/menuEdit';
import { copyMessage, type WeekCopyPlan } from '@/lib/menuCopy';
import { addedMessage } from '@/lib/weekProposal';
import type { MenuSetOperation } from '@/lib/menuCopy';
import { menuCopyIntent, menuEditIntent, menuProposalIntent, resumePendingMenuEdits, updateMenu, type MenuEntryOperation, type ProposalCheck } from '@/services/menuCommands';
import { isRolledBackRefusal } from '@/services/stockCommandRefusal';
import { undoStockCommand } from '@/services/stockCommands';

/** The last edit the database confirmed, which undo_stock can take back. */
export interface MenuChangeNotice { commandId: string; message: string; undone: boolean }
/** E4b: a proposal added (its notice), refused (to recompute) or unconfirmed (to send again as it was). */
export interface ProposalOutcome { notice: MenuChangeNotice | null; failure: 'refused' | 'unconfirmed' | null }

const RESUME_DONE = 'Une modification précédente du menu vient d’être confirmée : le menu est à jour.';
const RESUME_REFUSED = 'Une modification précédente du menu n’a pas pu être appliquée : le menu avait changé. Il est à jour.';
const RESUME_PENDING = 'Une modification précédente du menu n’est pas encore confirmée. Vérifie ta connexion, puis rouvre Menus.';
const UNDONE = 'Modification annulée : le menu est revenu comme avant.';
/** The busy mark of a week copy: no meal of the shown week is the one edited, all of them wait. */
export const COPY_ID = 'copy-week';
/** The busy mark of a proposal being added. */
export const PROPOSAL_ID = 'week-proposal';

/**
 * V11-01 E3b — the menu's edits from the page: one at a time, each confirmed by update_menu with the
 * version the menu showed, then offered for undo. A refusal rereads the menu and says why.
 */
export function useMenuEdit(initialChange: MenuChangeNotice | null = null) {
  const refresh = useRefreshWeeklyMenu();
  const [busyId, setBusyId] = useState<string | null>(null);
  // E4b: a proposal added on its own page is announced here, with « Annuler ».
  const [lastChange, setLastChange] = useState<MenuChangeNotice | null>(initialChange);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);

  // The menu reread after an edit: refetchQueries reports a failed load on the query itself (the page shows
  // it), so a rejection here would only be an unhandled one.
  const reread = useCallback(async () => {
    try { await refresh(); } catch { /* the menu query holds the load error */ }
  }, [refresh]);

  // Edits a lost reply left pending are sent again, under their identity, when Menus opens.
  useEffect(() => {
    let active = true;
    resumePendingMenuEdits().then(outcome => {
      if (!active) return;
      if (outcome.failures.length) setError(RESUME_PENDING);
      else if (outcome.refused) setError(RESUME_REFUSED);
      const confirmed = outcome.confirmed[outcome.confirmed.length - 1];
      if (confirmed) setLastChange({ commandId: confirmed.command_id, message: RESUME_DONE, undone: false });
      if (outcome.refused || outcome.confirmed.length) void reread();
    }).catch(failure => { if (active) setError(menuRefusal(failure)); });
    return () => { active = false; };
  }, [reread]);

  /**
   * One edit at a time (the page holds every card's controls meanwhile). The controls wait until the menu
   * is reread, so that the next tap carries the version this edit gave.
   */
  const exclusive = useCallback(async (entryId: string, action: () => Promise<void>, describe: (failure: unknown) => string = menuRefusal): Promise<boolean> => {
    if (running.current) return false;
    running.current = true; setBusyId(entryId); setError(null);
    try { await action(); await reread(); return true; }
    catch (failure) {
      setError(describe(failure));
      if (isRolledBackRefusal(failure)) await reread();
      return false;
    } finally { running.current = false; setBusyId(null); }
  }, [reread]);

  const send = useCallback((entry: MenuEntryView, operation: MenuEntryOperation, change: (removed: number) => MenuChange) =>
    exclusive(entry.id, async () => {
      const result = await updateMenu(menuEditIntent(operation), [operation]);
      setLastChange({ commandId: result.command_id, message: changeMessage(change(result.menu_edit?.removed.length ?? 1)), undone: false });
    }), [exclusive]);

  const setServings = useCallback((entry: MenuEntryView, servings: number) =>
    send(entry, { op: 'servings', entry_id: entry.id, expected_version: entry.version, servings }, () => ({ kind: 'servings', entry, servings })), [send]);

  const move = useCallback((entry: MenuEntryView, weekStart: string, slot: MenuSlotRef, occupant: MenuEntryView | null) =>
    send(entry, { op: 'move', entry_id: entry.id, expected_version: entry.version, date: slotDate(weekStart, slot.day_of_week), meal_type: slot.meal_type,
      target_version: occupant?.version ?? null }, () => ({ kind: 'move', entry, slot, occupant })), [send]);

  const addLeftover = useCallback((entry: MenuEntryView, weekStart: string, slot: MenuSlotRef, servings: number) =>
    send(entry, { op: 'leftover', entry_id: entry.id, expected_version: entry.version, date: slotDate(weekStart, slot.day_of_week), meal_type: slot.meal_type,
      servings }, () => ({ kind: 'leftover', entry, slot, servings })), [send]);

  const remove = useCallback((entry: MenuEntryView) =>
    send(entry, { op: 'remove', entry_id: entry.id, expected_version: entry.version }, removed => ({ kind: 'remove', entry, removed })), [send]);

  /** V11-01 E3c: the week's copy, in one command; nothing to copy sends nothing. */
  const copyWeek = useCallback((targetWeek: string, plan: WeekCopyPlan) => {
    if (!plan.operations.length) return Promise.resolve(false);
    return exclusive(COPY_ID, async () => {
      const result = await updateMenu(menuCopyIntent(targetWeek, plan.operations), plan.operations);
      setLastChange({ commandId: result.command_id, message: copyMessage(plan.operations.length, targetWeek, result.menu_edit?.removed), undone: false });
    }, copyRefusal);
  }, [exclusive]);

  /**
   * V11-01 E4b: a proposal validated as one update_menu naming what it was computed with. Returns the
   * notice, which the proposal page hands to Menus, or why it is not added: refused (rolled back: to
   * recompute) or unconfirmed (no reply: the very same addition is sent again, never recomputed).
   */
  const addProposal = useCallback(async (weekStart: string, proposalId: string, operations: MenuSetOperation[], proposal: ProposalCheck): Promise<ProposalOutcome> => {
    if (!operations.length) return { notice: null, failure: null };
    let notice: MenuChangeNotice | null = null;
    let failure: ProposalOutcome['failure'] = null;
    await exclusive(PROPOSAL_ID, async () => {
      const result = await updateMenu(menuProposalIntent(weekStart, proposalId, operations), operations, proposal);
      notice = { commandId: result.command_id, message: addedMessage(operations.length, weekStart), undone: false };
      setLastChange(notice);
    }, error => {
      failure = isRolledBackRefusal(error) ? 'refused' : 'unconfirmed';
      return proposalRefusal(error);
    });
    return { notice, failure };
  }, [exclusive]);

  const undoLast = useCallback(() => {
    const change = lastChange;
    if (!change || change.undone) return Promise.resolve(false);
    return exclusive(change.commandId, async () => {
      try {
        await undoStockCommand(change.commandId);
      } catch (failure) {
        // Already taken back: say so. Refused because the menu moved on: « Annuler » can no longer work.
        if ((failure as { code?: unknown } | null)?.code !== 'ALREADY_UNDONE') {
          if (isRolledBackRefusal(failure)) setLastChange(null);
          throw failure;
        }
      }
      setLastChange({ ...change, message: UNDONE, undone: true });
    }, undoRefusal);
  }, [exclusive, lastChange]);

  /** Puts the notice and the refusal away; the edit stays confirmed. */
  const dismiss = useCallback(() => { setLastChange(null); setError(null); }, []);
  /** A dialog opens on a clean slate: an older refusal is not about it. The notice stays. */
  const clearError = useCallback(() => setError(null), []);

  return { busyId, lastChange, error, setServings, move, addLeftover, remove, copyWeek, addProposal, undoLast, dismiss, clearError };
}
