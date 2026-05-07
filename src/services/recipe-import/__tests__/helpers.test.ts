import {
  detectPlatform,
  canonicalizeUrl,
  extractFirstUrl,
  extractAllUrls,
} from '../helpers/url';
import { parseDurationToMinutes } from '../helpers/parseDuration';
import { parseQuantity } from '../helpers/parseQuantity';
import { computeConfidence } from '../helpers/confidence';

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

describe('helpers/parseDuration', () => {
  it.each([
    ['30', 30],
    [30, 30],
    ['30 min', 30],
    ['30 minutes', 30],
    ['30m', 30],
    ['1h', 60],
    ['1h30', 90],
    ['1h30m', 90],
    ['2 h 15', 135],
    ['2 heures 15', 135],
    ['00:30', 30],
    ['1:45', 105],
    ['PT30M', 30],
    ['PT1H30M', 90],
    ['PT2H', 120],
    ['PT45S', 1],
  ])('parses %p -> %i minutes', (input, expected) => {
    expect(parseDurationToMinutes(input as any)).toBe(expected);
  });

  it.each([['gibberish'], [''], [null], [undefined], [NaN]])('returns undefined for %p', (input) => {
    expect(parseDurationToMinutes(input as any)).toBeUndefined();
  });
});

describe('helpers/parseQuantity', () => {
  it('parses "200 g flour"', () => {
    expect(parseQuantity('200 g flour')).toMatchObject({
      raw: '200 g flour',
      quantity: 200,
      unit: 'g',
      rest: 'flour',
    });
  });

  it('parses fractions', () => {
    expect(parseQuantity('1/2 cup sugar')).toMatchObject({
      quantity: 0.5,
      unit: 'cup',
      rest: 'sugar',
    });
  });

  it('parses comma decimals', () => {
    expect(parseQuantity('1,5 kg pommes')).toMatchObject({
      quantity: 1.5,
      unit: 'kg',
      rest: 'pommes',
    });
  });

  it('handles no unit ("2 oeufs")', () => {
    const r = parseQuantity('2 oeufs');
    expect(r.quantity).toBe(2);
    expect(r.unit).toBeUndefined();
    expect(r.rest).toBe('oeufs');
  });

  it('parses "c.s." abbreviation', () => {
    expect(parseQuantity('2 c.s. olive oil')).toMatchObject({
      quantity: 2,
      unit: 'c.s.',
      rest: 'olive oil',
    });
  });

  it('falls back to rest=raw when no quantity', () => {
    expect(parseQuantity('salt to taste')).toEqual({ raw: 'salt to taste', rest: 'salt to taste' });
  });

  it('handles empty string', () => {
    expect(parseQuantity('')).toEqual({ raw: '' });
  });
});

describe('helpers/confidence', () => {
  it('penalises absent ingredients with a warning', () => {
    const r = computeConfidence({
      hasTitle: true,
      ingredientCount: 0,
      instructionCount: 3,
      hasImage: false,
      hasTimes: false,
      extractionMethod: 'ai_inference',
    });
    expect(r.warnings).toContain('Aucun ingrédient détecté');
    expect(r.confidence).toBeLessThan(0.6);
  });

  it('caps oembed/metadata confidence at 0.6', () => {
    const r = computeConfidence({
      hasTitle: true,
      ingredientCount: 5,
      ingredientWithQuantityCount: 5,
      instructionCount: 5,
      hasImage: true,
      hasTimes: true,
      hasServings: true,
      extractionMethod: 'oembed',
    });
    expect(r.confidence).toBeLessThanOrEqual(0.6);
    expect(r.warnings).toContain('Extraction basée sur métadonnées seulement');
  });

  it('rewards rich ai_inference output', () => {
    const r = computeConfidence({
      hasTitle: true,
      ingredientCount: 8,
      ingredientWithQuantityCount: 7,
      instructionCount: 5,
      hasImage: true,
      hasTimes: true,
      hasServings: true,
      extractionMethod: 'ai_inference',
    });
    expect(r.confidence).toBeGreaterThan(0.7);
    expect(r.warnings).toEqual([]);
  });

  it('clamps to [0, 1]', () => {
    const lo = computeConfidence({
      hasTitle: false,
      ingredientCount: 0,
      instructionCount: 0,
      hasImage: false,
      hasTimes: false,
      hasOversizedIngredient: true,
      extractionMethod: 'ai_inference',
    });
    expect(lo.confidence).toBeGreaterThanOrEqual(0);
  });
});
