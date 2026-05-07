/**
 * Adapter for voice-dictated recipes (PRP-220.07). Whatever the speech-
 * to-text pipeline produced lands here as `transcript` plus optionally
 * an LLM-parsed split. The result is tagged `voice_dictation`.
 */
import {
  parseImportedRecipeDraft,
  type ImportedRecipeDraft,
  type ImportedIngredient,
  type ImportedInstruction,
} from '@smart/shared';

import { computeConfidence } from '../helpers/confidence.js';
import { parseQuantity } from '../helpers/parseQuantity.js';

export interface VoiceRecipeInput {
  transcript: string;
  parsedTitle?: string;
  parsedIngredients?: string[];
  parsedInstructions?: string[];
}

export function voiceToDraft(input: VoiceRecipeInput): ImportedRecipeDraft {
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
    }));

  const ingredientWithQuantityCount = ingredients.filter((i) => i.quantity !== undefined).length;
  const hasOversizedIngredient = ingredients.some((i) => i.name.length > 150);

  const { confidence, warnings } = computeConfidence({
    hasTitle: Boolean(input.parsedTitle?.trim()),
    ingredientCount: ingredients.length,
    ingredientWithQuantityCount,
    instructionCount: instructions.length,
    hasImage: false,
    hasTimes: false,
    extractionMethod: 'voice_dictation',
    hasOversizedIngredient,
  });

  return parseImportedRecipeDraft({
    title: (input.parsedTitle?.trim() || 'Recette vocale').slice(0, 300),
    ingredients,
    instructions,
    tags: ['voice'],
    confidence,
    extractionWarnings: warnings,
    source: {
      platform: 'manual',
      originalDescription: input.transcript.slice(0, 5000),
      importedAt: new Date().toISOString(),
      extractionMethod: 'voice_dictation',
    },
  });
}
