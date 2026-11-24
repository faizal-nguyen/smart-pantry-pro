import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { MenuShoppingLine, MenuShoppingPreview } from '@smart/shared';
import { ApiError } from '@/lib/api';
import WeekShoppingPage from '../WeekShoppingPage';
import { useMenuShoppingPreview } from '@/hooks/useMenuShoppingPreview';
import { confirmMenuShopping, pendingMenuShopping, resendMenuShopping } from '@/services/menuShopping';
import { undoStockCommand } from '@/services/stockCommands';

jest.mock('@/lib/api', () => ({ ApiError: class extends Error {
  status: number; code?: string;
  constructor(message: string, options: { status: number; code?: string }) { super(message); this.status = options.status; this.code = options.code; }
} }));
jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthenticatedUser: () => ({ id: '00000000-0000-4000-8000-000000000001' }) }));
jest.mock('@/hooks/useCalendarNow', () => ({ useCalendarNow: () => new Date('2026-11-24T12:00:00Z') }));
let mockPreview: { data?: MenuShoppingPreview; isLoading: boolean; isError: boolean; error: Error | null; isFetching: boolean } ;
const mockRefetch = jest.fn();
jest.mock('@/hooks/useMenuShoppingPreview', () => ({ useMenuShoppingPreview: jest.fn(() => ({ ...mockPreview, refetch: mockRefetch })) }));
jest.mock('@/services/menuShopping', () => ({ confirmMenuShopping: jest.fn(), resendMenuShopping: jest.fn(), pendingMenuShopping: jest.fn(async () => null) }));
jest.mock('@/services/stockCommands', () => ({ undoStockCommand: jest.fn() }));

const TARGET = '50000000-0000-4000-8000-000000000001', LISTED = '50000000-0000-4000-8000-000000000002';
const meal = { id: 'm1', date: '2026-12-01', meal_type: 'lunch', recipe_name: 'Curry', quantity: 250, unit: 'g' };
const line = (key: string, state: MenuShoppingLine['state'], extra: Partial<MenuShoppingLine> = {}): MenuShoppingLine =>
  ({ key, state, name: key[0].toUpperCase() + key.slice(1), product_id: null, quantity: 1, unit: 'g', meals: [meal], ...extra });
const lines: MenuShoppingLine[] = [
  line('riz', 'to_add', { quantity: 250, target: { id: TARGET, expected_version: 3 } }),
  line('coco', 'to_add', { quantity: 400, unit: 'ml' }),
  line('pâtes', 'excess', { quantity: 200, reduction: { id: LISTED, expected_version: 4, quantity: 200, unit: 'g' } }),
  line('coriandre', 'manual', { quantity: 1, unit: 'botte' }),
  line('sucre', 'verify', { quantity: 12, verify_lots: ['Sucre en poudre'] }),
  line('farine', 'listed', { quantity: 100, listed_quantity: 500 }),
  line('lait', 'purchased_pending', { quantity: 1, unit: 'l', purchased_quantity: 1 }),
];
const week = (extra: Partial<MenuShoppingPreview> = {}): MenuShoppingPreview => ({
  week_start: '2026-11-30', as_of: '2026-11-24', menu_version: 'a'.repeat(32), context_revision: 7, lines,
  meals: [{ id: 'm1', date: '2026-12-01', meal_type: 'lunch', recipe_name: 'Curry', role: 'target' }], uncomputable: [], ...extra,
});
const confirmed = { command_id: 'command-1', command_type: 'menu_add_missing', status: 'confirmed', affected_tables: ['shopping_list'] };
const saved = { command_id: 'command-1', command_type: 'menu_add_missing', payload_version: 1,
  payload: { week_start: '2026-11-30', as_of: '2026-11-24', menu_version: 'a'.repeat(32), context_revision: 7, adds: [{ name: 'Riz', quantity: 250, unit: 'g' }, { name: 'Coco', quantity: 400, unit: 'ml' }], reductions: [] } };

