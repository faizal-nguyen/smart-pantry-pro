/**
 * PRP-223 PR2 — Zod schemas for the assistant memory CRUD API.
 *
 * Kept in a separate file from `schemas/tools.ts` to avoid bloating the
 * tool catalogue. PR5 will add the LLM tool specs (`remember_preference`,
 * `forget_memory`, ...) over there in the canonical place.
 */
import { z } from 'zod';

const ConversationModeSchema = z.enum([
  'general',
  'kitchen',
  'shopping',
  'inventory',
  'recipes',
  'nutrition',
  'cooking',
]);

const ConversationStatusSchema = z.enum(['active', 'archived', 'deleted']);

const MemoryKindSchema = z.enum([
  'preference',
  'negative_preference',
  'habit',
  'cooking_style',
  'diet_goal',
  'constraint',
  'recipe_feedback',
  'shopping_pattern',
  'response_style',
]);

const MemoryScopeSchema = z.enum([
  'global',
  'recipe',
  'ingredient',
  'product',
  'conversation',
  'temporary',
]);

const MemoryStatusSchema = z.enum(['candidate', 'active', 'rejected', 'deleted']);

const MemorySensitivitySchema = z.enum(['normal', 'personal', 'health_sensitive']);

const MemorySourceSchema = z.enum([
  'user_explicit',
  'assistant_inferred',
  'recipe_feedback',
  'imported',
  'system',
]);

// ---- Conversations --------------------------------------------------------

export const CreateConversationSchema = z.object({
  mode: ConversationModeSchema.optional(),
  title: z.string().min(1).max(200).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;

export const ListConversationsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: ConversationStatusSchema.optional(),
});
export type ListConversationsQuery = z.infer<typeof ListConversationsQuerySchema>;

// ---- Messages -------------------------------------------------------------

export const ListMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
export type ListMessagesQuery = z.infer<typeof ListMessagesQuerySchema>;

// ---- Memories -------------------------------------------------------------

export const CreateMemorySchema = z.object({
  kind: MemoryKindSchema,
  content: z.string().min(1).max(2000),
  normalized_content: z.string().min(1).max(2000).optional(),
  scope: MemoryScopeSchema.optional(),
  sensitivity: MemorySensitivitySchema.optional(),
  source: MemorySourceSchema.optional(),
  subject_type: z.string().max(120).optional().nullable(),
  subject_id: z.string().uuid().optional().nullable(),
  confidence: z.number().min(0).max(1).optional(),
  evidence: z.record(z.string(), z.unknown()).optional(),
});
export type CreateMemoryInput = z.infer<typeof CreateMemorySchema>;

export const PatchMemorySchema = z
  .object({
    status: MemoryStatusSchema.optional(),
    content: z.string().min(1).max(2000).optional(),
    normalized_content: z.string().min(1).max(2000).optional(),
    sensitivity: MemorySensitivitySchema.optional(),
  })
  .refine(value => Object.keys(value).length > 0, {
    message: 'at least one field must be provided',
  });
export type PatchMemoryInput = z.infer<typeof PatchMemorySchema>;

export const ListMemoriesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: MemoryStatusSchema.optional(),
  kind: MemoryKindSchema.optional(),
});
export type ListMemoriesQuery = z.infer<typeof ListMemoriesQuerySchema>;

// ---- PRP-224 PR1 — Conversation patch + history search ----------

export const PatchConversationSchema = z
  .object({
    title: z.string().min(1).max(200).optional().nullable(),
    mode: ConversationModeSchema.optional(),
  })
  .refine(v => Object.keys(v).length > 0, {
    message: 'at least one field must be provided',
  });
export type PatchConversationInput = z.infer<typeof PatchConversationSchema>;

export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().positive().max(50).optional(),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
