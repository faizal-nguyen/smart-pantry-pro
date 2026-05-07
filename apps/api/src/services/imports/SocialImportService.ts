/**
 * Service layer for the social-recipe-imports REST API (PRP-220.10
 * for capture/list, PRP-220.11 for extract/save).
 *
 * Wraps the repository with the URL normalisation + dedup logic so
 * the route handlers stay thin. The service is stateless; each call
 * is given a user-scoped repository (already RLS-bound) by the route.
 */
import type { ImportedRecipeDraft } from '@smart/shared';
import { ImportedRecipeDraftSchema } from '@smart/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  canonicalizeUrl,
  detectPlatform,
} from './canonicalUrl.js';
import { computeSourceHash } from './sourceHash.js';
import {
  type SocialImportRepository,
  type SocialImportRow,
  type ImportedRecipeDraftRow,
  type ListResult,
  type PatchImportFields,
} from './SocialImportRepository.js';
import type { ListImportsQuery } from '../../schemas/imports.js';
import {
  type RecipeExtractionService,
  type ExtractionRequest,
  type ExtractionResult,
  NotImplementedExtractionService,
} from './extractionContract.js';
import {
  type SaveImportedDraftAsRecipe,
  type SaveDraftAsRecipeOptions,
  notImplementedSaveImportedDraftAsRecipe,
} from './saveContract.js';
import {
  ExtractionFailedError,
  ImportInvalidStateError,
  ImportNotFoundError,
  NoDraftAvailableError,
  SaveFailedError,
} from './importErrors.js';
import { metrics } from '../../lib/metrics.js';
import { logExtraction } from '../../lib/logger.js';

export interface CaptureResult {
  import: SocialImportRow;
  duplicate: boolean;
}

export interface BulkCaptureItem {
  url: string;
  result?: CaptureResult;
  error?: { code: string; message: string };
}

export interface ExtractFlowResult {
  import: SocialImportRow;
  draft: ImportedRecipeDraftRow;
  cost?: ExtractionResult['cost'];
  modelUsed?: string;
  durationMs?: number;
}

export interface SaveFlowResult {
  import: SocialImportRow;
  recipeId: string;
}

export interface SocialImportServiceOptions {
  /**
   * Provider that turns a captured import into an ImportedRecipeDraft.
   * Wired by PRP-220.13. When omitted, calls to `extract` raise
   * 422 EXTRACTION_FAILED with an explicit "not wired" message.
   */
  extractionService?: RecipeExtractionService;
  /**
   * Persistor that turns a validated ImportedRecipeDraft into a row
   * in `recipes`. Wired by PRP-220.16. When omitted, calls to `save`
   * raise 422 SAVE_FAILED with an explicit "not wired" message.
   */
  saveImportedDraftAsRecipe?: SaveImportedDraftAsRecipe;
}

const CONFIDENCE_REVIEW_THRESHOLD = 0.6;

export class SocialImportService {
  private readonly extractionService: RecipeExtractionService;
  private readonly saveImportedDraftAsRecipe: SaveImportedDraftAsRecipe;

  constructor(
    private readonly repo: SocialImportRepository,
    options: SocialImportServiceOptions = {}
  ) {
    this.extractionService = options.extractionService ?? new NotImplementedExtractionService();
    this.saveImportedDraftAsRecipe =
      options.saveImportedDraftAsRecipe ?? notImplementedSaveImportedDraftAsRecipe;
  }

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

  /**
   * Return the import + its current draft (the one with is_current=TRUE).
   * Used by the inbox UI's "Vérifier" flow (PRP-220.12) to open the
   * ExtractedRecipeModal pre-filled with the latest extraction. Returns
   * null when the import doesn't exist for the user.
   */
  async getWithCurrentDraft(
    userId: string,
    importId: string
  ): Promise<{ import: SocialImportRow; draft: ImportedRecipeDraftRow | null } | null> {
    const imp = await this.repo.findById(userId, importId);
    if (!imp) return null;
    const draft = await this.repo.findCurrentDraft(importId);
    return { import: imp, draft };
  }

