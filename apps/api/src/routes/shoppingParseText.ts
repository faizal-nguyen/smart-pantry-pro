import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { parseShoppingText } from '../services/shoppingParseTextService.js';
import { ShoppingTextBody } from '@smart/shared';
import { ok, fail } from '../utils/responses.js';

export const shoppingParseTextRouter = Router();

shoppingParseTextRouter.post('/', async (req: Request, res: Response) => {
  const check = ShoppingTextBody.safeParse(req.body);
  if (!check.success) return fail(res, 'Invalid request body', 400, 'INVALID_BODY');
  const payload = await parseShoppingText(check.data);
  const code = payload.demo ? 'DEMO_MODE' : 'LEGACY_OK';
  const message = payload.demo ? 'Parsed (demo mode)' : 'Parsed';
  return ok(res, payload, message, code);
});
