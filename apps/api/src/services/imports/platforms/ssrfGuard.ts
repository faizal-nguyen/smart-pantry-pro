/**
 * SSRF guard for platform adapters (PRP-220.14).
 *
 * Every platform adapter MUST funnel its outbound HTTP calls through
 * `safeFetch` so the user-supplied URL can never reach metadata or
 * intranet endpoints.
 *
 * Rules:
 *   - Only http(s).
 *   - No local name (localhost, .local, .internal) and no private, loopback,
 *     link-local (cloud metadata), CGNAT, multicast or reserved address, as a
 *     literal (bracketed IPv6 and IPv4-mapped included) or once the name is resolved.
 *   - Redirects are followed by hand, each target checked again (5 at most).
 *   - Default 10s timeout, capped at 64KB body unless caller opts in.
 *   - Custom User-Agent so we identify ourselves.
 */

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

// Names that only mean something inside a network.
const BLOCKED_HOST_NAMES: RegExp[] = [/^localhost$/i, /\.localhost$/i, /\.local$/i, /\.internal$/i];
const MAX_REDIRECTS = 5;

function privateIPv4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 // this network, private, loopback, multicast and reserved
    || (a === 100 && b >= 64 && b <= 127) // carrier-grade NAT
    || (a === 169 && b === 254) // link-local, cloud metadata
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
    || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19));
}

/** The 8 groups of an IPv6 address, an embedded dotted IPv4 included; null when malformed. */
function ipv6Groups(ip: string): number[] | null {
  let text = ip;
  const dotted = text.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (dotted) {
    const [w, x, y, z] = dotted.slice(1).map(Number);
    text = text.slice(0, -dotted[0].length) + ((w << 8) | x).toString(16) + ':' + ((y << 8) | z).toString(16);
  }
  const halves = text.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const fill = 8 - head.length - tail.length;
  if (fill < 0 || (halves.length === 1 && fill !== 0)) return null;
  const groups = [...head, ...Array(halves.length === 2 ? fill : 0).fill('0'), ...tail].map(group => parseInt(group, 16));
  return groups.length === 8 && groups.every(group => Number.isInteger(group) && group >= 0 && group <= 0xffff) ? groups : null;
}

function privateIPv6(ip: string): boolean {
  const g = ipv6Groups(ip.toLowerCase());
  if (!g) return true;
  const embedded = () => privateIPv4(`${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`);
  if (g.slice(0, 7).every(group => group === 0)) return g[7] <= 1; // :: and ::1
  if (g.slice(0, 5).every(group => group === 0) && (g[5] === 0xffff || g[5] === 0)) return embedded(); // IPv4-mapped or -compatible
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every(group => group === 0)) return embedded(); // NAT64
  return (g[0] & 0xfe00) === 0xfc00 || (g[0] & 0xffc0) === 0xfe80 || (g[0] & 0xff00) === 0xff00; // unique local, link-local, multicast
}

/** An address of a private, local or reserved network; anything unparseable counts as one. */
export function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip);
  return family === 4 ? privateIPv4(ip) : family === 6 ? privateIPv6(ip) : true;
}

const hostOf = (url: URL) => url.hostname.replace(/^\[|\]$/g, '').toLowerCase();

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

/** Synchronous check of a URL as written: scheme, local names and IP literals (bracketed IPv6 too). */
export function isAllowedFetchUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  const host = hostOf(parsed);
  if (!host || BLOCKED_HOST_NAMES.some((rx) => rx.test(host))) return false;
  return isIP(host) ? !isPrivateAddress(host) : true;
}

/** A name must resolve to public addresses only. A rebinding between this lookup and the request stays possible. */
async function assertPublicDestination(url: string): Promise<void> {
  const host = hostOf(new URL(url));
  if (isIP(host)) return;
  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new SSRFBlockedError(url);
  }
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new SSRFBlockedError(url);
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
  const timeout = options.timeoutMs ?? 10_000;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeout);

  try {
    // Redirects are followed by hand: a public page may send to an internal address.
    let current = url;
    for (let hop = 0; ; hop++) {
      if (!isAllowedFetchUrl(current)) throw new SSRFBlockedError(current);
      await assertPublicDestination(current);
      const res = await fetch(current, {
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          Accept: 'application/json, text/html;q=0.9, */*;q=0.5',
          'Accept-Language': 'fr,en;q=0.9',
          ...(options.headers ?? {}),
        },
        signal: options.signal ?? ac.signal,
        redirect: 'manual',
      });
      const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
      if (!location) return res;
      if (hop >= MAX_REDIRECTS) throw new SSRFBlockedError(current);
      current = new URL(location, current).toString();
    }
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
