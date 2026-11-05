/**
 * IP rate limiter: key derived from the trusted proxy hop, bounded store.
 */
import express from 'express';
import request from 'supertest';
import type { Request, Response } from 'express';

import { rateLimit, RATE_LIMIT_MAX_KEYS } from '../middleware/rateLimit';

function makeApp(max: number) {
  const app = express();
  app.set('trust proxy', 1); // same as createApp()
  app.use(rateLimit({ windowMs: 60_000, max }));
  app.get('/', (_req, res) => res.json({ ok: true }));
  return app;
}

describe('rateLimit', () => {
  it('a forged first X-Forwarded-For entry does not reset the client budget', async () => {
    const app = makeApp(2);
    // The proxy appends the address it saw (203.0.113.7) after whatever
    // the client sent; only that last hop is trusted.
    const statuses: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      const res = await request(app).get('/').set('X-Forwarded-For', `10.0.0.${i}, 203.0.113.7`);
      statuses.push(res.status);
    }
    expect(statuses).toEqual([200, 200, 429, 429]);
  });

  it('limiters do not share counters', async () => {
    const a = rateLimit({ windowMs: 60_000, max: 1 });
    const b = rateLimit({ windowMs: 60_000, max: 1 });
    const app = express();
    app.set('trust proxy', 1);
    app.get('/a', a, (_req, res) => res.end());
    app.get('/b', b, (_req, res) => res.end());
    expect((await request(app).get('/a')).status).toBe(200);
    expect((await request(app).get('/b')).status).toBe(200);
    expect((await request(app).get('/a')).status).toBe(429);
  });

  it('keeps at most RATE_LIMIT_MAX_KEYS clients and sweeps expired ones', () => {
    let now = 1_000_000;
    const spy = jest.spyOn(Date, 'now').mockImplementation(() => now);
    try {
      let n = 0;
      const limiter = rateLimit({ windowMs: 1_000, max: 5, key: () => `client-${n}` }) as ReturnType<typeof rateLimit> & { storeSize: () => number };
      const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
      const next = jest.fn();
      for (n = 0; n < RATE_LIMIT_MAX_KEYS + 50; n += 1) limiter({} as Request, res, next);
      expect(limiter.storeSize()).toBe(RATE_LIMIT_MAX_KEYS);

      now += 2_000; // window elapsed: the next request sweeps every expired bucket
      n = -1;
      limiter({} as Request, res, next);
      expect(limiter.storeSize()).toBe(1);
      expect(next).toHaveBeenCalledTimes(RATE_LIMIT_MAX_KEYS + 51);
    } finally {
      spy.mockRestore();
    }
  });
});
