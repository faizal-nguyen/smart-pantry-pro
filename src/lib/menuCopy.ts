/**
 * V11-01 E3c (D4) — copying a week: each meal with a recipe is `set` in the same slot of the target
 * week, in one update_menu command (28 slots at most, 30 operations allowed). Leftovers are not copied.
 * A meal already planned there is kept unless the user chose to replace it; a cooked one is always kept
 * (update_menu refuses to replace it, which would refuse the whole copy).
 */
import type { MenuOperation, StockCommandResult } from '@smart/shared';
import type { MenuEntryView } from '@/hooks/useWeeklyMenu';
import { menuWeekLabel, shiftMenuWeek } from '@/lib/menuWeek';
import { slotDate, slotMoment, type MenuSlotRef } from '@/lib/menuEdit';

export type MenuSetOperation = Extract<MenuOperation, { op: 'set' }>;

/** A slot of the target week that already holds a meal. */
export interface CopyConflict {
  slot: MenuSlotRef;
  source: MenuEntryView;
  target: MenuEntryView;
  /** Cooked: always kept. */
  cooked: boolean;
  /** The leftovers that go with the target meal if it is replaced. */
  leftovers: number;
  replaced: boolean;
}

export interface WeekCopyPlan {
  operations: MenuSetOperation[];
  copied: number;
  conflicts: CopyConflict[];
  kept: number;
  skippedLeftovers: number;
  skippedWithoutRecipe: number;
}

const WEEKS_BEFORE = 4;
const WEEKS_AFTER = 8;

const sameSlot = (a: MenuSlotRef, b: MenuSlotRef) => a.day_of_week === b.day_of_week && a.meal_type === b.meal_type;

/** The recipe a meal can be planned again with; an older meal has only its recipe_id. */
function recipeOf(entry: MenuEntryView): MenuSetOperation['recipe'] | null {
  if (entry.leftover_of) return null;
  if (entry.recipe_reference) return { id: entry.recipe_reference.id, source: entry.recipe_reference.source };
  return entry.recipe_id ? { id: entry.recipe_id, source: 'auto' } : null;
}

export function planWeekCopy(source: MenuEntryView[], target: MenuEntryView[], targetWeek: string, replace: boolean): WeekCopyPlan {
  const copyable = source.filter(entry => recipeOf(entry)).sort((a, b) => slotMoment(a) - slotMoment(b));
  const leftoversOf = (entry: MenuEntryView) => target.filter(item => item.leftover_of === entry.id);
  // A replaced meal takes its leftovers with it (in order: a leftover comes after its meal), so a copy
  // into their slots finds them empty.
  const replacedIds = new Set(replace
    ? copyable.map(entry => target.find(item => sameSlot(item, entry))).filter((item): item is MenuEntryView => !!item && !item.cooked_command_id).map(item => item.id)
    : []);
  const operations: MenuSetOperation[] = [];
  const conflicts: CopyConflict[] = [];
  for (const entry of copyable) {
    const occupant = target.find(item => sameSlot(item, entry)) ?? null;
    const goneWithItsMeal = !!occupant?.leftover_of && replacedIds.has(occupant.leftover_of);
    if (occupant && !goneWithItsMeal) {
      const cooked = !!occupant.cooked_command_id;
      const replaced = replace && !cooked;
      conflicts.push({ slot: { day_of_week: entry.day_of_week, meal_type: entry.meal_type }, source: entry, target: occupant, cooked,
        leftovers: leftoversOf(occupant).length, replaced });
      if (!replaced) continue;
    }
    operations.push({ op: 'set', date: slotDate(targetWeek, entry.day_of_week), meal_type: entry.meal_type, recipe: recipeOf(entry)!,
      servings: entry.servings, expected_version: occupant && !goneWithItsMeal ? occupant.version : null });
  }
  return {
    operations, copied: operations.length, conflicts, kept: conflicts.filter(conflict => !conflict.replaced).length,
    skippedLeftovers: source.filter(entry => entry.leftover_of).length,
    skippedWithoutRecipe: source.filter(entry => !entry.leftover_of && !recipeOf(entry)).length,
  };
}

/** Four weeks before and eight after, in order; never the week itself. */
export function copyTargetWeeks(sourceWeek: string): string[] {
  return Array.from({ length: WEEKS_BEFORE + WEEKS_AFTER + 1 }, (_, index) => index - WEEKS_BEFORE)
    .filter(offset => offset !== 0)
    .map(offset => shiftMenuWeek(sourceWeek, offset));
}

/**
 * « 5 repas copiés vers la semaine du 7 → 13 déc. 1 repas remplacé, 2 restes retirés. » What was removed
 * comes from the receipt: a replaced meal's leftovers go wherever they are, another week included.
 */
export function copyMessage(copied: number, targetWeek: string, removed: NonNullable<StockCommandResult['menu_edit']>['removed'] = []): string {
  const week = menuWeekLabel(targetWeek);
  const head = `${copied} repas copié${copied > 1 ? 's' : ''} vers la ${week.charAt(0).toLocaleLowerCase('fr')}${week.slice(1)}`;
  const leftovers = removed.filter(row => row.leftover_of).length;
  const meals = removed.length - leftovers;
  const parts = [
    meals ? `${meals} repas remplacé${meals > 1 ? 's' : ''}` : '',
    leftovers ? `${leftovers} reste${leftovers > 1 ? 's' : ''} retiré${leftovers > 1 ? 's' : ''}` : '',
  ].filter(Boolean);
  return parts.length ? `${head} ${parts.join(', ')}.` : head;
}
