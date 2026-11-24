import type { WeekProposal } from '@smart/shared';
import type { MenuEntryView } from '@/hooks/useWeeklyMenu';
import {
  addedMessage, availabilityText, CAUSE_TEXT, DEFAULT_PROPOSAL_SETTINGS, excludedTerms, initialRequest, mergeReasons, openSlots,
  proposalOperations, proposalSlotLabel, refreshRequest, replaceRequest, setAside,
} from '../weekProposal';

// V11-01 E4b: what the « Proposer la semaine » screen sends and says, as pure functions.
const WEEK = '2026-11-30';
const R = (id: string) => ({ id, source: 'recipes_catalog' as const });
const entry = (day: number, meal_type: MenuEntryView['meal_type']): MenuEntryView => ({ id: `e${day}${meal_type}`, day_of_week: day, meal_type, recipe_id: null,
  recipe_reference: R('x'), recipe_name: 'Prévu', servings: 2, prep_time: 0, cook_time: 0, version: 1, cooked_command_id: null, leftover_of: null });
const filled = (date: string, id: string, extra: Record<string, unknown> = {}) => ({ date, meal_type: 'dinner' as const, status: 'proposed' as const,
  recipe: { reference: R(id), name: `Recette ${id}`, image_url: null, duration_minutes: 30, servings: 2 }, reasons: ['Prête en 30 min.'],
  availability: 'in_stock' as const, missing: [], ...extra });
const proposal = (slots: WeekProposal['slots']): WeekProposal => ({ proposal_id: 'b'.repeat(32), week_start: WEEK, calculated_at: '2026-11-30T09:00:00.000Z',
  expires_at: '2026-11-30T09:30:00.000Z', menu_version: 'a'.repeat(32), context_revision: 1, profile_version: 3, slots });

test('the slots offered: empty ones of the chosen meals, from today to Sunday', () => {
  // Wednesday 2 December: Monday and Tuesday are past; Thursday's dinner is planned.
  expect(openSlots(WEEK, '2026-12-02', [entry(3, 'dinner')], ['dinner'])).toEqual(
    ['2026-12-02', '2026-12-04', '2026-12-05', '2026-12-06'].map(date => ({ date, meal_type: 'dinner' })));
  expect(openSlots(WEEK, '2026-12-06', [], ['lunch', 'dinner'])).toEqual([{ date: '2026-12-06', meal_type: 'lunch' }, { date: '2026-12-06', meal_type: 'dinner' }]);
  expect(openSlots(WEEK, '2026-12-07', [], ['dinner'])).toEqual([]);
  expect(DEFAULT_PROPOSAL_SETTINGS.meals).toEqual(['dinner']);
});

test('« Sans ces aliments » becomes up to ten distinct terms', () => {
  expect(excludedTerms(' poisson, Crème ;crème,, porc ')).toEqual(['poisson', 'Crème', 'porc']);
  expect(excludedTerms(Array.from({ length: 12 }, (_, i) => `a${i}`).join(','))).toHaveLength(10);
  expect(excludedTerms('x'.repeat(100))[0]).toHaveLength(80);
});

test('the first request carries the slots, and the settings only when set', () => {
  const slots = [{ date: '2026-12-01', meal_type: 'dinner' as const }];
  expect(initialRequest(WEEK, slots, DEFAULT_PROPOSAL_SETTINGS)).toEqual({ week_start: WEEK, slots });
  expect(initialRequest(WEEK, slots, { meals: ['dinner'], servings: 4, timeLimitMinutes: 30, excluded: 'poisson' }))
    .toEqual({ week_start: WEEK, slots, servings: 4, constraints: { timeLimitMinutes: 30, excludedIngredients: ['poisson'] } });
});

test('« Autre recette » asks for one slot, every other choice kept, the recipes set aside avoided', () => {
  const current = proposal([filled('2026-12-01', 'a'), filled('2026-12-02', 'b'), filled('2026-12-03', 'c'),
    { date: '2026-12-04', meal_type: 'dinner', status: 'empty', cause: 'POOL_EXHAUSTED' }]);
  const request = replaceRequest(WEEK, DEFAULT_PROPOSAL_SETTINGS, current, '2026-12-02:dinner', ['2026-12-03:dinner'], [R('z')]);
  expect(request).toEqual({ week_start: WEEK, slots: [{ date: '2026-12-02', meal_type: 'dinner' }],
    keep: [{ date: '2026-12-01', meal_type: 'dinner', recipe: R('a'), servings: 2 }], avoid: [R('z'), R('b'), R('c')] });
  // The recipe of a slot left empty is not proposed elsewhere: « Remettre » would put it twice in the week.
});

