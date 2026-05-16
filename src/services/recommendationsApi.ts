/**
 * PRP-234 PR3 — Recommendations API client.
 *
 * Wrap fin du `POST /api/v1/recommendations/suggest` (créé par
 * `apps/api/src/routes/recommendations.routes.ts`) pour le front
 * Today dashboard. Pas de logique business côté front — juste un
 * typage TS qui matche le backend Zod schema + le shape engine.
 */
import { apiPost } from '@/lib/api';

export type RecommendationGoal =
  | 'tonight'
  | 'quick'
  | 'anti_waste'
  | 'light'
  | 'high_protein'
  | 'comfort'
  | 'batch_cooking';

export type RecommendationMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface SuggestRecommendationsInput {
  goal?: RecommendationGoal;
  mealType?: RecommendationMealType;
  timeLimitMinutes?: number;
  servings?: number;
  query?: string;
  almostThreshold?: number;
  limitPerBucket?: number;
  nearExpiryDays?: number;
  includeRecentFallback?: boolean;
}

export interface RecommendedRecipeView {
  id: string;
  name: string;
  prep_time?: number | null;
  cook_time?: number | null;
  servings?: number | null;
  image_url?: string | null;
  cuisine_category?: string | null;
  meal_type?: string | null;
  tags?: string[] | null;
  total_essential?: number;
  linked_essential?: number;
  missing_count?: number;
  missing_ingredients?: string[];
  unlinked?: boolean;
  unlinked_count?: number;
  score_total?: number;
  reasons?: string[];
}

export interface RecipeSummaryView {
  id: string;
  name: string;
  prep_time?: number | null;
  cook_time?: number | null;
  servings?: number | null;
  image_url?: string | null;
  cuisine_category?: string | null;
  meal_type?: string | null;
  tags?: string[] | null;
}

export interface RecommendationResultView {
  cookable_now: RecommendedRecipeView[];
  almost_cookable: RecommendedRecipeView[];
  recent_suggestions: RecipeSummaryView[];
  total_user_recipes: number;
  event_id?: string;
}

export function postRecommendationSuggest(
  input: SuggestRecommendationsInput = {},
): Promise<RecommendationResultView> {
  return apiPost<RecommendationResultView>('/api/v1/recommendations/suggest', input);
}
