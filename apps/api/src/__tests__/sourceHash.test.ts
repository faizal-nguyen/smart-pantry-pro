import { computeSourceHash } from '../services/imports/sourceHash';

describe('computeSourceHash (PRP-220.09)', () => {
  it('is deterministic for the same input', () => {
    const a = computeSourceHash('https://www.instagram.com/reel/abc/');
    const b = computeSourceHash('https://www.instagram.com/reel/abc/');
    expect(a).toBe(b);
  });

  it('returns a 32-char hex string', () => {
    const h = computeSourceHash('https://www.instagram.com/reel/abc/');
    expect(h).toMatch(/^[0-9a-f]{32}$/);
  });

  it('produces different hashes for different URLs', () => {
    const a = computeSourceHash('https://www.instagram.com/reel/aaa/');
    const b = computeSourceHash('https://www.instagram.com/reel/bbb/');
    expect(a).not.toBe(b);
  });

  it('is case-insensitive on the host', () => {
    const a = computeSourceHash('https://Instagram.com/reel/abc');
    const b = computeSourceHash('https://instagram.com/reel/abc');
    expect(a).toBe(b);
  });

  it('treats m./www./bare host as the same URL', () => {
    const bare = computeSourceHash('https://instagram.com/reel/abc');
    const www = computeSourceHash('https://www.instagram.com/reel/abc');
    const m = computeSourceHash('https://m.instagram.com/reel/abc');
    expect(bare).toBe(www);
    expect(bare).toBe(m);
  });

  it('treats http and https as the same URL', () => {
    const httpHash = computeSourceHash('http://example.com/recipe');
    const httpsHash = computeSourceHash('https://example.com/recipe');
    expect(httpHash).toBe(httpsHash);
  });

  it('strips trailing slashes', () => {
    const a = computeSourceHash('https://example.com/recipe');
    const b = computeSourceHash('https://example.com/recipe/');
    const c = computeSourceHash('https://example.com/recipe///');
    expect(a).toBe(b);
    expect(a).toBe(c);
  });

  it('drops query and fragment', () => {
    const clean = computeSourceHash('https://example.com/recipe');
    const withQuery = computeSourceHash('https://example.com/recipe?utm=foo&x=1');
    const withFragment = computeSourceHash('https://example.com/recipe#top');
    expect(clean).toBe(withQuery);
    expect(clean).toBe(withFragment);
  });

  it('returns a stable hash for empty input', () => {
    const a = computeSourceHash('');
    const b = computeSourceHash('');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{32}$/);
  });
});
