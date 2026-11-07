import { createHash } from 'node:crypto';
import { canonicalizeUrl } from './canonicalUrl.js';

/**
 * Deterministic hash for the dedup column on `social_recipe_imports`
 * (PRP-220.09). The hash is computed server-side because:
 *
 *  - We need to dedupe across requests, not within a single TS bundle.
 *  - The hash must be stable across process restarts and across the
 *    main API node and any future worker/queue consumer.
 *  - Computing it in Postgres would require a CITEXT-or-equivalent
 *    pre-normalisation that is harder to reason about than this
 *    helper.
 *
 * The output is the first 32 hex chars (128 bits) of
 * `sha256(normalize(canonicalUrl))`. 128 bits is overkill for dedup
 * while remaining cheap to store. A hash is a dedupe key, not encryption.
 */
export function computeSourceHash(canonicalUrl: string): string {
  const normalized = normalize(canonicalUrl);
  return createHash('sha256').update(normalized).digest('hex').slice(0, 32);
}

function normalize(input: string): string {
  if (!input) return '';
  try {
    const parsed = new URL(canonicalizeUrl(input.trim()));
    return `${parsed.host}${parsed.pathname.replace(/\/+$/, '')}${parsed.search}`;
  } catch {
    return input.trim();
  }
}

/** Compatibility lookup only. Always compare the stored source URL as well. */
export function computeLegacySourceHash(input: string): string {
  const normalized = input.trim().toLowerCase().replace(/^https?:\/\//, '')
    .replace(/^(www\.|m\.)/, '').replace(/[?#].*$/, '').replace(/\/+$/, '');
  return createHash('sha256').update(normalized).digest('hex').slice(0, 32);
}
