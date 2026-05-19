/**
 * Phase 3 J2 — EmbeddingService.
 *
 * Thin wrapper around OpenAI's text-embedding-3-small (1536 dims). Used
 * by the ProductResolver to support cross-lingual / synonym matching
 * ("coriander powder" ↔ "poudre de coriandre") and by the backfill
 * worker to seed `products.embedding`.
 *
 * Design notes :
 *   - Lazy SDK init mirrors createOpenAICompletionClient in
 *     imports/RecipeExtractionService.ts so a missing OPENAI_API_KEY
 *     does NOT block module import — failures surface as
 *     EmbeddingServiceError at call time with a clear message.
 *   - In-memory LRU cache (1000 entries by default) keyed by the
 *     normalized input. Whisper transcripts often repeat the same
 *     items ("oignon", "huile d'olive", …) within a single request
 *     and across requests of the same user.
 *   - generateBatch chunks at 100 inputs/call which is well under the
 *     OpenAI 2048-input limit but keeps individual requests fast and
 *     retryable.
 *   - Network errors throw EmbeddingServiceError with code='OPENAI_ERROR'
 *     so the ProductResolver can decide to skip the semantic step and
 *     fall back to fuzzy pg_trgm instead of failing the whole resolve.
 */

const DEFAULT_MODEL = 'text-embedding-3-small';
const EXPECTED_DIMENSIONS = 1536;
const DEFAULT_CACHE_SIZE = 1000;
const BATCH_CHUNK_SIZE = 100;

export class EmbeddingServiceError extends Error {
  constructor(
    readonly code: 'OPENAI_ERROR' | 'EMPTY_INPUT' | 'BAD_DIMENSIONS' | 'NO_API_KEY',
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'EmbeddingServiceError';
  }
}

export interface EmbeddingServiceOptions {
  /** OpenAI model id. Default text-embedding-3-small. */
  model?: string;
  /** Max entries kept in the LRU cache. Default 1000. */
  cacheSize?: number;
  /** Override for tests — must implement `embeddings.create`. */
  client?: OpenAILikeClient;
}

/** Minimal shape of the openai SDK we consume. Makes mocking trivial. */
export interface OpenAILikeClient {
  embeddings: {
    create(params: {
      model: string;
      input: string | string[];
    }): Promise<{
      data: Array<{ embedding: number[] }>;
      model?: string;
      usage?: { prompt_tokens?: number; total_tokens?: number };
    }>;
  };
}

/**
 * Mirror of the SQL normalisation used by products.normalized_name :
 * `lower(unaccent(trim(name)))`. We re-apply it here so the cache key
 * collapses casing/accent variants of the same input.
 */
export function normalizeForCache(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export class EmbeddingService {
  private readonly model: string;
  private readonly cacheSize: number;
  private readonly cache: Map<string, number[]>;
  private readonly clientOverride: OpenAILikeClient | undefined;
  private cachedClient: OpenAILikeClient | null = null;

  constructor(options: EmbeddingServiceOptions = {}) {
    this.model = options.model ?? DEFAULT_MODEL;
    this.cacheSize = options.cacheSize ?? DEFAULT_CACHE_SIZE;
    this.cache = new Map();
    this.clientOverride = options.client;
  }

  /** Number of currently cached entries. Mostly for tests/metrics. */
  get cacheCount(): number {
    return this.cache.size;
  }

  /**
   * Generate the embedding for a single input. Returns `null` if the
   * upstream OpenAI call fails — callers should treat that as "skip
   * semantic search" rather than a hard error, so the ProductResolver
   * pipeline can fall back to fuzzy pg_trgm transparently.
   */
  async generate(text: string): Promise<number[] | null> {
    const key = this.assertNonEmpty(text);
    const cached = this.cache.get(key);
    if (cached) {
      this.touchCache(key, cached);
      return cached;
    }

    let response;
    try {
      const client = await this.getClient();
      response = await client.embeddings.create({ model: this.model, input: key });
    } catch (err) {
      // We intentionally swallow here so the resolver pipeline can
      // degrade gracefully. The caller decides what to do.
      // eslint-disable-next-line no-console
      console.warn('[embedding] generate failed:', err);
      return null;
    }

    const vec = response.data?.[0]?.embedding;
    if (!Array.isArray(vec) || vec.length !== EXPECTED_DIMENSIONS) {
      throw new EmbeddingServiceError(
        'BAD_DIMENSIONS',
        `Expected ${EXPECTED_DIMENSIONS}-dim vector, got ${vec?.length ?? 0}.`,
      );
    }

    this.putCache(key, vec);
    return vec;
  }

  /**
   * Generate embeddings for a batch of inputs. Empty/duplicate inputs
   * collapse to the same vector. Returns a vector for every input
   * position (or null for that position if the upstream call fails for
   * that chunk — same degraded-mode semantics as generate()).
   */
  async generateBatch(texts: readonly string[]): Promise<Array<number[] | null>> {
    if (texts.length === 0) return [];

    const keys = texts.map((t) => normalizeForCache(t));
    const out: Array<number[] | null> = new Array(texts.length).fill(null);

    // 1. First pass : pull from cache.
    const misses: Array<{ key: string; positions: number[] }> = [];
    const missMap = new Map<string, number[]>();
    keys.forEach((key, idx) => {
      if (!key) return; // empty input → stays null
      const cached = this.cache.get(key);
      if (cached) {
        out[idx] = cached;
        return;
      }
      const positions = missMap.get(key);
      if (positions) {
        positions.push(idx);
      } else {
        missMap.set(key, [idx]);
      }
    });
    for (const [key, positions] of missMap) {
      misses.push({ key, positions });
    }

    if (misses.length === 0) return out;

    // 2. Chunk the unique misses and call OpenAI.
    for (let i = 0; i < misses.length; i += BATCH_CHUNK_SIZE) {
      const chunk = misses.slice(i, i + BATCH_CHUNK_SIZE);
      const inputs = chunk.map((m) => m.key);
      let response;
      try {
        const client = await this.getClient();
        response = await client.embeddings.create({
          model: this.model,
          input: inputs,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[embedding] generateBatch chunk failed:', err);
        continue; // leave those positions null, move on
      }

      response.data?.forEach((row, chunkIdx) => {
        const target = chunk[chunkIdx];
        if (!target) return;
        const vec = row.embedding;
        if (!Array.isArray(vec) || vec.length !== EXPECTED_DIMENSIONS) return;
        this.putCache(target.key, vec);
        for (const pos of target.positions) out[pos] = vec;
      });
    }

    return out;
  }

  // ---- internals ------------------------------------------------------

  private assertNonEmpty(text: string): string {
    const key = normalizeForCache(text);
    if (!key) {
      throw new EmbeddingServiceError('EMPTY_INPUT', 'Embedding input is empty.');
    }
    return key;
  }

  private async getClient(): Promise<OpenAILikeClient> {
    if (this.clientOverride) return this.clientOverride;
    if (this.cachedClient) return this.cachedClient;
    if (!process.env.OPENAI_API_KEY) {
      throw new EmbeddingServiceError(
        'NO_API_KEY',
        'OPENAI_API_KEY is not set on the server.',
      );
    }
    const mod = await import('openai');
    const OpenAI = (mod as any).default ?? (mod as any).OpenAI ?? mod;
    this.cachedClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) as OpenAILikeClient;
    return this.cachedClient;
  }

  private putCache(key: string, vec: number[]): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.cacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) this.cache.delete(oldestKey);
    }
    this.cache.set(key, vec);
  }

  private touchCache(key: string, vec: number[]): void {
    this.cache.delete(key);
    this.cache.set(key, vec);
  }
}
