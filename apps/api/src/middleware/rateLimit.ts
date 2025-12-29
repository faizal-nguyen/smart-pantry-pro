import type { Request, Response, NextFunction, RequestHandler } from 'express';

type Bucket = { count: number; reset: number };
const store = new Map<string, Bucket>();

export function rateLimit(options: { windowMs: number; max: number; key?: (req: Request) => string }): RequestHandler {
  const { windowMs, max } = options;
  const keyFn = options.key || ((req) => (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown');

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyFn(req);
    const now = Date.now();
    const entry = store.get(key) || { count: 0, reset: now + windowMs };
    if (now > entry.reset) {
      entry.count = 0;
      entry.reset = now + windowMs;
    }
    entry.count += 1;
    store.set(key, entry);
    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.reset - now) / 1000));
      return res.status(429).json({ success: false, error: 'Too many requests', code: 'RATE_LIMITED' });
    }
    next();
  };
}

