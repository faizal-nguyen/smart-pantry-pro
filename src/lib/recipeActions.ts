/**
 * V10-01 — known recipe buttons use explicit typed commands.
 * The assistant's handlers invoke the same atomic stock service.
 * buildRecipeActionPrompt remains for old read-only prompt previews.
 */
import { commandForIntent, executeStockCommand, finishIntent, pendingIntent, previewRecipeStock } from '@/services/stockCommands';
import { calendarDate, calendarWeekStart, canAddToShoppingList, describeCookPlan, needsPurchase, planCookFromStock, type RecipeReference } from '@smart/shared';
import { supabase } from '@/integrations/supabase/client';

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

export interface CookOutcome { title: string; details: string[]; commandId: string }

/**
 * « Cuisinée »: the stock gives what it holds (all of it when it holds less than the
 * recipe) and the rest was cooked outside it. One missing ingredient used to refuse the
 * whole meal (iPhone 2026-11-08). The command id lets the caller offer to undo it.
 */
export async function cookRecipeWithStock(recipe: ActionableRecipe): Promise<CookOutcome> {
  const reference: RecipeReference = { id: recipe.id, source: recipe.source ?? 'auto' };
  const intent = `recipe:${recipe.id}:cooked`;
  let command = await pendingIntent(intent);
  let details: string[] = [];
  if (!command) {
    const preview = await previewRecipeStock(reference,recipe.servings ?? undefined);
    const plan = planCookFromStock(preview.recipe.ingredients,preview.lots,preview.recipe.servings,preview.servings);
    details = describeCookPlan(plan,'done');
    command = await commandForIntent('consume_recipe', intent, {
      recipe: reference, servings: preview.servings, recipe_version: preview.recipe.version, outside_inventory: plan.outside_inventory,
      ...(plan.adjustments.length ? { adjustments: plan.adjustments } : {}),
    });
  }
  await executeStockCommand(command);
  await finishIntent(intent);
  return { title: recipeActionToastTitle('cooked'), details, commandId: command.command_id };
}

const PLAN_HORIZON_DAYS = 14;
const DAY_MS = 86_400_000;

/**
 * The first dinner from tonight with nothing planned, within two weeks, else tonight.
 * « Planifier » used to put every recipe on tonight's dinner, replacing it (audit 2026-11-07).
 */
async function nextFreeDinner(now = new Date()): Promise<{ date: string; label: string }> {
  const owner = (await supabase.auth.getSession()).data.session?.user.id;
  const days = Array.from({ length: PLAN_HORIZON_DAYS }, (_, offset) => calendarDate(new Date(now.getTime() + offset * DAY_MS))!);
  const { data, error } = owner ? await supabase.from('weekly_meal_plans').select('week_start_date, meal_plan_entries(day_of_week, meal_type)')
    .eq('user_id', owner).gte('week_start_date', calendarWeekStart(days[0])!).lte('week_start_date', days[days.length - 1]) : { data: [], error: null };
  if (error) throw error;
  const taken = new Set((data ?? []).flatMap((plan: { week_start_date: string; meal_plan_entries?: Array<{ day_of_week: number; meal_type: string }> | null }) =>
    (plan.meal_plan_entries ?? []).filter(entry => entry.meal_type === 'dinner')
      .map(entry => calendarDate(new Date(Date.parse(`${plan.week_start_date}T12:00:00Z`) + entry.day_of_week * DAY_MS)))));
  const index = Math.max(0, days.findIndex(day => !taken.has(day)));
  const label = index === 0 ? 'ce soir' : index === 1 ? 'demain soir'
    : `dîner, ${new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${days[index]}T12:00:00Z`))}`;
  return { date: days[index], label };
}

/** Known buttons execute the typed operation against this exact recipe id. */
export async function fireRecipeAssistantAction(recipe: ActionableRecipe, action: RecipeAction): Promise<string> {
  if (action === 'cooked') return (await cookRecipeWithStock(recipe)).title;
  const reference: RecipeReference = { id: recipe.id, source: recipe.source ?? 'auto' };
  const intent = `recipe:${recipe.id}:${action}`;
  let command = await pendingIntent(intent);
  let byHand: string[] = [];
  let planned: { date: string; label: string } | null = null;
  if (!command) {
    const preview = await previewRecipeStock(reference,recipe.servings ?? undefined);
    if (action === 'add_missing') {
      // "1 botte" or "au goût" cannot be stored as a shopping quantity: name them instead of failing.
      byHand = preview.missing.filter(missing => needsPurchase(missing) && !canAddToShoppingList(missing)).map(missing => missing.ingredient_name);
      command = await commandForIntent('recipe_add_missing',intent,{ recipe: reference, servings: preview.servings });
    } else {
      planned = await nextFreeDinner();
      command = await commandForIntent('plan_recipe',intent,{ recipe: reference, servings: preview.servings, date: planned.date, meal_type: 'dinner' });
    }
  }
  const result = await executeStockCommand(command);
  await finishIntent(intent);
  if (action === 'plan') {
    const replaced = result?.replaced_entry?.recipe_name;
    return `Ajoutée au menu${planned ? ` : ${planned.label}` : ''}${replaced ? ` · remplace « ${replaced} »` : ''}`;
  }
  // Everything already on the list: the server added nothing (20261108120000_menu_shopping_commands.sql).
  if (action === 'add_missing' && result && !result.shopping_ids?.length) return 'Déjà sur ta liste de courses';
  const title = recipeActionToastTitle(action);
  return byHand.length ? `${title} · à ajouter à la main : ${byHand.join(', ')}` : title;
}
