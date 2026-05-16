/**
 * PRP-221 J5 — Assistant agent routes.
 *
 *   POST /api/assistant/voice                multipart audio  → plan
 *   POST /api/assistant/text                 JSON utterance   → plan
 *   POST /api/assistant/actions/execute      confirmation     → exec
 *   POST /api/assistant/actions/:id/undo     undo a row       → exec
 *
 * The chat-streaming router (`assistantRouter` in routes/assistant.ts)
 * stays mounted at the same /api/assistant prefix on path `/`. This
 * router handles distinct sub-paths only, so no collision.
 */
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { userRateLimit } from '../middleware/userRateLimit.js';
import { ok, fail } from '../utils/responses.js';

import {
  VoiceAgentService,
  VoiceAgentError,
  type VoiceAgentRequestInput,
} from '../services/assistant/VoiceAgentService.js';
import { ToolRegistry } from '../services/assistant/ToolRegistry.js';
import { ActionLogWriter } from '../services/assistant/ActionLogWriter.js';
import { ConfirmationTokenSigner } from '../services/assistant/ConfirmationTokenSigner.js';
import { MemoryService } from '../services/assistant/MemoryService.js';
import { ContextBuilder } from '../services/assistant/ContextBuilder.js';
import { MemoryExtractor } from '../services/assistant/MemoryExtractor.js';
import { registerMemoryHandlers } from '../services/assistant/handlers/memory.js';
import { CookingJournalService } from '../services/cooking/CookingJournalService.js';
import type { Database } from '../types/supabase.js';
import { ToolHandlerRegistry, ToolHandlerNotFoundError } from '../services/assistant/handlers/types.js';
import { registerReadHandlers } from '../services/assistant/handlers/read.js';
import { registerWriteHandlers } from '../services/assistant/handlers/write.js';
import { registerProductHandlers } from '../services/assistant/handlers/products.js';
import { ProductIntelligenceService } from '../services/products/ProductIntelligenceService.js';
import { registerInternalHandlers } from '../services/assistant/handlers/internal.js';
import { registerHighHandlers } from '../services/assistant/handlers/high.js';
import { registerMetaHandlers } from '../services/assistant/handlers/meta.js';
import { SocialImportRepository } from '../services/imports/SocialImportRepository.js';
import { SocialImportService } from '../services/imports/SocialImportService.js';
import {
  defaultExtractionService,
  saveImportedDraftAsRecipe,
} from '../services/imports/index.js';
import { ProductResolver } from '../services/assistant/ProductResolver.js';
import {
  createOpenAICompletionClient,
  type AICompletionClient,
} from '../services/imports/RecipeExtractionService.js';
import {
  createOpenAIWhisperClient,
  type WhisperClient,
} from '../services/media/WhisperTranscriber.js';

const DEFAULT_AUDIO_LIMIT_BYTES = 25 * 1024 * 1024; // Whisper's hard cap
const audioLimitBytes = (() => {
  const raw = process.env.ASSISTANT_AUDIO_MAX_BYTES;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_AUDIO_LIMIT_BYTES;
})();

const ALLOWED_AUDIO_MIME = new Set([
  'audio/mp4',
  'audio/m4a',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
]);
const MIME_TO_EXT: Record<string, string> = {
  'audio/mp4': 'mp4',
  'audio/m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: audioLimitBytes },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_AUDIO_MIME.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error(`Audio MIME non supporté: ${file.mimetype}`));
  },
});

function multerSingleAudio(req: Request, res: Response, next: NextFunction) {
  upload.single('audio')(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return fail(
        res,
        `Audio trop volumineux (max ${audioLimitBytes} bytes / Whisper).`,
        413,
        'AUDIO_TOO_LARGE'
      );
    }
    return fail(res, error, 415, 'UNSUPPORTED_AUDIO');
  });
}

// ---- Body schemas ---------------------------------------------------

