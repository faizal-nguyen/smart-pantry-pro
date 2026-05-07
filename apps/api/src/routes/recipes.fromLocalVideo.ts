/**
 * POST /api/recipes/from-local-video — drop a local mp4 / mov, get a
 * recipe row populated by AI.
 *
 * Pipeline (synchronous, ~15-30s for a 1-2 min video):
 *   1. multer parses the multipart body (50 MB cap, video MIME allowlist)
 *   2. compute sha256 → idempotently find-or-create a synthetic
 *      `social_recipe_imports` row (platform='manual',
 *      source_url='local://<filename>-<sha-prefix>') so the existing
 *      `saveImportedDraftAsRecipe` RPC works as-is
 *   3. `MediaUploadService.uploadVideo` pushes to Supabase Storage +
 *      inserts the `media_assets` row + queues the thumbnail job
 *   4. `VideoRecipeExtractor.extract` → ImportedRecipeDraft
 *   5. `saveImportedDraftAsRecipe` → recipes row (RPC handles idempotence)
 *   6. UPDATE media_assets SET recipe_id = <new recipe>
 *   7. UPDATE social_recipe_imports SET status='saved', recipe_id, ...
 *   8. respond { recipe, asset, draft, transcript, cost }
 *
 * Failure modes:
 *   - upload fails → 4xx/5xx, no DB write besides the synthetic import
 *   - extract fails → import.status = 'failed' with error_message,
 *                     422 to client, asset retained so user can retry
 *   - save fails    → import.status = 'failed', 500, asset retained
 *
 * Auth: standard Bearer JWT. Rights attestation is auto-minted with
 * `rightsBasis='personal_backup'` since uploading your own file from
 * disk is the canonical "personal archive" act (PRP-220.24 §5.5).
 */
import { createHash } from 'node:crypto';

import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { userRateLimit } from '../middleware/userRateLimit.js';
import { ok, fail } from '../utils/responses.js';
import {
  MediaServiceError,
  MediaUploadService,
} from '../services/media/MediaUploadService.js';
import {
  VideoRecipeExtractor,
  type VideoExtractResult,
} from '../services/media/VideoRecipeExtractor.js';
import {
  createOpenAICompletionClient,
  type AICompletionClient,
} from '../services/imports/RecipeExtractionService.js';
import {
  createOpenAIWhisperClient,
  type WhisperClient,
} from '../services/media/WhisperTranscriber.js';
import { SocialImportRepository } from '../services/imports/SocialImportRepository.js';
import { saveImportedDraftAsRecipe } from '../services/imports/saveImportedDraftAsRecipe.js';

const DEFAULT_MULTIPART_LIMIT = 50 * 1024 * 1024;
const multipartLimit = (() => {
  const raw = process.env.MEDIA_MAX_MULTIPART_BYTES;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MULTIPART_LIMIT;
})();

const ALLOWED_VIDEO_MIME = new Set(['video/mp4', 'video/quicktime', 'video/webm']);
const MIME_TO_EXT: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: multipartLimit },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_VIDEO_MIME.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Type video non supporte (mp4, mov, webm uniquement).'));
  },
});

function multerSingleFile(req: Request, res: Response, next: NextFunction) {
  upload.single('file')(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return fail(
        res,
        `Fichier trop volumineux (max ${multipartLimit} bytes).`,
        413,
        'FILE_TOO_LARGE'
      );
    }
    return fail(res, error, 415, 'UNSUPPORTED_MEDIA_TYPE');
  });
}

const FromLocalVideoBodySchema = z.object({
  caption: z.string().max(4000).optional(),
  language: z
    .string()
    .regex(/^[a-z]{2}$/i, 'language must be a 2-letter ISO-639-1 code')
    .optional(),
  sourceUrl: z.string().url().optional(),
});

export interface CreateRecipesFromLocalVideoRouterOptions {
  /** Inject for tests / future provider swap. Defaults to OpenAI. */
  ai?: AICompletionClient;
  whisper?: WhisperClient;
}

