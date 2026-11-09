import express from 'express';
import request from 'supertest';
import { createAdminAuthMiddleware } from '../adminAuth.middleware.js';

const TOKEN = 'a'.repeat(40);
const app = express().get('/admin', createAdminAuthMiddleware(), (_req, res) => res.json({ ok: true }));
beforeEach(() => { process.env.ADMIN_TOKEN = TOKEN; });
afterAll(() => { delete process.env.ADMIN_TOKEN; });

// Audit 2026-11-07 (security P3 10): the token was compared with !==.
describe('admin token', () => {
  test('the right token passes', async () => expect((await request(app).get('/admin').set('x-admin-token', TOKEN)).status).toBe(200));
  test.each([['a wrong token of the same length', 'b'.repeat(40)], ['a shorter one', 'a'.repeat(39)], ['none', undefined]])(
    '%s is refused', async (_label, token) => {
      const call = request(app).get('/admin');
      expect((await (token ? call.set('x-admin-token', token) : call)).status).toBe(401);
    });
});
