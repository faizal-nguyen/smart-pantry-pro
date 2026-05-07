/**
 * Instagram platform adapter (PRP-220.14).
 *
 * Strategy:
 *   1. If `INSTAGRAM_OEMBED_TOKEN` is set, hit Facebook's Graph oEmbed
 *      endpoint to get the title / author / thumbnail.
 *   2. Always fall back to scraping Open Graph metadata from the
 *      public page (Instagram exposes og:title / og:description /
 *      og:image even for non-logged-in viewers).
 *   3. Never attempt to read non-public content.
 */
import { canonicalizeUrl, detectPlatform } from '../canonicalUrl.js';
import { parseOpenGraph } from './htmlParsers.js';
import { safeFetch, safeFetchJson, safeFetchText } from './ssrfGuard.js';
import type { PlatformAdapter, PlatformContext } from './types.js';

interface InstagramOEmbedResponse {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
  provider_name?: string;
}

export class InstagramAdapter implements PlatformAdapter {
  canHandle(url: string): boolean {
    try {
      const u = new URL(url);
      return u.hostname.toLowerCase().endsWith('instagram.com');
    } catch {
      return false;
    }
  }

  async fetchContext(url: string): Promise<PlatformContext> {
    const oembed = await this.fetchOEmbed(url).catch((err) => {
      console.warn('[InstagramAdapter] oEmbed failed:', (err as Error)?.message);
      return null;
    });

    let og = null as ReturnType<typeof parseOpenGraph> | null;
    if (!oembed?.title || !oembed?.thumbnail_url) {
      og = await this.fetchOpenGraph(url).catch((err) => {
        console.warn('[InstagramAdapter] OG fallback failed:', (err as Error)?.message);
        return null;
      });
    }

    const title = oembed?.title ?? og?.title;
    const description = og?.description;
    const authorName = oembed?.author_name;
    const authorHandle = oembed?.author_name; // Instagram exposes the
    // handle as author_name; the display name is not available without
    // an authenticated session.
    const thumbnailUrl = oembed?.thumbnail_url ?? og?.imageUrl;

    return {
      platform: 'instagram',
      sourceUrl: url,
      canonicalUrl: canonicalizeUrl(url),
      metadata: {
        title,
        description,
        authorName,
        authorHandle,
        thumbnailUrl,
      },
      extractionMethod: oembed ? 'oembed' : 'metadata',
    };
  }

  private async fetchOEmbed(url: string): Promise<InstagramOEmbedResponse | null> {
    const token = process.env.INSTAGRAM_OEMBED_TOKEN;
    if (!token) return null;
    const endpoint = `https://graph.facebook.com/v19.0/instagram_oembed?url=${encodeURIComponent(
      url
    )}&access_token=${encodeURIComponent(token)}&omitscript=true`;
    return safeFetchJson<InstagramOEmbedResponse>(endpoint, { timeoutMs: 8000 });
  }

  private async fetchOpenGraph(url: string) {
    const html = await safeFetchText(url, { timeoutMs: 10_000, maxBytes: 256 * 1024 });
    return parseOpenGraph(html);
  }
}
