/**
 * PRP-225 PR4 — Product Intelligence API routes.
 *
 *   GET  /api/products/resolve?name=&barcode=     UI/scanner light query
 *   POST /api/products/resolve                     assistant/receipt rich body
 *   GET  /api/products/external/search?q=&limit=   cached OFF search
 *   POST /api/products/:id/enrich                  re-sync a product from OFF
 *   GET  /api/products/:id/enrichment              read enrichment status + nutrition
 *   POST /api/products/:id/aliases                 record a confirmed alias
 *
 * Auth: every route requires a valid user session (createAuthMiddleware).
 * Response envelope follows the project convention (`ok` / `fail`).
 * Error codes mirror PRP-225 §8 + the ProductIntelligence pipeline.
 */
import { Router, type Request, type Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { ok, fail } from '../utils/responses.js';
import { ProductIntelligenceService } from '../services/products/ProductIntelligenceService.js';
import {
  ProductEnrichmentRepository,
  CACHE_TTL_MS,
} from '../services/products/ProductEnrichmentRepository.js';
import {
  buildSearchCacheKey,
  toExternalCandidate,
  normalizeName,
} from '../services/products/ProductNormalizer.js';
import {
  getDefaultOpenFoodFactsClient,
  OpenFoodFactsClientError,
} from '../services/products/OpenFoodFactsClient.js';
import type { Database } from '../types/supabase.js';
import type {
  ExternalProductCandidate,
  ProductCandidate,
} from '../services/products/productTypes.js';

const UuidParamsSchema = z.object({ id: z.string().uuid() });

const ResolveQuerySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    barcode: z.string().min(1).max(64).optional(),
  })
  .refine((v) => Boolean(v.name || v.barcode), {
    message: 'name or barcode required',
  });

const ResolveBodySchema = z
  .object({
    rawInput: z.string().min(1).max(500).optional(),
    name: z.string().min(1).max(200).optional(),
    barcode: z.string().min(1).max(64).optional(),
    categoryHint: z.string().max(100).optional(),
    unitHint: z.string().max(50).optional(),
    allowExternalLookup: z.boolean().optional(),
    allowCreate: z.boolean().optional(),
  })
  .refine((v) => Boolean(v.name || v.barcode || v.rawInput), {
    message: 'name, barcode or rawInput required',
  });

const ExternalSearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(10).optional(),
});

const AliasBodySchema = z.object({
  alias: z.string().min(1).max(200),
  /** Where the alias came from. Defaults to 'user'. */
  source: z
    .enum(['user', 'assistant', 'import', 'openfoodfacts', 'receipt'])
    .optional(),
});

