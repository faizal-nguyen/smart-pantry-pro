import { apiPost,ApiError } from '@/lib/api';
import { RecommendationFeedbackSchema,RecipeEvaluationInputSchema,RecipeEvaluationSchema,type RecipeEvaluationInput,type RecipeEvaluation,type MealContext,type RecommendationEvidence,type RecommendationFeedback } from '@smart/shared';
import { readOwnedValue,writeOwnedValue,removeOwnedValue } from '@/lib/ownedStorage';

export type SuggestRecommendationsInput = MealContext;
export type RecommendationGoal = NonNullable<MealContext['goal']>;
export type RecommendationMealType = NonNullable<MealContext['mealType']>;
export interface RecipeSummaryView {
  id:string;name:string;prep_time?:number|null;cook_time?:number|null;servings?:number|null;
  image_url?:string|null;cuisine_category?:string|null;meal_type?:string|null;tags?:string[]|null;
  image_origin?:'personal'|'catalog'|null;
}
export interface RecommendedRecipeView extends RecipeSummaryView,RecommendationEvidence {
  total_essential?:number;linked_essential?:number;missing_count?:number;missing_ingredients?:string[];
  unlinked?:boolean;unlinked_count?:number;score_total:number;reasons:string[];
}
export interface RecommendationResultView {
  cookable_now:RecommendedRecipeView[];almost_cookable:RecommendedRecipeView[];
  recent_suggestions:RecipeSummaryView[];verify_suggestions:RecommendedRecipeView[];excluded_suggestions:RecommendedRecipeView[];
  total_user_recipes:number;event_id?:string;pipeline_version:3;profile_version:number;calculated_at:string;has_constraints:boolean;
}
export async function postRecommendationSuggest(input:SuggestRecommendationsInput={},owner?:string):Promise<RecommendationResultView> {
  const result=await apiPost<RecommendationResultView>('/v1/recommendations/suggest',input,{ expectedUserId:owner });
  if (result.pipeline_version!==3 || !Array.isArray(result.verify_suggestions) || !Array.isArray(result.excluded_suggestions)) {
    throw new ApiError('Les idées de recettes sont momentanément indisponibles. Leur compatibilité ne peut pas être confirmée.',{ status:503,code:'MIGRATION_REQUIRED' });
  }
  return result;
}
export async function postRecipeEvaluation(input:RecipeEvaluationInput,owner:string,signal?:AbortSignal):Promise<RecipeEvaluation> {
  const request=RecipeEvaluationInputSchema.parse(input);
  const result=await apiPost<unknown>('/v1/recommendations/evaluate',request,{ expectedUserId:owner,signal });
  const checked=RecipeEvaluationSchema.safeParse(result);
  if (!checked.success || checked.data.reference.id!==request.recipe.id || checked.data.reference.source!==request.recipe.source || checked.data.servings!==request.servings) {
    throw new ApiError('Les informations reçues ne correspondent pas à cette recette et à ses portions. Réessaie.',{ status:503,code:'INVALID_RECIPE_EVALUATION' });
  }
  return checked.data;
}
export function pendingRecipeFeedback(owner:string):RecommendationFeedback|null {
  const saved=readOwnedValue<unknown>(owner,'recipe-feedback-write',null);
  return saved ? RecommendationFeedbackSchema.parse(saved) : null;
}
export async function postRecipeFeedback(owner:string,input:Omit<RecommendationFeedback,'command_id'>):Promise<{ id:string }> {
  const pending=pendingRecipeFeedback(owner);
  if (pending && (pending.recipe.id!==input.recipe.id || pending.recipe.source!==input.recipe.source || pending.feedback!==input.feedback)) {
    throw new ApiError('Un retour précédent reste à vérifier. Reprends-le avant un autre retour.',{ status:409,code:'FEEDBACK_PENDING' });
  }
  const command=pending ?? RecommendationFeedbackSchema.parse({ ...input,command_id:crypto.randomUUID() });
  writeOwnedValue(owner,'recipe-feedback-write',command);
  const result=await apiPost<{ id:string }>('/v1/recommendations/feedback',command,{ expectedUserId:owner });
  if (!result.id) throw new Error('Le retour n’a pas été confirmé.');
  removeOwnedValue(owner,'recipe-feedback-write');
  return result;
}
