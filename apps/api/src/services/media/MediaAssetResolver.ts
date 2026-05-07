/**
 * PRP-220.24 §5.16 — bridge from `media_assets` to consumer-facing
 * imports/recipes.
 *
 * Given a list of import IDs (or recipe IDs in the future), this
 * resolver returns the best display-time URL for each one so the
 * client can render the persistent Supabase-stored thumbnail in
 * priority over the volatile remote CDN URL on
 * `social_recipe_imports.thumbnail_url`.
 *
 * Strategy:
 *   1. RLS-bound SELECT on `media_assets` for the requested IDs
 *      (`kind = 'thumbnail'`, `deleted_at IS NULL`).
 *   2. Pick the most recent thumbnail per import.
 *   3. For private storage (V1), batch-mint signed URLs via the admin
 *      client. Signed-URL TTL is short enough to avoid log scraping
 *      but long enough that the browser can cache one list-page worth
 *      of cards.
 *   4. Return `Map<importId, { url, mediaAssetId, mimeType, kind }>`.
 *
 * Failure mode: if Supabase Storage is unreachable, return an empty
 * map. The caller falls back to the remote URL on the import row.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '../../lib/logger.js';

const DEFAULT_SIGNED_URL_TTL_SECONDS = 3600;

export interface ResolvedThumbnail {
  importId: string;
  mediaAssetId: string;
  url: string;
  mimeType: string | null;
  storageBucket: string;
  storageKey: string;
  origin: string;
}

interface ThumbnailRow {
  id: string;
  import_id: string | null;
  origin: string;
  mime_type: string | null;
  storage_bucket: string | null;
  storage_key: string | null;
  public_url: string | null;
  created_at: string;
}

export class MediaAssetResolver {
  constructor(
    private readonly userClient: SupabaseClient<any, any, any>,
    private readonly adminClient: SupabaseClient<any, any, any>,
    private readonly signedUrlTtlSeconds = DEFAULT_SIGNED_URL_TTL_SECONDS
  ) {}

  /**
   * Resolve the thumbnail asset attached to each import id. The map
   * only contains entries for imports that actually have a stored
   * thumbnail; callers MUST treat a missing key as "no snapshot, use
   * remote URL".
   */
  async resolveThumbnailsByImport(
    importIds: readonly string[]
  ): Promise<Map<string, ResolvedThumbnail>> {
    const out = new Map<string, ResolvedThumbnail>();
    if (importIds.length === 0) return out;

    const uniqueIds = Array.from(new Set(importIds));

    const { data, error } = await this.userClient
      .from('media_assets')
      .select(
        'id, import_id, origin, mime_type, storage_bucket, storage_key, public_url, created_at'
      )
      .in('import_id', uniqueIds)
      .eq('kind', 'thumbnail')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      logger.warn(
        { reason: 'media_assets_query_failed', err: error.message },
        'media-asset-resolver query'
      );
      return out;
    }

    // Pick the latest thumbnail per import (rows are already ordered
    // desc by created_at, so the first occurrence wins).
    const byImport = new Map<string, ThumbnailRow>();
    for (const row of (data ?? []) as ThumbnailRow[]) {
      if (!row.import_id) continue;
      if (byImport.has(row.import_id)) continue;
      byImport.set(row.import_id, row);
    }
    if (byImport.size === 0) return out;

    // Group by bucket (different rows could in theory live in
    // different buckets if config has changed over time).
    const byBucket = new Map<string, ThumbnailRow[]>();
    for (const row of byImport.values()) {
      if (!row.storage_bucket || !row.storage_key) {
        // Unstored asset (shouldn't happen for thumbnail_snapshot but
        // be defensive).
        if (row.public_url && row.import_id) {
          out.set(row.import_id, {
            importId: row.import_id,
            mediaAssetId: row.id,
            url: row.public_url,
            mimeType: row.mime_type,
            storageBucket: '',
            storageKey: '',
            origin: row.origin,
          });
        }
        continue;
      }
      const bucket = row.storage_bucket;
      const list = byBucket.get(bucket);
      if (list) list.push(row);
      else byBucket.set(bucket, [row]);
    }

    for (const [bucket, rows] of byBucket) {
      const paths = rows.map((r) => r.storage_key as string);
      const { data: signed, error: signErr } = await this.adminClient.storage
        .from(bucket)
        .createSignedUrls(paths, this.signedUrlTtlSeconds);

      if (signErr) {
        logger.warn(
          { reason: 'signed_url_batch_failed', bucket, err: signErr.message },
          'media-asset-resolver signing'
        );
        continue;
      }

      const urlByPath = new Map<string, string>();
      for (const entry of signed ?? []) {
        if (entry?.path && entry.signedUrl) {
          urlByPath.set(entry.path, entry.signedUrl);
        }
      }

      for (const row of rows) {
        const url = urlByPath.get(row.storage_key as string);
        if (!url || !row.import_id) continue;
        out.set(row.import_id, {
          importId: row.import_id,
          mediaAssetId: row.id,
          url,
          mimeType: row.mime_type,
          storageBucket: bucket,
          storageKey: row.storage_key as string,
          origin: row.origin,
        });
      }
    }

    return out;
  }
}
