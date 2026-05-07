/**
 * Unit tests for the userRateLimit middleware (PRP-220.15).
 * Uses the in-memory store path; the Redis branch is exercised in
 * integration tests with a real Redis.
 */
import express, { type Express } from 'express';
import request from 'supertest';

import {
  userRateLimit,
  __resetMemoryStore,
} from '../middleware/userRateLimit';
import { metrics } from '../lib/metrics';
import { createMetricsRouter } from '../routes/metrics';

function makeApp(opts: Parameters<typeof userRateLimit>[0], opts2: { tier?: 'free' | 'premium' } = {}) {
  const app = express();
  app.use((req, _res, next) => {
    req.user = { id: 'user-test', tier: opts2.tier ?? 'free' };
    next();
  });
  app.post('/test', userRateLimit(opts), (_req, res) => res.json({ ok: true }));
  return app;
}

beforeEach(() => {
  __resetMemoryStore();
  // Reset prom-client counters so tests don't bleed.
  metrics.rateLimited.reset();
  delete process.env.METRICS_AUTH_TOKEN;
});

describe('userRateLimit', () => {
  it('lets requests through under the free limit and blocks the (max+1)th', async () => {
    const app = makeApp({
      key: 'imports.capture',
      freeMax: 3,
      premiumMax: 10,
      windowMs: 3_600_000,
    });
    for (let i = 0; i < 3; i++) {
      const res = await request(app).post('/test');
      expect(res.status).toBe(200);
      expect(res.headers['x-ratelimit-limit']).toBe('3');
      expect(res.headers['x-ratelimit-remaining']).toBe(String(3 - (i + 1)));
    }
    const blocked = await request(app).post('/test');
    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({ success: false, code: 'RATE_LIMITED' });
    expect(blocked.headers['retry-after']).toBeDefined();
  });

  it('honours the premium ceiling instead of the free one', async () => {
    const app = makeApp(
      { key: 'imports.capture', freeMax: 1, premiumMax: 5, windowMs: 3_600_000 },
      { tier: 'premium' }
    );
    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/test');
      expect(res.status).toBe(200);
    }
    const blocked = await request(app).post('/test');
    expect(blocked.status).toBe(429);
  });

  it('skips the limiter for anonymous requests (no req.user)', async () => {
    const app = express();
    app.post(
      '/anon',
      userRateLimit({ key: 'k', freeMax: 1, premiumMax: 1, windowMs: 60_000 }),
      (_req, res) => res.json({ ok: true })
    );
    // Hit it twice — both must pass even though freeMax = 1.
    expect((await request(app).post('/anon')).status).toBe(200);
    expect((await request(app).post('/anon')).status).toBe(200);
  });

  it('isolates buckets per `key`', async () => {
    const app = express();
    app.use((req, _res, next) => {
      req.user = { id: 'u', tier: 'free' };
      next();
    });
    app.post('/a', userRateLimit({ key: 'a', freeMax: 1, premiumMax: 1, windowMs: 60_000 }), (_, r) => r.json({}));
    app.post('/b', userRateLimit({ key: 'b', freeMax: 1, premiumMax: 1, windowMs: 60_000 }), (_, r) => r.json({}));
    expect((await request(app).post('/a')).status).toBe(200);
    expect((await request(app).post('/a')).status).toBe(429);
    // /b has its own bucket — first hit still allowed.
    expect((await request(app).post('/b')).status).toBe(200);
  });

  it('isolates buckets per user id', async () => {
    const app = express();
    let user = 'alice';
    app.use((req, _res, next) => {
      req.user = { id: user, tier: 'free' };
      next();
    });
    app.post('/x', userRateLimit({ key: 'k', freeMax: 1, premiumMax: 1, windowMs: 60_000 }), (_, r) => r.json({}));
    expect((await request(app).post('/x')).status).toBe(200);
    expect((await request(app).post('/x')).status).toBe(429);
    user = 'bob';
    expect((await request(app).post('/x')).status).toBe(200);
  });

  it('increments the rate_limited_total Prometheus counter on 429', async () => {
    const app = makeApp({ key: 'imports.capture', freeMax: 1, premiumMax: 1, windowMs: 60_000 });
    await request(app).post('/test');
    await request(app).post('/test'); // -> 429
    const text = await metrics.registry.metrics();
    expect(text).toMatch(
      /rate_limited_total\{endpoint="imports\.capture",tier="free"\} 1/
    );
  });
});

describe('GET /api/metrics', () => {
  it('returns Prometheus exposition format and includes our counters', async () => {
    const app = express();
    app.use('/api/metrics', createMetricsRouter());
    const res = await request(app).get('/api/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    // Default Node metrics are auto-collected.
    expect(res.text).toMatch(/process_cpu_user_seconds_total/);
    // Our custom counters must be registered.
    expect(res.text).toMatch(/import_extraction_total/);
    expect(res.text).toMatch(/rate_limited_total/);
  });

  it('rejects requests without the bearer token when METRICS_AUTH_TOKEN is set', async () => {
    process.env.METRICS_AUTH_TOKEN = 'secret-token';
    const app = express();
    app.use('/api/metrics', createMetricsRouter());

    const noAuth = await request(app).get('/api/metrics');
    expect(noAuth.status).toBe(401);

    const wrong = await request(app)
      .get('/api/metrics')
      .set('Authorization', 'Bearer wrong');
    expect(wrong.status).toBe(401);

    const ok = await request(app)
      .get('/api/metrics')
      .set('Authorization', 'Bearer secret-token');
    expect(ok.status).toBe(200);
  });
});