export function createRecipesFromLocalVideoRouter(
  adminClient: SupabaseClient<any, any, any>,
  options: CreateRecipesFromLocalVideoRouterOptions = {}
): Router {
  const router = Router();
  const auth = createAuthMiddleware(adminClient);
  router.use(auth);

  // Tighter than /api/media/videos because each call costs ~$0.01 in
  // OpenAI usage AND ~$0.0002/MB of egress. Free-tier allows ~5 a day,
  // premium ~50 a day.
  const limiter = userRateLimit({
    key: 'recipes.fromLocalVideo',
    freeMax: 5,
    premiumMax: 50,
    windowMs: 24 * 3_600_000,
  });

  // Lazy-built singletons — survive across requests (cheap warm cache
  // for the OpenAI SDK; useless to instantiate per-request).
  const ai = options.ai ?? createOpenAICompletionClient();
  const whisper = options.whisper ?? createOpenAIWhisperClient();
  const extractor = new VideoRecipeExtractor(ai, whisper);

  router.post(
    '/from-local-video',
    limiter,
    multerSingleFile,
    async (req: Request, res: Response) => {
      const parsed = FromLocalVideoBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return fail(res, 'Invalid request body', 400, 'INVALID_BODY');
      }
      if (!req.file) {
        return fail(res, 'Aucun fichier fourni.', 400, 'NO_FILE');
      }
      if (!req.user?.id || !req.supabaseClient) {
        return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      }

      const userId = req.user.id;
      const tier = req.user.tier === 'premium' ? 'premium' : 'free';
      const userClient = req.supabaseClient as SupabaseClient<any, any, any>;
      const buffer = req.file.buffer;
      const filename = req.file.originalname || 'video.mp4';
      const mimeType = req.file.mimetype;
      const extension = MIME_TO_EXT[mimeType] ?? 'mp4';

      const sha256 = createHash('sha256').update(buffer).digest('hex');
      const sourceUrl =
        parsed.data.sourceUrl ?? `local://${encodeURIComponent(filename)}-${sha256.slice(0, 12)}`;

      const importsRepo = new SocialImportRepository(userClient);

      // 1. Find-or-create the synthetic import row (idempotent on sha256).
      let importRow = await importsRepo.findByHash(userId, sha256);
      if (!importRow) {
        try {
          importRow = await importsRepo.insertCaptured({
            userId,
            platform: 'manual',
            sourceUrl,
            canonicalUrl: null,
            sourceHash: sha256,
          });
        } catch (err: any) {
          if (err?.code === '23505') {
            // race: another request inserted between findByHash and us
            importRow = await importsRepo.findByHash(userId, sha256);
          }
          if (!importRow) {
            return fail(res, 'Failed to register import', 500, 'IMPORT_INSERT_FAILED');
          }
        }
      }

      // 2. Upload to Supabase Storage + insert media_assets.
      const uploadService = new MediaUploadService(userClient, adminClient);
      let asset;
      try {
        const result = await uploadService.uploadVideo({
          userId,
          tier,
          file: {
            originalname: filename,
            mimetype: mimeType,
            size: buffer.byteLength,
            buffer,
          },
          importId: importRow.id,
          sourceUrl: parsed.data.sourceUrl,
          origin: 'personal_archive_upload',
          // PRP-220.24 §5.5 — uploading your own local file is the
          // canonical "personal backup" act. We auto-mint the
          // attestation server-side; the UI surfaces a one-line
          // disclosure when the upload starts.
          rightsAttestation: {
            accepted: true,
            rightsBasis: 'personal_backup',
            notes: 'auto_attested_via=local_video_upload',
          },
        });
        asset = result.asset;
      } catch (err) {
        if (err instanceof MediaServiceError) {
          return fail(res, err.message, err.status, err.code);
        }
        console.error('[recipes.fromLocalVideo] upload failed:', err);
        return fail(res, 'Upload failed', 500, 'UPLOAD_FAILED');
      }

      // 3. Audio + Whisper + GPT extraction.
      let extracted: VideoExtractResult;
      try {
        extracted = await extractor.extract({
          videoBuffer: buffer,
          videoExtension: extension,
          filename,
          durationSeconds: asset.duration_seconds ?? 0,
          caption: parsed.data.caption,
          sourceUrl: parsed.data.sourceUrl,
          language: parsed.data.language,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Extraction failed';
        await importsRepo
          .updateLifecycle(userId, importRow.id, {
            status: 'failed',
            error_code: 'VIDEO_EXTRACTION_FAILED',
            error_message: message.slice(0, 500),
          })
          .catch(() => undefined);
        console.error('[recipes.fromLocalVideo] extract failed:', err);
        return fail(res, 'AI extraction failed', 422, 'EXTRACTION_FAILED');
      }

      // 4. Save draft as recipe (idempotent via the RPC).
      let recipeId: string;
      try {
        recipeId = await saveImportedDraftAsRecipe(
          userClient,
          userId,
          extracted.draft,
          { importId: importRow.id }
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Save failed';
        await importsRepo
          .updateLifecycle(userId, importRow.id, {
            status: 'failed',
            error_code: 'SAVE_FAILED',
            error_message: message.slice(0, 500),
          })
          .catch(() => undefined);
        console.error('[recipes.fromLocalVideo] save failed:', err);
        return fail(res, 'Failed to persist recipe', 500, 'SAVE_FAILED');
      }

      // 5. Link media asset to the recipe (admin client — RLS would
      //    block a cross-table update from the user client).
      try {
        const { error: linkErr } = await adminClient
          .from('media_assets')
          .update({ recipe_id: recipeId })
          .eq('id', asset.id);
        if (linkErr) {
          console.warn('[recipes.fromLocalVideo] media_asset link warn:', linkErr);
        }
      } catch (err) {
        console.warn('[recipes.fromLocalVideo] media_asset link warn:', err);
      }

      // 6. Mark the synthetic import as saved.
      await importsRepo
        .updateLifecycle(userId, importRow.id, {
          status: 'saved',
          recipe_id: recipeId,
          title: extracted.draft.title,
          confidence: Number(extracted.draft.confidence.toFixed(3)),
          error_code: null,
          error_message: null,
        })
        .catch((err: unknown) => {
          console.warn('[recipes.fromLocalVideo] import lifecycle warn:', err);
        });

      return ok(
        res,
        {
          recipe: { id: recipeId, name: extracted.draft.title },
          asset,
          import: { id: importRow.id },
          draft: extracted.draft,
          transcript: extracted.transcript,
          detectedLanguage: extracted.detectedLanguage,
          modelUsed: extracted.modelUsed,
          durationMs: extracted.durationMs,
          cost: extracted.cost,
        },
        'Recipe extracted from local video',
        'RECIPE_FROM_VIDEO_OK',
        201
      );
    }
  );

  return router;
}
