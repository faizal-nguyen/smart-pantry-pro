/**
 * Structured business-event logger (PRP-220.15).
 *
 * Reuses the pino instance configured for HTTP request logging
 * (apps/api/src/middleware/logger.ts) and exposes typed helpers for the
 * events we want to track in production: extraction outcomes,
 * rate-limit hits, capture results.
 *
 * Keeping the helpers in one place ensures every event ships with the
 * same canonical fields so dashboards stay stable.
 */
import { logger as baseLogger } from '../middleware/logger.js';

export const logger = baseLogger;

export interface ExtractionLog {
  userId: string;
  importId: string;
  platform: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  confidence: number;
  warningsCount: number;
  outcome: 'success' | 'failed';
  errorCode?: string;
  errorMessage?: string;
}

export function logExtraction(data: ExtractionLog): void {
  const level = data.outcome === 'success' ? 'info' : 'warn';
  baseLogger[level]({ event: 'extraction', ...data });
}

export interface RateLimitLog {
  userId: string;
  endpoint: string;
  tier: 'free' | 'premium';
  limit: number;
  count: number;
}

export function logRateLimited(data: RateLimitLog): void {
  baseLogger.warn({ event: 'rate_limited', ...data });
}

export interface CaptureLog {
  userId: string;
  importId?: string;
  platform: string;
  outcome: 'ok' | 'duplicate' | 'failed';
  errorCode?: string;
}

export function logCapture(data: CaptureLog): void {
  const level = data.outcome === 'failed' ? 'warn' : 'info';
  baseLogger[level]({ event: 'capture', ...data });
}
