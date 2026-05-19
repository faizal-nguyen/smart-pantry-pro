/**
 * ProductResolver tests — pure mocks against supabase-js builder shape.
 * No live DB, no live RPC.
 */
import {
  ProductResolver,
  ProductResolverError,
  normalizeProductName,
  type ProductRow,
} from '../ProductResolver.js';

const USER_ID = '11111111-1111-1111-1111-111111111111';

function makeProduct(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Tomate',
    category: 'fruits-legumes',
    unit_type: 'unit',
    barcode: null,
    image_url: null,
    normalized_name: 'tomate',
    source: 'user_manual',
    created_by: null,
    created_at: '2026-05-08T00:00:00Z',
    updated_at: '2026-05-08T00:00:00Z',
    ...overrides,
  };
}

interface ClientCalls {
  exactLookups: string[];
  batchLookups: string[][];
  fuzzyCalls: Array<{ p_query: string; p_limit: number }>;
  inserts: Array<Record<string, unknown>>;
}

interface ClientPlan {
  exactSingle?: ProductRow | null;
  batchRows?: ProductRow[];
  fuzzy?: Array<{ product: ProductRow; score: number }>;
  insertResult?: ProductRow;
  insertError?: { code: string; message: string };
}

function makeClient(plan: ClientPlan) {
  const calls: ClientCalls = {
    exactLookups: [],
    batchLookups: [],
    fuzzyCalls: [],
    inserts: [],
  };

  const builder: any = {
    from(table: string) {
      if (table !== 'products') throw new Error(`unexpected table ${table}`);
      const select = (_cols: string) => {
        const eqOrIn: any = {
          eq(_col: string, val: string) {
            calls.exactLookups.push(val);
            return {
              async maybeSingle() {
                return { data: plan.exactSingle ?? null, error: null };
              },
            };
          },
          in(_col: string, vals: string[]) {
            calls.batchLookups.push([...vals]);
            return Promise.resolve({ data: plan.batchRows ?? [], error: null });
          },
        };
        return eqOrIn;
      };
      return {
        select,
        insert(payload: Record<string, unknown>) {
          calls.inserts.push(payload);
          return {
            select() {
              return {
                async single() {
                  if (plan.insertError) {
                    return { data: null, error: plan.insertError };
                  }
                  return {
                    data: plan.insertResult ?? makeProduct(payload as Partial<ProductRow>),
                    error: null,
                  };
                },
              };
            },
          };
        },
      };
    },
    async rpc(name: string, args: { p_query: string; p_limit: number }) {
      if (name !== 'assistant_fuzzy_search_products') {
        throw new Error(`unexpected rpc ${name}`);
      }
      calls.fuzzyCalls.push(args);
      return { data: plan.fuzzy ?? [], error: null };
    },
  };

  return { client: builder, calls };
}

describe('normalizeProductName', () => {
  it('lowercases and strips diacritics', () => {
    expect(normalizeProductName('Tomate')).toBe('tomate');
    expect(normalizeProductName('  Crème fraîche  ')).toBe('creme fraiche');
    expect(normalizeProductName('Œufs')).toBe('œufs');
    expect(normalizeProductName('Yaourt   Grec')).toBe('yaourt grec');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeProductName('   ')).toBe('');
  });
});

