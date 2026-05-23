/**
 * PRP-240 V2 — Social Video Recipe Import contracts.
 *
 * Pure types + Zod schemas shared between the API server, the video
 * worker, and (where useful) the web client. No runtime logic lives
 * here — that ships incrementally in PR2 (downloader), PR3 (Gemini
 * provider) and PR4 (orchestrator wiring).
 *
 * PR1 only lands these contracts so later PRs can be implemented and
 * unit-tested without churn on shape.
 */
import { z } from 'zod';
import { ExtractionWarningCodeSchema } from './recipe-import.js';

// === Acquisition (PR2) ===============================================

/**
 * Method used to obtain the local video file or a remote signed URL.
 * `user_upload` only appears on success paths — failures come from a
 * downloader that tried URL acquisition (cf. downloader cascade in
 * PRP §6.1).
 */
export const VideoAcquisitionMethodSchema = z.enum([
  'yt_dlp',
  'gallery_dl',
  'commercial_api',
  'user_upload',
]);
export type VideoAcquisitionMethod = z.infer<typeof VideoAcquisitionMethodSchema>;

/**
 * Downloader-only subset — used in failure payloads where
 * `user_upload` is not a possible source.
 */
export const VideoDownloaderMethodSchema = z.enum([
  'yt_dlp',
  'gallery_dl',
  'commercial_api',
]);
export type VideoDownloaderMethod = z.infer<typeof VideoDownloaderMethodSchema>;

/**
 * How the underlying media reached the bucket — drives
 * `MediaRightsPolicy.canPersistMedia()` in PR3.5.
 */
export const VideoMediaOriginSchema = z.enum([
  'permitted_download',
  'user_upload',
  'personal_archive_upload',
]);
export type VideoMediaOrigin = z.infer<typeof VideoMediaOriginSchema>;

/**
 * Stable error taxonomy emitted by every failed acquisition attempt.
 * UI maps these to messages and retry affordances in PR5.
 */
export const VideoAcquisitionErrorCodeSchema = z.enum([
  'UNSUPPORTED_URL',
  'AUTH_REQUIRED',
  'GEO_BLOCKED',
  'PRIVATE_OR_REMOVED',
  'DOWNLOAD_FAILED',
  'TOO_LONG',
  'TOO_LARGE',
  'RATE_LIMITED',
]);
export type VideoAcquisitionErrorCode = z.infer<typeof VideoAcquisitionErrorCodeSchema>;

