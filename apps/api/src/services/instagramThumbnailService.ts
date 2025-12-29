import { TTLCache } from '../utils/cache.js';
import { fetchJsonWithRetry, fetchWithTimeout } from '../utils/http.js';
import * as cheerio from 'cheerio';

const thumbCache = new TTLCache<any>(30 * 60 * 1000);

export async function getInstagramThumbnail(url: string) {
  const token = process.env.INSTAGRAM_OEMBED_TOKEN || process.env.FACEBOOK_APP_TOKEN;
  const cacheKey = `thumb:${token ? '1' : '0'}:${url}`;
  const cached = thumbCache.get(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetchWithTimeout(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SmartPantryBot/1.0)' } }, 5000);
    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);
      const ogImage = $('meta[property="og:image"]').attr('content') || null;
      if (ogImage) {
        const payload = { success: true, thumbnail_url: ogImage, source: url, method: 'og:image', code: 'OG_FALLBACK' };
        thumbCache.set(cacheKey, payload);
        return payload;
      }
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
