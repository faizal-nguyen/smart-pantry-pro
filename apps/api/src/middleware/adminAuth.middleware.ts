/**
 * Admin authentication middleware.
 *
 * Used by `/api/admin/*` routes that perform service-role operations
 * (deletion worker, future migration tools, etc.). The auth model
 * here is **deliberately simple** — pas de JWT, juste un token
 * partagé via header `X-Admin-Token` qui doit matcher l'env var
 * `ADMIN_TOKEN`. Le token vit côté serveur uniquement (jamais exposé
 * au client).
 *
 * Sécurité :
 *   - `ADMIN_TOKEN` absent → la route retourne 503 (fail closed)
 *   - Header absent / mismatch → 401
 *   - Token < 32 chars → 503 (refuse les tokens faibles)
 *   - Aucun log du token, même en cas d'échec
 *
 * Pour invoquer ces endpoints en V1 : depuis un cron externe, un
 * job Vercel, ou manuellement depuis l'admin (curl avec le header).
 * Un futur dashboard admin pourra wrapper ces endpoints derrière
 * une session admin (out of scope).
 */
import type { RequestHandler } from 'express';

import { fail } from '../utils/responses.js';

export function createAdminAuthMiddleware(): RequestHandler {
  return (req, res, next) => {
    const expected = process.env.ADMIN_TOKEN;
    if (!expected || expected.length < 32) {
      return fail(
        res,
        'Admin endpoints non configurés (ADMIN_TOKEN manquant ou < 32 chars).',
        503,
        'ADMIN_NOT_CONFIGURED',
      );
    }
    const provided = req.header('x-admin-token');
    if (!provided || provided !== expected) {
      return fail(res, 'Unauthorized', 401, 'ADMIN_UNAUTHORIZED');
    }
    return next();
  };
}
