import type { MenuEntryView } from '@/hooks/useWeeklyMenu';
import { copyMessage, copyTargetWeeks, planWeekCopy } from '../menuCopy';

const RECIPE = '11111111-1111-4111-8111-111111111111';
const meal = (id: string, day: number, meal_type: MenuEntryView['meal_type'], extra: Partial<MenuEntryView> = {}): MenuEntryView => ({
  id, day_of_week: day, meal_type, recipe_id: null, recipe_reference: { id: RECIPE, source: 'recipes_catalog' }, recipe_name: id,
  servings: 4, prep_time: 0, cook_time: 0, version: 1, cooked_command_id: null, leftover_of: null, ...extra,
});
const TARGET = '2026-12-07';

test('each meal with a recipe is set in the same slot of the target week, in the order of the week', () => {
  const source = [meal('Soupe', 3, 'dinner', { servings: 2 }), meal('Curry', 0, 'lunch')];
  const plan = planWeekCopy(source, [], TARGET, false);
  expect(plan.operations).toEqual([
    { op: 'set', date: '2026-12-07', meal_type: 'lunch', recipe: { id: RECIPE, source: 'recipes_catalog' }, servings: 4, expected_version: null },
    { op: 'set', date: '2026-12-10', meal_type: 'dinner', recipe: { id: RECIPE, source: 'recipes_catalog' }, servings: 2, expected_version: null },
  ]);
  expect(plan).toMatchObject({ copied: 2, kept: 0, conflicts: [], skippedLeftovers: 0, skippedWithoutRecipe: 0 });
});

test('leftovers and meals without a recipe are not copied; an older meal keeps its recipe through recipe_id', () => {
  const source = [
    meal('Curry', 0, 'dinner'),
    meal('Reste : Curry', 1, 'lunch', { recipe_reference: null, leftover_of: 'Curry' }),
    meal('Note libre', 2, 'lunch', { recipe_reference: null }),
    meal('Ancien', 3, 'dinner', { recipe_reference: null, recipe_id: RECIPE }),
  ];
  const plan = planWeekCopy(source, [], TARGET, false);
  expect(plan.operations.map(operation => [operation.date, operation.recipe])).toEqual([
    ['2026-12-07', { id: RECIPE, source: 'recipes_catalog' }],
    ['2026-12-10', { id: RECIPE, source: 'auto' }],
  ]);
  expect(plan).toMatchObject({ copied: 2, skippedLeftovers: 1, skippedWithoutRecipe: 1 });
});

test('a meal already planned is kept by default, or replaced at its version; a cooked one is always kept', () => {
  const source = [meal('Curry', 0, 'dinner'), meal('Soupe', 1, 'dinner'), meal('Salade', 2, 'lunch')];
  const target = [meal('Prévu', 0, 'dinner', { version: 7 }), meal('Cuisiné', 1, 'dinner', { cooked_command_id: 'c-1' })];
  const kept = planWeekCopy(source, target, TARGET, false);
  expect(kept.operations.map(operation => operation.date)).toEqual(['2026-12-09']);
  expect(kept.conflicts.map(conflict => [conflict.source.id, conflict.target.id, conflict.replaced, conflict.cooked]))
    .toEqual([['Curry', 'Prévu', false, false], ['Soupe', 'Cuisiné', false, true]]);
  expect(kept).toMatchObject({ copied: 1, kept: 2 });
  const replaced = planWeekCopy(source, target, TARGET, true);
  expect(replaced.operations.map(operation => [operation.date, operation.expected_version])).toEqual([['2026-12-07', 7], ['2026-12-09', null]]);
  expect(replaced.conflicts.map(conflict => conflict.replaced)).toEqual([true, false]);
  expect(replaced).toMatchObject({ copied: 2, kept: 1 });
});

test('a replaced meal takes its leftovers with it: a copy into their slots finds them empty', () => {
  const source = [meal('Curry', 0, 'dinner'), meal('Soupe', 1, 'lunch')];
  const target = [meal('Gratin', 0, 'dinner', { version: 3 }), meal('Reste : Gratin', 1, 'lunch', { recipe_reference: null, leftover_of: 'Gratin', version: 2 }),
    meal('Reste 2', 2, 'lunch', { recipe_reference: null, leftover_of: 'Gratin' })];
  const replaced = planWeekCopy(source, target, TARGET, true);
  expect(replaced.operations.map(operation => [operation.date, operation.expected_version])).toEqual([['2026-12-07', 3], ['2026-12-08', null]]);
  expect(replaced.conflicts).toHaveLength(1);
  expect(replaced.conflicts[0]).toMatchObject({ target: { id: 'Gratin' }, leftovers: 2, replaced: true });
  // Kept, the meal keeps its leftover, which is then a conflict of its own.
  const kept = planWeekCopy(source, target, TARGET, false);
  expect(kept.operations).toEqual([]);
  expect(kept.conflicts.map(conflict => conflict.target.id)).toEqual(['Gratin', 'Reste : Gratin']);
  // A leftover replaced alone goes at its version; its meal stays.
  const alone = planWeekCopy([meal('Soupe', 1, 'lunch')], target, TARGET, true);
  expect(alone.operations.map(operation => operation.expected_version)).toEqual([2]);
});

test('the weeks offered: four before and eight after, the next one first chosen, never the week itself', () => {
  const weeks = copyTargetWeeks('2026-11-30');
  expect(weeks).toHaveLength(12);
  expect(weeks).not.toContain('2026-11-30');
  expect(weeks[0]).toBe('2026-11-02');
  expect(weeks[4]).toBe('2026-12-07');
  expect(weeks[11]).toBe('2027-01-25');
});

test('the outcome names how many meals reached which week, and what the replacing removed, wherever it was', () => {
  expect(copyMessage(1, '2026-12-07')).toBe('1 repas copié vers la semaine du 7 → 13 déc.');
  expect(copyMessage(5, '2026-12-28')).toBe('5 repas copiés vers la semaine du 28 déc. → 3 janv.');
  // The receipt names every row removed, a leftover in another week included.
  expect(copyMessage(2, '2026-12-07', [{ id: 'a' }, { id: 'b', leftover_of: 'a' }, { id: 'c', leftover_of: 'a' }]))
    .toBe('2 repas copiés vers la semaine du 7 → 13 déc. 1 repas remplacé, 2 restes retirés.');
  expect(copyMessage(1, '2026-12-07', [{ id: 'b', leftover_of: 'a' }])).toBe('1 repas copié vers la semaine du 7 → 13 déc. 1 reste retiré.');
});
