import { canonicalizeUrl, detectPlatform } from '../services/imports/canonicalUrl';

describe('canonicalUrl (PRP-220.10)', () => {
  describe('detectPlatform', () => {
    it('classifies common hosts', () => {
      expect(detectPlatform('https://www.instagram.com/reel/abc/')).toBe('instagram');
      expect(detectPlatform('https://m.instagram.com/p/abc/')).toBe('instagram');
      expect(detectPlatform('https://www.tiktok.com/@x/video/1')).toBe('tiktok');
      expect(detectPlatform('https://youtu.be/abc')).toBe('youtube');
      expect(detectPlatform('https://www.youtube.com/watch?v=abc')).toBe('youtube');
      expect(detectPlatform('https://pinterest.fr/pin/123')).toBe('pinterest');
      expect(detectPlatform('https://example.com/recipe')).toBe('web');
      expect(detectPlatform('not a url')).toBe('unknown');
    });
  });

  describe('canonicalizeUrl', () => {
    it('drops tracking and fragment but keeps functional recipe parameters', () => {
      expect(canonicalizeUrl('https://example.com/recipe?utm=foo&x=1#top')).toBe(
        'https://example.com/recipe?x=1'
      );
    });

    it('keeps distinct YouTube video identities', () => {
      expect(canonicalizeUrl('https://youtube.com/watch?v=abc&utm_source=share')).toBe('https://youtube.com/watch?v=abc');
      expect(canonicalizeUrl('https://youtube.com/watch?v=def')).not.toBe(canonicalizeUrl('https://youtube.com/watch?v=abc'));
    });

    it('sorts meaningful parameters and rejects lookalike platform domains', () => {
      expect(canonicalizeUrl('https://example.com/recipe?variant=2&id=3')).toBe('https://example.com/recipe?id=3&variant=2');
      expect(detectPlatform('https://instagram.com.evil.example/reel/1')).toBe('web');
    });

    it('drops trailing slash', () => {
      expect(canonicalizeUrl('https://example.com/recipe/')).toBe('https://example.com/recipe');
    });

    it('strips www. and m. subdomains', () => {
      expect(canonicalizeUrl('https://www.instagram.com/reel/abc/')).toBe(
        'https://instagram.com/reel/abc'
      );
      expect(canonicalizeUrl('https://m.instagram.com/reel/abc/')).toBe(
        'https://instagram.com/reel/abc'
      );
    });

    it('lowercases the host', () => {
      expect(canonicalizeUrl('https://Instagram.com/reel/abc')).toBe(
        'https://instagram.com/reel/abc'
      );
    });

    it('is idempotent', () => {
      const first = canonicalizeUrl('https://www.tiktok.com/@x/video/1?lang=fr');
      const second = canonicalizeUrl(first);
      expect(first).toBe(second);
    });

    it('returns input on parse failure', () => {
      expect(canonicalizeUrl('not a url')).toBe('not a url');
    });
  });
});
