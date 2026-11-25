import type { ShoppingItem } from '@/hooks/useShoppingList';
import { afterStorage, draftRow, mergeDraft, type DraftRow } from '../storageDraft';

// V11-01 E5b (PRP §7): the storage draft is merged per row, never replaced nor wiped whole.
const item = (id: string, name: string, quantity: number, unit: string, version = 1, purchased = true): ShoppingItem => ({
  id, product_id: `p-${id}`, quantity, unit, stock_version: version, is_purchased: purchased, priority: 1, created_at: '', updated_at: '',
  product: { id: `p-${id}`, name, category: 'Épicerie', unit_type: unit },
} as ShoppingItem);

test('a new purchase joins the draft; an edited row keeps its zone and date; a row no longer bought leaves', () => {
  const draft: DraftRow[] = [
    { ...draftRow(item('a', 'Farine', 1, 'kg')), location: 'Placard', date: '2027-01-10', quantity: '0,9' },
    draftRow(item('b', 'Lait', 2, 'pièce')),
  ];
  const merged = mergeDraft(draft, [item('a', 'Farine', 1, 'kg'), item('b', 'Lait', 2, 'pièce', 1, false), item('c', 'Tomates', 250, 'g')]);
  expect(merged.map(row => row.id)).toEqual(['a', 'c']);
  expect(merged[0]).toMatchObject({ location: 'Placard', date: '2027-01-10', quantity: '0,9' });
  expect(merged[0].notice).toBeUndefined();
  expect(merged[1]).toMatchObject({ name: 'Tomates', quantity: '250', unit: 'g', selected: true, version: 1 });
});

test('a row whose version changed (the receipt fixed its quantity) takes it, keeps zone and date, and says so', () => {
  const draft = [{ ...draftRow(item('a', 'Tomates', 500, 'g')), location: 'Frigo', quantity: '450' }];
  const [row] = mergeDraft(draft, [item('a', 'Tomates', 250, 'g', 3)]);
  expect(row).toMatchObject({ version: 3, quantity: '250', unit: 'g', location: 'Frigo', notice: 'Quantité mise à jour : 250 g.' });
});

test('an unchanged draft is the same draft; after storing, only the stored rows leave it', () => {
  const draft = [draftRow(item('a', 'Farine', 1, 'kg')), draftRow(item('b', 'Riz', 1, 'kg'))];
  expect(mergeDraft(draft, [item('a', 'Farine', 1, 'kg'), item('b', 'Riz', 1, 'kg')])).toBe(draft);
  expect(afterStorage(draft, ['a']).map(row => row.id)).toEqual(['b']);
});
