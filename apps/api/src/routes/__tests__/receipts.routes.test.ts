import express from 'express';
import request from 'supertest';
import { createReceiptsRouter } from '../receipts.js';
import { benchmarkConfig } from '../../services/ai/ModelConfig.js';
import type { AICompletionRequest } from '../../services/imports/RecipeExtractionService.js';
jest.mock('../../middleware/userRateLimit.js', () => ({ userRateLimit: jest.fn(() => ((_req: express.Request, _res: express.Response, next: express.NextFunction) => next())) }));
import { userRateLimit } from '../../middleware/userRateLimit.js';

// V11-01 E5a: one receipt photo read, its text kept (never the photo), the scans read by their owner.
const USER = '11111111-1111-4111-8111-111111111111';
const SCAN = '70000000-0000-4000-8000-000000000001';
const EARLIER = '70000000-0000-4000-8000-000000000002';
const READ = JSON.stringify({ store: 'Marché', date: '2026-11-20', total: 7.98, currency: 'EUR', lines: [
  { r: 'LAIT 1/2 ECR', n: 'Lait demi-écrémé', q: 2, u: 'pièce', up: 1.05, tp: 2.1, f: true, c: 'high' },
  { r: 'TOMATES', n: 'Tomates', q: 0.5, u: 'kg', tp: 1.5, f: true, c: 'medium' },
] });

function jpeg(width: number, height: number, extra = 0): Buffer {
  const sof = Buffer.alloc(19);
  sof.set([0xff, 0xc0, 0x00, 0x11, 0x08]);
  sof.writeUInt16BE(height, 5); sof.writeUInt16BE(width, 7);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), sof, Buffer.alloc(extra)]);
}
const PHOTO = jpeg(800, 2400);

interface Call { table: string; op: string; args: unknown[] }
/** A Supabase client double: records every call; answers inserts, lists and single reads as told. */
function supabase(answers: { rows?: unknown[]; one?: unknown; duplicate?: unknown; insertError?: { message: string; code?: string } } = {}) {
  const calls: Call[] = [];
  const from = (table: string) => {
    let op = 'select'; let values: Record<string, unknown> = {}; const filters: unknown[][] = [];
    const record = (name: string, args: unknown[]) => { calls.push({ table, op: name, args }); return query; };
    const query: Record<string, unknown> = {
      insert: (row: Record<string, unknown>) => { op = 'insert'; values = row; return record('insert', [row]); },
      select: (...args: unknown[]) => record('select', args),
      eq: (...args: unknown[]) => { filters.push(args); return record('eq', args); },
      neq: (...args: unknown[]) => record('neq', args),
      in: (...args: unknown[]) => record('in', args),
      order: (...args: unknown[]) => record('order', args),
      limit: (...args: unknown[]) => record('limit', args),
      single: async () => answers.insertError ? { data: null, error: answers.insertError }
        : { data: { id: SCAN, created_at: '2026-11-25T10:00:00Z', applied_at: null, store: null, purchased_on: null, total: null, currency: null, ...values }, error: null },
      maybeSingle: async () => ({ data: filters.some(([key, value]) => key === 'state' && value === 'applied') ? answers.duplicate ?? null : answers.one ?? null, error: null }),
      then: (resolve: (result: unknown) => unknown) => resolve(op === 'insert' ? { data: null, error: answers.insertError ?? null } : { data: answers.rows ?? [], error: null }),
    };
    return query;
  };
  return { client: { from } as never, calls };
}

function setup({ authenticated = true, answer = READ as string | Error, admin = supabase(), user = supabase() } = {}) {
  const ai = { complete: jest.fn(async (req: AICompletionRequest) => {
    if (answer instanceof Error) throw answer;
    return { content: answer, model: req.model, usage: { prompt_tokens: 3000, completion_tokens: 300 } };
  }) };
  const app = express(); app.use(express.json());
  app.use((req, _res, next) => { if (authenticated) { req.user = { id: USER } as express.Request['user']; req.supabaseClient = user.client; } next(); });
  app.use('/receipts', createReceiptsRouter(admin.client, { ai: ai as never, modelConfig: benchmarkConfig('luna') }));
  return { app, ai, admin, user };
}
const scan = (app: express.Express, files: Array<[Buffer, string]> = [[PHOTO, 'image/jpeg']]) => {
  const call = request(app).post('/receipts/scan');
  files.forEach(([body, type], index) => call.attach('receipt', body, { filename: `ticket-${index}.jpg`, contentType: type }));
  return call;
};
const inserted = (calls: Call[]) => calls.filter(call => call.op === 'insert').map(call => call.args[0] as Record<string, unknown>);

