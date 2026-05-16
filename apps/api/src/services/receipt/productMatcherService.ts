/**
 * Product Matcher Service.
 *
 * Matches scanned receipt lines against a local alias dictionary and
 * (when alias fails) against OpenFoodFacts.
 *
 * PRP-225 PR2 — consolidates the OpenFoodFacts integration through the
 * shared `OpenFoodFactsClient` (rate-limited, retried, User-Agent
 * enforced) and the durable `ProductEnrichmentRepository` cache. The
 * legacy 5-minute in-process cache + ad-hoc fetch are gone — every
 * OFF caller now hits the same code path.
 */
import Fuse from 'fuse.js';

import { supabaseAdmin } from '../../config/supabase.js';
import {
  CACHE_TTL_MS,
  ProductEnrichmentRepository,
} from '../products/ProductEnrichmentRepository.js';
import {
  OpenFoodFactsClient,
  OpenFoodFactsClientError,
  getDefaultOpenFoodFactsClient,
  type OffProductPayload,
} from '../products/OpenFoodFactsClient.js';
import { buildSearchCacheKey } from '../products/ProductNormalizer.js';
import {
  ScannedProduct,
  EnrichedProduct,
  OpenFoodFactsProduct,
  MatchResult,
} from '../../types/receipt.types.js';
import { FRENCH_RECEIPT_ABBREVIATIONS } from './abbreviationDictionary.js';

export class ProductMatcherService {
  private aliasCache: Map<string, string> = new Map();
  private readonly off: OpenFoodFactsClient;
  private readonly repo: ProductEnrichmentRepository;

  constructor(deps: {
    offClient?: OpenFoodFactsClient;
    repository?: ProductEnrichmentRepository;
  } = {}) {
    this.off = deps.offClient ?? getDefaultOpenFoodFactsClient();
    this.repo = deps.repository ?? new ProductEnrichmentRepository(supabaseAdmin);
    this.buildAliasCache();
  }

  /**
   * Build the alias cache for fast lookups
   */
  private buildAliasCache(): void {
    for (const [abbrev, fullNames] of Object.entries(FRENCH_RECEIPT_ABBREVIATIONS)) {
      for (const name of fullNames) {
        this.aliasCache.set(abbrev.toLowerCase(), name);
      }
    }
    console.log(`[ProductMatcher] Alias cache built with ${this.aliasCache.size} entries`);
  }

  /**
   * Match a scanned product with databases
   */
  async matchProduct(product: ScannedProduct): Promise<MatchResult> {
    const normalizedName = product.normalized_name.toLowerCase();

    // STEP 1: Local alias match (fastest)
    const aliasMatch = this.matchFromAlias(normalizedName);
    if (aliasMatch.matched && aliasMatch.confidence > 0.85) {
      return aliasMatch;
    }

    // STEP 2: OpenFoodFacts API (more accurate but slower)
    const offMatch = await this.matchFromOpenFoodFacts(product.normalized_name);
    if (offMatch.matched && offMatch.confidence > 0.7) {
      return offMatch;
    }

    // STEP 3: Fuzzy matching on OFF results
    if (offMatch.product) {
      const fuzzyMatch = this.fuzzyMatch(normalizedName, [offMatch.product]);
      if (fuzzyMatch.matched) {
        return fuzzyMatch;
      }
    }

    // No reliable match found
    return {
      matched: false,
      confidence: 0,
      method: 'none',
    };
  }

  /**
   * Match from local alias dictionary
   */
  private matchFromAlias(normalizedName: string): MatchResult {
    const words = normalizedName.split(' ');

    for (const word of words) {
      if (this.aliasCache.has(word)) {
        return {
          matched: true,
          confidence: 0.9,
          method: 'alias',
          product: {
            code: '',
            product_name: this.aliasCache.get(word)!,
          },
        };
      }
    }

    return { matched: false, confidence: 0, method: 'alias' };
  }