function Location() { const location = useLocation(); return <output aria-label="Adresse">{location.pathname}{location.search}</output>; }
function show(path = '/shopping/week?week=2026-11-30') {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/shopping/week" element={<WeekShoppingPage />} /></Routes><Location /></MemoryRouter>);
}
const confirmButton = () => screen.getByRole('button', { name: /à ma liste|Mettre à jour ma liste/ });
beforeEach(() => {
  jest.clearAllMocks();
  mockPreview = { data: week(), isLoading: false, isError: false, error: null, isFetching: false };
  jest.mocked(pendingMenuShopping).mockResolvedValue(null);
});

test('the six states: what to add is kept, an excess is not, the rest is shown without being written', async () => {
  show();
  expect(useMenuShoppingPreview).toHaveBeenCalledWith('2026-11-30');
  expect(screen.getByRole('checkbox', { name: 'Ajouter Riz' })).toBeChecked();
  expect(screen.getByRole('textbox', { name: 'Quantité de Riz, en g' })).toHaveValue('250');
  expect(screen.getByRole('checkbox', { name: 'Retirer 200 g de Pâtes' })).not.toBeChecked();
  expect(screen.getByRole('heading', { name: 'À ajouter à la main (1)' })).toBeVisible();
  expect(screen.getByText('1 botte')).toBeVisible();
  expect(screen.getByText(/Sucre en poudre/)).toBeVisible();
  const planned = screen.getByText('Déjà prévu (2)').closest('details')!;
  expect(within(planned).getByText(/500 g déjà sur ta liste/)).toBeInTheDocument();
  expect(within(planned).getByRole('link', { name: 'Ranger mes achats' })).toHaveAttribute('href', '/shopping/list');
  expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  await act(async () => {});
});

test('confirming sends what the user kept, then offers to undo it', async () => {
  jest.mocked(confirmMenuShopping).mockResolvedValue(confirmed as never);
  show();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Ajouter Coco' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Quantité de Riz, en g' }), { target: { value: '200' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Retirer 200 g de Pâtes' }));
  fireEvent.click(screen.getByRole('button', { name: 'Mettre à jour ma liste' }));
  await screen.findByText('1 article ajouté à ta liste, 1 retiré.');
  // The confirmation bar may leave once the week is read again: focus goes to the outcome.
  expect(screen.getByText('1 article ajouté à ta liste, 1 retiré.').closest('[role="status"]')).toHaveFocus();
  expect(confirmMenuShopping).toHaveBeenCalledWith('2026-11-30', {
    week_start: '2026-11-30', as_of: '2026-11-24', menu_version: 'a'.repeat(32), context_revision: 7,
    adds: [{ name: 'Riz', quantity: 200, unit: 'g', target: { id: TARGET, expected_version: 3 } }],
    reductions: [{ id: LISTED, expected_version: 4, quantity: 200, unit: 'g' }],
  });
  jest.mocked(undoStockCommand).mockResolvedValueOnce(confirmed as never);
  fireEvent.click(screen.getByRole('button', { name: 'Annuler cet ajout' }));
  await screen.findByText('Ajout annulé : ta liste est revenue comme avant.');
  expect(undoStockCommand).toHaveBeenCalledWith('command-1');
  // Once the list changed through the review, its choices start again from the defaults.
  expect(screen.getByRole('checkbox', { name: 'Ajouter Coco' })).toBeChecked();
  expect(screen.getByRole('textbox', { name: 'Quantité de Riz, en g' })).toHaveValue('250');
});

