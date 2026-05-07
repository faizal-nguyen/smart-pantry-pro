/**
 * Data-access for `social_recipe_imports` (PRP-220.09 schema, PRP-220.10
 * REST API). Always invoked through a user-scoped Supabase client so
 * RLS enforces tenant isolation.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { ListImportsQuery } from '../../schemas/imports.js';
import { decodeCursor, encodeCursor } from '../../utils/cursor.js';

export interface SocialImportRow {
  id: string;
  user_id: string;
  platform: string;
  source_url: string;
  canonical_url: string | null;
  source_hash: string;
  status: string;
  title: string | null;
  author_name: string | null;
  author_handle: string | null;
  thumbnail_url: string | null;
  metadata: Record<string, unknown>;
  error_code: string | null;
  error_message: string | null;
  confidence: number | null;
  recipe_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InsertCapturedInput {
  userId: string;
  platform: string;
  sourceUrl: string;
  canonicalUrl: string;
  sourceHash: string;
}

export interface ListResult {
  items: SocialImportRow[];
  nextCursor: string | null;
}

export interface PatchImportFields {
  status?: 'archived' | 'captured';
  title?: string;
  author_name?: string;
}

/**
 * Fields the service may write during the extract / save flows
 * (PRP-220.11). Kept narrow on purpose so a route handler can't ship
 * arbitrary updates by accident.
 */
export interface ImportLifecycleFields {
  status?:
    | 'captured'
    | 'metadata_ready'
    | 'extracting'
    | 'draft_ready'
    | 'needs_review'
    | 'saved'
    | 'failed'
    | 'archived';
  title?: string | null;
  author_name?: string | null;
  author_handle?: string | null;
  thumbnail_url?: string | null;
  confidence?: number | null;
  error_code?: string | null;
  error_message?: string | null;
  recipe_id?: string | null;
}

export interface ImportedRecipeDraftRow {
  id: string;
  import_id: string;
  user_id: string;
  draft_json: unknown;
  version: number;
  is_current: boolean;
  source_extraction_method: string | null;
  ai_model: string | null;
  ai_input_tokens: number | null;
  ai_output_tokens: number | null;
  cost_usd_estimate: number | null;
  created_at: string;
}

export interface InsertDraftInput {
  importId: string;
  userId: string;
  draftJson: unknown;
  sourceExtractionMethod?: string;
  aiModel?: string;
  aiInputTokens?: number;
  aiOutputTokens?: number;
  costUsdEstimate?: number;
}

export class SocialImportRepository {
  constructor(private readonly client: SupabaseClient<any, any, any>) {}

