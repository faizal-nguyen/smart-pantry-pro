/**
 * PRP-221 J2 — ProductResolver.
 *
 * Translates the agent's free-text product names ("tomate", "yaourts
 * grecs", "oignon nouveau") into stable `products(id)` rows so the
 * downstream tools (add_inventory_items, add_shopping_items, …) can
 * write through the FK without forcing the LLM to know UUIDs.
 *
 * Strategy (4 phases since Phase 3) :
 *   1. EXACT — `WHERE normalized_name = lower(unaccent(trim(name)))`.
 *      The migration trigger guarantees that side-of-disk normalized_name
 *      already follows that formula, so a pure JS normalize matches.
 *   2. SEMANTIC — `assistant_semantic_search_products` RPC, cosine
 *      similarity on a 1536-dim OpenAI embedding. Catches cross-lingual
 *      and synonym variants ("olive oil" ↔ "huile d'olive",
 *      "coriander powder" ↔ "poudre de coriandre") that the trigram
 *      step can't reach. Skipped when no EmbeddingService is injected
 *      or when the upstream embedding call fails (graceful fallback).
 *   3. FUZZY — `assistant_fuzzy_search_products` RPC (pg_trgm
 *      similarity ≥ 0.3, GIN-indexed). Up to 5 candidates ordered by
 *      score. The resolver applies its own 0.7 default cutoff, and
 *      returns `ambiguous` when the top 2 candidates are within 0.1
 *      of each other.
 *   4. CREATE — INSERT a brand-new product with `source='assistant_auto'`
 *      and `created_by=user_id`. Race-safe: if a parallel resolve()
 *      created the same normalized_name, the UNIQUE INDEX rejects with
 *      23505, we re-SELECT and return the row that won. The embedding
 *      for the new row is computed best-effort after the INSERT so the
 *      next caller picks it up via the semantic path.
 *
 * Design decisions :
 *   - Pure JS normalization mirrors the SQL trigger
 *     (`lower(unaccent(trim(name)))`). No round-trip needed for the
 *     exact lookup.
 *   - The resolver does NOT classify category or unit_type via LLM in
 *     V1. It accepts hints from the caller (the agent's tool args) and
 *     defaults to 'autres' / 'unit' otherwise. GPT-based categorization
 *     is V2 (saves 1 model call per new product).
 *   - Batch resolve does ONE multi-row exact lookup, then per-item
 *     semantic+fuzzy for the misses.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { EmbeddingService } from '../products/EmbeddingService.js';

const FUZZY_MATCH_THRESHOLD = 0.7;
const SEMANTIC_MATCH_THRESHOLD = 0.85;
const AMBIGUITY_DELTA = 0.1;
const FUZZY_LOOKUP_LIMIT = 5;
const SEMANTIC_LOOKUP_LIMIT = 5;

export interface ProductRow {
  id: string;
  name: string;
  category: string;
  unit_type: string;
  barcode: string | null;
  image_url: string | null;
  normalized_name: string;
  source: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResolveInput {
  /** Free-text product name as the agent received it. */
  name: string;
  /** Optional category hint from the agent. Defaults to 'autres'. */
  category?: string;
  /** Optional unit hint. Defaults to 'unit'. */
  unitType?: string;
}

export type ResolveResult =
  | {
      kind: 'matched';
      product: ProductRow;
      confidence: number;
      via: 'exact' | 'fuzzy' | 'semantic';
    }
  | {
      kind: 'ambiguous';
      candidates: Array<{ product: ProductRow; score: number }>;
    }
  | { kind: 'created'; product: ProductRow };

export interface ProductResolverOptions {
  /** Minimum similarity to accept a fuzzy match. Default 0.7. */
  fuzzyThreshold?: number;
  /** Minimum cosine similarity to accept a semantic match. Default 0.85. */
  semanticThreshold?: number;
  /** Difference below which the top 2 candidates are ambiguous. Default 0.1. */
  ambiguityDelta?: number;
  /** Default category for auto-created products. Default 'autres'. */
  defaultCategory?: string;
  /** Default unit_type for auto-created products. Default 'unit'. */
  defaultUnitType?: string;
  /**
   * Optional embedding service for the semantic-search step. When
   * absent (e.g. legacy callers, tests) the resolver still works using
   * exact + fuzzy only.
   */
  embeddingService?: EmbeddingService;
}

/**
 * Pure JS mirror of the SQL trigger `lower(unaccent(trim(name)))`.
 * The normalized_name in the DB is always derived this way, so we can
 * safely compare client-computed strings against the DB values.
 */
export function normalizeProductName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export class ProductResolverError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ProductResolverError';
  }
}

