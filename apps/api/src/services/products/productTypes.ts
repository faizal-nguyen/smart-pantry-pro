/**
 * PRP-225 PR1 — domain types for the Product Intelligence layer.
 *
 * Shared shapes consumed by:
 *   - apps/api/src/services/products/OpenFoodFactsClient.ts   (PR2)
 *   - apps/api/src/services/products/ProductNormalizer.ts     (PR2)
 *   - apps/api/src/services/products/ProductEnrichmentRepository.ts (PR2)
 *   - apps/api/src/services/products/ProductIntelligenceService.ts (PR3)
 *   - apps/api/src/routes/products.intelligence.ts            (PR4)
 *   - apps/api/src/services/assistant/handlers/products.ts    (PR5)
 *
 * Re-exports the Supabase Row shapes from `../../types/supabase.ts`
 * for convenience so callers import a single module.
 */

import type { Database } from '../../types/supabase.js';

// ---- Re-exports from Supabase ---------------------------------------

export type ProductRow = Database['public']['Tables']['products']['Row'];
export type ProductInsert = Database['public']['Tables']['products']['Insert'];
export type ProductUpdate = Database['public']['Tables']['products']['Update'];

export type ProductAliasRow = Database['public']['Tables']['product_aliases']['Row'];
export type ProductAliasInsert = Database['public']['Tables']['product_aliases']['Insert'];

export type ProductEnrichmentCacheRow =
  Database['public']['Tables']['product_enrichment_cache']['Row'];
export type ProductEnrichmentCacheInsert =
  Database['public']['Tables']['product_enrichment_cache']['Insert'];

export type ProductResolutionEventRow =
  Database['public']['Tables']['product_resolution_events']['Row'];
export type ProductResolutionEventInsert =
  Database['public']['Tables']['product_resolution_events']['Insert'];

// ---- Enrichment + resolution domain types ----------------------------

/**
 * How the product was matched. Mirrors the CHECK enum on
 * `product_resolution_events.method`.
 */
export type ResolveMethod =
  | 'barcode_local'
  | 'alias'
  | 'exact'
  | 'fuzzy'
  | 'openfoodfacts_barcode'
  | 'openfoodfacts_search'
  | 'manual_create'
  | 'clarification'
  | 'failed';

/**
 * Enrichment lifecycle status mirroring `products.enrichment_status`.
 */
export type EnrichmentStatus =
  | 'none'
  | 'pending'
  | 'enriched'
  | 'ambiguous'
  | 'failed'
  | 'stale';

export type EnrichmentSource =
  | 'none'
  | 'openfoodfacts'
  | 'manual'
  | 'assistant'
  | 'barcode_scan';

export type AliasSource =
  | 'user'
  | 'assistant'
  | 'import'
  | 'openfoodfacts'
  | 'receipt';

// ---- Public API of ProductIntelligenceService ------------------------

/**
 * Caller-supplied hints + control flags for one resolution attempt.
 *
 * PR3 will implement `ProductIntelligenceService.resolve(input)` against
 * this shape. PR4 will surface it through `POST /api/products/resolve`.
 */
export interface ResolveProductInput {
  userId: string;
  /** Original free-text the user said/typed. Audited as-is. */
  rawInput?: string;
  /** Normalised name candidate, if the caller already has one. */
  name?: string;
  /** EAN/UPC barcode digits, if known. */
  barcode?: string;
  /** Optional disambiguation hint from caller (e.g. "dairy"). */
  categoryHint?: string;
  /** Optional unit hint ("ml", "g", "unit"). */
  unitHint?: string;
  /**
   * Whether OFF calls are allowed for this resolution. Receipt + scanner
   * pass `true`; assistant batch resolves pass `false` and rely on a
   * background enrichment job to fetch later.
   */
  allowExternalLookup?: boolean;
  /**
   * Whether to auto-create a generic product when nothing matches.
   * Defaults to true for inventory/shopping flows ; receipt sets it to
   * false because creating fake products from a scanned ticket is risky.
   */
  allowCreate?: boolean;
}

