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

import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { ok, fail } from '../utils/responses.js';
import { MemoryService, MemoryServiceError } from '../services/assistant/MemoryService.js';
import type { Database } from '../types/supabase.js';
import {
  CreateConversationSchema,
  CreateMemorySchema,
  ListConversationsQuerySchema,
  ListMemoriesQuerySchema,
  ListMessagesQuerySchema,
  PatchMemorySchema,
} from '../services/assistant/schemas/memory.js';

function mapMemoryError(res: Response, err: MemoryServiceError): Response {
  const status = (
    {
      NOT_FOUND: 404,
      FORBIDDEN: 403,
      QUOTA_EXCEEDED: 409,
      HEALTH_SENSITIVE_REQUIRES_CONFIRMATION: 409,
      DB_ERROR: 500,
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

  router.post('/memories', async (req: Request, res: Response) => {
    try {
      const body = CreateMemorySchema.parse(req.body ?? {});
      const memory = await service.createMemory(req.user.id, {
        kind: body.kind,
        content: body.content,
        normalized_content: body.normalized_content,
        scope: body.scope,
        sensitivity: body.sensitivity,
        source: body.source ?? 'user_explicit',
        subject_type: body.subject_type ?? null,
        subject_id: body.subject_id ?? null,
        confidence: body.confidence,
        evidence: body.evidence,
      });
      return ok(res, { memory }, 'Created', 'ASSISTANT_MEMORY_CREATED', 201);
    } catch (err) {
      if (err instanceof MemoryServiceError) return mapMemoryError(res, err);
      if (err instanceof z.ZodError) return fail(res, err.issues, 400, 'VALIDATION');
      return fail(res, (err as Error).message ?? 'Internal error', 500, 'INTERNAL');
    }
  });

  router.patch('/memories/:id', async (req: Request, res: Response) => {
    try {
      const { id } = UuidParamsSchema.parse(req.params);
      const body = PatchMemorySchema.parse(req.body ?? {});
      const memory = await service.patchMemory(id, req.user.id, body);
      return ok(res, { memory }, 'Updated', 'ASSISTANT_MEMORY_UPDATED');
    } catch (err) {
      if (err instanceof MemoryServiceError) return mapMemoryError(res, err);
      if (err instanceof z.ZodError) return fail(res, err.issues, 400, 'VALIDATION');
      return fail(res, (err as Error).message ?? 'Internal error', 500, 'INTERNAL');
    }
  });

  router.post('/memories/:id/forget', async (req: Request, res: Response) => {
    try {
      const { id } = UuidParamsSchema.parse(req.params);
      const memory = await service.forgetMemory(id, req.user.id);
      return ok(res, { memory }, 'Forgotten', 'ASSISTANT_MEMORY_FORGOTTEN');
    } catch (err) {
      if (err instanceof MemoryServiceError) return mapMemoryError(res, err);
      if (err instanceof z.ZodError) return fail(res, err.issues, 400, 'VALIDATION');
      return fail(res, (err as Error).message ?? 'Internal error', 500, 'INTERNAL');
    }
  });

  router.post('/memories/:id/promote', async (req: Request, res: Response) => {
    try {
      const { id } = UuidParamsSchema.parse(req.params);
      const memory = await service.promoteCandidate(id, req.user.id);
      return ok(res, { memory }, 'Promoted', 'ASSISTANT_MEMORY_PROMOTED');
    } catch (err) {
      if (err instanceof MemoryServiceError) return mapMemoryError(res, err);
      if (err instanceof z.ZodError) return fail(res, err.issues, 400, 'VALIDATION');
      return fail(res, (err as Error).message ?? 'Internal error', 500, 'INTERNAL');
    }
  });

  return router;
}
