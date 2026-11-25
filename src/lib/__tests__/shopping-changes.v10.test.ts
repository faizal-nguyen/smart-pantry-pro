import type { ShoppingChange } from '@smart/shared';
import { describeShoppingChanges } from '../shoppingChanges';

// V11-01 E5b: a receipt applied to the list is told as such, with what stays to buy.
const change = (outcome: ShoppingChange['outcome'], note?: ShoppingChange['note']): ShoppingChange => ({ id: 'x', outcome, name: 'Farine', ...(note ? { note } : {}) });

test('a receipt applied says what was checked, what stays to buy and what was added', () => {
  expect(describeShoppingChanges([change('checked'), change('checked', 'receipt_partial'), change('created', 'receipt_remainder'), change('updated'),
    change('created', 'receipt_added'), change('created', 'receipt_added')])).toBe('Ticket rapproché : 3 achats cochés, 1 reste à acheter, 2 ajoutés.');
  expect(describeShoppingChanges([change('checked'), change('created', 'receipt_added')]))
    .toBe('Ticket rapproché : 1 achat coché, 1 ajouté.');
  expect(describeShoppingChanges([change('created', 'receipt_added')])).toBe('Ticket rapproché : 1 ajouté.');
  // Every line matched in full: no note, the command says it was a receipt.
  expect(describeShoppingChanges([change('checked'), change('checked')], 'reconcile_receipt')).toBe('Ticket rapproché : 2 achats cochés.');
});

test('other list changes keep their words', () => {
  expect(describeShoppingChanges([change('checked'), change('checked')])).toBe('2 articles cochés.');
  expect(describeShoppingChanges([change('checked')])).toBe('Farine coché.');
});
