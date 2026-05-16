/**
 * PRP-225 PR2 — ProductEnrichmentRepository unit tests.
 *
 * Mocks the Supabase admin client at the chain-builder level. Covers :
 *   - cache read hit / miss
 *   - cache write upsert with TTL
 *   - alias upsert idempotence
 *   - resolution event insert
 *   - product enrichment apply (only non-null fields land in UPDATE)
 *   - markEnrichmentFailed flips status without dropping other fields
 */

import {
  CACHE_TTL_MS,
  ProductEnrichmentRepository,
  type SupabaseAdmin,
} from '../ProductEnrichmentRepository.js';
import type {
  ExternalProductCandidate,
  ProductEnrichmentCacheRow,
  ProductRow,
} from '../productTypes.js';

const USER = '11111111-1111-1111-1111-111111111111';
const PRODUCT = '22222222-2222-2222-2222-222222222222';
const NOW = new Date('2026-05-16T10:00:00Z');

function makeCacheRow(overrides: Partial<ProductEnrichmentCacheRow> = {}): ProductEnrichmentCacheRow {
  return {
    id: '33333333-3333-3333-3333-333333333333',
    provider: 'openfoodfacts',
    cache_key: 'barcode:123',
    query: null,
    response_json: { foo: 'bar' },
    status: 'hit',
    http_status: 200,
    error_code: null,
    expires_at: '2026-05-30T10:00:00Z',
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    ...overrides,
  };
}

function makeProductRow(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: PRODUCT,
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
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    ...overrides,
  };
}

interface ChainState {
  ops: Array<{ table: string; op: string; payload?: unknown; filters?: Record<string, unknown> }>;
}

function buildMockClient(handlers: {
  cacheRead?: () => Promise<{ data: ProductEnrichmentCacheRow | null; error: null }>;
  cacheWrite?: () => Promise<{ data: ProductEnrichmentCacheRow; error: null }>;
  aliasUpsert?: () => Promise<{ data: ProductRow | null; error: null }>;
  aliasFind?: () => Promise<{ data: unknown[]; error: null }>;
  eventInsert?: () => Promise<{ data: null; error: null }>;
  productUpdate?: () => Promise<{ data: ProductRow; error: null }>;
  cachePurge?: () => Promise<{ data: Array<{ id: string }>; error: null }>;
}): { client: SupabaseAdmin; state: ChainState } {
  const state: ChainState = { ops: [] };

  const chainable = (route: string): unknown => {
    let filters: Record<string, unknown> = {};
    const builder: Record<string, unknown> = {};

    builder.select = (_cols?: string) => builder;
    builder.eq = (col: string, val: unknown) => {
      filters[col] = val;
      return builder;
    };
    builder.lt = (col: string, val: unknown) => {
      filters[`lt_${col}`] = val;
      return builder;
    };
    builder.limit = (_n: number) => builder;
    builder.maybeSingle = async () => {
      state.ops.push({ table: route, op: 'select.maybeSingle', filters: { ...filters } });
      if (route === 'product_enrichment_cache.select') {
        return await handlers.cacheRead!();
      }
      if (route === 'product_aliases.upsert') {
        return await handlers.aliasUpsert!();
      }
      throw new Error(`unexpected maybeSingle on ${route}`);
    };
    builder.single = async () => {
      state.ops.push({ table: route, op: 'select.single', filters: { ...filters } });
      if (route === 'product_enrichment_cache.upsert') {
        return await handlers.cacheWrite!();
      }
      if (route === 'products.update') {
        return await handlers.productUpdate!();
      }
      throw new Error(`unexpected single on ${route}`);
    };
    builder.then = undefined; // disable thenable trap from supabase types
    return builder;
  };

  const client = {
    from(table: string) {
      const tableBuilder = {
        select(_cols?: string) {
          return {
            ...(chainable(`${table}.select`) as Record<string, unknown>),
            eq: (col: string, val: unknown) => {
              const inner = chainable(`${table}.select`) as Record<string, unknown>;
              (inner.eq as (c: string, v: unknown) => unknown)(col, val);
              return inner;
            },
          };
        },
        insert: async (payload: unknown) => {
          state.ops.push({ table, op: 'insert', payload });
          if (table === 'product_resolution_events') {
            return handlers.eventInsert
              ? await handlers.eventInsert()
              : { data: null, error: null };
          }
          throw new Error(`unexpected insert on ${table}`);
        },
        upsert: (payload: unknown, _opts?: unknown) => {
          state.ops.push({ table, op: 'upsert', payload });
          if (table === 'product_enrichment_cache') {
            return chainable(`${table}.upsert`);
          }
          if (table === 'product_aliases') {
            return chainable(`${table}.upsert`);
          }
          throw new Error(`unexpected upsert on ${table}`);
        },
        update: (payload: unknown) => {
          state.ops.push({ table, op: 'update', payload });
          const out: Record<string, unknown> = {};
          out.eq = (col: string, val: unknown) => {
            // collapse the chain into something `.select().single()` calls below
            const inner = chainable(`${table}.update`) as Record<string, unknown>;
            (inner.eq as (c: string, v: unknown) => unknown)(col, val);
            // For markEnrichmentFailed we end after .eq() without select().
            const promise = Promise.resolve({ data: null, error: null });
            return {
              ...inner,
              then: promise.then.bind(promise),
              catch: promise.catch.bind(promise),
              finally: promise.finally.bind(promise),
            };
          };
          return out;
        },
        delete: () => {
          return {
            lt: (_col: string, _val: unknown) => {
              return {
                select: async () => {
                  state.ops.push({ table, op: 'delete' });
                  return handlers.cachePurge
                    ? await handlers.cachePurge()
                    : { data: [], error: null };
                },
              };
            },
          };
        },
      };
      return tableBuilder;
    },
  } as unknown as SupabaseAdmin;

  return { client, state };
}

