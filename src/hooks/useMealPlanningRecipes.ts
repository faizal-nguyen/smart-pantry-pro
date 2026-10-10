import { useCallback } from 'react';
import { recipeDurationMinutes } from '@smart/shared';
import { useRecipes } from './useRecipes';
import { useAuthSessionOptional } from './useAuthenticatedUser';
import { fetchUnifiedRecipe } from '@/lib/recipeSource';
import type { MealType, RecipeWithDetails } from '@/services/planning/types';

/** Menus read the same legacy/library/catalogue identities as the recipe detail. */
export function useMealPlanningRecipes() {
  const { user } = useAuthSessionOptional();
  const { recipes, loading: isLoading, error, fetchRecipes } = useRecipes();
  const searchRecipes = useCallback(async (query: string, filters?: {
    maxCost?: number; maxTime?: number; difficulty?: number; tags?: string[]; mealType?: MealType;
  }) => {
    if (error) throw error;
    const needle = query.trim().toLocaleLowerCase();
    return recipes.filter(recipe => recipe.user_id === user?.id)
      .filter(recipe => !needle || `${recipe.name} ${recipe.description ?? ''}`.toLocaleLowerCase().includes(needle))
      .filter(recipe => !filters?.difficulty || recipe.difficulty === filters.difficulty)
      .filter(recipe => { const duration=recipeDurationMinutes(recipe);return !filters?.maxTime || (duration!=null && duration<=filters.maxTime); })
      .filter(recipe => !filters?.tags?.length || filters.tags.every(tag => recipe.tags?.includes(tag)))
      .filter(recipe => !filters?.mealType || !recipe.meal_type || recipe.meal_type === filters.mealType)
      .slice(0,50) as unknown as RecipeWithDetails[];
  }, [recipes,user?.id,error]);
  return {
    catalogRecipes: recipes.filter(recipe => recipe.is_public) as unknown as RecipeWithDetails[],
    userRecipes: recipes.filter(recipe => recipe.user_id === user?.id) as unknown as RecipeWithDetails[],
    isLoading, error, searchRecipes,
    getRecipeById: async (id: string) => await fetchUnifiedRecipe(id) as unknown as RecipeWithDetails | null,
    getRecipesByMealType: (mealType: MealType) => searchRecipes('',{ mealType }),
    getPopularRecipes: (limit = 20) => searchRecipes('').then(rows => rows.slice(0,limit)),
    getFavoriteRecipes: () => searchRecipes(''), refreshCatalog: fetchRecipes, refreshUserRecipes: fetchRecipes,
  };
}
