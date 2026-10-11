/**
 * PRP-223 PR2 — Assistant memory CRUD routes.
 *
 *   GET    /api/assistant/conversations
 *   POST   /api/assistant/conversations
 *   GET    /api/assistant/conversations/:id
 *   GET    /api/assistant/conversations/:id/messages
 *   POST   /api/assistant/conversations/:id/archive
 *   GET    /api/assistant/memories
 *   PATCH  /api/assistant/memories/:id
 *   POST   /api/assistant/memories/:id/forget
 *   POST   /api/assistant/memories/:id/promote
 *
 * Cooking journal routes (`/cooking-journal`) land in PR7 (separate service).
 */
import { Router, type Request, type Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { MemoryCommandSchema } from '@smart/shared';

import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { ok, fail } from '../utils/responses.js';
import { MemoryService, MemoryServiceError } from '../services/assistant/MemoryService.js';
import {
  CookingJournalService,
  CookingJournalServiceError,
} from '../services/cooking/CookingJournalService.js';
import type { Database } from '../types/supabase.js';
import {
  CreateConversationSchema,
  ListConversationsQuerySchema,
  ListMemoriesQuerySchema,
  ListMessagesQuerySchema,
  PatchConversationSchema,
  SearchQuerySchema,
} from '../services/assistant/schemas/memory.js';

function mapMemoryError(res: Response, err: MemoryServiceError): Response {
  const status = (
    {
      NOT_FOUND: 404,
      FORBIDDEN: 403,
      QUOTA_EXCEEDED: 409,
      HEALTH_SENSITIVE_REQUIRES_CONFIRMATION: 409,
      DB_ERROR: 500, COMMAND_REQUIRED: 426, VERSION_CONFLICT: 409, IDEMPOTENCY_CONFLICT: 409, DISABLED: 409,
    } as Record<MemoryServiceError['code'], number>
  )[err.code] ?? 500;
  return fail(res, err.message, status, err.code);
}

const UuidParamsSchema = z.object({ id: z.string().uuid() });

export function createAssistantMemoryRouter(
  adminClient: SupabaseClient<Database>,
): Router {
  const router = Router();
  router.use(createAuthMiddleware(adminClient as unknown as SupabaseClient<any, any, any>));

  const service = new MemoryService(adminClient);

  // ----- Conversations ---------------------------------------------------

  router.get('/conversations', async (req: Request, res: Response) => {
    try {
      const query = ListConversationsQuerySchema.parse(req.query);
      const result = await service.listConversations(req.user.id, query);
      return ok(res, result, 'OK', 'ASSISTANT_MEMORY_CONVERSATIONS_LIST');
    } catch (err) {
      if (err instanceof MemoryServiceError) return mapMemoryError(res, err);
      if (err instanceof z.ZodError) return fail(res, err.issues, 400, 'VALIDATION');
      return fail(res, (err as Error).message ?? 'Internal error', 500, 'INTERNAL');
    }
  });

  router.post('/conversations', async (req: Request, res: Response) => {
    try {
      const body = CreateConversationSchema.parse(req.body ?? {});
      const conversation = await service.createConversation(req.user.id, body);
      return ok(res, { conversation }, 'Created', 'ASSISTANT_MEMORY_CONVERSATION_CREATED', 201);
    } catch (err) {
      if (err instanceof MemoryServiceError) return mapMemoryError(res, err);
      if (err instanceof z.ZodError) return fail(res, err.issues, 400, 'VALIDATION');
      return fail(res, (err as Error).message ?? 'Internal error', 500, 'INTERNAL');
    }
  });

  router.get('/conversations/:id', async (req: Request, res: Response) => {
    try {
      const { id } = UuidParamsSchema.parse(req.params);
      const conversation = await service.getConversation(id, req.user.id);
      return ok(res, { conversation }, 'OK', 'ASSISTANT_MEMORY_CONVERSATION_GET');
    } catch (err) {
      if (err instanceof MemoryServiceError) return mapMemoryError(res, err);
      if (err instanceof z.ZodError) return fail(res, err.issues, 400, 'VALIDATION');
      return fail(res, (err as Error).message ?? 'Internal error', 500, 'INTERNAL');
    }
  });

  router.get('/conversations/:id/messages', async (req: Request, res: Response) => {
    try {
      const { id } = UuidParamsSchema.parse(req.params);
      const query = ListMessagesQuerySchema.parse(req.query);
      // Pre-flight ownership check (returns NOT_FOUND if cross-user).
      await service.getConversation(id, req.user.id);
      const result = await service.listMessages(id, req.user.id, query);
      return ok(res, result, 'OK', 'ASSISTANT_MEMORY_MESSAGES_LIST');
    } catch (err) {
      if (err instanceof MemoryServiceError) return mapMemoryError(res, err);
      if (err instanceof z.ZodError) return fail(res, err.issues, 400, 'VALIDATION');
      return fail(res, (err as Error).message ?? 'Internal error', 500, 'INTERNAL');
    }
  });

  router.post('/conversations/:id/archive', async (req: Request, res: Response) => {
    try {
      const { id } = UuidParamsSchema.parse(req.params);
      const conversation = await service.archiveConversation(id, req.user.id);
      return ok(res, { conversation }, 'Archived', 'ASSISTANT_MEMORY_CONVERSATION_ARCHIVED');
    } catch (err) {
      if (err instanceof MemoryServiceError) return mapMemoryError(res, err);
      if (err instanceof z.ZodError) return fail(res, err.issues, 400, 'VALIDATION');
      return fail(res, (err as Error).message ?? 'Internal error', 500, 'INTERNAL');
    }
  });

  // PRP-224 PR1 — rename / mode change.
  router.patch('/conversations/:id', async (req: Request, res: Response) => {
    try {
      const { id } = UuidParamsSchema.parse(req.params);
      const body = PatchConversationSchema.parse(req.body ?? {});
      const conversation = await service.updateConversation(id, req.user.id, body);
      return ok(res, { conversation }, 'Updated', 'ASSISTANT_MEMORY_CONVERSATION_UPDATED');
    } catch (err) {
      if (err instanceof MemoryServiceError) return mapMemoryError(res, err);
      if (err instanceof z.ZodError) return fail(res, err.issues, 400, 'VALIDATION');
      return fail(res, (err as Error).message ?? 'Internal error', 500, 'INTERNAL');
    }
  });

  // PRP-224 PR1 — soft delete.
  router.delete('/conversations/:id', async (req: Request, res: Response) => {
    try {
      const { id } = UuidParamsSchema.parse(req.params);
      const conversation = await service.softDeleteConversation(id, req.user.id);
      return ok(res, { conversation }, 'Deleted', 'ASSISTANT_MEMORY_CONVERSATION_DELETED');
    } catch (err) {
      if (err instanceof MemoryServiceError) return mapMemoryError(res, err);
      if (err instanceof z.ZodError) return fail(res, err.issues, 400, 'VALIDATION');
      return fail(res, (err as Error).message ?? 'Internal error', 500, 'INTERNAL');
    }
  });

  // PRP-224 PR1 — search messages + summaries.
  router.get('/search', async (req: Request, res: Response) => {
    try {
      const query = SearchQuerySchema.parse(req.query);
      const matches = await service.searchMessages(req.user.id, query.q, query.limit ?? 20);
      return ok(res, { matches }, 'OK', 'ASSISTANT_MEMORY_SEARCH');
    } catch (err) {
      if (err instanceof MemoryServiceError) return mapMemoryError(res, err);
      if (err instanceof z.ZodError) return fail(res, err.issues, 400, 'VALIDATION');
      return fail(res, (err as Error).message ?? 'Internal error', 500, 'INTERNAL');
    }
  });

  // ----- Memories --------------------------------------------------------

  router.get('/memories', async (req: Request, res: Response) => {
    try {
      const query = ListMemoriesQuerySchema.parse(req.query);
      const result = await service.listMemories(req.user.id, query);
      return ok(res, result, 'OK', 'ASSISTANT_MEMORY_LIST');
    } catch (err) {
      if (err instanceof MemoryServiceError) return mapMemoryError(res, err);
      if (err instanceof z.ZodError) return fail(res, err.issues, 400, 'VALIDATION');
      return fail(res, (err as Error).message ?? 'Internal error', 500, 'INTERNAL');
    }
  });

  router.get('/memory-policy', async (req, res) => {
    try { return ok(res, { policy: await service.readPolicy(req.user.id) }, 'OK', 'MEMORY_POLICY'); }
    catch { return fail(res, 'Les autorisations mémoire sont indisponibles.', 503, 'MEMORY_POLICY_UNAVAILABLE'); }
  });
  router.get('/memory-commands/:id', async (req, res) => {
    try {
      const { id } = UuidParamsSchema.parse(req.params);
      const receipt = await service.getCommandReceipt(req.user.id, id);
      return ok(res, { receipt }, 'OK', 'MEMORY_COMMAND_RECEIPT');
    } catch (err) {
      if (err instanceof z.ZodError) return fail(res, err.issues, 400, 'VALIDATION');
      return fail(res, 'Vérification indisponible.', 503, 'MEMORY_VERIFICATION_UNAVAILABLE');
    }
  });
  router.post('/memory-commands', async (req, res) => {
    try {
      const command = MemoryCommandSchema.parse(req.body);
      const receipt = await service.executeCommand(req.user.id, command, req.supabaseClient as SupabaseClient<Database>);
      return ok(res, { receipt }, 'OK', 'MEMORY_COMMAND_RESULT');
    } catch (err) {
      if (err instanceof MemoryServiceError) return mapMemoryError(res, err);
      if (err instanceof z.ZodError) return fail(res, err.issues, 400, 'VALIDATION');
      return fail(res, 'Modification indisponible.', 503, 'MEMORY_WRITE_UNAVAILABLE');
    }
  });
  for (const path of ['/memories', '/memories/:id/forget', '/memories/:id/promote']) {
    router.post(path, (_req, res) => fail(res, 'Mettez l’application à jour pour modifier la mémoire.', 426, 'COMMAND_REQUIRED'));
  }
  router.patch('/memories/:id', (_req, res) => fail(res, 'Une commande versionnée est nécessaire.', 426, 'COMMAND_REQUIRED'));

  // ----- PRP-223 PR7 — Cooking journal ----------------------------------

  const cookingJournal = new CookingJournalService(adminClient);

  const ListCookingJournalQuerySchema = z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    recipe_id: z.string().uuid().optional(),
  });

  const PostCookingJournalSchema = z.object({
    recipe_id: z.string().uuid().optional().nullable(),
    recipe_title: z.string().min(1).max(300),
    outcome: z.enum(['loved', 'liked', 'ok', 'disliked', 'failed']).optional().nullable(),
    rating: z.number().int().min(1).max(5).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    would_cook_again: z.boolean().optional().nullable(),
    substitutions: z.array(z.unknown()).optional(),
    adjustments: z.record(z.string(), z.unknown()).optional(),
    created_from_message_id: z.string().uuid().optional().nullable(),
  });

  router.get('/cooking-journal', async (req: Request, res: Response) => {
    try {
      const query = ListCookingJournalQuerySchema.parse(req.query);
      const result = await cookingJournal.list(req.user.id, query);
      return ok(res, result, 'OK', 'COOKING_JOURNAL_LIST');
    } catch (err) {
      if (err instanceof CookingJournalServiceError) return fail(res, err.message, 500, err.code);
      if (err instanceof z.ZodError) return fail(res, err.issues, 400, 'VALIDATION');
      return fail(res, (err as Error).message ?? 'Internal error', 500, 'INTERNAL');
    }
  });

  router.post('/cooking-journal', async (req: Request, res: Response) => {
    try {
      const body = PostCookingJournalSchema.parse(req.body ?? {});
      const entry = await cookingJournal.record(req.user.id, {
        recipe_id: body.recipe_id ?? null,
        recipe_title: body.recipe_title,
        outcome: body.outcome ?? null,
        rating: body.rating ?? null,
        notes: body.notes ?? null,
        substitutions: body.substitutions,
        adjustments: body.adjustments,
        would_cook_again: body.would_cook_again ?? null,
        created_from_message_id: body.created_from_message_id ?? null,
      });
      return ok(res, { entry }, 'Recorded', 'COOKING_JOURNAL_RECORDED', 201);
    } catch (err) {
      if (err instanceof CookingJournalServiceError) return fail(res, err.message, 500, err.code);
      if (err instanceof z.ZodError) return fail(res, err.issues, 400, 'VALIDATION');
      return fail(res, (err as Error).message ?? 'Internal error', 500, 'INTERNAL');
    }
  });

  return router;
}
