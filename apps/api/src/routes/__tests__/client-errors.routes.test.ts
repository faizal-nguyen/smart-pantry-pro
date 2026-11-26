import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import express from 'express';
import request from 'supertest';
import { CLIENT_ERROR_CODES, CLIENT_ROUTE_PATTERNS } from '@smart/shared';
import { createClientErrorsRouter } from '../client-errors.js';

const USER = '00000000-0000-4000-8000-000000000001';
const app = express().use(express.json())
  .use((req, _res, next) => { (req as unknown as { user: { id: string } }).user = { id: USER }; next(); })
  .use('/api/v1/client-errors', createClientErrorsRouter());
let logged: string[] = [];
beforeEach(() => { logged = []; jest.spyOn(console, 'error').mockImplementation((line: unknown) => { logged.push(String(line)); }); });
afterEach(() => jest.restoreAllMocks());

const REPORT = {
  kind: 'render', name: 'ApiError', code: 'ITEM_NOT_FOUND', route: '/kitchen/recipes/:id',
  stack: 'at Rasam (/assets/index.js:1:2)', build: 'abc123',
};

// Audit 2026-11-07 (reliability P1 5): a crash on a phone left no trace anywhere.
// V11-06 D10: the trace holds no free text and no account identifier.
describe('client error reports', () => {
  test('a crash lands in the server logs as one JSON line, without account, message or address', async () => {
    const res = await request(app).post('/api/v1/client-errors').send(REPORT);
    expect(res.status).toBe(204);
    expect(JSON.parse(logged[0])).toEqual({ event: 'client_error', ...REPORT });
    expect(logged[0]).not.toContain(USER);
  });

  test.each([
    ['the previous format, with a free message and an address', { kind: 'render', message: 'x is undefined', path: '/kitchen', build: 'abc123' }],
    ['a free message next to a valid report', { ...REPORT, message: 'Oignon rouge' }],
    ['an address instead of its pattern', { ...REPORT, route: `/kitchen/recipes/${USER}` }],
    ['a stack that carries the message', { ...REPORT, stack: 'Error: Oignon rouge introuvable\n    at Rasam (https://app.test/a.js:1:2)' }],
    ['an unknown kind', { ...REPORT, kind: 'other' }],
    ['free text shaped like a frame', { ...REPORT, stack: 'at Alice buys milk 12:3:4' }],
    ['a frame with a full address and a query', { ...REPORT, stack: 'at Rasam (https://app.test/assets/index.js?recette=Poulet:1:2)' }],
  ])('refuses %s, and logs nothing', async (_label, body) => {
    expect((await request(app).post('/api/v1/client-errors').send(body)).status).toBe(400);
    expect(logged).toEqual([]);
  });

  test('accepts every path of the client router (src/App.tsx), so a new route is never logged as « * » unnoticed', () => {
    const source = readFileSync(join(__dirname, '../../../../../src/App.tsx'), 'utf8');
    const paths = [...source.matchAll(/path:\s*["']([^"']+)["']/g)].map(match => match[1]).filter(path => path !== '*');
    expect(paths.length).toBeGreaterThan(10);
    expect([...paths].sort()).toEqual([...CLIENT_ROUTE_PATTERNS].sort());
  });

  test('every stock command error code can be reported', () => {
    const source = readFileSync(join(__dirname, '../../services/stock/StockCommandService.ts'), 'utf8');
    const block = source.slice(source.indexOf('const MESSAGES'), source.indexOf('};', source.indexOf('const MESSAGES')));
    const codes = [...block.matchAll(/^\s+([A-Z][A-Z0-9_]+):/gm)].map(match => match[1]);
    const thrown = [...source.matchAll(/new StockCommandError\('([A-Z][A-Z0-9_]+)'/g)].map(match => match[1]);
    expect(codes.length).toBeGreaterThan(20);
    expect([...new Set([...codes, ...thrown])].filter(code => !(CLIENT_ERROR_CODES as readonly string[]).includes(code))).toEqual([]);
  });
});
