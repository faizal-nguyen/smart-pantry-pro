/**
 * PRP-225 PR2 — OpenFoodFacts HTTP client.
 *
 * Single point of contact between Smart Pantry and the OpenFoodFacts
 * API. Responsibilities :
 *   - barcode lookup (`/api/v2/product/<code>.json`)
 *   - free-text search (`/cgi/search.pl`)
 *   - User-Agent enforcement
 *   - short timeout (4s default)
 *   - one retry on 5xx / network error
 *   - simple in-process rate limiter (10 req/minute by default)
 *   - `fields=` always explicit so payloads stay small
 *
 * The client returns RAW OFF JSON. Mapping to the app's domain shape
 * (`ExternalProductCandidate`, `ProductNutritionEnvelope`) lives in
 * `ProductNormalizer`. Caching at rest is `ProductEnrichmentRepository`'s
 * job — the client itself is stateless beyond its rate-limiter window.
 *
 * Production safety : if `OPENFOODFACTS_USER_AGENT` is missing, the
 * client throws `OFF_DISABLED` instead of falling back to a generic
 * UA — OpenFoodFacts has banned anonymous traffic at peak hours.
 */

import { env } from '../../config/env.js';

const DEFAULT_BASE_URL = 'https://world.openfoodfacts.org';
const DEFAULT_TIMEOUT_MS = 4000;
const DEFAULT_RATE_LIMIT_PER_MINUTE = 10;
const RATE_WINDOW_MS = 60 * 1000;

// The fields list mirrors PRP-225 §7.3. Order matters for cache key
// stability — keep it sorted alphabetically so query-string hash is
// deterministic between client versions.
export const DEFAULT_OFF_FIELDS = [
  'allergens_tags',
  'brands',
  'categories',
  'categories_tags',
  'code',
  'countries_tags',
  'ecoscore_grade',
  'generic_name',
  'image_front_url',
  'image_url',
  'ingredients_text',
  'labels_tags',
  'lang',
  'last_modified_t',
  'nova_group',
  'nutriments',
  'nutriscore_grade',
  'nutrition_grades',
  'product_name',
  'quantity',
  'serving_size',
  'traces_tags',
].join(',');

// ---- Public types ---------------------------------------------------

export interface OffNutriments {
  energy_kcal_100g?: number;
  energy_100g?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  sugars_100g?: number;
  fat_100g?: number;
  'saturated-fat_100g'?: number;
  fiber_100g?: number;
  salt_100g?: number;
  sodium_100g?: number;
  [k: string]: number | string | undefined;
}

export interface OffProductPayload {
  code?: string;
  product_name?: string;
  generic_name?: string;
  brands?: string;
  quantity?: string;
  image_front_url?: string;
  image_url?: string;
  categories?: string;
  categories_tags?: string[];
  nutriments?: OffNutriments;
  nutrition_grades?: string;
  nutriscore_grade?: string;
  nova_group?: number;
  ecoscore_grade?: string;
  serving_size?: string;
  allergens_tags?: string[];
  traces_tags?: string[];
  labels_tags?: string[];
  ingredients_text?: string;
  countries_tags?: string[];
  lang?: string;
  last_modified_t?: number;
}

export interface OffBarcodeResponse {
  status: number; // 1 if found, 0 otherwise
  code?: string;
  product?: OffProductPayload;
  // Other fields ignored — we only use status + product.
}

export interface OffSearchResponse {
  products?: OffProductPayload[];
  count?: number;
  page_count?: number;
  // Other fields ignored.
}

export type OffClientErrorCode =
  | 'OFF_DISABLED'
  | 'OFF_TIMEOUT'
  | 'OFF_RATE_LIMITED'
  | 'OFF_NETWORK'
  | 'OFF_HTTP';

