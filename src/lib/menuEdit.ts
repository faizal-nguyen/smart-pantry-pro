/**
 * V11-01 E3b — what the menu card may do, from the week as loaded: servings bounds, the slots a meal
 * may move to (with the order of its leftovers, D6), the slots a leftover may take, and the words of
 * each outcome. The server checks it all again (update_menu); these only shape the screen.
 */
import type { MenuEntryView, MenuMealType } from '@/hooks/useWeeklyMenu';

export interface MenuSlotRef { day_of_week: number; meal_type: MenuMealType }
export interface MoveOption extends MenuSlotRef {
  /** The meal in that slot, swapped with the one moved. */
  occupant: MenuEntryView | null;
  /** Why the move would break the order of a leftover, or null. */
  blocked: string | null;
}

export const MEALS: MenuMealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
export const MEAL_LABELS: Record<MenuMealType, string> = { breakfast: 'Petit-déjeuner', lunch: 'Déjeuner', dinner: 'Dîner', snack: 'Collation' };
export const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MAX_SERVINGS = 100;
const DAY_MS = 86_400_000;
// The meal moved is « ce repas » / « ce reste »; the one it would swap with is named.
const AFTER_MEAL = 'Ce reste doit venir après son repas d’origine.';
const BEFORE_LEFTOVERS = 'Ce repas doit venir avant ses restes.';
const swapRefused = (item: MenuEntryView, reason: string) => `« ${item.recipe_name} » doit venir ${reason} : l’échange est impossible.`;
const REFUSALS: Record<string, string> = {
  MENU_CHANGED: 'Ce repas a changé entre-temps : le menu a été relu.',
  LEFTOVER_ORDER: 'Un reste doit rester après son repas d’origine : le menu a été relu.',
  LEFTOVER_CAPACITY: 'Les restes dépasseraient les portions du repas d’origine : le menu a été relu.',
  MEAL_COOKED: 'Ce repas a déjà été cuisiné : annule d’abord sa cuisson.',
  UNDO_CONFLICT: 'Le menu a changé depuis : cette modification ne peut plus être annulée.',
  ALREADY_UNDONE: 'Cette modification est déjà annulée.',
};

/** Breakfast to snack, Monday to Sunday: the order of the week. */
export const slotMoment = (slot: MenuSlotRef): number => slot.day_of_week * MEALS.length + MEALS.indexOf(slot.meal_type);
const sameSlot = (a: MenuSlotRef, b: MenuSlotRef) => a.day_of_week === b.day_of_week && a.meal_type === b.meal_type;
const leftoversOf = (entry: MenuEntryView, entries: MenuEntryView[]) => entries.filter(item => item.leftover_of === entry.id);
const sumServings = (items: MenuEntryView[]) => items.reduce((total, item) => total + item.servings, 0);

/** « Mercredi · déjeuner ». */
export function slotLabel(slot: MenuSlotRef): string {
  return `${DAY_LABELS[slot.day_of_week]} · ${MEAL_LABELS[slot.meal_type].toLocaleLowerCase('fr')}`;
}

/** The day of a slot of the week starting on `weekStart` (AAAA-MM-JJ). */
export function slotDate(weekStart: string, dayOfWeek: number): string {
  return new Date(Date.parse(`${weekStart}T12:00:00Z`) + dayOfWeek * DAY_MS).toISOString().slice(0, 10);
}

/** A meal keeps at least the servings of its leftovers; a leftover at most what its meal leaves. */
export function servingsBounds(entry: MenuEntryView, entries: MenuEntryView[]): { min: number; max: number } {
  if (!entry.leftover_of) return { min: Math.max(1, sumServings(leftoversOf(entry, entries))), max: MAX_SERVINGS };
  const origin = entries.find(item => item.id === entry.leftover_of);
  if (!origin) return { min: 1, max: MAX_SERVINGS };
  return { min: 1, max: origin.servings - sumServings(leftoversOf(origin, entries).filter(item => item.id !== entry.id)) };
}

/** The servings a meal can still give as leftovers. */
export function leftoverCapacity(entry: MenuEntryView, entries: MenuEntryView[]): number {
  return entry.servings - sumServings(leftoversOf(entry, entries));
}

/** Why `entry` cannot stand at `moment` once `other` (if any) stands at `otherMoment`, or null. */
function orderProblem(entry: MenuEntryView, moment: number, entries: MenuEntryView[], other: MenuEntryView | null, otherMoment: number): 'after' | 'before' | null {
  const momentOf = (item: MenuEntryView) => (other && item.id === other.id ? otherMoment : slotMoment(item));
  const origin = entry.leftover_of ? entries.find(item => item.id === entry.leftover_of) : undefined;
  if (origin && moment <= momentOf(origin)) return 'after';
  if (leftoversOf(entry, entries).some(leftover => momentOf(leftover) <= moment)) return 'before';
  return null;
}

