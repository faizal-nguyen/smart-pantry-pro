/**
 * PRP-226 PR3 — RecommendationEventWriter.
 *
 * Persists every recommendation call into:
 *   - `recommendation_events` (audit + V2 learning),
 *   - `recipe_recommendation_cache` (15-min user-scoped scoring cache),
 *   - `recipe_interactions` (PR4 + PR6: action log per recipe).
 *
 * Pattern miroir de `ProductEnrichmentRepository` (PRP-225 PR2) but
 * **user-scoped** — uses the per-request `userClient` so RLS enforces
 * ownership. The cache `DELETE` invalidation runs via the admin
 * client (no policy on delete = service-role only).
 *
 * Hard rules :
 *   - Writer failures must NEVER break the engine flow ; callers
 *     swallow exceptions and `console.error` them.
 *   - Results stored in `recommendation_events.results` are capped to
 *     the top-N recipes to keep the JSONB column small.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../types/supabase.js';
import type {
  RecommendedRecipeView,
  RecommendationContext,
  RecommendationResult,
} from './types.js';

// ---- Cache TTLs (PRP-226 §8.2 + §12 PR3) ---------------------------

export const CACHE_TTL_MS = {
  /** Default scoring cache TTL — 15 minutes. */
  scoringResult: 15 * 60 * 1000,
} as const;

/** Cap on how many recipe ids land in `recommendation_events.results`. */
const MAX_RESULTS_PER_EVENT = 10;

// ---- Public types --------------------------------------------------

export type RecipeInteractionType =
  | 'viewed'
  | 'recommended'
  | 'accepted'
  | 'dismissed'
  | 'cooked'
  | 'added_missing_to_shopping'
  | 'planned';

export interface RecordEventInput {
  userId: string;
  conversationId?: string | null;
  assistantMessageId?: string | null;
  requestText?: string | null;
  context: RecommendationContext;
  result: RecommendationResult;
}

export interface RecordInteractionInput {
  userId: string;
  recipeId?: string | null;
  recommendationEventId?: string | null;
  type: RecipeInteractionType;
  metadata?: Record<string, unknown>;
}

export interface CacheReadResult {
  hit: { result: RecommendationResult; eventId?: string } | null;
  expired: boolean;
}

// ---- Writer --------------------------------------------------------

