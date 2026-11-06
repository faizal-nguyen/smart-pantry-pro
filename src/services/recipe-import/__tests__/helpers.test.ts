import {
  detectPlatform,
  canonicalizeUrl,
  extractFirstUrl,
  extractAllUrls,
} from '../helpers/url';

describe('helpers/url', () => {
  it('detectPlatform identifies common hosts', () => {
    expect(detectPlatform('https://www.instagram.com/reel/abc/')).toBe('instagram');
    expect(detectPlatform('https://m.instagram.com/p/abc/')).toBe('instagram');
    expect(detectPlatform('https://www.tiktok.com/@chef/video/123')).toBe('tiktok');
    expect(detectPlatform('https://www.youtube.com/watch?v=abc')).toBe('youtube');
    expect(detectPlatform('https://youtu.be/abc')).toBe('youtube');
    expect(detectPlatform('https://pinterest.fr/pin/123')).toBe('pinterest');
    expect(detectPlatform('https://example.com/recipe')).toBe('web');
    expect(detectPlatform('not a url')).toBe('unknown');
  });

  it('canonicalizeUrl drops query, fragment, www, and trailing slash', () => {
    expect(canonicalizeUrl('https://www.instagram.com/reel/abc/?utm_source=foo#bar')).toBe(
      'https://instagram.com/reel/abc'
    );
    expect(canonicalizeUrl('https://m.instagram.com/reel/abc/')).toBe(
      'https://instagram.com/reel/abc'
    );
  });

  it('canonicalizeUrl is idempotent', () => {
    const a = canonicalizeUrl('https://www.tiktok.com/@x/video/1?lang=fr');
    expect(canonicalizeUrl(a)).toBe(a);
  });

  it('canonicalizeUrl returns input on parse failure', () => {
    expect(canonicalizeUrl('not a url')).toBe('not a url');
  });

  it('extractFirstUrl + extractAllUrls', () => {
    const text = 'voici https://example.com/a et https://example.com/b. ' +
      'doublon: https://example.com/a';
    expect(extractFirstUrl(text)).toBe('https://example.com/a');
    expect(extractAllUrls(text).sort()).toEqual([
      'https://example.com/a',
      'https://example.com/b',
    ]);
  });

  it('extractAllUrls returns empty when nothing matches', () => {
    expect(extractAllUrls('no links here')).toEqual([]);
  });
});
