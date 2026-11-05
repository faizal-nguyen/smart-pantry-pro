import { Router } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getInstagramThumbnail, isInstagramUrl } from '../services/instagramThumbnailService.js';
import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { userRateLimit } from '../middleware/userRateLimit.js';
import { route } from '../utils/route.js';
import { UrlBody, InstagramThumbnailResponse } from '@smart/shared';
import { fail } from '../utils/responses.js';

/**
 * `POST /thumbnail`: og:image of an Instagram post, for signed-in users.
 * The URL must be an instagram.com address: the server used to fetch
 * any URL a visitor sent (SSRF).
 */
export function createInstagramRouter(adminClient: SupabaseClient<any, any, any>): Router {
  const router = Router();
  router.post(
    '/thumbnail',
    createAuthMiddleware(adminClient as any),
    userRateLimit({ key: 'social.instagram.thumbnail', freeMax: 60, premiumMax: 600, windowMs: 3_600_000 }),
    (req, res, next) => {
      const url = (req.body as { url?: unknown } | undefined)?.url;
      if (typeof url === 'string' && !isInstagramUrl(url)) {
        return fail(res, 'Only instagram.com URLs are accepted', 400, 'URL_NOT_ALLOWED');
      }
      return next();
    },
    route({ schema: UrlBody, handler: async ({ req }) => {
      const { url } = (req as any).validated as { url: string };
      return getInstagramThumbnailSafe(url);
    } }),
  );
  return router;
}

async function getInstagramThumbnailSafe(url: string) {
  const raw = await getInstagramThumbnail(url);
  const parsed = InstagramThumbnailResponse.safeParse({ thumbnail_url: (raw as any).thumbnail_url ?? null, source: (raw as any).source, method: (raw as any).method, message: (raw as any).message, code: (raw as any).code });
  return parsed.success ? parsed.data : raw;
}
