import express from 'express';
import request from 'supertest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MenuShoppingService } from '../../services/menus/MenuShoppingService.js';
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
    expect(spy).toHaveBeenCalledWith(USER, '2026-11-30');
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
