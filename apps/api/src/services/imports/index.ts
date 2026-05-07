/**
 * DI factory for the social-recipe-imports service stack (PRP-220.13).
 *
 * Exposes a single `defaultExtractionService()` that the route layer
 * (apps/api/src/app.ts) calls when it builds the imports router.
 * Returns the OpenAI-backed extraction service plus the registered
 * platform adapter list.
 *
 * PRP-220.14 will add specific adapters (Instagram, TikTok, YouTube,
 * Web) by inserting them in front of the FallbackWebAdapter in the
 * registry below — no other file needs to change.
 */
import { FallbackWebAdapter } from './platforms/FallbackWebAdapter.js';
import type { PlatformAdapter } from './platforms/types.js';
import {
  createOpenAICompletionClient,
  OpenAIRecipeExtractionService,
  type AICompletionClient,
} from './RecipeExtractionService.js';
import type { RecipeExtractionService } from './extractionContract.js';

export interface BuildExtractionServiceOptions {
  /**
   * Override the AI client (used by tests). Defaults to a lazy
   * OpenAI client that reads OPENAI_API_KEY at first call.
   */
  ai?: AICompletionClient;
  /**
   * Override the adapter list. Defaults to [FallbackWebAdapter].
   * PRP-220.14 will pre-pend Instagram/TikTok/YouTube/Web adapters.
   */
  adapters?: readonly PlatformAdapter[];
  model?: string;
}

export function defaultPlatformAdapters(): readonly PlatformAdapter[] {
  return [
    // Specific adapters here (PRP-220.14) before the catch-all.
    new FallbackWebAdapter(),
  ];
}

export function defaultExtractionService(
  options: BuildExtractionServiceOptions = {}
): RecipeExtractionService {
  const adapters = options.adapters ?? defaultPlatformAdapters();
  const ai = options.ai ?? createOpenAICompletionClient();
  return new OpenAIRecipeExtractionService(adapters, ai, { model: options.model });
}

export { OpenAIRecipeExtractionService } from './RecipeExtractionService.js';
export { FallbackWebAdapter } from './platforms/FallbackWebAdapter.js';
export type { PlatformAdapter, PlatformContext } from './platforms/types.js';
export type {
  AICompletionClient,
  AICompletionRequest,
  AICompletionResponse,
} from './RecipeExtractionService.js';
