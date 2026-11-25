import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InsightsPage from '../InsightsPage';

interface InventoryState { loading: boolean; error: Error | null; inventory: { id: string; quantity: number; expiry_date: string | null }[] }
const state: InventoryState = { loading: false, error: null, inventory: [] };
const refetchInventory = jest.fn();
const refetchAll = jest.fn();
const shoppingRead = jest.fn();

jest.mock('@/hooks/useInventory', () => ({ useInventory: () => ({ ...state, refetchInventory, refetch: refetchAll }) }));
jest.mock('@/hooks/useShoppingList', () => ({ useShoppingList: () => { shoppingRead(); return {}; } }));

const lot = (id: string, quantity: number, expiry_date: string | null) => ({ id, quantity, expiry_date });
const FALSE_FIGURES = /€|Économies|Insights Dashboard|Exporter|Partager|Valeur inventaire|vs mois dernier/;
const ANY_FIGURE = /\d+ lots?\b/;

function renderPage() {
  return render(<MemoryRouter><InsightsPage /></MemoryRouter>);
}
const soonCard = () => screen.getByRole('region', { name: 'À utiliser sous 7 jours' });
const stockCard = () => screen.getByRole('region', { name: 'Lots en stock' });

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-25T10:00:00+01:00'));
  Object.assign(state, { loading: false, error: null, inventory: [] });
  refetchInventory.mockReset().mockResolvedValue(undefined);
  refetchAll.mockReset();
  shoppingRead.mockClear();
});
afterEach(() => jest.useRealTimers());

describe('analyses page after E1a', () => {
  test('the page is titled in French and leads to the declared losses', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Analyses' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir mes pertes' })).toHaveAttribute('href', '/insights/waste');
  });

  test('while the stock is read, a status shows and no figure does', () => {
    Object.assign(state, { loading: true, inventory: [lot('a', 1, '2026-11-26')] });
    const { container } = renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Chargement de ton stock…');
    expect(container.textContent).not.toMatch(ANY_FIGURE);
  });

  test('a failed read is announced and shows no figure', () => {
    Object.assign(state, { error: new Error('read failed'), inventory: [] });
    const { container } = renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent('Impossible de lire ton stock pour le moment.');
    expect(container.textContent).not.toMatch(ANY_FIGURE);
  });

  test('a retry reads the lots only and stays loading until they answer, never showing an empty stock', async () => {
    Object.assign(state, { error: new Error('read failed'), inventory: [] });
    let answer: () => void = () => undefined;
    refetchInventory.mockImplementation(() => new Promise<void>(resolve => {
      // The real hook clears the error before the answer: the page must not read that as an empty stock.
      Object.assign(state, { error: null });
      answer = () => { Object.assign(state, { inventory: [lot('a', 1, '2026-11-26')] }); resolve(); };
    }));
    renderPage();
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Réessayer' }));
    expect(refetchInventory).toHaveBeenCalledTimes(1);
    expect(refetchAll).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Chargement de ton stock…');
    expect(screen.queryByText('Aucun produit en stock')).not.toBeInTheDocument();
    await act(async () => { answer(); });
    expect(within(soonCard()).getByText('1 lot')).toBeInTheDocument();
  });

  test('a stock without any quantity says so under a second-level heading and leads to the stock', () => {
    Object.assign(state, { inventory: [lot('a', 0, '2026-11-26')] });
    renderPage();
    expect(screen.getByRole('heading', { level: 2, name: 'Aucun produit en stock' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ajouter au stock' })).toHaveAttribute('href', '/pantry/inventory');
  });

  test('the measures carry their period and their coverage', () => {
    Object.assign(state, { inventory: [
      lot('a', 1, '2026-11-25'), lot('b', 2, '2026-11-28'), lot('c', 1, '2026-12-02'), lot('d', 1, '2026-12-03'),
      lot('e', 1, '2026-11-20'), lot('f', 1, null), lot('g', 1, null), lot('h', 0, '2026-11-26'),
    ] });
    const { container } = renderPage();
    expect(within(soonCard()).getByText('3 lots')).toBeInTheDocument();
    expect(within(soonCard()).getByText('d’ici le mercredi 2 décembre')).toBeInTheDocument();
    expect(within(soonCard()).getByText('2 lots sans date et 1 lot à date dépassée, non comptés')).toBeInTheDocument();
    expect(within(soonCard()).getByRole('link', { name: 'Voir mon stock' })).toHaveAttribute('href', '/pantry/inventory');
    expect(within(stockCard()).getByText('7 lots')).toBeInTheDocument();
    expect(within(stockCard()).getByText('à quantité positive, à ce jour')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(FALSE_FIGURES);
  });

  test('a measured zero is shown, and singulars read as such', () => {
    Object.assign(state, { inventory: [lot('a', 1, '2026-12-20'), lot('b', 1, null)] });
    renderPage();
    expect(within(soonCard()).getByText('0 lot')).toBeInTheDocument();
    expect(within(soonCard()).getByText('1 lot sans date, non compté')).toBeInTheDocument();
    expect(within(stockCard()).getByText('2 lots')).toBeInTheDocument();
  });

  test('a single passed date is said, and all dates to come are said too', () => {
    Object.assign(state, { inventory: [lot('a', 1, '2026-11-20'), lot('b', 1, '2026-11-26')] });
    const { unmount } = renderPage();
    expect(within(soonCard()).getByText('1 lot à date dépassée, non compté')).toBeInTheDocument();
    unmount();
    Object.assign(state, { inventory: [lot('b', 1, '2026-11-26')] });
    renderPage();
    expect(within(soonCard()).getByText('Tous tes lots ont une date à venir')).toBeInTheDocument();
  });

  test('a page left open past midnight moves its window to the new day', () => {
    jest.setSystemTime(new Date('2026-11-25T23:59:30+01:00'));
    Object.assign(state, { inventory: [lot('a', 1, '2026-11-25'), lot('b', 1, '2026-12-03')] });
    renderPage();
    expect(within(soonCard()).getByText('1 lot')).toBeInTheDocument();
    expect(within(soonCard()).getByText('d’ici le mercredi 2 décembre')).toBeInTheDocument();
    act(() => { jest.advanceTimersByTime(60_000); });
    expect(within(soonCard()).getByText('d’ici le jeudi 3 décembre')).toBeInTheDocument();
    expect(within(soonCard()).getByText('1 lot')).toBeInTheDocument();
    expect(within(soonCard()).getByText('1 lot à date dépassée, non compté')).toBeInTheDocument();
  });

  test('the page no longer reads the shopping list', () => {
    Object.assign(state, { inventory: [lot('a', 1, '2026-11-26')] });
    renderPage();
    expect(shoppingRead).not.toHaveBeenCalled();
  });
});
