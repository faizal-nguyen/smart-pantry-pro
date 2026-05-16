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