const TextRequestSchema = z.object({
  text: z.string().min(1).max(4000),
  client_request_id: z.string().uuid(),
  language: z.string().regex(/^[a-z]{2}$/i).optional(),
  allowed_tools: z.array(z.string().min(1).max(64)).optional(),
  // PRP-223 PR3 — optional conversation handle. Unknown/cross-user ids
  // fall back to a fresh conversation in the service.
  conversation_id: z.string().uuid().optional(),
});

const VoiceFormFieldsSchema = z.object({
  client_request_id: z.string().uuid(),
  language: z.string().regex(/^[a-z]{2}$/i).optional(),
  audio_duration_seconds: z.coerce.number().nonnegative().optional(),
  allowed_tools: z.string().optional(), // comma-separated in form data
  conversation_id: z.string().uuid().optional(), // PRP-223 PR3
});

const ConfirmRequestSchema = z.object({
  confirmation_token: z.string().min(1).max(2000),
});

// ---- Error mapping --------------------------------------------------

function mapVoiceAgentError(res: Response, err: VoiceAgentError): Response {
  const status = (
    {
      TRANSCRIPTION_FAILED: 422,
      LLM_FAILED: 502,
      NO_TOOL_HANDLER: 501,
      CONFIRMATION_INVALID: 400,
      CONFIRMATION_EXPIRED: 410,
      UNDO_NOT_FOUND: 404,
      UNDO_NOT_REVERSIBLE: 409,
      UNDO_EXPIRED: 410,
      UNDO_HANDLER_MISSING: 501,
      INTERNAL: 500,
    } as Record<VoiceAgentError['code'], number>
  )[err.code] ?? 500;
  return fail(res, err.message, status, err.code);
}

// ---- Router factory -------------------------------------------------

export interface CreateAssistantAgentRouterOptions {
  /** Inject mocks for tests; defaults pull from env. */
  ai?: AICompletionClient;
  whisper?: WhisperClient;
  /** Override the HMAC secret (default: process.env.ASSISTANT_HMAC_SECRET). */
  hmacSecret?: string;
}

