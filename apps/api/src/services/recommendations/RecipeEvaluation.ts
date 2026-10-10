import { createHash } from 'node:crypto';
import { recipeDurationMinutes, type NutritionProfile, type NutritionProfileSettings, type RecipeEvaluation } from '@smart/shared';
import { evaluateAvailability, evaluateConstraints, estimateNutrition, type IngredientProduct, type QualifiedLot } from './PersonalizationScoring.js';
import type { RecipeWithIngredients } from './types.js';

export interface RecipeEvaluationContext {
  profile: NutritionProfile;
  settings: NutritionProfileSettings;
  legacyServerPresent: boolean;
  lots: QualifiedLot[];
  products: Map<string, IngredientProduct>;
  servings: number | null;
  stockVersion: string;
  now: Date;
}

/** Common evidence for ranking and a specific detail; no selection or side effects. */
export function evaluateRecipe(recipe: RecipeWithIngredients, ctx: RecipeEvaluationContext): RecipeEvaluation {
  const constraints = evaluateConstraints(recipe, ctx.settings, ctx.products);
  if (ctx.legacyServerPresent && constraints.status === 'compatible') {
    constraints.status = 'verify';
    constraints.limitations.push('Confirmez les anciennes préférences dans votre profil alimentaire.');
  }
  return {
    reference: { id: recipe.id, source: recipe.source ?? 'recipes' },
    servings: ctx.servings,
    base_servings: recipe.servings && Number.isFinite(recipe.servings) && recipe.servings > 0 ? recipe.servings : null,
    recipe_version: createHash('sha256').update(JSON.stringify(recipe)).digest('hex'),
    profile_version: ctx.profile.version,
    stock_version: ctx.stockVersion,
    calculated_at: ctx.now.toISOString(),
    duration_minutes: recipeDurationMinutes(recipe),
    constraints,
    availability: evaluateAvailability(recipe, ctx.lots, ctx.servings ?? 1, ctx.now),
    nutrition: estimateNutrition(recipe, ctx.products),
  };
}