describe('ProductResolver.resolve', () => {
  it('returns "matched" via exact when normalized_name hits', async () => {
    const product = makeProduct();
    const { client, calls } = makeClient({ exactSingle: product });
    const resolver = new ProductResolver(client);

    const result = await resolver.resolve(USER_ID, { name: 'Tomate' });

    expect(result).toEqual({
      kind: 'matched',
      product,
      confidence: 1,
      via: 'exact',
    });
    expect(calls.exactLookups).toEqual(['tomate']);
    expect(calls.fuzzyCalls).toHaveLength(0);
    expect(calls.inserts).toHaveLength(0);
  });

  it('returns "matched" via fuzzy when one strong candidate exists', async () => {
    const candidate = makeProduct({ id: 'p2', name: 'Tomate cerise', normalized_name: 'tomate cerise' });
    const { client } = makeClient({
      exactSingle: null,
      fuzzy: [{ product: candidate, score: 0.82 }],
    });
    const resolver = new ProductResolver(client);

    const result = await resolver.resolve(USER_ID, { name: 'tomates cerises' });

    expect(result).toEqual({
      kind: 'matched',
      product: candidate,
      confidence: 0.82,
      via: 'fuzzy',
    });
  });

  it('returns "ambiguous" when top 2 candidates are within 0.1 of each other', async () => {
    const a = makeProduct({ id: 'pa', normalized_name: 'tomate cerise' });
    const b = makeProduct({ id: 'pb', normalized_name: 'tomate ronde' });
    const { client } = makeClient({
      exactSingle: null,
      fuzzy: [
        { product: a, score: 0.85 },
        { product: b, score: 0.81 },
      ],
    });
    const resolver = new ProductResolver(client);

    const result = await resolver.resolve(USER_ID, { name: 'tomate' });

    expect(result.kind).toBe('ambiguous');
    if (result.kind === 'ambiguous') {
      expect(result.candidates).toHaveLength(2);
      expect(result.candidates.map((c) => c.product.id)).toEqual(['pa', 'pb']);
    }
  });

  it('returns "matched" when top candidate dominates by ≥ ambiguity delta', async () => {
    const a = makeProduct({ id: 'pa', normalized_name: 'tomate' });
    const b = makeProduct({ id: 'pb', normalized_name: 'tomatillo' });
    const { client } = makeClient({
      exactSingle: null,
      fuzzy: [
        { product: a, score: 0.92 },
        { product: b, score: 0.71 },
      ],
    });
    const resolver = new ProductResolver(client);

    const result = await resolver.resolve(USER_ID, { name: 'tomates' });

    expect(result.kind).toBe('matched');
    if (result.kind === 'matched') {
      expect(result.product.id).toBe('pa');
      expect(result.confidence).toBe(0.92);
    }
  });

  it('drops candidates below the fuzzy threshold', async () => {
    const a = makeProduct({ id: 'pa', normalized_name: 'tomate' });
    const created = makeProduct({ id: 'pcreated', name: 'Quinoa rouge bio', normalized_name: 'quinoa rouge bio' });
    const { client, calls } = makeClient({
      exactSingle: null,
      fuzzy: [{ product: a, score: 0.4 }], // below 0.7 default threshold
      insertResult: created,
    });
    const resolver = new ProductResolver(client);

    const result = await resolver.resolve(USER_ID, { name: 'Quinoa rouge bio' });

    expect(result).toEqual({ kind: 'created', product: created });
    expect(calls.inserts).toHaveLength(1);
    expect(calls.inserts[0]).toMatchObject({
      name: 'Quinoa rouge bio',
      source: 'assistant_auto',
      created_by: USER_ID,
    });
  });

  it('auto-creates with default category and unit_type when no hints provided', async () => {
    const created = makeProduct({ id: 'p3', name: 'Truc bizarre', normalized_name: 'truc bizarre' });
    const { client, calls } = makeClient({
      exactSingle: null,
      fuzzy: [],
      insertResult: created,
    });
    const resolver = new ProductResolver(client);

    await resolver.resolve(USER_ID, { name: 'Truc bizarre' });

    expect(calls.inserts[0]).toMatchObject({
      name: 'Truc bizarre',
      category: 'autres',
      unit_type: 'unit',
      source: 'assistant_auto',
      created_by: USER_ID,
    });
  });

  it('uses caller hints for category and unit_type when provided', async () => {
    const created = makeProduct({ name: 'Saumon frais', normalized_name: 'saumon frais' });
    const { client, calls } = makeClient({
      exactSingle: null,
      fuzzy: [],
      insertResult: created,
    });
    const resolver = new ProductResolver(client);

    await resolver.resolve(USER_ID, {
      name: 'Saumon frais',
      category: 'poissons',
      unitType: 'kg',
    });

    expect(calls.inserts[0]).toMatchObject({
      category: 'poissons',
      unit_type: 'kg',
    });
  });

  it('falls back to "matched" when INSERT loses the race (23505)', async () => {
    // Race: another concurrent resolve() created the row first.
    // First call to resolve sees no exact match, the insert collides
    // with UNIQUE(normalized_name), the resolver re-fetches and returns
    // the row that won.
    const winningProduct = makeProduct({ id: 'won', normalized_name: 'tomate' });
    let exactCalls = 0;
    const builder: any = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    exactCalls += 1;
                    // 1st call: nothing yet. 2nd call (after race): the winner.
                    return {
                      data: exactCalls === 1 ? null : winningProduct,
                      error: null,
                    };
                  },
                };
              },
            };
          },
          insert() {
            return {
              select() {
                return {
                  async single() {
                    return {
                      data: null,
                      error: { code: '23505', message: 'duplicate key' },
                    };
                  },
                };
              },
            };
          },
        };
      },
      async rpc() {
        return { data: [], error: null };
      },
    };
    const resolver = new ProductResolver(builder);

    const result = await resolver.resolve(USER_ID, { name: 'tomate' });

    expect(result).toEqual({
      kind: 'matched',
      product: winningProduct,
      confidence: 1,
      via: 'exact',
    });
  });

  it('throws EMPTY_NAME on whitespace-only input', async () => {
    const { client } = makeClient({});
    const resolver = new ProductResolver(client);

    await expect(resolver.resolve(USER_ID, { name: '   ' })).rejects.toBeInstanceOf(
      ProductResolverError
    );
  });
});