export class OpenFoodFactsClientError extends Error {
  readonly code: OffClientErrorCode;
  readonly httpStatus?: number;
  readonly retryAfter?: number;
  constructor(code: OffClientErrorCode, message: string, opts: { httpStatus?: number; retryAfter?: number } = {}) {
    super(message);
    this.name = 'OpenFoodFactsClientError';
    this.code = code;
    this.httpStatus = opts.httpStatus;
    this.retryAfter = opts.retryAfter;
  }
}

export interface OpenFoodFactsClientOptions {
  baseUrl?: string;
  userAgent?: string;
  timeoutMs?: number;
  rateLimitPerMinute?: number;
  /** Inject for tests. Defaults to global `fetch`. */
  fetchImpl?: typeof fetch;
  /** Inject for tests. Defaults to `Date.now`. */
  now?: () => number;
  /**
   * If true, throw `OFF_DISABLED` instead of warning when User-Agent is
   * absent. Defaults to `process.env.NODE_ENV === 'production'`.
   */
  strictUserAgent?: boolean;
}

// ---- Implementation -------------------------------------------------

export class OpenFoodFactsClient {
  private readonly baseUrl: string;
  private readonly userAgent: string | undefined;
  private readonly timeoutMs: number;
  private readonly rateLimitPerMinute: number;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly strictUserAgent: boolean;
  private readonly callTimestamps: number[] = [];

  constructor(opts: OpenFoodFactsClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? env.OPENFOODFACTS_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.userAgent = opts.userAgent ?? env.OPENFOODFACTS_USER_AGENT;
    this.timeoutMs = opts.timeoutMs ?? env.OPENFOODFACTS_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS;
    this.rateLimitPerMinute = opts.rateLimitPerMinute ?? env.OPENFOODFACTS_RATE_LIMIT_PER_MINUTE ?? DEFAULT_RATE_LIMIT_PER_MINUTE;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.now = opts.now ?? Date.now;
    this.strictUserAgent =
      opts.strictUserAgent ?? process.env.NODE_ENV === 'production';
  }

  /**
   * Returns true when the client is correctly configured and willing to
   * make outgoing calls. Callers should short-circuit when false to
   * avoid `OFF_DISABLED` exceptions on every request.
   */
  isEnabled(): boolean {
    if (this.userAgent && this.userAgent.trim().length > 0) return true;
    return !this.strictUserAgent; // dev with no UA → fallback enabled
  }

