import { todayIndex, tonightMeal } from '../tonightMeal';
import type { MenuEntryView } from '@/hooks/useWeeklyMenu';

const RECIPE = '30000000-0000-4000-8000-000000000001';
const entry = (id: string, day: number, meal_type: MenuEntryView['meal_type'], patch: Partial<MenuEntryView> = {}): MenuEntryView => ({
  id, day_of_week: day, meal_type, recipe_id: RECIPE, recipe_reference: { id: RECIPE, source: 'recipes' }, recipe_name: `Repas ${id}`,
  servings: 4, prep_time: 10, cook_time: 15, version: 0, cooked_command_id: null, leftover_of: null, ...patch,
});

describe('tonight meal', () => {
  test('today is counted from Monday in the shared zone, whatever the device clock', () => {
    expect(todayIndex(new Date('2026-11-25T10:00:00+01:00'))).toBe(2); // Wednesday
    expect(todayIndex(new Date('2026-11-29T23:30:00Z'))).toBe(0); // Monday 00:30 in Paris
  });

  test('the slot of today for the set meal is chosen, other days and meals are not', () => {
    const entries = [entry('lunch', 2, 'lunch'), entry('dinner', 2, 'dinner'), entry('tomorrow', 3, 'dinner')];
    expect(tonightMeal(entries, 2, 'dinner')).toEqual({
      entry: entries[1], reference: { id: RECIPE, source: 'recipes' }, mealId: 'dinner', origin: null,
    });
    expect(tonightMeal(entries, 2, 'lunch')?.entry.id).toBe('lunch');
    expect(tonightMeal(entries, 2, 'snack')).toBeNull();
    expect(tonightMeal([], 2, 'dinner')).toBeNull();
  });

  test('a leftover opens the recipe of its meal and is never the meal to mark as cooked', () => {
    const origin = entry('origin', 1, 'dinner');
    const leftover = entry('left', 2, 'lunch', { recipe_id: null, recipe_reference: null, recipe_name: 'Reste', leftover_of: 'origin' });
    expect(tonightMeal([origin, leftover], 2, 'lunch')).toEqual({ entry: leftover, reference: { id: RECIPE, source: 'recipes' }, mealId: null, origin });
  });

  test('a leftover whose meal is not in the week has no recipe to open', () => {
    const leftover = entry('left', 2, 'lunch', { recipe_id: null, recipe_reference: null, leftover_of: 'elsewhere' });
    expect(tonightMeal([leftover], 2, 'lunch')).toMatchObject({ reference: null, mealId: null, origin: null });
  });

  test('an older entry with only a recipe id opens it in automatic source, without a meal to mark', () => {
    const legacy = entry('legacy', 2, 'dinner', { recipe_reference: null });
    expect(tonightMeal([legacy], 2, 'dinner')).toMatchObject({ reference: { id: RECIPE, source: 'auto' }, mealId: null });
  });

  test('an entry without any recipe keeps its title and nothing to open', () => {
    const named = entry('named', 2, 'dinner', { recipe_id: null, recipe_reference: null });
    expect(tonightMeal([named], 2, 'dinner')).toMatchObject({ reference: null, mealId: null });
  });
});