export class ProductResolver {
  private readonly fuzzyThreshold: number;
  private readonly semanticThreshold: number;
  private readonly ambiguityDelta: number;
  private readonly defaultCategory: string;
  private readonly defaultUnitType: string;
  private readonly embeddingService: EmbeddingService | undefined;

  constructor(
    private readonly client: SupabaseClient<any, any, any>,
    options: ProductResolverOptions = {}
  ) {
    this.fuzzyThreshold = options.fuzzyThreshold ?? FUZZY_MATCH_THRESHOLD;
    this.semanticThreshold = options.semanticThreshold ?? SEMANTIC_MATCH_THRESHOLD;
    this.ambiguityDelta = options.ambiguityDelta ?? AMBIGUITY_DELTA;
    this.defaultCategory = options.defaultCategory ?? 'autres';
    this.defaultUnitType = options.defaultUnitType ?? 'unit';
    this.embeddingService = options.embeddingService;
  }

  async resolve(userId: string, input: ResolveInput): Promise<ResolveResult> {
    const normalized = normalizeProductName(input.name);
    if (!normalized) {
      throw new ProductResolverError(
        'EMPTY_NAME',
        'Product name is empty after normalization.'
      );
    }

    const exact = await this.findExact(normalized);
    if (exact) {
      return { kind: 'matched', product: exact, confidence: 1, via: 'exact' };
    }

    const semantic = await this.findSemantic(normalized);
    const semanticVerdict = this.classifySemantic(semantic);
    if (semanticVerdict) return semanticVerdict;

    const candidates = await this.findFuzzy(normalized);
    return this.classifyFuzzyOrCreate(userId, input, candidates);
  }

  async resolveBatch(
    userId: string,
    inputs: readonly ResolveInput[]
  ): Promise<ResolveResult[]> {
    if (inputs.length === 0) return [];

    const normalizedKeys = inputs.map((i) => normalizeProductName(i.name));
    const exactMap = await this.findExactBatch(normalizedKeys);

    // Pre-compute embeddings for the items that missed the exact path.
    // generateBatch dedups and caches internally, so calling it here
    // saves N round-trips when several items share a normalised key.
    const missIdx: number[] = [];
    const missKeys: string[] = [];
    inputs.forEach((_, idx) => {
      const key = normalizedKeys[idx];
      if (!key) return;
      if (!exactMap.has(key)) {
        missIdx.push(idx);
        missKeys.push(key);
      }
    });

    const embeddings: Array<number[] | null> =
      this.embeddingService && missKeys.length > 0
        ? await this.embeddingService.generateBatch(missKeys)
        : new Array(missKeys.length).fill(null);

    const embeddingFor = new Map<number, number[] | null>();
    missIdx.forEach((idx, i) => embeddingFor.set(idx, embeddings[i] ?? null));

    return Promise.all(
      inputs.map(async (input, idx) => {
        const key = normalizedKeys[idx];
        if (!key) {
          throw new ProductResolverError(
            'EMPTY_NAME',
            `Empty product name at index ${idx}.`
          );
        }
        const exact = exactMap.get(key);
        if (exact) {
          return { kind: 'matched', product: exact, confidence: 1, via: 'exact' as const };
        }

        const embedding = embeddingFor.get(idx) ?? null;
        if (embedding) {
          const semantic = await this.findSemanticByVector(embedding);
          const semanticVerdict = this.classifySemantic(semantic);
          if (semanticVerdict) return semanticVerdict;
        }

        const candidates = await this.findFuzzy(key);
        return this.classifyFuzzyOrCreate(userId, input, candidates);
      })
    );
  }

  // ---- internals -------------------------------------------------------

  private async classifyFuzzyOrCreate(
    userId: string,
    input: ResolveInput,
    candidates: Array<{ product: ProductRow; score: number }>
  ): Promise<ResolveResult> {
    const aboveThreshold = candidates.filter((c) => c.score >= this.fuzzyThreshold);

    if (aboveThreshold.length === 0) {
      return this.create(userId, input);
    }

    if (aboveThreshold.length === 1) {
      const c = aboveThreshold[0];
      return { kind: 'matched', product: c.product, confidence: c.score, via: 'fuzzy' };
    }

    const top = aboveThreshold[0];
    const second = aboveThreshold[1];
    if (top.score - second.score < this.ambiguityDelta) {
      return { kind: 'ambiguous', candidates: aboveThreshold };
    }
    return { kind: 'matched', product: top.product, confidence: top.score, via: 'fuzzy' };
  }

  private async findExact(normalized: string): Promise<ProductRow | null> {
    const { data, error } = await this.client
      .from('products')
      .select('*')
      .eq('normalized_name', normalized)
      .maybeSingle();
    if (error) throw error;
    return (data as ProductRow | null) ?? null;
  }

