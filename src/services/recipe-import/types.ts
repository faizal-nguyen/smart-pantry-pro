/**
 * Client-side TypeScript types matching the social-recipe-imports REST
 * API (apps/api/src/routes/imports.social.ts, PRP-220.10 / 220.11).
 *
 * These mirror the SQL schema (PRP-220.09) and the canonical DTO
 * (PRP-220.06) — kept here as plain TypeScript to avoid pulling Zod
 * into the client bundle just for type inference.
 */
import type { ImportedRecipeDraft } from '@smart/shared';

export type ImportStatus =
  | 'captured'
  | 'metadata_ready'
  | 'extracting'
  | 'draft_ready'
  | 'needs_review'
  | 'saved'
  | 'failed'
  | 'archived';

export type SocialPlatform =
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'pinterest'
  | 'web'
  | 'manual'
  | 'unknown';

export interface SocialImport {
  id: string;
  user_id: string;
  platform: SocialPlatform;
  source_url: string;
  canonical_url: string | null;
  source_hash: string;
  status: ImportStatus;
  title: string | null;
  author_name: string | null;
  author_handle: string | null;
  thumbnail_url: string | null;
  /**
   * PRP-220.24 §5.16: signed URL pointing to the OG thumbnail we
   * snapshotted to our own Supabase Storage bucket at extract time.
   * Use this in priority — `thumbnail_url` is the volatile remote CDN
   * URL kept around for traceability and as a degraded fallback.
   * Server-injected; absent on rows that have no snapshot yet.
   */
  display_thumbnail_url?: string | null;
  metadata: Record<string, unknown>;
  error_code: string | null;
  error_message: string | null;
  confidence: number | null;
  recipe_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportedRecipeDraftRow {
  id: string;
  import_id: string;
  user_id: string;
  draft_json: ImportedRecipeDraft;
  version: number;
  is_current: boolean;
  source_extraction_method: string | null;
  ai_model: string | null;
  ai_input_tokens: number | null;
  ai_output_tokens: number | null;
  cost_usd_estimate: number | null;
  created_at: string;
}

// === Requests =========================================================

export interface ListImportsQuery {
  status?: ImportStatus;
  platform?: SocialPlatform;
  search?: string;
  cursor?: string;
  limit?: number;
}

export interface PatchImportFields {
  status?: 'archived' | 'captured';
  title?: string;
  author_name?: string;
}

export interface ExtractRequest {
  hint?: string;
  force?: boolean;
}

export interface SaveRequest {
  draft?: ImportedRecipeDraft;
  collections?: string[];
  personal_notes?: string;
}

// === Responses ========================================================

export interface CaptureResponse {
  import: SocialImport;
  duplicate: boolean;
}

export interface BulkCaptureItem {
  url: string;
  result?: CaptureResponse;
  error?: { code: string; message: string };
}

export interface BulkCaptureResponse {
  results: BulkCaptureItem[];
}

export interface ListResponse {
  items: SocialImport[];
  nextCursor: string | null;
}

export interface ExtractResponse {
  import: SocialImport;
  draft: ImportedRecipeDraftRow;
  modelUsed?: string;
  durationMs?: number;
  cost?: { inputTokens: number; outputTokens: number; usd: number };
}

export interface SaveResponse {
  import: SocialImport;
  recipe_id: string;
}

export interface CurrentDraftResponse {
  import: SocialImport;
  /** null when no extraction has run yet for this import. */
  draft: ImportedRecipeDraftRow | null;
}

/** PRP-220.19: aggregated counts + quota info for the inbox. */
export interface CountsResponse {
  total: number;
  active: number;
  byPlatform: Record<string, number>;
  byStatus: Record<string, number>;
  quota: {
    tier: 'free' | 'premium';
    /** null = unlimited (premium). */
    limit: number | null;
    /** null = unlimited (premium). */
    remaining: number | null;
  };
}
