import express from 'express';
import request from 'supertest';
import { createClientErrorsRouter } from '../client-errors.js';

const USER = '00000000-0000-4000-8000-000000000001';
const app = express().use(express.json())
  .use((req, _res, next) => { (req as unknown as { user: { id: string } }).user = { id: USER }; next(); })
  .use('/api/v1/client-errors', createClientErrorsRouter());
let logged: string[] = [];
beforeEach(() => { logged = []; jest.spyOn(console, 'error').mockImplementation((line: unknown) => { logged.push(String(line)); }); });
afterEach(() => jest.restoreAllMocks());

// Audit 2026-11-07 (reliability P1 5): a crash on a phone left no trace anywhere.
describe('client error reports', () => {
  test('a crash on a page lands in the server logs, as one JSON line', async () => {
    const res = await request(app).post('/api/v1/client-errors').send({ kind: 'render', message: 'x is undefined', stack: 'at Rasam (index.js:1:2)', path: '/kitchen', build: 'abc123' });
    expect(res.status).toBe(204);
    expect(JSON.parse(logged[0])).toEqual({ event: 'client_error', user_id: USER, kind: 'render', message: 'x is undefined', stack: 'at Rasam (index.js:1:2)', path: '/kitchen', build: 'abc123' });
  });
  test('a malformed or oversized report is refused and not logged', async () => {
    expect((await request(app).post('/api/v1/client-errors').send({ kind: 'other', message: 'x' })).status).toBe(400);
    expect((await request(app).post('/api/v1/client-errors').send({ kind: 'render', message: 'x'.repeat(2000) })).status).toBe(400);
    expect(logged).toEqual([]);
  });
});
