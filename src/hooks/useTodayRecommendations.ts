import { useRoutineMealIdeas } from './useRoutineMealIdeas';
import type { SuggestRecommendationsInput } from '@/services/recommendationsApi';
/** Legacy Today surfaces consume exactly the same authoritative result. */
export function useTodayRecommendations(input:SuggestRecommendationsInput={ goal:'tonight',limitPerBucket:3 }) {
  return useRoutineMealIdeas(input);
}
