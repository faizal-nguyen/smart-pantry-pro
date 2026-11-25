/**
 * V11-01 E5a — receipt routes (PRP V11-01, section 7; decisions D10 and D13).
 *
 * `POST /api/v1/receipts/scan`: one photo (multipart field `receipt`, 4 MB at most, under Vercel's
 * 4.5 MB request limit), checked by its bytes and size, read by the vision role, kept as text in
 * receipt_scans (never the photo). Writes nothing to the list or the stock: the reviewed scan is
 * applied by the stock command reconcile_receipt. 20 scans per hour free, 200 premium (V11-01 E0).
 * `GET /api/v1/receipts/history` and `GET /api/v1/receipts/:id`: the user's scans, user-scoped (RLS);
 * 60 reads per hour free, 600 premium.
 * Removed (no caller, PRP V11-01 §3): `scan-base64`, and `add-to-inventory`, which wrote the stock
 * outside the commands. Logs carry ids, states and counts, never a receipt's text or prices.
 */
import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase.js';
import { logError, logger } from '../config/logger.js';
import { userRateLimit } from '../middleware/userRateLimit.js';
import { loadAssistantModelConfig, type AssistantModelConfig } from '../services/ai/ModelConfig.js';
import { createOpenAICompletionClient } from '../services/ai/OpenAITransport.js';
import type { AICompletionClient } from '../services/imports/RecipeExtractionService.js';
import { ReceiptReader } from '../services/receipt/ReceiptReader.js';
import { ReceiptScanError, ReceiptScanService } from '../services/receipt/ReceiptScanService.js';
import { fail, ok } from '../utils/responses.js';

const HOUR = 3_600_000;
const PHOTO_LIMIT_BYTES = 4 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PHOTO_LIMIT_BYTES, files: 1, fields: 0 },
  fileFilter: (_req, file, cb) => {
    // A first filter only: the content is checked by its bytes before the provider (some phones
    // declare a photo as octet-stream).
    if (['image/jpeg', 'image/png', 'image/webp', 'application/octet-stream'].includes(file.mimetype)) { cb(null, true); return; }
    cb(new Error('Photo en JPEG, PNG ou WebP seulement.'));
  },
});
function receiptPhoto(req: Request, res: Response, next: NextFunction) {
  photoUpload.single('receipt')(req, res, (error: unknown) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return fail(res, 'Photo trop volumineuse (4 Mo au plus).', 413, 'RECEIPT_PHOTO_TOO_LARGE');
    }
    if (error instanceof multer.MulterError) return fail(res, 'Envoie une seule photo du ticket.', 400, 'RECEIPT_PHOTO_INVALID');
    return fail(res, 'Photo en JPEG, PNG ou WebP seulement.', 415, 'UNSUPPORTED_IMAGE');
  });
}

export interface ReceiptsRouterOptions {
  /** The provider client and model configuration, injected in tests. */
  ai?: AICompletionClient;
  modelConfig?: AssistantModelConfig;
}

export function createReceiptsRouter(supabaseAdmin: SupabaseClient<Database>, options: ReceiptsRouterOptions = {}): Router {
  const router = Router();
  const reader = new ReceiptReader(options.ai ?? createOpenAICompletionClient(), options.modelConfig ?? loadAssistantModelConfig());
  const service = new ReceiptScanService(supabaseAdmin as unknown as SupabaseClient, reader);
  const readLimiter = userRateLimit({ key: 'receipts.read', freeMax: 60, premiumMax: 600, windowMs: HOUR });
  const answerFailure = (res: Response, error: unknown, context: string, message: string) => {
    if (error instanceof ReceiptScanError) return fail(res, error.message, error.status, error.code);
    logError(error, { context });
    return fail(res, message, 500, 'RECEIPT_FAILED');
  };

  router.post('/scan', userRateLimit({ key: 'receipts.scan', freeMax: 20, premiumMax: 200, windowMs: HOUR }), receiptPhoto, async (req: Request, res: Response) => {
    if (!req.user?.id || !req.supabaseClient) return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    if (!req.file) return fail(res, 'Ajoute la photo du ticket.', 400, 'RECEIPT_PHOTO_MISSING');
    const started = Date.now();
    try {
      const scan = await service.scan(req.supabaseClient as unknown as SupabaseClient, req.user.id, req.file.buffer);
      logger.info({ context: 'receipts.scan', scan_id: scan.id, state: scan.state, lines: scan.lines.length, duration_ms: Date.now() - started });
      return ok(res, scan, 'OK', 'RECEIPT_SCANNED', 201);
    } catch (error) {
      if (error instanceof ReceiptScanError) logger.info({ context: 'receipts.scan', code: error.code, duration_ms: Date.now() - started });
      return answerFailure(res, error, 'receipts.scan', 'La lecture du ticket a échoué. Réessaie dans un instant.');
    }
  });

  router.get('/history', readLimiter, async (req: Request, res: Response) => {
    if (!req.user?.id || !req.supabaseClient) return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    try {
      return ok(res, await service.history(req.supabaseClient as unknown as SupabaseClient, req.user.id), 'OK', 'RECEIPT_HISTORY_OK');
    } catch (error) {
      return answerFailure(res, error, 'receipts.history', 'L’historique des tickets ne peut pas être lu pour le moment.');
    }
  });

  router.get('/:id', readLimiter, async (req: Request, res: Response) => {
    if (!req.user?.id || !req.supabaseClient) return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    const notFound = () => fail(res, 'Ce ticket n’est plus disponible : scanne-le à nouveau.', 404, 'RECEIPT_NOT_FOUND');
    if (!UUID.test(req.params.id)) return notFound();
    try {
      const scan = await service.get(req.supabaseClient as unknown as SupabaseClient, req.user.id, req.params.id);
      return scan ? ok(res, scan, 'OK', 'RECEIPT_OK') : notFound();
    } catch (error) {
      return answerFailure(res, error, 'receipts.get', 'Ce ticket ne peut pas être lu pour le moment.');
    }
  });

  return router;
}