  /**
   * Insert a captured row. Caller MUST handle the `23505` unique
   * violation (user_id + source_hash) by reading the existing row.
   */
  async insertCaptured(input: InsertCapturedInput): Promise<SocialImportRow> {
    const { data, error } = await this.client
      .from('social_recipe_imports')
      .insert({
        user_id: input.userId,
        platform: input.platform,
        source_url: input.sourceUrl,
        canonical_url: input.canonicalUrl,
        source_hash: input.sourceHash,
        status: 'captured',
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as SocialImportRow;
  }

  /**
   * Count "active" imports for a user — anything that isn't archived
   * or already saved into a recipe (PRP-220.19). Drives the free-tier
   * quota gate: archive or save to free up a slot.
   */
  async countActive(userId: string): Promise<number> {
    const { count, error } = await this.client
      .from('social_recipe_imports')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('status', 'in', '(archived,saved)');
    if (error) throw error;
    return count ?? 0;
  }

  /**
   * Aggregate counts grouped by platform AND status (PRP-220.19).
   * Used by the inbox sidebar / counts endpoint to avoid N round-
   * trips. Single SELECT, returned shape is denormalized so the
   * client can pivot however it likes.
   */
  async countByGroupings(userId: string): Promise<{
    total: number;
    active: number;
    byPlatform: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const { data, error } = await this.client
      .from('social_recipe_imports')
      .select('platform, status')
      .eq('user_id', userId);
    if (error) throw error;
    const rows = (data ?? []) as Array<{ platform: string; status: string }>;
    const byPlatform: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let active = 0;
    for (const r of rows) {
      byPlatform[r.platform] = (byPlatform[r.platform] ?? 0) + 1;
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      if (r.status !== 'archived' && r.status !== 'saved') active += 1;
    }
    return { total: rows.length, active, byPlatform, byStatus };
  }

  async findByHash(userId: string, hash: string): Promise<SocialImportRow | null> {
    const { data, error } = await this.client
      .from('social_recipe_imports')
      .select('*')
      .eq('user_id', userId)
      .eq('source_hash', hash)
      .maybeSingle();
    if (error) throw error;
    return (data as SocialImportRow | null) ?? null;
  }

  async findById(userId: string, id: string): Promise<SocialImportRow | null> {
    const { data, error } = await this.client
      .from('social_recipe_imports')
      .select('*')
      .eq('user_id', userId)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as SocialImportRow | null) ?? null;
  }

  async patch(
    userId: string,
    id: string,
    fields: PatchImportFields
  ): Promise<SocialImportRow | null> {
    if (Object.keys(fields).length === 0) return this.findById(userId, id);
    const { data, error } = await this.client
      .from('social_recipe_imports')
      .update(fields)
      .eq('user_id', userId)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return (data as SocialImportRow | null) ?? null;
  }

  /**
   * Atomically transition an import to the `extracting` state.
   * The conditional UPDATE acts as an advisory lock: a second concurrent
   * call returns null because the row no longer matches the WHERE clause.
   * Used by `extractImport` (PRP-220.11) to reject double-runs.
   */
  async transitionToExtracting(
    userId: string,
    importId: string
  ): Promise<SocialImportRow | null> {
    // Postgres `IN ()` with .not('status', 'in', ...) reads as
    // status NOT IN (extracting, saved, archived).
    const { data, error } = await this.client
      .from('social_recipe_imports')
      .update({ status: 'extracting', error_code: null, error_message: null })
      .eq('user_id', userId)
      .eq('id', importId)
      .not('status', 'in', '(extracting,saved,archived)')
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return (data as SocialImportRow | null) ?? null;
  }

  /**
   * Generic lifecycle update used by extract / save (PRP-220.11).
   * Returns null when the row does not exist (or RLS hides it).
   */
  async updateLifecycle(
    userId: string,
    importId: string,
    fields: ImportLifecycleFields
  ): Promise<SocialImportRow | null> {
    if (Object.keys(fields).length === 0) return this.findById(userId, importId);
    const { data, error } = await this.client
      .from('social_recipe_imports')
      .update(fields)
      .eq('user_id', userId)
      .eq('id', importId)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return (data as SocialImportRow | null) ?? null;
  }

  /**
   * Persist a new extracted draft as the current version. Two writes
   * (mark previous as not-current; insert new with version+1). Wrapped
   * in a try/catch that compensates for a partial failure by deleting
   * the just-inserted draft if the un-flag step throws — the partial
   * UNIQUE INDEX `idx_ird_one_current_per_import` keeps the invariant
   * but we still want a clean error path.
   */
  async insertNewDraft(input: InsertDraftInput): Promise<ImportedRecipeDraftRow> {
    // Compute the next version number. Best-effort race-safe: if two
    // extractions land within the same millisecond, both get the same
    // version, the partial unique index forces one of them to fail,
    // and the loser sees a 23505 - which the service surfaces as a
    // retryable error.
    const { data: existing } = await this.client
      .from('imported_recipe_drafts')
      .select('version')
      .eq('import_id', input.importId)
      .order('version', { ascending: false })
      .limit(1);
    const nextVersion = existing && existing.length > 0 ? (existing[0].version as number) + 1 : 1;

    // Mark previous current draft as not-current (best-effort: there
    // might not be one).
    const { error: clearErr } = await this.client
      .from('imported_recipe_drafts')
      .update({ is_current: false })
      .eq('import_id', input.importId)
      .eq('is_current', true);
    if (clearErr) throw clearErr;

    const { data, error } = await this.client
      .from('imported_recipe_drafts')
      .insert({
        import_id: input.importId,
        user_id: input.userId,
        draft_json: input.draftJson,
        version: nextVersion,
        is_current: true,
        source_extraction_method: input.sourceExtractionMethod ?? null,
        ai_model: input.aiModel ?? null,
        ai_input_tokens: input.aiInputTokens ?? null,
        ai_output_tokens: input.aiOutputTokens ?? null,
        cost_usd_estimate: input.costUsdEstimate ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as ImportedRecipeDraftRow;
  }

  async findCurrentDraft(importId: string): Promise<ImportedRecipeDraftRow | null> {
    const { data, error } = await this.client
      .from('imported_recipe_drafts')
      .select('*')
      .eq('import_id', importId)
      .eq('is_current', true)
      .maybeSingle();
    if (error) throw error;
    return (data as ImportedRecipeDraftRow | null) ?? null;
  }

  async list(userId: string, query: ListImportsQuery): Promise<ListResult> {
    const limit = query.limit;

    let q = this.client
      .from('social_recipe_imports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1);

    if (query.status) q = q.eq('status', query.status);
    if (query.platform) q = q.eq('platform', query.platform);
    if (query.search && query.search.trim()) {
      // ilike is implicit-prefix-with-wildcard on either side
      q = q.ilike('title', `%${query.search.trim()}%`);
    }

    if (query.cursor) {
      const c = decodeCursor(query.cursor);
      if (c) {
        // (created_at, id) < (c.ts, c.id) — Postgres tuple comparison.
        // Supabase JS doesn't expose tuple compare directly, so we OR
        // two conditions: created_at < ts OR (created_at = ts AND id < c.id).
        q = q.or(`created_at.lt.${c.ts},and(created_at.eq.${c.ts},id.lt.${c.id})`);
      }
    }

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data ?? []) as SocialImportRow[];
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? encodeCursor({ ts: last.created_at, id: last.id }) : null;

    return { items, nextCursor };
  }
}
