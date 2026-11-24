import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/apiError';
import { cookRecipeWithStock, forgetMealCooking, type ActionableRecipe, type PlannedMealRef } from '@/lib/recipeActions';
import { undoStockCommand } from '@/services/stockCommands';
import { dispatchAgentDbChanged, tablesForTool } from '@/lib/agentEvents';

/** `settling`: done on the server; the card stays busy until the menu shows `expected`. */
type CookState = { status: 'idle' | 'cooking' } | { status: 'cooked' | 'undoing'; commandId: string }
  | { status: 'settling'; expected: string | null };
export type CookStatus = 'idle' | 'cooking' | 'cooked' | 'undoing';

/** The menu is reread at once; past this delay a failed reread shows what the menu last read. */
const SETTLE_LIMIT_MS = 3_000;

/**
 * A planned meal (V11-01 E1): whether it is cooked is read from the menu, which `refresh`
 * rereads. The button stays busy until the menu shows the new state, so it never offers to
 * cook again a meal just cooked.
 */
export interface CookedMealLink extends PlannedMealRef {
  cookedCommandId: string | null;
  refresh: () => Promise<unknown>;
}

/** Refusals that mean the menu changed under the card: it is reread, and the server says why. */
const MENU_CONFLICTS = ['MENU_CHANGED', 'ALREADY_COOKED', 'MEAL_COOKED', 'ITEM_NOT_FOUND'];
const MEAL_GONE = 'Ce repas n’est plus au menu : le menu a été relu.';

function message(err: unknown, meal: CookedMealLink | null | undefined): string {
  if (meal && err instanceof ApiError && err.code === 'ITEM_NOT_FOUND') return MEAL_GONE;
  return err instanceof Error ? err.message : 'Erreur inconnue';
}

function isMenuConflict(err: unknown): boolean {
  return err instanceof ApiError && MENU_CONFLICTS.includes(err.code ?? '');
}

/** With a meal, only the transitions are local; the rest is what the menu says. */
function mealStatus(state: CookState, meal: CookedMealLink): CookStatus {
  if (state.status === 'cooking' || state.status === 'undoing') return state.status;
  // The query notifies the card after `refresh` resolves: until the menu shows the result, stay busy.
  if (state.status === 'settling' && meal.cookedCommandId !== state.expected) return state.expected ? 'cooking' : 'undoing';
  return meal.cookedCommandId ? 'cooked' : 'idle';
}

/**
 * « Cuisinée » on a card: counted once (the button stays « cuisinée » until undone),
 * with what the stock gave in the toast and « Annuler » to give it back.
 */
export function useCookRecipe(recipe: ActionableRecipe | null, meal?: CookedMealLink | null) {
  const { toast } = useToast();
  const [state, setState] = useState<CookState>({ status: 'idle' });
  const settleTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(settleTimer.current), []);
  const status: CookStatus = meal ? mealStatus(state, meal) : state.status === 'settling' ? 'idle' : state.status;

  const settle = async (link: CookedMealLink, expected: string | null) => {
    setState({ status: 'settling', expected });
    await link.refresh();
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => setState(current => current.status === 'settling' ? { status: 'idle' } : current), SETTLE_LIMIT_MS);
  };

  const cook = async () => {
    if (!recipe || status !== 'idle') return;
    setState({ status: 'cooking' });
    try {
      const outcome = await cookRecipeWithStock(recipe, meal ? { id: meal.id, version: meal.version } : null);
      if (meal) await settle(meal, outcome.commandId);
      else setState({ status: 'cooked', commandId: outcome.commandId });
      dispatchAgentDbChanged(tablesForTool('cook_recipe'));
      toast({ title: outcome.title, description: [`Recette : ${recipe.name}`, ...outcome.details].join(' ') });
    } catch (err) {
      if (meal && isMenuConflict(err)) await meal.refresh();
      setState({ status: 'idle' });
      toast({ variant: 'destructive', title: 'Action impossible', description: message(err, meal) });
    }
  };

  const undo = async () => {
    const commandId = meal ? meal.cookedCommandId : state.status === 'cooked' ? state.commandId : null;
    if (!commandId || status !== 'cooked') return;
    setState({ status: 'undoing', commandId });
    try {
      await undoStockCommand(commandId);
      if (meal) {
        await forgetMealCooking(meal.id, commandId);
        await settle(meal, null);
      } else setState({ status: 'idle' });
      dispatchAgentDbChanged(tablesForTool('cook_recipe'));
      toast({ title: 'Repas annulé', description: 'Ton stock est revenu comme avant.' });
    } catch (err) {
      if (meal && isMenuConflict(err)) await meal.refresh();
      setState(meal ? { status: 'idle' } : { status: 'cooked', commandId });
      toast({ variant: 'destructive', title: 'Annulation impossible', description: message(err, meal) });
    }
  };

  return { status, cook, undo };
}
