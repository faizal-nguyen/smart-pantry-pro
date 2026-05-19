/**
 * PRP-225 PR5 — Product Intelligence handler tests.
 *
 * Covers the 4 new tools :
 *   - search_product_candidates
 *   - resolve_product_by_barcode
 *   - enrich_product
 *   - confirm_product_candidate
 *
 * Mocks `ctx.productIntelligence` directly so we exercise each handler's
 * branching without spinning up Supabase or OpenFoodFacts.
 */

import {
  SearchProductCandidatesHandler,
  ResolveProductByBarcodeHandler,
  EnrichProductHandler,
  ConfirmProductCandidateHandler,
} from '../products.js';
import type { ToolExecutionContext } from '../types.js';
import type {
  ProductCandidate,
  ProductRow,
  ResolveProductResult,
} from '../../../products/productTypes.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../types/supabase.js';

const USER = '11111111-1111-1111-1111-111111111111';
const PRODUCT_ID = '22222222-2222-2222-2222-222222222222';
const NOW = '2026-05-16T12:00:00Z';

function makeProductRow(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: PRODUCT_ID,
    name: 'Skyr vanille',
    category: 'dairy',
    barcode: null,
    brand: null,
    image_url: null,
    normalized_name: 'skyr vanille',
    source: 'unknown',
    created_by: null,
    quantity_label: null,
    ingredients_text: null,
    nutrition_json: {},
    allergens_json: {},
    off_product_code: null,
    off_last_synced_at: null,
    off_raw_updated_at: null,
    enrichment_status: 'none',
    enrichment_source: 'none',
    enrichment_confidence: 0,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<ProductCandidate> = {}): ProductCandidate {
  return {
    name: 'Skyr nature',
    brand: 'Siggi',
    category: null,
    barcode: null,
    image_url: null,
    score: 0.9,
    source: 'local',
    ...overrides,
  };
}

interface BuildCtxOpts {
  resolveResult?: ResolveProductResult;
  resolveImpl?: jest.Mock;
  product?: ProductRow | null;
  productLookupError?: { message: string };
  aliasUpsertResult?: unknown;
  recordEvent?: jest.Mock;
}

function buildCtx(opts: BuildCtxOpts = {}): {
  ctx: ToolExecutionContext;
  productIntelligence: { resolve: jest.Mock };
  events: Array<Record<string, unknown>>;
  upserts: Array<Record<string, unknown>>;
} {
  const events: Array<Record<string, unknown>> = [];
  const upserts: Array<Record<string, unknown>> = [];
  const resolve = opts.resolveImpl
    ?? jest.fn(async () =>
      opts.resolveResult ?? ({ kind: 'not_found', reason: 'not_set' } as ResolveProductResult)
    );

  const adminClient = {
    from(table: string) {
      if (table === 'products') {
        return {
          select(_cols?: string) {
            return {
              eq(_col: string, _val: unknown) {
                return {
                  async maybeSingle() {
                    if (opts.productLookupError) {
                      return { data: null, error: opts.productLookupError };
                    }
                    return { data: opts.product ?? null, error: null };
                  },
                };
              },
            };
          },
        };
      }
      if (table === 'product_aliases') {
        return {
          upsert(payload: Record<string, unknown>) {
            upserts.push(payload);
            return {
              select() {
                return {
                  async maybeSingle() {
                    return { data: opts.aliasUpsertResult ?? null, error: null };
                  },
                };
              },
            };
          },
        };
      }
      if (table === 'product_resolution_events') {
        return {
          async insert(payload: Record<string, unknown>) {
            events.push(payload);
            return { data: null, error: null };
          },
        };
      }
      throw new Error(`unexpected admin.from(${table})`);
    },
  } as unknown as SupabaseClient<Database>;

  const ctx: ToolExecutionContext = {
    userId: USER,
    userClient: adminClient as unknown as ToolExecutionContext['userClient'],
    adminClient: adminClient as unknown as ToolExecutionContext['adminClient'],
    productResolver: {} as ToolExecutionContext['productResolver'],
    productIntelligence: { resolve } as unknown as ToolExecutionContext['productIntelligence'],
  };

  return { ctx, productIntelligence: { resolve }, events, upserts };
}

