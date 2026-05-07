/**
 * Standalone test for the PRP-220.18 `isRecipeLikely` helper.
 *
 * Lives in its own file (instead of `helpers.test.ts`) because that
 * file co-imports `parseQuantity`, which currently trips ts-jest with
 * a target=es5 vs Unicode-property regex mismatch — pre-existing
 * infra rot, out of scope here.
 */
import { isRecipeLikely } from '../helpers/url';

describe('isRecipeLikely (PRP-220.18)', () => {
  it.each([
    ['https://www.instagram.com/reel/abc/', true],
    ['https://m.instagram.com/p/abc/', true],
    ['https://www.tiktok.com/@chef/video/1', true],
    ['https://youtu.be/abc', true],
    ['https://www.youtube.com/watch?v=abc', true],
    ['https://pinterest.fr/pin/123', true],
    ['https://example.com/recipe', false],
    ['javascript:alert(1)', false],
    ['not a url', false],
  ] as const)('isRecipeLikely(%p) === %p', (url, expected) => {
    expect(isRecipeLikely(url)).toBe(expected);
  });
});
