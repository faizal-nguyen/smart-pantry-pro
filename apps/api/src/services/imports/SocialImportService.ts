/**
 * Service layer for the social-recipe-imports REST API (PRP-220.10
 * for capture/list, PRP-220.11 for extract/save).
 *
 * Wraps the repository with the URL normalisation + dedup logic so
 * the route handlers stay thin. The service is stateless; each call
 * is given a user-scoped repository (already RLS-bound) by the route.
 */
import type { ImportedRecipeDraft } from '@smart/shared';
import { ImportedRecipeDraftSchema, assessImportedRecipeQuality, type ImportedRecipeQuality } from '@smart/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import { waitUntil } from '@vercel/functions';

import {
  canonicalizeUrl,
  detectPlatform,
} from './canonicalUrl.js';
import { computeSourceHash, computeLegacySourceHash } from './sourceHash.js';
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
import { logExtraction, logger } from '../../lib/logger.js';
import type { ThumbnailSnapshotter } from '../media/ThumbnailSnapshotService.js';
import { sanitizeImportedDraft } from '../recipeQuality/sanitizeImportedDraft.js';
import { ImportReviewError, preserveImportProvenance, editedRecipeFields, importAdaptations, type ImportAdaptation, type ReviewedSaveOptions } from './ImportReview.js';

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
  quality: ImportedRecipeQuality;
}

export interface SaveFlowResult {
  import: SocialImportRow;
  recipeId: string;
  reconciled: boolean;
  quality: ImportedRecipeQuality | null;
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
  /**
   * PRP-220.24 §5.13: capture-time thumbnail snapshot. When provided,
   * `extract` fires it after the lifecycle update so the import owns a
   * durable copy of the OG thumbnail (Insta/TikTok CDN URLs expire in
   * weeks). Failure is silent — the caller falls back to the remote URL.
   */
  thumbnailSnapshotter?: ThumbnailSnapshotter;
}

const CONFIDENCE_REVIEW_THRESHOLD = 0.6;

export class SocialImportService {
  private readonly extractionService: RecipeExtractionService;
  private readonly saveImportedDraftAsRecipe: SaveImportedDraftAsRecipe;
  private readonly thumbnailSnapshotter?: ThumbnailSnapshotter;