// ---- search_product_candidates -----------------------------------

describe('SearchProductCandidatesHandler', () => {
  it('returns matched product as a single candidate', async () => {
    const product = makeProductRow();
    const { ctx } = buildCtx({
      resolveResult: { kind: 'matched', product, confidence: 1, via: 'exact' },
    });
    const result = await new SearchProductCandidatesHandler().execute(ctx, {
      query: 'skyr vanille',
    });
    expect(result.result.query).toBe('skyr vanille');
    expect(result.result.candidates).toHaveLength(1);
    expect(result.result.candidates[0].product_id).toBe(PRODUCT_ID);
    expect(result.result.candidates[0].source).toBe('local');
  });

  it('returns ambiguous candidates verbatim', async () => {
    const { ctx } = buildCtx({
      resolveResult: {
        kind: 'ambiguous',
        candidates: [makeCandidate({ name: 'A' }), makeCandidate({ name: 'B' })],
        confidence: 0.85,
      },
    });
    const result = await new SearchProductCandidatesHandler().execute(ctx, { query: 'skyr' });
    expect(result.result.candidates.map((c) => c.name)).toEqual(['A', 'B']);
  });

  it('clamps to args.limit', async () => {
    const { ctx } = buildCtx({
      resolveResult: {
        kind: 'ambiguous',
        candidates: Array.from({ length: 6 }, (_, i) => makeCandidate({ name: `r${i}` })),
        confidence: 0.7,
      },
    });
    const result = await new SearchProductCandidatesHandler().execute(ctx, {
      query: 'skyr',
      limit: 3,
    });
    expect(result.result.candidates).toHaveLength(3);
  });

  it('returns empty array on not_found', async () => {
    const { ctx } = buildCtx({
      resolveResult: { kind: 'not_found', reason: 'nope' },
    });
    const result = await new SearchProductCandidatesHandler().execute(ctx, { query: 'xx' });
    expect(result.result.candidates).toHaveLength(0);
  });

  it('forwards allowCreate=false so resolve never auto-creates', async () => {
    const resolveImpl = jest.fn(async () => ({ kind: 'not_found', reason: 'x' } as ResolveProductResult));
    const { ctx } = buildCtx({ resolveImpl });
    await new SearchProductCandidatesHandler().execute(ctx, { query: 'skyr' });
    expect(resolveImpl).toHaveBeenCalledWith(
      expect.objectContaining({ allowCreate: false, allowExternalLookup: true })
    );
  });
});

// ---- resolve_product_by_barcode ----------------------------------

describe('ResolveProductByBarcodeHandler', () => {
  it('maps matched to kind=matched with product', async () => {
    const product = makeProductRow({ barcode: '3017620422003' });
    const { ctx } = buildCtx({
      resolveResult: { kind: 'matched', product, confidence: 1, via: 'barcode_local' },
    });
    const result = await new ResolveProductByBarcodeHandler().execute(ctx, {
      barcode: '3017620422003',
    });
    expect(result.result.kind).toBe('matched');
    expect(result.result.product?.id).toBe(PRODUCT_ID);
    expect(result.result.confidence).toBe(1);
  });

  it('maps ambiguous to kind=ambiguous with candidates', async () => {
    const { ctx } = buildCtx({
      resolveResult: {
        kind: 'ambiguous',
        candidates: [makeCandidate({ barcode: 'A' }), makeCandidate({ barcode: 'B' })],
        confidence: 0.7,
      },
    });
    const result = await new ResolveProductByBarcodeHandler().execute(ctx, {
      barcode: '0000000000000',
    });
    expect(result.result.kind).toBe('ambiguous');
    expect(result.result.candidates).toHaveLength(2);
  });

  it('maps not_found cleanly', async () => {
    const { ctx } = buildCtx({
      resolveResult: { kind: 'not_found', reason: 'no match' },
    });
    const result = await new ResolveProductByBarcodeHandler().execute(ctx, {
      barcode: '0000000000000',
    });
    expect(result.result.kind).toBe('not_found');
    expect(result.result.product).toBeUndefined();
  });
});

