/**
 * SSRF guard for platform adapters (PRP-220.14).
 *
 * Every platform adapter MUST funnel its outbound HTTP calls through
 * `safeFetch` so the user-supplied URL can never reach metadata or
 * intranet endpoints.
 *
 * Rules:
 *   - Only http(s).
 *   - Hostname must not match a known-bad pattern (localhost, .local,
 *     RFC1918 / link-local IP literals, AWS metadata 169.254.169.254).
 *   - Default 10s timeout, capped at 64KB body unless caller opts in.
 *   - Custom User-Agent so we identify ourselves.
 */

const BLOCKED_HOST_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(?:1[6-9]|2\d|3[01])\./,
  /^169\.254\./, // link-local, includes AWS metadata
  /^::1$/,
  /^fe80::/i, // IPv6 link-local
  /^fc00::/i, // IPv6 ULA
  /^fd00::/i,
  /\.local$/i,
  /\.localhost$/i,
];

export interface SafeFetchOptions {
  /** Request timeout in ms. Defaults to 10000. */
  timeoutMs?: number;
  headers?: Record<string, string>;
  /** Override the cap on the response body (default 64 KiB). */
  maxBytes?: number;
  signal?: AbortSignal;
}

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (compatible; SmartPantryBot/1.0; +https://smartpantry.app/bot)';

export function isAllowedFetchUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase();
  return !BLOCKED_HOST_PATTERNS.some((rx) => rx.test(host));
}

export class SSRFBlockedError extends Error {
  constructor(public readonly blockedUrl: string) {
    super(`Refused to fetch ${blockedUrl}: blocked by SSRF guard`);
    this.name = 'SSRFBlockedError';
  }
}

/**
 * Fetch wrapper that enforces the SSRF allowlist + a body cap. Returns
 * the raw `Response` (so the caller can choose .json / .text / etc.).
 */
export async function safeFetch(url: string, options: SafeFetchOptions = {}): Promise<Response> {
  if (!isAllowedFetchUrl(url)) throw new SSRFBlockedError(url);

  const timeout = options.timeoutMs ?? 10_000;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeout);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        Accept: 'application/json, text/html;q=0.9, */*;q=0.5',
        'Accept-Language': 'fr,en;q=0.9',
        ...(options.headers ?? {}),
      },
      signal: options.signal ?? ac.signal,
      redirect: 'follow',
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Safe-fetch the URL and return its body as text, capped at
 * `options.maxBytes` (default 256KB for HTML pages).
 */
export async function safeFetchText(url: string, options: SafeFetchOptions = {}): Promise<string> {
  const max = options.maxBytes ?? 256 * 1024;
  const res = await safeFetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  const reader = res.body?.getReader();
  if (!reader) return await res.text();
  const decoder = new TextDecoder();
  let total = 0;
  let out = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      reader.cancel();
      break;
    }
    out += decoder.decode(value, { stream: true });
  }
  out += decoder.decode();
  return out;
}

export async function safeFetchJson<T = unknown>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<T> {
  const res = await safeFetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return (await res.json()) as T;
}