test('a photo is read and its text kept for the session user, never the photo; the scan comes back to review', async () => {
  const { app, ai, admin, user } = setup();
  const response = await scan(app).expect(201);
  expect(response.body.data).toMatchObject({ id: SCAN, state: 'read', store: 'Marché', purchased_on: '2026-11-20', total: 7.98, currency: 'EUR', possible_duplicate: null });
  expect(response.body.data.lines).toEqual([
    { raw_text: 'LAIT 1/2 ECR', name: 'Lait demi-écrémé', quantity: 2, unit: 'pièce', package: null, unit_price: 1.05, total_price: 2.1, food: true, confidence: 'high' },
    { raw_text: 'TOMATES', name: 'Tomates', quantity: 0.5, unit: 'kg', package: null, unit_price: null, total_price: 1.5, food: true, confidence: 'medium' },
  ]);
  expect(response.body.data).not.toHaveProperty('model_receipt');
  const [row] = inserted(admin.calls);
  expect(row).toMatchObject({ user_id: USER, state: 'read', store: 'Marché' });
  expect(row.model_receipt).toMatchObject({ calls: [expect.objectContaining({ role: 'vision', purpose: 'receipt_scan', status: 'completed' })] });
  expect(JSON.stringify(row)).not.toContain(PHOTO.toString('base64'));
  expect(ai.complete).toHaveBeenCalledTimes(1);
  // The service role only writes; reads go through the user's client.
  expect(admin.calls.filter(call => call.op === 'eq')).toEqual([]);
  expect(user.calls.filter(call => call.op === 'insert')).toEqual([]);
});

test('a scan is bounded at 20 per hour (200 premium), each read at 60 (600 premium)', () => {
  setup();
  expect(jest.mocked(userRateLimit).mock.calls.map(([options]) => options)).toEqual(expect.arrayContaining([
    expect.objectContaining({ key: 'receipts.scan', freeMax: 20, premiumMax: 200, windowMs: 3_600_000 }),
    expect.objectContaining({ key: 'receipts.read', freeMax: 60, premiumMax: 600, windowMs: 3_600_000 }),
  ]));
});

test('a photo declared as octet-stream is judged by its bytes', async () => {
  const { app } = setup();
  await scan(app, [[PHOTO, 'application/octet-stream']]).expect(201);
  expect((await scan(app, [[Buffer.from('<html>'), 'application/octet-stream']]).expect(415)).body.code).toBe('UNSUPPORTED_IMAGE');
});

test('an applied scan of the same store, day and total is named, as a warning', async () => {
  const user = supabase({ duplicate: { id: EARLIER, applied_at: '2026-11-20T18:00:00Z' } });
  const response = await scan(setup({ user }).app).expect(201);
  expect(response.body.data.possible_duplicate).toEqual({ id: EARLIER, applied_at: '2026-11-20T18:00:00Z' });
  expect(user.calls).toEqual(expect.arrayContaining([
    { table: 'receipt_scans', op: 'eq', args: ['user_id', USER] }, { table: 'receipt_scans', op: 'eq', args: ['state', 'applied'] },
    { table: 'receipt_scans', op: 'eq', args: ['total', 7.98] },
  ]));
});

test('no session, no photo, two photos, a heavy file, bytes that are not an image, or a size out of bounds: nothing is read', async () => {
  const { app, ai } = setup();
  await scan(setup({ authenticated: false }).app).expect(401);
  expect((await scan(app, []).expect(400)).body.code).toBe('RECEIPT_PHOTO_MISSING');
  expect((await scan(app, [[PHOTO, 'image/jpeg'], [PHOTO, 'image/jpeg']]).expect(400)).body.code).toBe('RECEIPT_PHOTO_INVALID');
  expect((await scan(app, [[jpeg(800, 2400, 4 * 1024 * 1024), 'image/jpeg']]).expect(413)).body.code).toBe('RECEIPT_PHOTO_TOO_LARGE');
  expect((await scan(app, [[Buffer.from('<html>'), 'image/jpeg']]).expect(415)).body.code).toBe('UNSUPPORTED_IMAGE');
  await scan(app, [[PHOTO, 'application/pdf']]).expect(415);
  expect((await scan(app, [[jpeg(150, 900), 'image/jpeg']]).expect(422)).body.code).toBe('RECEIPT_IMAGE_SIZE');
  expect((await scan(app, [[jpeg(1000, 5000), 'image/jpeg']]).expect(422)).body.code).toBe('RECEIPT_IMAGE_SIZE');
  expect(ai.complete).not.toHaveBeenCalled();
});