describe('ProductResolver.resolveBatch', () => {
  it('returns empty array on empty input', async () => {
    const { client } = makeClient({});
    const resolver = new ProductResolver(client);
    expect(await resolver.resolveBatch(USER_ID, [])).toEqual([]);
  });

  it('does ONE batch exact lookup, then per-item fuzzy/create for misses', async () => {
    const tomate = makeProduct({ id: 'pt', normalized_name: 'tomate' });
    const created = makeProduct({ id: 'pc', name: 'Tofu fume', normalized_name: 'tofu fume' });

    let fuzzyCallCount = 0;
    const builder: any = {
      from(_table: string) {
        return {
          select() {
            return {
              eq() {
                return { async maybeSingle() { return { data: null, error: null }; } };
              },
              in(_col: string, vals: string[]) {
                // batch exact returns "tomate" only
                expect(vals).toEqual(['tomate', 'tofu fume', 'yaourt grec']);
                return Promise.resolve({ data: [tomate], error: null });
              },
            };
          },
          insert(payload: Record<string, unknown>) {
            return {
              select() {
                return {
                  async single() {
                    return { data: { ...created, ...payload }, error: null };
                  },
                };
              },
            };
          },
        };
      },
      async rpc(_name: string, args: { p_query: string }) {
        fuzzyCallCount += 1;
        // For "tofu fume" → empty (will create); for "yaourt grec" → strong match.
        if (args.p_query === 'tofu fume') return { data: [], error: null };
        if (args.p_query === 'yaourt grec') {
          return {
            data: [{ product: makeProduct({ id: 'py', normalized_name: 'yaourt grec' }), score: 0.95 }],
            error: null,
          };
        }
        return { data: [], error: null };
      },
    };
    const resolver = new ProductResolver(builder);

    const results = await resolver.resolveBatch(USER_ID, [
      { name: 'Tomate' },
      { name: 'Tofu fume' },
      { name: 'Yaourt grec' },
    ]);

    expect(results).toHaveLength(3);
    expect(results[0].kind).toBe('matched');
    if (results[0].kind === 'matched') {
      expect(results[0].via).toBe('exact');
      expect(results[0].product.id).toBe('pt');
    }
    expect(results[1].kind).toBe('created');
    expect(results[2].kind).toBe('matched');
    if (results[2].kind === 'matched') {
      expect(results[2].via).toBe('fuzzy');
    }
    // Only the 2 misses go through fuzzy lookup
    expect(fuzzyCallCount).toBe(2);
  });
});

// =====================================================================
// Phase 3 — semantic step (EmbeddingService + cosine RPC).
// =====================================================================

const FAKE_VEC = Array.from({ length: 1536 }, (_, i) => (i % 7) / 10);

interface SemanticPlan {
  exactSingle?: ProductRow | null;
  semanticHits?: Array<{ product: ProductRow; score: number }>;
  fuzzy?: Array<{ product: ProductRow; score: number }>;
  insertResult?: ProductRow;
  /** Track UPDATEs (used for the post-insert embedding write-back). */
  updates?: Array<{ id: string; payload: Record<string, unknown> }>;
}

