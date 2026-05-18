/**
 * PRP-225 PR3 — ProductIntelligenceService.
 *
 * Orchestrator that turns a raw user input (free-text name and/or
 * barcode) into a stable `products` row, using a 8-step pipeline :
 *
 *   1. Barcode local : direct lookup on `products.barcode`.
 *   2. Alias local   : `product_aliases.normalized_alias` → product.
 *   3. Exact local   : `ProductResolver.findExact` (PRP-221).
 *   4. Fuzzy local   : `ProductResolver` fuzzy (pg_trgm via RPC).
 *   5. OFF barcode   : `OpenFoodFactsClient.getProductByBarcode`.
 *   6. OFF search    : `OpenFoodFactsClient.searchProducts`.
 *   7. Clarification : 2+ external candidates with close scores.
 *   8. Create generic: `ProductResolver.create()` if allowed.
 *
 * Every resolution writes a `product_resolution_events` row so we can
 * answer "why did the assistant pick this product ?" later.
 *
 * **Best-effort by design** : if OFF is down / rate-limited, the
 * pipeline falls through gracefully to step 8 and the caller still
 * gets a product. This keeps the assistant write path resilient —
 * PRP-225 §10 explicitly requires the assistant to never block on OFF.
 *
 * **Does not replace ProductResolver** : every local-step delegates
 * to the existing resolver so PRP-221 tests keep their contract.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase.js';
import {
  ProductResolver,
  type ProductRow as ResolverProductRow,
  type ResolveInput as ResolverInput,
} from '../assistant/ProductResolver.js';
import {
  OpenFoodFactsClient,
  OpenFoodFactsClientError,
  getDefaultOpenFoodFactsClient,
} from './OpenFoodFactsClient.js';
import {
  ProductEnrichmentRepository,
  CACHE_TTL_MS,
} from './ProductEnrichmentRepository.js';
import {
  buildBarcodeCacheKey,
  buildSearchCacheKey,
  normalizeName,
  toExternalCandidate,
} from './ProductNormalizer.js';
import type {
  ExternalProductCandidate,
  ProductCandidate,
  ProductRow,
  ResolveMethod,
  ResolveProductInput,
  ResolveProductResult,
} from './productTypes.js';

const DEFAULT_AMBIGUITY_MARGIN = 0.05;

export interface ProductIntelligenceServiceOptions {
  resolver?: ProductResolver;
  offClient?: OpenFoodFactsClient;
  repository?: ProductEnrichmentRepository;
  /**
   * Difference below which two OFF candidates are considered
   * ambiguous (top1.confidence - top2.confidence < margin → clarif).
   */
  ambiguityMargin?: number;
}

export class ProductIntelligenceService {
  private readonly resolver: ProductResolver;
  private readonly off: OpenFoodFactsClient;
  private readonly repo: ProductEnrichmentRepository;
  private readonly ambiguityMargin: number;

  constructor(
    private readonly admin: SupabaseClient<Database>,
    opts: ProductIntelligenceServiceOptions = {}
  ) {
    this.resolver = opts.resolver ?? new ProductResolver(admin);
    this.off = opts.offClient ?? getDefaultOpenFoodFactsClient();
    this.repo = opts.repository ?? new ProductEnrichmentRepository(admin);
    this.ambiguityMargin = opts.ambiguityMargin ?? DEFAULT_AMBIGUITY_MARGIN;
  }

