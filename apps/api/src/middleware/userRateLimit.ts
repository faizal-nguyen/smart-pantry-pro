/**
 * Per-user rate limiter (PRP-220.15).
 *
 * Why per-user instead of per-IP: behind NAT or shared corporate proxies
 * the IP-based `rateLimit.ts` punishes innocent users. Imports +
 * AI-extract are expensive enough that we want hard ceilings tied to
 * the authenticated identity.
 *
 * Storage:
 *   - When `REDIS_URL` is set, increments a counter in Redis with a
 *     PEXPIRE that matches the window. Survives multi-instance deploys.
 *   - Falls back to an in-process Map otherwise. Good enough for dev /
 *     single-instance prod, NOT shared across replicas — operators must
 *     wire Redis for horizontal scaling.
 *
 * Anonymous requests (no `req.user`) bypass the limiter so this
 * middleware can sit before or after `createAuthMiddleware` without
 * exploding. Pair it with auth in production.
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Redis as IORedis } from 'ioredis';

import { metrics } from '../lib/metrics.js';
import { logRateLimited } from '../lib/logger.js';

export type UserTier = 'free' | 'premium';

export interface UserRateLimitOptions {
  /** Logical bucket name. Becomes part of the Redis key + the metric label. */
  key: string;
  /** Free-tier ceiling. */
  freeMax: number;
  /** Premium-tier ceiling. */
  premiumMax: number;
  /** Sliding window in ms. */
  windowMs: number;
  /** Escape hatch for tests — by default we read `process.env.REDIS_URL`. */
  redisUrl?: string;
}

interface CounterStore {
  /** Atomically increment + return the new count. Sets TTL on first use. */
  incr(key: string, ttlMs: number): Promise<number>;
}

let cachedRedis: IORedis | null | undefined;
async function getRedisStore(redisUrl: string): Promise<CounterStore | null> {
  if (cachedRedis === undefined) {
    try {
      const mod = await import('ioredis');
      const Redis = (mod as any).default ?? (mod as any).Redis;
      cachedRedis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        lazyConnect: false,
        // Keep the Redis client quiet — we already log a warning below.
        enableOfflineQueue: false,
      });
      cachedRedis!.on('error', () => {
        // Swallow — handled at the call site.
      });
    } catch (err) {
      console.warn('[userRateLimit] Redis client init failed:', (err as Error).message);
      cachedRedis = null;
    }
  }
  if (!cachedRedis) return null;
  const r = cachedRedis;
  return {
    async incr(key: string, ttlMs: number): Promise<number> {
      const count = await r.incr(key);
      if (count === 1) await r.pexpire(key, ttlMs);
      return count;
    },
  };
}

interface MemoryEntry {
  count: number;
  expiresAt: number;
}

const memory = new Map<string, MemoryEntry>();

export function memoryStore(): CounterStore {
  return {
    async incr(key: string, ttlMs: number): Promise<number> {
      const now = Date.now();
      const entry = memory.get(key);
      if (!entry || entry.expiresAt <= now) {
        memory.set(key, { count: 1, expiresAt: now + ttlMs });
        return 1;
      }
      entry.count += 1;
      return entry.count;
    },
  };
}

/** Reset the in-memory store. Tests only. */
export function __resetMemoryStore(): void {
  memory.clear();
}

export function userRateLimit(options: UserRateLimitOptions): RequestHandler {
  const { key, freeMax, premiumMax, windowMs } = options;
  const redisUrl = options.redisUrl ?? process.env.REDIS_URL;

  let storePromise: Promise<CounterStore> | null = null;
  const resolveStore = (): Promise<CounterStore> => {
    if (storePromise) return storePromise;
    storePromise = (async () => {
      if (redisUrl) {
        const r = await getRedisStore(redisUrl);
        if (r) return r;
        console.warn('[userRateLimit] Falling back to in-memory store (Redis unreachable)');
      }
      return memoryStore();
    })();
    return storePromise;
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) {
      // Anonymous traffic bypasses the per-user limiter. Auth middleware
      // is responsible for keeping unauth requests off costly endpoints.
      return next();
    }
    const tier: UserTier = req.user?.tier === 'premium' ? 'premium' : 'free';
    const max = tier === 'premium' ? premiumMax : freeMax;
    const cacheKey = `rl:${key}:${userId}`;

    let count: number;
    try {
      const store = await resolveStore();
      count = await store.incr(cacheKey, windowMs);
    } catch (err) {
      console.warn('[userRateLimit] store error, allowing request:', (err as Error).message);
      return next();
    }

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - count)));

    if (count > max) {
      const retryAfterSec = Math.ceil(windowMs / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      metrics.rateLimited.inc({ endpoint: key, tier });
      logRateLimited({ userId, endpoint: key, tier, limit: max, count });
      return res.status(429).json({
        success: false,
        message: `Limite ${max}/${Math.round(windowMs / 3_600_000)}h atteinte`,
        code: 'RATE_LIMITED',
      });
    }
    next();
  };
}
