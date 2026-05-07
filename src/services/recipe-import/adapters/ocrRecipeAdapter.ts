/**
 * Adapter for OCR (screenshot) recipe extraction (PRP-220.07).
 *
 * Takes whatever the OCR pipeline could pull from the image (raw text
 * plus optionally a parsed split into title/ingredients/instructions)
 * and produces an ImportedRecipeDraft tagged with the
 * `screenshot_ocr` extraction method.
 */
import {
  parseImportedRecipeDraft,
  type ImportedRecipeDraft,
  type ImportedIngredient,
  type ImportedInstruction,
} from '@smart/shared';

import { computeConfidence } from '../helpers/confidence.js';
import { parseQuantity } from '../helpers/parseQuantity.js';

export interface OCRRecipeInput {
  rawText: string;
  parsedTitle?: string;
  parsedIngredients?: string[];
  parsedInstructions?: string[];
  imageUrl?: string;
  sourceUrl?: string;
}

export function ocrToDraft(input: OCRRecipeInput): ImportedRecipeDraft {
  const ingredients: ImportedIngredient[] = (input.parsedIngredients ?? [])
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

  const instructions: ImportedInstruction[] = (input.parsedInstructions ?? [])
    .map((line) => line?.trim())
    .filter((line): line is string => Boolean(line))
    .map((description, idx) => ({
      step: idx + 1,
      description: description.slice(0, 2000),
      rawText: description.slice(0, 2000),
    }));

  const ingredientWithQuantityCount = ingredients.filter((i) => i.quantity !== undefined).length;
  const hasOversizedIngredient = ingredients.some((i) => i.name.length > 150);

  const { confidence, warnings } = computeConfidence({
    hasTitle: Boolean(input.parsedTitle?.trim()),
    ingredientCount: ingredients.length,
    ingredientWithQuantityCount,
    instructionCount: instructions.length,
    hasImage: Boolean(input.imageUrl),
    hasTimes: false,
    extractionMethod: 'screenshot_ocr',
    hasOversizedIngredient,
  });

  return parseImportedRecipeDraft({
    title: (input.parsedTitle?.trim() || 'Recette scannée').slice(0, 300),
    ingredients,
    instructions,
    tags: ['ocr'],
    imageUrl: input.imageUrl,
    confidence,
    extractionWarnings: warnings,
    source: {
      platform: 'manual',
      sourceUrl: input.sourceUrl,
      thumbnailUrl: input.imageUrl,
      originalDescription: input.rawText.slice(0, 5000),
      importedAt: new Date().toISOString(),
      extractionMethod: 'screenshot_ocr',
    },
  });
}
