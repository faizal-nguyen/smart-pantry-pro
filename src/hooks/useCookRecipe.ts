import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cookRecipeWithStock, type ActionableRecipe } from '@/lib/recipeActions';
import { undoStockCommand } from '@/services/stockCommands';
import { dispatchAgentDbChanged, tablesForTool } from '@/lib/agentEvents';

type CookState = { status: 'idle' | 'cooking' } | { status: 'cooked' | 'undoing'; commandId: string };

/**
 * « Cuisinée » on a card: counted once (the button stays « cuisinée » until undone),
 * with what the stock gave in the toast and « Annuler » to give it back.
 */
export function useCookRecipe(recipe: ActionableRecipe | null) {
  const { toast } = useToast();
  const [state, setState] = useState<CookState>({ status: 'idle' });
  const message = (err: unknown) => err instanceof Error ? err.message : 'Erreur inconnue';

  const cook = async () => {
    if (!recipe || state.status !== 'idle') return;
    setState({ status: 'cooking' });
    try {
      const outcome = await cookRecipeWithStock(recipe);
      setState({ status: 'cooked', commandId: outcome.commandId });
      dispatchAgentDbChanged(tablesForTool('cook_recipe'));
      toast({ title: outcome.title, description: [`Recette : ${recipe.name}`, ...outcome.details].join(' ') });
    } catch (err) {
      setState({ status: 'idle' });
      toast({ variant: 'destructive', title: 'Action impossible', description: message(err) });
    }
  };

  const undo = async () => {
    if (state.status !== 'cooked') return;
    const { commandId } = state;
    setState({ status: 'undoing', commandId });
    try {
      await undoStockCommand(commandId);
      setState({ status: 'idle' });
      dispatchAgentDbChanged(tablesForTool('cook_recipe'));
      toast({ title: 'Repas annulé', description: 'Ton stock est revenu comme avant.' });
    } catch (err) {
      setState({ status: 'cooked', commandId });
      toast({ variant: 'destructive', title: 'Annulation impossible', description: message(err) });
    }
  };

  return { status: state.status, cook, undo };
}
