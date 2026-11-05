import { TTLCache } from '../utils/cache.js';
import { fetchJsonWithRetry } from '../utils/http.js';
import { safeFetchText } from './imports/platforms/ssrfGuard.js';
import * as cheerio from 'cheerio';

const thumbCache = new TTLCache<any>(30 * 60 * 1000);

const ALLOWED_HOST_SUFFIXES = ['instagram.com', 'cdninstagram.com'];

/** https URL on instagram.com / cdninstagram.com or one of their subdomains. */
export function isInstagramUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) return false;
  const host = parsed.hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

export async function getInstagramThumbnail(url: string) {
  if (!isInstagramUrl(url)) {
    return { success: false, thumbnail_url: null, source: url, message: 'Only instagram.com URLs are accepted', code: 'URL_NOT_ALLOWED' };
  }
  const token = process.env.INSTAGRAM_OEMBED_TOKEN || process.env.FACEBOOK_APP_TOKEN;
  const cacheKey = `thumb:${token ? '1' : '0'}:${url}`;
  const cached = thumbCache.get(cacheKey);
  if (cached) return cached;

  try {
    // safeFetchText refuses private/metadata hosts and caps the body.
    const html = await safeFetchText(url, { timeoutMs: 5000, maxBytes: 512 * 1024 });
    const $ = cheerio.load(html);
    const ogImage = $('meta[property="og:image"]').attr('content') || null;
    if (ogImage) {
      const payload = { success: true, thumbnail_url: ogImage, source: url, method: 'og:image', code: 'OG_FALLBACK' };
      thumbCache.set(cacheKey, payload);
      return payload;
    }
  } catch {}

  if (token) {
    try {
      const endpoint = new URL('https://graph.facebook.com/v17.0/instagram_oembed');
      endpoint.searchParams.set('url', url);
      endpoint.searchParams.set('access_token', token);
      const data = await fetchJsonWithRetry<any>(endpoint.toString(), { method: 'GET' }, 2, 5000, 200);
      const thumb = data?.thumbnail_url || null;
      if (thumb) {
        const payload = { success: true, thumbnail_url: thumb, source: url, method: 'oembed', code: 'OEMBED_OK' };
        thumbCache.set(cacheKey, payload);
        return payload;
      }
    } catch {}
  }

  return { success: true, thumbnail_url: null, source: url, message: 'Thumbnail not available (fallback)', code: 'FALLBACK_NO_NETWORK' };
}
