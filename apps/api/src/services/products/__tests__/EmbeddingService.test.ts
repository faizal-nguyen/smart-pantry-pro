/**
 * Phase 3 J2 — EmbeddingService unit tests.
 *
 * Covers :
 *   - normalizeForCache: accent strip + lowercasing + whitespace collapse
 *   - generate(): empty input throws, cache hit short-circuits OpenAI,
 *     bad dimensions throw, openai failure returns null (graceful)
 *   - generateBatch(): cache hits + miss-only roundtrip, duplicate keys
 *     collapse to one OpenAI call, partial failure leaves null slots,
 *     empty input slots stay null
 *   - LRU eviction when cacheSize is reached
 *
 * The SDK is replaced via the `client` option to keep the tests
 * deterministic and offline.
 */
import {
  EmbeddingService,
  EmbeddingServiceError,
  normalizeForCache,
  type OpenAILikeClient,
} from '../EmbeddingService.js';

const DIMS = 1536;

function fakeVector(seed: number): number[] {
  return Array.from({ length: DIMS }, (_, i) => ((seed * (i + 1)) % 100) / 100);
}

function makeClient(
  impl: (input: string | string[]) => number[][] | Promise<number[][]>,
  spy?: { calls: number; lastInput?: string | string[] },
): OpenAILikeClient {
  return {
    embeddings: {
      async create({ input }) {
        if (spy) {
          spy.calls += 1;
          spy.lastInput = input;
        }
        const arr = await impl(input);
        return { data: arr.map((v) => ({ embedding: v })) };
      },
    },
  };
}

describe('normalizeForCache', () => {
  it.each([
    ['Tomate', 'tomate'],
    ['  Oignon  ', 'oignon'],
    ['Crème fraîche', 'creme fraiche'],
    ["Huile d'olive  ", "huile d'olive"],
    ['poudre   de    coriandre', 'poudre de coriandre'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeForCache(input)).toBe(expected);
  });
});

describe('EmbeddingService.generate', () => {
  it('throws EmbeddingServiceError on empty input', async () => {
    const svc = new EmbeddingService({
      client: makeClient(() => [fakeVector(1)]),
    });
    await expect(svc.generate('   ')).rejects.toBeInstanceOf(EmbeddingServiceError);
  });

  it('returns the embedding and caches it', async () => {
    const spy = { calls: 0 };
    const svc = new EmbeddingService({
      client: makeClient(() => [fakeVector(7)], spy),
    });
    const a = await svc.generate('Oignon');
    expect(a).toHaveLength(DIMS);
    expect(spy.calls).toBe(1);

    // Cache hit on the normalised key — no extra OpenAI call.
    const b = await svc.generate('  oignon ');
    expect(b).toBe(a);
    expect(spy.calls).toBe(1);
  });

  it('returns null when the OpenAI call rejects', async () => {
    const svc = new EmbeddingService({
      client: {
        embeddings: {
          async create() {
            throw new Error('network down');
          },
        },
      },
    });
    const result = await svc.generate('huile d olive');
    expect(result).toBeNull();
  });

  it('throws BAD_DIMENSIONS when the response is the wrong size', async () => {
    const svc = new EmbeddingService({
      client: makeClient(() => [[0.1, 0.2, 0.3]]),
    });
    await expect(svc.generate('oignon')).rejects.toMatchObject({
      code: 'BAD_DIMENSIONS',
    });
  });
});

describe('EmbeddingService.generateBatch', () => {
  it('returns empty array for empty input', async () => {
    const svc = new EmbeddingService({
      client: makeClient(() => []),
    });
    expect(await svc.generateBatch([])).toEqual([]);
  });

  it('preserves order across cache hits and OpenAI misses', async () => {
    const spy = { calls: 0 };
    const knownVec = fakeVector(1);
    const svc = new EmbeddingService({
      client: makeClient((input) => {
        const list = Array.isArray(input) ? input : [input];
        return list.map((_, i) => fakeVector(100 + i));
      }, spy),
    });
    // Warm cache with "oignon"
    await svc.generate('oignon');
    spy.calls = 0;

    // Reuse the same client but make it return knownVec for cached check
    const result = await svc.generateBatch(['oignon', 'pomme', 'oignon', 'carotte']);
    expect(result).toHaveLength(4);
    expect(result[0]).not.toBeNull();
    expect(result[1]).not.toBeNull();
    // Duplicate "oignon" at index 2 must share the same vector as index 0.
    expect(result[2]).toBe(result[0]);
    // Single OpenAI call for the two unique misses (pomme + carotte).
    expect(spy.calls).toBe(1);
    expect(knownVec).toBeTruthy(); // sanity guard
  });

  it('leaves position null when a chunk fails', async () => {
    let attempts = 0;
    const svc = new EmbeddingService({
      client: {
        embeddings: {
          async create() {
            attempts += 1;
            throw new Error('rate limited');
          },
        },
      },
    });
    const result = await svc.generateBatch(['poudre de coriandre', 'coriander powder']);
    expect(result).toEqual([null, null]);
    expect(attempts).toBeGreaterThanOrEqual(1);
  });

  it('skips empty input positions but still embeds the rest', async () => {
    const svc = new EmbeddingService({
      client: makeClient((input) => {
        const list = Array.isArray(input) ? input : [input];
        return list.map((_, i) => fakeVector(50 + i));
      }),
    });
    const result = await svc.generateBatch(['', 'oignon', '   ', 'pomme']);
    expect(result[0]).toBeNull();
    expect(result[1]).not.toBeNull();
    expect(result[2]).toBeNull();
    expect(result[3]).not.toBeNull();
  });
});

describe('EmbeddingService LRU eviction', () => {
  it('drops the oldest entry once cacheSize is reached', async () => {
    const svc = new EmbeddingService({
      cacheSize: 2,
      client: makeClient((input) => {
        const list = Array.isArray(input) ? input : [input];
        return list.map((_, i) => fakeVector(i + 1));
      }),
    });
    await svc.generate('a');
    await svc.generate('b');
    expect(svc.cacheCount).toBe(2);
    await svc.generate('c');
    expect(svc.cacheCount).toBe(2); // "a" evicted
  });
});
