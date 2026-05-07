/**
 * Service layer for the social-recipe-imports REST API (PRP-220.10).
 *
 * Wraps the repository with the URL normalisation + dedup logic so
 * the route handlers stay thin. The service is stateless; each call
 * is given a user-scoped repository (already RLS-bound) by the route.
 */
import {
  canonicalizeUrl,
  detectPlatform,
} from './canonicalUrl.js';
import { computeSourceHash } from './sourceHash.js';
import {
  type SocialImportRepository,
  type SocialImportRow,
  type ListResult,
  type PatchImportFields,
} from './SocialImportRepository.js';
import type { ListImportsQuery } from '../../schemas/imports.js';

export interface CaptureResult {
  import: SocialImportRow;
  duplicate: boolean;
}

export interface BulkCaptureItem {
  url: string;
  result?: CaptureResult;
  error?: { code: string; message: string };
}

export class SocialImportService {
  constructor(private readonly repo: SocialImportRepository) {}

  /**
   * Capture a single URL. Idempotent on (user_id, source_hash):
   * paste the same URL twice and the second call returns the existing
   * row with `duplicate: true` (no 409 in the route).
   */
  async capture(userId: string, url: string): Promise<CaptureResult> {
    const platform = detectPlatform(url);
    const canonicalUrl = canonicalizeUrl(url);
    const sourceHash = computeSourceHash(canonicalUrl);

    // Cheap pre-check first to avoid the round-trip cost of catching
    // a 23505 from Postgres on the common "duplicate" path.
    const existing = await this.repo.findByHash(userId, sourceHash);
    if (existing) return { import: existing, duplicate: true };

    try {
      const row = await this.repo.insertCaptured({
        userId,
        platform,
        sourceUrl: url,
        canonicalUrl,
        sourceHash,
      });
      return { import: row, duplicate: false };
    } catch (error: unknown) {
      // Race condition: someone else inserted between findByHash and
      // insertCaptured. Re-read and treat as duplicate.
      if (isUniqueViolation(error)) {
        const row = await this.repo.findByHash(userId, sourceHash);
        if (row) return { import: row, duplicate: true };
      }
      throw error;
    }
  }

  /**
   * Capture a list of URLs sequentially. Per-item failures are isolated
   * so one bad URL doesn't fail the whole batch.
   */
  async bulkCapture(userId: string, urls: string[]): Promise<BulkCaptureItem[]> {
    const results: BulkCaptureItem[] = [];
    for (const url of urls) {
      try {
        const result = await this.capture(userId, url);
        results.push({ url, result });
      } catch (error: unknown) {
        results.push({
          url,
          error: {
            code: 'CAPTURE_FAILED',
            message: error instanceof Error ? error.message : 'Capture failed',
          },
        });
      }
    }
    return results;
  }

  list(userId: string, query: ListImportsQuery): Promise<ListResult> {
    return this.repo.list(userId, query);
  }

  get(userId: string, id: string): Promise<SocialImportRow | null> {
    return this.repo.findById(userId, id);
  }

  patch(userId: string, id: string, fields: PatchImportFields): Promise<SocialImportRow | null> {
    return this.repo.patch(userId, id, fields);
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  return code === '23505';
}
