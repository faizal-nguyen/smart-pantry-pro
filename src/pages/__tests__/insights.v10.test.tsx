import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InsightsPage from '../InsightsPage';
import { dispatchAgentDbChanged } from '@/lib/agentEvents';
import { deleteWasteEvent, readWasteLog } from '@/services/wasteLog';
import type { WasteEvent } from '@/lib/wasteSummary';

const OWNER = '00000000-0000-4000-8000-000000000001';
interface InventoryState { loading: boolean; error: Error | null; inventory: { id: string; quantity: number; expiry_date: string | null }[] }
const state: InventoryState = { loading: false, error: null, inventory: [] };
const refetchInventory = jest.fn();
const refetchAll = jest.fn();
const shoppingRead = jest.fn();

jest.mock('@/hooks/useInventory', () => ({ useInventory: () => ({ ...state, refetchInventory, refetch: refetchAll }) }));
jest.mock('@/hooks/useShoppingList', () => ({ useShoppingList: () => { shoppingRead(); return {}; } }));
jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthenticatedUser: () => ({ id: '00000000-0000-4000-8000-000000000001' }) }));
jest.mock('@/services/wasteLog', () => ({ readWasteLog: jest.fn(), deleteWasteEvent: jest.fn() }));
const read = jest.mocked(readWasteLog);
const remove = jest.mocked(deleteWasteEvent);

const lot = (id: string, quantity: number, expiry_date: string | null) => ({ id, quantity, expiry_date });
const waste = (id: string, occurred_at: string, patch: Partial<WasteEvent> = {}): WasteEvent => ({
  id, product_name: `Produit ${id}`, category: 'Légumes', quantity: 1, unit_type: 'pièce', reason: 'expired', notes: null,
  estimated_cost_eur: null, occurred_at, ...patch,
});
const LOG = [
  waste('w1', '2026-11-24T10:00:00Z', { reason: 'spoiled', category: 'Fruits', quantity: 250, unit_type: 'g', estimated_cost_eur: 1.2 }),
  waste('w2', '2026-11-20T10:00:00Z', { category: 'Produits laitiers', quantity: 2 }),
  waste('w3', '2026-11-10T10:00:00Z', { reason: 'spoiled', quantity: 120, unit_type: 'g' }),
  waste('w4', '2026-09-02T10:00:00Z', { reason: 'other', category: null, estimated_cost_eur: 0.5 }),
];
const FALSE_FIGURES = /Économies|Insights Dashboard|Exporter|Partager|Valeur inventaire|vs mois dernier|unités cumulées|Quantité totale/;
const ANY_LOT = /\d+ lots?\b/;

function renderPage(entry = '/insights') {
  return render(<MemoryRouter initialEntries={[entry]}><InsightsPage /></MemoryRouter>);
}
const soonCard = () => screen.getByRole('region', { name: 'À utiliser sous 7 jours' });
const stockCard = () => screen.getByRole('region', { name: 'Lots en stock' });
const losses = () => screen.getByRole('region', { name: 'Pertes déclarées' });
const card = (name: string) => within(losses()).getByRole('region', { name });
const findCard = async (name: string) => within(losses()).findByRole('region', { name });
const text = (node: HTMLElement) => (node.textContent ?? '').replace(/\s+/g, ' ');

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-25T10:00:00+01:00'));
  Object.assign(state, { loading: false, error: null, inventory: [lot('a', 1, '2026-11-26')] });
  refetchInventory.mockReset().mockResolvedValue(undefined);
  refetchAll.mockReset();
  shoppingRead.mockClear();
  read.mockReset().mockResolvedValue([]);
  remove.mockReset().mockResolvedValue(undefined);
});
afterEach(() => jest.useRealTimers());

