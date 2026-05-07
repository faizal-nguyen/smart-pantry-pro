/**
 * Contract between the extract orchestrator (PRP-220.11) and the
 * extraction implementations that PRP-220.13 + PRP-220.14 will deliver.
 *
 * Keeping the interface here rather than in the future module lets the
 * route layer ship today: any service that satisfies the shape can be
 * dropped in by 220.13. Until then, the default factory returns a
 * NotImplementedExtractionService that throws so calling /extract on
 * a non-stub deployment surfaces a clean 422.
 */
import type { ImportedRecipeDraft } from '@smart/shared';

import type { SocialImportRow } from './SocialImportRepository.js';

export interface ExtractionRequest {
  hint?: string;
  /** When true, the underlying service should bypass any cache. */
  force?: boolean;
}

export interface ExtractionResult {
  draft: ImportedRecipeDraft;
  modelUsed?: string;
  durationMs?: number;
  cost?: {
    inputTokens: number;
    outputTokens: number;
    usd: number;
  };
}

export interface RecipeExtractionService {
  extract(imp: SocialImportRow, opts?: ExtractionRequest): Promise<ExtractionResult>;
}

/**
 * Default placeholder used when no real extraction service has been
 * wired (early sprints, tests). Throws a domain error so the route
 * maps it to 422 EXTRACTION_FAILED with an explicit "service not
 * available" message.
 */
export class NotImplementedExtractionService implements RecipeExtractionService {
  async extract(imp: SocialImportRow): Promise<ExtractionResult> {
    throw new Error(
      `[PRP-220.13] RecipeExtractionService is not wired yet (platform=${imp.platform}). ` +
        'Provide an implementation when constructing SocialImportService.'
    );
  }
}
