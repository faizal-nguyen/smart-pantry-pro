/**
 * PRP-221 J2 — ProductResolver.
 *
 * Translates the agent's free-text product names ("tomate", "yaourts
 * grecs", "oignon nouveau") into stable `products(id)` rows so the
 * downstream tools (add_inventory_items, add_shopping_items, …) can
 * write through the FK without forcing the LLM to know UUIDs.
 *
 * Strategy (3 phases) :
 *   1. EXACT — `WHERE normalized_name = lower(unaccent(trim(name)))`.
 *      The migration trigger guarantees that side-of-disk normalized_name
 *      already follows that formula, so a pure JS normalize matches.
 *   2. FUZZY — `assistant_fuzzy_search_products` RPC (pg_trgm
 *      similarity ≥ 0.3, GIN-indexed). Up to 5 candidates ordered by
 *      score. The resolver applies its own 0.7 default cutoff, and
 *      returns `ambiguous` when the top 2 candidates are within 0.1
 *      of each other.
 *   3. CREATE — INSERT a brand-new product with `source='assistant_auto'`
 *      and `created_by=user_id`. Race-safe: if a parallel resolve()
 *      created the same normalized_name, the UNIQUE INDEX rejects with
 *      23505, we re-SELECT and return the row that won.
 *
 * Design decisions :
 *   - Pure JS normalization mirrors the SQL trigger
 *     (`lower(unaccent(trim(name)))`). No round-trip needed for the
 *     exact lookup.
 *   - The resolver does NOT classify category or unit_type via LLM in
 *     V1. It accepts hints from the caller (the agent's tool args) and
 *     defaults to 'autres' / 'unit' otherwise. GPT-based categorization
 *     is V2 (saves 1 model call per new product).
 *   - Batch resolve does ONE multi-row exact lookup, then per-item fuzzy
 *     for the misses. For 5-10 items per voice command the per-item
 *     fuzzy is a tiny cost (~ms per query, GIN index).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

const FUZZY_MATCH_THRESHOLD = 0.7;
const AMBIGUITY_DELTA = 0.1;
const FUZZY_LOOKUP_LIMIT = 5;

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
      via: 'exact' | 'fuzzy';
    }
  | {
      kind: 'ambiguous';
      candidates: Array<{ product: ProductRow; score: number }>;
    }
  | { kind: 'created'; product: ProductRow };

export interface ProductResolverOptions {
  /** Minimum similarity to accept a fuzzy match. Default 0.7. */
  fuzzyThreshold?: number;
  /** Difference below which the top 2 candidates are ambiguous. Default 0.1. */
  ambiguityDelta?: number;
  /** Default category for auto-created products. Default 'autres'. */
  defaultCategory?: string;
  /** Default unit_type for auto-created products. Default 'unit'. */
  defaultUnitType?: string;
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
  private readonly ambiguityDelta: number;
  private readonly defaultCategory: string;
  private readonly defaultUnitType: string;

  constructor(
    private readonly client: SupabaseClient<any, any, any>,
    options: ProductResolverOptions = {}
  ) {
    this.fuzzyThreshold = options.fuzzyThreshold ?? FUZZY_MATCH_THRESHOLD;
    this.ambiguityDelta = options.ambiguityDelta ?? AMBIGUITY_DELTA;
    this.defaultCategory = options.defaultCategory ?? 'autres';
    this.defaultUnitType = options.defaultUnitType ?? 'unit';
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

    return { kind: 'created', product: data as ProductRow };
  }
}
