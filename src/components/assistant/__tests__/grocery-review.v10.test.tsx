import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import GroceryReviewDialog from '../GroceryReviewDialog';
import { postKeptGroceries, postAssistantUndo, type RecognizedGrocery } from '@/services/assistantApi';
import { resizePhoto } from '@/lib/photoResize';
import { dispatchAgentDbChanged } from '@/lib/agentEvents';

jest.mock('@/services/assistantApi', () => ({
  postKeptGroceries: jest.fn(), postAssistantUndo: jest.fn(),
  newClientRequestId: () => '99999999-9999-4999-8999-999999999999',
}));
jest.mock('@/lib/photoResize', () => ({ KEPT_PHOTO_SIDE: 1024, resizePhoto: jest.fn(async () => new Blob(['jpeg'], { type: 'image/jpeg' })) }));
jest.mock('@/lib/agentEvents', () => ({ dispatchAgentDbChanged: jest.fn() }));

const keep = jest.mocked(postKeptGroceries), undo = jest.mocked(postAssistantUndo);
const items = [
  { name: 'Lait demi-écrémé', quantity: 6, unit: 'bouteille', brand: 'Lactel', expiry_date: '2026-11-20', photo: null, barcode: null, confidence: 'high' as const },
  { name: 'Pommes', quantity: null, unit: 'piece', brand: null, expiry_date: null, photo: null, barcode: null, confidence: 'low' as const },
  { name: 'Chips', quantity: 1, unit: 'paquet', brand: null, expiry_date: null, photo: null, barcode: null, confidence: 'medium' as const },
];
const photos = (count: number) => Array.from({ length: count }, () => new Blob(['jpeg'], { type: 'image/jpeg' }));
const onAdded = jest.fn();
function review(list: readonly RecognizedGrocery[] = items, photoCount = 1) {
  render(<GroceryReviewDialog owner="owner-1" photos={photos(photoCount)} items={list} onClose={jest.fn()} onAdded={onAdded} />);
}
const ADDED = { action_id: 'act-1', step_seq: 0, tool: 'add_inventory_items', args: {}, reversible: true, undo_expires_at: '2026-11-07T12:15:00Z', risk_tier: 'low' as const,
  result: { added: [{ inventory_id: 'i1', product_id: 'p1', product_name: 'Lait demi-écrémé', quantity: 6 }, { inventory_id: 'i2', product_id: 'p2', product_name: 'Pommes', quantity: 5 }], ambiguous: [] } };
beforeEach(() => {
  jest.clearAllMocks();
  keep.mockResolvedValue({ action: ADDED });
  undo.mockResolvedValue({ undone: true } as never);
});

