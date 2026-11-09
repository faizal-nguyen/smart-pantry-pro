import { fireEvent, render, screen } from '@testing-library/react';
import ProductSheet from '../ProductSheet';
import StockAvatar from '../StockAvatar';
import type { InventoryItem } from '@/hooks/useInventory';

const NOW = new Date('2026-11-07T12:00:00Z');
const lot = (product: Partial<NonNullable<InventoryItem['product']>>): InventoryItem => ({
  id: 'inv-1', product_id: 'p-1', quantity: 1, unit: 'pot', expiry_date: '2026-12-01', location: 'Placard',
  product: { id: 'p-1', name: 'Mayonnaise Kewpie', category: 'epicerie', unit_type: 'pot', ...product },
} as InventoryItem);

test('keeps qualitative amounts and opening checks on the lot, as text', () => {
  const item = { ...lot({ name: 'Lait concentré sucré' }), notes: 'Plutôt plein. Ouvert depuis environ une semaine ; au réfrigérateur. Conservation à vérifier.\n<script>not executable</script>' };
  const { container } = render(<ProductSheet now={NOW} onClose={jest.fn()} item={item} />);
  expect(screen.getByLabelText('Notes du stock')).toHaveTextContent('Conservation à vérifier.');
  expect(screen.getByText(/<script>not executable<\/script>/)).toBeInTheDocument();
  expect(container.querySelector('script')).toBeNull();
});

test('old lots without notes keep the existing sheet', () => {
  render(<ProductSheet now={NOW} onClose={jest.fn()} item={lot({})} />);
  expect(screen.queryByLabelText('Notes du stock')).not.toBeInTheDocument();
});

test('shows the kept photo, the lot and the Open Food Facts details with their credit', () => {
  render(<ProductSheet now={NOW} onClose={jest.fn()} photoUrl="https://signed.example/kewpie.jpg" item={lot({
    brand: 'Kewpie', barcode: '4901577000058', enrichment_status: 'enriched', off_product_code: '4901577000058',
    nutrition_json: { scores: { nutriScore: 'e', novaGroup: 4 } }, allergens_json: { allergensTags: ['en:eggs', 'en:mustard'] },
    ingredients_text: 'Huile végétale, jaune d’œuf, vinaigre',
  })} />);
  expect(screen.getByRole('dialog', { name: 'Mayonnaise Kewpie' })).toBeInTheDocument();
  expect(screen.getByText('Marque : Kewpie')).toBeInTheDocument();
  expect(screen.getByAltText('Photo de Mayonnaise Kewpie')).toHaveAttribute('src', 'https://signed.example/kewpie.jpg');
  expect(screen.getByTitle('Nutri-Score E')).toBeInTheDocument();
  expect(screen.getByText('NOVA 4 : produit ultra-transformé')).toBeInTheDocument();
  expect(screen.getByText('Allergènes : œufs, moutarde')).toBeInTheDocument();
  expect(screen.getByText('Huile végétale, jaune d’œuf, vinaigre')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open Food Facts' })).toHaveAttribute('href', 'https://world.openfoodfacts.org/product/4901577000058');
});

test('a branded product Open Food Facts does not know says so; a plain one says nothing', () => {
  const { unmount } = render(<ProductSheet now={NOW} onClose={jest.fn()} item={lot({ name: 'Classic Burger Sauce Yummys', brand: 'Yummys', enrichment_status: 'none' })} />);
  expect(screen.getByText(/Open Food Facts ne connaît pas encore ce produit/)).toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  unmount();
  render(<ProductSheet now={NOW} onClose={jest.fn()} item={lot({ name: 'Pommes' })} />);
  expect(screen.queryByText(/Open Food Facts/)).not.toBeInTheDocument();
});

test('the stock avatar shows the kept photo, falls back to the parcel icon, and opens the sheet', () => {
  const open = jest.fn();
  const { container } = render(<StockAvatar name="Mayonnaise Kewpie" photoUrl="https://signed.example/k.jpg" onOpen={open} />);
  const image = container.querySelector('img') as HTMLImageElement;
  expect(image).toHaveAttribute('src', 'https://signed.example/k.jpg');
  fireEvent.error(image);
  expect(container.querySelector('img')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Voir la fiche de Mayonnaise Kewpie' }));
  expect(open).toHaveBeenCalled();
});
