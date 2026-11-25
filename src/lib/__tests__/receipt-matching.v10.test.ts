import type { ReceiptLine, ReceiptScan } from '@smart/shared';
import type { ShoppingItem } from '@/hooks/useShoppingList';
import {
  matchReceipt, needsCheck, parseAmount, receiptGroups, reconcileLines, rematchReceipt, retarget, type ReviewLine,
} from '../receiptMatching';

// V11-01 E5b: a reviewed receipt against the shopping list (PRP V11-01 §7, D13, D14).
const row = (id: string, name: string, quantity: number, unit: string, extra: Partial<ShoppingItem> = {}): ShoppingItem => ({
  id, product_id: `p-${id}`, quantity, unit, stock_version: 3, is_purchased: false, priority: 1,
  created_at: `2026-11-2${id.length}T10:00:00Z`, updated_at: '2026-11-20T10:00:00Z',
  product: { id: `p-${id}`, name, category: 'Épicerie', unit_type: unit }, ...extra,
} as ShoppingItem);
const read = (raw_text: string, name: string | null, extra: Partial<ReceiptLine> = {}): ReceiptLine => ({
  raw_text, name, quantity: null, unit: null, package: null, unit_price: null, total_price: null, food: true, confidence: 'high', ...extra,
});
const scan = (lines: ReceiptLine[]): ReceiptScan => ({
  id: '70000000-0000-4000-8000-000000000001', state: 'read', store: 'Marché', purchased_on: '2026-11-20', total: 12.4, currency: 'EUR',
  created_at: '2026-11-25T10:00:00Z', applied_at: null, lines, possible_duplicate: null,
});

const milk = row('m', 'Lait', 2, 'pièce');
const flour = row('fl', 'Farine', 1, 'kg');
const tomatoes = row('tom', 'Tomates', 500, 'g');
const sugar = row('suga', 'Sucre', 1, 'kg', { is_purchased: true });
const rice = row('riceA', 'Riz', 1, 'kg');
const rows = [milk, flour, tomatoes, sugar, rice];
const ticket = scan([
  read('LAIT 1/2 ECR', 'Lait demi-écrémé', { total_price: 2.1 }),
  read('FARINE T65', 'Farine de blé T65', { quantity: 1, unit: 'kg', total_price: 1.05 }),
  read('TOMATES GRAPPE', 'Tomates grappe', { quantity: 0.25, unit: 'kg', unit_price: 2.99, total_price: 0.75 }),
  read('SUCRE POUDRE', 'Sucre en poudre', { quantity: 2, unit: 'kg', confidence: 'low' }),
  read('CHOCO NOIR', 'Chocolat noir', { total_price: 1.99 }),
  read('SAC CABAS', 'Sac', { food: false, total_price: 0.1 }),
]);
const target = (line: ReviewLine) => line.target.kind === 'list' ? line.target.shoppingId : line.target.kind;

test('each line finds its row of the list: the same product, a more precise name, a close one to check; nothing else is a purchase off the list', () => {
  const lines = matchReceipt(ticket, rows);
  expect(lines.map(target)).toEqual(['m', 'fl', 'tom', 'suga', 'new', 'skip']);
  expect(lines.map(line => line.match)).toEqual(['same', 'close', 'same', 'same', null, null]);
  expect(lines.map(line => line.name)).toEqual(['Lait demi-écrémé', 'Farine de blé T65', 'Tomates grappe', 'Sucre en poudre', 'Chocolat noir', 'Sac']);
});

test('the quantity is the receipt’s when it converts to the row; otherwise the whole row, or 1 piece off the list, flagged to check', () => {
  const lines = matchReceipt(ticket, rows);
  expect(lines.map(line => [line.quantity, line.unit, line.quantitySource])).toEqual([
    ['2', 'pièce', 'list'], ['1', 'kg', 'receipt'], ['0,25', 'kg', 'receipt'], ['2', 'kg', 'receipt'], ['1', 'pièce', 'assumed'], ['1', 'pièce', 'assumed'],
  ]);
  // A unit that does not convert (« 1 paquet » against 500 g) takes the whole row, to check.
  const [packet] = matchReceipt(scan([read('TOMATES', 'Tomates', { quantity: 1, unit: 'paquet' })]), rows);
  expect([packet.quantity, packet.unit, packet.quantitySource]).toEqual(['500', 'g', 'list']);
  expect(matchReceipt(ticket, rows).map((line, index) => needsCheck(line, ticket.lines[index]))).toEqual([true, true, false, true, true, true]);
});