  /**
   * Trigger extraction on a captured import (PRP-220.11).
   *
   * State machine:
   *   captured | metadata_ready | draft_ready | needs_review | failed
   *     -> extracting (atomic)
   *     -> draft_ready (confidence >= 0.6) | needs_review (< 0.6)
   *     or
   *     -> failed (with error_code/error_message persisted)
   *
   * `extracting | saved | archived` are rejected with INVALID_STATE.
   */
  async extract(
    userId: string,
    importId: string,
    options: ExtractionRequest = {}
  ): Promise<ExtractFlowResult> {
    const existing = await this.repo.findById(userId, importId);
    if (!existing) throw new ImportNotFoundError(importId);

    const acquired = await this.repo.transitionToExtracting(userId, importId);
    if (!acquired) {
      // The row exists (we just read it) but the conditional UPDATE
      // didn't return a row -> status is one of the terminal /
      // already-extracting values.
      throw new ImportInvalidStateError(existing.status);
    }

    const t0 = Date.now();
    let result: ExtractionResult;
    try {
      result = await this.extractionService.extract(acquired, options);
    } catch (error: unknown) {
      // Persist the failure so the user sees a clear message in the
      // inbox. Don't bubble the underlying message to the client; log
      // it server-side instead (the route handler does that already).
      const message = error instanceof Error ? error.message : 'Extraction failed';
      await this.repo.updateLifecycle(userId, importId, {
        status: 'failed',
        error_code: 'EXTRACTION_FAILED',
        error_message: message.slice(0, 500),
      });
      metrics.extractionTotal.inc({ platform: acquired.platform, outcome: 'failed' });
      logExtraction({
        userId,
        importId,
        platform: acquired.platform,
        model: '',
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        durationMs: Date.now() - t0,
        confidence: 0,
        warningsCount: 0,
        outcome: 'failed',
        errorCode: 'EXTRACTION_FAILED',
        errorMessage: message.slice(0, 500),
      });
      throw new ExtractionFailedError(acquired.platform, message, error);
    }

    // Validate the draft shape before persisting. An IA-driven
    // implementation could in theory return junk; the schema is the
    // gatekeeper.
    const validation = ImportedRecipeDraftSchema.safeParse(result.draft);
    if (!validation.success) {
      const message = `Invalid extracted draft: ${validation.error.issues
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; ')}`;
      await this.repo.updateLifecycle(userId, importId, {
        status: 'failed',
        error_code: 'EXTRACTION_INVALID',
        error_message: message.slice(0, 500),
      });
      throw new ExtractionFailedError(acquired.platform, message);
    }
    const validatedDraft: ImportedRecipeDraft = validation.data;

    const draftRow = await this.repo.insertNewDraft({
      importId: acquired.id,
      userId,
      draftJson: validatedDraft,
      sourceExtractionMethod: validatedDraft.source.extractionMethod,
      aiModel: result.modelUsed,
      aiInputTokens: result.cost?.inputTokens,
      aiOutputTokens: result.cost?.outputTokens,
      costUsdEstimate: result.cost?.usd,
    });

    const newStatus =
      validatedDraft.confidence >= CONFIDENCE_REVIEW_THRESHOLD ? 'draft_ready' : 'needs_review';
    const updated = await this.repo.updateLifecycle(userId, importId, {
      status: newStatus,
      title: validatedDraft.title,
      thumbnail_url: validatedDraft.imageUrl ?? validatedDraft.source.thumbnailUrl ?? null,
      author_name: validatedDraft.source.authorName ?? null,
      author_handle: validatedDraft.source.authorHandle ?? null,
      confidence: Number(validatedDraft.confidence.toFixed(3)),
      error_code: null,
      error_message: null,
    });
    if (!updated) throw new ImportNotFoundError(importId);

    metrics.extractionTotal.inc({ platform: acquired.platform, outcome: 'success' });
    metrics.extractionLatency.observe({ platform: acquired.platform }, result.durationMs ?? 0);
    if (result.modelUsed && result.cost) {
      metrics.extractionCost.inc({ model: result.modelUsed }, result.cost.usd);
      metrics.extractionTokens.inc(
        { model: result.modelUsed, direction: 'input' },
        result.cost.inputTokens
      );
      metrics.extractionTokens.inc(
        { model: result.modelUsed, direction: 'output' },
        result.cost.outputTokens
      );
    }
    logExtraction({
      userId,
      importId,
      platform: acquired.platform,
      model: result.modelUsed ?? '',
      inputTokens: result.cost?.inputTokens ?? 0,
      outputTokens: result.cost?.outputTokens ?? 0,
      costUsd: result.cost?.usd ?? 0,
      durationMs: result.durationMs ?? 0,
      confidence: validatedDraft.confidence,
      warningsCount: validatedDraft.extractionWarnings?.length ?? 0,
      outcome: 'success',
    });

    return {
      import: updated,
      draft: draftRow,
      cost: result.cost,
      modelUsed: result.modelUsed,
      durationMs: result.durationMs,
    };
  }