export class RecommendationEventWriter {
  /**
   * @param userClient  per-request Supabase client bound to the user's
   *                    auth context. Used for SELECT + INSERT + UPDATE
   *                    so RLS enforces ownership.
   * @param adminClient optional service-role client, used only for
   *                    DELETE during cache invalidation (no policy on
   *                    delete by design).
   * @param now         injectable clock for tests.
   */
  constructor(
    private readonly userClient: SupabaseClient<Database>,
    private readonly adminClient?: SupabaseClient<Database>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  // ---- recommendation_events ---------------------------------------

  /**
   * Insert one row per recommendation call. Returns the new `event_id`
   * so the caller can echo it in the assistant response metadata (PR4).
   *
   * `results` is capped at MAX_RESULTS_PER_EVENT recipes (id + score
   * only — full payload lives elsewhere) so the JSONB column stays
   * small even with verbose tool results.
   */
  async recordEvent(input: RecordEventInput): Promise<string> {
    const ids = [
      ...input.result.cookable_now.map(toResultRow),
      ...input.result.almost_cookable.map(toResultRow),
    ].slice(0, MAX_RESULTS_PER_EVENT);
    const candidateCount =
      input.result.cookable_now.length +
      input.result.almost_cookable.length +
      input.result.recent_suggestions.length;

    type EventInsert = Database['public']['Tables']['recommendation_events']['Insert'];
    const payload: EventInsert = {
      user_id: input.userId,
      conversation_id: input.conversationId ?? null,
      assistant_message_id: input.assistantMessageId ?? null,
      request_text: input.requestText ?? null,
      context: sanitiseContext(input.context) as unknown as EventInsert['context'],
      candidate_count: candidateCount,
      results: ids as unknown as EventInsert['results'],
    };
    const { data, error } = await this.userClient
      .from('recommendation_events')
      .insert(payload)
      .select('id')
      .single();
    if (error || !data) {
      throw error ?? new Error('recommendation_events insert returned no row');
    }
    return data.id;
  }

  // ---- recipe_interactions ----------------------------------------

  async recordInteraction(input: RecordInteractionInput): Promise<void> {
    const { error } = await this.userClient.from('recipe_interactions').insert({
      user_id: input.userId,
      recipe_id: input.recipeId ?? null,
      recommendation_event_id: input.recommendationEventId ?? null,
      interaction_type: input.type,
      metadata: (input.metadata ??
        {}) as Database['public']['Tables']['recipe_interactions']['Insert']['metadata'],
    });
    if (error) throw error;
  }

  // ---- recipe_recommendation_cache --------------------------------

  async readCache(userId: string, cacheKey: string): Promise<CacheReadResult> {
    const { data, error } = await this.userClient
      .from('recipe_recommendation_cache')
      .select('result_json, expires_at')
      .eq('user_id', userId)
      .eq('cache_key', cacheKey)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { hit: null, expired: false };
    const expired = new Date(data.expires_at).getTime() < this.now().getTime();
    return {
      hit: { result: data.result_json as unknown as RecommendationResult },
      expired,
    };
  }

  async writeCache(opts: {
    userId: string;
    cacheKey: string;
    payload: RecommendationResult;
    ttlMs?: number;
  }): Promise<void> {
    const ttl = opts.ttlMs ?? CACHE_TTL_MS.scoringResult;
    const expiresAt = new Date(this.now().getTime() + ttl).toISOString();
    const { error } = await this.userClient
      .from('recipe_recommendation_cache')
      .upsert(
        {
          user_id: opts.userId,
          cache_key: opts.cacheKey,
          result_json:
            opts.payload as unknown as Database['public']['Tables']['recipe_recommendation_cache']['Insert']['result_json'],
          expires_at: expiresAt,
        },
        { onConflict: 'user_id,cache_key' },
      );
    if (error) throw error;
  }

  /**
   * Drop every cache row for the user. Called from the assistant write
   * handlers after a mutation that could change recommendations
   * (`add_inventory_items`, `consume_inventory_items`,
   * `add_recipe_to_meal_plan`, etc.). Uses the admin client because
   * the table has no DELETE policy.
   *
   * Returns the number of rows removed (0 when no admin client or no
   * rows to delete).
   */
  async invalidateUserCache(userId: string): Promise<number> {
    if (!this.adminClient) return 0;
    const { data, error } = await this.adminClient
      .from('recipe_recommendation_cache')
      .delete()
      .eq('user_id', userId)
      .select('id');
    if (error) throw error;
    return (data ?? []).length;
  }

  /**
   * Opportunistic global purge of expired rows. Called from any cache
   * write to keep the table breathable — bounded to 50 rows to avoid
   * a runaway DELETE. Best-effort : silent on failure.
   */
  async purgeExpired(): Promise<number> {
    if (!this.adminClient) return 0;
    const cutoff = this.now().toISOString();
    try {
      const { data, error } = await this.adminClient
        .from('recipe_recommendation_cache')
        .delete()
        .lt('expires_at', cutoff)
        .select('id')
        .limit(50);
      if (error) throw error;
      return (data ?? []).length;
    } catch {
      // Best-effort — never block the caller.
      return 0;
    }
  }
}

// ---- Helpers -------------------------------------------------------

function toResultRow(r: RecommendedRecipeView): { id: string; score: number } {
  return { id: r.id, score: r.score_total };
}

/**
 * Strip free-text fields from the context before storing — keeps the
 * JSONB column small and avoids logging anything the user might
 * consider PII beyond what they already gave the assistant.
 */
function sanitiseContext(ctx: RecommendationContext): Record<string, unknown> {
  const { requestText, ...rest } = ctx;
  void requestText; // logged on the dedicated request_text column instead
  return rest;
}

// ---- Cache key builder ---------------------------------------------

/**
 * Stable cache key for a recommendation call. Order matters — fields
 * are serialised in alphabetical order so the same context always
 * produces the same key regardless of how the caller built it.
 */
export function buildRecommendationCacheKey(ctx: RecommendationContext): string {
  const stable: Record<string, unknown> = {};
  const fields: Array<keyof RecommendationContext> = [
    'almostThreshold',
    'goal',
    'includeRecentFallback',
    'limitPerBucket',
    'mealType',
    'nearExpiryDays',
    'query',
    'servings',
    'timeLimitMinutes',
  ];
  for (const f of fields) {
    if (ctx[f] !== undefined) stable[f] = ctx[f];
  }
  return `reco:${JSON.stringify(stable)}`;
}
