import type { MenuShoppingLine, MenuShoppingPreview } from '@smart/shared';
import { initialChoices, mealsLabel, mergeChoices, reviewDraft, reviewSections } from '../menuShoppingReview';

const TARGET = '50000000-0000-4000-8000-000000000001';
const LISTED = '50000000-0000-4000-8000-000000000002';
const PRODUCT = '10000000-0000-4000-8000-000000000001';
const meal = (id: string, date: string, recipe_name: string) => ({ id, date, meal_type: 'lunch', recipe_name, quantity: 45, unit: 'g' });
const line = (key: string, state: MenuShoppingLine['state'], extra: Partial<MenuShoppingLine> = {}): MenuShoppingLine =>
  ({ key, state, name: key, product_id: null, quantity: 1, unit: 'g', meals: [meal('m1', '2026-12-01', 'Curry')], ...extra });
const lines: MenuShoppingLine[] = [
  line('riz', 'to_add', { product_id: PRODUCT, quantity: 250, unit: 'g', target: { id: TARGET, expected_version: 3 } }),
  line('coco', 'to_add', { quantity: 0.5, unit: 'l' }),
  line('pates', 'excess', { quantity: 200, reduction: { id: LISTED, expected_version: 4, quantity: 200, unit: 'g' } }),
  line('coriandre', 'manual', { quantity: 1, unit: 'botte' }),
  line('sucre', 'verify', { quantity: 12, verify_lots: ['Sucre'] }),
  line('farine', 'listed', { quantity: 100, listed_quantity: 500 }),
  line('lait', 'purchased_pending', { quantity: 1, unit: 'l', purchased_quantity: 1 }),
];
const preview: MenuShoppingPreview = {
  week_start: '2026-11-30', as_of: '2026-11-24', menu_version: 'a'.repeat(32), context_revision: 7, lines,
  meals: [{ id: 'm1', date: '2026-12-01', meal_type: 'lunch', recipe_name: 'Curry', role: 'target' }], uncomputable: [],
};

describe('choices', () => {
  test('what to add is kept by default, with the computed amount; an excess is not taken back by default', () => {
    expect(initialChoices(lines)).toEqual({
      riz: { state: 'to_add', selected: true, quantity: '250' },
      coco: { state: 'to_add', selected: true, quantity: '0,5' },
      pates: { state: 'excess', selected: false, quantity: '200' },
    });
  });

  test('after a recalculation, a choice stays with its line; a lower need lowers its amount; gone lines are dropped', () => {
    const kept = { ...initialChoices(lines), riz: { state: 'to_add' as const, selected: false, quantity: '200' }, coco: { state: 'to_add' as const, selected: true, quantity: '0,5' } };
    const next = [
      { ...lines[0], quantity: 150 },
      { ...lines[1], quantity: 0.25 },
      line('nouveau', 'to_add', { quantity: 30 }),
      { ...lines[2], state: 'verify' as const },
    ];
    expect(mergeChoices(kept, next)).toEqual({
      riz: { state: 'to_add', selected: false, quantity: '150' },
      coco: { state: 'to_add', selected: true, quantity: '0,25' },
      nouveau: { state: 'to_add', selected: true, quantity: '30' },
    });
  });
});

