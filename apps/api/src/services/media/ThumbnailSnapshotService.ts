/**
 * PRP-220.24 §5.13 — capture-time thumbnail snapshot.
 *
 * Instagram / TikTok serve OG thumbnails behind short-lived signed CDN
 * URLs (`oh=…&oe=…`). Storing the remote URL on
 * `social_recipe_imports.thumbnail_url` and rendering it 6 months later
 * → 404. To break that dependency we download the thumbnail at capture
 * time, persist it to our own Supabase Storage bucket, and create a
 * `media_assets` row keyed on the import.
 *
 * Failure mode is deliberately silent: if we can't reach the remote URL
 * (network, 403, expiry already advanced), the caller stays with the
 * remote URL as a degraded fallback. This service never throws back to
 * the request path — it returns `null` and logs the reason.
 *
 * Rights posture (cf. PRP §5.13):
 *   origin        = 'thumbnail_snapshot'
 *   rights_status = 'platform_embed'    (legitimate preview)
 *   rights_basis  = NULL                (no user attestation involved)
 *   source_url    = original CDN URL    (attribution preserved)
 */
import { createHash, randomUUID } from 'node:crypto';

import type { SupabaseClient } from '@supabase/supabase-js';

import { isAllowedFetchUrl, safeFetch } from '../imports/platforms/ssrfGuard.js';
import { logger } from '../../lib/logger.js';

import { MediaAssetRepository, type MediaAssetRow } from './MediaAssetRepository.js';

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 10_000;

const IMAGE_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

export interface SnapshotInput {
  userId: string;
  importId: string;
  remoteUrl: string;
  /**
   * Page-level URL the thumbnail came from. Falls back to `remoteUrl`
   * for `media_assets.source_url`. Carries attribution so the rights
   * audit trail stays intact even if the CDN rotates the asset URL.
   */
  sourceUrl?: string;
}

export interface SnapshotResult {
  mediaAssetId: string;
  storageKey: string;
  byteSize: number;
  mimeType: string;
}

export interface ThumbnailSnapshotter {
  snapshot(input: SnapshotInput): Promise<SnapshotResult | null>;
}

export interface ThumbnailSnapshotServiceOptions {
  bucket?: string;
  maxBytes?: number;
  timeoutMs?: number;
  /** Fetch implementation injected for tests. Defaults to `safeFetch`. */
  fetchImpl?: typeof safeFetch;
}

function sniffImageMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (buf.length >= 12 && buf.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buf.subarray(8, 12).toString('ascii').toLowerCase();
    if (brand.includes('heic') || brand.includes('heif') || brand.includes('mif1')) {
      return 'image/heic';
    }
  }
  return null;
}

export class ThumbnailSnapshotService implements ThumbnailSnapshotter {
  private readonly repository: MediaAssetRepository;
  private readonly bucket: string;
  private readonly maxBytes: number;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof safeFetch;

  constructor(
    private readonly userClient: SupabaseClient<any, any, any>,
    private readonly adminClient: SupabaseClient<any, any, any>,
    options: ThumbnailSnapshotServiceOptions = {}
  ) {
    this.repository = new MediaAssetRepository(userClient);
    this.bucket = options.bucket ?? process.env.MEDIA_STORAGE_BUCKET ?? 'recipe-media';
    this.maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? safeFetch;
  }

  async snapshot(input: SnapshotInput): Promise<SnapshotResult | null> {
    if (!isAllowedFetchUrl(input.remoteUrl)) {
      logger.warn(
        { importId: input.importId, reason: 'ssrf_blocked' },
        'thumbnail-snapshot skipped'
      );
      return null;
    }

    let download: { buffer: Buffer; mimeType: string };
    try {
      download = await this.downloadImage(input.remoteUrl);
    } catch (error) {
      logger.warn(
        {
          importId: input.importId,
          reason: 'fetch_failed',
          err: error instanceof Error ? error.message : String(error),
        },
        'thumbnail-snapshot skipped'
      );
      return null;
    }

    const extension = IMAGE_MIME_TO_EXT[download.mimeType];
    const storageKey = this.buildStorageKey(input.userId, extension);

    const uploadOk = await this.uploadToStorage(storageKey, download.buffer, download.mimeType);
    if (!uploadOk) {
      return null;
    }

    let asset: MediaAssetRow;
    try {
      asset = await this.repository.createAsset({
        userId: input.userId,
        importId: input.importId,
        kind: 'thumbnail',
        origin: 'thumbnail_snapshot',
        rightsStatus: 'platform_embed',
        rightsBasis: null,
        storageProvider: 'supabase',
        storageBucket: this.bucket,
        storageKey,
        sourceUrl: input.sourceUrl ?? input.remoteUrl,
        mimeType: download.mimeType,
        byteSize: download.buffer.byteLength,
        checksumSha256: createHash('sha256').update(download.buffer).digest('hex'),
        metadata: {
          remoteUrl: input.remoteUrl,
          snapshottedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      // Row insert failed (RLS, FK, …). The storage object is now an
      // orphan — best-effort cleanup so we don't leak bytes.
      await this.adminClient.storage
        .from(this.bucket)
        .remove([storageKey])
        .then(() => undefined)
        .catch(() => undefined);
      logger.error(
        {
          importId: input.importId,
          reason: 'asset_insert_failed',
          err: error instanceof Error ? error.message : String(error),
        },
        'thumbnail-snapshot rollback'
      );
      return null;
    }

    return {
      mediaAssetId: asset.id,
      storageKey,
      byteSize: download.buffer.byteLength,
      mimeType: download.mimeType,
    };
  }

  private async downloadImage(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const res = await this.fetchImpl(url, {
      timeoutMs: this.timeoutMs,
      headers: { Accept: 'image/*,*/*;q=0.5' },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const reader = res.body?.getReader();
    let buffer: Buffer;

    if (!reader) {
      const ab = await res.arrayBuffer();
      buffer = Buffer.from(ab);
      if (buffer.byteLength > this.maxBytes) {
        throw new Error('PAYLOAD_TOO_LARGE');
      }
    } else {
      const chunks: Buffer[] = [];
      let total = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > this.maxBytes) {
          await reader.cancel().catch(() => undefined);
          throw new Error('PAYLOAD_TOO_LARGE');
        }
        chunks.push(Buffer.from(value));
      }
      buffer = Buffer.concat(chunks);
    }

    const mimeType = sniffImageMime(buffer);
    if (!mimeType) {
      throw new Error('UNSUPPORTED_MIME');
    }
    return { buffer, mimeType };
  }

  private buildStorageKey(userId: string, extension: string): string {
    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `users/${userId}/thumbnail/${yyyy}/${mm}/og-${randomUUID()}.${extension}`;
  }

  private async uploadToStorage(
    key: string,
    buffer: Buffer,
    contentType: string
  ): Promise<boolean> {
    const { error } = await this.adminClient.storage.from(this.bucket).upload(key, buffer, {
      contentType,
      upsert: false,
      cacheControl: '31536000',
    });
    if (error) {
      logger.warn(
        { reason: 'storage_upload_failed', err: error.message },
        'thumbnail-snapshot skipped'
      );
      return false;
    }
    return true;
  }
}
