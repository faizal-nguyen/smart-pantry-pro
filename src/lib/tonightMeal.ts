import { calendarDate, type RecipeReference } from '@smart/shared';
import type { MenuEntryView, MenuMealType } from '@/hooks/useWeeklyMenu';

export interface TonightMeal {
  entry: MenuEntryView;
  /** The recipe to open: the entry's, its meal's for a leftover, or an older entry's id in automatic source. */
  reference: RecipeReference | null;
  /** The planned meal that cooking from the recipe page marks as cooked; never a leftover. */
  mealId: string | null;
  /** For a leftover, the meal it comes from, when it is in the week. */
  origin: MenuEntryView | null;
}

/** The moment of a meal, after « Prévu » : « Prévu ce soir », « Prévu pour la pause ». */
export const MEAL_MOMENT: Record<MenuMealType, string> = { breakfast: 'ce matin', lunch: 'ce midi', dinner: 'ce soir', snack: 'pour la pause' };
/** The meal of the home as a noun phrase: « Ton repas de ce soir », « Ta pause ». */
export const MEAL_TITLE: Record<MenuMealType, string> = { breakfast: 'Ton repas de ce matin', lunch: 'Ton repas de ce midi', dinner: 'Ton repas de ce soir', snack: 'Ta pause' };

/** Day of the week counted from Monday (0), in the shared zone. */
export function todayIndex(now: Date): number {
  const day = new Date(`${calendarDate(now)}T12:00:00Z`);
  return (day.getUTCDay() + 6) % 7;
}

/**
 * The meal planned today for the set meal type (V11-06 E5). A slot holds one entry at most
 * (UNIQUE(meal_plan_id, day_of_week, meal_type)). The recipe follows the menu grid's rules
 * (MenuEntryCard): a leftover opens its meal's recipe and is never the meal to mark as cooked.
 */
export function tonightMeal(entries: readonly MenuEntryView[], dayIndex: number, mealType: MenuMealType): TonightMeal | null {
  const entry = entries.find(item => item.day_of_week === dayIndex && item.meal_type === mealType);
  if (!entry) return null;
  const origin = entry.leftover_of ? entries.find(item => item.id === entry.leftover_of) ?? null : null;
  const source = entry.leftover_of ? origin : entry;
  const reference = source ? source.recipe_reference ?? (source.recipe_id ? { id: source.recipe_id, source: 'auto' as const } : null) : null;
  const mealId = !entry.leftover_of && entry.recipe_reference ? entry.id : null;
  return { entry, reference, mealId, origin };
}