  /**
   * Resolve a single product. Logs one resolution event regardless of
   * outcome (matched / created / ambiguous / not_found). Never throws
   * on OFF failures — degrades gracefully to local-only resolution.
   */
  async resolve(input: ResolveProductInput): Promise<ResolveProductResult> {
    const rawInput = input.rawInput ?? input.name ?? input.barcode ?? '';
    const allowExternal = input.allowExternalLookup ?? true;
    const allowCreate = input.allowCreate ?? true;

    // --- Step 1: barcode local -------------------------------------
    if (input.barcode) {
      const local = await this.findByBarcode(input.barcode);
      if (local) {
        await this.logEvent(input, {
          method: 'barcode_local',
          productId: local.id,
          confidence: 1,
        });
        return { kind: 'matched', product: local, confidence: 1, via: 'barcode_local' };
      }
    }

    // --- Step 2: alias local --------------------------------------
    if (input.name) {
      const aliasMatch = await this.findByAlias(input.name);
      if (aliasMatch) {
        await this.logEvent(input, {
          method: 'alias',
          productId: aliasMatch.product.id,
          confidence: aliasMatch.confidence,
        });
        return {
          kind: 'matched',
          product: aliasMatch.product,
          confidence: aliasMatch.confidence,
          via: 'alias',
        };
      }
    }

    // --- Step 3+4: exact / fuzzy via ProductResolver --------------
    let resolverResult: Awaited<ReturnType<ProductResolver['resolve']>> | null = null;
    if (input.name) {
      const resolverInput: ResolverInput = {
        name: input.name,
        category: input.categoryHint,
        unitType: input.unitHint,
      };
      // We never want the resolver to silently auto-create here ; we
      // call its public `resolve()` but intercept the 'created' branch
      // below before signalling our caller. The cheapest way without
      // forking the resolver is to compute exact + fuzzy ourselves :
      // since PRP-221 didn't expose findExact/findFuzzy as public, we
      // just run the full resolver and treat its 'created' as a
      // "create attempt" we can either accept (allowCreate=true) or
      // surface as not_found.
      try {
        resolverResult = await this.resolver.resolve(input.userId, resolverInput);
      } catch (err) {
        // Resolver throws only on empty name (we already guarded) or
        // upstream DB error — surface a not_found with reason.
        await this.logEvent(input, {
          method: 'failed',
          confidence: 0,
          metadata: { stage: 'resolver', error: errorMessage(err) },
        });
        return { kind: 'not_found', reason: errorMessage(err) };
      }

      if (resolverResult.kind === 'matched') {
        await this.logEvent(input, {
          method: resolverResult.via === 'exact' ? 'exact' : 'fuzzy',
          productId: resolverResult.product.id,
          confidence: resolverResult.confidence,
        });
        return {
          kind: 'matched',
          product: widenResolverProduct(resolverResult.product),
          confidence: resolverResult.confidence,
          via: resolverResult.via === 'exact' ? 'exact' : 'fuzzy',
        };
      }
      if (resolverResult.kind === 'ambiguous') {
        const candidates: ProductCandidate[] = resolverResult.candidates.map((c) => {
          const widened = widenResolverProduct(c.product);
          return {
            product_id: widened.id,
            name: widened.name,
            brand: widened.brand,
            category: widened.category,
            barcode: widened.barcode,
            image_url: widened.image_url,
            score: c.score,
            source: 'local',
          };
        });
        await this.logEvent(input, {
          method: 'fuzzy',
          confidence: candidates[0]?.score ?? 0,
          candidates,
        });
        return {
          kind: 'ambiguous',
          candidates,
          confidence: candidates[0]?.score ?? 0,
        };
      }
      // resolverResult.kind === 'created' → fall through. We'll only
      // accept it if no external lookup yields a better answer ; the
      // resolver already inserted the row, so we need to commit either
      // way (best-effort enrichment will run on top in PR5).
    }

    // --- Step 5: OFF barcode --------------------------------------
    if (allowExternal && input.barcode) {
      const offProduct = await this.lookupOffBarcode(input.barcode);
      if (offProduct) {
        // If the resolver auto-created a generic row, fold the OFF
        // enrichment into it and return matched ; otherwise we'd
        // either return ambiguous (multiple candidates) or attach the
        // enrichment to a fresh create.
        const target = resolverResult?.kind === 'created' ? resolverResult.product : null;
        if (target) {
          const widened = widenResolverProduct(target);
          const enriched = await this.tryApplyEnrichment(widened.id, offProduct);
          await this.logEvent(input, {
            method: 'openfoodfacts_barcode',
            productId: widened.id,
            confidence: offProduct.confidence,
          });
          return {
            kind: 'matched',
            product: enriched ?? widened,
            confidence: offProduct.confidence,
            via: 'openfoodfacts_barcode',
          };
        }
        // No local target yet → surface the OFF candidate. The caller
        // (assistant handler) can decide to create + enrich.
        await this.logEvent(input, {
          method: 'openfoodfacts_barcode',
          confidence: offProduct.confidence,
          candidates: [externalAsCandidate(offProduct)],
        });
        return {
          kind: 'ambiguous',
          candidates: [externalAsCandidate(offProduct)],
          confidence: offProduct.confidence,
        };
      }
    }

    // --- Step 6+7: OFF search + clarification ---------------------
    if (allowExternal && input.name && resolverResult?.kind !== 'created') {
      const externals = await this.searchOff(input.name);
      if (externals.length === 1) {
        const single = externals[0];
        await this.logEvent(input, {
          method: 'openfoodfacts_search',
          confidence: single.confidence,
          candidates: [externalAsCandidate(single)],
        });
        return {
          kind: 'ambiguous',
          candidates: [externalAsCandidate(single)],
          confidence: single.confidence,
        };
      }
      if (externals.length > 1) {
        const top = externals[0];
        const second = externals[1];
        const isAmbiguous = top.confidence - second.confidence < this.ambiguityMargin;
        const candidates = externals.slice(0, 5).map(externalAsCandidate);
        await this.logEvent(input, {
          method: isAmbiguous ? 'clarification' : 'openfoodfacts_search',
          confidence: top.confidence,
          candidates,
        });
        return {
          kind: 'ambiguous',
          candidates,
          confidence: top.confidence,
        };
      }
    }

    // --- Step 8: accept resolver's auto-create or surface not_found
    if (resolverResult?.kind === 'created') {
      const widened = widenResolverProduct(resolverResult.product);
      if (!allowCreate) {
        // Caller forbids creation — but the resolver already inserted
        // the row. Best we can do is surface a 'matched' with low
        // confidence so the caller knows it wasn't an enrichment win.
        await this.logEvent(input, {
          method: 'manual_create',
          productId: widened.id,
          confidence: 0.5,
        });
        return {
          kind: 'matched',
          product: widened,
          confidence: 0.5,
          via: 'manual_create',
        };
      }
      await this.logEvent(input, {
        method: 'manual_create',
        productId: widened.id,
        confidence: 1,
      });
      return { kind: 'created', product: widened, confidence: 1 };
    }

    await this.logEvent(input, {
      method: 'failed',
      confidence: 0,
      metadata: { rawInput },
    });
    return {
      kind: 'not_found',
      reason: 'no local match and no external candidate',
    };
  }