test('lets the owner fix and drop products, then adds the kept ones with an undo', async () => {
  review(items, 2);
  expect(await screen.findByLabelText('Nom du produit 1')).toHaveValue('Lait demi-écrémé');
  expect(within(screen.getByTestId('grocery-row-2')).getByText('À vérifier')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Quantité du produit 2'), { target: { value: '5' } });
  fireEvent.click(screen.getByLabelText('Garder le produit 3'));
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter 2 produits au stock' }));
  await screen.findByText('2 produits ajoutés au stock.');
  expect(keep).toHaveBeenCalledWith({ clientRequestId: '99999999-9999-4999-8999-999999999999', expectedUserId: 'owner-1', photos: [], items: [
    { name: 'Lait demi-écrémé', quantity: 6, unit: 'bouteille', brand: 'Lactel', expiry_date: '2026-11-20' },
    { name: 'Pommes', quantity: 5, unit: 'piece' },
  ] });
  expect(dispatchAgentDbChanged).toHaveBeenCalledWith(['inventory']);
  expect(onAdded).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Annuler cet ajout' }));
  await waitFor(() => expect(undo).toHaveBeenCalledWith('act-1'));
  expect(await screen.findByText('Ajout annulé.')).toBeInTheDocument();
});

test('the brand read on the pack can be fixed, and the stock name puts it last', async () => {
  review([{ name: 'Kewpie Mayonnaise', quantity: 310, unit: 'ml', brand: 'Kewpie', expiry_date: null, photo: null, barcode: null, confidence: 'high' }]);
  expect(await screen.findByLabelText('Marque du produit 1')).toHaveValue('Kewpie');
  expect(screen.getByText('Dans le stock : Mayonnaise Kewpie')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Marque du produit 1'), { target: { value: '' } });
  expect(screen.queryByText(/Dans le stock/)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Marque du produit 1'), { target: { value: ' Kewpie ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter 1 produit au stock' }));
  await screen.findByText(/au stock\./);
  expect(keep).toHaveBeenCalledWith(expect.objectContaining({ items: [{ name: 'Kewpie Mayonnaise', quantity: 310, unit: 'ml', brand: 'Kewpie' }] }));
});

test('a kept product without quantity blocks the add and says why', async () => {
  review();
  await screen.findByLabelText('Nom du produit 1');
  expect(screen.getByRole('button', { name: 'Ajouter 3 produits au stock' })).toBeDisabled();
  expect(screen.getByText('Indique la quantité et l’unité de chaque produit gardé.')).toBeInTheDocument();
  expect(keep).not.toHaveBeenCalled();
});

const seenOnPhotos = [
  { name: 'Mayonnaise', quantity: 1, unit: 'pot', brand: 'Kewpie', expiry_date: null, photo: 2, barcode: '3017620422003', confidence: 'high' as const },
  { name: 'Riz', quantity: 1, unit: 'kg', brand: null, expiry_date: null, photo: 2, barcode: null, confidence: 'high' as const },
  { name: 'Lait', quantity: 1, unit: 'l', brand: null, expiry_date: null, photo: 3, barcode: null, confidence: 'high' as const },
];

test('each kept product carries the photo it was seen on, made smaller; dropped products send none', async () => {
  keep.mockResolvedValue({ action: ADDED, photos_kept: 1 });
  review(seenOnPhotos, 3);
  await screen.findByLabelText('Nom du produit 1');
  expect(screen.getByText('Code-barres lu : 3017620422003')).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Garder le produit 3'));
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter 2 produits au stock' }));
  await screen.findByText(/au stock\./);
  expect(jest.mocked(resizePhoto)).toHaveBeenLastCalledWith(expect.any(Blob), 1024, 0.8);
  const sent = keep.mock.calls[0][0];
  expect(sent.photos).toHaveLength(1);
  expect(sent.items).toEqual([
    { name: 'Mayonnaise', quantity: 1, unit: 'pot', brand: 'Kewpie', barcode: '3017620422003', photo: 1 },
    { name: 'Riz', quantity: 1, unit: 'kg', photo: 1 },
  ]);
  expect(screen.queryByText(/n’ont pas pu être gardées/)).not.toBeInTheDocument();
});

test('with « Garder les photos » unticked, no photo leaves the phone', async () => {
  review(seenOnPhotos.slice(0, 1), 2);
  fireEvent.click(await screen.findByLabelText('Garder les photos sur mes produits (privé)'));
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter 1 produit au stock' }));
  await screen.findByText(/au stock\./);
  expect(keep.mock.calls[0][0]).toMatchObject({ photos: [], items: [{ name: 'Mayonnaise', barcode: '3017620422003' }] });
  expect(keep.mock.calls[0][0].items[0]).not.toHaveProperty('photo');
});

test('photos the server could not keep are said, and the add stands', async () => {
  keep.mockResolvedValue({ action: ADDED, photos_kept: 0 });
  review(seenOnPhotos.slice(0, 1), 2);
  fireEvent.click(await screen.findByRole('button', { name: 'Ajouter 1 produit au stock' }));
  expect(await screen.findByText('Les photos n’ont pas pu être gardées ; les produits, eux, sont bien dans le stock.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Annuler cet ajout' })).toBeInTheDocument();
});
