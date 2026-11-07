import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { discoveryApi } from '@/services/discoveryApi';
import { useRecipeDiscovery } from '../useRecipeDiscovery';
import { DATE, item, OTHER, OWNER } from '@/components/recipes/discovery/__tests__/fixtures';

jest.mock('@/services/discoveryApi', () => ({ discoveryApi: { feed: jest.fn(), creators: jest.fn(), links: jest.fn(), decide: jest.fn() }, pendingDiscoveryWrite: jest.fn(() => null), replayDiscoveryWrite: jest.fn() }));
jest.mock('@/lib/api', () => ({ ApiError: class extends Error { constructor(message: string) { super(message); } } }));
const mockFeed = discoveryApi.feed as jest.Mock, mockDecide = discoveryApi.decide as jest.Mock;
const feed = { items: [item], savedItems: [], selectionAt: DATE, mode: 'manual', limit: 5, errors: [] };
beforeEach(() => {
  localStorage.clear(); jest.clearAllMocks();
  (discoveryApi.creators as jest.Mock).mockResolvedValue({ creators: [] });
  (discoveryApi.links as jest.Mock).mockResolvedValue({ links: [] });
});
function show(owner = OWNER) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return { client, ...renderHook(({ user }) => useRecipeDiscovery(user), { initialProps: { user: owner }, wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> }) };
}

test('account switching aborts the previous feed and its late response cannot replace the new account selection', async () => {
  let finishFirst!: (value: unknown) => void;
  mockFeed.mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve; }));
  mockFeed.mockResolvedValueOnce({ ...feed, items: [{ ...item, userId: OTHER, title: 'Sélection du nouveau compte' }] });
  const view = show();
  await waitFor(() => expect(mockFeed).toHaveBeenCalledTimes(1));
  const oldSignal = mockFeed.mock.calls[0][1] as AbortSignal;
  view.rerender({ user: OTHER });
  await waitFor(() => expect(view.result.current.feed?.items[0].title).toBe('Sélection du nouveau compte'));
  expect(oldSignal.aborted).toBe(true);
  await act(async () => { finishFirst(feed); });
  expect(view.result.current.feed?.items[0].userId).toBe(OTHER);
  expect(view.client.getQueryData(['recipe-discovery', OWNER, 'feed'])).toBeUndefined();
  expect(localStorage.getItem(`v10-routine:${OWNER}:discovery-feed`)).toBeNull();
});
test('the last dated selection stays readable when a new request fails', async () => {
  localStorage.setItem(`v10-routine:${OWNER}:discovery-feed`, JSON.stringify(feed));
  mockFeed.mockRejectedValueOnce(new Error('Hors ligne'));
  const view = show();
  await waitFor(() => expect(view.result.current.isStale).toBe(true));
  expect(view.result.current.feed?.selectionAt).toBe(DATE);
  expect(view.result.current.feed?.items[0].id).toBe(item.id);
});
test('an in-flight decision is aborted on account change and cannot become a success for that account', async () => {
  Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: () => '00000000-0000-4000-8000-000000000099' });
  mockFeed.mockResolvedValue(feed);
  let finishDecision!: (value: unknown) => void;
  mockDecide.mockImplementationOnce(() => new Promise(resolve => { finishDecision = resolve; }));
  const view = show();
  await waitFor(() => expect(view.result.current.feed).toBeDefined());
  let pending!: Promise<unknown>;
  await act(async () => { pending = view.result.current.decide(item, 'keep'); });
  const signal = mockDecide.mock.calls[0][3] as AbortSignal;
  view.rerender({ user: OTHER });
  expect(signal.aborted).toBe(true);
  finishDecision({ item: { ...item, status: 'kept' } });
  await expect(pending).rejects.toThrow(/compte ou l’écran/);
});