  /**
   * Persist a validated draft as a real recipe (PRP-220.11).
   *
   * - Uses the `draft` from the request body if provided (user may
   *   have edited the draft in the modal). Otherwise falls back to
   *   the current draft on disk.
   * - Calls the configured saveImportedDraftAsRecipe (PRP-220.16) to
   *   create the row in `recipes` and return its id.
   * - Updates the import to status=saved + recipe_id.
   *
   * Idempotence: re-saving an import that is already `saved` raises
   * INVALID_STATE so the client surfaces it as a 409. The actual
   * recipe row is keyed by import_id at the persistence layer, so the
   * underlying call is also idempotent.
   */
  async save(
    client: SupabaseClient<any, any, any>,
    userId: string,
    importId: string,
    options: {
      draft?: unknown;
      collections?: string[];
      personalNotes?: string;
    } = {}
  ): Promise<SaveFlowResult> {
    const existing = await this.repo.findById(userId, importId);
    if (!existing) throw new ImportNotFoundError(importId);
    if (existing.status === 'saved') throw new ImportInvalidStateError(existing.status);
    if (existing.status === 'archived') throw new ImportInvalidStateError(existing.status);

    let draft: ImportedRecipeDraft;

    if (options.draft !== undefined) {
      const validation = ImportedRecipeDraftSchema.safeParse(options.draft);
      if (!validation.success) {
        throw new SaveFailedError(
          `Invalid draft body: ${validation.error.issues
            .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
            .join('; ')}`
        );
      }
      draft = validation.data;
      // Persist the user-edited version so subsequent reads see what
      // was actually saved (history is preserved through the version
      // bump).
      await this.repo.insertNewDraft({
        importId,
        userId,
        draftJson: draft,
        sourceExtractionMethod: draft.source.extractionMethod,
      });
    } else {
      const current = await this.repo.findCurrentDraft(importId);
      if (!current) throw new NoDraftAvailableError(importId);
      const validation = ImportedRecipeDraftSchema.safeParse(current.draft_json);
      if (!validation.success) {
        throw new SaveFailedError(
          `Stored draft failed validation: ${validation.error.issues
            .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
            .join('; ')}`
        );
      }
      draft = validation.data;
    }

    let recipeId: string;
    try {
      const saveOpts: SaveDraftAsRecipeOptions = {
        importId,
        collections: options.collections,
        personalNotes: options.personalNotes,
      };
      recipeId = await this.saveImportedDraftAsRecipe(client, userId, draft, saveOpts);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Save failed';
      throw new SaveFailedError(message, error);
    }

    const updated = await this.repo.updateLifecycle(userId, importId, {
      status: 'saved',
      recipe_id: recipeId,
      error_code: null,
      error_message: null,
    });
    if (!updated) throw new ImportNotFoundError(importId);

    return { import: updated, recipeId };
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  return code === '23505';
}
