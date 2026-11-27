/**
 * /api/social/instagram/thumbnail: Supabase user required (the anon key's
 * JWT used to pass a local jwt.verify), Instagram-only outbound fetches.
 * /api/assistant/stream, also covered here before, was removed in V11-06 S1
 * (assistant-stream-removed.test.ts).
 */
import express from 'express';
import request from 'supertest';

import { createInstagramRouter } from '../routes/instagram';
import { __resetMemoryStore } from '../middleware/userRateLimit';

const SECRET = 'test-jwt-secret';
const USER_TOKEN = 'valid-user-token';

// Minimal admin client: auth.getUser only knows USER_TOKEN; the tier
// lookup finds no subscription row.
const adminClient = {
  auth: {
    getUser: jest.fn(async (token: string) => token === USER_TOKEN
      ? { data: { user: { id: 'user-1', email: 'u@example.test', role: 'authenticated' } }, error: null }
      : { data: { user: null }, error: { message: 'invalid JWT' } }),
  },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
} as any;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/social/instagram', createInstagramRouter(adminClient));
  return app;
}

const fetchMock = jest.fn();
const saved = { ...process.env };
beforeAll(() => {
  process.env.SUPABASE_JWT_SECRET = SECRET;
  process.env.SUPABASE_URL = 'http://localhost:54321';
  process.env.SUPABASE_ANON_KEY = 'anon-key';
  (global as any).fetch = fetchMock;
});
afterAll(() => {
  process.env = saved;
});
beforeEach(() => {
  fetchMock.mockReset();
  __resetMemoryStore();
});

describe('POST /api/social/instagram/thumbnail', () => {
  it('requires a signed-in user', async () => {
    const res = await request(makeApp())
      .post('/api/social/instagram/thumbnail')
      .send({ url: 'https://www.instagram.com/p/CuBzp9J1aXx/' });
    expect(res.status).toBe(401);
  });

  it.each([
    'http://169.254.169.254/latest/meta-data/',
    'https://evil.example/instagram.com/p/x',
    'https://instagram.com.evil.example/p/x',
    'http://www.instagram.com/p/x',
  ])('refuses %s without fetching it', async (url) => {
    const res = await request(makeApp())
      .post('/api/social/instagram/thumbnail')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({ url });
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches an instagram.com post page', async () => {
    fetchMock.mockResolvedValue(new Response('<meta property="og:image" content="https://scontent.cdninstagram.com/x.jpg">', { status: 200 }));
    const res = await request(makeApp())
      .post('/api/social/instagram/thumbnail')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({ url: 'https://www.instagram.com/p/CuBzp9J1aXx/' });
    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe('https://www.instagram.com/p/CuBzp9J1aXx/');
    expect(JSON.stringify(res.body)).toContain('https://scontent.cdninstagram.com/x.jpg');
  });
});
