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

  it('canonicalizeUrl drops tracking, fragment, www, and trailing slash', () => {
    expect(canonicalizeUrl('https://www.instagram.com/reel/abc/?utm_source=foo#bar')).toBe(
      'https://instagram.com/reel/abc'
    );
    expect(canonicalizeUrl('https://m.instagram.com/reel/abc/')).toBe(
      'https://instagram.com/reel/abc'
    );
  });

  it('preserves different videos and parameterized recipes instead of collapsing their identity', () => {
    expect(canonicalizeUrl('https://www.youtube.com/watch?v=RecipeA&utm_source=share#t=12'))
      .toBe('https://youtube.com/watch?v=RecipeA');
    expect(canonicalizeUrl('https://youtube.com/watch?v=RecipeB'))
      .toBe('https://youtube.com/watch?v=RecipeB');
    expect(canonicalizeUrl('https://example.com/Recipe?id=AbC&lang=fr&utm=share'))
      .toBe('https://example.com/Recipe?id=AbC&lang=fr');
    expect(canonicalizeUrl('https://example.com/Recipe?id=AbC')).not.toBe(canonicalizeUrl('https://example.com/Recipe?id=abc'));
  });

  it('does not classify lookalike hosts as social sources', () => {
    expect(detectPlatform('https://evilinstagram.com/reel/abc')).toBe('web');
    expect(detectPlatform('https://instagram.com.evil.example/reel/abc')).toBe('web');
    expect(detectPlatform('https://pinterest.evil.example/pin/abc')).toBe('web');
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
