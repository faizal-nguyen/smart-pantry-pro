import type { StockCommand } from '@smart/shared';
import { commandForIntent, executeStockCommand, finishIntent, pendingIntent } from './stockCommands';
import { fetchUnifiedRecipe } from '@/lib/recipeSource';
import { supabase } from '@/integrations/supabase/client';

type SavePayload = Extract<StockCommand, { command_type: 'save_recipe' }>['payload'];
export async function saveRecipeWithIngredients(payload: SavePayload, intent = 'manual-recipe') {
  const pending = await pendingIntent(intent);
  if (pending && pending.command_type !== 'save_recipe') throw new Error('Une sauvegarde précédente reste à vérifier.');
  const command = pending ?? await commandForIntent('save_recipe',intent,payload);
  const result = await executeStockCommand(command);
  if (!result.recipe_id) throw new Error('La recette enregistrée reste à vérifier. Réessayez avec ce brouillon.');
  const recipe = await fetchUnifiedRecipe(result.recipe_id);
  const { data: ingredients, error } = await supabase.from('recipe_ingredients').select('id').eq('recipe_id',result.recipe_id);
  if (error || !recipe || ingredients?.length !== command.payload.ingredients.length) throw new Error('La sauvegarde reste à vérifier. Conservez ce brouillon et réessayez.');
  await finishIntent(intent);
  return recipe;
}
