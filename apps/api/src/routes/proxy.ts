import { Router, type Request, type Response } from 'express';

export const proxyRouter = Router();

function isAllowedHost(hostname: string, allowlist: string[]): boolean {
  return allowlist.some(h => hostname === h || hostname.endsWith(`.${h}`));
}

proxyRouter.get('/image', async (req: Request, res: Response) => {
  const url = req.query.url as string | undefined;
  if (!url) return res.status(400).send('URL parameter is required');

  const allowedHosts = (process.env.IMAGE_PROXY_HOSTS || 'instagram.com,cdninstagram.com,scontent.cdninstagram.com')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return res.status(400).send('Invalid URL');
  }

  if (!isAllowedHost(target.hostname, allowedHosts)) {
    return res.status(403).send('Host not allowed');
  }

  try {
    const response = await fetch(target.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    if (!response.ok) {
      return res.status(response.status).send('Upstream error');
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buf);
  } catch (e: any) {
    return res.status(500).send('Error fetching image');
  }
});

// OpenFoodFacts search proxy.
//
// The OFF v2 API does not consistently serve CORS headers for browser
// origins (and was returning intermittent 503s to localhost during the
// 2026-05-17 session — same query alternates between 200 and 503 from
// one call to the next). Proxying via the API server avoids the CORS
// preflight, lets us send the descriptive User-Agent that OFF asks for
// (https://wiki.openfoodfacts.org/API), and gives us a single
// chokepoint to retry transient upstream failures and cache positive
// results in memory.
const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/api/v2/search';
const OFF_DEFAULT_FIELDS =
  'code,product_name,generic_name,brands,categories,nutriments,nutriscore_grade,completeness';
const OFF_USER_AGENT =
  process.env.OPENFOODFACTS_USER_AGENT ?? 'SmartPantryPro/1.0 (+https://smartpantrypro.app)';

// In-memory positive cache. OFF is flaky on burst traffic; the recipe
// detail page can fire 10+ ingredient lookups in the same second and a
// dev HMR remount fires them again. TTL is short (5 min) so we don't
// keep stale data, and we cap entries to stay bounded in memory.
const OFF_CACHE_TTL_MS = 5 * 60 * 1000;
const OFF_CACHE_MAX_ENTRIES = 500;
const offCache = new Map<string, { body: unknown; expiresAt: number }>();

// Negative cache for hard upstream failures (5xx after all retries).
// Without this, the client retries every render and we hammer OFF on
// terms it persistently refuses (e.g. specific accented French queries
// observed during the 2026-05-17 session). Short TTL so we recover
// quickly once OFF stabilises.
const OFF_NEG_CACHE_TTL_MS = 30 * 1000;
const offNegCache = new Map<string, { status: number; error: string; expiresAt: number }>();

function offCacheGet(key: string): unknown | undefined {
  const hit = offCache.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt < Date.now()) {
    offCache.delete(key);
    return undefined;
  }
  return hit.body;
}

function offCacheSet(key: string, body: unknown): void {
  if (offCache.size >= OFF_CACHE_MAX_ENTRIES) {
    const oldest = offCache.keys().next().value;
    if (oldest !== undefined) offCache.delete(oldest);
  }
  offCache.set(key, { body, expiresAt: Date.now() + OFF_CACHE_TTL_MS });
}

function offNegCacheGet(key: string): { status: number; error: string } | undefined {
  const hit = offNegCache.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt < Date.now()) {
    offNegCache.delete(key);
    return undefined;
  }
  return { status: hit.status, error: hit.error };
}

function offNegCacheSet(key: string, status: number, error: string): void {
  if (offNegCache.size >= OFF_CACHE_MAX_ENTRIES) {
    const oldest = offNegCache.keys().next().value;
    if (oldest !== undefined) offNegCache.delete(oldest);
  }
  offNegCache.set(key, { status, error, expiresAt: Date.now() + OFF_NEG_CACHE_TTL_MS });
}

interface OffFetchResult {
  status: number;
  body: unknown;
  error?: string;
}