export const VideoAcquisitionSuccessSchema = z.object({
  ok: z.literal(true),
  method: VideoAcquisitionMethodSchema,
  mediaOrigin: VideoMediaOriginSchema,
  /** Local FS path when the worker downloaded/received the file. */
  localPath: z.string().optional(),
  /** Storage key inside `recipe-import-media` when the file lives in the bucket. */
  storagePath: z.string().optional(),
  mimeType: z.string(),
  durationSeconds: z.number().nonnegative().optional(),
  sizeBytes: z.number().nonnegative().optional(),
  thumbnailUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const VideoAcquisitionFailureSchema = z.object({
  ok: z.literal(false),
  method: VideoDownloaderMethodSchema,
  errorCode: VideoAcquisitionErrorCodeSchema,
  message: z.string(),
  retryable: z.boolean(),
});

export const VideoAcquisitionResultSchema = z.discriminatedUnion('ok', [
  VideoAcquisitionSuccessSchema,
  VideoAcquisitionFailureSchema,
]);
export type VideoAcquisitionResult = z.infer<typeof VideoAcquisitionResultSchema>;

// === Understanding (PR3) =============================================

/** Minimum metadata the understanding provider needs alongside the video. */
export const SocialVideoMetadataSchema = z.object({
  platform: z.string(),
  sourceUrl: z.string().url().optional(),
  authorName: z.string().optional(),
  caption: z.string().optional(),
  durationSeconds: z.number().nonnegative().optional(),
});
export type SocialVideoMetadata = z.infer<typeof SocialVideoMetadataSchema>;

export const VideoUnderstandingProviderIdSchema = z.enum([
  'gemini',
  'openai_fallback',
]);
export type VideoUnderstandingProviderId = z.infer<typeof VideoUnderstandingProviderIdSchema>;

/**
 * Raw provider output. Close to `ImportedRecipeDraft` but NOT
 * validated against it — `RecipeDraftComposer` (PR3) is the only path
 * that turns this into a canonical draft via
 * `ImportedRecipeDraftSchema`.
 */
export const VideoUnderstandingResultSchema = z.object({
  isRecipe: z.boolean(),
  title: z.string().optional(),
  description: z.string().optional(),
  ingredients: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.number().optional(),
        unit: z.string().optional(),
        notes: z.string().optional(),
        isEssential: z.boolean().optional(),
        rawText: z.string().optional(),
      }),
    )
    .default([]),
  instructions: z
    .array(
      z.object({
        step: z.number().int().min(1),
        description: z.string(),
        durationSeconds: z.number().int().nonnegative().optional(),
        rawText: z.string().optional(),
      }),
    )
    .default([]),
  prepTimeMinutes: z.number().int().nonnegative().optional(),
  cookTimeMinutes: z.number().int().nonnegative().optional(),
  restTimeMinutes: z.number().int().nonnegative().optional(),
  servings: z.number().int().min(1).optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  cuisineCategory: z.string().optional(),
  mealType: z.string().optional(),
  tags: z.array(z.string()).default([]),
  /** Timestamp the worker should seek for the recipe image (PR3.5). Format: "MM:SS" or "HH:MM:SS". */
  suggestedImageTimestamp: z.string().optional(),
  confidence: z.object({
    overall: z.number().min(0).max(1),
    ingredients: z.number().min(0).max(1).optional(),
    instructions: z.number().min(0).max(1).optional(),
    timings: z.number().min(0).max(1).optional(),
  }),
  /** Human-readable warnings — surface to the user as-is. */
  warnings: z.array(z.string()).default([]),
  /** Machine-readable warning codes — UI branches on these, not on prose. */
  warningCodes: z.array(ExtractionWarningCodeSchema).default([]),
  evidence: z.object({
    audioUsed: z.boolean().default(false),
    visualUsed: z.boolean().default(false),
    onscreenTextUsed: z.boolean().default(false),
    captionUsed: z.boolean().default(false),
  }),
});
export type VideoUnderstandingResult = z.infer<typeof VideoUnderstandingResultSchema>;

export interface VideoUnderstandingProviderInput {
  videoUri: string;
  mimeType: string;
  metadata: SocialVideoMetadata;
  promptVersion: string;
  fps?: number;
  clip?: { startSeconds: number; endSeconds: number };
}

export interface VideoUnderstandingProvider {
  readonly id: VideoUnderstandingProviderId;
  analyze(input: VideoUnderstandingProviderInput): Promise<VideoUnderstandingResult>;
}

// === Orchestrator (PR4) ==============================================

export interface SocialVideoImportOrchestrator {
  /** Run extraction for an import. Idempotent on (importId, revision). */
  extract(input: { importId: string; userId: string; force?: boolean }): Promise<void>;

  /** Called by `/video-uploaded` after the browser finishes signed-URL upload. */
  handleUploadedVideo(input: {
    importId: string;
    userId: string;
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
    mediaOrigin: VideoMediaOrigin;
  }): Promise<void>;
}

// === Job row mirror (matches social_video_import_jobs) ===============

/**
 * Worker-facing status values. The end-user import row uses
 * `social_recipe_imports.status` (broader lifecycle); the job row
 * carries the worker's own state machine.
 */
export const SocialVideoImportJobStatusSchema = z.enum([
  'queued',
  'downloading',
  'needs_upload',
  'analyzing',
  'draft_ready',
  'failed',
  'cancelled',
]);
export type SocialVideoImportJobStatus = z.infer<typeof SocialVideoImportJobStatusSchema>;
