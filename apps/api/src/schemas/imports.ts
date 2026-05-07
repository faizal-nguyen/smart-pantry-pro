import { z } from 'zod';

/**
 * Zod schemas for the social-recipe-imports REST API (PRP-220.10).
 * The same status / platform enums are mirrored in the SQL CHECK
 * constraints (PRP-220.09) and in the canonical DTO (PRP-220.06).
 */

export const PLATFORM_VALUES = [
  'instagram',
  'tiktok',
  'youtube',
  'pinterest',
  'web',
  'manual',
  'unknown',
] as const;

export const STATUS_VALUES = [
  'captured',
  'metadata_ready',
  'extracting',
  'draft_ready',
  'needs_review',
  'saved',
  'failed',
  'archived',
] as const;

export const PlatformSchema = z.enum(PLATFORM_VALUES);
export const StatusSchema = z.enum(STATUS_VALUES);

// ---- POST /api/imports/social ----------------------------------------
export const CaptureRequestSchema = z.object({
  url: z.string().url().max(2048),
  source: z.enum(['paste', 'share_target', 'bulk', 'manual']).optional(),
});
export type CaptureRequest = z.infer<typeof CaptureRequestSchema>;

// ---- POST /api/imports/social/bulk -----------------------------------
export const BulkCaptureRequestSchema = z.object({
  urls: z.array(z.string().url().max(2048)).min(1).max(50),
});
export type BulkCaptureRequest = z.infer<typeof BulkCaptureRequestSchema>;

// ---- GET /api/imports/social ----------------------------------------
export const ListImportsQuerySchema = z.object({
  status: StatusSchema.optional(),
  platform: PlatformSchema.optional(),
  search: z.string().max(200).optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListImportsQuery = z.infer<typeof ListImportsQuerySchema>;

// ---- PATCH /api/imports/social/:id ----------------------------------
// Only safe transitions are exposed via PATCH. State transitions that
// require business logic (extracting, saved, failed, draft_ready,
// needs_review) flow through the dedicated endpoints in PRP-220.11.
export const PatchImportSchema = z
  .object({
    status: z.enum(['archived', 'captured']).optional(),
    title: z.string().max(300).optional(),
    author_name: z.string().max(200).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'PATCH body must contain at least one field',
  });
export type PatchImport = z.infer<typeof PatchImportSchema>;
