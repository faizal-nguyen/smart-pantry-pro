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
