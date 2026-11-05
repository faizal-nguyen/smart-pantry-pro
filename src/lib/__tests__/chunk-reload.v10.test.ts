import { claimChunkReload } from '../chunkReload';

beforeEach(() => window.sessionStorage.clear());

test('reloads when a chunk from a previous deploy fails to load', () => {
  expect(claimChunkReload(window.sessionStorage, 1_000_000)).toBe(true);
});

test('does not reload again within 10 s, so a chunk missing for good cannot loop', () => {
  claimChunkReload(window.sessionStorage, 1_000_000);
  expect(claimChunkReload(window.sessionStorage, 1_005_000)).toBe(false);
  expect(claimChunkReload(window.sessionStorage, 1_011_000)).toBe(true);
});