  /**
   * Search in OpenFoodFacts via the shared client + durable cache.
   *
   * PRP-225 PR2 — replaces the legacy ad-hoc fetch + in-memory 5 min
   * Map. Cache hits / misses both land in `product_enrichment_cache`
   * so all OFF callers (this matcher + assistant + scanner) share the
   * same eviction policy.
   */
  private async matchFromOpenFoodFacts(productName: string): Promise<MatchResult> {
    const cacheKey = buildSearchCacheKey(productName, 'fr', 5);

    // 1) Try the durable cache first.
    let cached: OpenFoodFactsProduct[] | null = null;
    try {
      const { hit, expired } = await this.repo.readCache(cacheKey);
      if (hit && !expired) {
        const payload = hit.response_json as { products?: unknown } | unknown[];
        cached = normaliseCachedProducts(payload);
      }
    } catch (err) {
      console.error('[ProductMatcher] cache read failed:', err);
    }

    if (cached && cached.length > 0) {
      const bestMatch = this.findBestMatch(productName, cached);
      return {
        matched: true,
        confidence: bestMatch.score,
        method: 'off_api',
        product: bestMatch.product,
      };
    }
    if (cached && cached.length === 0) {
      // Cache hit confirming a miss — no point hitting OFF again.
      return { matched: false, confidence: 0, method: 'off_api' };
    }

    // 2) Cache miss → hit OFF through the shared client.
    let payloads: OffProductPayload[] = [];
    try {
      payloads = await this.off.searchProducts(productName, { limit: 5, locale: 'fr' });
    } catch (err) {
      // Persist the error so we don't spam OFF on every receipt line ;
      // 30 min TTL keeps the cache breathable.
      const code = err instanceof OpenFoodFactsClientError ? err.code : 'OFF_HTTP';
      const httpStatus = err instanceof OpenFoodFactsClientError ? err.httpStatus ?? null : null;
      const ttlMs =
        code === 'OFF_RATE_LIMITED' ? CACHE_TTL_MS.rateLimited : CACHE_TTL_MS.error;
      void this.repo
        .writeCache({
          cacheKey,
          query: productName,
          response: { products: [] },
          status: 'error',
          errorCode: code,
          httpStatus,
          ttlMs,
        })
        .catch((cacheErr) =>
          console.error('[ProductMatcher] error-cache write failed:', cacheErr)
        );
      console.error('[ProductMatcher] OpenFoodFacts search error:', err);
      return { matched: false, confidence: 0, method: 'off_api' };
    }

    const products: OpenFoodFactsProduct[] = payloads.map(payloadToReceiptShape);
    // 3) Persist the result (hit or miss) so the next call short-circuits.
    void this.repo
      .writeCache({
        cacheKey,
        query: productName,
        response: { products: payloads },
        status: products.length > 0 ? 'hit' : 'miss',
        ttlMs: products.length > 0 ? CACHE_TTL_MS.searchHit : CACHE_TTL_MS.searchAmbiguous,
      })
      .catch((cacheErr) =>
        console.error('[ProductMatcher] cache write failed:', cacheErr)
      );

    if (products.length > 0) {
      const bestMatch = this.findBestMatch(productName, products);
      return {
        matched: true,
        confidence: bestMatch.score,
        method: 'off_api',
        product: bestMatch.product,
      };
    }
    return { matched: false, confidence: 0, method: 'off_api' };
  }

  /**
   * Find best match using Fuse.js fuzzy search
   */
  private findBestMatch(
    query: string,
    products: OpenFoodFactsProduct[]
  ): { product: OpenFoodFactsProduct; score: number } {
    const fuse = new Fuse(products, {
      keys: ['product_name', 'brands'],
      threshold: 0.4,
      includeScore: true,
    });

    const results = fuse.search(query);

    if (results.length > 0) {
      return {
        product: results[0].item,
        score: 1 - (results[0].score || 0),
      };
    }

    return {
      product: products[0],
      score: 0.5,
    };
  }

  /**
   * Fuzzy matching on a list of products
   */
  private fuzzyMatch(query: string, products: OpenFoodFactsProduct[]): MatchResult {
    const fuse = new Fuse(products, {
      keys: ['product_name', 'brands'],
      threshold: 0.3,
      includeScore: true,
    });

    const results = fuse.search(query);

    if (results.length > 0 && results[0].score && results[0].score < 0.3) {
      return {
        matched: true,
        confidence: 1 - results[0].score,
        method: 'fuzzy',
        product: results[0].item,
      };
    }

    return { matched: false, confidence: 0, method: 'fuzzy' };
  }

