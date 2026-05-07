/**
 * TikTok platform adapter (PRP-220.14).
 *
 * TikTok exposes a public oEmbed endpoint that returns title + author
 * + thumbnail without authentication, which is enough to feed the AI
 * extraction. We DO NOT try to fetch the video itself or any
 * authenticated user data.
 */
import { canonicalizeUrl } from '../canonicalUrl.js';
import { safeFetchJson } from './ssrfGuard.js';
import type { PlatformAdapter, PlatformContext } from './types.js';

interface TikTokOEmbedResponse {
  title?: string;
  author_name?: string;
  author_unique_id?: string;
  author_url?: string;
  thumbnail_url?: string;
}

export class TikTokAdapter implements PlatformAdapter {
  canHandle(url: string): boolean {
    try {
      const u = new URL(url);
      return u.hostname.toLowerCase().endsWith('tiktok.com');
    } catch {
      return false;
    }
  }

  async fetchContext(url: string): Promise<PlatformContext> {
    const oembed = await this.fetchOEmbed(url).catch((err) => {
      console.warn('[TikTokAdapter] oEmbed failed:', (err as Error)?.message);
      return null;
    });

    return {
      platform: 'tiktok',
      sourceUrl: url,
      canonicalUrl: canonicalizeUrl(url),
      metadata: {
        title: oembed?.title,
        authorName: oembed?.author_name,
        authorHandle: oembed?.author_unique_id ?? oembed?.author_name,
        authorUrl: oembed?.author_url,
        thumbnailUrl: oembed?.thumbnail_url,
      },
      extractionMethod: oembed ? 'oembed' : 'metadata',
    };
  }

  private async fetchOEmbed(url: string): Promise<TikTokOEmbedResponse> {
    const endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    return safeFetchJson<TikTokOEmbedResponse>(endpoint, { timeoutMs: 8000 });
  }
}
