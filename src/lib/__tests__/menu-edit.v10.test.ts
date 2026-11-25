import type { MenuEntryView } from '@/hooks/useWeeklyMenu';
import { changeMessage, dropHint, dropTarget, leftoverCapacity, leftoverOptions, menuRefusal, moveOptions, servingsBounds, slotDate, slotLabel } from '../menuEdit';

const meal = (id: string, day: number, meal_type: MenuEntryView['meal_type'], extra: Partial<MenuEntryView> = {}): MenuEntryView => ({
  id, day_of_week: day, meal_type, recipe_id: null, recipe_reference: { id: `r-${id}`, source: 'recipes' }, recipe_name: id,
  servings: 4, prep_time: 0, cook_time: 0, version: 1, cooked_command_id: null, leftover_of: null, ...extra,
});
const curry = meal('Curry', 1, 'dinner');
const rest = meal('Reste : Curry', 2, 'lunch', { recipe_reference: null, servings: 2, leftover_of: 'Curry' });
const salad = meal('Salade', 3, 'lunch');
const week = [curry, rest, salad];

test('a meal keeps at least the servings of its leftovers; a leftover at most what its meal leaves', () => {
  expect(servingsBounds(curry, week)).toEqual({ min: 2, max: 100 });
  expect(servingsBounds(salad, week)).toEqual({ min: 1, max: 100 });
  expect(servingsBounds(rest, week)).toEqual({ min: 1, max: 4 });
  expect(servingsBounds(rest, [...week, meal('Reste 2', 4, 'lunch', { recipe_reference: null, servings: 1, leftover_of: 'Curry' })])).toEqual({ min: 1, max: 3 });
  // A leftover whose meal is in another week: the server bounds it.
  expect(servingsBounds({ ...rest, leftover_of: 'ailleurs' }, week)).toEqual({ min: 1, max: 100 });
  expect(leftoverCapacity(curry, week)).toBe(2);
});

test('a meal moves to any other slot of the week; an occupied one swaps, an order its leftovers forbid is explained', () => {
  const options = moveOptions(curry, week);
  expect(options).toHaveLength(27);
  expect(options.find(option => option.day_of_week === 1 && option.meal_type === 'dinner')).toBeUndefined();
  expect(options.find(option => option.day_of_week === 0 && option.meal_type === 'lunch')).toMatchObject({ occupant: null, blocked: null });
  expect(options.find(option => option.day_of_week === 3 && option.meal_type === 'dinner')).toMatchObject({ blocked: 'Ce repas doit venir avant ses restes.' });
  expect(options.find(option => option.day_of_week === 3 && option.meal_type === 'lunch')).toMatchObject({ occupant: salad, blocked: 'Ce repas doit venir avant ses restes.' });
  // A swap with its own leftover would put the leftover first.
  expect(options.find(option => option.day_of_week === 2 && option.meal_type === 'lunch')).toMatchObject({ occupant: rest, blocked: 'Ce repas doit venir avant ses restes.' });
  const forRest = moveOptions(rest, week);
  expect(forRest.find(option => option.day_of_week === 0 && option.meal_type === 'dinner')).toMatchObject({ blocked: 'Ce reste doit venir après son repas d’origine.' });
  expect(forRest.find(option => option.day_of_week === 3 && option.meal_type === 'lunch')).toMatchObject({ occupant: salad, blocked: null });
  // The meal swapped in must keep its own order: the salad has no leftovers, so it can move before them.
  expect(moveOptions(salad, week).find(option => option.day_of_week === 1 && option.meal_type === 'dinner'))
    .toMatchObject({ occupant: curry, blocked: '« Curry » doit venir avant ses restes : l’échange est impossible.' });
  // A leftover swapped in names itself too.
  expect(moveOptions(salad, week).find(option => option.day_of_week === 2 && option.meal_type === 'lunch')).toMatchObject({ occupant: rest, blocked: null });
  expect(moveOptions(meal('Matin', 0, 'breakfast'), week).find(option => option.day_of_week === 2 && option.meal_type === 'lunch'))
    .toMatchObject({ occupant: rest, blocked: '« Reste : Curry » doit venir après son repas d’origine : l’échange est impossible.' });
});

test('a leftover goes in an empty slot after its meal', () => {
  const options = leftoverOptions(curry, week);
  expect(options.every(option => option.day_of_week * 4 + ['breakfast', 'lunch', 'dinner', 'snack'].indexOf(option.meal_type) > 1 * 4 + 2)).toBe(true);
  expect(options.some(option => option.day_of_week === 2 && option.meal_type === 'lunch')).toBe(false);
  expect(options.some(option => option.day_of_week === 3 && option.meal_type === 'lunch')).toBe(false);
  expect(options[0]).toEqual({ day_of_week: 1, meal_type: 'snack' });
  expect(leftoverOptions(meal('Dimanche', 6, 'snack'), [])).toEqual([]);
});

