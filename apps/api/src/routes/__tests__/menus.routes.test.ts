import express from 'express';
import request from 'supertest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MenuShoppingService } from '../../services/menus/MenuShoppingService.js';
import { WeekPlanService } from '../../services/menus/WeekPlanService.js';
import { StockCommandError } from '../../services/stock/StockCommandService.js';
import { createMenusRouter } from '../menus.routes.js';

jest.mock('../../middleware/userRateLimit.js', () => ({ userRateLimit: () => (_req: unknown, _res: unknown, next: () => void) => next() }));
jest.mock('../../config/logger.js', () => ({ logError: jest.fn() }));
// eslint-disable-next-line @typescript-eslint/no-require-imports -- the mocked module, after jest.mock.
const { logError } = require('../../config/logger.js') as { logError: jest.Mock };

const USER = '00000000-0000-4000-8000-000000000001';
const preview = { week_start: '2026-11-30', as_of: '2026-11-24', menu_version: 'a'.repeat(32), context_revision: 7, lines: [], meals: [], uncomputable: [] };

function application(signedIn = true) {
  const app = express(); app.use(express.json());
  app.use((req, _res, next) => {
    if (signedIn) { req.user = { id: USER } as typeof req.user; req.supabaseClient = {} as SupabaseClient as typeof req.supabaseClient; }
    next();
  });
  app.use('/api/v1/menus', createMenusRouter());
  return app;
}

describe('week shopping preview route', () => {
  afterEach(() => jest.restoreAllMocks());
  test('refuses an unsigned request and a week that does not start on a Monday, before any read', async () => {
    const spy = jest.spyOn(MenuShoppingService.prototype, 'preview');
    await request(application(false)).post('/api/v1/menus/shopping-preview').send({ week_start: '2026-11-30' }).expect(401);
    await request(application()).post('/api/v1/menus/shopping-preview').send({ week_start: '2026-12-01' }).expect(400);
    await request(application()).post('/api/v1/menus/shopping-preview').send({ week_start: '2026-11-30', user_id: USER }).expect(400);
    expect(spy).not.toHaveBeenCalled();
  });
  test('returns the preview of the signed-in account in the envelope', async () => {
    const spy = jest.spyOn(MenuShoppingService.prototype, 'preview').mockResolvedValue(preview as never);
    const response = await request(application()).post('/api/v1/menus/shopping-preview').send({ week_start: '2026-11-30' }).expect(200);
    expect(response.body).toMatchObject({ success: true, data: preview });
    expect(spy).toHaveBeenCalledWith(USER, '2026-11-30', undefined);
  });
  test('a database not migrated yet answers like the stock commands', async () => {
    jest.spyOn(MenuShoppingService.prototype, 'preview').mockRejectedValue(new StockCommandError('MIGRATION_REQUIRED', 503));
    const response = await request(application()).post('/api/v1/menus/shopping-preview').send({ week_start: '2026-11-30' }).expect(503);
    expect(response.body).toMatchObject({ success: false, code: 'MIGRATION_REQUIRED' });
  });
  test('an unexpected failure is logged and answered as unavailable, never as a refused write', async () => {
    for (const failure of [new Error('MENU_BASIS_INVALID'), new StockCommandError('STOCK_WRITE_FAILED', 500)]) {
      logError.mockClear();
      jest.spyOn(MenuShoppingService.prototype, 'preview').mockRejectedValue(failure);
      const response = await request(application()).post('/api/v1/menus/shopping-preview').send({ week_start: '2026-11-30' }).expect(503);
      expect(response.body).toMatchObject({ success: false, code: 'MENU_SHOPPING_UNAVAILABLE' });
      expect(logError).toHaveBeenCalledWith(failure, expect.objectContaining({ context: 'menus.shopping-preview', week_start: '2026-11-30' }));
    }
  });
});

// V11-01 E4a: the shopping of a proposed week, and the proposal itself.
describe('week proposal routes', () => {
  afterEach(() => jest.restoreAllMocks());
  const RECIPE = { id: '11111111-1111-4111-8111-111111111111', source: 'recipes_catalog' };
  const body = { week_start: '2026-11-30', slots: [{ date: '2026-12-01', meal_type: 'dinner' }] };
  const proposal = { proposal_id: 'b'.repeat(32), week_start: '2026-11-30', calculated_at: '2026-11-30T09:00:00.000Z', expires_at: '2026-11-30T09:30:00.000Z',
    menu_version: 'a'.repeat(32), context_revision: 7, profile_version: 3, slots: [{ date: '2026-12-01', meal_type: 'dinner', status: 'empty', cause: 'POOL_EXHAUSTED' }] };

  test('the shopping preview may carry proposed meals of the week, and only of the week', async () => {
    const spy = jest.spyOn(MenuShoppingService.prototype, 'preview').mockResolvedValue(preview as never);
    const proposed = [{ date: '2026-12-01', meal_type: 'dinner', recipe: RECIPE, servings: 4 }];
    await request(application()).post('/api/v1/menus/shopping-preview').send({ week_start: '2026-11-30', proposal: proposed }).expect(200);
    expect(spy).toHaveBeenCalledWith(USER, '2026-11-30', proposed);
    await request(application()).post('/api/v1/menus/shopping-preview').send({ week_start: '2026-11-30', proposal: [{ ...proposed[0], date: '2026-12-09' }] }).expect(400);
  });

  test('a proposal is asked for signed in, with slots of the week, and returned in the envelope', async () => {
    const spy = jest.spyOn(WeekPlanService.prototype, 'propose').mockResolvedValue(proposal as never);
    await request(application(false)).post('/api/v1/menus/week-proposal').send(body).expect(401);
    for (const invalid of [{ ...body, week_start: '2026-12-01' }, { ...body, slots: [] }, { ...body, user_id: USER }, { ...body, slots: [{ date: '2026-12-08', meal_type: 'dinner' }] }]) {
      await request(application()).post('/api/v1/menus/week-proposal').send(invalid).expect(400);
    }
    expect(spy).not.toHaveBeenCalled();
    const response = await request(application()).post('/api/v1/menus/week-proposal').send(body).expect(200);
    expect(response.body).toMatchObject({ success: true, data: proposal, code: 'WEEK_PROPOSAL_OK' });
    expect(spy).toHaveBeenCalledWith(USER, body);
  });

  test('a week changed since it was read is a refusal to reread; any other failure is logged and unavailable', async () => {
    jest.spyOn(WeekPlanService.prototype, 'propose').mockRejectedValueOnce(new StockCommandError('MENU_CHANGED', 409));
    const changed = await request(application()).post('/api/v1/menus/week-proposal').send(body).expect(409);
    expect(changed.body).toMatchObject({ success: false, code: 'MENU_CHANGED' });
    logError.mockClear();
    const failure = new Error('RECIPE_DATA_UNAVAILABLE');
    jest.spyOn(WeekPlanService.prototype, 'propose').mockRejectedValueOnce(failure);
    const unavailable = await request(application()).post('/api/v1/menus/week-proposal').send(body).expect(503);
    expect(unavailable.body).toMatchObject({ success: false, code: 'WEEK_PROPOSAL_UNAVAILABLE' });
    expect(logError).toHaveBeenCalledWith(failure, expect.objectContaining({ context: 'menus.week-proposal', week_start: '2026-11-30' }));
  });
});
