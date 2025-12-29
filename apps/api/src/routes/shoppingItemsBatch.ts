import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { batchAddItems } from '../services/shoppingItemsBatchService.js';
import { ShoppingItemsBody } from '@smart/shared';
import { ok, fail } from '../utils/responses.js';

export const shoppingItemsBatchRouter = Router();

const Body = ShoppingItemsBody;

shoppingItemsBatchRouter.post('/', async (req: Request, res: Response) => {
  const check = Body.safeParse(req.body);
  if (!check.success) return fail(res, 'Invalid request body', 400, 'INVALID_BODY');
  const payload: any = await batchAddItems(check.data);
  return ok(res, { ...payload, code: 'BATCH_OK' }, 'Batched');
});