/**
 * Lightweight product candidate returned in the `ambiguous` branch and
 * in the JSONB `candidates` column of `product_resolution_events`.
 */
export interface ProductCandidate {
  product_id?: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  barcode?: string | null;
  image_url?: string | null;
  score: number;
  source: 'local' | 'openfoodfacts';
}

/**
 * Discriminated union of every outcome the service can produce. PR3
 * handlers + PR4 routes pattern-match on `kind`.
 */
export type ResolveProductResult =
  | {
      kind: 'matched';
      product: ProductRow;
      confidence: number;
      via: ResolveMethod;
    }
  | {
      kind: 'created';
      product: ProductRow;
      confidence: number;
    }
  | {
      kind: 'ambiguous';
      candidates: ProductCandidate[];
      confidence: number;
    }
  | {
      kind: 'not_found';
      reason: string;
    };

// ---- Nutrition projection (per PRP-225 §6.1) -------------------------

/**
 * Projection consumed by the UI / nutrition coach (PRP-227). Mirrors
 * what we extract from OFF nutriments — both `per100g` and `per
 * serving` are supported but a single projection picks one frame of
 * reference at a time.
 */
export interface ProductNutritionProjection {
  per: '100g' | 'serving';
  energyKcal?: number;
  proteinG?: number;
  carbsG?: number;
  sugarG?: number;
  fatG?: number;
  saturatedFatG?: number;
  fiberG?: number;
  saltG?: number;
  nutriScore?: 'a' | 'b' | 'c' | 'd' | 'e' | 'unknown';
  novaGroup?: 1 | 2 | 3 | 4;
}

/**
 * Wider envelope stored at rest in `products.nutrition_json`. Keeps both
 * frames + any source metadata + a versioned schema marker so future
 * migrations can detect rows produced by an older normaliser.
 */
export interface ProductNutritionEnvelope {
  source: 'openfoodfacts' | 'manual' | 'estimated';
  per100g?: Omit<ProductNutritionProjection, 'per' | 'nutriScore' | 'novaGroup'>;
  serving?: {
    label?: string | null;
    quantity?: number | null;
    unit?: string | null;
  };
  scores?: {
    nutriScore?: ProductNutritionProjection['nutriScore'];
    novaGroup?: ProductNutritionProjection['novaGroup'];
    ecoscore?: string;
  };
  rawFieldVersion: number;
}

/**
 * Allergens envelope mirrored in `products.allergens_json`.
 */
export interface ProductAllergensEnvelope {
  source: 'openfoodfacts' | 'manual';
  allergensTags: string[];
  tracesTags: string[];
  labelsTags: string[];
}

// ---- External fetch candidate (OFF) ----------------------------------

/**
 * Normalised view of one OpenFoodFacts product, produced by
 * `ProductNormalizer` from raw OFF JSON. PR2 will implement the mapping.
 */
export interface ExternalProductCandidate {
  source: 'openfoodfacts';
  externalCode: string;
  name: string;
  genericName?: string | null;
  brand?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  quantityLabel?: string | null;
  ingredientsText?: string | null;
  nutrition?: ProductNutritionEnvelope;
  allergens?: ProductAllergensEnvelope;
  lang?: string | null;
  rawLastModifiedAt?: string | null;
  confidence: number;
}

// ---- Error codes surfaced through the API ----------------------------

/**
 * Used by `POST /api/products/resolve` and the assistant tool handlers
 * to communicate well-known failure modes. Strings, not enums, so they
 * survive JSON serialisation.
 */
export type ProductIntelligenceErrorCode =
  | 'OFF_DISABLED'
  | 'OFF_TIMEOUT'
  | 'OFF_RATE_LIMITED'
  | 'PRODUCT_AMBIGUOUS'
  | 'PRODUCT_NOT_FOUND';
