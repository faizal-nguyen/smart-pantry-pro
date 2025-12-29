import { Router, type Request, type Response } from 'express';
import { ok } from '../utils/responses.js';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  return ok(res, { status: 'ok', service: 'apps/api', time: new Date().toISOString() }, 'Health ok', 'OK');
});
