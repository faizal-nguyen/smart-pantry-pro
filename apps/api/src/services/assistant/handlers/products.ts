/**
 * PRP-225 PR5 — Product Intelligence handlers.
 *
 * Surfaces the ProductIntelligenceService through 4 assistant tools :
 *
 *   READ  search_product_candidates    free-text → top N candidates
 *   READ  resolve_product_by_barcode   barcode    → matched / ambiguous / not_found
 *   LOW   enrich_product               product id → re-sync from OpenFoodFacts
 *   LOW   confirm_product_candidate    raw_input + product id (+ alias)
 *
 * Each handler lazily builds a default `ProductIntelligenceService`
 * from `ctx.adminClient` when `ctx.productIntelligence` is undefined,
 * which keeps existing tests + non-OFF execution paths compatible.
 */

import { ProductIntelligenceService } from '../../products/ProductIntelligenceService.js';
import {
  ProductEnrichmentRepository,
} from '../../products/ProductEnrichmentRepository.js';
import { normalizeName } from '../../products/ProductNormalizer.js';
import type { Database } from '../../../types/supabase.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ProductCandidate,
  ProductRow,
} from '../../products/productTypes.js';
import type {
  ConfirmProductCandidateArgs,
  EnrichProductArgs,
  ResolveProductByBarcodeArgs,
  SearchProductCandidatesArgs,
} from '../schemas/tools.js';
import type {
  ToolExecutionContext,
  ToolExecutionResult,
  ToolHandler,
  ToolHandlerRegistry,
} from './types.js';

function intelligenceFromCtx(ctx: ToolExecutionContext): ProductIntelligenceService {
  if (ctx.productIntelligence) return ctx.productIntelligence;
  return new ProductIntelligenceService(ctx.adminClient as SupabaseClient<Database>);
}

function repoFromCtx(ctx: ToolExecutionContext): ProductEnrichmentRepository {
  return new ProductEnrichmentRepository(ctx.adminClient as SupabaseClient<Database>);
}

// ---- search_product_candidates -------------------------------------

export interface SearchProductCandidatesResult {
  query: string;
  candidates: ProductCandidate[];
}

export class SearchProductCandidatesHandler
  implements ToolHandler<SearchProductCandidatesArgs, SearchProductCandidatesResult>
{
  async execute(
    ctx: ToolExecutionContext,
    args: SearchProductCandidatesArgs,
  ): Promise<ToolExecutionResult<SearchProductCandidatesResult>> {
    const service = intelligenceFromCtx(ctx);
    const result = await service.resolve({
      userId: ctx.userId,
      rawInput: args.query,
      name: args.query,
      allowExternalLookup: true,
      // Read-only tool — never auto-create a product as a side-effect.
      allowCreate: false,
    });

    const candidates: ProductCandidate[] = [];
    if (result.kind === 'matched' || result.kind === 'created') {
      const p = result.product;
      candidates.push({
        product_id: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        barcode: p.barcode,
        image_url: p.image_url,
        score: result.confidence,
        source: 'local',
      });
    } else if (result.kind === 'ambiguous') {
      candidates.push(...result.candidates);
    }
    const limit = args.limit ?? 5;
    return {
      result: {
        query: args.query,
        candidates: candidates.slice(0, limit),
      },
    };
  }
}

// ---- resolve_product_by_barcode -------------------------------------

export type ResolveByBarcodeKind = 'matched' | 'ambiguous' | 'not_found';

export interface ResolveProductByBarcodeResult {
  barcode: string;
  kind: ResolveByBarcodeKind;
  product?: ProductRow | null;
  candidates?: ProductCandidate[];
  confidence?: number;
}

export class ResolveProductByBarcodeHandler
  implements ToolHandler<ResolveProductByBarcodeArgs, ResolveProductByBarcodeResult>
{
  async execute(
    ctx: ToolExecutionContext,
    args: ResolveProductByBarcodeArgs,
  ): Promise<ToolExecutionResult<ResolveProductByBarcodeResult>> {
    const service = intelligenceFromCtx(ctx);
    const result = await service.resolve({
      userId: ctx.userId,
      rawInput: args.barcode,
      barcode: args.barcode,
      allowExternalLookup: true,
      // Read-only tool — let the caller decide to create.
      allowCreate: false,
    });

    if (result.kind === 'matched') {
      return {
        result: {
          barcode: args.barcode,
          kind: 'matched',
          product: result.product,
          confidence: result.confidence,
        },
      };
    }
    if (result.kind === 'ambiguous') {
      return {
        result: {
          barcode: args.barcode,
          kind: 'ambiguous',
          candidates: result.candidates,
          confidence: result.confidence,
        },
      };
    }
    // 'created' shouldn't happen with allowCreate=false but flat-map to
    // matched for callers that ignore the kind enum nuance.
    if (result.kind === 'created') {
      return {
        result: {
          barcode: args.barcode,
          kind: 'matched',
          product: result.product,
          confidence: result.confidence,
        },
      };
    }
    return {
      result: { barcode: args.barcode, kind: 'not_found' },
    };
  }
}

// ---- enrich_product -------------------------------------------------

