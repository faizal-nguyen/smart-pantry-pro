import type { Request, Response, NextFunction, RequestHandler } from 'express';

type Bucket = { count: number; reset: number };

/** Hard ceiling on tracked clients per limiter; the oldest entry is evicted beyond it. */
export const RATE_LIMIT_MAX_KEYS = 10_000;

/**
 * Fixed-window, in-process IP limiter.
 *
 * The key is `req.ip`, which Express derives from X-Forwarded-For using
 * the app's `trust proxy` setting (one hop: Render's proxy). Reading the
 * header directly let any client pick its own key by sending a forged
 * first X-Forwarded-For entry.
 *
 * Each limiter owns its store, expired buckets are swept once per window,
 * and the store never holds more than RATE_LIMIT_MAX_KEYS entries.
 */
export function rateLimit(options: { windowMs: number; max: number; key?: (req: Request) => string }): RequestHandler {
  const { windowMs, max } = options;
  const keyFn = options.key || ((req) => req.ip || req.socket.remoteAddress || 'unknown');
  const store = new Map<string, Bucket>();
  let lastSweep = Date.now();

  const sweep = (now: number) => {
    for (const [key, bucket] of store) {
      if (now > bucket.reset) store.delete(key);
    }
    lastSweep = now;
  };

  const handler: RequestHandler & { storeSize?: () => number } = (req: Request, res: Response, next: NextFunction) => {
    const key = keyFn(req);
    const now = Date.now();
    if (now - lastSweep > windowMs) sweep(now);

    let entry = store.get(key);
    if (!entry || now > entry.reset) {
      if (!entry && store.size >= RATE_LIMIT_MAX_KEYS) {
        const oldest = store.keys().next().value;
        if (oldest !== undefined) store.delete(oldest);
      }
      entry = { count: 0, reset: now + windowMs };
      store.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.reset - now) / 1000));
      return res.status(429).json({ success: false, error: 'Too many requests', code: 'RATE_LIMITED' });
    }
    next();
  };
  handler.storeSize = () => store.size;
  return handler;
}
