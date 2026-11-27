import { createServer } from 'node:http';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { createApp } from '../app.js';

// uuid ships ESM only, which this CommonJS jest setup cannot parse.
jest.mock('uuid', () => ({ v4: () => '00000000-0000-4000-8000-000000000000' }));

/**
 * The memory router requires a session on its whole prefix, so an anonymous request to any
 * /api/assistant/* path is refused (401) before it could miss a route. Here, only the test token
 * signs in, so a missing route shows as the global 404; anonymous requests stay refused.
 */
const TEST_TOKEN = 'Bearer s1-test-user';
jest.mock('../middleware/auth.middleware', () => ({
  ...jest.requireActual('../middleware/auth.middleware'),
  createAuthMiddleware: () => (req: Request, res: Response, next: NextFunction) => {
    if (req.headers.authorization !== TEST_TOKEN) return res.status(401).json({ success: false, code: 'UNAUTHORIZED' });
    Object.assign(req, { user: { id: '00000000-0000-4000-8000-000000000001' }, supabaseClient: {} });
    return next();
  },
}));

/**
 * V11-06 S1: /assistant/stream had no caller and relayed any signed-in user's text to OpenAI
 * without store:false. It is gone; the assistant rate limit mounted with it keeps guarding the
 * agent and memory routes under the same prefixes. Each createApp() has its own counters.
 */
const ASSISTANT_RATE_LIMIT = 30;

describe('V11-06 S1: /assistant/stream removed, assistant rate limit kept', () => {
  it.each(['/api/assistant/stream', '/api/v1/assistant/stream'])('POST %s answers 404 to a signed-in user', async (path) => {
    const res = await request(createApp()).post(path).set('Authorization', TEST_TOKEN)
      .set('Content-Type', 'application/json').send({ message: 'bonjour' });
    expect(res.status).toBe(404);
  });

  it.each(['/api/assistant/memory-policy', '/api/v1/assistant/memory-policy'])(
    'the assistant rate limit still guards GET %s',
    async (path) => {
      // One server and one client address (trust proxy reads X-Forwarded-For) keep the limiter on a
      // single key; a server per request could alternate IPv4 and IPv6 and split the count.
      const server = createServer(createApp()).listen(0);
      const statuses: number[] = [];
      try {
        for (let attempt = 0; attempt <= ASSISTANT_RATE_LIMIT; attempt += 1) {
          statuses.push((await request(server).get(path).set('X-Forwarded-For', '203.0.113.7')).status);
        }
      } finally {
        server.close();
      }
      expect(statuses.slice(0, ASSISTANT_RATE_LIMIT)).not.toContain(429);
      expect(statuses[ASSISTANT_RATE_LIMIT]).toBe(429);
    },
  );
});
