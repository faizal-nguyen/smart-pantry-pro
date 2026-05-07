/**
 * Prometheus metrics endpoint (PRP-220.15).
 *
 * Exposes the prom-client registry as `text/plain; version=0.0.4`.
 *
 * Auth strategy:
 *   - When `METRICS_AUTH_TOKEN` is set, the request must carry a
 *     matching `Authorization: Bearer <token>` header (constant-time
 *     comparison). This is a hard requirement on production deploys.
 *   - When the token is unset (dev), the endpoint is open. Operators
 *     are expected to keep the metrics endpoint behind a private
 *     reverse-proxy ACL in that case.
 */
import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';

import { metrics } from '../lib/metrics.js';

export function createMetricsRouter(): Router {
  const router = Router();
  const expectedToken = process.env.METRICS_AUTH_TOKEN;

  router.get('/', async (req: Request, res: Response) => {
    if (expectedToken) {
      const provided = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
      if (!provided || !timingSafeEqual(provided, expectedToken)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }
    res.setHeader('Content-Type', metrics.registry.contentType);
    res.send(await metrics.registry.metrics());
  });

  return router;
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}
