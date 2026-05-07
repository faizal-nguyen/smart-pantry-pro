/**
 * Adapter for the Instagram extractor pipeline. Accepts whatever
 * combination of metadata + AI-extracted recipe is available and
 * collapses it into an ImportedRecipeDraft (PRP-220.07).
 *
 * Specifically tailored for the audio/video-derived Instagram payload
 * that lands in the client today; the server-side equivalent is
 * `apps/api/.../platforms/InstagramAdapter.ts` (PRP-220.14).
 */
import {
  parseImportedRecipeDraft,
  type ImportedRecipeDraft,
  type ImportedIngredient,
  type ImportedInstruction,
} from '@smart/shared';

import { computeConfidence } from '../helpers/confidence.js';
import { parseQuantity } from '../helpers/parseQuantity.js';
import { canonicalizeUrl } from '../helpers/url.js';
import { parseDurationToMinutes } from '../helpers/parseDuration.js';

export interface InstagramAdapterInput {
  url: string;
  metadata?: {
    title?: string;
    description?: string;
    thumbnailUrl?: string;
    authorName?: string;
    authorHandle?: string;
  };
  extractedRecipe?: {
    title?: string;
    description?: string;
    ingredients?: string[];
    instructions?: string[];
    prepTime?: string | number;
    cookTime?: string | number;
    servings?: number;
    tags?: string[];
  };
}

export function instagramToDraft(input: InstagramAdapterInput): ImportedRecipeDraft {
  const r = input.extractedRecipe ?? {};
  const meta = input.metadata ?? {};

  const ingredients: ImportedIngredient[] = (r.ingredients ?? [])
    .map((line) => line?.trim())
    .filter((line): line is string => Boolean(line))
    .map((line) => {
      const { quantity, unit, rest } = parseQuantity(line);
      return {
        name: (rest && rest.length > 0 ? rest : line).slice(0, 200),
        quantity,
        unit,
        rawText: line.slice(0, 500),
      };
    });

  const instructions: ImportedInstruction[] = (r.instructions ?? [])
    .map((line) => line?.trim())
    .filter((line): line is string => Boolean(line))
    .map((description, idx) => ({
      step: idx + 1,
      description: description.slice(0, 2000),
    }));

  const title = (r.title?.trim() || meta.title?.trim() || 'Reel Instagram').slice(0, 300);
  const prepTimeMinutes = parseDurationToMinutes(r.prepTime);
  const cookTimeMinutes = parseDurationToMinutes(r.cookTime);
  const hasTimes = prepTimeMinutes !== undefined || cookTimeMinutes !== undefined;
  const ingredientWithQuantityCount = ingredients.filter((i) => i.quantity !== undefined).length;
  const hasOversizedIngredient = ingredients.some((i) => i.name.length > 150);

  const { confidence, warnings } = computeConfidence({
    hasTitle: Boolean(r.title?.trim() || meta.title?.trim()),
    ingredientCount: ingredients.length,
    ingredientWithQuantityCount,
    instructionCount: instructions.length,
    hasImage: Boolean(meta.thumbnailUrl),
    hasTimes,
    hasServings: r.servings !== undefined,
    hasOversizedIngredient,
    extractionMethod: 'ai_inference',
  });

  return parseImportedRecipeDraft({
    title,
    description: (r.description ?? meta.description)?.slice(0, 3000),
    ingredients,
    instructions,
    prepTimeMinutes,
    cookTimeMinutes,
    servings: r.servings,
    tags: ['instagram', ...(r.tags ?? [])].slice(0, 20),
    imageUrl: meta.thumbnailUrl,
    confidence,
    extractionWarnings: warnings,
    source: {
      platform: 'instagram',
      sourceUrl: input.url,
      canonicalUrl: canonicalizeUrl(input.url),
      authorName: meta.authorName,
      authorHandle: meta.authorHandle,
      thumbnailUrl: meta.thumbnailUrl,
      originalTitle: meta.title,
      originalDescription: meta.description,
      importedAt: new Date().toISOString(),
      extractionMethod: 'ai_inference',
    },
  });
}
