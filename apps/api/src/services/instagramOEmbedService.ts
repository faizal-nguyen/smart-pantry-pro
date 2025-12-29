import { TTLCache } from '../utils/cache.js';
import { fetchJsonWithRetry, fetchWithTimeout } from '../utils/http.js';
import * as cheerio from 'cheerio';

const oembedCache = new TTLCache<any>(30 * 60 * 1000);

export async function fetchInstagramOEmbed(url: string) {
  const token = process.env.INSTAGRAM_OEMBED_TOKEN || process.env.FACEBOOK_APP_TOKEN;
  const cacheKey = `oembed:${token ? '1' : '0'}:${url}`;
  const cached = oembedCache.get(cacheKey);
  if (cached) return cached;

  try {
    if (token) {
      const endpoint = new URL('https://graph.facebook.com/v17.0/instagram_oembed');
      endpoint.searchParams.set('url', url);
      endpoint.searchParams.set('access_token', token);
      const data = await fetchJsonWithRetry<any>(endpoint.toString(), { method: 'GET' }, 2, 5000, 200);
      const payload = { success: true, oembed: data, source: url, code: 'OEMBED_OK' };
      oembedCache.set(cacheKey, payload);
      return payload;
    } else {
      const endpoint = new URL('https://api.instagram.com/oembed/');
      endpoint.searchParams.set('url', url);
      const data = await fetchJsonWithRetry<any>(endpoint.toString(), { method: 'GET' }, 2, 5000, 200);
      const payload = { success: true, oembed: data, source: url, code: 'OEMBED_OK' };
      oembedCache.set(cacheKey, payload);
      return payload;
    }
  } catch (e) {
    // ignore, fallthrough to OG
  }

  try {
    const res = await fetchWithTimeout(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SmartPantryBot/1.0)' } }, 5000);
    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);
      const title = $('meta[property="og:title"]').attr('content') || 'Instagram';
      const author = $('meta[name="author"]').attr('content') || 'unknown';
      const thumb = $('meta[property="og:image"]').attr('content') || null;
      const payload = {
        success: true,
        oembed: { title, author_name: author, provider_name: 'Instagram', thumbnail_url: thumb },
        source: url,
        message: 'OG fallback',
        code: 'OG_FALLBACK'
      };
      oembedCache.set(cacheKey, payload, 15 * 60 * 1000);
      return payload;
    }
  } catch {}

  return {
    success: true,
    oembed: { title: 'Instagram', provider_name: 'Instagram' },
    source: url,
    message: 'Fallback (no network)',
    code: 'FALLBACK_NO_NETWORK'
  };
}
