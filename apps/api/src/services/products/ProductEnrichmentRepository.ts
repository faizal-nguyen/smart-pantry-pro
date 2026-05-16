/**
 * PRP-225 PR2 — Product Enrichment Repository.
 *
 * Thin data-access layer wrapping Supabase for the three new tables
 * introduced in PR1 :
 *   - `product_enrichment_cache`   (durable cache of OFF responses)
 *   - `product_aliases`            (user/assistant labels → products)
 *   - `product_resolution_events`  (audit log of every resolution)
 *
 * Also handles writing back the enrichment payload onto `products`
 * (brand, nutrition_json, allergens_json, off_*, enrichment_*).
 *
 * Uses a **service-role** Supabase client because :
 *   - `product_enrichment_cache` has RLS enabled with no policies →
 *     anonymous + authenticated reads/writes are blocked by design.
 *   - `product_resolution_events` insert path is server-side only.
 *   - `products` updates need to bypass RLS to fold in OFF metadata.
 *
 * No business logic — that lives in `ProductIntelligenceService` (PR3).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase.js';
import type {
  AliasSource,
  EnrichmentSource,
  ExternalProductCandidate,
  ProductAliasInsert,
  ProductAliasRow,
  ProductEnrichmentCacheInsert,
  ProductEnrichmentCacheRow,
  ProductResolutionEventInsert,
  ProductRow,
  ResolveMethod,
} from './productTypes.js';

export type SupabaseAdmin = SupabaseClient<Database>;

// ---- Cache TTLs (PRP-225 §9.2) -------------------------------------

export const CACHE_TTL_MS = {
  barcodeHit: 30 * 24 * 60 * 60 * 1000, // 30 days
  barcodeMiss: 24 * 60 * 60 * 1000, // 24 h
  searchHit: 7 * 24 * 60 * 60 * 1000, // 7 days
  searchAmbiguous: 24 * 60 * 60 * 1000, // 24 h
  error: 30 * 60 * 1000, // 30 minutes
  rateLimited: 15 * 60 * 1000, // 15 minutes
} as const;

export type CacheStatus = ProductEnrichmentCacheRow['status'];

export interface ReadCacheResult {
  hit: ProductEnrichmentCacheRow | null;
  expired: boolean;
}

export class ProductEnrichmentRepository {
  constructor(private readonly admin: SupabaseAdmin, private readonly now: () => Date = () => new Date()) {}

  // ---- Cache ------------------------------------------------------

  /**
   * Lookup a cache entry by key. Returns `{ hit: null, expired: false }`
   * when no entry exists ; `{ hit: row, expired: true }` when an entry
   * exists but has passed its TTL — callers may still use it as a
   * negative-cache breaker or refetch.
   */
  async readCache(cacheKey: string): Promise<ReadCacheResult> {
    const { data, error } = await this.admin
      .from('product_enrichment_cache')
      .select('*')
      .eq('provider', 'openfoodfacts')
      .eq('cache_key', cacheKey)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { hit: null, expired: false };
    const expired = new Date(data.expires_at).getTime() < this.now().getTime();
    return { hit: data, expired };
  }

  /**
   * Upsert a cache entry. `cache_key` is unique per provider — the
   * SQL UNIQUE(provider, cache_key) constraint makes this idempotent
   * even under concurrent writes.
   */
  async writeCache(payload: {
    cacheKey: string;
    query?: string | null;
    response: unknown;
    status: CacheStatus;
    httpStatus?: number | null;
    errorCode?: string | null;
    ttlMs: number;
  }): Promise<ProductEnrichmentCacheRow> {
    const expiresAt = new Date(this.now().getTime() + payload.ttlMs).toISOString();
    const insert: ProductEnrichmentCacheInsert = {
      provider: 'openfoodfacts',
      cache_key: payload.cacheKey,
      query: payload.query ?? null,
      response_json: (payload.response ?? {}) as ProductEnrichmentCacheInsert['response_json'],
      status: payload.status,
      http_status: payload.httpStatus ?? null,
      error_code: payload.errorCode ?? null,
      expires_at: expiresAt,
    };
    const { data, error } = await this.admin
      .from('product_enrichment_cache')
      .upsert(insert, { onConflict: 'provider,cache_key' })
      .select('*')
      .single();
    if (error || !data) throw error ?? new Error('cache upsert returned no row');
    return data;
  }

  /**
   * Bulk delete of expired entries. Wired to a cron in V2 ; called from
   * tests today.
   */
  async purgeExpired(): Promise<number> {
    const cutoff = this.now().toISOString();
    const { data, error } = await this.admin
      .from('product_enrichment_cache')
      .delete()
      .lt('expires_at', cutoff)
      .select('id');
    if (error) throw error;
    return (data ?? []).length;
  }

  // ---- Aliases ----------------------------------------------------

  async findAliasMatches(normalizedAlias: string, limit = 10): Promise<ProductAliasRow[]> {
    const { data, error } = await this.admin
      .from('product_aliases')
      .select('*')
      .eq('normalized_alias', normalizedAlias)
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  }

  /**
   * Add an alias for a known product. Idempotent through the
   * UNIQUE(product_id, normalized_alias) constraint — duplicates are
   * silently skipped via `onConflict: 'ignore'` semantics.
   */
  async upsertAlias(opts: {
    productId: string;
    alias: string;
    normalizedAlias: string;
    source: AliasSource;
    createdBy?: string | null;
  }): Promise<ProductAliasRow | null> {
    const insert: ProductAliasInsert = {
      product_id: opts.productId,
      alias: opts.alias,
      normalized_alias: opts.normalizedAlias,
      source: opts.source,
      created_by: opts.createdBy ?? null,
    };
    const { data, error } = await this.admin
      .from('product_aliases')
      .upsert(insert, { onConflict: 'product_id,normalized_alias', ignoreDuplicates: true })
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  }

  // ---- Resolution events ------------------------------------------

  async recordResolutionEvent(opts: {
    userId: string;
    rawInput: string;
    barcode?: string | null;
    resolvedProductId?: string | null;
    method: ResolveMethod;
    confidence: number;
    candidates?: unknown[];
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const insert: ProductResolutionEventInsert = {
      user_id: opts.userId,
      raw_input: opts.rawInput,
      barcode: opts.barcode ?? null,
      resolved_product_id: opts.resolvedProductId ?? null,
      method: opts.method,
      confidence: clampConfidence(opts.confidence),
      candidates: (opts.candidates ?? []) as ProductResolutionEventInsert['candidates'],
      metadata: (opts.metadata ?? {}) as ProductResolutionEventInsert['metadata'],
    };
    const { error } = await this.admin
      .from('product_resolution_events')
      .insert(insert);
    if (error) throw error;
  }

  // ---- Product enrichment write-back ------------------------------

  /**
   * Fold an OFF candidate into a `products` row. Only fields the
   * caller actually has are touched — keep `brand` if OFF didn't ship
   * one, etc. Returns the updated row.
   */
  async applyEnrichment(opts: {
    productId: string;
    candidate: ExternalProductCandidate;
    enrichmentSource?: EnrichmentSource;
  }): Promise<ProductRow> {
    const c = opts.candidate;
    const update: Database['public']['Tables']['products']['Update'] = {
      enrichment_status: 'enriched',
      enrichment_source: opts.enrichmentSource ?? 'openfoodfacts',
      enrichment_confidence: clampConfidence(c.confidence),
      off_product_code: c.externalCode,
      off_last_synced_at: this.now().toISOString(),
      off_raw_updated_at: c.rawLastModifiedAt ?? null,
    };
    if (c.brand) update.brand = c.brand;
    if (c.quantityLabel) update.quantity_label = c.quantityLabel;
    if (c.ingredientsText) update.ingredients_text = c.ingredientsText;
    if (c.imageUrl) update.image_url = c.imageUrl;
    if (c.nutrition) {
      // Cast via unknown : the envelope shape is JSON-compatible by
      // construction (no functions / undefined / circular refs) but
      // TypeScript can't prove it against the Json union.
      update.nutrition_json = c.nutrition as unknown as Database['public']['Tables']['products']['Update']['nutrition_json'];
    }
    if (c.allergens) {
      update.allergens_json = c.allergens as unknown as Database['public']['Tables']['products']['Update']['allergens_json'];
    }
    const { data, error } = await this.admin
      .from('products')
      .update(update)
      .eq('id', opts.productId)
      .select('*')
      .single();
    if (error || !data) throw error ?? new Error('product update returned no row');
    return data;
  }

  /**
   * Flip a product into the `failed` enrichment state when OFF returned
   * nothing or returned an unparseable payload. Used by the
   * IntelligenceService to avoid retrying every minute.
   */
  async markEnrichmentFailed(productId: string, reason: string): Promise<void> {
    const { error } = await this.admin
      .from('products')
      .update({
        enrichment_status: 'failed',
        enrichment_source: 'openfoodfacts',
        enrichment_confidence: 0,
        off_last_synced_at: this.now().toISOString(),
      })
      .eq('id', productId);
    if (error) throw error;
    // Reason is best-effort logged at the service layer ; not persisted
    // in V1 to avoid bloating the schema. PRP §13 PR3 may add a
    // dedicated column if we end up needing the history.
    void reason;
  }
}

// ---- Helpers --------------------------------------------------------

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