describe('« Mes analyses »: page and stock', () => {
  test('one page titled in French, a stock section and a losses section', async () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Mes analyses' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Stock' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Pertes déclarées' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'À utiliser sous 7 jours' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Voir mes pertes' })).not.toBeInTheDocument();
    await screen.findByText('Aucune perte déclarée pour l’instant');
  });

  test('while the stock is read, a status shows and no lot figure does', async () => {
    Object.assign(state, { loading: true });
    renderPage();
    expect(within(screen.getByRole('region', { name: 'Stock' })).getByRole('status')).toHaveTextContent('Chargement de ton stock…');
    expect(text(screen.getByRole('region', { name: 'Stock' }))).not.toMatch(ANY_LOT);
    await screen.findByText('Aucune perte déclarée pour l’instant');
  });

  test('a failed stock read is announced, and a retry reads the lots only while staying in loading', async () => {
    Object.assign(state, { error: new Error('read failed'), inventory: [] });
    let answer: () => void = () => undefined;
    refetchInventory.mockImplementation(() => new Promise<void>(resolve => {
      Object.assign(state, { error: null });
      answer = () => { Object.assign(state, { inventory: [lot('a', 1, '2026-11-26')] }); resolve(); };
    }));
    renderPage();
    const stock = screen.getByRole('region', { name: 'Stock' });
    expect(within(stock).getByRole('alert')).toHaveTextContent('Impossible de lire ton stock pour le moment.');
    fireEvent.click(within(stock).getByRole('button', { name: 'Réessayer' }));
    expect(refetchInventory).toHaveBeenCalledTimes(1);
    expect(refetchAll).not.toHaveBeenCalled();
    expect(within(stock).getByRole('status')).toHaveTextContent('Chargement de ton stock…');
    expect(screen.queryByText('Aucun produit en stock')).not.toBeInTheDocument();
    await act(async () => { answer(); });
    expect(within(soonCard()).getByText('1 lot')).toBeInTheDocument();
  });

  test('an empty stock says so under a third-level heading and leads to the stock', async () => {
    Object.assign(state, { inventory: [lot('a', 0, '2026-11-26')] });
    renderPage();
    expect(screen.getByRole('heading', { level: 3, name: 'Aucun produit en stock' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ajouter au stock' })).toHaveAttribute('href', '/pantry/inventory');
    await screen.findByText('Aucune perte déclarée pour l’instant');
  });

  test('the stock measures carry their period and coverage', async () => {
    Object.assign(state, { inventory: [
      lot('a', 1, '2026-11-25'), lot('b', 2, '2026-11-28'), lot('c', 1, '2026-12-02'), lot('d', 1, '2026-12-03'),
      lot('e', 1, '2026-11-20'), lot('f', 1, null), lot('g', 1, null), lot('h', 0, '2026-11-26'),
    ] });
    renderPage();
    expect(within(soonCard()).getByText('3 lots')).toBeInTheDocument();
    expect(within(soonCard()).getByText('d’ici le mercredi 2 décembre')).toBeInTheDocument();
    expect(within(soonCard()).getByText('2 lots sans date et 1 lot à date dépassée, non comptés')).toBeInTheDocument();
    expect(within(stockCard()).getByText('7 lots')).toBeInTheDocument();
    expect(within(stockCard()).getByText('à quantité positive, à ce jour')).toBeInTheDocument();
    await screen.findByText('Aucune perte déclarée pour l’instant');
  });

  test('a page left open past midnight moves its stock window to the new day', async () => {
    jest.setSystemTime(new Date('2026-11-25T23:59:30+01:00'));
    Object.assign(state, { inventory: [lot('a', 1, '2026-11-25'), lot('b', 1, '2026-12-03')] });
    renderPage();
    await screen.findByText('Aucune perte déclarée pour l’instant');
    expect(within(soonCard()).getByText('d’ici le mercredi 2 décembre')).toBeInTheDocument();
    act(() => { jest.advanceTimersByTime(60_000); });
    expect(within(soonCard()).getByText('d’ici le jeudi 3 décembre')).toBeInTheDocument();
    expect(within(soonCard()).getByText('1 lot à date dépassée, non compté')).toBeInTheDocument();
  });

  test('the page reads neither the shopping list nor any removed figure', async () => {
    read.mockResolvedValue(LOG);
    const { container } = renderPage();
    await screen.findByText('3 pertes déclarées');
    expect(shoppingRead).not.toHaveBeenCalled();
    expect(text(container)).not.toMatch(FALSE_FIGURES);
  });
});

describe('« Mes analyses »: declared losses', () => {
  test('while the losses are read, a status shows and no figure does', () => {
    read.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(within(losses()).getByRole('status')).toHaveTextContent('Chargement de tes pertes…');
    expect(text(losses())).not.toMatch(/\d+ pertes? déclarées?/);
  });

  test('a failed read is announced without the server message, and a retry stays in loading until it answers', async () => {
    read.mockRejectedValueOnce(new Error('permission denied for table food_waste_events'));
    let answer: (events: WasteEvent[]) => void = () => undefined;
    read.mockImplementationOnce(() => new Promise(resolve => { answer = resolve; }));
    renderPage();
    const alert = await within(losses()).findByRole('alert');
    expect(alert).toHaveTextContent('Impossible de lire tes pertes pour le moment.');
    expect(text(losses())).not.toMatch(/permission|food_waste_events|Aucune perte/);
    fireEvent.click(within(alert).getByRole('button', { name: 'Réessayer' }));
    expect(within(losses()).getByRole('status')).toHaveTextContent('Chargement de tes pertes…');
    await act(async () => { answer(LOG); });
    expect(within(card('Pertes')).getByText('3 pertes déclarées')).toBeInTheDocument();
  });

  test('no declaration at all says so and leads to the stock, where losses are declared', async () => {
    renderPage();
    expect(await within(losses()).findByText('Aucune perte déclarée pour l’instant')).toBeInTheDocument();
    expect(within(losses()).getByRole('link', { name: 'Déclarer depuis mon stock' })).toHaveAttribute('href', '/pantry/inventory');
  });

  test('no declaration in 30 days, with older ones, offers the whole history', async () => {
    read.mockResolvedValue([LOG[3]]);
    renderPage();
    expect(await within(losses()).findByText('Aucune perte déclarée sur les 30 derniers jours')).toBeInTheDocument();
    fireEvent.click(within(losses()).getByRole('button', { name: 'Voir depuis le début' }));
    expect(within(card('Pertes')).getByText('1 perte déclarée')).toBeInTheDocument();
    expect(within(card('Pertes')).getByText('depuis le 2 septembre')).toBeInTheDocument();
  });

  test('the last 30 days carry their period, reasons, categories and a cost with its coverage', async () => {
    read.mockResolvedValue(LOG);
    renderPage();
    expect(await within(await findCard('Pertes')).findByText('3 pertes déclarées')).toBeInTheDocument();
    expect(within(card('Pertes')).getByText('30 derniers jours, depuis le 27 octobre')).toBeInTheDocument();
    expect(text(card('Par motif'))).toMatch(/Abîmé\s*2/);
    expect(text(card('Par motif'))).toMatch(/Périmé\s*1/);
    expect(text(card('Par catégorie'))).toMatch(/Fruits\s*1/);
    expect(text(card('Coût connu'))).toMatch(/1,20\s€/);
    expect(within(card('Coût connu')).getByText('coût connu pour 1 perte sur 3')).toBeInTheDocument();
    const period = within(losses()).getByRole('group', { name: 'Période' });
    expect(within(period).getByRole('button', { name: '30 derniers jours' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('since the beginning, every declaration counts, the absent category is named', async () => {
    read.mockResolvedValue(LOG);
    renderPage();
    await within(await findCard('Pertes')).findByText('3 pertes déclarées');
    fireEvent.click(within(losses()).getByRole('button', { name: 'Depuis le début' }));
    expect(within(losses()).getByRole('button', { name: 'Depuis le début' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(card('Pertes')).getByText('4 pertes déclarées')).toBeInTheDocument();
    expect(text(card('Par catégorie'))).toMatch(/Sans catégorie\s*1/);
    expect(text(card('Coût connu'))).toMatch(/1,70\s€/);
    expect(within(card('Coût connu')).getByText('coût connu pour 2 pertes sur 4')).toBeInTheDocument();
  });

  test('without any known cost, no amount is shown', async () => {
    read.mockResolvedValue([LOG[1], LOG[2]]);
    renderPage();
    expect(await within(await findCard('Coût connu')).findByText('Coût inconnu pour les pertes de la période')).toBeInTheDocument();
    expect(text(card('Coût connu'))).not.toMatch(/€/);
  });

  test('the history lists declarations by twenty, oldest ones on demand', async () => {
    read.mockResolvedValue(Array.from({ length: 23 }, (_, index) => waste(`h${index}`, `2026-11-${String(24 - (index % 20)).padStart(2, '0')}T10:00:00Z`)));
    renderPage();
    const history = await screen.findByRole('list', { name: 'Historique des déclarations' });
    expect(within(history).getAllByRole('listitem')).toHaveLength(20);
    fireEvent.click(screen.getByRole('button', { name: 'Afficher les plus anciennes' }));
    expect(within(history).getAllByRole('listitem')).toHaveLength(23);
    expect(screen.queryByRole('button', { name: 'Afficher les plus anciennes' })).not.toBeInTheDocument();
  });

  test('a deletion says the stock is not credited back, and a cancel deletes nothing', async () => {
    read.mockResolvedValue(LOG);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer la déclaration : Produit w1, 24 novembre 2026' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Supprimer cette déclaration ?' });
    expect(dialog).toHaveTextContent('« Produit w1 », 24 novembre 2026. Elle disparaît du journal des pertes et de ces chiffres. Le stock n’est pas recrédité.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Annuler' }));
    expect(remove).not.toHaveBeenCalled();
  });

  test('a confirmed deletion removes the declaration from the figures and the list', async () => {
    read.mockResolvedValue(LOG);
    remove.mockImplementation(async () => { read.mockResolvedValue(LOG.filter(item => item.id !== 'w1')); });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer la déclaration : Produit w1, 24 novembre 2026' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Supprimer' }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith(OWNER, 'w1'));
    expect(await within(await findCard('Pertes')).findByText('2 pertes déclarées')).toBeInTheDocument();
    expect(screen.queryByText('Produit w1')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Historique des déclarations' })).toHaveFocus();
  });

  test('deleting the only declaration moves focus to the section title, the history being gone', async () => {
    read.mockResolvedValue([LOG[0]]);
    remove.mockImplementation(async () => { read.mockResolvedValue([]); });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer la déclaration : Produit w1, 24 novembre 2026' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Supprimer' }));
    expect(await within(losses()).findByText('Aucune perte déclarée pour l’instant')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Pertes déclarées' })).toHaveFocus();
  });

  test('a read started before a deletion cannot bring the row back: the read after it wins', async () => {
    read.mockResolvedValue(LOG);
    renderPage();
    await within(await findCard('Pertes')).findByText('3 pertes déclarées');
    let staleAnswer: (events: WasteEvent[]) => void = () => undefined;
    read.mockImplementationOnce(() => new Promise(resolve => { staleAnswer = resolve; }));
    act(() => { dispatchAgentDbChanged(['food_waste_events']); });
    const fresh = [waste('w5', '2026-11-25T08:00:00Z'), ...LOG.filter(item => item.id !== 'w1')];
    remove.mockImplementation(async () => { read.mockResolvedValue(fresh); });
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer la déclaration : Produit w1, 24 novembre 2026' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Supprimer' }));
    expect(await screen.findByText('Produit w5')).toBeInTheDocument();
    await act(async () => { staleAnswer(LOG); });
    expect(screen.queryByText('Produit w1')).not.toBeInTheDocument();
    expect(screen.getByText('Produit w5')).toBeInTheDocument();
  });

  test('a failed background refresh is announced rather than leaving figures that may be stale', async () => {
    read.mockResolvedValue(LOG);
    renderPage();
    await within(await findCard('Pertes')).findByText('3 pertes déclarées');
    read.mockRejectedValueOnce(new Error('offline'));
    act(() => { dispatchAgentDbChanged(['food_waste_events']); });
    expect(await within(losses()).findByRole('alert')).toHaveTextContent('Impossible de lire tes pertes pour le moment.');
  });

  test('declarations without a usable date are said apart, never counted', async () => {
    read.mockResolvedValue([LOG[0], waste('bad', 'not-a-date'), waste('later', '2026-12-30T10:00:00Z')]);
    renderPage();
    expect(await within(await findCard('Pertes')).findByText('1 perte déclarée')).toBeInTheDocument();
    expect(within(card('Pertes')).getByText('2 déclarations sans date utilisable, non comptées')).toBeInTheDocument();
    expect(screen.getByText(/^Date inconnue · Périmé/)).toBeInTheDocument();
  });

  test('a history starting in another year carries the year', async () => {
    read.mockResolvedValue([LOG[0], waste('w0', '2025-09-02T10:00:00Z')]);
    renderPage();
    await within(await findCard('Pertes')).findByText('1 perte déclarée');
    fireEvent.click(within(losses()).getByRole('button', { name: 'Depuis le début' }));
    expect(within(card('Pertes')).getByText('depuis le 2 septembre 2025')).toBeInTheDocument();
  });

  test('a failed deletion is announced and keeps the declaration', async () => {
    read.mockResolvedValue(LOG);
    remove.mockRejectedValue(new Error('refused'));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer la déclaration : Produit w1, 24 novembre 2026' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Supprimer' }));
    expect(await within(losses()).findByText('La déclaration n’a pas pu être supprimée. Réessaie.')).toBeInTheDocument();
    expect(screen.getByText('Produit w1')).toBeInTheDocument();
  });

  test('a loss declared elsewhere in the app refreshes the section', async () => {
    renderPage();
    await screen.findByText('Aucune perte déclarée pour l’instant');
    read.mockResolvedValue([LOG[0]]);
    act(() => { dispatchAgentDbChanged(['food_waste_events']); });
    expect(await within(await findCard('Pertes')).findByText('1 perte déclarée')).toBeInTheDocument();
    expect(read).toHaveBeenCalledTimes(2);
  });

  test('arriving on #pertes waits for the losses read too', async () => {
    const scroll = jest.fn();
    Element.prototype.scrollIntoView = scroll;
    let answer: (events: WasteEvent[]) => void = () => undefined;
    read.mockImplementationOnce(() => new Promise(resolve => { answer = resolve; }));
    renderPage('/insights#pertes');
    expect(within(soonCard()).getByText('1 lot')).toBeInTheDocument();
    expect(scroll).not.toHaveBeenCalled();
    await act(async () => { answer([]); });
    await waitFor(() => expect(scroll).toHaveBeenCalledTimes(1));
  });

  test('arriving on #pertes brings the losses section into view once the stock above it has answered', async () => {
    const scroll = jest.fn();
    Element.prototype.scrollIntoView = scroll;
    Object.assign(state, { loading: true });
    const view = renderPage('/insights#pertes');
    await screen.findByText('Aucune perte déclarée pour l’instant');
    expect(scroll).not.toHaveBeenCalled();
    Object.assign(state, { loading: false });
    view.rerender(<MemoryRouter initialEntries={['/insights#pertes']}><InsightsPage /></MemoryRouter>);
    await waitFor(() => expect(scroll).toHaveBeenCalledTimes(1));
    expect(scroll.mock.contexts[0]).toBe(losses());
  });
});