test('a reading that fails is said in words; its cost is kept on a failed scan without any line', async () => {
  for (const [answer, status, code] of [
    [JSON.stringify({ lines: [] }), 422, 'RECEIPT_UNREADABLE'],
    [JSON.stringify({ lines: [{ r: 'LESSIVE', n: 'Lessive', f: false, c: 'high' }] }), 422, 'RECEIPT_NO_FOOD'],
    [JSON.stringify({ lines: Array.from({ length: 121 }, (_, index) => ({ r: `ART ${index}`, n: `Article ${index}`, f: true, c: 'high' })) }), 422, 'RECEIPT_TOO_LONG'],
    [Object.assign(new Error('provider down'), { status: 400 }), 502, 'RECEIPT_READ_FAILED'],
  ] as Array<[string | Error, number, string]>) {
    const log = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const { app, admin } = setup({ answer });
      const response = await scan(app).expect(status);
      expect(response.body).toMatchObject({ success: false, code });
      expect(response.body.error).not.toContain('provider down');
      expect(inserted(admin.calls)).toEqual([expect.objectContaining({ user_id: USER, state: 'failed', failure: code, lines: [],
        model_receipt: expect.objectContaining({ calls: [expect.objectContaining({ purpose: 'receipt_scan' })] }) })]);
    } finally { log.mockRestore(); }
  }
  const { app, admin } = setup({ answer: new Error('OPENAI_API_KEY_NOT_CONFIGURED') });
  expect((await scan(app).expect(503)).body.code).toBe('RECEIPT_READ_UNAVAILABLE');
  expect(inserted(admin.calls)).toEqual([]);
});

test('a scan read but not saved is answered as unavailable, never as read; its cost is still kept as a failed scan', async () => {
  const admin = supabase({ insertError: { message: 'relation "public.receipt_scans" does not exist', code: '42P01' } });
  expect((await scan(setup({ admin }).app).expect(503)).body.code).toBe('MIGRATION_REQUIRED');
  expect(inserted(admin.calls)).toEqual([expect.objectContaining({ state: 'read' }),
    expect.objectContaining({ state: 'failed', failure: 'RECEIPT_READ_FAILED', lines: [], model_receipt: expect.objectContaining({ calls: [expect.objectContaining({ status: 'completed' })] }) })]);
});

test('the history and a scan are read with the user client, read and applied scans only', async () => {
  const row = (id: string, state: string, lines: unknown[]) => ({ id, state, store: 'Marché', purchased_on: '2026-11-20', total: 7.98, currency: 'EUR',
    created_at: '2026-11-25T10:00:00Z', applied_at: state === 'applied' ? '2026-11-25T10:05:00Z' : null, lines });
  const lines = JSON.parse(READ).lines.map((item: { r: string; n: string }) => ({ raw_text: item.r, name: item.n, quantity: null, unit: null, package: null,
    unit_price: null, total_price: null, food: true, confidence: 'high' }));
  const summary = (id: string, state: string, line_count: unknown) => { const { lines: _lines, ...header } = row(id, state, []); return { ...header, line_count }; };
  // A row of another shape (a later version, a manual edit) is left out, never the whole history.
  const user = supabase({ rows: [summary(SCAN, 'read', 2), summary(EARLIER, 'applied', 2), summary(SCAN, 'shredded', 'two')], one: row(SCAN, 'read', lines) });
  const { app, admin } = setup({ user });
  const history = await request(app).get('/receipts/history').expect(200);
  expect(history.body.data).toEqual([
    expect.objectContaining({ id: SCAN, state: 'read', line_count: 2 }), expect.objectContaining({ id: EARLIER, state: 'applied', line_count: 2 })]);
  expect(history.body.data[0]).not.toHaveProperty('lines');
  expect(user.calls).toContainEqual({ table: 'receipt_scans', op: 'select', args: ['id,state,store,purchased_on,total,currency,line_count,created_at,applied_at'] });
  expect(user.calls).toEqual(expect.arrayContaining([{ table: 'receipt_scans', op: 'in', args: ['state', ['read', 'applied']] },
    { table: 'receipt_scans', op: 'eq', args: ['user_id', USER] }]));
  const one = await request(app).get(`/receipts/${SCAN}`).expect(200);
  expect(one.body.data).toMatchObject({ id: SCAN, state: 'read', lines, possible_duplicate: null });
  expect(admin.calls).toHaveLength(0);
  await request(setup({ user: supabase() }).app).get(`/receipts/${SCAN}`).expect(404);
  await request(app).get('/receipts/not-a-scan').expect(404);
  await request(setup({ authenticated: false }).app).get('/receipts/history').expect(401);
});

test('the routes that bypassed the stock commands are gone', async () => {
  const { app } = setup();
  await request(app).post('/receipts/scan-base64').send({ image: 'x' }).expect(404);
  await request(app).post('/receipts/add-to-inventory').send({ products: [] }).expect(404);
});
