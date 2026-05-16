/**
 * PRP-234 PR4 — Helper partagé pour les actions sur une recette qui
 * passent par l'assistant (ajouter les manquants, planifier, cuisinée).
 *
 * Pattern : on construit un prompt natural-language explicite et on
 * le pousse à `/api/assistant/text`. L'assistant choisit le bon tool
 * (`add_shopping_items`, `add_recipe_to_meal_plan`,
 * `record_recipe_feedback` + `consume_inventory_items`) et bénéficie
 * gratuitement de l'`action_log` + l'undo 15 min (PRP-221).
 *
 * Déjà inline dans `AssistantRecipeProposals.tsx` (PRP-226 PR4). PR4
 * extrait le code pour le partager avec `TodayRecommendationsPanel`
 * et `MenuEntryCard` sans duplication.
 */
import {
  getAssistantRequestId,
  postAssistantText,
} from '@/services/assistantApi';

export type RecipeAction = 'add_missing' | 'plan' | 'cooked';

export interface ActionableRecipe {
  id: string;
  name: string;
  /** Linked essentials the user does NOT have enough of (optional). */
  missing_ingredients?: string[];
  /** Default 1, used by `cooked` to scale `consume_inventory_items`. */
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
    case 'add_missing':
      return 'Demande envoyée à l’assistant';
    case 'plan':
      return 'Planification demandée';
    case 'cooked':
      return 'Bien noté — j’ai prévenu l’assistant';
  }
}

/**
 * Fire-and-forget : build the prompt, POST to `/api/assistant/text`,
 * return the toast title. Errors bubble up so callers can surface
 * them via their own toast/UI.
 */
export async function fireRecipeAssistantAction(
  recipe: ActionableRecipe,
  action: RecipeAction,
): Promise<string> {
  const { client_request_id } = await getAssistantRequestId();
  await postAssistantText({
    text: buildRecipeActionPrompt(recipe, action),
    clientRequestId: client_request_id,
  });
  return recipeActionToastTitle(action);
}