describe('what the confirmation sends', () => {
  test('by default: each line to add, by product or by name, topping up its row; nothing else is written', () => {
    const draft = reviewDraft(preview, initialChoices(lines));
    expect(draft.errors).toEqual({});
    expect(draft.payload).toEqual({
      week_start: '2026-11-30', as_of: '2026-11-24', menu_version: 'a'.repeat(32), context_revision: 7,
      adds: [{ product_id: PRODUCT, quantity: 250, unit: 'g', target: { id: TARGET, expected_version: 3 } }, { name: 'coco', quantity: 0.5, unit: 'l' }],
      reductions: [],
    });
    expect([draft.adds, draft.reductions]).toEqual([2, 0]);
  });

  test('a kept excess takes back the menu’s share of its row', () => {
    const choices = { ...initialChoices(lines), pates: { state: 'excess' as const, selected: true, quantity: '200' } };
    expect(reviewDraft(preview, choices).payload?.reductions).toEqual([{ id: LISTED, expected_version: 4, quantity: 200, unit: 'g' }]);
  });

  test('a lowered amount is sent as typed, comma included', () => {
    const choices = { ...initialChoices(lines), riz: { state: 'to_add' as const, selected: true, quantity: '120,5' } };
    expect(reviewDraft(preview, choices).payload?.adds[0]).toMatchObject({ quantity: 120.5 });
  });

  test.each([
    ['0', 'Indique une quantité positive.'],
    ['abc', 'Indique une quantité positive.'],
    ['', 'Indique une quantité positive.'],
    ['300', 'Au plus 250 g : ce que la semaine demande. Le reste s’ajoute depuis ta liste.'],
  ])('an amount of « %s » is refused before anything is sent', (quantity, message) => {
    const choices = { ...initialChoices(lines), riz: { state: 'to_add' as const, selected: true, quantity } };
    const draft = reviewDraft(preview, choices);
    expect(draft.errors).toEqual({ riz: message });
    expect(draft.payload).toBeNull();
  });

  test('an unchecked line is not checked for its amount, and nothing kept sends nothing', () => {
    const choices = { riz: { state: 'to_add' as const, selected: false, quantity: 'abc' }, coco: { state: 'to_add' as const, selected: false, quantity: '0,5' } };
    expect(reviewDraft(preview, choices)).toEqual({ payload: null, adds: 0, reductions: 0, errors: {} });
  });
});

test('lines are grouped by what the user can do with them', () => {
  expect(reviewSections(lines).map(section => [section.state, section.lines.map(item => item.key)])).toEqual([
    ['to_add', ['riz', 'coco']], ['excess', ['pates']], ['manual', ['coriandre']], ['verify', ['sucre']],
    ['listed', ['farine']], ['purchased_pending', ['lait']],
  ]);
  expect(reviewSections([lines[0]]).map(section => section.state)).toEqual(['to_add']);
});

test('the meals a line is for are named with their day and meal', () => {
  expect(mealsLabel([meal('m1', '2026-12-01', 'Curry')])).toBe('Pour : Curry (mar. 1 déc., déjeuner)');
  expect(mealsLabel([meal('m1', '2026-12-01', 'Curry'), { ...meal('m2', '2026-12-03', 'Curry jaune'), meal_type: 'dinner' }]))
    .toBe('Pour : Curry (mar. 1 déc., déjeuner) · Curry jaune (jeu. 3 déc., dîner)');
});

// Review 2026-11-24: the default amount must always be accepted as it is shown.
describe('amounts as the review shows and reads them', () => {
  const big = line('farine', 'to_add', { quantity: 1500, unit: 'g' });
  test('a proposed amount of a thousand or more is shown without a grouping space and sent as is', () => {
    const choices = initialChoices([big]);
    expect(choices.farine.quantity).toBe('1500');
    expect(reviewDraft({ ...preview, lines: [big] }, choices).payload?.adds).toEqual([{ name: 'farine', quantity: 1500, unit: 'g' }]);
  });

  test.each(['1 500', '1 500', '1 500'])('an amount typed as « %s » is read', text => {
    expect(reviewDraft({ ...preview, lines: [big] }, { farine: { state: 'to_add', selected: true, quantity: text } }).payload?.adds[0].quantity).toBe(1500);
  });

  test('a proposed amount rounded for display is sent exactly, never above the gap', () => {
    const third = line('oeuf', 'to_add', { quantity: 0.666666667, unit: 'pièce' });
    const choices = initialChoices([third]);
    expect(choices.oeuf.quantity).toBe('0,667');
    const draft = reviewDraft({ ...preview, lines: [third] }, choices);
    expect(draft.errors).toEqual({});
    expect(draft.payload?.adds[0].quantity).toBe(0.666666667);
  });

  test('a line the list cannot hold (name or unit too long) is not offered for writing', () => {
    expect(initialChoices([line('x', 'to_add', { name: 'n'.repeat(121), quantity: 10 }), line('y', 'to_add', { quantity: 10, unit: 'u'.repeat(41) })])).toEqual({});
    expect(initialChoices([line('z', 'to_add', { name: 'n'.repeat(121), product_id: PRODUCT, quantity: 10 })])).toHaveProperty('z');
  });
});
