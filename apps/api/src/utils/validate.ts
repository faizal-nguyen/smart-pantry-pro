import type { AnyZodObject, ZodError } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { fail } from './responses.js';

export function validate<T extends AnyZodObject>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const issues = (parsed as any as { error: ZodError }).error.issues;
      return fail(res, { issues }, 400, 'INVALID_BODY');
    }
    (req as any).validated = parsed.data;
    return next();
  };
}

export type Validated<T> = T & { validated?: unknown };

