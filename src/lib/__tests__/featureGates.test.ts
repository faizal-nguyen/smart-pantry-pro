import {
  canUse,
  isQuotaExhausted,
  isQuotaWarning,
  QUOTA_WARNING_RATIO,
} from '../featureGates';

describe('featureGates (PRP-220.19)', () => {
  describe('canUse', () => {
    it('grants every feature to premium', () => {
      expect(canUse('imports.audio_transcript', 'premium')).toBe(true);
      expect(canUse('collections.unlimited', 'premium')).toBe(true);
      expect(canUse('imports.bulk_large', 'premium')).toBe(true);
      expect(canUse('imports.unlimited_active', 'premium')).toBe(true);
    });

    it('blocks the locked features for free', () => {
      expect(canUse('imports.audio_transcript', 'free')).toBe(false);
      expect(canUse('collections.unlimited', 'free')).toBe(false);
      expect(canUse('imports.bulk_large', 'free')).toBe(false);
      expect(canUse('imports.unlimited_active', 'free')).toBe(false);
    });

    it('treats null/undefined as free (most restrictive default)', () => {
      expect(canUse('imports.audio_transcript', null)).toBe(false);
      expect(canUse('imports.audio_transcript', undefined)).toBe(false);
    });
  });

  describe('isQuotaWarning / isQuotaExhausted', () => {
    it('returns false for premium (limit=null)', () => {
      const quota = { tier: 'premium' as const, limit: null, remaining: null };
      expect(isQuotaWarning(9999, quota)).toBe(false);
      expect(isQuotaExhausted(quota)).toBe(false);
    });

    it('warns at the documented threshold', () => {
      const quota = { tier: 'free' as const, limit: 25, remaining: 5 };
      // 20/25 = 80% — exactly the threshold.
      expect(isQuotaWarning(20, quota)).toBe(true);
      expect(isQuotaWarning(19, quota)).toBe(false);
      expect(QUOTA_WARNING_RATIO).toBe(0.8);
    });

    it('flags exhausted only when remaining is 0', () => {
      const live = { tier: 'free' as const, limit: 25, remaining: 1 };
      const dead = { tier: 'free' as const, limit: 25, remaining: 0 };
      expect(isQuotaExhausted(live)).toBe(false);
      expect(isQuotaExhausted(dead)).toBe(true);
    });

    it('returns false on missing quota', () => {
      expect(isQuotaWarning(20, null)).toBe(false);
      expect(isQuotaExhausted(null)).toBe(false);
    });
  });
});