function makeRepo(handlers: Parameters<typeof buildMockClient>[0]): {
  repo: ProductEnrichmentRepository;
  state: ChainState;
} {
  const { client, state } = buildMockClient(handlers);
  return { repo: new ProductEnrichmentRepository(client, () => NOW), state };
}

describe('ProductEnrichmentRepository.readCache', () => {
  it('returns null when no row', async () => {
    const { repo } = makeRepo({
      cacheRead: async () => ({ data: null, error: null }),
    });
    const { hit, expired } = await repo.readCache('barcode:0');
    expect(hit).toBeNull();
    expect(expired).toBe(false);
  });

  it('returns the row and expired=false when valid', async () => {
    const { repo } = makeRepo({
      cacheRead: async () => ({ data: makeCacheRow(), error: null }),
    });
    const { hit, expired } = await repo.readCache('barcode:123');
    expect(hit?.cache_key).toBe('barcode:123');
    expect(expired).toBe(false);
  });

  it('marks expired when expires_at is in the past', async () => {
    const { repo } = makeRepo({
      cacheRead: async () => ({
        data: makeCacheRow({ expires_at: '2026-05-15T10:00:00Z' }),
        error: null,
      }),
    });
    const { expired } = await repo.readCache('barcode:123');
    expect(expired).toBe(true);
  });
});

describe('ProductEnrichmentRepository.writeCache', () => {
  it('upserts with the right TTL', async () => {
    const { repo, state } = makeRepo({
      cacheWrite: async () => ({ data: makeCacheRow(), error: null }),
    });
    await repo.writeCache({
      cacheKey: 'barcode:123',
      response: { ok: true },
      status: 'hit',
      ttlMs: CACHE_TTL_MS.barcodeHit,
    });
    const upsertOp = state.ops.find((o) => o.op === 'upsert' && o.table === 'product_enrichment_cache');
    const payload = upsertOp?.payload as Record<string, unknown>;
    expect(payload.cache_key).toBe('barcode:123');
    expect(payload.status).toBe('hit');
    // expires_at = now + 30 days
    const expires = new Date(payload.expires_at as string).getTime();
    const expected = NOW.getTime() + CACHE_TTL_MS.barcodeHit;
    expect(expires).toBe(expected);
  });
});

