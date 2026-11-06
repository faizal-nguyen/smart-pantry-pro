import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecipeDiscovery from '../RecipeDiscovery';
import { creator, item, OWNER, OTHER, prepared } from './fixtures';

let mockOwner = OWNER;
const mockCapture = jest.fn(), mockDecide = jest.fn(), mockPrepare = jest.fn(), mockPause = jest.fn(), mockRefresh = jest.fn();
jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthenticatedUser: () => ({ id: mockOwner }) }));
jest.mock('@/hooks/useRecipeDiscovery', () => ({ useRecipeDiscovery: (owner: string) => {
  const fixture = jest.requireActual('./fixtures');
  return {
    owner, feed: { items: owner === fixture.OWNER ? [fixture.item] : [], savedItems: [], selectionAt: fixture.DATE, mode: 'manual', limit: 5, errors: [] },
    creators: [{ ...fixture.creator, userId: owner }], links: [], isLoading: false, creatorsLoading: false,
    error: null, cacheError: null, pending: null, pendingError: null, linksError: null, isStale: false,
    capture: mockCapture, decide: mockDecide, prepare: mockPrepare, pause: mockPause, refresh: mockRefresh,
    feedback: jest.fn(), replay: jest.fn(),
  };
} }));
jest.mock('../DiscoveryDraftEditor', () => ({ __esModule: true, default: ({ prepared: value }: { prepared: { draft: { version: number } } }) => <div>Vérification canonique révision {value.draft.version}</div> }));
jest.mock('@/lib/api', () => ({ apiGet: jest.fn(), apiPost: jest.fn(), apiPatch: jest.fn(), ApiError: class extends Error {} }));
beforeEach(() => { mockOwner = OWNER; localStorage.clear(); jest.clearAllMocks(); });
function show() { return render(<MemoryRouter><RecipeDiscovery /></MemoryRouter>); }

test('a rejected link keeps its title and URL, while account switching hides both input and previous selection', async () => {
  mockCapture.mockRejectedValueOnce(new Error('Quota d’import atteint'));
  const view = show();
  fireEvent.click(screen.getByText('Mes créateurs et mes liens'));
  fireEvent.change(screen.getByLabelText('Lien de la recette'), { target: { value: item.sourceUrl } });
  fireEvent.change(screen.getByLabelText('Nom du plat, si connu'), { target: { value: 'Lien conservé du test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Proposer ce lien' }));
  expect(await screen.findByText('Quota d’import atteint')).toBeVisible();
  expect(screen.getByLabelText('Lien de la recette')).toHaveValue(item.sourceUrl);
  expect(screen.getByLabelText('Nom du plat, si connu')).toHaveValue('Lien conservé du test');
  mockOwner = OTHER;
  view.rerender(<MemoryRouter><RecipeDiscovery /></MemoryRouter>);
  expect(screen.getByLabelText('Lien de la recette')).toHaveValue('');
  expect(screen.getByLabelText('Nom du plat, si connu')).toHaveValue('');
  expect(screen.queryByRole('heading', { name: item.title })).not.toBeInTheDocument();
  expect(localStorage.getItem(`v10-routine:${OWNER}:discovery-capture`)).toContain('Lien conservé du test');
});
test('keeping records the intention before opening its canonical import editor', async () => {
  mockDecide.mockResolvedValueOnce({ item: { ...item, status: 'kept', version: 2 } });
  mockPrepare.mockResolvedValueOnce(prepared);
  show();
  expect(screen.getByText(/Aucune veille automatique/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Garder' }));
  expect(await screen.findByText('Vérification canonique révision 3')).toBeVisible();
  expect(mockDecide).toHaveBeenCalledWith(item, 'keep');
  expect(mockPrepare).toHaveBeenCalledWith(expect.objectContaining({ status: 'kept', version: 2 }));
  expect(mockCapture).not.toHaveBeenCalled();
});
test('an unconfirmed pause rereads creators and never claims that the source was paused', async () => {
  mockPause.mockRejectedValueOnce(new Error('Pause non confirmée'));
  mockRefresh.mockResolvedValueOnce(undefined);
  show();
  fireEvent.click(screen.getByText('Mes créateurs et mes liens'));
  fireEvent.click(screen.getByRole('button', { name: `Mettre en pause ${creator.name}` }));
  expect(await screen.findByText('Pause non confirmée')).toBeVisible();
  expect(mockRefresh).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(`${creator.name} mis en pause.`)).not.toBeInTheDocument();
});
