/**
 * PRP-226 PR3 — RecommendationEventWriter unit tests.
 *
 * Mocks Supabase client at the chain-builder level (pattern mirroring
 * `read.test.ts` / PRP-223). Covers :
 *   - recordEvent : capped results, candidate_count sum, returns id
 *   - recordInteraction : metadata default {}, type pass-through
 *   - readCache : null / fresh hit / expired hit
 *   - writeCache : upsert with TTL
 *   - invalidateUserCache : admin client required, returns count
 *   - sanitiseContext : requestText stripped before storage
 *   - buildRecommendationCacheKey : deterministic, alphabetical
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../../types/supabase.js';
import {
  buildRecommendationCacheKey,
  CACHE_TTL_MS,
  RecommendationEventWriter,
} from '../RecommendationEventWriter.js';
import type {
  RecommendationContext,
  RecommendationResult,
  RecommendedRecipeView,
} from '../types.js';

const USER = '11111111-1111-1111-1111-111111111111';
const NOW = new Date('2026-05-17T10:00:00Z');

function makeRecipe(id: string, score: number): RecommendedRecipeView {
  return {
    id,
    name: `Recipe ${id}`,
    prep_time: 10,
    cook_time: 0,
    image_url: null,
    total_essential: 2,
    linked_essential: 2,
    missing_count: 0,
    missing_ingredients: [],
    unlinked: false,
    unlinked_count: 0,
    description: null,
    servings: 2,
    cuisine_category: null,
    meal_type: null,
    tags: null,
    score_total: score,
    score_parts: {
      cookability: 1,
      expiryUrgency: 0,
      preferenceMatch: 0,
      timeFit: 0.5,
      novelty: 0.5,
      nutritionFit: 0.5,
      effortFit: 1,
      missingPenalty: 0,
    },
    reasons: ['Tu as tout en stock'],
    suggested_actions: ['open_recipe', 'plan_recipe', 'mark_cooked'],
  };
}

function makeResult(opts: {
  cookable?: number;
  almost?: number;
  recent?: number;
  total?: number;
}): RecommendationResult {
  const cookable = Array.from({ length: opts.cookable ?? 0 }, (_, i) =>
    makeRecipe(`c-${i}`, 90 - i),
  );
  const almost = Array.from({ length: opts.almost ?? 0 }, (_, i) =>
    makeRecipe(`a-${i}`, 60 - i),
  );
  return {
    cookable_now: cookable,
    almost_cookable: almost,
    recent_suggestions: Array.from({ length: opts.recent ?? 0 }, (_, i) => ({
      id: `r-${i}`,
      name: `Recent ${i}`,
      description: null,
      prep_time: 10,
      cook_time: 0,
      servings: 1,
      image_url: null,
      cuisine_category: null,
      meal_type: null,
      tags: null,
    })),
    total_user_recipes: opts.total ?? cookable.length + almost.length,
  };
}

interface MockState {
  inserts: Array<{ table: string; payload: Record<string, unknown> }>;
  upserts: Array<{ table: string; payload: Record<string, unknown> }>;
  selects: Array<{ table: string; filters: Record<string, unknown> }>;
  deletes: Array<{ table: string; filters: Record<string, unknown> }>;
}

interface MockOpts {
  cacheSelect?: { result_json: unknown; expires_at: string } | null;
  insertReturning?: { id: string };
  deleteCount?: number;
}

function buildClient(opts: MockOpts = {}): {
  client: SupabaseClient<Database>;
  state: MockState;
} {
  const state: MockState = { inserts: [], upserts: [], selects: [], deletes: [] };

  const from = (table: string) => {
    const filters: Record<string, unknown> = {};
    let limited = 1000;
    const chain: Record<string, unknown> = {};
    chain.select = (_cols?: string) => chain;
    chain.eq = (col: string, val: unknown) => {
      filters[col] = val;
      return chain;
    };
    chain.lt = (col: string, val: unknown) => {
      filters[`lt_${col}`] = val;
      return chain;
    };
    chain.limit = (n: number) => {
      limited = n;
      return chain;
    };
    chain.maybeSingle = async () => {
      state.selects.push({ table, filters: { ...filters } });
      return { data: opts.cacheSelect ?? null, error: null };
    };
    chain.single = async () => {
      state.selects.push({ table, filters: { ...filters } });
      return { data: opts.insertReturning ?? { id: 'event-id-1' }, error: null };
    };
    chain.then = undefined;
    void limited;
    return chain;
  };

  const client = {
    from(table: string) {
      const builder: Record<string, unknown> = {};
      builder.select = (_cols?: string) => from(table);
      builder.insert = (payload: Record<string, unknown>) => {
        state.inserts.push({ table, payload });
        // Inserts may chain .select().single() (events) or end directly (interactions).
        const next: Record<string, unknown> = {};
        next.select = (_cols?: string) => from(table);
        next.then = (
          resolve: (v: unknown) => unknown,
          reject?: (v: unknown) => unknown,
        ) =>
          Promise.resolve({ data: null, error: null }).then(resolve, reject);
        return next;
      };
      builder.upsert = (
        payload: Record<string, unknown>,
        _opts?: { onConflict?: string },
      ) => {
        state.upserts.push({ table, payload });
        const next: Record<string, unknown> = {};
        next.then = (
          resolve: (v: unknown) => unknown,
          reject?: (v: unknown) => unknown,
        ) =>
          Promise.resolve({ data: null, error: null }).then(resolve, reject);
        return next;
      };
      builder.delete = () => {
        const filters: Record<string, unknown> = {};
        const del: Record<string, unknown> = {};
        del.eq = (col: string, val: unknown) => {
          filters[col] = val;
          return del;
        };
        del.lt = (col: string, val: unknown) => {
          filters[`lt_${col}`] = val;
          return del;
        };
        del.limit = (_n: number) => del;
        del.select = (_cols?: string) => {
          const rowCount = opts.deleteCount ?? 0;
          const rows = Array.from({ length: rowCount }, (_, i) => ({ id: `del-${i}` }));
          const final: Record<string, unknown> = {};
          final.limit = (_n: number) => final;
          final.then = (
            resolve: (v: unknown) => unknown,
            reject?: (v: unknown) => unknown,
          ) => {
            state.deletes.push({ table, filters: { ...filters } });
            return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
          };
          return final;
        };
        return del;
      };
      return builder;
    },
  } as unknown as SupabaseClient<Database>;

  return { client, state };
}

function makeWriter(opts: MockOpts = {}, withAdmin = false) {
  const userClient = buildClient(opts);
  const adminClient = withAdmin ? buildClient(opts) : undefined;
  const writer = new RecommendationEventWriter(
    userClient.client,
    adminClient?.client,
    () => NOW,
  );
  return { writer, userState: userClient.state, adminState: adminClient?.state };
}

// ---- recordEvent ----------------------------------------------------

describe('recordEvent', () => {
  it('returns the inserted event id', async () => {
    const { writer } = makeWriter({ insertReturning: { id: 'evt-42' } });
    const id = await writer.recordEvent({
      userId: USER,
      context: { goal: 'tonight' },
      result: makeResult({ cookable: 2 }),
    });
    expect(id).toBe('evt-42');
  });

  it('counts cookable + almost + recent candidates', async () => {
    const { writer, userState } = makeWriter();
    await writer.recordEvent({
      userId: USER,
      context: {},
      result: makeResult({ cookable: 2, almost: 3, recent: 4 }),
    });
    const insert = userState.inserts.find((i) => i.table === 'recommendation_events')!;
    expect(insert.payload.candidate_count).toBe(9);
  });

  it('caps results array at MAX_RESULTS_PER_EVENT (10)', async () => {
    const { writer, userState } = makeWriter();
    await writer.recordEvent({
      userId: USER,
      context: {},
      result: makeResult({ cookable: 8, almost: 5, recent: 0 }),
    });
    const insert = userState.inserts.find((i) => i.table === 'recommendation_events')!;
    const results = insert.payload.results as Array<{ id: string; score: number }>;
    expect(results).toHaveLength(10);
    // Sorted as built : cookable first (c-0..c-7), then almost (a-0, a-1).
    expect(results[0].id).toBe('c-0');
    expect(results[9].id).toBe('a-1');
  });

  it('strips requestText from the stored context (PII / size guard)', async () => {
    const { writer, userState } = makeWriter();
    await writer.recordEvent({
      userId: USER,
      requestText: 'Que puis-je cuisiner ce soir ?',
      context: {
        requestText: 'Que puis-je cuisiner ce soir ?',
        goal: 'tonight',
      },
      result: makeResult({ cookable: 1 }),
    });
    const insert = userState.inserts.find((i) => i.table === 'recommendation_events')!;
    expect(insert.payload.request_text).toBe('Que puis-je cuisiner ce soir ?');
    const ctx = insert.payload.context as Record<string, unknown>;
    expect(ctx.requestText).toBeUndefined();
    expect(ctx.goal).toBe('tonight');
  });
});

// ---- recordInteraction ---------------------------------------------

describe('recordInteraction', () => {
  it('writes a row with the right type + defaults metadata to {}', async () => {
    const { writer, userState } = makeWriter();
    await writer.recordInteraction({
      userId: USER,
      recipeId: 'recipe-1',
      type: 'cooked',
    });
    const insert = userState.inserts.find((i) => i.table === 'recipe_interactions')!;
    expect(insert.payload.user_id).toBe(USER);
    expect(insert.payload.recipe_id).toBe('recipe-1');
    expect(insert.payload.interaction_type).toBe('cooked');
    expect(insert.payload.metadata).toEqual({});
  });

  it('persists recommendation_event_id when provided', async () => {
    const { writer, userState } = makeWriter();
    await writer.recordInteraction({
      userId: USER,
      recipeId: 'recipe-1',
      type: 'accepted',
      recommendationEventId: 'evt-99',
      metadata: { source: 'assistant' },
    });
    const insert = userState.inserts.find((i) => i.table === 'recipe_interactions')!;
    expect(insert.payload.recommendation_event_id).toBe('evt-99');
    expect(insert.payload.metadata).toEqual({ source: 'assistant' });
  });
});

// ---- readCache / writeCache ----------------------------------------

describe('cache', () => {
  it('readCache returns null when no row', async () => {
    const { writer } = makeWriter({ cacheSelect: null });
    const r = await writer.readCache(USER, 'reco:{}');
    expect(r.hit).toBeNull();
    expect(r.expired).toBe(false);
  });

  it('readCache marks rows past expires_at as expired', async () => {
    const { writer } = makeWriter({
      cacheSelect: {
        result_json: makeResult({ cookable: 1 }),
        expires_at: '2026-05-17T09:00:00Z', // 1h before NOW
      },
    });
    const r = await writer.readCache(USER, 'reco:{}');
    expect(r.hit).not.toBeNull();
    expect(r.expired).toBe(true);
  });

  it('readCache returns expired=false when within TTL', async () => {
    const { writer } = makeWriter({
      cacheSelect: {
        result_json: makeResult({ cookable: 1 }),
        expires_at: '2026-05-17T10:10:00Z', // 10min after NOW
      },
    });
    const r = await writer.readCache(USER, 'reco:{}');
    expect(r.expired).toBe(false);
  });

  it('writeCache upserts with the default 15-min TTL', async () => {
    const { writer, userState } = makeWriter();
    await writer.writeCache({
      userId: USER,
      cacheKey: 'reco:{}',
      payload: makeResult({ cookable: 1 }),
    });
    const upsert = userState.upserts.find(
      (u) => u.table === 'recipe_recommendation_cache',
    )!;
    expect(upsert.payload.user_id).toBe(USER);
    expect(upsert.payload.cache_key).toBe('reco:{}');
    const expiresAt = new Date(upsert.payload.expires_at as string).getTime();
    expect(expiresAt).toBe(NOW.getTime() + CACHE_TTL_MS.scoringResult);
  });

  it('writeCache honours a custom ttlMs', async () => {
    const { writer, userState } = makeWriter();
    await writer.writeCache({
      userId: USER,
      cacheKey: 'reco:custom',
      payload: makeResult({ cookable: 1 }),
      ttlMs: 60_000,
    });
    const upsert = userState.upserts[0];
    const expiresAt = new Date(upsert.payload.expires_at as string).getTime();
    expect(expiresAt).toBe(NOW.getTime() + 60_000);
  });
});

// ---- invalidateUserCache -------------------------------------------

describe('invalidateUserCache', () => {
  it('returns 0 and no-op when no adminClient provided', async () => {
    const { writer } = makeWriter();
    const count = await writer.invalidateUserCache(USER);
    expect(count).toBe(0);
  });

  it('deletes via the admin client when wired', async () => {
    const { writer, adminState } = makeWriter({ deleteCount: 3 }, true);
    const count = await writer.invalidateUserCache(USER);
    expect(count).toBe(3);
    const del = adminState!.deletes.find((d) => d.table === 'recipe_recommendation_cache')!;
    expect(del.filters.user_id).toBe(USER);
  });
});

// ---- buildRecommendationCacheKey -----------------------------------

describe('buildRecommendationCacheKey', () => {
  it('produces the same key regardless of field insertion order', () => {
    const a: RecommendationContext = { goal: 'tonight', timeLimitMinutes: 20 };
    const b: RecommendationContext = { timeLimitMinutes: 20, goal: 'tonight' };
    expect(buildRecommendationCacheKey(a)).toBe(buildRecommendationCacheKey(b));
  });
  it('omits undefined fields so default contexts share a key', () => {
    expect(buildRecommendationCacheKey({})).toBe('reco:{}');
    expect(buildRecommendationCacheKey({ query: undefined })).toBe('reco:{}');
  });
  it('does NOT include requestText in the key (PII guard)', () => {
    const k = buildRecommendationCacheKey({
      requestText: 'sensitive question',
      goal: 'tonight',
    });
    expect(k).not.toContain('sensitive');
    expect(k).toContain('tonight');
  });
});
