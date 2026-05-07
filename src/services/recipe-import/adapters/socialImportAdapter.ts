/**
 * Adapter for the legacy `SocialImportCard` shape (string[] ingredients
 * and string[] instructions plus loose metadata) into the canonical
 * `ImportedRecipeDraft` (PRP-220.06 / 220.07).
 */
import {
  parseImportedRecipeDraft,
  type ImportedRecipeDraft,
  type ImportedIngredient,
  type ImportedInstruction,
} from '@smart/shared';

import { computeConfidence } from '../helpers/confidence.js';
import { parseQuantity } from '../helpers/parseQuantity.js';
import { canonicalizeUrl, detectPlatform } from '../helpers/url.js';
import { parseDurationToMinutes } from '../helpers/parseDuration.js';

export interface SocialImportInput {
  title?: string;
  description?: string;
  /** Free-form ingredient lines as the source provided them. */
  ingredients?: string[];
  /** Free-form instruction lines as the source provided them. */
  instructions?: string[];
  imageUrl?: string;
  sourceUrl: string;
  authorName?: string;
  authorHandle?: string;
  prepTime?: string | number;
  cookTime?: string | number;
  servings?: number;
  tags?: string[];
}

export function socialImportToDraft(input: SocialImportInput): ImportedRecipeDraft {
  const ingredients: ImportedIngredient[] = (input.ingredients ?? [])
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

  const instructions: ImportedInstruction[] = (input.instructions ?? [])
    .map((line) => line?.trim())
    .filter((line): line is string => Boolean(line))
    .map((description, idx) => ({
      step: idx + 1,
      description: description.slice(0, 2000),
      rawText: description.slice(0, 2000),
    }));

  const platform = detectPlatform(input.sourceUrl);
  const prepTimeMinutes = parseDurationToMinutes(input.prepTime);
  const cookTimeMinutes = parseDurationToMinutes(input.cookTime);
  const hasTimes = prepTimeMinutes !== undefined || cookTimeMinutes !== undefined;

  const ingredientWithQuantityCount = ingredients.filter((i) => i.quantity !== undefined).length;
  const hasOversizedIngredient = ingredients.some((i) => i.name.length > 150);

  const { confidence, warnings } = computeConfidence({
    hasTitle: Boolean(input.title?.trim()),
    ingredientCount: ingredients.length,
    ingredientWithQuantityCount,
    instructionCount: instructions.length,
    hasImage: Boolean(input.imageUrl),
    hasTimes,
    hasServings: input.servings !== undefined,
    hasOversizedIngredient,
    extractionMethod: 'ai_inference',
  });

  return parseImportedRecipeDraft({
    title: (input.title?.trim() || 'Recette importée').slice(0, 300),
    description: input.description?.slice(0, 3000),
    ingredients,
    instructions,
    prepTimeMinutes,
    cookTimeMinutes,
    servings: input.servings,
    tags: input.tags ?? [],
    imageUrl: input.imageUrl,
    confidence,
    extractionWarnings: warnings,
    source: {
      platform,
      sourceUrl: input.sourceUrl,
      canonicalUrl: canonicalizeUrl(input.sourceUrl),
      authorName: input.authorName,
      authorHandle: input.authorHandle,
      thumbnailUrl: input.imageUrl,
      originalTitle: input.title,
      originalDescription: input.description,
      importedAt: new Date().toISOString(),
      extractionMethod: 'ai_inference',
    },
  });
}