test('slots are named and dated in the week', () => {
  expect(slotLabel({ day_of_week: 2, meal_type: 'lunch' })).toBe('Mercredi · déjeuner');
  expect(slotDate('2026-11-30', 2)).toBe('2026-12-02');
  expect(slotDate('2026-12-28', 6)).toBe('2027-01-03');
});

test('the outcome of each edit is said, leftovers removed included', () => {
  expect(changeMessage({ kind: 'servings', entry: curry, servings: 6 })).toBe('« Curry » : 6 portions.');
  expect(changeMessage({ kind: 'move', entry: curry, slot: { day_of_week: 0, meal_type: 'lunch' }, occupant: null })).toBe('« Curry » déplacé : lundi · déjeuner.');
  expect(changeMessage({ kind: 'move', entry: curry, slot: { day_of_week: 3, meal_type: 'lunch' }, occupant: salad })).toBe('« Curry » et « Salade » échangés.');
  expect(changeMessage({ kind: 'leftover', entry: curry, slot: { day_of_week: 2, meal_type: 'dinner' }, servings: 1 })).toBe('Reste prévu : mercredi · dîner, 1 portion.');
  expect(changeMessage({ kind: 'remove', entry: curry, removed: 2 })).toBe('« Curry » retiré du menu, avec 1 reste.');
  expect(changeMessage({ kind: 'remove', entry: salad, removed: 1 })).toBe('« Salade » retiré du menu.');
});

test('refusals are explained; anything else keeps its own message', () => {
  const refused = (code: string) => Object.assign(new Error('raw'), { code });
  expect(menuRefusal(refused('MENU_CHANGED'))).toBe('Ce repas a changé entre-temps : le menu a été relu.');
  expect(menuRefusal(refused('LEFTOVER_ORDER'))).toBe('Un reste doit rester après son repas d’origine : le menu a été relu.');
  expect(menuRefusal(refused('LEFTOVER_CAPACITY'))).toBe('Les restes dépasseraient les portions du repas d’origine : le menu a été relu.');
  expect(menuRefusal(refused('MEAL_COOKED'))).toBe('Ce repas a déjà été cuisiné : annule d’abord sa cuisson.');
  expect(menuRefusal(refused('UNDO_CONFLICT'))).toBe('Le menu a changé depuis : cette modification ne peut plus être annulée.');
  expect(menuRefusal(new Error('Réseau coupé'))).toBe('Réseau coupé');
});

// V11-01 E3d (D5): a drop says what it will do before it does it, from the same options as « Déplacer… ».
test('a drop is nothing on its own slot, a move on a free one, a swap on an occupied one, refused against the order of leftovers', () => {
  expect(dropTarget(curry, { day_of_week: 1, meal_type: 'dinner' }, week)).toEqual({ kind: 'same' });
  expect(dropTarget(curry, { day_of_week: 0, meal_type: 'dinner' }, week)).toEqual({ kind: 'move' });
  // Swapped with a Monday lunch, the leftover would come before its curry.
  const soup = meal('Soupe', 0, 'lunch');
  expect(dropTarget(soup, { day_of_week: 2, meal_type: 'lunch' }, [...week, soup])).toEqual({ kind: 'blocked', reason: '« Reste : Curry » doit venir après son repas d’origine : l’échange est impossible.' });
  expect(dropTarget(rest, { day_of_week: 0, meal_type: 'lunch' }, week)).toEqual({ kind: 'blocked', reason: 'Ce reste doit venir après son repas d’origine.' });
  expect(dropTarget(curry, { day_of_week: 4, meal_type: 'lunch' }, week)).toEqual({ kind: 'blocked', reason: 'Ce repas doit venir avant ses restes.' });
  expect(dropTarget(salad, { day_of_week: 5, meal_type: 'dinner' }, [...week, meal('Gratin', 5, 'dinner')]))
    .toEqual({ kind: 'swap', occupant: expect.objectContaining({ id: 'Gratin' }) });
});

test('each drop target is said in words', () => {
  expect(dropHint({ kind: 'same' })).toBeNull();
  expect(dropHint({ kind: 'move' })).toBe('Déposer ici');
  expect(dropHint({ kind: 'swap', occupant: salad })).toBe('Échanger avec « Salade »');
  expect(dropHint({ kind: 'blocked', reason: 'Ce repas doit venir avant ses restes.' })).toBe('Ce repas doit venir avant ses restes.');
});
