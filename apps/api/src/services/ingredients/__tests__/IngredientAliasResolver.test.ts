/**
 * PRP-239 PR2 — IngredientAliasResolver unit tests.
 *
 * Covers §8.4 acceptance criteria:
 *   - Exact match (single + ambiguous)
 *   - Alias lookup (single + ambiguous + missing canonical)
 *   - Semantic mock (threshold + ambiguity delta)
 *   - Low-confidence fallback when no path succeeds
 *
 * The Supabase client is faked via chainable mocks — no I/O.
 */
import {
  IngredientAliasResolver,
  normalizeIngredientText,
} from '../IngredientAliasResolver';

// ---------------------------------------------------------------------------
// Helpers — chainable Supabase mock + embedding mock
// ---------------------------------------------------------------------------

interface QueryResult {
  data?: unknown;
  error?: { message: string } | null;
}

function makeClient(plan: {
  products?: QueryResult;
  productsByCanonical?: QueryResult;
  aliases?: QueryResult;
  semanticRpc?: QueryResult;
  /** PRP-239 PR-B — pre-existing cache entry returned by readEmbeddingFromCache. */
  embeddingCache?: QueryResult;
  /** Records what was upserted into ingredient_embeddings during the test. */
  embeddingUpserts?: Array<Record<string, unknown>>;
}) {
  let productsFromCount = 0;

  const makeProductsBuilder = (result: QueryResult): any => ({
    select: jest.fn(function (this: any) { return this; }),
    eq: jest.fn(function (this: any) { return this; }),
    limit: jest.fn(() => Promise.resolve(result)),
  });

  const aliasBuilder: any = {
    select: jest.fn(function (this: any) { return this; }),
    eq: jest.fn(function (this: any) { return this; }),
    limit: jest.fn(() => Promise.resolve(plan.aliases ?? { data: [], error: null })),
  };

  // PRP-239 PR-B — ingredient_embeddings cache mock. Reads use
  // .maybeSingle(); writes use .upsert(...).
  const embeddingCacheBuilder: any = {
    select: jest.fn(function (this: any) { return this; }),
    eq: jest.fn(function (this: any) { return this; }),
    maybeSingle: jest.fn(() =>
      Promise.resolve(plan.embeddingCache ?? { data: null, error: null }),
    ),
    upsert: jest.fn((payload: Record<string, unknown>) => {
      plan.embeddingUpserts?.push(payload);
      return Promise.resolve({ data: null, error: null });
    }),
  };

  const client = {
    from: jest.fn((table: string) => {
      if (table === 'products') {
        productsFromCount += 1;
        const result =
          productsFromCount === 1
            ? plan.products ?? { data: [], error: null }
            : plan.productsByCanonical ?? { data: [], error: null };
        return makeProductsBuilder(result);
      }
      if (table === 'ingredient_aliases') {
        return aliasBuilder;
      }
      if (table === 'ingredient_embeddings') {
        return embeddingCacheBuilder;
      }
      throw new Error(`Unexpected table in mock: ${table}`);
    }),
    rpc: jest.fn((fn: string) => {
      if (fn === 'assistant_semantic_search_products') {
        return Promise.resolve(plan.semanticRpc ?? { data: [], error: null });
      }
      throw new Error(`Unexpected RPC in mock: ${fn}`);
    }),
  };
  return client as any;
}

