import { z } from 'zod';
import { ImportedRecipeDraftSchema } from './recipe-import.js';
import { ImportedRecipeQualitySchema } from './recipe-import-quality.js';

const id = z.string().uuid();
const date = z.string().datetime({ offset: true });
export const DiscoverySourceSchema = z.object({
  id, platform: z.enum(['instagram', 'tiktok', 'web', 'manual']), url: z.string().url(),
  accessMode: z.enum(['manual', 'written_feed']), identityStatus: z.enum(['unverified', 'verified']),
  lastSuccessAt: date.nullable(), lastError: z.string().nullable(),
});
export const DiscoveryCreatorSchema = z.object({
  id, userId: id, name: z.string().min(1).max(160), paused: z.boolean(), version: z.number().int().positive(),
  sources: z.array(DiscoverySourceSchema),
});
export const DiscoveryItemSchema = z.object({
  id, userId: id, creatorId: id, sourceUrl: z.string().url(), title: z.string().max(300),
  description: z.string().max(3000).nullable(), imageUrl: z.string().url().nullable(),
  createdAt: date, publishedAt: date.nullable(), version: z.number().int().positive(),
  status: z.enum(['new', 'kept', 'passed', 'snoozed', 'added']),
  quality: ImportedRecipeQualitySchema, draft: ImportedRecipeDraftSchema.nullable(),
  importId: id.nullable(), recipeReference: z.object({ id, source: z.literal('recipes') }).nullable(),
  snoozedUntil: date.nullable(), reasons: z.array(z.string()).default([]),
  constraints: z.enum(['unknown', 'verify', 'compatible', 'incompatible']).default('unknown'),
  lastFeedback: z.enum(['repeat', 'dislike', 'too_long']).nullable().default(null),
});
export const DiscoveryFeedSchema = z.object({
  items: z.array(DiscoveryItemSchema), savedItems: z.array(DiscoveryItemSchema),
  selectionAt: date.nullable(), mode: z.literal('manual'), limit: z.literal(5),
  errors: z.array(z.string()).default([]),
});
export const DiscoveryCreateItemSchema = z.object({
  creatorId: id, sourceUrl: z.string().url().max(2000), title: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(3000).optional(), commandId: id,
}).strict();
export const DiscoveryCreateCreatorSchema = z.object({
  name: z.string().trim().min(1).max(160), url: z.string().url().max(2000), commandId: id,
}).strict();
export const DiscoveryCreatorPatchSchema = z.object({
  paused: z.boolean(), expectedVersion: z.number().int().positive(), commandId: id,
}).strict();
export const DiscoveryDecisionSchema = z.object({
  commandId: id, expectedVersion: z.number().int().positive(), decision: z.enum(['keep', 'pass', 'not_today']),
}).strict();
export const DiscoveryFeedbackSchema = z.object({
  commandId: id, expectedVersion: z.number().int().positive(),
  feedback: z.enum(['repeat', 'dislike', 'too_long']), cooked: z.literal(true),
}).strict();
export type DiscoveryRecipeQuality = z.infer<typeof ImportedRecipeQualitySchema>;
export type DiscoverySource = z.infer<typeof DiscoverySourceSchema>;
export type DiscoveryCreator = z.infer<typeof DiscoveryCreatorSchema>;
export type DiscoveryItem = z.infer<typeof DiscoveryItemSchema>;
export type DiscoveryFeed = z.infer<typeof DiscoveryFeedSchema>;
export type DiscoveryCreateItem = z.infer<typeof DiscoveryCreateItemSchema>;
export type DiscoveryDecision = z.infer<typeof DiscoveryDecisionSchema>;
export type DiscoveryFeedback = z.infer<typeof DiscoveryFeedbackSchema>;
export interface DiscoveryStarterLink { creatorId: string; title: string; sourceUrl: string }
/** HTTP response embeds existing import/draft rows; clients validate them with the import contract. */
export interface DiscoveryPrepareImportResponse {
  item: DiscoveryItem;
  import: Record<string, unknown> & { id: string };
  draft: { id: string; user_id: string; import_id: string; version: number; draft_json: z.infer<typeof ImportedRecipeDraftSchema> };
  quality: DiscoveryRecipeQuality;
  replayed?: boolean;
}