  /**
   * Enrich a scanned product with all available information
   */
  async enrichProduct(product: ScannedProduct): Promise<EnrichedProduct> {
    const matchResult = await this.matchProduct(product);

    return {
      ...product,
      matched: matchResult.matched,
      matched_product: matchResult.product
        ? {
            id: matchResult.product.code,
            name: matchResult.product.product_name,
            barcode: matchResult.product.code,
            brand: matchResult.product.brands,
            nutriscore: matchResult.product.nutriscore_grade,
            image_url: matchResult.product.image_url,
          }
        : undefined,
      match_confidence: matchResult.confidence,
      match_method: matchResult.method,
      estimated_expiry_date: this.estimateExpiryDate(product.normalized_name),
      suggested_location: this.suggestLocation(product.normalized_name),
      category: this.detectCategory(product.normalized_name),
    };
  }

  /**
   * Estimate expiration date based on product type
   */
  private estimateExpiryDate(productName: string): string {
    const name = productName.toLowerCase();
    const today = new Date();

    // Fresh dairy (3-7 days)
    if (
      name.includes('lait') ||
      name.includes('yaourt') ||
      name.includes('creme') ||
      name.includes('fromage blanc')
    ) {
      today.setDate(today.getDate() + 7);
    }
    // Meat (3-5 days)
    else if (
      name.includes('poulet') ||
      name.includes('boeuf') ||
      name.includes('porc') ||
      name.includes('steak') ||
      name.includes('saucisse') ||
      name.includes('viande')
    ) {
      today.setDate(today.getDate() + 4);
    }
    // Fish (2-3 days)
    else if (
      name.includes('saumon') ||
      name.includes('poisson') ||
      name.includes('cabillaud') ||
      name.includes('crevette')
    ) {
      today.setDate(today.getDate() + 3);
    }
    // Fruits and vegetables (5-10 days)
    else if (
      name.includes('tomate') ||
      name.includes('salade') ||
      name.includes('pomme') ||
      name.includes('banane') ||
      name.includes('carotte') ||
      name.includes('courgette')
    ) {
      today.setDate(today.getDate() + 7);
    }
    // Eggs (3-4 weeks)
    else if (name.includes('oeuf')) {
      today.setDate(today.getDate() + 21);
    }
    // Cheese (2-4 weeks)
    else if (
      name.includes('fromage') ||
      name.includes('emmental') ||
      name.includes('camembert') ||
      name.includes('gruyere')
    ) {
      today.setDate(today.getDate() + 14);
    }
    // Dry goods (6-12 months)
    else if (
      name.includes('pates') ||
      name.includes('riz') ||
      name.includes('farine') ||
      name.includes('sucre') ||
      name.includes('cereales')
    ) {
      today.setMonth(today.getMonth() + 6);
    }
    // Canned goods (1-2 years)
    else if (name.includes('conserve') || name.includes('boite')) {
      today.setFullYear(today.getFullYear() + 1);
    }
    // Frozen (3-6 months)
    else if (name.includes('surgele') || name.includes('glace')) {
      today.setMonth(today.getMonth() + 3);
    }
    // Default: 1 month
    else {
      today.setMonth(today.getMonth() + 1);
    }

    return today.toISOString().split('T')[0];
  }

  /**
   * Suggest storage location based on product type
   */
  private suggestLocation(productName: string): 'frigo' | 'congelateur' | 'placard' | 'autre' {
    const name = productName.toLowerCase();

    // Fridge
    if (
      name.includes('lait') ||
      name.includes('yaourt') ||
      name.includes('beurre') ||
      name.includes('fromage') ||
      name.includes('creme') ||
      name.includes('oeuf') ||
      name.includes('jambon') ||
      name.includes('poulet') ||
      name.includes('boeuf') ||
      name.includes('porc') ||
      name.includes('viande') ||
      name.includes('saucisse') ||
      name.includes('lardon') ||
      name.includes('saumon') ||
      name.includes('poisson') ||
      name.includes('crevette') ||
      name.includes('jus')
    ) {
      return 'frigo';
    }

    // Freezer
    if (
      name.includes('surgele') ||
      name.includes('glace') ||
      name.includes('sorbet') ||
      name.includes('creme glacee')
    ) {
      return 'congelateur';
    }

    // Pantry (default)
    return 'placard';
  }

