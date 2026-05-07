/**
 * Platform adapter contract (PRP-220.13).
 *
 * A `PlatformAdapter` knows how to fetch the *minimum useful context*
 * for an URL on a given platform — title, author, thumbnail, plus
 * (when available) a transcript or raw page text. The
 * `RecipeExtractionService` then turns that context into an
 * `ImportedRecipeDraft`.
 *
 * PRP-220.13 ships only a generic `FallbackWebAdapter`. The Instagram /
 * TikTok / YouTube / web adapters that actually do HTTP fetches land
 * in PRP-220.14; they will simply be added to the adapter registry
 * without changing the contract.
 */
import type { ExtractionMethod, SocialPlatform } from '@smart/shared';

export interface PlatformContextMetadata {
  title?: string;
  description?: string;
  authorName?: string;
  authorHandle?: string;
  authorUrl?: string;
  thumbnailUrl?: string;
}

export interface PlatformContext {
  platform: SocialPlatform;
  sourceUrl: string;
  canonicalUrl: string;
  metadata: PlatformContextMetadata;
  /** Audio transcript (e.g. YouTube captions) when available. */
  transcript?: string;
  /** Raw page text (e.g. blog scraping) when available. */
  rawText?: string;
  /** How the context above was obtained. Drives the confidence ceiling. */
  extractionMethod: ExtractionMethod;
}

export interface PlatformAdapter {
  /** Cheap predicate: does this adapter handle this URL? */
  canHandle(url: string): boolean;
  /** Fetch (or synthesise) a PlatformContext for the URL. */
  fetchContext(url: string): Promise<PlatformContext>;
}

/**
 * Pick the first adapter that claims to handle `url`. Returns null
 * when none match (in which case the caller should surface a clean
 * "unsupported URL" error rather than guessing).
 */
export function findAdapter(
  url: string,
  adapters: readonly PlatformAdapter[]
): PlatformAdapter | null {
  for (const a of adapters) if (a.canHandle(url)) return a;
  return null;
}
