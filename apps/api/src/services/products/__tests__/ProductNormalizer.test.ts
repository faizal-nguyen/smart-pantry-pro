/**
 * PRP-225 PR2 — ProductNormalizer unit tests.
 *
 * Covers :
 *   - normalizeName : accent strip, casing, whitespace collapse
 *   - applyLightStemming : FR pluriels + known abbreviations
 *   - buildBarcodeCacheKey / buildSearchCacheKey stability
 *   - projectNutritionFromOff : kcal extraction (incl. kJ fallback),
 *     nutriscore + nova normalisation, empty payload → undefined
 *   - projectAllergensFromOff : empty arrays → undefined
 *   - toExternalCandidate : confidence scoring branches
 */
import {
  applyLightStemming,
  buildBarcodeCacheKey,
  buildSearchCacheKey,
  normalizeName,
  projectAllergensFromOff,
  projectNutritionFromOff,
  toExternalCandidate,
} from '../ProductNormalizer.js';
import type { OffProductPayload } from '../OpenFoodFactsClient.js';

describe('normalizeName', () => {
  it.each([
    ['Tomate', 'tomate'],
    ['  Tomate  ', 'tomate'],
    ['Crème fraîche', 'creme fraiche'],
    ['Yaourt   à\tla\nGrecque', 'yaourt a la grecque'],
    ['Œuf', 'œuf'],
  ])('normalises %s → %s', (input, expected) => {
    expect(normalizeName(input)).toBe(expected);
  });
});

describe('applyLightStemming', () => {
  it.each([
    ['tomates', 'tomate'],
    ['skyrs vanille', 'skyr vanille'],
    ['huile olive', "huile d'olive"],
    ['yaourts grecs', 'yaourt grec'],
    ['gateaux', 'gateau'],
    ['lait', 'lait'], // unchanged (no rule applies)
    ['riz', 'riz'], // word too short for the singular rule
  ])('stems %s → %s', (input, expected) => {
    expect(applyLightStemming(input)).toBe(expected);
  });

  it('is idempotent', () => {
    const once = applyLightStemming(normalizeName('Yaourts grecs'));
    expect(applyLightStemming(once)).toBe(once);
  });
});

describe('cache keys', () => {
  it('barcode key trims input', () => {
    expect(buildBarcodeCacheKey(' 3017620422003 ')).toBe('barcode:3017620422003');
  });
  it('search key includes locale + limit', () => {
    expect(buildSearchCacheKey('Skyrs', 'fr', 5)).toBe('search:fr:skyr:5');
    expect(buildSearchCacheKey('Skyrs', 'en', 10)).toBe('search:en:skyr:10');
  });
  it('search key normalises whitespace + casing', () => {
    expect(buildSearchCacheKey('  YAOURTS  GRECS ')).toBe('search:fr:yaourt grec:5');
  });
});

describe('projectNutritionFromOff', () => {
  it('extracts the per-100g block when nutriments present', () => {
    const off: OffProductPayload = {
      code: '1',
      product_name: 'Test',
      nutriments: {
        energy_kcal_100g: 246,
        proteins_100g: 6,
        carbohydrates_100g: 57,
        sugars_100g: 56,
        fat_100g: 11,
        'saturated-fat_100g': 3,
      },
      nutriscore_grade: 'E',
      nova_group: 4,
      serving_size: '15 g',
    };
    const env = projectNutritionFromOff(off);
    expect(env?.per100g?.energyKcal).toBe(246);
    expect(env?.per100g?.proteinG).toBe(6);
    expect(env?.serving?.quantity).toBe(15);
    expect(env?.serving?.unit).toBe('g');
    expect(env?.scores?.nutriScore).toBe('e');
    expect(env?.scores?.novaGroup).toBe(4);
    expect(env?.rawFieldVersion).toBe(1);
  });

  it('falls back to kJ → kcal conversion when only energy_100g present', () => {
    const off: OffProductPayload = {
      code: '1',
      nutriments: { energy_100g: 1000 }, // ~239 kcal
    };
    const env = projectNutritionFromOff(off);
    expect(env?.per100g?.energyKcal).toBe(239);
  });

  it('returns undefined when payload carries nothing useful', () => {
    expect(projectNutritionFromOff({ code: '1' })).toBeUndefined();
  });

  it('handles French comma decimals in numeric strings', () => {
    const off: OffProductPayload = {
      code: '1',
      nutriments: { proteins_100g: '3,3' as unknown as number },
    };
    const env = projectNutritionFromOff(off);
    expect(env?.per100g?.proteinG).toBe(3.3);
  });
});

describe('projectAllergensFromOff', () => {
  it('returns undefined when all arrays empty', () => {
    expect(projectAllergensFromOff({ code: '1' })).toBeUndefined();
  });
  it('preserves raw tags', () => {
    const env = projectAllergensFromOff({
      code: '1',
      allergens_tags: ['en:milk'],
      traces_tags: ['en:gluten'],
      labels_tags: ['en:organic'],
    });
    expect(env?.allergensTags).toEqual(['en:milk']);
    expect(env?.tracesTags).toEqual(['en:gluten']);
    expect(env?.labelsTags).toEqual(['en:organic']);
  });
});

describe('toExternalCandidate', () => {
  it('returns null when code is missing', () => {
    expect(toExternalCandidate({ product_name: 'no code' })).toBeNull();
  });
  it('returns null when name is missing', () => {
    expect(toExternalCandidate({ code: '1' })).toBeNull();
  });
  it('builds a candidate with confidence ≥ 0.7 for name+nutrition', () => {
    const cand = toExternalCandidate({
      code: '1',
      product_name: 'Skyr',
      brands: 'Siggi',
      nutriments: { energy_kcal_100g: 60 },
    });
    expect(cand?.confidence).toBeGreaterThanOrEqual(0.7);
    expect(cand?.brand).toBe('Siggi');
    expect(cand?.nutrition?.per100g?.energyKcal).toBe(60);
  });
  it('caps confidence at 1', () => {
    const cand = toExternalCandidate({
      code: '1',
      product_name: 'Premium',
      brands: 'Brand',
      nutriments: { energy_kcal_100g: 60 },
    });
    expect(cand?.confidence).toBeLessThanOrEqual(1);
  });
  it('picks the first brand when OFF returns a CSV', () => {
    const cand = toExternalCandidate({
      code: '1',
      product_name: 'Foo',
      brands: 'Primary, Secondary',
    });
    expect(cand?.brand).toBe('Primary');
  });
});
