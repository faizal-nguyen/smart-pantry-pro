/**
 * PRP-225 PR2 — Product Normalizer.
 *
 * Two responsibilities :
 *  1. **Input normalisation** — accent strip, lowercase, pluriels FR/EN,
 *     abbreviations expansion. Used to build cache keys + match against
 *     local product `normalized_name`.
 *  2. **OpenFoodFacts → domain projection** — turn raw OFF JSON into
 *     the typed shapes `ExternalProductCandidate`,
 *     `ProductNutritionEnvelope`, `ProductAllergensEnvelope`.
 *
 * No I/O. Pure functions. Tested by `__tests__/ProductNormalizer.test.ts`.
 */

import type {
  ExternalProductCandidate,
  ProductAllergensEnvelope,
  ProductNutritionEnvelope,
} from './productTypes.js';
import type { OffProductPayload } from './OpenFoodFactsClient.js';

const NUTRITION_RAW_FIELD_VERSION = 1;

// ---- Input normalisation -------------------------------------------

/**
 * Lower-cased, accent-stripped, single-spaced, trimmed view of a
 * free-text product name. Mirrors what
 * `assistant_fuzzy_search_products` computes server-side, so the two
 * paths (RPC + cache) hit the same key shape.
 */
export function normalizeName(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Conservative FR/EN singular form. Keeps the input verbatim if the
 * rules don't recognise a safe pattern — better to under-normalise
 * than to mangle a niche product name.
 */
const FR_PLURAL_RULES: Array<{ match: RegExp; replace: string }> = [
  { match: /(.+)s$/, replace: '$1' }, // tomates → tomate
  { match: /(.+)x$/, replace: '$1' }, // gateaux → gateau
];

const FR_ABBREVIATIONS: Record<string, string> = {
  'demi ecreme': 'demi-ecreme',
  'huile olive': "huile d'olive",
  'yaourts grecs': 'yaourt grec',
  'skyrs vanille': 'skyr vanille',
};

/**
 * Apply singular rules + known abbreviations on a normalised name.
 * Idempotent — running it twice yields the same output.
 */
export function applyLightStemming(normalized: string): string {
  let value = normalized;
  for (const [from, to] of Object.entries(FR_ABBREVIATIONS)) {
    if (value === from || value.includes(from)) {
      value = value.replace(from, to);
    }
  }
  // Word-level singular pass only when the input isn't already a known
  // expression (avoids "skyrs vanille" → "skyr vanille" already handled
  // above being re-singularised).
  value = value
    .split(' ')
    .map((word) => {
      for (const rule of FR_PLURAL_RULES) {
        if (rule.match.test(word) && word.length > 4) {
          return word.replace(rule.match, rule.replace);
        }
      }
      return word;
    })
    .join(' ')
    .trim();
  return value;
}

/**
 * Stable cache-key for a free-text search query. Order matters so we
 * apply normalisation + light stemming + locale prefix.
 */
export function buildSearchCacheKey(query: string, locale = 'fr', limit = 5): string {
  const normalised = applyLightStemming(normalizeName(query));
  return `search:${locale}:${normalised}:${limit}`;
}

/**
 * Stable cache-key for a barcode lookup.
 */
export function buildBarcodeCacheKey(barcode: string): string {
  return `barcode:${barcode.trim()}`;
}

// ---- OFF → domain projection ---------------------------------------

/**
 * Pulls numeric nutriment values from OFF's verbose payload. OFF
 * occasionally returns strings (when the contributor used a comma
 * decimal separator) — coerce defensively.
 */
function numField(payload: Record<string, unknown> | undefined, key: string): number | undefined {
  if (!payload) return undefined;
  const v = payload[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const parsed = Number.parseFloat(v.replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

/**
 * Build the at-rest nutrition envelope persisted in
 * `products.nutrition_json`. Returns `undefined` if OFF gave us nothing
 * worth storing.
 */
export function projectNutritionFromOff(off: OffProductPayload): ProductNutritionEnvelope | undefined {
  const n = off.nutriments;
  // Energy is sometimes only published in kJ — OFF exposes both keys.
  const energyKcal =
    numField(n, 'energy_kcal_100g') ??
    (numField(n, 'energy_100g') !== undefined
      ? Math.round((numField(n, 'energy_100g') as number) / 4.184)
      : undefined);

  const per100g = {
    energyKcal,
    proteinG: numField(n, 'proteins_100g'),
    carbsG: numField(n, 'carbohydrates_100g'),
    sugarG: numField(n, 'sugars_100g'),
    fatG: numField(n, 'fat_100g'),
    saturatedFatG: numField(n, 'saturated-fat_100g'),
    fiberG: numField(n, 'fiber_100g'),
    saltG: numField(n, 'salt_100g'),
  };
  const anyValue = Object.values(per100g).some((v) => typeof v === 'number');
  if (!anyValue && !off.serving_size && !off.nutrition_grades && !off.nutriscore_grade) {
    return undefined;
  }

  const serving = parseServing(off.serving_size);
  const nutriScore = normaliseNutriScore(off.nutriscore_grade ?? off.nutrition_grades);
  const novaGroup = normaliseNova(off.nova_group);

  return {
    source: 'openfoodfacts',
    per100g: anyValue ? per100g : undefined,
    serving: serving ?? undefined,
    scores: {
      nutriScore,
      novaGroup,
      ecoscore: off.ecoscore_grade ? off.ecoscore_grade.toLowerCase() : undefined,
    },
    rawFieldVersion: NUTRITION_RAW_FIELD_VERSION,
  };
}

function parseServing(label: string | undefined): { label?: string; quantity?: number; unit?: string } | null {
  if (!label) return null;
  const trimmed = label.trim();
  if (!trimmed) return null;
  // "250 ml" / "100g" / "30 g (1 portion)"
  const match = trimmed.match(/(\d+(?:[.,]\d+)?)\s*(ml|cl|l|g|kg|mg)/i);
  if (match) {
    return {
      label: trimmed,
      quantity: Number.parseFloat(match[1].replace(',', '.')),
      unit: match[2].toLowerCase(),
    };
  }
  return { label: trimmed };
}

function normaliseNutriScore(value: string | undefined): ProductNutritionEnvelope['scores'] extends infer S ? (S extends { nutriScore?: infer V } ? V : never) : never {
  if (!value) return undefined as never;
  const v = value.trim().toLowerCase();
  if (['a', 'b', 'c', 'd', 'e'].includes(v)) {
    return v as 'a' | 'b' | 'c' | 'd' | 'e';
  }
  if (v === 'unknown' || v === 'not-applicable') return 'unknown' as 'unknown';
  return undefined as never;
}

function normaliseNova(value: number | undefined): 1 | 2 | 3 | 4 | undefined {
  if (value === 1 || value === 2 || value === 3 || value === 4) return value;
  return undefined;
}

/**
 * Pulls allergens / labels into the at-rest envelope. OFF returns
 * arrays of language-tagged strings like `en:milk` — we keep the raw
 * tags so the UI can render localised badges in PR6.
 */
export function projectAllergensFromOff(off: OffProductPayload): ProductAllergensEnvelope | undefined {
  const allergensTags = off.allergens_tags ?? [];
  const tracesTags = off.traces_tags ?? [];
  const labelsTags = off.labels_tags ?? [];
  if (allergensTags.length === 0 && tracesTags.length === 0 && labelsTags.length === 0) {
    return undefined;
  }
  return {
    source: 'openfoodfacts',
    allergensTags,
    tracesTags,
    labelsTags,
  };
}

/**
 * Map an OFF payload to the candidate shape consumed by
 * `ProductIntelligenceService.resolve()` (PR3). Confidence is a coarse
 * heuristic for V1 : 0.9 when both name + nutriments present, 0.7 when
 * name alone, 0.5 when barcode-only payload.
 */
export function toExternalCandidate(off: OffProductPayload): ExternalProductCandidate | null {
  if (!off.code) return null;
  const name = (off.product_name ?? off.generic_name ?? '').trim();
  if (!name) return null;

  const nutrition = projectNutritionFromOff(off);
  const allergens = projectAllergensFromOff(off);
  let confidence = 0.5;
  if (name) confidence += 0.2;
  if (nutrition?.per100g?.energyKcal !== undefined) confidence += 0.2;
  if (off.brands && off.brands.trim().length > 0) confidence += 0.1;
  confidence = Math.min(confidence, 1);

  return {
    source: 'openfoodfacts',
    externalCode: off.code,
    name,
    genericName: off.generic_name ?? null,
    brand: pickFirst(off.brands) ?? null,
    category: pickFirst(off.categories) ?? null,
    imageUrl: off.image_front_url ?? off.image_url ?? null,
    quantityLabel: off.quantity ?? null,
    ingredientsText: off.ingredients_text ?? null,
    nutrition,
    allergens,
    lang: off.lang ?? null,
    rawLastModifiedAt: off.last_modified_t
      ? new Date(off.last_modified_t * 1000).toISOString()
      : null,
    confidence,
  };
}

function pickFirst(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const first = value.split(',').map((s) => s.trim()).filter(Boolean)[0];
  return first;
}
