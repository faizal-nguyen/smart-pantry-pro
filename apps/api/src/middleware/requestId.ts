import type { Response, NextFunction } from 'express';

export function requestIdHeader(req: any, res: Response, next: NextFunction) {
  if (req.id) res.setHeader('x-request-id', req.id);
  next();
}