// Retry strategy: OFF returns 503/429 intermittently even on identical
// successive requests. We try 3 times with jittered backoff and a
// tight 2s per-attempt timeout — total budget ~7s worst case. Most
// transient failures flip to 200 within the first 1-2 retries; harder
// cases are negative-cached for 30s upstream so the next visit
// short-circuits in ~1ms instead of paying the budget again.
async function fetchFromOpenFoodFacts(url: string): Promise<OffFetchResult> {
  const BASE_DELAYS_MS = [0, 300, 900];
  let lastStatus = 0;
  let lastError: string | undefined;

  for (let attempt = 0; attempt < BASE_DELAYS_MS.length; attempt++) {
    const base = BASE_DELAYS_MS[attempt];
    // Add ±25% jitter to avoid synchronised retries from concurrent
    // ingredient lookups landing on OFF at the exact same instant.
    const delay = base === 0 ? 0 : Math.round(base * (0.75 + Math.random() * 0.5));
    if (delay > 0) await new Promise(r => setTimeout(r, delay));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3_000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': OFF_USER_AGENT,
          'Accept': 'application/json',
        },
      });
      clearTimeout(timeout);

      if (response.ok) {
        const body = await response.json();
        return { status: 200, body };
      }
      lastStatus = response.status;
      // Only retry on transient failures (rate limits + service unavailable).
      if (response.status !== 429 && response.status !== 503) {
        return { status: response.status, body: null, error: 'Upstream error' };
      }
      lastError = 'Upstream error';
    } catch (e: any) {
      clearTimeout(timeout);
      lastError = e?.name === 'AbortError' ? 'Upstream timeout' : (e?.message ?? 'Network error');
      lastStatus = e?.name === 'AbortError' ? 504 : 502;
    }
  }

  return { status: lastStatus || 502, body: null, error: lastError ?? 'Upstream error' };
}

proxyRouter.get('/openfoodfacts/search', async (req: Request, res: Response) => {
  const q = req.query.q;
  if (typeof q !== 'string' || q.length === 0 || q.length > 200) {
    return res.status(400).json({ error: 'Missing or invalid `q` parameter' });
  }

  const pageSize = Math.min(Math.max(Number(req.query.page_size) || 50, 1), 100);
  const fields = typeof req.query.fields === 'string' && req.query.fields.length > 0
    ? req.query.fields
    : OFF_DEFAULT_FIELDS;

  const target = new URL(OFF_SEARCH_URL);
  target.searchParams.set('search_terms', q);
  target.searchParams.set('search_simple', '1');
  target.searchParams.set('action', 'process');
  target.searchParams.set('json', '1');
  target.searchParams.set('page_size', String(pageSize));
  target.searchParams.set('page', '1');
  target.searchParams.set('sort_by', 'unique_scans_n');
  target.searchParams.set('fields', fields);

  const cacheKey = `search:${target.toString()}`;
  const cached = offCacheGet(cacheKey);
  if (cached !== undefined) {
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }
  const negCached = offNegCacheGet(cacheKey);
  if (negCached) {
    // Stop hammering OFF when it persistently refuses a term — the
    // client retries every render in dev. Honest 503 with a short
    // Retry-After hint lets the caller fall back to its local DB or
    // mark the ingredient as missing without burning quota.
    res.setHeader('Retry-After', '30');
    res.setHeader('X-Cache', 'NEG-HIT');
    return res.status(negCached.status).json({
      error: negCached.error,
      status: negCached.status,
      cached: true,
    });
  }

  const result = await fetchFromOpenFoodFacts(target.toString());
  if (result.status === 200) {
    offCacheSet(cacheKey, result.body);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('X-Cache', 'MISS');
    return res.json(result.body);
  }
  const status = result.status === 429 || result.status === 503 ? result.status : 502;
  offNegCacheSet(cacheKey, status, result.error ?? 'Upstream error');
  res.setHeader('Retry-After', '30');
  return res.status(status).json({ error: result.error ?? 'Upstream error', status: result.status });
});

// OpenFoodFacts barcode product lookup. Same CORS rationale as the
// search endpoint above. Barcode is constrained to digits to avoid
// path injection.
proxyRouter.get('/openfoodfacts/product/:barcode', async (req: Request, res: Response) => {
  const raw = String(req.params.barcode || '').replace(/\.json$/i, '');
  if (!/^\d{6,14}$/.test(raw)) {
    return res.status(400).json({ error: 'Barcode must be 6-14 digits' });
  }

  const target = `https://world.openfoodfacts.org/api/v2/product/${raw}.json`;
  const cacheKey = `product:${target}`;
  const cached = offCacheGet(cacheKey);
  if (cached !== undefined) {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }
  const negCached = offNegCacheGet(cacheKey);
  if (negCached) {
    res.setHeader('Retry-After', '30');
    res.setHeader('X-Cache', 'NEG-HIT');
    return res.status(negCached.status).json({
      error: negCached.error,
      status: negCached.status,
      cached: true,
    });
  }

  const result = await fetchFromOpenFoodFacts(target);
  if (result.status === 200) {
    offCacheSet(cacheKey, result.body);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Cache', 'MISS');
    return res.json(result.body);
  }
  const status = result.status === 429 || result.status === 503 ? result.status : 502;
  offNegCacheSet(cacheKey, status, result.error ?? 'Upstream error');
  res.setHeader('Retry-After', '30');
  return res.status(status).json({ error: result.error ?? 'Upstream error', status: result.status });
});