// ---- enrich_product ----------------------------------------------

describe('EnrichProductHandler', () => {
  it('returns enriched=true when via=openfoodfacts_barcode', async () => {
    const product = makeProductRow({ enrichment_status: 'enriched' });
    const { ctx } = buildCtx({
      product: makeProductRow(),
      resolveResult: {
        kind: 'matched',
        product,
        confidence: 0.9,
        via: 'openfoodfacts_barcode',
      },
    });
    const result = await new EnrichProductHandler().execute(ctx, { product_id: PRODUCT_ID });
    expect(result.result.enriched).toBe(true);
    expect(result.result.kind).toBe('matched');
    expect(result.result.via).toBe('openfoodfacts_barcode');
  });

  it('returns enriched=false on exact/local match', async () => {
    const product = makeProductRow();
    const { ctx } = buildCtx({
      product,
      resolveResult: { kind: 'matched', product, confidence: 1, via: 'exact' },
    });
    const result = await new EnrichProductHandler().execute(ctx, { product_id: PRODUCT_ID });
    expect(result.result.enriched).toBe(false);
    expect(result.result.via).toBe('exact');
  });

  it('throws when the product lookup fails', async () => {
    const { ctx } = buildCtx({ productLookupError: { message: 'db boom' } });
    await expect(
      new EnrichProductHandler().execute(ctx, { product_id: PRODUCT_ID })
    ).rejects.toThrow(/db boom/);
  });

  it('throws when the product does not exist', async () => {
    const { ctx } = buildCtx({ product: null });
    await expect(
      new EnrichProductHandler().execute(ctx, { product_id: PRODUCT_ID })
    ).rejects.toThrow(/not found/);
  });
});

// ---- confirm_product_candidate ----------------------------------

describe('ConfirmProductCandidateHandler', () => {
  it('records an alias + an event when raw_input normalises', async () => {
    const { ctx, events, upserts } = buildCtx({
      product: makeProductRow(),
      aliasUpsertResult: { id: 'alias-1' },
    });
    const result = await new ConfirmProductCandidateHandler().execute(ctx, {
      raw_input: 'skyrs vanille',
      product_id: PRODUCT_ID,
    });
    expect(result.result.alias_recorded).toBe(true);
    expect(result.result.alias_normalized).toBe('skyrs vanille');
    expect(upserts).toHaveLength(1);
    expect(upserts[0].normalized_alias).toBe('skyrs vanille');
    expect(upserts[0].source).toBe('assistant');
    expect(events).toHaveLength(1);
    expect(events[0].method).toBe('clarification');
  });

  it('honours an explicit alias arg over raw_input', async () => {
    const { ctx, upserts } = buildCtx({
      product: makeProductRow(),
      aliasUpsertResult: { id: 'alias-2' },
    });
    await new ConfirmProductCandidateHandler().execute(ctx, {
      raw_input: 'skyrs vanille',
      product_id: PRODUCT_ID,
      alias: 'Mon skyr préféré',
    });
    expect(upserts[0].alias).toBe('Mon skyr préféré');
    expect(upserts[0].normalized_alias).toBe('mon skyr prefere');
  });

  it('throws when product not found', async () => {
    const { ctx } = buildCtx({ product: null });
    await expect(
      new ConfirmProductCandidateHandler().execute(ctx, {
        raw_input: 'x',
        product_id: PRODUCT_ID,
      })
    ).rejects.toThrow(/not found/);
  });

  it('logs the event but reports alias_recorded=false when normalisation collapses', async () => {
    const { ctx, events, upserts } = buildCtx({
      product: makeProductRow(),
    });
    const result = await new ConfirmProductCandidateHandler().execute(ctx, {
      raw_input: '   ',
      product_id: PRODUCT_ID,
    });
    expect(result.result.alias_recorded).toBe(false);
    expect(upserts).toHaveLength(0);
    expect(events).toHaveLength(1);
    expect(events[0].method).toBe('clarification');
  });
});