function makeSemanticClient(plan: SemanticPlan) {
  const rpcCalls: Array<{ name: string; args: any }> = [];
  const inserts: Array<Record<string, unknown>> = [];

  const builder: any = {
    from(table: string) {
      if (table !== 'products') throw new Error(`unexpected table ${table}`);
      return {
        select() {
          return {
            eq(_col: string, _val: string) {
              return {
                async maybeSingle() {
                  return { data: plan.exactSingle ?? null, error: null };
                },
              };
            },
          };
        },
        insert(payload: Record<string, unknown>) {
          inserts.push(payload);
          return {
            select() {
              return {
                async single() {
                  return {
                    data:
                      plan.insertResult ??
                      makeProduct(payload as Partial<ProductRow>),
                    error: null,
                  };
                },
              };
            },
          };
        },
        update(payload: Record<string, unknown>) {
          return {
            async eq(_col: string, id: string) {
              plan.updates?.push({ id, payload });
              return { error: null };
            },
          };
        },
      };
    },
    async rpc(name: string, args: any) {
      rpcCalls.push({ name, args });
      if (name === 'assistant_semantic_search_products') {
        return { data: plan.semanticHits ?? [], error: null };
      }
      if (name === 'assistant_fuzzy_search_products') {
        return { data: plan.fuzzy ?? [], error: null };
      }
      throw new Error(`unexpected rpc ${name}`);
    },
  };

  return { client: builder, rpcCalls, inserts };
}

function makeStubEmbeddingService(opts: {
  vector?: number[] | null;
  batch?: Array<number[] | null>;
}) {
  let generateCalls = 0;
  const generated: string[] = [];
  return {
    async generate(text: string) {
      generateCalls += 1;
      generated.push(text);
      return opts.vector ?? null;
    },
    async generateBatch(_texts: readonly string[]) {
      return opts.batch ?? _texts.map(() => opts.vector ?? null);
    },
    get _calls() {
      return generateCalls;
    },
    get _generated() {
      return generated;
    },
  } as any;
}

describe('ProductResolver.resolve — semantic step', () => {
  it('returns "matched" via semantic when the cosine RPC yields a confident hit', async () => {
    const semanticHit = makeProduct({
      id: 'psem',
      name: "Huile d'olive",
      normalized_name: "huile d'olive",
    });
    const { client, rpcCalls } = makeSemanticClient({
      exactSingle: null,
      semanticHits: [{ product: semanticHit, score: 0.91 }],
    });
    const embeddingService = makeStubEmbeddingService({ vector: FAKE_VEC });
    const resolver = new ProductResolver(client, { embeddingService });

    const result = await resolver.resolve(USER_ID, { name: 'olive oil' });

    expect(result.kind).toBe('matched');
    if (result.kind === 'matched') {
      expect(result.via).toBe('semantic');
      expect(result.product.id).toBe('psem');
      expect(result.confidence).toBeCloseTo(0.91);
    }
    // Semantic RPC was called, fuzzy was NOT.
    expect(rpcCalls.find((c) => c.name === 'assistant_semantic_search_products')).toBeDefined();
    expect(rpcCalls.find((c) => c.name === 'assistant_fuzzy_search_products')).toBeUndefined();
  });

  it('returns "ambiguous" when top 2 semantic candidates are within delta', async () => {
    const a = makeProduct({ id: 'pa', normalized_name: 'oignon rouge' });
    const b = makeProduct({ id: 'pb', normalized_name: 'oignon blanc' });
    const { client } = makeSemanticClient({
      exactSingle: null,
      semanticHits: [
        { product: a, score: 0.93 },
        { product: b, score: 0.9 },
      ],
    });
    const embeddingService = makeStubEmbeddingService({ vector: FAKE_VEC });
    const resolver = new ProductResolver(client, { embeddingService });

    const result = await resolver.resolve(USER_ID, { name: 'oignon' });

    expect(result.kind).toBe('ambiguous');
  });

  it('falls through to fuzzy when the semantic RPC returns nothing', async () => {
    const fuzzyHit = makeProduct({ id: 'pf', normalized_name: 'tomate cerise' });
    const { client, rpcCalls } = makeSemanticClient({
      exactSingle: null,
      semanticHits: [],
      fuzzy: [{ product: fuzzyHit, score: 0.82 }],
    });
    const embeddingService = makeStubEmbeddingService({ vector: FAKE_VEC });
    const resolver = new ProductResolver(client, { embeddingService });

    const result = await resolver.resolve(USER_ID, { name: 'tomates cerises' });

    expect(result.kind).toBe('matched');
    if (result.kind === 'matched') {
      expect(result.via).toBe('fuzzy');
    }
    expect(rpcCalls.map((c) => c.name)).toEqual([
      'assistant_semantic_search_products',
      'assistant_fuzzy_search_products',
    ]);
  });

  it('skips the semantic step entirely when the embedding service returns null', async () => {
    const fuzzyHit = makeProduct({ id: 'pf', normalized_name: 'tomate' });
    const { client, rpcCalls } = makeSemanticClient({
      exactSingle: null,
      fuzzy: [{ product: fuzzyHit, score: 0.95 }],
    });
    const embeddingService = makeStubEmbeddingService({ vector: null });
    const resolver = new ProductResolver(client, { embeddingService });

    const result = await resolver.resolve(USER_ID, { name: 'tomate' });

    expect(result.kind).toBe('matched');
    // No semantic RPC call because the embedding came back null.
    expect(rpcCalls.find((c) => c.name === 'assistant_semantic_search_products')).toBeUndefined();
  });

  it('writes the embedding back to the row after auto-creating a product', async () => {
    const created = makeProduct({ id: 'pnew', name: 'Skyr nature', normalized_name: 'skyr nature' });
    const updates: SemanticPlan['updates'] = [];
    const { client } = makeSemanticClient({
      exactSingle: null,
      semanticHits: [],
      fuzzy: [],
      insertResult: created,
      updates,
    });
    const embeddingService = makeStubEmbeddingService({ vector: FAKE_VEC });
    const resolver = new ProductResolver(client, { embeddingService });

    const result = await resolver.resolve(USER_ID, { name: 'Skyr nature' });
    expect(result.kind).toBe('created');

    // attachEmbedding runs asynchronously, give it a tick.
    await new Promise((resolve) => setImmediate(resolve));

    expect(updates).toHaveLength(1);
    expect(updates![0]?.id).toBe('pnew');
    expect(updates![0]?.payload.embedding).toBeDefined();
    expect(updates![0]?.payload.embedding_updated_at).toBeDefined();
  });
});

