import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedUser } from './useAuthenticatedUser';
import { usePersonalization } from './usePersonalization';
import { postRecommendationSuggest, type SuggestRecommendationsInput } from '@/services/recommendationsApi';
import { previewRecipeStock } from '@/services/stockCommands';
import { supabase } from '@/integrations/supabase/client';
import { mealExclusionReason, mealPreferenceVerificationIssue } from '@/lib/mealExclusions';
import { useAgentDbInvalidation } from '@/lib/agentEvents';
export function useRoutineMealIdeas(input:SuggestRecommendationsInput) {
  const user = useAuthenticatedUser(), local = usePersonalization();
  const query = useQuery({ queryKey:['routine-meal-ideas',user.id,input,local.personalizationData?.dietaryPreferences],staleTime:60000,queryFn:async () => {
    if (local.error) throw new Error('Vérifiez vos préférences avant de charger les idées.');
    const preferences = await supabase.from('user_meal_preferences').select('allergies,dietary_restrictions').eq('user_id',user.id).maybeSingle();
    if (preferences.error) throw new Error('Les exclusions alimentaires n’ont pas pu être lues. Réessayez.');
    const allergies = preferences.data?.allergies ?? [], restrictions = [...(preferences.data?.dietary_restrictions ?? []),...(local.personalizationData?.dietaryPreferences ?? [])];
    const verificationIssue = mealPreferenceVerificationIssue(restrictions);
    if (verificationIssue) throw new Error(verificationIssue);
    const result = await postRecommendationSuggest({ ...input,limitPerBucket:6 });
    const candidates = [...result.cookable_now,...result.almost_cookable];
    const unique = [...new Map(candidates.map(recipe => [recipe.id,recipe])).values()].slice(0,9);
    const checked = await Promise.all(unique.map(async recipe => {
      const preview = await previewRecipeStock({ id:recipe.id,source:'auto' },input.servings);
      if (mealExclusionReason(preview.recipe.ingredients,allergies,restrictions)) return null;
      const time = (recipe.prep_time ?? 0)+(recipe.cook_time ?? 0);
      if (input.timeLimitMinutes && (!time || time>input.timeLimitMinutes)) return null;
      return { ...recipe,reference:{ id:preview.recipe.id,source:preview.recipe.source },servings:preview.servings,missing:preview.missing,available:preview.missing.length===0,
        reason:preview.missing.length ? `${preview.missing.length} ingrédient(s) à acheter ou vérifier` : 'Quantités, unités et lots disponibles vérifiés' };
    }));
    if ((await supabase.auth.getSession()).data.session?.user.id !== user.id) throw new Error('Le compte a changé. Rechargez les idées.');
    return { ideas:checked.filter((value):value is NonNullable<typeof value> => !!value).slice(0,3),hasExclusions:allergies.length>0 || restrictions.length>0 };
  } });
  useAgentDbInvalidation(['inventory','recipes','recipe_ingredients','user_recipes'],() => { void query.refetch(); });
  return query;
}
