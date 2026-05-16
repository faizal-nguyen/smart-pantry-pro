/**
 * PRP-234 PR3 — useTodayRecommendations.
 *
 * Appelle le moteur PRP-226 via `POST /api/v1/recommendations/suggest`
 * pour alimenter le bloc « À cuisiner » du dashboard Today.
 *
 * Le backend cache 15 min (PRP-226 PR3, RecommendationEventWriter)
 * donc on garde `staleTime: 5min` côté front : suffisant pour ne pas
 * spammer mais assez court pour refléter rapidement les changements
 * d'inventaire (cache invalidé côté backend dès qu'un write
 * `add_inventory_items` / `consume_inventory_items` passe).
 *
 * Subscription `useAgentDbInvalidation` : si l'assistant touche aux
 * recettes ou à l'inventaire, on re-fetch pour montrer les nouvelles
 * recommandations.
 */
import { useQuery } from '@tanstack/react-query';

import {
  postRecommendationSuggest,
  type RecommendationResultView,
  type SuggestRecommendationsInput,
} from '@/services/recommendationsApi';
import { useAgentDbInvalidation } from '@/lib/agentEvents';

const QUERY_KEY = ['today-recommendations'] as const;
const DEFAULT_INPUT: SuggestRecommendationsInput = {
  goal: 'tonight',
  limitPerBucket: 3,
};

export function useTodayRecommendations(
  input: SuggestRecommendationsInput = DEFAULT_INPUT,
) {
  const query = useQuery<RecommendationResultView>({
    queryKey: [...QUERY_KEY, input.goal ?? null, input.limitPerBucket ?? null, input.mealType ?? null],
    staleTime: 5 * 60_000,
    queryFn: () => postRecommendationSuggest(input),
  });

  useAgentDbInvalidation(['inventory', 'recipes', 'recipe_ingredients'], () => {
    void query.refetch();
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
