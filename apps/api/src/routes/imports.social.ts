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
import {
  canonicalizeUrl,
} from '../services/imports/canonicalUrl.js';
import { computeSourceHash } from '../services/imports/sourceHash.js';
import { SocialImportRepository } from '../services/imports/SocialImportRepository.js';
import {
  SocialImportService,
  type SocialImportServiceOptions,
} from '../services/imports/SocialImportService.js';
import { ThumbnailSnapshotService } from '../services/media/ThumbnailSnapshotService.js';
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
    // PRP-220.24 §5.13: thumbnail snapshot uses the per-request user
    // client for RLS-bound media_assets inserts and the admin client
    // for the storage upload.
    const thumbnailSnapshotter =
      options.thumbnailSnapshotter ??
      new ThumbnailSnapshotService(userClient, adminClient);
    return new SocialImportService(new SocialImportRepository(userClient), {
      ...options,
      thumbnailSnapshotter,
    });
  };
  const buildRepo = (req: Request) =>
    new SocialImportRepository(req.supabaseClient!);

  // PRP-220.19: free-tier soft cap on "active" imports (anything not
  // archived or saved). Server is the source of truth — the client
  // shows a counter via /counts but cannot bypass this gate. Operators
  // can lift the cap with MAX_FREE_ACTIVE_IMPORTS=99999 in env.
  const FREE_ACTIVE_IMPORT_CAP = (() => {
    const raw = process.env.MAX_FREE_ACTIVE_IMPORTS;
    const n = raw ? Number.parseInt(raw, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 25;
  })();
  const isPremium = (req: Request): boolean => req.user?.tier === 'premium';
  const remainingFreeQuota = async (req: Request): Promise<number | null> => {
    if (isPremium(req)) return null;
    const repo = buildRepo(req);
    const active = await repo.countActive(req.user!.id);
    return Math.max(0, FREE_ACTIVE_IMPORT_CAP - active);
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

    // PRP-220.19: free-tier quota gate. Duplicate captures still
    // succeed (idempotent — they don't increase the active count) so
    // we only block when there's no slot AND the URL is genuinely
    // new. The cheapest safe order is: count first, then let capture
    // do its own dedupe; on a brand-new URL with active >= cap, fail.
    const remaining = await remainingFreeQuota(req);
    if (remaining !== null && remaining <= 0) {
      // Avoid penalising idempotent re-captures of an already-stored
      // URL: try to find it before refusing.
      const repo = buildRepo(req);
      const sourceHash = computeSourceHash(canonicalizeUrl(parsed.data.url));
      const existing = await repo.findByHash(userId, sourceHash);
      if (!existing) {
        return res.status(402).json({
          success: false,
          message: `Limite gratuite de ${FREE_ACTIVE_IMPORT_CAP} imports actifs atteinte`,
          code: 'QUOTA_EXCEEDED',
          data: {
            limit: FREE_ACTIVE_IMPORT_CAP,
            tier: 'free',
            upgradeUrl: '/billing/upgrade',
          },
        });
      }
    }

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

    // PRP-220.19: enforce the free-tier active cap on bulk too.
    // Truncate the slice to the remaining capacity so the user sees
    // partial success instead of a hard 402 — captures that fit go
    // through, the rest are reported as quota-blocked items.
    let urls = parsed.data.urls;
    let blockedByQuota: string[] = [];
    const remaining = await remainingFreeQuota(req);
    if (remaining !== null) {
      if (remaining <= 0) {
        return res.status(402).json({
          success: false,
          message: `Limite gratuite de ${FREE_ACTIVE_IMPORT_CAP} imports actifs atteinte`,
          code: 'QUOTA_EXCEEDED',
          data: { limit: FREE_ACTIVE_IMPORT_CAP, tier: 'free', upgradeUrl: '/billing/upgrade' },
        });
      }
      if (urls.length > remaining) {
        blockedByQuota = urls.slice(remaining);
        urls = urls.slice(0, remaining);
      }
    }

    const service = buildService(req);
    const captureResults = await service.bulkCapture(userId, urls);
    const results = [
      ...captureResults,
      ...blockedByQuota.map((url) => ({
        url,
        error: {
          code: 'QUOTA_EXCEEDED' as const,
          message: 'Quota gratuit atteint',
        },
      })),
    ];
    return ok(res, { results }, 'Bulk processed', 'BULK_OK');
  });

  // ---- GET /counts --------------------------------------------------
  // PRP-220.19: aggregated counts that drive the inbox quota badge +
  // sidebar collections (active / total / by-platform / by-status).
  // Plus a `quota` block so the client can render the gauge without
  // asking another endpoint for the user's tier.
  router.get('/counts', async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId || !req.supabaseClient) {
      return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    }
    try {
      const repo = buildRepo(req);
      const counts = await repo.countByGroupings(userId);
      const tier = isPremium(req) ? 'premium' : 'free';
      const limit = tier === 'premium' ? null : FREE_ACTIVE_IMPORT_CAP;
      return ok(
        res,
        {
          ...counts,
          quota: {
            tier,
            limit,
            remaining: limit === null ? null : Math.max(0, limit - counts.active),
          },
        },
        'OK',
        'COUNTS_OK'
      );
    } catch (error) {
      console.error('[imports.social.counts] error:', error);
      return fail(res, 'Failed to fetch counts', 500, 'COUNTS_FAILED');
    }
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