test('recomputing keeps every choice, without the slots taken since; nothing to keep is nothing to recompute', () => {
  const current = proposal([filled('2026-12-01', 'a'), filled('2026-12-02', 'b', { status: 'kept' })]);
  expect(refreshRequest(WEEK, DEFAULT_PROPOSAL_SETTINGS, current, [], [], ['2026-12-01:dinner'])).toEqual({ week_start: WEEK, slots: [],
    keep: [{ date: '2026-12-02', meal_type: 'dinner', recipe: R('b'), servings: 2 }] });
  expect(refreshRequest(WEEK, DEFAULT_PROPOSAL_SETTINGS, current, ['2026-12-01:dinner', '2026-12-02:dinner'], [], [])).toBeNull();
});

test('validating sets each kept choice into its empty slot, never a slot left empty', () => {
  const current = proposal([filled('2026-12-01', 'a'), filled('2026-12-02', 'b'), { date: '2026-12-03', meal_type: 'dinner', status: 'empty', cause: 'NO_COMPATIBLE_RECIPE' }]);
  expect(proposalOperations(current, ['2026-12-02:dinner'])).toEqual([
    { op: 'set', date: '2026-12-01', meal_type: 'dinner', recipe: R('a'), servings: 2, expected_version: null },
  ]);
});

test('each slot says what it lacks, or why it stayed empty', () => {
  expect(availabilityText(filled('2026-12-01', 'a'))).toBe('Tout est en stock pour ce repas.');
  expect(availabilityText(filled('2026-12-01', 'a', { availability: 'to_buy', missing: [
    { name: 'coriandre', quantity: 1, unit: 'botte', status: 'to_buy' }, { name: 'lait de coco', quantity: 400, unit: 'ml', status: 'to_buy' },
    { name: 'sucre', quantity: 10, unit: 'g', status: 'verify' }] }))).toBe('À acheter : coriandre, lait de coco. À vérifier : sucre.');
  expect(availabilityText(filled('2026-12-01', 'a', { availability: 'to_check', missing: [] }))).toBe('Stock à vérifier pour cette recette.');
  expect(CAUSE_TEXT.NO_COMPATIBLE_RECIPE).toBe('Aucune recette ne respecte ton profil et ces réglages.');
  expect(CAUSE_TEXT.POOL_EXHAUSTED).toBe('Toutes les recettes qui conviennent sont déjà placées cette semaine.');
  expect(addedMessage(1, '2026-12-07')).toBe('1 repas ajouté au menu de la semaine du 7 → 13 déc.');
  expect(addedMessage(5, '2026-12-07')).toBe('5 repas ajoutés au menu de la semaine du 7 → 13 déc.');
});

test('a kept slot keeps the reasons it was proposed with, when its recipe is the same', () => {
  const before = proposal([filled('2026-12-01', 'a'), filled('2026-12-02', 'b')]);
  const after = proposal([filled('2026-12-01', 'a', { status: 'kept', reasons: [] }), filled('2026-12-02', 'c', { status: 'kept', reasons: [] })]);
  const merged = mergeReasons(before, after);
  expect(merged.slots.map(slot => slot.status === 'empty' ? [] : slot.reasons)).toEqual([['Prête en 30 min.'], []]);
});

test('a slot named by its date reads as its day and meal', () => {
  expect(proposalSlotLabel({ date: '2026-12-01', meal_type: 'dinner' })).toBe('Mardi · dîner');
  expect(proposalSlotLabel({ date: '2026-12-06', meal_type: 'lunch' })).toBe('Dimanche · déjeuner');
});

test('the recipes set aside stay distinct and bounded to what the contract takes', () => {
  const many = Array.from({ length: 60 }, (_, index) => R(`r${index}`));
  const aside = setAside(many, R('r0'));
  expect(aside).toHaveLength(50);
  expect(aside[aside.length - 1]).toEqual(R('r0'));
  expect(new Set(aside.map(recipe => recipe.id)).size).toBe(50);
  const current = proposal([filled('2026-12-01', 'a')]);
  expect(replaceRequest(WEEK, DEFAULT_PROPOSAL_SETTINGS, current, '2026-12-01:dinner', [], many).avoid).toHaveLength(50);
});
