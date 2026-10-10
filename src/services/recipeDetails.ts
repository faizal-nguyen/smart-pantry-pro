import { normalizeRecipeInstructions, type RecipeReference, type RecipeEvaluationInput } from '@smart/shared';
import { supabase } from '@/integrations/supabase/client';
import { fetchUnifiedRecipe,invalidateUnifiedRecipeCache } from '@/lib/recipeSource';
import { ApiError } from '@/lib/api';

async function requireOwner(owner:string) {
  if ((await supabase.auth.getSession()).data.session?.user.id!==owner) throw new ApiError('Le compte a changé. Rouvre cette recette.',{ status:401,code:'AUTH_CHANGED' });
}
export async function getRecipeDetails(owner:string,reference:RecipeReference,signal?:AbortSignal) {
  await requireOwner(owner);
  invalidateUnifiedRecipeCache(reference.id);
  let recipe;
  try { recipe=await fetchUnifiedRecipe(reference.id,reference.source,owner); }
  catch {
    await requireOwner(owner);
    throw new ApiError('La recette ne peut pas être relue. Réessaie.',{ status:503,code:'RECIPE_DETAILS_UNAVAILABLE' });
  }
  if (!recipe) throw new ApiError('Cette recette est absente ou inaccessible.',{ status:404,code:'RECIPE_NOT_FOUND' });
  let ingredients:Array<{ id:string;ingredient_name:string;quantity:number|null;unit:string|null;is_essential:boolean;notes?:string|null }>;
  if (recipe.source!=='recipes') {
    ingredients=(recipe.inlineIngredients ?? []).map((item,index)=>({
      id:recipe.id+':'+index,ingredient_name:item.ingredient_name,quantity:item.quantity ?? null,unit:item.unit ?? null,
      is_essential:item.is_essential!==false,notes:item.notes,
    }));
  } else {
    let query=supabase.from('recipe_ingredients').select('*').eq('recipe_id',recipe.id).order('created_at');
    if (signal) query=query.abortSignal(signal);
    const { data,error }=await query;
    if (error) throw new ApiError('Les ingrédients ne peuvent pas être lus. Réessaie.',{ status:503,code:'RECIPE_DETAILS_UNAVAILABLE' });
    ingredients=(data ?? []).map(item=>({ ...item,quantity:item.quantity ?? null,is_essential:item.is_essential!==false }));
  }
  await requireOwner(owner);
  return { recipe,ingredients,instructions:normalizeRecipeInstructions(recipe.instructions) };
}

/** Verify the exact row written; an RLS-filtered zero-row update is not success. */
export async function saveRecipePhoto(owner:string,reference:RecipeEvaluationInput['recipe'],url:string) {
  await requireOwner(owner);
  if (reference.source==='recipes_catalog') throw new Error('Enregistre cette recette dans ta bibliothèque pour personnaliser sa photo.');
  if (!url.trim()) throw new Error('La photo envoyée ne possède pas de lien valide. Réessaie.');
  const column=reference.source==='user_recipes' ? 'custom_photo_url' : 'image_url';
  const { data,error }=await supabase.from(reference.source).update({ [column]:url }).eq('id',reference.id).eq('user_id',owner).select('id').single();
  if (error || data?.id!==reference.id) throw new Error('Photo non enregistrée. Réessaie avec le compte propriétaire.');
  await requireOwner(owner);
  invalidateUnifiedRecipeCache(reference.id);
}
