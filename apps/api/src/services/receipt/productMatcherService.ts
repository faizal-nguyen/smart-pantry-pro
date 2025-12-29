/**
 * Product Matcher Service
 * Matches scanned products with OpenFoodFacts and local alias database
 */
import Fuse from 'fuse.js';
import {
  ScannedProduct,
  EnrichedProduct,
  OpenFoodFactsProduct,
  MatchResult,
} from '../../types/receipt.types.js';
import { FRENCH_RECEIPT_ABBREVIATIONS } from './abbreviationDictionary.js';

export class ProductMatcherService {
  private aliasCache: Map<string, string> = new Map();
  private offCache: Map<string, OpenFoodFactsProduct[]> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
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
   * Search in OpenFoodFacts
   */
  private async matchFromOpenFoodFacts(productName: string): Promise<MatchResult> {
    try {
      // Check cache first
      const cacheKey = productName.toLowerCase();
      if (this.offCache.has(cacheKey)) {
        const cached = this.offCache.get(cacheKey)!;
        if (cached.length > 0) {
          return {
            matched: true,
            confidence: 0.8,
            method: 'off_api',
            product: cached[0],
          };
        }
      }

      // API call to OpenFoodFacts
      const searchTerms = encodeURIComponent(productName);
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${searchTerms}&search_simple=1&action=process&json=1&page_size=5&lc=fr`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SmartPantryPro/1.0 (contact@smartpantry.app)',
        },
      });

      if (!response.ok) {
        throw new Error(`OFF API error: ${response.status}`);
      }

      const data = await response.json();
      const products: OpenFoodFactsProduct[] = (data.products || []).map((p: Record<string, unknown>) => ({
        code: String(p.code || ''),
        product_name: String(p.product_name || ''),
        brands: String(p.brands || ''),
        categories: String(p.categories || ''),
        nutriscore_grade: String(p.nutriscore_grade || ''),
        image_url: String(p.image_url || ''),
      }));

      // Cache the results
      this.offCache.set(cacheKey, products);

      if (products.length > 0) {
        // Find the best match
        const bestMatch = this.findBestMatch(productName, products);
        return {
          matched: true,
          confidence: bestMatch.score,
          method: 'off_api',
          product: bestMatch.product,
        };
      }

      return { matched: false, confidence: 0, method: 'off_api' };
    } catch (error) {
      console.error('[ProductMatcher] OpenFoodFacts search error:', error);
      return { matched: false, confidence: 0, method: 'off_api' };
    }
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
   * Clear caches (useful for testing or memory management)
   */
  clearCaches(): void {
    this.offCache.clear();
  }
}

// Singleton instance
let instance: ProductMatcherService | null = null;

export function getProductMatcherService(): ProductMatcherService {
  if (!instance) {
    instance = new ProductMatcherService();
  }
  return instance;
}

export default ProductMatcherService;