test('an undo refused because the list changed since says so', async () => {
  jest.mocked(confirmMenuShopping).mockResolvedValue(confirmed as never);
  jest.mocked(undoStockCommand).mockRejectedValueOnce(new ApiError('Le stock a changé.', { status: 409, code: 'UNDO_CONFLICT' }));
  show();
  fireEvent.click(confirmButton());
  fireEvent.click(await screen.findByRole('button', { name: 'Annuler cet ajout' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Ta liste a changé depuis cet ajout : l’annuler écraserait ta modification. Corrige-la depuis tes courses.');
});

test('a refusal because the menu, stock or list changed recalculates the week and keeps the user’s choices', async () => {
  jest.mocked(confirmMenuShopping).mockRejectedValueOnce(new ApiError('Le menu a changé.', { status: 409, code: 'MENU_CHANGED' }));
  mockRefetch.mockImplementation(async () => { mockPreview = { ...mockPreview, data: week({ menu_version: 'b'.repeat(32), lines: [{ ...lines[0], quantity: 150 }, lines[1]] }) }; });
  show();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Ajouter Coco' }));
  fireEvent.click(confirmButton());
  expect(await screen.findByRole('alert')).toHaveTextContent('Ton menu, ton stock ou ta liste a changé : les courses ont été recalculées. Vérifie-les, puis confirme de nouveau.');
  expect(mockRefetch).toHaveBeenCalled();
  expect(screen.getByRole('checkbox', { name: 'Ajouter Coco' })).not.toBeChecked();
  expect(screen.getByRole('textbox', { name: 'Quantité de Riz, en g' })).toHaveValue('150');
});

test('a double tap sends one confirmation', async () => {
  let resolve!: (value: unknown) => void;
  jest.mocked(confirmMenuShopping).mockReturnValue(new Promise(done => { resolve = done; }) as never);
  show();
  fireEvent.click(confirmButton());
  fireEvent.click(confirmButton());
  expect(confirmMenuShopping).toHaveBeenCalledTimes(1);
  await act(async () => { resolve(confirmed); });
});

test('an unconfirmed reply (429) keeps the choices locked until the same confirmation is checked', async () => {
  jest.mocked(confirmMenuShopping).mockRejectedValueOnce(new ApiError('Trop de demandes', { status: 429, code: 'RATE_LIMITED' }));
  jest.mocked(resendMenuShopping).mockResolvedValueOnce(confirmed as never);
  show();
  await act(async () => {});
  // The confirmation was saved before it was sent: the page reads it back.
  jest.mocked(pendingMenuShopping).mockResolvedValue(saved as never);
  fireEvent.click(confirmButton());
  expect(await screen.findByRole('alert')).toHaveTextContent('La confirmation n’est pas encore vérifiée');
  expect(screen.getByRole('checkbox', { name: 'Ajouter Riz' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Vérifier la confirmation envoyée' }));
  await screen.findByText('2 articles ajoutés à ta liste.');
  expect(resendMenuShopping).toHaveBeenCalledWith('2026-11-30');
  expect(confirmMenuShopping).toHaveBeenCalledTimes(1);
});

test('a confirmation left pending by a lost reply is offered for checking on arrival', async () => {
  jest.mocked(pendingMenuShopping).mockResolvedValue(saved as never);
  show();
  expect(await screen.findByRole('button', { name: 'Vérifier la confirmation envoyée' })).toBeEnabled();
  expect(screen.getByRole('checkbox', { name: 'Ajouter Riz' })).toBeDisabled();
});

test('a week without meals to come says so and leads to the menu or the next week', async () => {
  mockPreview = { ...mockPreview, data: week({ lines: [], meals: [] }) };
  show();
  expect(screen.getByText('Aucun repas à préparer d’ici dimanche.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Planifier mes repas' })).toHaveAttribute('href', '/kitchen/meal-planning?week=2026-11-30');
  fireEvent.click(screen.getByRole('button', { name: 'Semaine suivante' }));
  expect(screen.getByLabelText('Adresse')).toHaveTextContent('/shopping/week?week=2026-12-07');
  expect(screen.queryByRole('button', { name: /à ma liste/ })).not.toBeInTheDocument();
  await act(async () => {});
});

test('nothing to buy: said plainly, with what is still to check, and no confirmation', async () => {
  mockPreview = { ...mockPreview, data: week({ lines: [lines[4]] }) };
  show();
  expect(screen.getByText('Rien à acheter pour cette semaine.')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'À vérifier (1)' })).toBeVisible();
  expect(screen.queryByRole('button', { name: /à ma liste/ })).not.toBeInTheDocument();
  await act(async () => {});
});

test('meals that cannot be counted are named with the reason', async () => {
  mockPreview = { ...mockPreview, data: week({ uncomputable: [
    { id: 'm2', date: '2026-12-02', meal_type: 'dinner', recipe_name: 'Curry vert', role: 'target', reason: 'RECIPE_UNAVAILABLE' },
    { id: 'm3', date: '2026-12-03', meal_type: 'lunch', recipe_name: 'Reste', role: 'target', reason: 'NO_RECIPE' },
  ] }) };
  show();
  expect(screen.getByText('Curry vert (mer. 2 déc., dîner) : recette introuvable.')).toBeVisible();
  expect(screen.getByText('Reste (jeu. 3 déc., déjeuner) : aucune recette liée.')).toBeVisible();
  await act(async () => {});
});

test('a day that is not a Monday opens the current week', async () => {
  show('/shopping/week?week=2026-12-01');
  expect(useMenuShoppingPreview).toHaveBeenCalledWith('2026-11-23');
  await act(async () => {});
});

test('an amount above what the week needs is refused before sending', async () => {
  show();
  fireEvent.change(screen.getByRole('textbox', { name: 'Quantité de Riz, en g' }), { target: { value: '300' } });
  expect(screen.getByText('Au plus 250 g : ce que la semaine demande. Le reste s’ajoute depuis ta liste.')).toBeVisible();
  expect(confirmButton()).toBeDisabled();
  await act(async () => {});
});

test('loading and failure states', async () => {
  mockPreview = { data: undefined, isLoading: true, isError: false, error: null, isFetching: true };
  const view = show();
  expect(screen.getByText('Calcul des courses de la semaine…')).toHaveAttribute('role', 'status');
  view.unmount();
  mockPreview = { data: undefined, isLoading: false, isError: true, error: new Error('Les courses de la semaine ne peuvent pas être calculées.'), isFetching: false };
  show();
  expect(screen.getByRole('alert')).toHaveTextContent('Les courses de la semaine ne peuvent pas être calculées.');
  fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
  await waitFor(() => expect(mockRefetch).toHaveBeenCalled());
});

// Review 2026-11-24: TanStack Query keeps the data of a failed refetch; the review and its undo stay.
test('a failed recalculation keeps the review on screen, with a way to read it again', async () => {
  mockPreview = { ...mockPreview, isError: true, error: new Error('Les courses de la semaine ne peuvent pas être calculées.') };
  show();
  expect(screen.getByRole('checkbox', { name: 'Ajouter Riz' })).toBeVisible();
  expect(screen.getByRole('alert')).toHaveTextContent('Les courses de la semaine ne peuvent pas être calculées.');
  fireEvent.click(screen.getByRole('button', { name: 'Relire les courses' }));
  await waitFor(() => expect(mockRefetch).toHaveBeenCalled());
});

test('a list the server refuses to write as such is explained, not shown as raw data', async () => {
  const invalid = Object.assign(new Error('[{"code":"too_big"}]'), { name: 'ZodError' });
  jest.mocked(confirmMenuShopping).mockRejectedValueOnce(invalid);
  show();
  fireEvent.click(confirmButton());
  expect(await screen.findByRole('alert')).toHaveTextContent('Une ligne ne peut pas être écrite sur la liste telle quelle. Décoche-la et ajoute-la depuis tes courses.');
});

// 24 Nov 2026: a close product in stock is named to check, not proposed to buy.
test('a line to check names the close product in stock', async () => {
  mockPreview = { ...mockPreview, data: week({ lines: [line('pâte de curry', 'verify', { quantity: 45, similar_lots: ['Pâte de Curry Jaune'] })] }) };
  show();
  expect(screen.getByText('Produit proche dans ton stock : Pâte de Curry Jaune. Vérifie que c’est le même avant d’en acheter.')).toBeVisible();
  expect(screen.queryByText(/Date, quantité ou unité à vérifier|Quantité, unité ou date à vérifier/)).not.toBeInTheDocument();
  await act(async () => {});
});
