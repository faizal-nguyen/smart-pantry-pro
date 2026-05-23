/**
 * Canonical DTO for any "imported recipe draft" inside Smart Pantry Pro.
 *
 * Source of truth shared between the web client (Vite) and the API
 * server (apps/api). Use this single shape everywhere a recipe arrives
 * from outside the app — Instagram, TikTok, YouTube, Pinterest, web
 * scraping, OCR, voice dictation, or manual entry — so that downstream
 * consumers (modal editor, persistence, save-to-recipes pipeline, etc.)
 * never have to deal with a per-source variant.
 *
 * Reference: PRP-220.06.
 */
import { z } from 'zod';

// === Platform & extraction provenance =================================

export const SocialPlatformSchema = z.enum([
  'instagram',
  'tiktok',
  'youtube',
  'pinterest',
  'web',
  'manual',
  'unknown',
]);
export type SocialPlatform = z.infer<typeof SocialPlatformSchema>;

export const ExtractionMethodSchema = z.enum([
  'oembed',
  'metadata',
  'transcript',
  'manual_text',
  'screenshot_ocr',
  'voice_dictation',
  'ai_inference',
  // PRP-240 V2 — true multimodal (audio + visual + on-screen text)
  // video analysis. Distinct from `ai_inference`, which is reserved
  // for metadata/caption inference that did not inspect the video.
  'video_multimodal',
]);
export type ExtractionMethod = z.infer<typeof ExtractionMethodSchema>;

// PRP-240 §9.4 — machine-readable warning codes. Stored under
// `source_metadata.video.warning_codes` so the UI can branch on a
// stable enum instead of string-matching prose in `extractionWarnings`.
export const ExtractionWarningCodeSchema = z.enum([
  'not_a_recipe',
  'download_metadata_only',
  'schema_partial',
  'missing_quantities',
  'cost_cap_exceeded',
  'policy_rewritten',
  'low_confidence',
  'frame_persistence_blocked',
]);
export type ExtractionWarningCode = z.infer<typeof ExtractionWarningCodeSchema>;

// === Source snapshot (what the recipe came from) ======================

export const RecipeSourceSnapshotSchema = z.object({
  platform: SocialPlatformSchema,
  sourceUrl: z.string().url().optional(),
  /** URL after normalisation (lowercase host, no query, no fragment). Used for dedup. */
  canonicalUrl: z.string().url().optional(),
  authorName: z.string().max(200).optional(),
  authorHandle: z.string().max(100).optional(),
  authorUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  /** Title as it appeared in the source (before AI clean-up). */
  originalTitle: z.string().max(500).optional(),
  /** Caption / description as it appeared in the source. */
  originalDescription: z.string().max(5000).optional(),
  /** ISO 8601 timestamp of when the import was captured. */
  importedAt: z.string().datetime(),
  extractionMethod: ExtractionMethodSchema,
});
export type RecipeSourceSnapshot = z.infer<typeof RecipeSourceSnapshotSchema>;

// === Ingredient ========================================================

export const ImportedIngredientSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().nonnegative().optional(),
  unit: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
  /** Whether the recipe is materially broken without this ingredient. */
  isEssential: z.boolean().optional(),
  /** Original line as written in the source (before parsing). */
  rawText: z.string().max(500).optional(),
});
export type ImportedIngredient = z.infer<typeof ImportedIngredientSchema>;

// === Instruction =======================================================

export const ImportedInstructionSchema = z.object({
  step: z.number().int().min(1),
  description: z.string().min(1).max(2000),
  durationSeconds: z.number().int().nonnegative().optional(),
  rawText: z.string().max(2000).optional(),
});
export type ImportedInstruction = z.infer<typeof ImportedInstructionSchema>;

// === Draft (the canonical aggregate) ==================================

export const ImportedRecipeDraftSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(3000).optional(),
  ingredients: z.array(ImportedIngredientSchema).max(100),
  instructions: z.array(ImportedInstructionSchema).max(100),
  prepTimeMinutes: z.number().int().nonnegative().max(1440).optional(),
  cookTimeMinutes: z.number().int().nonnegative().max(1440).optional(),
  restTimeMinutes: z.number().int().nonnegative().max(1440).optional(),
  servings: z.number().int().min(1).max(50).optional(),
  difficulty: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
    .optional(),
  cuisineCategory: z.string().max(100).optional(),
  mealType: z.string().max(100).optional(),
  tags: z.array(z.string().max(60)).max(20).default([]),
  imageUrl: z.string().url().optional(),
  source: RecipeSourceSnapshotSchema,
  /** AI/heuristic confidence in this draft, 0..1. */
  confidence: z.number().min(0).max(1),
  /** Human-readable warnings to surface in the editor (e.g. "no quantities detected"). */
  extractionWarnings: z.array(z.string().max(500)).default([]),
});
export type ImportedRecipeDraft = z.infer<typeof ImportedRecipeDraftSchema>;

// === Validation helpers ===============================================

/**
 * Thrown when an `ImportedRecipeDraft` candidate fails Zod validation.
 * Carries the underlying issues so callers can map them to UI feedback.
 */
export class ImportedRecipeValidationError extends Error {
  readonly issues: z.ZodIssue[];

  constructor(issues: z.ZodIssue[]) {
    super(
      `Invalid ImportedRecipeDraft: ` +
        issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')
    );
    this.name = 'ImportedRecipeValidationError';
    this.issues = issues;
  }
}

/**
 * Parse strictly. Throws `ImportedRecipeValidationError` on failure.
 * Use at trust boundaries (API request body, AI response, DB read).
 */
export function parseImportedRecipeDraft(input: unknown): ImportedRecipeDraft {
  const result = ImportedRecipeDraftSchema.safeParse(input);
  if (!result.success) throw new ImportedRecipeValidationError(result.error.issues);
  return result.data;
}

/** Discriminated-union parse for callers that prefer to branch. */
export function safeParseImportedRecipeDraft(
  input: unknown
):
  | { success: true; data: ImportedRecipeDraft }
  | { success: false; issues: z.ZodIssue[] } {
  const r = ImportedRecipeDraftSchema.safeParse(input);
  return r.success ? { success: true, data: r.data } : { success: false, issues: r.error.issues };
}
