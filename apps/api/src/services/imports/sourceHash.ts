import { createHash } from 'node:crypto';

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
 * but cheap to store and impossible to brute-force back to the URL.
 */
export function computeSourceHash(canonicalUrl: string): string {
  const normalized = normalize(canonicalUrl);
  return createHash('sha256').update(normalized).digest('hex').slice(0, 32);
}

function normalize(input: string): string {
  if (!input) return '';
  let value = input.trim().toLowerCase();

  // Strip protocol so http vs https doesn't break the hash.
  value = value.replace(/^https?:\/\//, '');

  // Drop the leading "www." or "m." subdomain - users paste the same
  // URL via desktop and mobile and expect a single import.
  value = value.replace(/^(www\.|m\.)/, '');

  // Drop trailing slashes / hashes / queries that callers should have
  // already normalised, but defend against drift.
  value = value.replace(/[?#].*$/, '').replace(/\/+$/, '');

  return value;
}
