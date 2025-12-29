import type { AnyZodObject } from 'zod';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ok, fail } from './responses.js';

type Handler<TBody = any, TOut = any> = (ctx: { req: Request & { validated?: TBody }, res: Response }) => Promise<TOut> | TOut;

export function route<TBody = any, TOut = any>(options: { schema?: AnyZodObject; handler: Handler<TBody, TOut> }): RequestHandler {
  const { schema, handler } = options;
  return async (req: Request, res: Response, _next: NextFunction) => {
    try {
      if (schema) {
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) return fail(res, { issues: parsed.error.issues }, 400, 'INVALID_BODY');
        (req as any).validated = parsed.data;
      }
      const data = await handler({ req: req as any, res });
      return ok(res, data);
    } catch (e) {
      return fail(res, (e as any)?.message || 'Unexpected error', 500, 'INTERNAL_ERROR');
    }
  };
}

