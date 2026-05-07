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
import { userRateLimit } from '../middleware/userRateLimit.js';
import { SocialImportRepository } from '../services/imports/SocialImportRepository.js';
import {
  SocialImportService,
  type SocialImportServiceOptions,
} from '../services/imports/SocialImportService.js';
import {
  CaptureRequestSchema,
  BulkCaptureRequestSchema,
  ListImportsQuerySchema,
  PatchImportSchema,
  ExtractRequestSchema,
  SaveRequestSchema,
} from '../schemas/imports.js';
import {
  isExtractionFailed,
  isImportInvalidState,
  isImportNotFound,
  isNoDraftAvailable,
  isSaveFailed,
} from '../services/imports/importErrors.js';
import { ok, fail } from '../utils/responses.js';

export interface CreateImportsSocialRouterOptions extends SocialImportServiceOptions {}

export function createImportsSocialRouter(
  adminClient: SupabaseClient<any, any, any>,
  options: CreateImportsSocialRouterOptions = {}
): Router {
  const router = Router();
  const auth = createAuthMiddleware(adminClient);
  router.use(auth);

  // Per-user rate limits (PRP-220.15). Read-only endpoints (GET) stay
  // unmetered — the cost is in the AI calls and capture pipelines.
  const HOUR = 3_600_000;
  const captureLimiter = userRateLimit({
    key: 'imports.capture',
    freeMax: 30,
    premiumMax: 200,
    windowMs: HOUR,
  });
  const bulkLimiter = userRateLimit({
    key: 'imports.bulk',
    freeMax: 5,
    premiumMax: 30,
    windowMs: HOUR,
  });
  const extractLimiter = userRateLimit({
    key: 'imports.extract',
    freeMax: 10,
    premiumMax: 100,
    windowMs: HOUR,
  });
  const saveLimiter = userRateLimit({
    key: 'imports.save',
    freeMax: 30,
    premiumMax: 300,
    windowMs: HOUR,
  });

  const buildService = (req: Request) => {
    const userClient = req.supabaseClient!;
    return new SocialImportService(new SocialImportRepository(userClient), options);
  };

  // ---- POST / -------------------------------------------------------
  router.post('/', captureLimiter, async (req: Request, res: Response) => {
    const parsed = CaptureRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Invalid request body', 400, 'INVALID_BODY');
    }
    const userId = req.user?.id;
    const userClient = req.supabaseClient;
    if (!userId || !userClient) return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');

    try {
      const service = buildService(req);
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
  router.post('/bulk', bulkLimiter, async (req: Request, res: Response) => {
    const parsed = BulkCaptureRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Invalid request body', 400, 'INVALID_BODY');
    }
    const userId = req.user?.id;
    const userClient = req.supabaseClient;
    if (!userId || !userClient) return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');

    const service = buildService(req);
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
      const service = buildService(req);
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
      const service = buildService(req);
      const row = await service.get(userId, req.params.id);
      if (!row) return fail(res, 'Not found', 404, 'NOT_FOUND');
      return ok(res, row, 'OK', 'GET_OK');
    } catch (error) {
      console.error('[imports.social.get] error:', error);
      return fail(res, 'Failed to fetch import', 500, 'GET_FAILED');
    }
  });

  // ---- GET /:id/current-draft --------------------------------------
  // Returns the latest draft for an import alongside the import row
  // itself. Used by the inbox "Vérifier" flow (PRP-220.12) to open the
  // ExtractedRecipeModal pre-filled with the actual extraction.
  router.get('/:id/current-draft', async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId || !req.supabaseClient) {
      return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    }
    try {
      const service = buildService(req);
      const result = await service.getWithCurrentDraft(userId, req.params.id);
      if (!result) return fail(res, 'Not found', 404, 'NOT_FOUND');
      return ok(
        res,
        { import: result.import, draft: result.draft },
        result.draft ? 'OK' : 'No draft yet',
        result.draft ? 'CURRENT_DRAFT_OK' : 'NO_DRAFT_YET'
      );
    } catch (error) {
      console.error('[imports.social.current-draft] error:', error);
      return fail(res, 'Failed to fetch draft', 500, 'CURRENT_DRAFT_FAILED');
    }
  });

  // ---- POST /:id/extract -------------------------------------------
  router.post('/:id/extract', extractLimiter, async (req: Request, res: Response) => {
    const parsed = ExtractRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return fail(res, 'Invalid request body', 400, 'INVALID_BODY');
    }
    const userId = req.user?.id;
    if (!userId || !req.supabaseClient) {
      return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    }

    try {
      const service = buildService(req);
      const result = await service.extract(userId, req.params.id, parsed.data);
      return ok(
        res,
        {
          import: result.import,
          draft: result.draft,
          modelUsed: result.modelUsed,
          durationMs: result.durationMs,
          cost: result.cost,
        },
        'Draft ready',
        'EXTRACT_OK'
      );
    } catch (error) {
      if (isImportNotFound(error)) {
        return fail(res, 'Not found', 404, 'NOT_FOUND');
      }
      if (isImportInvalidState(error)) {
        return fail(
          res,
          `Cannot transition from status "${error.currentStatus}"`,
          409,
          'INVALID_STATE'
        );
      }
      if (isExtractionFailed(error)) {
        console.error('[imports.social.extract] extraction failed:', {
          platform: error.platform,
          message: error.message,
        });
        return fail(res, 'Video extraction failed', 422, 'EXTRACTION_FAILED');
      }
      console.error('[imports.social.extract] unexpected error:', error);
      return fail(res, 'Failed to extract import', 500, 'EXTRACT_FAILED');
    }
  });

  // ---- POST /:id/save ----------------------------------------------
  router.post('/:id/save', saveLimiter, async (req: Request, res: Response) => {
    const parsed = SaveRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return fail(res, 'Invalid request body', 400, 'INVALID_BODY');
    }
    const userId = req.user?.id;
    if (!userId || !req.supabaseClient) {
      return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    }

    try {
      const service = buildService(req);
      const result = await service.save(req.supabaseClient, userId, req.params.id, {
        draft: parsed.data.draft,
        collections: parsed.data.collections,
        personalNotes: parsed.data.personal_notes,
      });
      return ok(
        res,
        { import: result.import, recipe_id: result.recipeId },
        'Saved',
        'SAVE_OK'
      );
    } catch (error) {
      if (isImportNotFound(error)) {
        return fail(res, 'Not found', 404, 'NOT_FOUND');
      }
      if (isImportInvalidState(error)) {
        return fail(
          res,
          `Cannot transition from status "${error.currentStatus}"`,
          409,
          'INVALID_STATE'
        );
      }
      if (isNoDraftAvailable(error)) {
        return fail(res, 'No draft available for this import', 409, 'NO_DRAFT_AVAILABLE');
      }
      if (isSaveFailed(error)) {
        console.error('[imports.social.save] save failed:', error.message);
        return fail(res, 'Failed to save recipe', 422, 'SAVE_FAILED');
      }
      console.error('[imports.social.save] unexpected error:', error);
      return fail(res, 'Failed to save import', 500, 'SAVE_FAILED');
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
      const service = buildService(req);
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
