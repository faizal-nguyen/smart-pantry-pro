import { assessImportedRecipeQuality, type DiscoveryCreator, type DiscoveryItem, type ImportedRecipeDraft } from '@smart/shared';
import type { SocialImport, ImportedRecipeDraftRow } from '@/services/recipe-import/types';

export const OWNER = '00000000-0000-4000-8000-000000000001';
export const OTHER = '00000000-0000-4000-8000-000000000002';
export const CREATOR = '00000000-0000-4000-8000-000000000003';
export const ITEM = '00000000-0000-4000-8000-000000000004';
export const IMPORT = '00000000-0000-4000-8000-000000000005';
export const RECIPE = '00000000-0000-4000-8000-000000000006';
export const DRAFT = '00000000-0000-4000-8000-000000000007';
export const DATE = '2026-10-12T10:00:00.000Z';
export const draft: ImportedRecipeDraft = {
  title: 'Soupe du corpus synthétique', ingredients: [{ name: 'Carotte', quantity: 200, unit: 'g', rawText: '200 g de carottes' }],
  instructions: [{ step: 1, description: 'Cuire les carottes dans l’eau.' }],
  prepTimeMinutes: 5, cookTimeMinutes: 20, servings: 2, tags: [], confidence: 0.5, extractionWarnings: [],
  source: { platform: 'web', sourceUrl: 'https://example.test/recette', canonicalUrl: 'https://example.test/recette', authorName: 'Créateur fictif', originalTitle: 'Soupe du corpus synthétique', importedAt: DATE, extractionMethod: 'manual_text' },
};
export const creator: DiscoveryCreator = {
  id: CREATOR, userId: OWNER, name: 'Créateur du test', paused: false, version: 1,
  sources: [{ id: CREATOR, platform: 'web', url: 'https://example.test/chef', accessMode: 'manual', identityStatus: 'verified', lastSuccessAt: null, lastError: null }],
};
export const item: DiscoveryItem = {
  id: ITEM, userId: OWNER, creatorId: CREATOR, sourceUrl: draft.source.sourceUrl!, title: draft.title,
  description: null, imageUrl: 'https://example.test/plat.jpg', createdAt: DATE, publishedAt: null, version: 1,
  status: 'new', quality: assessImportedRecipeQuality(draft), draft, importId: null, recipeReference: null,
  snoozedUntil: null, reasons: ['Lien choisi dans le corpus de test.'], constraints: 'unknown', lastFeedback: null,
};
export const socialImport: SocialImport = {
  id: IMPORT, user_id: OWNER, source_url: draft.source.sourceUrl!, platform: 'web', canonical_url: draft.source.sourceUrl!, source_hash: 'fixture',
  status: 'draft_ready', title: draft.title, author_name: 'Créateur fictif', author_handle: null,
  thumbnail_url: null, metadata: {}, error_code: null, error_message: null, confidence: draft.confidence,
  recipe_id: null, created_at: DATE, updated_at: DATE,
};
export const draftRow: ImportedRecipeDraftRow = {
  id: DRAFT, import_id: IMPORT, user_id: OWNER, draft_json: draft, version: 3, is_current: true,
  source_extraction_method: 'manual_text', ai_model: null, ai_input_tokens: null, ai_output_tokens: null, cost_usd_estimate: null, created_at: DATE,
};
export const prepared = { item: { ...item, status: 'kept' as const, importId: IMPORT }, import: socialImport, draft: draftRow, quality: item.quality };