export function createProductsIntelligenceRouter(
  adminClient: SupabaseClient<Database>,
): Router {
  const router = Router();
  router.use(createAuthMiddleware(adminClient as unknown as SupabaseClient<any, any, any>));

  const service = new ProductIntelligenceService(adminClient);
  const repo = new ProductEnrichmentRepository(adminClient);
  const off = getDefaultOpenFoodFactsClient();

  // ---- Resolve (GET light) ----------------------------------------
  router.get('/resolve', async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return fail(res, 'unauthorized', 401, 'UNAUTHORIZED');
    const parsed = ResolveQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return fail(res, parsed.error.message, 400, 'BAD_REQUEST');
    }
    try {
      const result = await service.resolve({
        userId,
        rawInput: parsed.data.name ?? parsed.data.barcode,
        name: parsed.data.name,
        barcode: parsed.data.barcode,
      });
      return mapResolveResult(res, result);
    } catch (err) {
      return mapPipelineError(res, err);
    }
  });

  // ---- Resolve (POST rich) ----------------------------------------
  router.post('/resolve', async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return fail(res, 'unauthorized', 401, 'UNAUTHORIZED');
    const parsed = ResolveBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return fail(res, parsed.error.message, 400, 'BAD_REQUEST');
    }
    try {
      const result = await service.resolve({ userId, ...parsed.data });
      return mapResolveResult(res, result);
    } catch (err) {
      return mapPipelineError(res, err);
    }
  });

  // ---- External search --------------------------------------------
  router.get('/external/search', async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return fail(res, 'unauthorized', 401, 'UNAUTHORIZED');
    const parsed = ExternalSearchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return fail(res, parsed.error.message, 400, 'BAD_REQUEST');
    }
    const { q, limit } = parsed.data;
    const effectiveLimit = limit ?? 5;
    const cacheKey = buildSearchCacheKey(q, 'fr', effectiveLimit);

    // Cache short-circuit.
    try {
      const { hit, expired } = await repo.readCache(cacheKey);
      if (hit && !expired && hit.status !== 'error') {
        const cached = extractCachedExternals(hit.response_json);
        return ok(res, { results: cached.map(externalToDto), cached: true });
      }
    } catch {
      // Fall through to OFF.
    }

    try {
      const payloads = await off.searchProducts(q, {
        limit: effectiveLimit,
        locale: 'fr',
      });
      const candidates = payloads
        .map((p) => toExternalCandidate(p as unknown as Record<string, unknown>))
        .filter((c): c is ExternalProductCandidate => c !== null);
      const ttlMs =
        candidates.length > 0 ? CACHE_TTL_MS.searchHit : CACHE_TTL_MS.searchAmbiguous;
      await repo
        .writeCache({
          cacheKey,
          query: q,
          response: { products: payloads },
          status: candidates.length > 0 ? 'hit' : 'miss',
          ttlMs,
        })
        .catch(() => undefined);
      return ok(res, { results: candidates.map(externalToDto), cached: false });
    } catch (err) {
      const code =
        err instanceof OpenFoodFactsClientError ? err.code : 'OFF_HTTP';
      const ttlMs =
        code === 'OFF_RATE_LIMITED' ? CACHE_TTL_MS.rateLimited : CACHE_TTL_MS.error;
      await repo
        .writeCache({
          cacheKey,
          query: q,
          response: { products: [] },
          status: 'error',
          errorCode: code,
          httpStatus:
            err instanceof OpenFoodFactsClientError ? err.httpStatus ?? null : null,
          ttlMs,
        })
        .catch(() => undefined);
      const status = code === 'OFF_RATE_LIMITED' ? 429 : 503;
      return fail(res, code, status, code);
    }
  });

  // ---- Enrich a product (POST) ------------------------------------
  router.post('/:id/enrich', async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return fail(res, 'unauthorized', 401, 'UNAUTHORIZED');
    const params = UuidParamsSchema.safeParse(req.params);
    if (!params.success) return fail(res, 'invalid id', 400, 'BAD_REQUEST');

    // Look up the product to extract a barcode (or fall back to name).
    const { data: product, error } = await adminClient
      .from('products')
      .select('id, name, barcode')
      .eq('id', params.data.id)
      .maybeSingle();
    if (error) return fail(res, error.message, 500, 'DB_ERROR');
    if (!product) return fail(res, 'product not found', 404, 'PRODUCT_NOT_FOUND');

    try {
      const result = await service.resolve({
        userId,
        rawInput: product.name,
        name: product.name,
        barcode: product.barcode ?? undefined,
        allowExternalLookup: true,
        allowCreate: false,
      });
      return mapResolveResult(res, result);
    } catch (err) {
      return mapPipelineError(res, err);
    }
  });

  // ---- Get enrichment status (GET) --------------------------------
  router.get('/:id/enrichment', async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return fail(res, 'unauthorized', 401, 'UNAUTHORIZED');
    const params = UuidParamsSchema.safeParse(req.params);
    if (!params.success) return fail(res, 'invalid id', 400, 'BAD_REQUEST');

    const { data, error } = await adminClient
      .from('products')
      .select(
        'id, name, brand, image_url, quantity_label, nutrition_json, allergens_json, off_product_code, off_last_synced_at, enrichment_status, enrichment_source, enrichment_confidence'
      )
      .eq('id', params.data.id)
      .maybeSingle();
    if (error) return fail(res, error.message, 500, 'DB_ERROR');
    if (!data) return fail(res, 'product not found', 404, 'PRODUCT_NOT_FOUND');
    return ok(res, { enrichment: data });
  });

  // ---- Add an alias (POST) ----------------------------------------
  router.post('/:id/aliases', async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return fail(res, 'unauthorized', 401, 'UNAUTHORIZED');
    const params = UuidParamsSchema.safeParse(req.params);
    if (!params.success) return fail(res, 'invalid id', 400, 'BAD_REQUEST');
    const body = AliasBodySchema.safeParse(req.body ?? {});
    if (!body.success) {
      return fail(res, body.error.message, 400, 'BAD_REQUEST');
    }
    const normalized = normalizeName(body.data.alias);
    if (!normalized) return fail(res, 'alias normalises to empty', 400, 'BAD_REQUEST');
    try {
      const row = await repo.upsertAlias({
        productId: params.data.id,
        alias: body.data.alias,
        normalizedAlias: normalized,
        source: body.data.source ?? 'user',
        createdBy: userId,
      });
      return ok(res, { alias: row, normalized_alias: normalized });
    } catch (err) {
      return fail(res, err instanceof Error ? err.message : 'alias error', 500, 'DB_ERROR');
    }
  });

  return router;
}

// ---- Helpers ----------------------------------------------------------

function mapResolveResult(
  res: Response,
  result: Awaited<ReturnType<ProductIntelligenceService['resolve']>>,
) {
  if (result.kind === 'matched' || result.kind === 'created') {
    return ok(res, {
      kind: result.kind,
      product: result.product,
      confidence: result.confidence,
      via: result.kind === 'matched' ? result.via : 'create',
    });
  }
  if (result.kind === 'ambiguous') {
    return ok(
      res,
      {
        kind: 'ambiguous',
        candidates: result.candidates,
        confidence: result.confidence,
      },
      'product candidates require clarification',
      'PRODUCT_AMBIGUOUS',
      // 200 not 4xx: ambiguity is a normal outcome the caller resolves
      // by re-POSTing with a chosen candidate. PR5 surfaces this to
      // the assistant ; the UI in PR6 renders a candidate modal.
      200,
    );
  }
  return fail(res, result.reason, 404, 'PRODUCT_NOT_FOUND');
}

function mapPipelineError(res: Response, err: unknown) {
  if (err instanceof OpenFoodFactsClientError) {
    const status = err.code === 'OFF_RATE_LIMITED' ? 429 : err.code === 'OFF_DISABLED' ? 503 : 502;
    return fail(res, err.message, status, err.code);
  }
  const message = err instanceof Error ? err.message : 'pipeline error';
  return fail(res, message, 500, 'INTERNAL_ERROR');
}

function externalToDto(c: ExternalProductCandidate): ProductCandidate {
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

function extractCachedExternals(payload: unknown): ExternalProductCandidate[] {
  if (!payload) return [];
  const products: unknown[] = Array.isArray(payload)
    ? (payload as unknown[])
    : Array.isArray((payload as { products?: unknown }).products)
      ? ((payload as { products: unknown[] }).products)
      : [];
  return products
    .map((p) => toExternalCandidate(p as Record<string, unknown>))
    .filter((c): c is ExternalProductCandidate => c !== null);
}
