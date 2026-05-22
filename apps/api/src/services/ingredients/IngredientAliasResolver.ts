/**
 * PRP-239 PR2 — IngredientAliasResolver.
 *
 * Resolves a recipe ingredient text (e.g. `"oignon doux"`, `"concombres
 * coreens ou kirby"`, `"hauts de cuisse de poulet"`) into a canonical
 * `products(id)` row from the inventory catalog. Used by the backfill
 * script and (later, V2) by the import path to populate
 * `recipe_ingredients.inventory_product_id` automatically.
 *
 * Strategy (PRP §8.2, ordered):
 *
 *   1. EXACT — `products.normalized_name = lower(unaccent(trim(text)))`.
 *      Mirror of the SQL trigger so JS normalize matches the DB index.
 *
 *   2. ALIAS — lookup `ingredient_aliases` by `alias_normalized`. If a
 *      single hit, look up the canonical product by
 *      `products.normalized_name = ingredient_aliases.canonical_name_normalized`.
 *
 *   3. SEMANTIC — embed the ingredient text via `EmbeddingService`,
 *      compare against `products.embedding` via cosine similarity.
 *      The top candidate must score ≥ 0.85 AND beat the next one by
 *      at least 0.05 to avoid silent mismatches.
 *
 *   4. UNRESOLVED — return `{ productId: null, kind: 'low_confidence' }`
 *      so the caller can flag the recipe with `low_confidence_match`
 *      (PRP §4.1 quality flag).
 *
 * Ambiguity rules :
 *   - Step 1: if multiple products share the same normalized_name (rare
 *     but possible across duplicates), return `ambiguous`.
 *   - Step 2: if alias has multiple rows for the locale, return `ambiguous`
 *     (UNIQUE constraint prevents this at write time, but a race is
 *     defensively handled).
 *   - Step 3: if the top two candidates are within 0.05 cosine, return
 *     `ambiguous`.
 *
 * No I/O outside of Supabase + optional embedding HTTP — safe to unit
 * test with mocks (PR2 §8.4 AC: "Tests unitaires couvrent aliases,
 * exact match, ambiguity, embedding mock").
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { EmbeddingService } from '../products/EmbeddingService.js';

const SEMANTIC_MIN_SCORE = 0.85;
const SEMANTIC_AMBIGUITY_DELTA = 0.05;
const SEMANTIC_LOOKUP_LIMIT = 3;

export type ResolveKind =
  | 'exact'
  | 'alias'
  | 'semantic'
  | 'ambiguous'
  | 'low_confidence';

export interface ResolvedIngredient {
  /** Canonical product id, or `null` when unresolved. */
  productId: string | null;
  /** Which path produced this result. */
  kind: ResolveKind;
  /** Canonical name as the resolver understood it (alias mapping, etc.). */
  canonicalName: string | null;
  /** 0..1. For exact/alias = 1.0. For semantic = cosine. For others = 0. */
  confidence: number;
  /** Optional note carried from `ingredient_aliases.canonical_note`. */
  canonicalNote?: string | null;
  /** Free-form reason, useful for backfill logs. */
  reason?: string;
}

interface AliasRow {
  canonical_name: string;
  canonical_name_normalized: string;
  canonical_note: string | null;
}

interface ProductRow {
  id: string;
  normalized_name: string;
}

interface SemanticCandidate {
  product: { id: string; normalized_name?: string; name?: string } | null;
  score: number;
}

export interface IngredientAliasResolverOptions {
  /** Lowered to a smaller value in tests. */
  semanticMinScore?: number;
  semanticAmbiguityDelta?: number;
  /** Provided when semantic step is desired. Without it, step 3 is skipped. */
  embeddingService?: EmbeddingService;
}

/**
 * A step's result is "definitive" when it either resolved the
 * ingredient (`exact` / `alias` / `semantic`), detected an ambiguity,
 * or hit a specific dead-end (`low_confidence` with a `reason`).
 *
 * The fall-through case is `low_confidence` with NO reason, returned
 * by `unresolved()` — meaning "this step has no opinion, try the next
 * one".
 */
function isDefinitive(r: ResolvedIngredient): boolean {
  if (r.kind !== 'low_confidence') return true;
  return r.reason !== undefined;
}

/**
 * JS mirror of the PG `lower(unaccent(trim(...)))` + whitespace collapse.
 * Same normalization the `ingredient_aliases` trigger uses.
 */
