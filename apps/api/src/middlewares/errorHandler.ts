import type { Request, Response, NextFunction } from 'express';
import { fail } from '../utils/responses.js';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const status = (err as any)?.status || 500;
  const code = (err as any)?.code || (status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');
  const message = (err as any)?.message || 'Unexpected error';
  return fail(res, message, status, code);
}

