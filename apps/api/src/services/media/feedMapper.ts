/**
 * PRP-220.24 §5.16 — feed mapping utilities.
 *
 * Pure helpers (no IO) that translate a `social_recipe_imports` row
 * plus its `media_assets` siblings into the consumer-facing media
 * descriptors used by the inbox card and (later) the vault feed
 * scrolly experience from PRP-220.22.
 *
 * Keeping this layer pure means it's trivially unit-testable and can
 * be reused server-side (route enrichment) AND eventually shipped to
 * the client when PRP-220.22 wires `useRecipeVaultFeed`.
 */

export type FeedMediaKind = 'video_upload' | 'video_embed' | 'image' | 'none';

export interface FeedMappableImport {
  id: string;
  metadata?: Record<string, unknown> | null;
}

export interface FeedMappableMediaAsset {
  id: string;
  import_id: string | null;
  kind: string;
  origin: string;
}

/**
 * Pick the best media descriptor for an import row, prioritising:
 *   1. user video upload  → 'video_upload' (durable, owned)
 *   2. official embed     → 'video_embed'  (oEmbed/iframe markup)
 *   3. snapshotted thumb  → 'image'        (PRP §5.13 frozen copy)
 *   4. nothing            → 'none'         (UI shows platform icon)
 *
 * NOTE: this purposefully does NOT consider `import.thumbnail_url`.
 * The remote CDN URL is treated as a fallback at render time, never
 * as a primary signal — it would silently degrade once the CDN signed
 * link expires.
 */
export function resolveMediaKind(
  imp: FeedMappableImport,
  mediaAssets: readonly FeedMappableMediaAsset[]
): FeedMediaKind {
  const ownVideo = mediaAssets.find(
    (m) => m.kind === 'video' && m.import_id === imp.id
  );
  if (ownVideo) return 'video_upload';

  const embed = (imp.metadata as { embed?: { html?: unknown } } | null | undefined)?.embed;
  if (embed && typeof embed.html === 'string' && embed.html.length > 0) {
    return 'video_embed';
  }

  const thumbnail = mediaAssets.find(
    (m) => m.kind === 'thumbnail' && m.import_id === imp.id
  );
  if (thumbnail) return 'image';

  return 'none';
}
