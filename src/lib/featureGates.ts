/**
 * Tier-based feature gating (PRP-220.19).
 *
 * The matrix below mirrors `docs/monetization` (out of scope here).
 * Server is the source of truth for the actual check — this module
 * only powers UI toggles and pre-emptive disabling so we don't
 * surface buttons that we know will 402.
 */

export type UserTier = 'free' | 'premium';

export type FeatureKey =
  | 'imports.audio_transcript'
  | 'imports.bulk_large'
  | 'collections.unlimited'
  | 'imports.unlimited_active';

const FREE_BLOCKED: ReadonlySet<FeatureKey> = new Set<FeatureKey>([
  'imports.audio_transcript',
  'imports.bulk_large',
  'collections.unlimited',
  'imports.unlimited_active',
]);

export function canUse(feature: FeatureKey, tier: UserTier | null | undefined): boolean {
  if (tier === 'premium') return true;
  return !FREE_BLOCKED.has(feature);
}

export interface QuotaInfo {
  tier: UserTier;
  /** null when the tier has no limit (premium). */
  limit: number | null;
  /** null when the tier has no limit. */
  remaining: number | null;
}

/**
 * Soft warning threshold for the inbox quota gauge. Returns the same
 * value the UI uses to flip from "neutral" to "warning" badge.
 */
export const QUOTA_WARNING_RATIO = 0.8;

export function isQuotaWarning(active: number, quota: QuotaInfo | null): boolean {
  if (!quota || quota.limit === null) return false;
  return active / quota.limit >= QUOTA_WARNING_RATIO;
}

export function isQuotaExhausted(quota: QuotaInfo | null): boolean {
  if (!quota || quota.limit === null) return false;
  return quota.remaining !== null && quota.remaining <= 0;
}