  /**
   * Barcode lookup via API v2. Returns `null` when the product is not
   * found (status=0). Throws `OpenFoodFactsClientError` on transport
   * failure ; callers cache the negative result themselves.
   */
  async getProductByBarcode(barcode: string, opts: { fields?: string } = {}): Promise<OffProductPayload | null> {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) {
      throw new OpenFoodFactsClientError('OFF_HTTP', 'barcode required');
    }
    const fields = opts.fields ?? DEFAULT_OFF_FIELDS;
    const url = `${this.baseUrl}/api/v2/product/${encodeURIComponent(cleanBarcode)}.json?fields=${encodeURIComponent(fields)}`;
    const raw = await this.request<OffBarcodeResponse>(url);
    if (!raw || raw.status === 0) return null;
    return raw.product ?? null;
  }

  /**
   * Full-text search. Falls back to OFF's `/cgi/search.pl` since v2
   * search has historically been less reliable for FR queries. PRP-225
   * §0 explicitly accepts this trade-off for V1.
   */
  async searchProducts(
    query: string,
    opts: { limit?: number; locale?: string; fields?: string } = {}
  ): Promise<OffProductPayload[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const limit = Math.min(Math.max(opts.limit ?? 5, 1), 20);
    const locale = opts.locale ?? 'fr';
    const fields = opts.fields ?? DEFAULT_OFF_FIELDS;
    const params = new URLSearchParams({
      search_terms: trimmed,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: String(limit),
      lc: locale,
      fields,
    });
    const url = `${this.baseUrl}/cgi/search.pl?${params.toString()}`;
    const raw = await this.request<OffSearchResponse>(url);
    return raw?.products ?? [];
  }

  // ---- internals ----------------------------------------------------

  /**
   * One request with timeout + one retry on transient failures. Honors
   * `Retry-After` when present on 429 responses.
   */
  private async request<T>(url: string): Promise<T | null> {
    if (!this.isEnabled()) {
      throw new OpenFoodFactsClientError(
        'OFF_DISABLED',
        'OpenFoodFacts User-Agent missing — refusing to call in production mode'
      );
    }
    this.guardRateLimit();
    try {
      return await this.executeOnce<T>(url);
    } catch (err) {
      if (err instanceof OpenFoodFactsClientError) {
        // Retry exactly once on transient failures.
        const retriable =
          err.code === 'OFF_TIMEOUT' ||
          err.code === 'OFF_NETWORK' ||
          (err.code === 'OFF_HTTP' && (err.httpStatus ?? 0) >= 500);
        if (retriable) {
          this.guardRateLimit();
          return await this.executeOnce<T>(url);
        }
      }
      throw err;
    }
  }

  private async executeOnce<T>(url: string): Promise<T | null> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.userAgent) headers['User-Agent'] = this.userAgent;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      // Abort can surface either as a DOMException(name='AbortError') or
      // as a plain Error depending on the runtime / fetch polyfill ; the
      // most reliable signal is the controller state itself.
      const isAbort =
        controller.signal.aborted ||
        (err instanceof Error && err.name === 'AbortError');
      if (isAbort) {
        throw new OpenFoodFactsClientError('OFF_TIMEOUT', `OFF timeout after ${this.timeoutMs}ms`);
      }
      throw new OpenFoodFactsClientError(
        'OFF_NETWORK',
        err instanceof Error ? err.message : 'network error'
      );
    }
    clearTimeout(timer);

    if (response.status === 429) {
      const retryAfter = parseRetryAfter(response.headers.get('retry-after'));
      throw new OpenFoodFactsClientError('OFF_RATE_LIMITED', 'OFF rate limited', {
        httpStatus: 429,
        retryAfter,
      });
    }
    if (!response.ok) {
      throw new OpenFoodFactsClientError(
        'OFF_HTTP',
        `OFF HTTP ${response.status}`,
        { httpStatus: response.status }
      );
    }
    // 200 with empty body is treated as null rather than an exception
    // so callers can record a miss in the cache.
    try {
      const json = (await response.json()) as T;
      return json ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Sliding-window counter. Drops timestamps older than 1 minute, then
   * throws `OFF_RATE_LIMITED` if the in-flight request would exceed the
   * configured budget.
   */
  private guardRateLimit(): void {
    const cutoff = this.now() - RATE_WINDOW_MS;
    while (this.callTimestamps.length > 0 && this.callTimestamps[0] < cutoff) {
      this.callTimestamps.shift();
    }
    if (this.callTimestamps.length >= this.rateLimitPerMinute) {
      throw new OpenFoodFactsClientError(
        'OFF_RATE_LIMITED',
        `OFF internal rate limit: ${this.rateLimitPerMinute}/min reached`
      );
    }
    this.callTimestamps.push(this.now());
  }
}

// ---- Helpers --------------------------------------------------------

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number.parseInt(header, 10);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const date = Date.parse(header);
  if (Number.isFinite(date)) {
    const delta = Math.ceil((date - Date.now()) / 1000);
    return delta > 0 ? delta : 0;
  }
  return undefined;
}

// Lazy singleton for production callers that don't need to inject deps.
let _client: OpenFoodFactsClient | null = null;
export function getDefaultOpenFoodFactsClient(): OpenFoodFactsClient {
  if (!_client) _client = new OpenFoodFactsClient();
  return _client;
}
/** Reset singleton (for tests + env-reload scenarios). */
export function resetDefaultOpenFoodFactsClient(): void {
  _client = null;
}
