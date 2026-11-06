import { draftFromForm, formFromDraft } from '../draftForm';
import { draft } from './fixtures';

test('unknown quantities, portions and durations stay absent and the original source remains exact', () => {
  const incomplete = { ...draft, ingredients: [{ name: 'Carotte' }], servings: undefined, prepTimeMinutes: undefined, cookTimeMinutes: undefined };
  const form = formFromDraft(incomplete);
  expect(form.ingredients[0].quantity).toBe('');
  expect(form.servings).toBe('');
  expect(form.prepTimeMinutes).toBe('');
  const edited = draftFromForm({ ...form, title: 'Mon titre corrigé' }, incomplete);
  expect(edited.ingredients[0].quantity).toBeUndefined();
  expect(edited.servings).toBeUndefined();
  expect(edited.prepTimeMinutes).toBeUndefined();
  expect(edited.cookTimeMinutes).toBeUndefined();
  expect(edited.source).toEqual(draft.source);
});
test('a comma decimal is accepted without parsing an invalid quantity into a plausible number', () => {
  const form = formFromDraft(draft);
  form.ingredients[0].quantity = '1,5';
  expect(draftFromForm(form, draft).ingredients[0].quantity).toBe(1.5);
  form.ingredients[0].quantity = '200 grammes';
  expect(() => draftFromForm(form, draft)).toThrow(/Quantité/);
  expect(form.ingredients[0].quantity).toBe('200 grammes');
});
test('integer fields and incomplete ingredient rows cannot be silently repaired', () => {
  const form = formFromDraft(draft);
  expect(() => draftFromForm({ ...form, servings: '2.5' }, draft)).toThrow(/Portions/);
  form.ingredients[0].name = '';
  expect(() => draftFromForm(form, draft)).toThrow(/ingredients/);
});
