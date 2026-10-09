import express from 'express';
import request from 'supertest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createStockRouter } from '../stock.routes.js';

const USER = '00000000-0000-4000-8000-000000000001';
const ID = '40000000-0000-4000-8000-000000000001';
const operation = { command_id: ID, command_type: 'transfer_shopping', payload_version: 1,
  payload: { items: [{ id: '50000000-0000-4000-8000-000000000001', expected_version: 2 }] } };
function application(signedIn = true, refusal = false) {
  const rpc = jest.fn(async () => ({ data: refusal ? null : { command_id: ID, command_type: 'transfer_shopping', status: 'confirmed', affected_tables: ['inventory','shopping_list'] }, error: refusal ? { message: 'CONFLICT' } : null }));
  const filters: Array<[string,unknown]> = [];
  const query = { select: () => query, eq: (field: string,value: unknown) => { filters.push([field,value]); return query; }, maybeSingle: async () => ({ data: null,error: null }) };
  const client = { rpc, from: () => query } as unknown as SupabaseClient;
  const app = express(); app.use(express.json());
  app.use((req,_res,next) => {
    if (signedIn) { req.user = { id: USER } as typeof req.user; req.supabaseClient = client as typeof req.supabaseClient; }
    next();
  });
  app.use('/api/v1/stock',createStockRouter());
  return { app,rpc,filters };
}
describe('authenticated stock HTTP protocol', () => {
  test('rejects unsigned requests and an owner in the payload before any RPC', async () => {
    await request(application(false).app).post('/api/v1/stock/commands').send(operation).expect(401);
    const mocked = application();
    await request(mocked.app).post('/api/v1/stock/commands').send({ ...operation, user_id: USER }).expect(400);
    expect(mocked.rpc).not.toHaveBeenCalled();
  });
  test('executes with the verified scoped client and returns a confirmed envelope', async () => {
    const mocked = application();
    const response = await request(mocked.app).post('/api/v1/stock/commands').send(operation).expect(200);
    expect(response.body).toMatchObject({ success: true, data: { command_id: ID, status: 'confirmed' } });
    expect(mocked.filters).toContainEqual(['user_id',USER]);
    expect(mocked.rpc).toHaveBeenCalledWith('execute_stock_command',{ p_command: operation, p_allocations: [] });
  });
  test('returns a structured recoverable conflict, and does not expose another receipt', async () => {
    const response = await request(application(true,true).app).post('/api/v1/stock/commands').send(operation).expect(409);
    expect(response.body).toMatchObject({ success: false, error: { code: 'CONFLICT' } });
    const mocked = application();
    await request(mocked.app).get(`/api/v1/stock/commands/${ID}`).expect(404);
    expect(mocked.filters).toContainEqual(['user_id',USER]);
  });
});