  constructor(
    private readonly repo: SocialImportRepository,
    options: SocialImportServiceOptions = {}
  ) {
    this.extractionService = options.extractionService ?? new NotImplementedExtractionService();
    this.saveImportedDraftAsRecipe =
      options.saveImportedDraftAsRecipe ?? notImplementedSaveImportedDraftAsRecipe;
    this.thumbnailSnapshotter = options.thumbnailSnapshotter;
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
    const legacyHash = computeLegacySourceHash(canonicalUrl);
    if (legacyHash !== sourceHash) {
      const legacy = await this.repo.findByHash(userId, legacyHash);
      // Legacy hashing dropped all queries and lowercased paths. Reuse only
      // an actually identical source; never inherit its historical collision.
      if (legacy && computeSourceHash(legacy.source_url) === sourceHash) {
        return { import: legacy, duplicate: true };
      }
    }

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
        const message = error instanceof Error ? error.message : error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Capture failed';
        const quotaExceeded = message.includes('QUOTA_EXCEEDED');
        results.push({
          url,
          error: {
            code: quotaExceeded ? 'QUOTA_EXCEEDED' : 'CAPTURE_FAILED',
            message: quotaExceeded ? 'Limite gratuite de 25 imports actifs atteinte' : message,
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

  async patch(userId: string, id: string, fields: PatchImportFields): Promise<SocialImportRow | null> {
    if (fields.status === 'captured') {
      const existing = await this.repo.findById(userId, id);
      if (!existing) return null;
      const savedId = await this.repo.findSavedRecipeId(userId, id);
      if (savedId) return this.repo.updateLifecycle(userId, id, { ...fields, status: 'saved', recipe_id: savedId });
    }
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
  ): Promise<{ import: SocialImportRow; draft: ImportedRecipeDraftRow | null; quality: ImportedRecipeQuality | null; adaptations: ImportAdaptation[] } | null> {
    const imp = await this.repo.findById(userId, importId);
    if (!imp) return null;
    const draft = await this.repo.findCurrentDraft(importId);
    const parsed = ImportedRecipeDraftSchema.safeParse(draft?.draft_json);
    return { import: imp, draft, quality: parsed.success ? assessImportedRecipeQuality(parsed.data, { sourceReviewed: imp.metadata.source_reviewed === true }) : null,
      adaptations: parsed.success ? importAdaptations(parsed.data) : [] };
  }

  /** Preview a final correction and its mandatory substitutions, without writes or AI. */
  async review(userId: string, importId: string, options: { draft?: unknown; expectedRevision?: number; sourceReviewed?: boolean } = {}) {
    const existing = await this.repo.findById(userId, importId);
    if (!existing) throw new ImportNotFoundError(importId);
    const current = await this.repo.findCurrentDraft(importId);
    if (!current) throw new NoDraftAvailableError(importId);
    const stored = ImportedRecipeDraftSchema.safeParse(current.draft_json);
    if (!stored.success) throw new SaveFailedError('Le brouillon enregistré ne peut pas être relu.');
    if (options.draft !== undefined && options.expectedRevision === undefined) {
      throw new ImportReviewError('REVISION_REQUIRED', 'La révision du brouillon est nécessaire.', 409);
    }
    if (options.expectedRevision !== undefined && options.expectedRevision !== current.version) {
      throw new ImportReviewError('REVISION_CONFLICT', 'Ce brouillon a changé. Rechargez sa version actuelle.', 409);
    }
    const edited = options.draft === undefined ? stored : ImportedRecipeDraftSchema.safeParse(options.draft);
    if (!edited.success) throw new SaveFailedError('Le brouillon corrigé est incomplet ou invalide.');
    const draft = preserveImportProvenance(edited.data, stored.data);
    return { draft, revision: current.version, quality: assessImportedRecipeQuality(draft, { sourceReviewed: options.sourceReviewed }),
      adaptations: importAdaptations(draft, stored.data) };
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

    const previousDraft = await this.repo.findCurrentDraft(importId);
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
        costUsd: null,
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
    const previous = ImportedRecipeDraftSchema.safeParse(previousDraft?.draft_json);
    const validatedDraft: ImportedRecipeDraft = previous.success ? preserveImportProvenance(validation.data, previous.data) : validation.data;
    const quality = assessImportedRecipeQuality(validatedDraft);

    const draftRow = await this.repo.insertNewDraft({
      importId: acquired.id,
      userId,
      draftJson: validatedDraft,
      sourceExtractionMethod: validatedDraft.source.extractionMethod,
      aiModel: result.modelUsed,
      aiInputTokens: result.cost?.inputTokens,
      aiOutputTokens: result.cost?.outputTokens,
      costUsdEstimate: result.cost?.usd,
      expectedRevision: previousDraft?.version ?? 0,
    });

    const newStatus =
      quality.can_save && validatedDraft.confidence >= CONFIDENCE_REVIEW_THRESHOLD ? 'draft_ready' : 'needs_review';
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

    // PRP-220.24 §5.13: snapshot the OG thumbnail to our own storage so
    // we don't depend on the Insta/TikTok CDN's signed-URL TTL. Fire and
    // forget — the failure mode is "stay with the remote URL", never
    // "fail extract". waitUntil keeps a serverless instance alive until
    // it finishes (no-op elsewhere).
    if (this.thumbnailSnapshotter && updated.thumbnail_url) {
      waitUntil(this.thumbnailSnapshotter
        .snapshot({
          userId,
          importId: updated.id,
          remoteUrl: updated.thumbnail_url,
          sourceUrl: updated.source_url ?? undefined,
        })
        .catch(() => undefined));
    }

    metrics.extractionTotal.inc({ platform: acquired.platform, outcome: 'success' });
    metrics.extractionLatency.observe({ platform: acquired.platform }, result.durationMs ?? 0);
    if (result.modelUsed && result.cost && result.cost.usd !== null) {
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
      costUsd: result.cost?.usd ?? null,
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
      quality,
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
   * Replays reconcile against an owned recipe keyed by import_id.
   * Edited drafts are version-checked and saved in the recipe RPC's
   * transaction; no provisional draft write can lose a user's revision.
   */
  async save(
    client: SupabaseClient,
    userId: string,
    importId: string,
    options: {
      draft?: unknown;
      collections?: string[];
      personalNotes?: string;
      expectedRevision?: number;
      acknowledgeUnknowns?: boolean;
      sourceReviewed?: boolean;
      acknowledgeAdaptations?: boolean;
    } = {}
  ): Promise<SaveFlowResult> {
    const existing = await this.repo.findById(userId, importId);
    if (!existing) throw new ImportNotFoundError(importId);
    const savedId = await this.repo.findSavedRecipeId(userId, importId);
    if (savedId) {
      const receipt = existing.status === 'saved' && existing.recipe_id === savedId ? existing :
        await this.repo.updateLifecycle(userId, importId, { status: 'saved', recipe_id: savedId });
      if (!receipt) throw new ImportNotFoundError(importId);
      const current = await this.repo.findCurrentDraft(importId);
      const parsed = ImportedRecipeDraftSchema.safeParse(current?.draft_json);
      return { import: receipt, recipeId: savedId, reconciled: true,
        quality: parsed.success ? assessImportedRecipeQuality(parsed.data, { sourceReviewed: receipt.metadata.source_reviewed === true }) : null };
    }
    if (existing.status === 'saved') {
      throw new ImportReviewError('SAVE_RECEIPT_MISSING', 'La recette sauvegardée ne peut pas être confirmée. Réessayez après vérification.', 409);
    }
    if (existing.status === 'archived') throw new ImportInvalidStateError(existing.status);
    if (existing.status === 'extracting' || existing.status === 'video_processing') {
      throw new ImportInvalidStateError(existing.status);
    }
    const current = await this.repo.findCurrentDraft(importId);
    if (!current) throw new NoDraftAvailableError(importId);
    const stored = ImportedRecipeDraftSchema.safeParse(current.draft_json);
    if (!stored.success) throw new SaveFailedError('Le brouillon enregistré ne peut pas être relu.');
    if (options.draft !== undefined && options.expectedRevision === undefined) {
      throw new ImportReviewError('REVISION_REQUIRED', 'La révision du brouillon est nécessaire pour conserver votre correction.', 409);
    }
    if (options.expectedRevision !== undefined && current.version !== options.expectedRevision) {
      throw new ImportReviewError('REVISION_CONFLICT', 'Ce brouillon a changé. Rechargez sa version actuelle avant de confirmer.', 409);
    }
    let draft: ImportedRecipeDraft = stored.data;
    if (options.draft !== undefined) {
      const validation = ImportedRecipeDraftSchema.safeParse(options.draft);
      if (!validation.success) {
        throw new SaveFailedError(
          `Invalid draft body: ${validation.error.issues
            .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
            .join('; ')}`
        );
      }
      draft = preserveImportProvenance(validation.data, stored.data);
    }

    // PRP-239 PR1b §7.4 — every import passes through the policy
    // sanitizer before persistence. The sanitizer is pure; it rewrites
    // ingredient name/notes in place and flags description/instructions
    // violations for review (we don't auto-rewrite prose).
    const policy = sanitizeImportedDraft(draft);
    const adaptations = importAdaptations(draft, stored.data);
    if (adaptations.length > 0 && options.acknowledgeAdaptations !== true) {
      throw new ImportReviewError('ADAPTATIONS_REVIEW_REQUIRED', 'Des substitutions alimentaires sont nécessaires. Vérifiez la version adaptée avant de confirmer.');
    }
    if (policy.hasChanges) {
      draft = policy.sanitized;
    }

    const quality = assessImportedRecipeQuality(draft, { sourceReviewed: options.sourceReviewed === true });
    if (options.sourceReviewed !== true) {
      throw new ImportReviewError('SOURCE_REVIEW_REQUIRED', 'Relisez les ingrédients et les étapes dans la source avant de confirmer.');
    }
    if (!quality.can_save) {
      throw new ImportReviewError('RECIPE_INCOMPLETE', 'Des ingrédients et des étapes sont nécessaires pour ajouter une recette.');
    }
    if (quality.requires_acknowledgement && options.acknowledgeUnknowns !== true) {
      throw new ImportReviewError('UNKNOWN_FIELDS_REVIEW_REQUIRED', 'Vérifiez les informations inconnues avant de confirmer.');
    }
    const edits = editedRecipeFields(stored.data, draft);

    let recipeId: string;
    try {
      const saveOpts: ReviewedSaveOptions = {
        importId,
        collections: options.collections,
        personalNotes: options.personalNotes,
        expectedRevision: current.version,
        draftEdited: options.draft !== undefined || policy.hasChanges,
        quality,
        acknowledgeUnknowns: options.acknowledgeUnknowns,
        sourceReviewed: options.sourceReviewed,
        acknowledgeAdaptations: options.acknowledgeAdaptations,
        adaptations,
        editProvenance: { base_revision: current.version, edited_fields: edits,
          reviewed_at: new Date().toISOString(), source_reviewed: options.sourceReviewed === true },
      };
      recipeId = await this.saveImportedDraftAsRecipe(client, userId, draft, saveOpts);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Save failed';
      if (message.includes('REVISION_CONFLICT')) throw new ImportReviewError('REVISION_CONFLICT', 'Ce brouillon a changé. Rechargez sa version actuelle.', 409);
      if (message.includes('SOURCE_REVIEW_REQUIRED')) throw new ImportReviewError('SOURCE_REVIEW_REQUIRED', 'Relisez les ingrédients et les étapes dans la source avant de confirmer.');
      if (message.includes('RECIPE_INCOMPLETE')) throw new ImportReviewError('RECIPE_INCOMPLETE', 'Des ingrédients et des étapes sont nécessaires pour ajouter une recette.');
      if (message.includes('UNKNOWN_FIELDS_REVIEW_REQUIRED')) throw new ImportReviewError('UNKNOWN_FIELDS_REVIEW_REQUIRED', 'Vérifiez les informations inconnues avant de confirmer.');
      if (message.includes('ADAPTATIONS_REVIEW_REQUIRED')) throw new ImportReviewError('ADAPTATIONS_REVIEW_REQUIRED', 'Vérifiez les substitutions alimentaires avant de confirmer.');
      if (message.includes('DIETARY_REVIEW_REQUIRED')) throw new ImportReviewError('DIETARY_REVIEW_REQUIRED', 'Un ingrédient à base de porc ou d’alcool reste présent. Corrigez la recette avant de confirmer.');
      throw new SaveFailedError(message, error);
    }

    // PRP-239 PR1b §7.4 — tag the newly created recipe with the
    // quality flags emitted by the sanitizer. We merge into the
    // existing `recipe_facets.quality_flags` array (set-style) so a
    // re-save never duplicates entries. Best-effort: if the update
    // fails, the recipe is still saved correctly — the policy already
    // ran on the data path. We surface the failure as a metric.
    if (policy.qualityFlags.length > 0) {
      try {
        await this.tagRecipeWithQualityFlags(client, recipeId, policy.qualityFlags);
      } catch (error: unknown) {
        logger.warn(
          {
            event: 'recipe_policy.tag_facets_failed',
            recipeId,
            err: error instanceof Error ? error.message : 'unknown',
          },
          'Failed to tag recipe with sanitizer quality_flags (data was sanitized regardless)',
        );
      }
    }

    const updated = await this.repo.updateLifecycle(userId, importId, {
      status: 'saved',
      recipe_id: recipeId,
      error_code: null,
      error_message: null,
    });
    if (!updated) throw new ImportNotFoundError(importId);

    return { import: updated, recipeId, reconciled: false, quality };
  }

  /**
   * PRP-239 PR1b §7.4 — append the sanitizer's quality flags into the
   * recipe's `recipe_facets.quality_flags` array. Idempotent: we merge
   * via `jsonb_set` so subsequent imports of the same recipe (which
   * shouldn't happen, but defense-in-depth) don't duplicate flags.
   */
  private async tagRecipeWithQualityFlags(
    client: SupabaseClient,
    recipeId: string,
    qualityFlags: readonly string[],
  ): Promise<void> {
    const { data, error } = await client
      .from('recipes')
      .select('recipe_facets')
      .eq('id', recipeId)
      .single();
    if (error) throw error;

    const facets = ((data?.recipe_facets ?? {}) as Record<string, unknown>) || {};
    const existing = Array.isArray((facets as { quality_flags?: unknown }).quality_flags)
      ? ((facets as { quality_flags: string[] }).quality_flags)
      : [];
    const merged = Array.from(new Set([...existing, ...qualityFlags]));

    const nextFacets = { ...facets, quality_flags: merged };
    const { error: updateError } = await client
      .from('recipes')
      .update({ recipe_facets: nextFacets })
      .eq('id', recipeId);
    if (updateError) throw updateError;
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  return code === '23505';
}