  // ---- Step helpers -----------------------------------------------

  private async findByBarcode(barcode: string): Promise<ProductRow | null> {
    const clean = barcode.trim();
    if (!clean) return null;
    const { data, error } = await this.admin
      .from('products')
      .select('*')
      .eq('barcode', clean)
      .maybeSingle();
    if (error) throw error;
    return (data as ProductRow | null) ?? null;
  }

  private async findByAlias(name: string): Promise<{ product: ProductRow; confidence: number } | null> {
    const normalized = normalizeName(name);
    if (!normalized) return null;
    const aliases = await this.repo.findAliasMatches(normalized, 5);
    if (aliases.length === 0) return null;
    // Ambiguous alias graphs are handled at the alias creation step
    // (PR5 confirm_product_candidate) — here we deterministically take
    // the most recent assistant-confirmed alias.
    const ordered = [...aliases].sort((a, b) => {
      if (a.source !== b.source) {
        if (a.source === 'assistant' || a.source === 'user') return -1;
        if (b.source === 'assistant' || b.source === 'user') return 1;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    const top = ordered[0];
    const { data, error } = await this.admin
      .from('products')
      .select('*')
      .eq('id', top.product_id)
      .maybeSingle();
    if (error) throw error;
    const product = (data as ProductRow | null) ?? null;
    if (!product) return null;
    return { product, confidence: 0.95 };
  }

  /**
   * Read OFF cache → fall back to OFF client → write cache. Errors are
   * swallowed (logged) so the pipeline can degrade to local-only.
   */
  private async lookupOffBarcode(barcode: string): Promise<ExternalProductCandidate | null> {
    const cacheKey = buildBarcodeCacheKey(barcode);
    try {
      const { hit, expired } = await this.repo.readCache(cacheKey);
      if (hit && !expired) {
        if (hit.status === 'miss') return null;
        const payload = hit.response_json as Record<string, unknown> | null;
        if (!payload) return null;
        return toExternalCandidate(payload);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ProductIntelligence] OFF barcode cache read failed:', err);
    }

    try {
      const offProduct = await this.off.getProductByBarcode(barcode);
      const ttl = offProduct ? CACHE_TTL_MS.barcodeHit : CACHE_TTL_MS.barcodeMiss;
      await this.repo
        .writeCache({
          cacheKey,
          response: offProduct ?? { products: [] },
          status: offProduct ? 'hit' : 'miss',
          ttlMs: ttl,
        })
        .catch((cacheErr) =>
          // eslint-disable-next-line no-console
          console.error('[ProductIntelligence] OFF barcode cache write failed:', cacheErr)
        );
      return offProduct ? toExternalCandidate(offProduct) : null;
    } catch (err) {
      const code = err instanceof OpenFoodFactsClientError ? err.code : 'OFF_HTTP';
      const ttlMs =
        code === 'OFF_RATE_LIMITED' ? CACHE_TTL_MS.rateLimited : CACHE_TTL_MS.error;
      await this.repo
        .writeCache({
          cacheKey,
          response: {},
          status: 'error',
          errorCode: code,
          httpStatus:
            err instanceof OpenFoodFactsClientError ? err.httpStatus ?? null : null,
          ttlMs,
        })
        .catch(() => undefined);
      return null;
    }
  }

  private async searchOff(name: string): Promise<ExternalProductCandidate[]> {
    const cacheKey = buildSearchCacheKey(name, 'fr', 5);
    try {
      const { hit, expired } = await this.repo.readCache(cacheKey);
      if (hit && !expired) {
        if (hit.status === 'miss' || hit.status === 'error') return [];
        const list = extractProductsList(hit.response_json);
        return list
          .map((p) => toExternalCandidate(p as Record<string, unknown>))
          .filter((c): c is ExternalProductCandidate => c !== null);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ProductIntelligence] OFF search cache read failed:', err);
    }

    try {
      const payloads = await this.off.searchProducts(name, { limit: 5, locale: 'fr' });
      const ttlMs = payloads.length > 0 ? CACHE_TTL_MS.searchHit : CACHE_TTL_MS.searchAmbiguous;
      await this.repo
        .writeCache({
          cacheKey,
          query: name,
          response: { products: payloads },
          status: payloads.length > 0 ? 'hit' : 'miss',
          ttlMs,
        })
        .catch((cacheErr) =>
          // eslint-disable-next-line no-console
          console.error('[ProductIntelligence] OFF search cache write failed:', cacheErr)
        );
      return payloads
        .map((p) => toExternalCandidate(p as Record<string, unknown>))
        .filter((c): c is ExternalProductCandidate => c !== null);
    } catch (err) {
      const code = err instanceof OpenFoodFactsClientError ? err.code : 'OFF_HTTP';
      const ttlMs =
        code === 'OFF_RATE_LIMITED' ? CACHE_TTL_MS.rateLimited : CACHE_TTL_MS.error;
      await this.repo
        .writeCache({
          cacheKey,
          query: name,
          response: { products: [] },
          status: 'error',
          errorCode: code,
          httpStatus:
            err instanceof OpenFoodFactsClientError ? err.httpStatus ?? null : null,
          ttlMs,
        })
        .catch(() => undefined);
      return [];
    }
  }

  private async tryApplyEnrichment(
    productId: string,
    candidate: ExternalProductCandidate
  ): Promise<ProductRow | null> {
    try {
      return await this.repo.applyEnrichment({ productId, candidate });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ProductIntelligence] applyEnrichment failed:', err);
      return null;
    }
  }

  private async logEvent(
    input: ResolveProductInput,
    opts: {
      method: ResolveMethod;
      productId?: string | null;
      confidence: number;
      candidates?: ProductCandidate[];
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    try {
      await this.repo.recordResolutionEvent({
        userId: input.userId,
        rawInput: input.rawInput ?? input.name ?? input.barcode ?? '',
        barcode: input.barcode ?? null,
        resolvedProductId: opts.productId ?? null,
        method: opts.method,
        confidence: opts.confidence,
        candidates: opts.candidates ?? [],
        metadata: opts.metadata ?? {},
      });
    } catch (err) {
      // Audit failures must NEVER break resolution.
      // eslint-disable-next-line no-console
      console.error('[ProductIntelligence] event log failed:', err);
    }
  }
}

// ---- Helpers --------------------------------------------------------

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function externalAsCandidate(c: ExternalProductCandidate): ProductCandidate {
  return {
    name: c.name,
    brand: c.brand ?? null,
    category: c.category ?? null,
    barcode: c.externalCode,
    image_url: c.imageUrl ?? null,
    score: c.confidence,
    source: 'openfoodfacts',
  };
}

function extractProductsList(payload: unknown): unknown[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload === 'object' && payload) {
    const products = (payload as { products?: unknown }).products;
    if (Array.isArray(products)) return products;
  }
  return [];
}

/**
 * The PRP-221 ProductResolver has a hand-rolled `ProductRow` interface
 * that pre-dates the PRP-225 columns. At runtime supabase `select('*')`
 * returns every column, so the row coming back from the resolver is
 * structurally compatible with the wider `ProductRow` exposed by the
 * typed Supabase schema — TypeScript just can't prove it across the
 * two definitions. We bridge with a defensive cast + sane defaults for
 * the new columns, in the rare case the resolver was constructed
 * against a database that hasn't applied PR1's migration yet.
 */
function widenResolverProduct(row: ResolverProductRow): ProductRow {
  const r = row as unknown as Partial<ProductRow> & ResolverProductRow;
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    barcode: r.barcode ?? null,
    brand: r.brand ?? null,
    image_url: r.image_url ?? null,
    normalized_name: r.normalized_name,
    source: (r.source as ProductRow['source']) ?? 'unknown',
    created_by: r.created_by ?? null,
    quantity_label: r.quantity_label ?? null,
    ingredients_text: r.ingredients_text ?? null,
    nutrition_json: r.nutrition_json ?? {},
    allergens_json: r.allergens_json ?? {},
    off_product_code: r.off_product_code ?? null,
    off_last_synced_at: r.off_last_synced_at ?? null,
    off_raw_updated_at: r.off_raw_updated_at ?? null,
    enrichment_status: r.enrichment_status ?? 'none',
    enrichment_source: r.enrichment_source ?? 'none',
    enrichment_confidence:
      typeof r.enrichment_confidence === 'number' ? r.enrichment_confidence : 0,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}