describe('ProductResolver.resolveBatch — semantic step', () => {
  it('runs ONE generateBatch for all misses, not N generate calls', async () => {
    const tomate = makeProduct({ id: 'pt', normalized_name: 'tomate' });
    const semanticHit = makeProduct({ id: 'psem', normalized_name: 'huile d olive' });

    let batchCalls = 0;
    const embeddingService = {
      async generate() {
        throw new Error('should not call generate in batch path');
      },
      async generateBatch(texts: readonly string[]) {
        batchCalls += 1;
        // Return a vector for every non-empty input
        return texts.map((t) => (t ? FAKE_VEC : null));
      },
    } as any;

    let rpcCalls = 0;
    const builder: any = {
      from() {
        return {
          select() {
            return {
              eq() {
                return { async maybeSingle() { return { data: null, error: null }; } };
              },
              in() {
                // exact batch lookup — tomate hits, the other miss
                return Promise.resolve({ data: [tomate], error: null });
              },
            };
          },
        };
      },
      async rpc(name: string, args: any) {
        rpcCalls += 1;
        if (name === 'assistant_semantic_search_products') {
          // Only the miss ("olive oil") triggers a semantic RPC; return a hit
          // so we don't fall through to fuzzy.
          return {
            data: [{ product: semanticHit, score: 0.9 }],
            error: null,
          };
        }
        return { data: [], error: null };
      },
    };
    const resolver = new ProductResolver(builder, { embeddingService });

    const results = await resolver.resolveBatch(USER_ID, [
      { name: 'tomate' },
      { name: 'olive oil' },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].kind).toBe('matched');
    if (results[0].kind === 'matched') expect(results[0].via).toBe('exact');
    expect(results[1].kind).toBe('matched');
    if (results[1].kind === 'matched') {
      expect(results[1].via).toBe('semantic');
      expect(results[1].product.id).toBe('psem');
    }

    expect(batchCalls).toBe(1); // single batched embedding call
    expect(rpcCalls).toBe(1); // single semantic RPC, no fuzzy
  });
});