test('the groups: checked, partial (the remainder stays to buy), added, set aside, and the rows the receipt does not name', () => {
  const groups = receiptGroups(matchReceipt(ticket, rows), rows);
  expect(groups.checked.map(target)).toEqual(['m', 'fl', 'suga']);
  expect(groups.partial.map(target)).toEqual(['tom']);
  expect(groups.bought.get('tom')).toBe(250);
  expect(groups.added.map(target)).toEqual(['new']);
  expect(groups.skipped.map(line => line.index)).toEqual([5]);
  expect(groups.remaining.map(item => item.id)).toEqual(['riceA']);
  // Two lines on one row add up; a row checked by hand never has a remainder.
  const twice = matchReceipt(scan([read('TOMATES', 'Tomates', { quantity: 300, unit: 'g' }), read('TOMATES', 'Tomates', { quantity: 200, unit: 'g' })]), rows);
  expect(receiptGroups(twice, rows).checked.map(target)).toEqual(['tom', 'tom']);
  const hand = matchReceipt(scan([read('SUCRE', 'Sucre', { quantity: 0.5, unit: 'kg' })]), rows);
  expect(receiptGroups(hand, rows).checked.map(target)).toEqual(['suga']);
});

test('the payload sends every line kept, with its row at its version and its prices; a wrong value is refused in words', () => {
  const lines = matchReceipt(ticket, rows);
  expect(reconcileLines(lines, rows)).toEqual([
    { line_index: 0, name: 'Lait demi-écrémé', quantity: 2, unit: 'pièce', unit_price: null, total_price: 2.1, target: { shopping_id: 'm', expected_version: 3 } },
    { line_index: 1, name: 'Farine de blé T65', quantity: 1, unit: 'kg', unit_price: null, total_price: 1.05, target: { shopping_id: 'fl', expected_version: 3 } },
    { line_index: 2, name: 'Tomates grappe', quantity: 0.25, unit: 'kg', unit_price: 2.99, total_price: 0.75, target: { shopping_id: 'tom', expected_version: 3 } },
    { line_index: 3, name: 'Sucre en poudre', quantity: 2, unit: 'kg', unit_price: null, total_price: null, target: { shopping_id: 'suga', expected_version: 3 } },
    { line_index: 4, name: 'Chocolat noir', quantity: 1, unit: 'pièce', unit_price: null, total_price: 1.99, target: null },
  ]);
  const edit = (index: number, change: Partial<ReviewLine>) => lines.map(line => line.index === index ? { ...line, ...change } : line);
  expect(() => reconcileLines(edit(4, { quantity: '0' }), rows)).toThrow('Vérifie la quantité de « Chocolat noir ».');
  expect(() => reconcileLines(edit(4, { unit: ' ' }), rows)).toThrow('Indique l’unité de « Chocolat noir ».');
  expect(() => reconcileLines(edit(4, { price: 'deux', priceEdited: true }), rows)).toThrow('Vérifie le prix de « Chocolat noir ».');
  expect(() => reconcileLines(edit(2, { quantity: '1', unit: 'paquet', quantityEdited: true }), rows))
    .toThrow('L’unité de « Tomates grappe » ne se convertit pas dans celle de ta liste (g) : indique la quantité en g.');
  expect(() => reconcileLines(edit(0, { target: { kind: 'list', shoppingId: 'gone' } }), rows)).toThrow('« Lait demi-écrémé » vise une ligne qui n’est plus sur ta liste : choisis-en une autre.');
  // An edited price is the line's; the unit price read is no longer trusted.
  expect(reconcileLines(edit(2, { price: '0,80', priceEdited: true }), rows)[2]).toMatchObject({ unit_price: null, total_price: 0.8 });
  expect(() => reconcileLines(lines.map(line => ({ ...line, target: { kind: 'skip' } })), rows)).toThrow('Garde au moins un achat à rapprocher.');
});

