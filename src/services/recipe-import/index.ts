/**
 * Public surface of the client-side recipe-import pipeline (PRP-220.07).
 *
 * All client code that needs to turn an external recipe shape into the
 * canonical `ImportedRecipeDraft` should import from here, never from
 * the individual adapter files.
 */

// Helpers
export {
  detectPlatform,
  canonicalizeUrl,
  extractFirstUrl,
  extractAllUrls,
} from './helpers/url.js';
export { parseDurationToMinutes } from './helpers/parseDuration.js';
export { parseQuantity, type ParsedQuantity } from './helpers/parseQuantity.js';
export {
  computeConfidence,
  type ConfidenceInputs,
  type ConfidenceResult,
} from './helpers/confidence.js';

// Adapters
export {
  socialImportToDraft,
  type SocialImportInput,
} from './adapters/socialImportAdapter.js';
export {
  instagramToDraft,
  type InstagramAdapterInput,
} from './adapters/instagramAdapter.js';
export {
  manualToDraft,
  type ManualRecipeInput,
} from './adapters/manualRecipeAdapter.js';
export {
  ocrToDraft,
  type OCRRecipeInput,
} from './adapters/ocrRecipeAdapter.js';
export {
  voiceToDraft,
  type VoiceRecipeInput,
} from './adapters/voiceRecipeAdapter.js';

// Bridge between the canonical draft and the legacy ExtractedRecipeModal
// shape (PRP-220.08). Used until the modal itself is rewritten.
export {
  draftToExtractedRecipe,
  extractedRecipeToDraft,
  type ExtractedRecipe,
  type ExtractedRecipeIngredient,
  type ExtractedRecipeInstruction,
  type ExtractedRecipeMetadata,
} from './adapters/extractedRecipeBridge.js';
