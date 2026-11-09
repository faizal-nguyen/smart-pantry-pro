import { isAllowedFetchUrl, safeFetch, SSRFBlockedError } from '../ssrfGuard.js';

const mockLookup = jest.fn();
jest.mock('node:dns/promises', () => ({ lookup: (...args: unknown[]) => mockLookup(...args) }));

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset(); mockLookup.mockReset();
  mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
  global.fetch = fetchMock as unknown as typeof fetch;
});
const response = (status: number, headers: Record<string, string> = {}) => new Response(status === 200 ? 'ok' : null, { status, headers });

// Audit 2026-11-07, security P2 4: bracketed IPv6, redirects followed, no DNS check.
describe('SSRF guard', () => {
  test.each(['http://[::1]/', 'http://[::ffff:127.0.0.1]/', 'http://[::ffff:a9fe:a9fe]/latest/meta-data/', 'http://[fd12:3456::1]/',
    'http://[fe80::1]/', 'http://[::]/', 'http://0.0.0.0/', 'http://100.64.0.1/', 'http://2130706433/', 'http://metadata.internal/'])(
    '%s is refused', url => expect(isAllowedFetchUrl(url)).toBe(false));
  test.each(['https://example.com/', 'https://[2606:4700::1111]/', 'https://www.instagram.com/p/x/'])(
    '%s is allowed', url => expect(isAllowedFetchUrl(url)).toBe(true));

  test('a name resolving to a private address is refused before any request', async () => {
    mockLookup.mockResolvedValue([{ address: '10.0.0.5', family: 4 }]);
    await expect(safeFetch('https://intranet.example.com/')).rejects.toBeInstanceOf(SSRFBlockedError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  test('a redirect is followed only after its target is checked', async () => {
    fetchMock.mockResolvedValueOnce(response(302, { location: 'https://cdn.example.com/a.jpg' })).mockResolvedValueOnce(response(200));
    const res = await safeFetch('https://example.com/a');
    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual(['https://example.com/a', 'https://cdn.example.com/a.jpg']);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ redirect: 'manual' });
  });
  test('a redirect to the metadata address is refused and never requested', async () => {
    fetchMock.mockResolvedValueOnce(response(301, { location: 'http://169.254.169.254/latest/meta-data/' }));
    await expect(safeFetch('https://example.com/a')).rejects.toBeInstanceOf(SSRFBlockedError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  test('too many redirects stop', async () => {
    fetchMock.mockResolvedValue(response(302, { location: 'https://example.com/loop' }));
    await expect(safeFetch('https://example.com/loop')).rejects.toBeInstanceOf(SSRFBlockedError);
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });
});