export function normalizeIngredientText(input: string): string {
  if (!input) return '';
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export class IngredientAliasResolver {
  private readonly semanticMinScore: number;
  private readonly semanticAmbiguityDelta: number;
  private readonly embeddingService?: EmbeddingService;

  constructor(
    private readonly client: SupabaseClient<any, any, any>,
    options: IngredientAliasResolverOptions = {},
  ) {
    this.semanticMinScore = options.semanticMinScore ?? SEMANTIC_MIN_SCORE;
    this.semanticAmbiguityDelta = options.semanticAmbiguityDelta ?? SEMANTIC_AMBIGUITY_DELTA;
    this.embeddingService = options.embeddingService;
  }

  /**
   * Resolve a single ingredient text → canonical product.
   */
  async resolve(ingredientText: string): Promise<ResolvedIngredient> {
    const normalized = normalizeIngredientText(ingredientText);
    if (!normalized) {
      return {
        productId: null,
        kind: 'low_confidence',
        canonicalName: null,
        confidence: 0,
        reason: 'empty_input',
      };
    }

    // ---- Step 1: exact product match ------------------------------------
    const exact = await this.exactProductMatch(normalized);
    if (isDefinitive(exact)) return exact;

    // ---- Step 2: alias → canonical product ------------------------------
    // An alias hit is authoritative even when the canonical product is
    // missing (returns `low_confidence` with a specific reason) — don't
    // shadow that signal by escalating to semantic search.
    const aliased = await this.aliasMatch(normalized);
    if (isDefinitive(aliased)) return aliased;

    // ---- Step 3: semantic (optional) ------------------------------------
    if (this.embeddingService) {
      const semantic = await this.semanticMatch(ingredientText);
      if (isDefinitive(semantic)) return semantic;
    }

    return {
      productId: null,
      kind: 'low_confidence',
      canonicalName: null,
      confidence: 0,
      reason: 'no_match',
    };
  }

  /**
   * Batch convenience. Sequential for now — the typical use case is the
   * one-shot backfill which is rate-limited by the embedding API anyway.
   * If we ever need a per-page bulk version we can fold step 1 into a
   * single `WHERE normalized_name = ANY(...)` query.
   */
  async resolveBatch(ingredientTexts: readonly string[]): Promise<ResolvedIngredient[]> {
    const out: ResolvedIngredient[] = [];
    for (const t of ingredientTexts) {
      out.push(await this.resolve(t));
    }
    return out;
  }

  // ---- Internals -----------------------------------------------------------

  private async exactProductMatch(normalized: string): Promise<ResolvedIngredient> {
    const { data, error } = await this.client
      .from('products')
      .select('id, normalized_name')
      .eq('normalized_name', normalized)
      .limit(2);

    if (error) {
      return this.failureResult('exact_lookup_error: ' + error.message);
    }
    const rows = (data ?? []) as ProductRow[];
    if (rows.length === 0) {
      return this.unresolved();
    }
    if (rows.length > 1) {
      return {
        productId: null,
        kind: 'ambiguous',
        canonicalName: normalized,
        confidence: 0,
        reason: `exact_match_ambiguous_${rows.length}`,
      };
    }
    return {
      productId: rows[0].id,
      kind: 'exact',
      canonicalName: rows[0].normalized_name,
      confidence: 1.0,
    };
  }

  private async aliasMatch(normalized: string): Promise<ResolvedIngredient> {
    const { data, error } = await this.client
      .from('ingredient_aliases')
      .select('canonical_name, canonical_name_normalized, canonical_note')
      .eq('alias_normalized', normalized)
      .limit(2);

    if (error) {
      return this.failureResult('alias_lookup_error: ' + error.message);
    }
    const rows = (data ?? []) as AliasRow[];
    if (rows.length === 0) {
      return this.unresolved();
    }
    if (rows.length > 1) {
      return {
        productId: null,
        kind: 'ambiguous',
        canonicalName: rows[0].canonical_name,
        confidence: 0,
        reason: 'alias_match_ambiguous',
      };
    }

    const alias = rows[0];
    // Look up the product by the canonical name.
    const { data: prodData, error: prodErr } = await this.client
      .from('products')
      .select('id, normalized_name')
      .eq('normalized_name', alias.canonical_name_normalized)
      .limit(2);

    if (prodErr) {
      return this.failureResult('alias_product_lookup_error: ' + prodErr.message);
    }
    const prodRows = (prodData ?? []) as ProductRow[];
    if (prodRows.length === 0) {
      // Alias known but the canonical product doesn't exist in the catalog.
      // Don't escalate to semantic — the alias mapping is authoritative;
      // return low_confidence so the caller can flag this for review.
      return {
        productId: null,
        kind: 'low_confidence',
        canonicalName: alias.canonical_name,
        canonicalNote: alias.canonical_note,
        confidence: 0,
        reason: 'alias_canonical_product_missing',
      };
    }
    if (prodRows.length > 1) {
      return {
        productId: null,
        kind: 'ambiguous',
        canonicalName: alias.canonical_name,
        canonicalNote: alias.canonical_note,
        confidence: 0,
        reason: 'alias_canonical_product_ambiguous',
      };
    }
    return {
      productId: prodRows[0].id,
      kind: 'alias',
      canonicalName: alias.canonical_name,
      canonicalNote: alias.canonical_note,
      confidence: 1.0,
    };
  }

  private async semanticMatch(rawText: string): Promise<ResolvedIngredient> {
    if (!this.embeddingService) return this.unresolved();

    // PRP-239 PR-B — consult the persistent embedding cache first.
    // Saves an OpenAI round-trip on every cache hit (~700 cold calls
    // per backfill pass before the cache exists). Cache miss / read
    // errors degrade to a live call, never block resolution.
    let embedding: number[] | null = await this.readEmbeddingFromCache(rawText);

    if (!embedding) {
      try {
        embedding = await this.embeddingService.generate(rawText);
      } catch (err) {
        return this.failureResult(
          'embedding_error: ' + (err instanceof Error ? err.message : 'unknown'),
        );
      }
      if (embedding && embedding.length > 0) {
        await this.writeEmbeddingToCache(rawText, embedding);
      }
    }

    if (!embedding || embedding.length === 0) {
      return this.unresolved();
    }

    // Real RPC signature (see migration 20260520120001):
    //   assistant_semantic_search_products(p_query vector, p_limit int, p_min_score real)
    //   RETURNS TABLE (product jsonb, score real)
    const { data, error } = await this.client.rpc('assistant_semantic_search_products', {
      p_query: embedding,
      p_limit: SEMANTIC_LOOKUP_LIMIT,
      p_min_score: this.semanticMinScore,
    });

    if (error) {
      return this.failureResult('semantic_rpc_error: ' + error.message);
    }
    const candidates = (data ?? []) as SemanticCandidate[];
    if (candidates.length === 0) {
      return this.unresolved();
    }

    const [top, second] = candidates;
    if (!top.product?.id || top.score < this.semanticMinScore) {
      return this.unresolved();
    }
    if (second && top.score - second.score < this.semanticAmbiguityDelta) {
      return {
        productId: null,
        kind: 'ambiguous',
        canonicalName: top.product.normalized_name ?? top.product.name ?? null,
        confidence: top.score,
        reason: `semantic_ambiguous_top2_delta_${(top.score - second.score).toFixed(3)}`,
      };
    }

    return {
      productId: top.product.id,
      kind: 'semantic',
      canonicalName: top.product.normalized_name ?? top.product.name ?? null,
      confidence: top.score,
    };
  }

  // ---- Embedding cache (PRP-239 PR-B) -------------------------------
  // `public.ingredient_embeddings` schema (migration 20260521120004):
  //   ingredient_text PRIMARY KEY
  //   ingredient_text_normalized TEXT NOT NULL
  //   embedding vector(1536)
  //   embedding_model TEXT
  //
  // Reads + writes are best-effort: any DB error swallows + falls
  // through to the live embedding call. This mirrors the resolver's
  // graceful-degradation stance and prevents a cache outage from
  // breaking ingredient resolution.

  private async readEmbeddingFromCache(rawText: string): Promise<number[] | null> {
    const normalized = normalizeIngredientText(rawText);
    if (!normalized) return null;
    try {
      const { data, error } = await this.client
        .from('ingredient_embeddings')
        .select('embedding')
        .eq('ingredient_text_normalized', normalized)
        .maybeSingle();
      if (error || !data?.embedding) return null;
      // Supabase serializes pgvector as either a JSON array or a
      // string like "[0.1, 0.2, …]" depending on the wire format.
      // Handle both shapes defensively.
      if (Array.isArray(data.embedding)) {
        return data.embedding as number[];
      }
      if (typeof data.embedding === 'string') {
        try {
          const parsed = JSON.parse(data.embedding);
          return Array.isArray(parsed) ? (parsed as number[]) : null;
        } catch {
          return null;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  private async writeEmbeddingToCache(rawText: string, embedding: number[]): Promise<void> {
    const normalized = normalizeIngredientText(rawText);
    if (!normalized) return;
    try {
      await this.client.from('ingredient_embeddings').upsert(
        {
          ingredient_text: rawText,
          ingredient_text_normalized: normalized,
          embedding: embedding as unknown as string, // pgvector accepts both JSON-array and stringified
          embedding_model: 'text-embedding-3-small',
          embedding_updated_at: new Date().toISOString(),
        },
        { onConflict: 'ingredient_text' },
      );
    } catch {
      // best-effort
    }
  }

  private unresolved(): ResolvedIngredient {
    return {
      productId: null,
      kind: 'low_confidence',
      canonicalName: null,
      confidence: 0,
    };
  }

  private failureResult(reason: string): ResolvedIngredient {
    return {
      productId: null,
      kind: 'low_confidence',
      canonicalName: null,
      confidence: 0,
      reason,
    };
  }
}
