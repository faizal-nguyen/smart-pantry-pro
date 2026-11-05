import express from 'express';
import request from 'supertest';
import { corsMiddleware, isAllowedOrigin } from '../middleware/cors.js';

describe('CORS origins', () => {
  const PROD = 'https://smart-pantry-pro.vercel.app';
  it('accepts requests without Origin (server to server)', () =>
    expect(isAllowedOrigin(undefined, 'api.example', [])).toBe(true));
  it('accepts the API own host: the app and its Vercel previews call it same-origin', () => {
    expect(isAllowedOrigin(PROD, 'smart-pantry-pro.vercel.app', [])).toBe(true);
    expect(isAllowedOrigin('https://smart-pantry-pro-git-x.vercel.app', 'smart-pantry-pro-git-x.vercel.app', [])).toBe(true);
  });
  it('accepts ALLOWED_ORIGINS and exact local dev hosts', () => {
    expect(isAllowedOrigin(PROD, 'api.example', [PROD])).toBe(true);
    expect(isAllowedOrigin('http://localhost:5173', 'api.example', [])).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:8080', 'api.example', [])).toBe(true);
  });
  it('rejects look-alike and foreign origins', () => {
    expect(isAllowedOrigin('https://localhost.evil.com', 'api.example', [PROD])).toBe(false);
    expect(isAllowedOrigin('https://evil.example', 'smart-pantry-pro.vercel.app', [PROD])).toBe(false);
    expect(isAllowedOrigin('not a url', 'api.example', [])).toBe(false);
  });

  const app = express().use(corsMiddleware).post('/api/x', (_req, res) => res.json({ ok: true }));
  it('lets a same-origin write through (browsers send Origin on POST)', async () => {
    const res = await request(app).post('/api/x').set('Host', 'smart-pantry-pro.vercel.app').set('Origin', PROD);
    expect(res.status).toBe(200);
  });
  it('trusts the forwarded host set by the Vercel proxy', async () => {
    const res = await request(app).post('/api/x').set('X-Forwarded-Host', 'smart-pantry-pro.vercel.app').set('Origin', PROD);
    expect(res.status).toBe(200);
  });
  it('still refuses a foreign origin', async () => {
    const res = await request(app).post('/api/x').set('Origin', 'https://evil.example');
    expect(res.status).not.toBe(200);
  });
});