/** Every other slot of the week: an occupied one swaps both meals, each keeping the order of its leftovers. */
export function moveOptions(entry: MenuEntryView, entries: MenuEntryView[]): MoveOption[] {
  const from = slotMoment(entry);
  return Array.from({ length: DAY_LABELS.length }, (_, day) => MEALS.map(meal_type => ({ day_of_week: day, meal_type })))
    .flat()
    .filter(slot => !sameSlot(slot, entry))
    .map(slot => {
      const occupant = entries.find(item => item.id !== entry.id && sameSlot(item, slot)) ?? null;
      const to = slotMoment(slot);
      const own = orderProblem(entry, to, entries, occupant, from);
      const theirs = occupant && !own ? orderProblem(occupant, from, entries, entry, to) : null;
      const blocked = own === 'after' ? AFTER_MEAL : own === 'before' ? BEFORE_LEFTOVERS
        : occupant && theirs ? swapRefused(occupant, theirs === 'after' ? 'après son repas d’origine' : 'avant ses restes') : null;
      return { ...slot, occupant, blocked };
    });
}

/** The empty slots of the week after the meal, where a leftover may go. */
export function leftoverOptions(entry: MenuEntryView, entries: MenuEntryView[]): MenuSlotRef[] {
  const from = slotMoment(entry);
  return Array.from({ length: DAY_LABELS.length }, (_, day) => MEALS.map(meal_type => ({ day_of_week: day, meal_type })))
    .flat()
    .filter(slot => slotMoment(slot) > from && !entries.some(item => sameSlot(item, slot)));
}

export type MenuChange =
  | { kind: 'servings'; entry: MenuEntryView; servings: number }
  | { kind: 'move'; entry: MenuEntryView; slot: MenuSlotRef; occupant: MenuEntryView | null }
  | { kind: 'leftover'; entry: MenuEntryView; slot: MenuSlotRef; servings: number }
  | { kind: 'remove'; entry: MenuEntryView; removed: number };

const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? 's' : ''}`;

/** What the user reads once the change is confirmed. */
export function changeMessage(change: MenuChange): string {
  const name = `« ${change.entry.recipe_name} »`;
  switch (change.kind) {
    case 'servings': return `${name} : ${plural(change.servings, 'portion')}.`;
    case 'move': return change.occupant ? `${name} et « ${change.occupant.recipe_name} » échangés.` : `${name} déplacé : ${slotLabel(change.slot).toLocaleLowerCase('fr')}.`;
    case 'leftover': return `Reste prévu : ${slotLabel(change.slot).toLocaleLowerCase('fr')}, ${plural(change.servings, 'portion')}.`;
    case 'remove': return change.removed > 1 ? `${name} retiré du menu, avec ${plural(change.removed - 1, 'reste')}.` : `${name} retiré du menu.`;
  }
}

const UNCONFIRMED = 'La modification n’est pas confirmée : vérifie ta connexion. Elle sera vérifiée à la prochaine ouverture de Menus.';
const errorCode = (error: unknown) => String((error as { code?: unknown } | null)?.code);
const errorStatus = (error: unknown) => (error as { status?: unknown } | null)?.status;

/**
 * A refusal as the user reads it. Without a reply (network, server), the edit may have been applied: it
 * stays saved and is sent again under its identity when Menus opens. Any other error keeps its message.
 */
export function menuRefusal(error: unknown): string {
  const status = errorStatus(error);
  if (typeof status === 'number' && (status === 0 || status >= 500)) return UNCONFIRMED;
  return REFUSALS[errorCode(error)] ?? (error instanceof Error ? error.message : 'Action non confirmée.');
}

/** A copy refused because the target week moved on since it was read: it is reread, the copy recomputed. */
export function copyRefusal(error: unknown): string {
  const code = errorCode(error);
  if (code === 'MENU_CHANGED' || code === 'MEAL_COOKED') return 'La semaine choisie a changé entre-temps : la copie a été recalculée. Vérifie-la, puis recommence.';
  return menuRefusal(error);
}

/** An undo refused because the menu moved on since the edit. */
export function undoRefusal(error: unknown): string {
  const code = errorCode(error);
  if (code === 'MEAL_COOKED') return 'Ce repas a été cuisiné depuis : cette modification ne peut plus être annulée.';
  if (code === 'MENU_CHANGED') return REFUSALS.UNDO_CONFLICT;
  return menuRefusal(error);
}