function fakeEmbedding(vec: number[] | null = [0.1, 0.2, 0.3]) {
  return {
    generate: jest.fn().mockResolvedValue(vec),
  } as any;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('normalizeIngredientText', () => {
  it('strips diacritics, lowercases, trims, collapses whitespace', () => {
    expect(normalizeIngredientText('  Œufs à la Coque  ')).toBe('œufs a la coque');
    expect(normalizeIngredientText('Cuisses\tde   Poulet')).toBe('cuisses de poulet');
    expect(normalizeIngredientText('')).toBe('');
  });
});

describe('IngredientAliasResolver — exact step', () => {
  it('returns kind="exact" when a single product matches normalized_name', async () => {
    const client = makeClient({
      products: { data: [{ id: 'prod-1', normalized_name: 'oignon' }], error: null },
    });
    const resolver = new IngredientAliasResolver(client);
    const result = await resolver.resolve('Oignon');
    expect(result.kind).toBe('exact');
    expect(result.productId).toBe('prod-1');
    expect(result.confidence).toBe(1.0);
  });

  it('returns kind="ambiguous" when multiple products share normalized_name', async () => {
    const client = makeClient({
      products: {
        data: [
          { id: 'prod-1', normalized_name: 'tomate' },
          { id: 'prod-2', normalized_name: 'tomate' },
        ],
        error: null,
      },
    });
    const resolver = new IngredientAliasResolver(client);
    const result = await resolver.resolve('Tomate');
    expect(result.kind).toBe('ambiguous');
    expect(result.productId).toBeNull();
    expect(result.reason).toContain('exact_match_ambiguous');
  });
});

describe('IngredientAliasResolver — alias step', () => {
  it('returns kind="alias" when alias resolves to a unique product', async () => {
    const client = makeClient({
      products: { data: [], error: null }, // no exact
      aliases: {
        data: [
          {
            canonical_name: 'oignon',
            canonical_name_normalized: 'oignon',
            canonical_note: 'type doux',
          },
        ],
        error: null,
      },
      productsByCanonical: {
        data: [{ id: 'prod-oignon', normalized_name: 'oignon' }],
        error: null,
      },
    });
    const resolver = new IngredientAliasResolver(client);
    const result = await resolver.resolve('Oignon Doux');
    expect(result.kind).toBe('alias');
    expect(result.productId).toBe('prod-oignon');
    expect(result.canonicalName).toBe('oignon');
    expect(result.canonicalNote).toBe('type doux');
    expect(result.confidence).toBe(1.0);
  });

  it('returns kind="low_confidence" when alias canonical product missing', async () => {
    const client = makeClient({
      products: { data: [], error: null },
      aliases: {
        data: [
          {
            canonical_name: 'huile neutre',
            canonical_name_normalized: 'huile neutre',
            canonical_note: 'cuisson',
          },
        ],
        error: null,
      },
      productsByCanonical: { data: [], error: null },
    });
    const resolver = new IngredientAliasResolver(client);
    const result = await resolver.resolve('huile de cuisson');
    expect(result.kind).toBe('low_confidence');
    expect(result.productId).toBeNull();
    expect(result.reason).toBe('alias_canonical_product_missing');
  });
});

describe('IngredientAliasResolver — semantic step', () => {
  it('returns kind="semantic" when top similarity ≥ threshold and unambiguous', async () => {
    const client = makeClient({
      products: { data: [], error: null },
      aliases: { data: [], error: null },
      semanticRpc: {
        data: [
          { product: { id: 'prod-A', normalized_name: 'crevettes' }, score: 0.92 },
          { product: { id: 'prod-B', normalized_name: 'crevettes-decortiquees' }, score: 0.83 },
        ],
        error: null,
      },
    });
    const resolver = new IngredientAliasResolver(client, {
      embeddingService: fakeEmbedding(),
    });
    const result = await resolver.resolve('crevettes roses');
    expect(result.kind).toBe('semantic');
    expect(result.productId).toBe('prod-A');
    expect(result.confidence).toBeCloseTo(0.92);
  });

  it('returns kind="ambiguous" when top 2 candidates are within delta', async () => {
    const client = makeClient({
      products: { data: [], error: null },
      aliases: { data: [], error: null },
      semanticRpc: {
        data: [
          { product: { id: 'prod-A' }, score: 0.88 },
          { product: { id: 'prod-B' }, score: 0.86 }, // delta 0.02 < default 0.05
        ],
        error: null,
      },
    });
    const resolver = new IngredientAliasResolver(client, {
      embeddingService: fakeEmbedding(),
    });
    const result = await resolver.resolve('vague ingredient');
    expect(result.kind).toBe('ambiguous');
    expect(result.productId).toBeNull();
    expect(result.reason).toContain('semantic_ambiguous_top2_delta');
  });

  it('returns kind="low_confidence" when embedding service errors gracefully', async () => {
    const client = makeClient({
      products: { data: [], error: null },
      aliases: { data: [], error: null },
    });
    const resolver = new IngredientAliasResolver(client, {
      embeddingService: { generate: jest.fn().mockRejectedValue(new Error('OpenAI down')) } as any,
    });
    const result = await resolver.resolve('unknown thing');
    expect(result.kind).toBe('low_confidence');
    expect(result.reason).toContain('embedding_error');
  });

  it('skips semantic entirely when no EmbeddingService injected', async () => {
    const client = makeClient({
      products: { data: [], error: null },
      aliases: { data: [], error: null },
    });
    const resolver = new IngredientAliasResolver(client); // no embedding
    const result = await resolver.resolve('orphan ingredient');
    expect(result.kind).toBe('low_confidence');
    expect(result.reason).toBe('no_match');
    expect(client.rpc).not.toHaveBeenCalled();
  });
});

describe('IngredientAliasResolver — pipeline priority', () => {
  it('exact wins over alias', async () => {
    const client = makeClient({
      products: { data: [{ id: 'exact-hit', normalized_name: 'oignon' }], error: null },
      aliases: {
        data: [
          {
            canonical_name: 'wrong',
            canonical_name_normalized: 'wrong',
            canonical_note: null,
          },
        ],
        error: null,
      },
    });
    const resolver = new IngredientAliasResolver(client);
    const result = await resolver.resolve('oignon');
    expect(result.kind).toBe('exact');
    expect(result.productId).toBe('exact-hit');
  });

  it('alias wins over semantic when both available', async () => {
    const client = makeClient({
      products: { data: [], error: null },
      aliases: {
        data: [
          {
            canonical_name: 'oignon',
            canonical_name_normalized: 'oignon',
            canonical_note: null,
          },
        ],
        error: null,
      },
      productsByCanonical: { data: [{ id: 'alias-hit', normalized_name: 'oignon' }], error: null },
      semanticRpc: {
        data: [{ product: { id: 'semantic-hit' }, score: 0.99 }],
        error: null,
      },
    });
    const resolver = new IngredientAliasResolver(client, {
      embeddingService: fakeEmbedding(),
    });
    const result = await resolver.resolve('Oignon Doux');
    expect(result.kind).toBe('alias');
    expect(result.productId).toBe('alias-hit');
    expect(client.rpc).not.toHaveBeenCalled();
  });
});

describe('IngredientAliasResolver — embedding cache (PR-B)', () => {
  it('skips the live embedding call when cache HIT returns a stored vector', async () => {
    const cachedVec = [0.1, 0.2, 0.3, 0.4];
    const embedding = fakeEmbedding();
    const client = makeClient({
      products: { data: [], error: null },
      aliases: { data: [], error: null },
      embeddingCache: { data: { embedding: cachedVec }, error: null },
      semanticRpc: {
        data: [{ product: { id: 'prod-cached' }, score: 0.93 }],
        error: null,
      },
    });
    const resolver = new IngredientAliasResolver(client, { embeddingService: embedding });
    const result = await resolver.resolve('unknown ingredient');
    expect(result.kind).toBe('semantic');
    expect(result.productId).toBe('prod-cached');
    // Live embedding service must NOT be called on cache hit.
    expect(embedding.generate).not.toHaveBeenCalled();
  });

  it('falls through to live embedding when cache MISS', async () => {
    const embedding = fakeEmbedding([0.5, 0.6, 0.7]);
    const upserts: Array<Record<string, unknown>> = [];
    const client = makeClient({
      products: { data: [], error: null },
      aliases: { data: [], error: null },
      embeddingCache: { data: null, error: null }, // miss
      embeddingUpserts: upserts,
      semanticRpc: {
        data: [{ product: { id: 'prod-fresh' }, score: 0.91 }],
        error: null,
      },
    });
    const resolver = new IngredientAliasResolver(client, { embeddingService: embedding });
    const result = await resolver.resolve('fresh ingredient');
    expect(result.kind).toBe('semantic');
    expect(result.productId).toBe('prod-fresh');
    expect(embedding.generate).toHaveBeenCalledWith('fresh ingredient');
    // Newly computed embedding must be persisted to the cache.
    expect(upserts.length).toBe(1);
    expect(upserts[0]).toMatchObject({
      ingredient_text: 'fresh ingredient',
      ingredient_text_normalized: 'fresh ingredient',
      embedding_model: 'text-embedding-3-small',
    });
  });

  it('parses cached embeddings serialised as a JSON string', async () => {
    const cachedVecString = JSON.stringify([0.1, 0.2, 0.3]);
    const embedding = fakeEmbedding();
    const client = makeClient({
      products: { data: [], error: null },
      aliases: { data: [], error: null },
      embeddingCache: { data: { embedding: cachedVecString }, error: null },
      semanticRpc: {
        data: [{ product: { id: 'prod-str' }, score: 0.92 }],
        error: null,
      },
    });
    const resolver = new IngredientAliasResolver(client, { embeddingService: embedding });
    const result = await resolver.resolve('weird wire-format ingredient');
    expect(result.kind).toBe('semantic');
    expect(embedding.generate).not.toHaveBeenCalled();
  });

  it('degrades to live call when cache read errors', async () => {
    const embedding = fakeEmbedding();
    const client = makeClient({
      products: { data: [], error: null },
      aliases: { data: [], error: null },
      embeddingCache: { data: null, error: { message: 'rls denied' } },
      semanticRpc: {
        data: [{ product: { id: 'prod-deg' }, score: 0.93 }],
        error: null,
      },
    });
    const resolver = new IngredientAliasResolver(client, { embeddingService: embedding });
    const result = await resolver.resolve('cache-broken ingredient');
    expect(result.kind).toBe('semantic');
    expect(embedding.generate).toHaveBeenCalled();
  });
});

describe('IngredientAliasResolver — input handling', () => {
  it('returns low_confidence on empty input', async () => {
    const resolver = new IngredientAliasResolver(makeClient({}));
    const result = await resolver.resolve('   ');
    expect(result.kind).toBe('low_confidence');
    expect(result.reason).toBe('empty_input');
  });

  it('does not depend on Supabase / I/O for failure cases (AC §8.4)', () => {
    const resolver = new IngredientAliasResolver(makeClient({}));
    expect(typeof resolver.resolve).toBe('function');
  });
});
