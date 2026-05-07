/**
 * Catch-all adapter (PRP-220.13). Always claims to handle a URL and
 * returns a minimal context derived from the URL alone — no HTTP
 * fetch, no parsing.
 *
 * The intent is to keep `/api/imports/social/:id/extract` functional
 * before PRP-220.14 lands the real Instagram / TikTok / YouTube /
 * Web adapters: extraction will run with what little metadata the
 * captured row already carries (title, author, thumbnail) and the
 * confidence will reflect that.
 *
 * Insertion order matters: this adapter MUST be registered last so
 * specific adapters (Instagram first, etc.) win.
 */
import { canonicalizeUrl, detectPlatform } from '../canonicalUrl.js';

import type { PlatformAdapter, PlatformContext, PlatformContextMetadata } from './types.js';

export class FallbackWebAdapter implements PlatformAdapter {
  canHandle(url: string): boolean {
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  async fetchContext(url: string, seed?: PlatformContextMetadata): Promise<PlatformContext> {
    const platform = detectPlatform(url);
    return {
      platform,
      sourceUrl: url,
      canonicalUrl: canonicalizeUrl(url),
      metadata: seed ?? {},
      extractionMethod: 'metadata',
    };
  }
}