test('choosing another target sets its quantity again, unless the user typed one', () => {
  const lines = matchReceipt(ticket, rows);
  const offList = retarget(lines[0], ticket.lines[0], { kind: 'new' }, rows);
  expect([offList.quantity, offList.unit, offList.quantitySource, offList.match]).toEqual(['1', 'pièce', 'assumed', null]);
  const typed = retarget({ ...lines[0], quantity: '3', quantityEdited: true }, ticket.lines[0], { kind: 'list', shoppingId: 'riceA' }, rows);
  expect([typed.quantity, typed.unit, typed.target]).toEqual(['3', 'pièce', { kind: 'list', shoppingId: 'riceA' }]);
  expect(retarget(lines[4], ticket.lines[4], { kind: 'list', shoppingId: 'riceA' }, rows)).toMatchObject({ quantity: '1', unit: 'kg', quantitySource: 'list', match: 'chosen' });
});

test('after the list changed, what the user edited stays while its row exists; the rest is matched again', () => {
  const lines = matchReceipt(ticket, rows).map(line => line.index === 4 ? { ...line, name: 'Chocolat 70 %', nameEdited: true } : line)
    .map(line => line.index === 0 ? { ...line, target: { kind: 'list' as const, shoppingId: 'riceA' }, targetChosen: true } : line);
  const reread = rows.filter(item => item.id !== 'riceA').map(item => item.id === 'tom' ? { ...item, stock_version: 4 } : item);
  const again = rematchReceipt(ticket, reread, lines);
  expect(again.map(target)).toEqual(['m', 'fl', 'tom', 'suga', 'new', 'skip']);
  expect(again[4].name).toBe('Chocolat 70 %');
  expect(reconcileLines(again, reread)[2].target).toEqual({ shopping_id: 'tom', expected_version: 4 });
});

test('amounts are read the French way', () => {
  expect([parseAmount('1,5'), parseAmount(' 2 '), parseAmount('0.25'), parseAmount(''), parseAmount('abc'), parseAmount('1e3')]).toEqual([1.5, 2, 0.25, null, null, null]);
});

// Review of E5b.
test('a remainder below a millionth of the row is none, as in the database', () => {
  const big = row('big', 'Farine', 1000000, 'g');
  const lines = matchReceipt(scan([read('FARINE', 'Farine', { quantity: 999999.5, unit: 'g' })]), [big]);
  expect(receiptGroups(lines, [big]).checked.map(target)).toEqual(['big']);
});

test('a quantity printed without a unit is taken in pieces, flagged', () => {
  const eggs = row('eggs', 'Œufs', 6, 'pièce');
  const [onList, offList] = matchReceipt(scan([read('OEUFS', 'Œufs', { quantity: 2 }), read('CITRONS', 'Citrons', { quantity: 3 })]), [eggs]);
  expect([onList.quantity, onList.unit, onList.quantitySource]).toEqual(['2', 'pièce', 'assumed']);
  expect([offList.quantity, offList.unit, offList.quantitySource]).toEqual(['3', 'pièce', 'assumed']);
  expect(receiptGroups([onList, offList], [eggs]).partial.map(target)).toEqual(['eggs']);
});

test('the unit price read is sent only with the quantity it was read for', () => {
  const lines = matchReceipt(ticket, rows);
  expect(reconcileLines(lines.map(line => line.index === 2 ? { ...line, quantity: '0,3', quantityEdited: true } : line), rows)[2].unit_price).toBeNull();
  const listed = matchReceipt(scan([read('LAIT', 'Lait', { unit_price: 1.05 })]), rows);
  expect(reconcileLines(listed, rows)[0].unit_price).toBeNull();
});

test('a row of the list without a unit is said in words', () => {
  const bare = { ...row('bare', 'Sel', 1, 'g'), unit: undefined, product: { id: 'p-bare', name: 'Sel', category: 'Épicerie', unit_type: null } } as unknown as ShoppingItem;
  const [line] = matchReceipt(scan([read('SEL', 'Sel', { quantity: 1, unit: 'kg' })]), [bare]);
  expect(() => reconcileLines([line], [bare])).toThrow('« Sel » vise une ligne de ta liste sans unité : choisis « Achat hors liste », ou indique une unité sur ta liste.');
});
