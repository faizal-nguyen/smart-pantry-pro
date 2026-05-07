import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { userRateLimit } from '../middleware/userRateLimit.js';
import { ok, fail } from '../utils/responses.js';
import { MediaUploadService, MediaServiceError } from '../services/media/MediaUploadService.js';
import { MediaLifecycleService } from '../services/media/MediaLifecycleService.js';

const DEFAULT_MULTIPART_LIMIT = 50 * 1024 * 1024;
const multipartLimit = (() => {
  const raw = process.env.MEDIA_MAX_MULTIPART_BYTES;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MULTIPART_LIMIT;
})();

const allowedDeclaredTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: multipartLimit },
  fileFilter: (_req, file, cb) => {
    if (allowedDeclaredTypes.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Type de fichier non supporte.'));
  },
});

function multerSingleFile(req: Request, res: Response, next: NextFunction) {
  upload.single('file')(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return fail(res, `Fichier trop volumineux pour l'upload multipart V1 (${multipartLimit} bytes max).`, 413, 'FILE_TOO_LARGE');
    }
    return fail(res, error, 415, 'UNSUPPORTED_MEDIA_TYPE');
  });
}

const IdSchema = z.string().uuid();

const UploadVideoBodySchema = z.object({
  importId: z.string().uuid().optional(),
  recipeId: z.string().uuid().optional(),
  sourceUrl: z.string().url().optional(),
  origin: z.enum(['user_upload', 'personal_archive_upload']).optional(),
  rightsAttestation: z.unknown(),
});

const UploadImageBodySchema = z.object({
  importId: z.string().uuid().optional(),
  recipeId: z.string().uuid().optional(),
  sourceUrl: z.string().url().optional(),
  purpose: z.enum(['cover', 'thumbnail', 'image']).default('image'),
  rightsAttestation: z.unknown(),
});

function handleMediaError(res: Response, error: unknown) {
  if (error instanceof MediaServiceError) {
    return fail(res, error.message, error.status, error.code);
  }
  console.error('[media] error:', error);
  return fail(res, 'Erreur media interne', 500, 'MEDIA_INTERNAL_ERROR');
}

export function createMediaRouter(adminClient: SupabaseClient<any, any, any>): Router {
  const router = Router();
  const auth = createAuthMiddleware(adminClient as any);
  router.use(auth);

  const uploadLimiter = userRateLimit({
    key: 'media.upload',
    freeMax: 20,
    premiumMax: 100,
    windowMs: 3_600_000,
  });

  router.post('/videos', uploadLimiter, multerSingleFile, async (req: Request, res: Response) => {
    const parsed = UploadVideoBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Invalid request body', 400, 'INVALID_BODY');
    }
    if (!req.file) {
      return fail(res, 'Aucun fichier fourni.', 400, 'NO_FILE');
    }
    if (!req.user?.id || !req.supabaseClient) {
      return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    }

    try {
      const service = new MediaUploadService(req.supabaseClient as any, adminClient);
      const result = await service.uploadVideo({
        userId: req.user.id,
        tier: req.user.tier === 'premium' ? 'premium' : 'free',
        file: req.file,
        importId: parsed.data.importId,
        recipeId: parsed.data.recipeId,
        sourceUrl: parsed.data.sourceUrl,
        origin: parsed.data.origin,
        rightsAttestation: parsed.data.rightsAttestation,
      });
      return ok(res, result, 'Video uploaded', 'MEDIA_VIDEO_UPLOADED', 201);
    } catch (error) {
      return handleMediaError(res, error);
    }
  });

  router.post('/images', uploadLimiter, multerSingleFile, async (req: Request, res: Response) => {
    const parsed = UploadImageBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Invalid request body', 400, 'INVALID_BODY');
    }
    if (!req.file) {
      return fail(res, 'Aucun fichier fourni.', 400, 'NO_FILE');
    }
    if (!req.user?.id || !req.supabaseClient) {
      return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    }

    try {
      const service = new MediaUploadService(req.supabaseClient as any, adminClient);
      const asset = await service.uploadImage({
        userId: req.user.id,
        tier: req.user.tier === 'premium' ? 'premium' : 'free',
        file: req.file,
        purpose: parsed.data.purpose,
        importId: parsed.data.importId,
        recipeId: parsed.data.recipeId,
        sourceUrl: parsed.data.sourceUrl,
        rightsAttestation: parsed.data.rightsAttestation,
      });
      return ok(res, { asset }, 'Image uploaded', 'MEDIA_IMAGE_UPLOADED', 201);
    } catch (error) {
      return handleMediaError(res, error);
    }
  });

  router.get('/:id/signed-url', async (req: Request, res: Response) => {
    const parsed = IdSchema.safeParse(req.params.id);
    if (!parsed.success) return fail(res, 'Invalid media id', 400, 'INVALID_MEDIA_ID');
    if (!req.user?.id || !req.supabaseClient) {
      return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    }

    try {
      const service = new MediaLifecycleService(req.supabaseClient as any, adminClient);
      const result = await service.createSignedUrl(req.user.id, parsed.data);
      return ok(res, result, 'Signed URL created', 'MEDIA_SIGNED_URL_OK');
    } catch (error) {
      return handleMediaError(res, error);
    }
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    const parsed = IdSchema.safeParse(req.params.id);
    if (!parsed.success) return fail(res, 'Invalid media id', 400, 'INVALID_MEDIA_ID');
    if (!req.user?.id || !req.supabaseClient) {
      return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    }

    try {
      const service = new MediaLifecycleService(req.supabaseClient as any, adminClient);
      const asset = await service.deleteOwnedAsset(req.user.id, parsed.data);
      return ok(res, { assetId: asset.id }, 'Media deleted', 'MEDIA_DELETED');
    } catch (error) {
      return handleMediaError(res, error);
    }
  });

  return router;
}