export interface EnrichProductResult {
  product_id: string;
  enriched: boolean;
  kind: 'matched' | 'ambiguous' | 'not_found' | 'created';
  via?: string;
  product?: ProductRow | null;
  candidates?: ProductCandidate[];
  confidence?: number;
}

export class EnrichProductHandler
  implements ToolHandler<EnrichProductArgs, EnrichProductResult>
{
  async execute(
    ctx: ToolExecutionContext,
    args: EnrichProductArgs,
  ): Promise<ToolExecutionResult<EnrichProductResult>> {
    // Pull the product so we can feed both name + barcode to the
    // pipeline. The service handles the barcode-then-name cascade
    // internally and writes back to `products` on success.
    const { data: product, error } = await ctx.adminClient
      .from('products')
      .select('id, name, barcode')
      .eq('id', args.product_id)
      .maybeSingle();
    if (error) {
      throw new Error(`enrich_product: db error: ${error.message}`);
    }
    if (!product) {
      throw new Error(`enrich_product: product ${args.product_id} not found`);
    }

    const service = intelligenceFromCtx(ctx);
    const result = await service.resolve({
      userId: ctx.userId,
      rawInput: product.name,
      name: product.name,
      barcode: product.barcode ?? undefined,
      allowExternalLookup: true,
      allowCreate: false,
    });

    if (result.kind === 'matched') {
      return {
        result: {
          product_id: args.product_id,
          enriched: result.via === 'openfoodfacts_barcode',
          kind: 'matched',
          via: result.via,
          product: result.product,
          confidence: result.confidence,
        },
      };
    }
    if (result.kind === 'ambiguous') {
      return {
        result: {
          product_id: args.product_id,
          enriched: false,
          kind: 'ambiguous',
          candidates: result.candidates,
          confidence: result.confidence,
        },
      };
    }
    if (result.kind === 'created') {
      // Defensive — `allowCreate: false` should preclude this branch.
      return {
        result: {
          product_id: args.product_id,
          enriched: false,
          kind: 'created',
          product: result.product,
          confidence: result.confidence,
        },
      };
    }
    return {
      result: {
        product_id: args.product_id,
        enriched: false,
        kind: 'not_found',
      },
    };
  }
}

// ---- confirm_product_candidate --------------------------------------

export interface ConfirmProductCandidateResult {
  product_id: string;
  alias_recorded: boolean;
  alias_normalized?: string;
}

export class ConfirmProductCandidateHandler
  implements ToolHandler<ConfirmProductCandidateArgs, ConfirmProductCandidateResult>
{
  async execute(
    ctx: ToolExecutionContext,
    args: ConfirmProductCandidateArgs,
  ): Promise<ToolExecutionResult<ConfirmProductCandidateResult>> {
    // Verify the product exists (cross-user safe : RLS is bypassed by
    // adminClient but we still want a clean 404 instead of a silent FK
    // error when the LLM hallucinates an id).
    const { data: product, error } = await ctx.adminClient
      .from('products')
      .select('id')
      .eq('id', args.product_id)
      .maybeSingle();
    if (error) {
      throw new Error(`confirm_product_candidate: db error: ${error.message}`);
    }
    if (!product) {
      throw new Error(`confirm_product_candidate: product ${args.product_id} not found`);
    }

    const aliasSource = args.alias ?? args.raw_input;
    const normalized = normalizeName(aliasSource);
    if (!normalized) {
      // No usable alias — confirmation alone (no alias to remember).
      // Still log the event so the audit captures the confirmation.
      const repo = repoFromCtx(ctx);
      await repo
        .recordResolutionEvent({
          userId: ctx.userId,
          rawInput: args.raw_input,
          resolvedProductId: args.product_id,
          method: 'clarification',
          confidence: 1,
        })
        .catch((err) =>
          // eslint-disable-next-line no-console
          console.error('[confirm_product_candidate] event log failed:', err),
        );
      return {
        result: {
          product_id: args.product_id,
          alias_recorded: false,
        },
      };
    }

    const repo = repoFromCtx(ctx);
    const aliasRow = await repo.upsertAlias({
      productId: args.product_id,
      alias: aliasSource,
      normalizedAlias: normalized,
      source: 'assistant',
      createdBy: ctx.userId,
    });
    await repo
      .recordResolutionEvent({
        userId: ctx.userId,
        rawInput: args.raw_input,
        resolvedProductId: args.product_id,
        method: 'clarification',
        confidence: 1,
        metadata: { alias: aliasSource, normalized_alias: normalized },
      })
      .catch((err) =>
        // eslint-disable-next-line no-console
        console.error('[confirm_product_candidate] event log failed:', err),
      );

    return {
      result: {
        product_id: args.product_id,
        alias_recorded: aliasRow !== null,
        alias_normalized: normalized,
      },
    };
  }
}

// ---- Registration helper -------------------------------------------

export function registerProductHandlers(registry: ToolHandlerRegistry): void {
  registry.register('search_product_candidates', new SearchProductCandidatesHandler());
  registry.register('resolve_product_by_barcode', new ResolveProductByBarcodeHandler());
  registry.register('enrich_product', new EnrichProductHandler());
  registry.register('confirm_product_candidate', new ConfirmProductCandidateHandler());
}