  private async findExactBatch(normalized: readonly string[]): Promise<Map<string, ProductRow>> {
    const out = new Map<string, ProductRow>();
    const unique = Array.from(new Set(normalized.filter(Boolean)));
    if (unique.length === 0) return out;

    const { data, error } = await this.client
      .from('products')
      .select('*')
      .in('normalized_name', unique);
    if (error) throw error;

    for (const row of (data ?? []) as ProductRow[]) {
      out.set(row.normalized_name, row);
    }
    return out;
  }

  private async findFuzzy(
    normalized: string
  ): Promise<Array<{ product: ProductRow; score: number }>> {
    const { data, error } = await this.client.rpc('assistant_fuzzy_search_products', {
      p_query: normalized,
      p_limit: FUZZY_LOOKUP_LIMIT,
    });
    if (error) throw error;
    return ((data ?? []) as Array<{ product: ProductRow; score: number }>);
  }

  /**
   * Generate an embedding for the normalised query and run the semantic
   * RPC. Returns an empty array (so the caller falls through to fuzzy)
   * when no EmbeddingService is wired or when the embedding call fails.
   */
  private async findSemantic(
    normalized: string
  ): Promise<Array<{ product: ProductRow; score: number }>> {
    if (!this.embeddingService) return [];
    const embedding = await this.embeddingService.generate(normalized);
    if (!embedding) return [];
    return this.findSemanticByVector(embedding);
  }

  private async findSemanticByVector(
    embedding: number[]
  ): Promise<Array<{ product: ProductRow; score: number }>> {
    try {
      const { data, error } = await this.client.rpc('assistant_semantic_search_products', {
        p_query: embedding as unknown as string, // supabase-js serialises this as a pgvector literal
        p_limit: SEMANTIC_LOOKUP_LIMIT,
        p_min_score: this.semanticThreshold,
      });
      if (error) {
        // eslint-disable-next-line no-console
        console.warn('[ProductResolver] semantic RPC failed, falling through to fuzzy:', error);
        return [];
      }
      return ((data ?? []) as Array<{ product: ProductRow; score: number }>);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[ProductResolver] semantic RPC threw, falling through to fuzzy:', err);
      return [];
    }
  }

  /**
   * Verdict for the semantic candidates. Returns null when nothing is
   * confident enough (caller should fall through to fuzzy). The RPC
   * already filters by `p_min_score` server-side, so by the time we
   * see candidates here they all clear the semantic threshold.
   */
  private classifySemantic(
    candidates: Array<{ product: ProductRow; score: number }>
  ): ResolveResult | null {
    if (candidates.length === 0) return null;

    if (candidates.length === 1) {
      const c = candidates[0];
      return { kind: 'matched', product: c.product, confidence: c.score, via: 'semantic' };
    }

    const [top, second] = candidates;
    if (top.score - second.score < this.ambiguityDelta) {
      return { kind: 'ambiguous', candidates };
    }
    return { kind: 'matched', product: top.product, confidence: top.score, via: 'semantic' };
  }

  private async create(userId: string, input: ResolveInput): Promise<ResolveResult> {
    const cleanName = input.name.trim();
    if (!cleanName) {
      throw new ProductResolverError('EMPTY_NAME', 'Cannot create product with empty name.');
    }

    const insertPayload = {
      name: cleanName,
      category: input.category?.trim() || this.defaultCategory,
      unit_type: input.unitType?.trim() || this.defaultUnitType,
      source: 'assistant_auto',
      created_by: userId,
    };

    const { data, error } = await this.client
      .from('products')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      // Race lost: another resolve() created the same normalized_name
      // between our findExact and now. Re-fetch and treat as match.
      if ((error as { code?: string }).code === '23505') {
        const fallback = await this.findExact(normalizeProductName(cleanName));
        if (fallback) {
          return { kind: 'matched', product: fallback, confidence: 1, via: 'exact' };
        }
      }
      throw error;
    }

    const created = data as ProductRow;

    // Best-effort: generate the embedding for the new product so the
    // next caller picks it up via the semantic path. We don't block
    // the response on this — a network failure here just leaves the
    // embedding NULL until the backfill worker picks it up.
    if (this.embeddingService) {
      void this.attachEmbedding(created);
    }

    return { kind: 'created', product: created };
  }

  private async attachEmbedding(product: ProductRow): Promise<void> {
    try {
      const vec = await this.embeddingService!.generate(product.name);
      if (!vec) return;
      const { error } = await this.client
        .from('products')
        .update({
          embedding: vec as unknown as string,
          embedding_updated_at: new Date().toISOString(),
        })
        .eq('id', product.id);
      if (error) {
        // eslint-disable-next-line no-console
        console.warn('[ProductResolver] embedding UPDATE failed:', error);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[ProductResolver] attachEmbedding threw:', err);
    }
  }
}
