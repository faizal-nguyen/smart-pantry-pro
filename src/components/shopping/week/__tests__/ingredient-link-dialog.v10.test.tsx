import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import IngredientLinkDialog from '../IngredientLinkDialog';
import { linkIngredient } from '@/services/ingredientLinks';

const OWNER = '00000000-0000-4000-8000-000000000001';
jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthenticatedUser: () => ({ id: OWNER }) }));
let mockProducts: { data?: Array<{ id: string; name: string; amounts: string[] }>; isLoading: boolean; error: Error | null } = { isLoading: false, error: null };
jest.mock('@/hooks/useStockProducts', () => ({ useStockProducts: () => ({ ...mockProducts, refetch: jest.fn() }) }));
jest.mock('@/services/ingredientLinks', () => ({ linkIngredient: jest.fn() }));
const products = [
  { id: 'p-olive', name: 'Huile d’olive', amounts: ['1 contenant'] },
  { id: 'p-tournesol', name: 'Huile de tournesol', amounts: ['1 contenant'] },
  { id: 'p-coco', name: 'Organic Coconut Milk AROY-D', amounts: ['250 ml'] },
];
const show = (onLinked = jest.fn(), similar: string[] = []) => {
  render(<IngredientLinkDialog open ingredientName="Huile neutre" similar={similar} onOpenChange={jest.fn()} onLinked={onLinked} />);
  return onLinked;
};
beforeEach(() => { jest.clearAllMocks(); mockProducts = { data: products, isLoading: false, error: null }; });

test('the stock’s products are offered, the close ones first; choosing one links it', async () => {
  jest.mocked(linkIngredient).mockResolvedValue('huile neutre');
  const onLinked = show(jest.fn(), ['Organic Coconut Milk AROY-D']);
  const choices = within(screen.getByRole('list', { name: 'Produits de ton stock' })).getAllByRole('button');
  expect(choices.map(choice => choice.textContent)).toEqual([expect.stringContaining('Organic Coconut Milk'), expect.stringContaining('Huile d’olive'), expect.stringContaining('Huile de tournesol')]);
  fireEvent.click(screen.getByRole('button', { name: /Huile de tournesol/ }));
  await waitFor(() => expect(onLinked).toHaveBeenCalledWith('Huile de tournesol', 'huile neutre'));
  expect(linkIngredient).toHaveBeenCalledWith(OWNER, 'Huile neutre', 'p-tournesol');
});

test('a search narrows the products, accents and case aside', () => {
  show();
  fireEvent.change(screen.getByRole('searchbox', { name: 'Chercher dans ton stock' }), { target: { value: 'TOURNE' } });
  expect(within(screen.getByRole('list', { name: 'Produits de ton stock' })).getAllByRole('button').map(choice => choice.textContent))
    .toEqual([expect.stringContaining('Huile de tournesol')]);
});

test('a refused link is said in the dialog, which stays open', async () => {
  jest.mocked(linkIngredient).mockRejectedValue(new Error('Ce produit n’est plus dans ton stock. Choisis-en un autre.'));
  const onLinked = show();
  fireEvent.click(screen.getByRole('button', { name: /Huile d’olive/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Ce produit n’est plus dans ton stock. Choisis-en un autre.');
  expect(onLinked).not.toHaveBeenCalled();
});

test('an empty stock and a failed read are said plainly', () => {
  mockProducts = { data: [], isLoading: false, error: null };
  const view = render(<IngredientLinkDialog open ingredientName="Huile neutre" similar={[]} onOpenChange={jest.fn()} onLinked={jest.fn()} />);
  expect(screen.getByText('Ton stock est vide : ajoute d’abord le produit à ton stock.')).toBeVisible();
  view.unmount();
  mockProducts = { data: undefined, isLoading: false, error: new Error('Lecture impossible') };
  render(<IngredientLinkDialog open ingredientName="Huile neutre" similar={[]} onOpenChange={jest.fn()} onLinked={jest.fn()} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Ton stock n’a pas pu être lu.');
});
