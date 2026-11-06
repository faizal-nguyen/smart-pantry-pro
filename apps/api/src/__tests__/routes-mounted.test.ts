import request from 'supertest';

/**
 * No-404 contract for the routes that PRP-220.04 consolidated into the
 * unified entry point. The intent is to fail loudly the next time
 * someone forgets to mount one of these (which is exactly what the
 * `index-fixed.ts` fork did before consolidation).
 *
 * The test does not exercise route logic - just that something other
 * than the global 404 catch-all answers the request. Each handler is
 * free to return 400 (validation), 401 (auth), 422 (business error),
 * 200 (smoke), etc.
 *
 * The server is booted by `apps/api/jest.globalSetup.cjs` and is shared
 * with the other suites in this folder (no per-test spawn needed).
 */

const BASE = 'http://localhost:4000';

interface Probe {
  method: 'get' | 'post' | 'patch' | 'delete';
  path: string;
}

const STABLE_ROUTES: Probe[] = [
  { method: 'get',  path: '/api/health' },
  { method: 'post', path: '/api/parse-video-recipe' },
  { method: 'post', path: '/api/social/instagram/thumbnail' },
  { method: 'post', path: '/api/assistant/stream' },
  { method: 'get',  path: '/api/diagnostics/routes' },
  // PRP-220.10: imports REST API. Auth middleware -> 401 without a
  // token; that already fails the "not 404" assertion as expected.
  { method: 'post', path: '/api/imports/social' },
  { method: 'post', path: '/api/imports/social/bulk' },
  { method: 'get',  path: '/api/imports/social' },
  { method: 'get', path: '/api/recipes/discovery' },
  { method: 'get', path: '/api/recipes/discovery/links' },
  { method: 'post', path: '/api/recipes/discovery/items' },
  // PRP-220.11: extract + save sub-resources. Auth strips them to 401
  // before the :id ever resolves, but the prefix is what matters for
  // the no-404 contract.
  { method: 'post', path: '/api/imports/social/00000000-0000-0000-0000-000000000000/extract' },
  { method: 'post', path: '/api/imports/social/00000000-0000-0000-0000-000000000000/save' },
  // PRP-220.12 polish: current-draft fetch for the "Vérifier" flow.
  { method: 'get',  path: '/api/imports/social/00000000-0000-0000-0000-000000000000/current-draft' },
];

const V1_ROUTES: Probe[] = [
  { method: 'get',  path: '/api/v1/health' },
  { method: 'post', path: '/api/v1/parse-video-recipe' },
  { method: 'post', path: '/api/v1/social/instagram/thumbnail' },
  { method: 'post', path: '/api/v1/assistant/stream' },
  { method: 'post', path: '/api/v1/imports/social' },
  { method: 'get',  path: '/api/v1/imports/social' },
  { method: 'get', path: '/api/v1/recipes/discovery' },
  { method: 'post', path: '/api/v1/recipes/discovery/items' },
];

// Public routes removed in the 2026-11 security pass (no live caller):
// they must stay unmounted.
const REMOVED_ROUTES: Probe[] = [
  { method: 'post', path: '/api/youtube-extract' },
  { method: 'post', path: '/api/transcribe-youtube' },
  { method: 'post', path: '/api/shopping/parse-text' },
  { method: 'post', path: '/api/shopping/transcribe' },
  { method: 'post', path: '/api/shopping/items/batch' },
  { method: 'post', path: '/api/social/instagram/oembed' },
  { method: 'post', path: '/api/ai-assistant-enhanced' },
  { method: 'get',  path: '/api/diagnostics' },
  { method: 'get',  path: '/api/realtime/status' },
];

// Costly or outbound routes kept for a live caller: signed-in users only.
const AUTH_ONLY_ROUTES: Probe[] = [
  { method: 'post', path: '/api/parse-video-recipe' },
  { method: 'post', path: '/api/social/instagram/thumbnail' },
  { method: 'post', path: '/api/assistant/stream' },
];

const ALL_ROUTES = [
  ...STABLE_ROUTES.map((p) => ({ ...p, group: 'stable' as const })),
  ...V1_ROUTES.map((p) => ({ ...p, group: 'v1' as const })),
];

describe('Routes mounted (PRP-220.04 / 220.05 no-404 contract)', () => {
  it.each(ALL_ROUTES)('[$group] $method.toUpperCase $path is not 404', async ({ method, path }) => {
    const res = await (request(BASE) as any)[method](path).set('Content-Type', 'application/json').send({});
    expect(res.status).not.toBe(404);
  });

  it.each(REMOVED_ROUTES)('removed $method.toUpperCase $path answers 404', async ({ method, path }) => {
    const res = await (request(BASE) as any)[method](path).set('Content-Type', 'application/json').send({});
    expect(res.status).toBe(404);
  });

  it.each(AUTH_ONLY_ROUTES)('$method.toUpperCase $path rejects a request without a user token', async ({ method, path }) => {
    const res = await (request(BASE) as any)[method](path).set('Content-Type', 'application/json').send({});
    expect(res.status).toBe(401);
  });

  it('GET / returns the API metadata banner', async () => {
    const res = await request(BASE).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Smart Pantry API');
    expect(res.body).toHaveProperty('endpoints');
  });

  it('GET /api/diagnostics/routes returns a populated registry', async () => {
    // The introspection helper's prefix-extraction varies between Express
    // 4 and 5; we assert structural shape (success envelope + non-empty
    // routes array) rather than exact path matching. The actual no-404
    // contract is enforced by the it.each above.
    const res = await request(BASE).get('/api/diagnostics/routes');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.count).toBeGreaterThan(0);
    expect(Array.isArray(res.body.data.routes)).toBe(true);
    expect(res.body.data.routes.length).toBe(res.body.data.count);
    // Each entry has the expected shape.
    for (const entry of res.body.data.routes) {
      expect(typeof entry.method).toBe('string');
      expect(typeof entry.path).toBe('string');
    }
  });

  it('returns the standard 404 envelope for an unknown route', async () => {
    const res = await request(BASE).get('/api/this-route-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      success: false,
      code: 'ROUTE_NOT_FOUND',
    });
  });
});
