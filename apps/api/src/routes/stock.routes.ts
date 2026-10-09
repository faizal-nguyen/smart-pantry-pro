import { Router } from 'express';
import { z } from 'zod';
import { RecipeReferenceSchema, StockCommandSchema } from '@smart/shared';
import { StockCommandError, StockCommandService } from '../services/stock/StockCommandService.js';
import { ok } from '../utils/responses.js';
import type { Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

const PreviewSchema = z.object({ recipe: RecipeReferenceSchema, servings: z.number().finite().positive().max(100).optional() }).strict();
function reject(res: Response, error: unknown) {
  const known = error instanceof StockCommandError;
  return res.status(known ? error.status : 500).json({ success: false, error: {
    code: known ? error.code : 'STOCK_WRITE_FAILED',
    message: known ? error.message : 'Impossible de confirmer cette action. Vos données sont conservées.',
  } });
}

export function createStockRouter(): Router {
  const router = Router();
  router.post('/preview', async (req,res) => {
    if (!req.user?.id || !req.supabaseClient) return reject(res,new StockCommandError('UNAUTHORIZED',401));
    const parsed = PreviewSchema.safeParse(req.body);
    if (!parsed.success) return reject(res,new StockCommandError('INVALID_COMMAND'));
    try {
      const service = new StockCommandService(req.supabaseClient as unknown as SupabaseClient);
      return ok(res,await service.preview(req.user.id,parsed.data.recipe,parsed.data.servings));
    } catch (error) { return reject(res,error); }
  });
  router.post('/commands', async (req,res) => {
    if (!req.user?.id || !req.supabaseClient) return reject(res,new StockCommandError('UNAUTHORIZED',401));
    const parsed = StockCommandSchema.safeParse(req.body);
    if (!parsed.success) return reject(res,new StockCommandError('INVALID_COMMAND'));
    try {
      const service = new StockCommandService(req.supabaseClient as unknown as SupabaseClient);
      return ok(res,await service.execute(req.user.id,parsed.data));
    } catch (error) { return reject(res,error); }
  });
  router.get('/commands/:id', async (req,res) => {
    if (!req.user?.id || !req.supabaseClient) return reject(res,new StockCommandError('UNAUTHORIZED',401));
    const id = z.string().uuid().safeParse(req.params.id);
    if (!id.success) return reject(res,new StockCommandError('INVALID_COMMAND'));
    try {
      const service = new StockCommandService(req.supabaseClient as unknown as SupabaseClient);
      const result = await service.getResult(req.user.id,id.data);
      return result ? ok(res,result) : reject(res,new StockCommandError('COMMAND_NOT_FOUND',404));
    } catch (error) { return reject(res,error); }
  });
  return router;
}