export function createAssistantAgentRouter(
  adminClient: SupabaseClient<any, any, any>,
  options: CreateAssistantAgentRouterOptions = {}
): Router {
  const router = Router();
  const auth = createAuthMiddleware(adminClient);
  router.use(auth);

  const hmacSecret = options.hmacSecret ?? process.env.ASSISTANT_HMAC_SECRET ?? '';
  if (!hmacSecret || hmacSecret.length < 32) {
    // The router still mounts to keep app boot stable, but every call
    // returns 503 with a clear message until the operator fixes env.
    router.all('/voice', notConfigured);
    router.all('/text', notConfigured);
    router.all('/actions/execute', notConfigured);
    router.all('/actions/:id/undo', notConfigured);
    return router;
  }

  const ai = options.ai ?? createOpenAICompletionClient();
  const whisper = options.whisper ?? createOpenAIWhisperClient();
  const writer = new ActionLogWriter(adminClient);
  const signer = new ConfirmationTokenSigner(hmacSecret);

  // PRP-223 PR3 — wire MemoryService so /text and /voice persist
  // conversations + messages. Best-effort: if any memory write fails the
  // service logs and continues, so the assistant path stays available.
  const memoryService = new MemoryService(adminClient as unknown as SupabaseClient<Database>);
  // PRP-223 PR4 — build memory context block (top memories, summary,
  // recent messages, session context) injected into the system prompt.
  const contextBuilder = new ContextBuilder(memoryService);

  const handlerRegistry = new ToolHandlerRegistry();
  registerReadHandlers(handlerRegistry);
  registerWriteHandlers(handlerRegistry);
  registerInternalHandlers(handlerRegistry);
  // PRP-225 PR5 — Product Intelligence read + low write tools.
  registerProductHandlers(handlerRegistry);
  // PRP-223 PR4/PR5/PR7 — read + write tools that talk to MemoryService
  // and CookingJournalService.
  const cookingJournalService = new CookingJournalService(
    adminClient as unknown as SupabaseClient<Database>,
  );
  registerMemoryHandlers(handlerRegistry, {
    memoryService,
    cookingJournal: cookingJournalService,
  });
  // J5c HIGH-tier needs SocialImportService for import_recipe_from_url —
  // we build a fresh one per request from the per-request user client +
  // the existing extraction + save dependencies.
  const buildSocialImportService = (uc: SupabaseClient<any, any, any>) =>
    new SocialImportService(new SocialImportRepository(uc), {
      extractionService: defaultExtractionService(),
      saveImportedDraftAsRecipe,
    });
  registerHighHandlers(handlerRegistry, { buildSocialImportService });
  registerMetaHandlers(handlerRegistry, { writer });

  // PRP-223 PR5 — rules-based memory extractor, async best-effort per turn.
  const memoryExtractor = new MemoryExtractor();

  const service = new VoiceAgentService(
    ai,
    whisper,
    new ToolRegistry(),
    handlerRegistry,
    writer,
    signer,
    { memoryService, contextBuilder, memoryExtractor }
  );

  // Conservative rate limits — voice + LLM + Whisper makes each call ~$0.01.
  const HOUR = 3_600_000;
  const requestLimiter = userRateLimit({
    key: 'assistant.request',
    freeMax: 30,
    premiumMax: 300,
    windowMs: HOUR,
  });
  const confirmLimiter = userRateLimit({
    key: 'assistant.confirm',
    freeMax: 60,
    premiumMax: 600,
    windowMs: HOUR,
  });
  const undoLimiter = userRateLimit({
    key: 'assistant.undo',
    freeMax: 60,
    premiumMax: 600,
    windowMs: HOUR,
  });

  // ---- /voice -------------------------------------------------------
  router.post('/voice', requestLimiter, multerSingleAudio, async (req: Request, res: Response) => {
    const fields = VoiceFormFieldsSchema.safeParse(req.body);
    if (!fields.success) return fail(res, 'Invalid form fields', 400, 'INVALID_BODY');
    if (!req.file) return fail(res, 'Aucun audio fourni.', 400, 'NO_FILE');
    if (!req.user?.id || !req.supabaseClient) return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');

    const buffer = req.file.buffer;
    const audioSha256 = createHash('sha256').update(buffer).digest('hex');
    const ext = MIME_TO_EXT[req.file.mimetype] ?? 'mp3';

    // Multer keeps audio in memory; Whisper SDK wants a path so we
    // spool to a temp file. Cleanup is unconditional.
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'assistant-voice-'));
    const audioPath = path.join(tmpDir, `audio.${ext}`);
    try {
      await writeFile(audioPath, buffer);

      const allowedTools = fields.data.allowed_tools
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const input: VoiceAgentRequestInput = {
        source: 'voice',
        audioPath,
        audioSha256,
        audioDurationSeconds: fields.data.audio_duration_seconds,
        userId: req.user.id,
        clientRequestId: fields.data.client_request_id,
        language: fields.data.language,
        allowedTools: allowedTools as readonly any[] | undefined,
        conversationId: fields.data.conversation_id,
      };
      const ctx = {
        userId: req.user.id,
        userClient: req.supabaseClient as SupabaseClient<any, any, any>,
        adminClient,
        productResolver: new ProductResolver(req.supabaseClient as SupabaseClient<any, any, any>),
        // PRP-225 PR5 — Product Intelligence service for the new
        // search_product_candidates / resolve_product_by_barcode /
        // enrich_product / confirm_product_candidate tools.
        productIntelligence: new ProductIntelligenceService(adminClient),
      };

      const result = await service.handleRequest(input, ctx);
      return ok(res, result, 'OK', 'ASSISTANT_OK');
    } catch (err) {
      if (err instanceof VoiceAgentError) return mapVoiceAgentError(res, err);
      console.error('[assistant.voice] error:', err);
      return fail(res, 'Assistant error', 500, 'ASSISTANT_FAILED');
    } finally {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    }
  });

  // ---- /text --------------------------------------------------------
  router.post('/text', requestLimiter, async (req: Request, res: Response) => {
    const parsed = TextRequestSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 'Invalid body', 400, 'INVALID_BODY');
    if (!req.user?.id || !req.supabaseClient) return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');

    const ctx = {
      userId: req.user.id,
      userClient: req.supabaseClient as SupabaseClient<any, any, any>,
      adminClient,
      productResolver: new ProductResolver(req.supabaseClient as SupabaseClient<any, any, any>),
      productIntelligence: new ProductIntelligenceService(adminClient),
    };

    try {
      const result = await service.handleRequest(
        {
          source: 'text',
          text: parsed.data.text,
          userId: req.user.id,
          clientRequestId: parsed.data.client_request_id,
          language: parsed.data.language,
          allowedTools: parsed.data.allowed_tools as readonly any[] | undefined,
          conversationId: parsed.data.conversation_id,
        },
        ctx
      );
      return ok(res, result, 'OK', 'ASSISTANT_OK');
    } catch (err) {
      if (err instanceof VoiceAgentError) return mapVoiceAgentError(res, err);
      console.error('[assistant.text] error:', err);
      return fail(res, 'Assistant error', 500, 'ASSISTANT_FAILED');
    }
  });

  // ---- /actions/execute --------------------------------------------
  router.post('/actions/execute', confirmLimiter, async (req: Request, res: Response) => {
    const parsed = ConfirmRequestSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 'Invalid body', 400, 'INVALID_BODY');
    if (!req.user?.id || !req.supabaseClient) return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');

    const ctx = {
      userId: req.user.id,
      userClient: req.supabaseClient as SupabaseClient<any, any, any>,
      adminClient,
      productResolver: new ProductResolver(req.supabaseClient as SupabaseClient<any, any, any>),
      productIntelligence: new ProductIntelligenceService(adminClient),
    };

    try {
      const result = await service.handleConfirm(
        { userId: req.user.id, confirmationToken: parsed.data.confirmation_token },
        ctx
      );
      return ok(res, result, 'OK', 'ASSISTANT_EXEC_OK');
    } catch (err) {
      if (err instanceof VoiceAgentError) return mapVoiceAgentError(res, err);
      if (err instanceof ToolHandlerNotFoundError) {
        return fail(res, err.message, 501, 'NO_TOOL_HANDLER');
      }
      console.error('[assistant.execute] error:', err);
      return fail(res, 'Execution error', 500, 'EXEC_FAILED');
    }
  });

  // ---- /actions/:id/undo -------------------------------------------
  router.post('/actions/:id/undo', undoLimiter, async (req: Request, res: Response) => {
    const idCheck = z.string().uuid().safeParse(req.params.id);
    if (!idCheck.success) return fail(res, 'Invalid action id', 400, 'INVALID_ACTION_ID');
    if (!req.user?.id || !req.supabaseClient) return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');

    const ctx = {
      userId: req.user.id,
      userClient: req.supabaseClient as SupabaseClient<any, any, any>,
      adminClient,
      productResolver: new ProductResolver(req.supabaseClient as SupabaseClient<any, any, any>),
      productIntelligence: new ProductIntelligenceService(adminClient),
    };

    try {
      const result = await service.handleUndo(
        { userId: req.user.id, actionId: req.params.id },
        ctx
      );
      return ok(res, result, 'Undone', 'ASSISTANT_UNDO_OK');
    } catch (err) {
      if (err instanceof VoiceAgentError) return mapVoiceAgentError(res, err);
      console.error('[assistant.undo] error:', err);
      return fail(res, 'Undo error', 500, 'UNDO_FAILED');
    }
  });

  // Quick getter so the frontend (or curl) can mint a client_request_id
  // without needing crypto on the client.
  router.get('/request-id', (_req, res) => {
    return ok(res, { client_request_id: randomUUID() }, 'OK', 'ASSISTANT_REQUEST_ID');
  });

  return router;
}

function notConfigured(_req: Request, res: Response) {
  return fail(
    res,
    'Assistant non configuré (ASSISTANT_HMAC_SECRET manquant ou < 32 chars).',
    503,
    'ASSISTANT_NOT_CONFIGURED'
  );
}
