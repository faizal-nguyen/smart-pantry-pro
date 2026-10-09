/**
 * V10-01 — known recipe buttons use explicit typed commands.
 * The assistant's handlers invoke the same atomic stock service.
 * buildRecipeActionPrompt remains for old read-only prompt previews.
 */
import { commandForIntent, executeStockCommand, finishIntent, pendingIntent, previewRecipeStock } from '@/services/stockCommands';
import type { RecipeReference } from '@smart/shared';

export type RecipeAction = 'add_missing' | 'plan' | 'cooked';

export interface ActionableRecipe {
  id: string;
  source?: RecipeReference['source'];
  name: string;
  /** Linked essentials the user does NOT have enough of (optional). */
  missing_ingredients?: string[];
  /** Optional portions; otherwise use the resolved recipe servings. */
  servings?: number | null;
}

/**
 * Build the natural-language prompt sent to the assistant for an
 * action on a recipe. Exported separately so tests / previews can
 * inspect the wording without firing the API.
 */
export function buildRecipeActionPrompt(
  recipe: ActionableRecipe,
  action: RecipeAction,
): string {
  const name = recipe.name;
  switch (action) {
    case 'add_missing': {
      const missing = (recipe.missing_ingredients ?? []).filter(Boolean);
      if (missing.length === 0) {
        return `Ajoute à ma liste de courses les ingrédients manquants pour la recette "${name}".`;
      }
      return `Ajoute à ma liste de courses : ${missing.join(', ')} (pour la recette "${name}").`;
    }
    case 'plan':
      return `Ajoute la recette "${name}" à mon planning de la semaine.`;
    case 'cooked': {
      const servings = recipe.servings ?? null;
      const portionHint =
        servings && servings > 0 ? ` pour ${servings} personne${servings > 1 ? 's' : ''}` : '';
      return `Je viens de cuisiner la recette "${name}"${portionHint}. Mets à jour mon inventaire en conséquence.`;
    }
  }
}

/**
 * User-facing toast title once the request has been forwarded.
 * The assistant's actual answer arrives asynchronously in the chat.
 */
export function recipeActionToastTitle(action: RecipeAction): string {
  switch (action) {
    case 'add_missing': return 'Ingrédients ajoutés aux courses';
    case 'plan': return 'Recette ajoutée au menu';
    case 'cooked': return 'Repas enregistré et stock mis à jour';
  }
}

/** Known buttons execute the typed operation against this exact recipe id. */
export async function fireRecipeAssistantAction(recipe: ActionableRecipe, action: RecipeAction): Promise<string> {
  const reference: RecipeReference = { id: recipe.id, source: recipe.source ?? 'auto' };
  const intent = `recipe:${recipe.id}:${action}`;
  let command = await pendingIntent(intent);
  if (!command) {
    const preview = await previewRecipeStock(reference,recipe.servings ?? undefined);
    if (action === 'cooked') {
      if (preview.missing.length) throw new Error('Des quantités ou unités restent à vérifier. Ouvrez la fiche recette pour confirmer les ingrédients utilisés hors stock.');
      command = await commandForIntent('consume_recipe', intent, {
        recipe: reference, servings: preview.servings, recipe_version: preview.recipe.version, outside_inventory: [],
      });
    } else if (action === 'add_missing') {
      command = await commandForIntent('recipe_add_missing',intent,{ recipe: reference, servings: preview.servings });
    } else {
      const today = new Date();
      const date = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
      command = await commandForIntent('plan_recipe',intent,{ recipe: reference, servings: preview.servings, date, meal_type: 'dinner' });
    }
  }
  await executeStockCommand(command);
  await finishIntent(intent);
  return recipeActionToastTitle(action);
}
