/**
 * Heuristic confidence + warnings calculator for an ImportedRecipeDraft
 * candidate (PRP-220.07).
 *
 * The score is intentionally conservative: it never reaches 1.0 on
 * metadata-only sources, and any signal of poor data (no ingredients,
 * no instructions, oversized ingredient names) drags it back down.
 *
 * Returns `confidence` in [0, 1] plus a list of human-readable warnings
 * to surface in the editor (PRP-220.08 ExtractionWarningsList).
 */

export interface ConfidenceInputs {
  hasTitle: boolean;
  ingredientCount: number;
  /** Among ingredients, how many had a parsed numeric quantity. */
  ingredientWithQuantityCount?: number;
  instructionCount: number;
  hasImage: boolean;
  hasTimes: boolean;
  hasServings?: boolean;
  hasOversizedIngredient?: boolean;
  extractionMethod:
    | 'oembed'
    | 'metadata'
    | 'transcript'
    | 'manual_text'
    | 'screenshot_ocr'
    | 'voice_dictation'
    | 'ai_inference';
}

export interface ConfidenceResult {
  confidence: number;
  warnings: string[];
}

export function computeConfidence(input: ConfidenceInputs): ConfidenceResult {
  const warnings: string[] = [];
  let score = 0;

  // Title
  if (input.hasTitle) {
    score += 0.15;
  } else {
    warnings.push('Titre manquant');
  }

  // Ingredients
  if (input.ingredientCount >= 3) {
    score += 0.25;
  } else if (input.ingredientCount > 0) {
    score += 0.1;
    warnings.push("Peu d'ingrédients détectés (< 3)");
  } else {
    warnings.push('Aucun ingrédient détecté');
  }

  // Quantities (when ingredients exist)
  if (input.ingredientCount > 0 && input.ingredientWithQuantityCount !== undefined) {
    const ratio = input.ingredientWithQuantityCount / input.ingredientCount;
    if (ratio >= 0.5) {
      score += 0.15;
    } else {
      warnings.push('Quantités souvent absentes');
    }
  }

  // Instructions
  if (input.instructionCount >= 2) {
    score += 0.2;
  } else if (input.instructionCount > 0) {
    score += 0.05;
    warnings.push('Peu d\'étapes détectées (< 2)');
  } else {
    warnings.push('Aucune étape détectée');
  }

  // Image / times / servings (small signals)
  if (input.hasImage) score += 0.05;
  if (input.hasTimes) score += 0.1;
  if (input.hasServings) score += 0.05;

  // Penalties
  if (input.hasOversizedIngredient) {
    score -= 0.1;
    warnings.push('Un ingrédient semble suspicieusement long');
  }

  // Extraction method ceiling: pure metadata can't reach high confidence
  // even when every other signal looks fine.
  const ceiling = ceilingFor(input.extractionMethod);
  if (score > ceiling) {
    score = ceiling;
    warnings.push('Extraction basée sur métadonnées seulement');
  }

  const confidence = Math.max(0, Math.min(1, Number(score.toFixed(3))));
  return { confidence, warnings };
}

function ceilingFor(method: ConfidenceInputs['extractionMethod']): number {
  switch (method) {
    case 'oembed':
    case 'metadata':
      return 0.6;
    case 'screenshot_ocr':
      return 0.85;
    case 'voice_dictation':
      return 0.85;
    case 'transcript':
    case 'ai_inference':
    case 'manual_text':
    default:
      return 1;
  }
}
