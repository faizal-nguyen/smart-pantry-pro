/**
 * REST API for social recipe imports (PRP-220.10).
 *
 * Endpoints:
 *   POST   /                        capture a single URL
 *   POST   /bulk                    capture up to 50 URLs in a batch
 *   GET    /                        cursor-paginated list with filters
 *   GET    /:id                     detail
 *   PATCH  /:id                     archive / un-archive / fix metadata
 *
 * extract / save flows live in their own endpoints (PRP-220.11).
 */
import { Router, type Request, type Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { SocialImportRepository } from '../services/imports/SocialImportRepository.js';
import { SocialImportService } from '../services/imports/SocialImportService.js';
import {
  CaptureRequestSchema,
  BulkCaptureRequestSchema,
  ListImportsQuerySchema,
  PatchImportSchema,
} from '../schemas/imports.js';
import { ok, fail } from '../utils/responses.js';

export function createImportsSocialRouter(adminClient: SupabaseClient<any, any, any>): Router {
  const router = Router();
  const auth = createAuthMiddleware(adminClient);
  router.use(auth);

  // ---- POST / -------------------------------------------------------
  router.post('/', async (req: Request, res: Response) => {
    const parsed = CaptureRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Invalid request body', 400, 'INVALID_BODY');
    }
    const userId = req.user?.id;
    const userClient = req.supabaseClient;
    if (!userId || !userClient) return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');

    try {
      const service = new SocialImportService(new SocialImportRepository(userClient));
      const result = await service.capture(userId, parsed.data.url);
      return ok(
        res,
        { import: result.import, duplicate: result.duplicate },
        result.duplicate ? 'Existing import' : 'Captured',
        result.duplicate ? 'CAPTURE_DUPLICATE' : 'CAPTURE_OK',
        result.duplicate ? 200 : 201
      );
    } catch (error) {
      console.error('[imports.social.capture] error:', error);
      return fail(res, 'Failed to capture import', 500, 'CAPTURE_FAILED');
    }
  });

  // ---- POST /bulk ---------------------------------------------------
  router.post('/bulk', async (req: Request, res: Response) => {
    const parsed = BulkCaptureRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Invalid request body', 400, 'INVALID_BODY');
    }
    const userId = req.user?.id;
    const userClient = req.supabaseClient;
    if (!userId || !userClient) return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');

    const service = new SocialImportService(new SocialImportRepository(userClient));
    const results = await service.bulkCapture(userId, parsed.data.urls);
    return ok(res, { results }, 'Bulk processed', 'BULK_OK');
  });

  // ---- GET / --------------------------------------------------------
  router.get('/', async (req: Request, res: Response) => {
    const parsed = ListImportsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return fail(res, 'Invalid query', 400, 'INVALID_QUERY');
    }
    const userId = req.user?.id;
    const userClient = req.supabaseClient;
    if (!userId || !userClient) return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');

    try {
      const service = new SocialImportService(new SocialImportRepository(userClient));
      const result = await service.list(userId, parsed.data);
      return ok(
        res,
        { items: result.items, nextCursor: result.nextCursor },
        'OK',
        'LIST_OK'
      );
    } catch (error) {
      console.error('[imports.social.list] error:', error);
      return fail(res, 'Failed to list imports', 500, 'LIST_FAILED');
    }
  });

  // ---- GET /:id -----------------------------------------------------
  router.get('/:id', async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const userClient = req.supabaseClient;
    if (!userId || !userClient) return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');

    try {
      const service = new SocialImportService(new SocialImportRepository(userClient));
      const row = await service.get(userId, req.params.id);
      if (!row) return fail(res, 'Not found', 404, 'NOT_FOUND');
      return ok(res, row, 'OK', 'GET_OK');
    } catch (error) {
      console.error('[imports.social.get] error:', error);
      return fail(res, 'Failed to fetch import', 500, 'GET_FAILED');
    }
  });

  // ---- PATCH /:id ---------------------------------------------------
  router.patch('/:id', async (req: Request, res: Response) => {
    const parsed = PatchImportSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Invalid request body', 400, 'INVALID_BODY');
    }
    const userId = req.user?.id;
    const userClient = req.supabaseClient;
    if (!userId || !userClient) return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');

    try {
      const service = new SocialImportService(new SocialImportRepository(userClient));
      const row = await service.patch(userId, req.params.id, parsed.data);
      if (!row) return fail(res, 'Not found', 404, 'NOT_FOUND');
      return ok(res, row, 'Updated', 'PATCH_OK');
    } catch (error) {
      console.error('[imports.social.patch] error:', error);
      return fail(res, 'Failed to update import', 500, 'PATCH_FAILED');
    }
  });

  return router;
}