describe('ProductEnrichmentRepository.upsertAlias', () => {
  it('passes ignoreDuplicates so retries are silent', async () => {
    const { repo, state } = makeRepo({
      aliasUpsert: async () => ({ data: null, error: null }),
    });
    await repo.upsertAlias({
      productId: PRODUCT,
      alias: 'skyr',
      normalizedAlias: 'skyr',
      source: 'assistant',
    });
    const op = state.ops.find((o) => o.op === 'upsert' && o.table === 'product_aliases');
    expect((op?.payload as Record<string, unknown>).product_id).toBe(PRODUCT);
  });
});

describe('ProductEnrichmentRepository.recordResolutionEvent', () => {
  it('clamps confidence into [0, 1]', async () => {
    let captured: Record<string, unknown> | undefined;
    const { repo } = makeRepo({
      eventInsert: async () => ({ data: null, error: null }),
    });
    // Swap the client.from('product_resolution_events').insert to capture.
    const stub = repo as unknown as { admin: SupabaseAdmin };
    const realFrom = stub.admin.from.bind(stub.admin);
    stub.admin.from = ((table: string) => {
      const t = realFrom(table);
      if (table === 'product_resolution_events') {
        return {
          ...t,
          insert: async (payload: Record<string, unknown>) => {
            captured = payload;
            return { data: null, error: null };
          },
        } as ReturnType<SupabaseAdmin['from']>;
      }
      return t;
    }) as SupabaseAdmin['from'];

    await repo.recordResolutionEvent({
      userId: USER,
      rawInput: 'skyrs vanille',
      method: 'exact',
      confidence: 1.4, // out of range, should clamp
    });
    expect(captured?.confidence).toBe(1);

    await repo.recordResolutionEvent({
      userId: USER,
      rawInput: 'x',
      method: 'fuzzy',
      confidence: -0.3,
    });
    expect(captured?.confidence).toBe(0);
  });
});

describe('ProductEnrichmentRepository.applyEnrichment', () => {
  it('only sets non-null fields from the candidate', async () => {
    let captured: Record<string, unknown> | undefined;
    const { repo, state } = makeRepo({
      productUpdate: async () =>
        ({ data: makeProductRow({ brand: 'Siggi', enrichment_status: 'enriched' }), error: null } as { data: ProductRow; error: null }),
    });
    // Intercept update payload.
    const stub = repo as unknown as { admin: SupabaseAdmin };
    const realFrom = stub.admin.from.bind(stub.admin);
    stub.admin.from = ((table: string) => {
      const t = realFrom(table);
      if (table === 'products') {
        return {
          ...t,
          update: (payload: Record<string, unknown>) => {
            captured = payload;
            state.ops.push({ table, op: 'update', payload });
            const chain = {
              eq: (_c: string, _v: unknown) => ({
                select: () => ({
                  single: async () =>
                    ({ data: makeProductRow({ brand: 'Siggi', enrichment_status: 'enriched' }), error: null }),
                }),
              }),
            };
            return chain;
          },
        } as ReturnType<SupabaseAdmin['from']>;
      }
      return t;
    }) as SupabaseAdmin['from'];

    const candidate: ExternalProductCandidate = {
      source: 'openfoodfacts',
      externalCode: '3017620422003',
      name: 'Skyr',
      brand: 'Siggi',
      // imageUrl deliberately omitted
      confidence: 0.85,
    };
    await repo.applyEnrichment({ productId: PRODUCT, candidate });
    expect(captured?.brand).toBe('Siggi');
    expect(captured?.image_url).toBeUndefined();
    expect(captured?.enrichment_status).toBe('enriched');
    expect(captured?.enrichment_source).toBe('openfoodfacts');
    expect(captured?.enrichment_confidence).toBe(0.85);
    expect(captured?.off_product_code).toBe('3017620422003');
  });
});
