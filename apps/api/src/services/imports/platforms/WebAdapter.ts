/**
 * Generic web adapter (PRP-220.14).
 *
 * Strategy for any http(s) URL that is NOT Instagram / TikTok / YouTube:
 *   1. Fetch the page HTML through the SSRF guard.
 *   2. Try to extract a JSON-LD `Recipe` block (schema.org) — most
 *      cooking blogs ship one. When found, the structured ingredients +
 *      instructions are concatenated into `rawText`, which lets the AI
 *      essentially repackage rather than guess. We mark the extraction
 *      method as `ai_inference` so the confidence ceiling stays at 1.
 *   3. Fall back to Open Graph / `<title>` metadata otherwise. Without
 *      structured data we keep the `metadata` extraction method (0.6
 *      ceiling) so the user is warned the AI is guessing from a snippet.
 *
 * The adapter MUST be registered AFTER the platform-specific adapters
 * (Instagram, TikTok, YouTube) so those win for their domains.
 */
import { canonicalizeUrl, detectPlatform } from '../canonicalUrl.js';
import { parseJsonLdRecipe, parseOpenGraph } from './htmlParsers.js';
import { safeFetchText } from './ssrfGuard.js';
import type { PlatformAdapter, PlatformContext } from './types.js';

const SOCIAL_HOSTS = [
  'instagram.com',
  'tiktok.com',
  'youtube.com',
  'youtu.be',
];

export class WebAdapter implements PlatformAdapter {
  canHandle(url: string): boolean {
    try {
      const u = new URL(url);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
      const host = u.hostname.toLowerCase();
      // Defer to the platform-specific adapters for their domains.
      return !SOCIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
    } catch {
      return false;
    }
  }

  async fetchContext(url: string): Promise<PlatformContext> {
    const html = await safeFetchText(url, {
      timeoutMs: 10_000,
      maxBytes: 512 * 1024,
    }).catch((err) => {
      console.warn('[WebAdapter] fetch failed:', (err as Error)?.message);
      return '';
    });

    const og = html ? parseOpenGraph(html) : {};
    const recipe = html ? parseJsonLdRecipe(html) : null;

    const platform = detectPlatform(url);
    const title = recipe?.name ?? og.title;
    const description = recipe?.description ?? og.description;
    const authorName = recipe?.author ?? og.authorName;
    const thumbnailUrl = recipe?.imageUrl ?? og.imageUrl;

    return {
      platform,
      sourceUrl: url,
      canonicalUrl: canonicalizeUrl(url),
      metadata: {
        title,
        description,
        authorName,
        thumbnailUrl,
      },
      rawText: recipe?.rawText,
      extractionMethod: recipe ? 'ai_inference' : 'metadata',
    };
  }
}
