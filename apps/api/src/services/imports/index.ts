/**
 * DI factory for the social-recipe-imports service stack (PRP-220.13 +
 * PRP-220.14).
 *
 * Exposes `defaultExtractionService()` which the route layer
 * (apps/api/src/app.ts) calls when it builds the imports router.
 * Returns the OpenAI-backed extraction service plus the registered
 * platform adapter list (Instagram → TikTok → YouTube → Web → catch-all).
 *
 * Order matters: specific adapters MUST come before WebAdapter, and
 * WebAdapter before FallbackWebAdapter (which always claims).
 */
import { FallbackWebAdapter } from './platforms/FallbackWebAdapter.js';
import { InstagramAdapter } from './platforms/InstagramAdapter.js';
import { TikTokAdapter } from './platforms/TikTokAdapter.js';
import { WebAdapter } from './platforms/WebAdapter.js';
import { YouTubeAdapter } from './platforms/YouTubeAdapter.js';
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
   * Override the adapter list. Defaults to the full registry below.
   */
  adapters?: readonly PlatformAdapter[];
  model?: string;
}

export function defaultPlatformAdapters(): readonly PlatformAdapter[] {
  return [
    new InstagramAdapter(),
    new TikTokAdapter(),
    new YouTubeAdapter(),
    new WebAdapter(),
    // Catch-all (URL-only context, no HTTP) — last resort.
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
export { InstagramAdapter } from './platforms/InstagramAdapter.js';
export { TikTokAdapter } from './platforms/TikTokAdapter.js';
export { WebAdapter } from './platforms/WebAdapter.js';
export { YouTubeAdapter } from './platforms/YouTubeAdapter.js';
export type { PlatformAdapter, PlatformContext } from './platforms/types.js';
export type {
  AICompletionClient,
  AICompletionRequest,
  AICompletionResponse,
} from './RecipeExtractionService.js';
