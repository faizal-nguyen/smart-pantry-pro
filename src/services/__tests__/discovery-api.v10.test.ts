import { apiGet, apiPost } from '@/lib/api';
import { discoveryApi, pendingDiscoveryWrite, replayDiscoveryWrite, safeDiscoverySourceUrl } from '../discoveryApi';
import { DATE, item, OTHER, OWNER } from '@/components/recipes/discovery/__tests__/fixtures';

jest.mock('@/lib/api', () => ({
  apiGet: jest.fn(), apiPost: jest.fn(), apiPatch: jest.fn(),
  ApiError: class extends Error {
    status: number; code?: string;
    constructor(message: string, options: { status: number; code?: string }) { super(message); this.status = options.status; this.code = options.code; }
  },
}));
const mockGet = apiGet as jest.Mock, mockPost = apiPost as jest.Mock;
beforeEach(() => { localStorage.clear(); jest.clearAllMocks(); });

test('a feed from another owner is refused before any private selection is returned', async () => {
  mockGet.mockResolvedValueOnce({ items: [{ ...item, userId: OTHER }], savedItems: [], selectionAt: DATE, mode: 'manual', limit: 5 });
  await expect(discoveryApi.feed(OWNER)).rejects.toThrow(/autre compte/);
  expect(mockGet).toHaveBeenCalledWith('/recipes/discovery', undefined, { expectedUserId: OWNER, signal: undefined });
});
test('a lost decision reply retains its command and a replay sends the same version and payload', async () => {
  Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: () => '00000000-0000-4000-8000-000000000099' });
  mockPost.mockRejectedValueOnce(new Error('Réseau coupé'));
  await expect(discoveryApi.decide(OWNER, item, 'keep')).rejects.toThrow('Réseau coupé');
  const first = mockPost.mock.calls[0][1];
  expect(pendingDiscoveryWrite(OWNER)?.body).toEqual(first);
  await expect(discoveryApi.decide(OWNER, item, 'pass')).rejects.toThrow(/précédente/);
  expect(mockPost).toHaveBeenCalledTimes(1);
  mockPost.mockResolvedValueOnce({ item: { ...item, version: 2, status: 'kept' }, replayed: true });
  await replayDiscoveryWrite(OWNER);
  expect(mockPost.mock.calls[1][1]).toEqual(first);
  expect(first).toEqual({ commandId: '00000000-0000-4000-8000-000000000099', expectedVersion: 1, decision: 'keep' });
  expect(pendingDiscoveryWrite(OWNER)).toBeNull();
});
test('pending choices stay private to their owner and unsafe outgoing source schemes are refused', async () => {
  Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: () => '00000000-0000-4000-8000-000000000099' });
  mockPost.mockRejectedValueOnce(new Error('Réseau coupé'));
  await expect(discoveryApi.decide(OWNER, item, 'not_today')).rejects.toThrow();
  expect(pendingDiscoveryWrite(OTHER)).toBeNull();
  expect(safeDiscoverySourceUrl('javascript:alert(1)')).toBeNull();
  expect(safeDiscoverySourceUrl('https://user:secret@example.test/recipe')).toBeNull();
  expect(safeDiscoverySourceUrl(item.sourceUrl)).toBe(item.sourceUrl);
});

test('a response for another item keeps the exact pending decision for verification', async () => {
  Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: () => '00000000-0000-4000-8000-000000000099' });
  mockPost.mockResolvedValueOnce({ item: { ...item, id: OTHER, version: 2, status: 'kept' } });
  await expect(discoveryApi.decide(OWNER, item, 'keep')).rejects.toThrow(/lien choisi/);
  expect(pendingDiscoveryWrite(OWNER)?.targetId).toBe(item.id);
});
