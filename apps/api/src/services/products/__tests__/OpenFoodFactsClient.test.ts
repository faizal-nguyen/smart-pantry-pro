/**
 * PRP-225 PR2 — OpenFoodFactsClient unit tests.
 *
 * Mocks `fetch` directly at the constructor level. Covers :
 *   - barcode hit / miss
 *   - search hit
 *   - timeout → OFF_TIMEOUT + retry
 *   - 429 → OFF_RATE_LIMITED + Retry-After parsing
 *   - 5xx → retry once, then surface
 *   - User-Agent missing in strict mode → OFF_DISABLED
 *   - rate limiter throttles
 */
import {
  OpenFoodFactsClient,
  OpenFoodFactsClientError,
  type OffBarcodeResponse,
  type OffSearchResponse,
} from '../OpenFoodFactsClient.js';

type FetchFn = typeof fetch;

function mockResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
}

function makeClient(opts: { fetchImpl: FetchFn; strict?: boolean; rateLimit?: number; now?: () => number } = { fetchImpl: jest.fn() }) {
  return new OpenFoodFactsClient({
    userAgent: 'SmartPantryPro-Test/1.0 (tests@local)',
    timeoutMs: 100,
    rateLimitPerMinute: opts.rateLimit ?? 10,
    fetchImpl: opts.fetchImpl,
    strictUserAgent: opts.strict ?? false,
    now: opts.now,
  });
}

describe('OpenFoodFactsClient', () => {
  it('returns the parsed product on a barcode hit', async () => {
    const payload: OffBarcodeResponse = {
      status: 1,
      code: '3017620422003',
      product: { code: '3017620422003', product_name: 'Nutella', brands: 'Ferrero' },
    };
    const fetchImpl = jest.fn(async () => mockResponse(payload)) as unknown as FetchFn;
    const client = makeClient({ fetchImpl });
    const product = await client.getProductByBarcode('3017620422003');
    expect(product?.product_name).toBe('Nutella');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('returns null on a barcode miss (status=0)', async () => {
    const fetchImpl = jest.fn(async () => mockResponse({ status: 0 })) as unknown as FetchFn;
    const client = makeClient({ fetchImpl });
    const product = await client.getProductByBarcode('0000000000000');
    expect(product).toBeNull();
  });

  it('returns the array on a search hit', async () => {
    const payload: OffSearchResponse = {
      products: [
        { code: '1', product_name: 'Skyr nature' },
        { code: '2', product_name: 'Skyr vanille' },
      ],
    };
    const fetchImpl = jest.fn(async () => mockResponse(payload)) as unknown as FetchFn;
    const client = makeClient({ fetchImpl });
    const result = await client.searchProducts('skyr', { limit: 5 });
    expect(result).toHaveLength(2);
    expect(result[0].product_name).toBe('Skyr nature');
  });

  it('retries once on 5xx then surfaces OFF_HTTP if it persists', async () => {
    const fetchImpl = jest.fn(async () => mockResponse({}, { status: 503 })) as unknown as FetchFn;
    const client = makeClient({ fetchImpl });
    await expect(client.getProductByBarcode('123')).rejects.toBeInstanceOf(OpenFoodFactsClientError);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('throws OFF_RATE_LIMITED on 429 with Retry-After', async () => {
    const fetchImpl = jest.fn(async () =>
      mockResponse({}, { status: 429, headers: { 'retry-after': '7' } })
    ) as unknown as FetchFn;
    const client = makeClient({ fetchImpl });
    try {
      await client.getProductByBarcode('123');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(OpenFoodFactsClientError);
      const e = err as OpenFoodFactsClientError;
      expect(e.code).toBe('OFF_RATE_LIMITED');
      expect(e.retryAfter).toBe(7);
      // 429 is NOT retried — single call.
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    }
  });

  it('throws OFF_TIMEOUT when fetch aborts and retries once', async () => {
    const fetchImpl = jest.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      // Wait long enough for the AbortController to fire.
      return await new Promise<Response>((_resolve, reject) => {
        const onAbort = () => reject(new DOMException('aborted', 'AbortError'));
        init?.signal?.addEventListener('abort', onAbort);
      });
    }) as unknown as FetchFn;
    const client = makeClient({ fetchImpl });
    try {
      await client.getProductByBarcode('123');
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as OpenFoodFactsClientError;
      expect(e.code).toBe('OFF_TIMEOUT');
      // retried once → 2 fetch calls
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    }
  });

  it('refuses to call when User-Agent missing in strict mode', async () => {
    const fetchImpl = jest.fn() as unknown as FetchFn;
    const client = new OpenFoodFactsClient({
      userAgent: undefined,
      strictUserAgent: true,
      fetchImpl,
    });
    expect(client.isEnabled()).toBe(false);
    try {
      await client.getProductByBarcode('123');
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as OpenFoodFactsClientError;
      expect(e.code).toBe('OFF_DISABLED');
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('enforces the rate limiter window', async () => {
    let t = 0;
    const fetchImpl = jest.fn(async () => mockResponse({ status: 0 })) as unknown as FetchFn;
    const client = makeClient({ fetchImpl, rateLimit: 2, now: () => t });
    await client.getProductByBarcode('1');
    await client.getProductByBarcode('2');
    try {
      await client.getProductByBarcode('3');
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as OpenFoodFactsClientError;
      expect(e.code).toBe('OFF_RATE_LIMITED');
    }
    // Advance past the 60s window — the limiter should let calls through again.
    t += 60_001;
    await expect(client.getProductByBarcode('4')).resolves.toBeNull();
  });

  it('always sends User-Agent and Accept headers', async () => {
    let capturedInit: RequestInit | undefined;
    const fetchImpl = jest.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      capturedInit = init;
      return mockResponse({ status: 0 });
    }) as unknown as FetchFn;
    const client = makeClient({ fetchImpl });
    await client.getProductByBarcode('123');
    const headers = capturedInit?.headers as Record<string, string> | undefined;
    expect(headers?.['User-Agent']).toBe('SmartPantryPro-Test/1.0 (tests@local)');
    expect(headers?.Accept).toBe('application/json');
  });

  it('builds the barcode URL with explicit fields= query', async () => {
    let capturedUrl: string | undefined;
    const fetchImpl = jest.fn(async (url: RequestInfo | URL) => {
      capturedUrl = url.toString();
      return mockResponse({ status: 0 });
    }) as unknown as FetchFn;
    const client = makeClient({ fetchImpl });
    await client.getProductByBarcode('3017620422003');
    expect(capturedUrl).toContain('/api/v2/product/3017620422003.json?fields=');
  });
});
