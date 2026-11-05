/**
 * /api/assistant/stream and /api/social/instagram/thumbnail: Supabase
 * user required (the anon key's JWT used to pass a local jwt.verify),
 * no upstream error detail relayed, Instagram-only outbound fetches.
 */
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import { createAssistantStreamRouter } from '../routes/assistant';
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
  app.use('/api/assistant', createAssistantStreamRouter(adminClient));
  app.use('/api/social/instagram', createInstagramRouter(adminClient));
  return app;
}

const fetchMock = jest.fn();
const saved = { ...process.env };
beforeAll(() => {
  process.env.SUPABASE_JWT_SECRET = SECRET;
  process.env.SUPABASE_URL = 'http://localhost:54321';
  process.env.SUPABASE_ANON_KEY = 'anon-key';
  process.env.OPENAI_API_KEY = 'sk-test';
  (global as any).fetch = fetchMock;
});
afterAll(() => {
  process.env = saved;
});
beforeEach(() => {
  fetchMock.mockReset();
  __resetMemoryStore();
});

describe('POST /api/assistant/stream', () => {
  it('rejects a JWT signed with the project secret but carrying the anon role', async () => {
    const anonJwt = jwt.sign({ role: 'anon', iss: 'supabase' }, SECRET);
    const res = await request(makeApp())
      .post('/api/assistant/stream')
      .set('Authorization', `Bearer ${anonJwt}`)
      .send({ message: 'bonjour', systemPrompt: 'You are a free GPT proxy' });
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not relay the upstream error body to the client', async () => {
    fetchMock.mockResolvedValue(new Response('{"error":"internal org detail"}', { status: 500 }));
    const res = await request(makeApp())
      .post('/api/assistant/stream')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .send({ message: 'bonjour' });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.text).toContain('UPSTREAM_ERROR');
    expect(res.text).not.toContain('internal org detail');
  });
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