  /**
   * Detect product category
   */
  private detectCategory(productName: string): string {
    const name = productName.toLowerCase();

    if (
      name.includes('lait') ||
      name.includes('yaourt') ||
      name.includes('fromage') ||
      name.includes('beurre') ||
      name.includes('creme')
    ) {
      return 'Produits laitiers';
    }
    if (
      name.includes('poulet') ||
      name.includes('boeuf') ||
      name.includes('porc') ||
      name.includes('agneau') ||
      name.includes('veau') ||
      name.includes('viande') ||
      name.includes('steak') ||
      name.includes('jambon') ||
      name.includes('saucisse')
    ) {
      return 'Viandes';
    }
    if (
      name.includes('saumon') ||
      name.includes('poisson') ||
      name.includes('crevette') ||
      name.includes('cabillaud') ||
      name.includes('thon')
    ) {
      return 'Poissons';
    }
    if (
      name.includes('tomate') ||
      name.includes('carotte') ||
      name.includes('salade') ||
      name.includes('courgette') ||
      name.includes('pomme de terre') ||
      name.includes('oignon') ||
      name.includes('champignon')
    ) {
      return 'Legumes';
    }
    if (
      name.includes('pomme') ||
      name.includes('banane') ||
      name.includes('orange') ||
      name.includes('fraise') ||
      name.includes('poire') ||
      name.includes('kiwi') ||
      name.includes('raisin')
    ) {
      return 'Fruits';
    }
    if (
      name.includes('pates') ||
      name.includes('riz') ||
      name.includes('farine') ||
      name.includes('sucre') ||
      name.includes('huile') ||
      name.includes('sauce')
    ) {
      return 'Epicerie';
    }
    if (
      name.includes('pain') ||
      name.includes('baguette') ||
      name.includes('brioche') ||
      name.includes('croissant')
    ) {
      return 'Boulangerie';
    }
    if (
      name.includes('eau') ||
      name.includes('jus') ||
      name.includes('coca') ||
      name.includes('soda') ||
      name.includes('biere') ||
      name.includes('vin')
    ) {
      return 'Boissons';
    }
    if (name.includes('surgele') || name.includes('glace')) {
      return 'Surgeles';
    }
    if (name.includes('oeuf')) {
      return 'Oeufs';
    }

    return 'Autres';
  }

  /**
   * Re-build the alias cache. The OFF cache lives in
   * `product_enrichment_cache` and is purged by the repository on TTL
   * expiry — no in-memory state to drop here anymore.
   */
  clearCaches(): void {
    this.aliasCache.clear();
    this.buildAliasCache();
  }
}

// ---- Helpers --------------------------------------------------------

/**
 * Project the rich `OffProductPayload` into the legacy 6-field
 * `OpenFoodFactsProduct` shape consumed by the rest of the receipt
 * pipeline (Fuse.js indexes, EnrichedProduct mapping).
 */
function payloadToReceiptShape(p: OffProductPayload): OpenFoodFactsProduct {
  return {
    code: String(p.code ?? ''),
    product_name: String(p.product_name ?? p.generic_name ?? ''),
    brands: p.brands,
    categories: p.categories,
    nutriscore_grade: p.nutriscore_grade ?? p.nutrition_grades,
    image_url: p.image_front_url ?? p.image_url,
  };
}

/**
 * Cache rows store the raw `{ products: [...] }` envelope (so we can
 * reconstitute the original OFF shape on hit). Older rows might still
 * have a bare array — accept both for forward compatibility.
 */
function normaliseCachedProducts(payload: unknown): OpenFoodFactsProduct[] {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return (payload as OffProductPayload[]).map(payloadToReceiptShape);
  }
  if (typeof payload === 'object' && payload && Array.isArray((payload as { products?: unknown }).products)) {
    return ((payload as { products: OffProductPayload[] }).products).map(payloadToReceiptShape);
  }
  return [];
}

// Singleton instance
let instance: ProductMatcherService | null = null;

export function getProductMatcherService(): ProductMatcherService {
  if (!instance) {
    instance = new ProductMatcherService();
  }
  return instance;
}

/** Reset the singleton — used by tests + env-reload scenarios. */
export function resetProductMatcherService(): void {
  instance = null;
}

export default ProductMatcherService;
