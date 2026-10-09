import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { RecipeReference } from '@smart/shared';
import { useAuthenticatedUser } from './useAuthenticatedUser';
import { supabase } from '@/integrations/supabase/client';
export function useRecipeFavorites() {
  const user = useAuthenticatedUser(), client=useQueryClient(), key=['routine-recipe-favorites',user.id];
  const query=useQuery({ queryKey:key,queryFn:async () => {
    const { data,error }=await supabase.from('routine_recipe_favorites').select('*').eq('user_id',user.id);
    if (error) throw new Error('Favoris indisponibles. Réessayez.'); return data ?? [];
  } });
  const toggle=async (recipe:RecipeReference) => {
    if ((await supabase.auth.getSession()).data.session?.user.id!==user.id) throw new Error('Reconnectez-vous à ce compte pour modifier ce favori.');
    if (!query.data || query.error) throw new Error('Relisez les favoris avant de les modifier.');
    const exists=query.data.some(row => row.recipe_id===recipe.id);
    const result=exists ? await supabase.from('routine_recipe_favorites').delete().eq('user_id',user.id).eq('recipe_id',recipe.id).select('recipe_id')
      : await supabase.from('routine_recipe_favorites').insert({ user_id:user.id,recipe_id:recipe.id,recipe_source:recipe.source }).select('recipe_id');
    if (result.error || result.data?.length!==1) throw new Error('Favori non confirmé. Réessayez.');
    if ((await supabase.auth.getSession()).data.session?.user.id!==user.id) throw new Error('Le compte a changé.');
    await client.invalidateQueries({ queryKey:key });
  };
  return { ...query,toggle,isFavorite:(id:string) => query.data?.some(row=>row.recipe_id===id) ?? false };
}
