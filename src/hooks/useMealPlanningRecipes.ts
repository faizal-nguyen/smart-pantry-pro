import { useCallback } from 'react';
import { recipeDurationMinutes } from '@smart/shared';
import { useRecipes, type Recipe } from './useRecipes';
import { useAuthSessionOptional } from './useAuthenticatedUser';
import { fetchUnifiedRecipe } from '@/lib/recipeSource';
import type { MenuMealType } from './useWeeklyMenu';

/**
 * Menus read the same legacy/library/catalogue identities as the recipe detail, typed as what
 * useRecipes reads (V11-01 E4a: the planning types of the removed smartMealPlannerService are gone).
 */
export function useMealPlanningRecipes() {
  const { user } = useAuthSessionOptional();
  const { recipes, loading: isLoading, error, fetchRecipes } = useRecipes();
  const searchRecipes = useCallback(async (query: string, filters?: {
    maxCost?: number; maxTime?: number; difficulty?: number; tags?: string[]; mealType?: MenuMealType;
  }): Promise<Recipe[]> => {
    if (error) throw error;
    const needle = query.trim().toLocaleLowerCase();
    return recipes.filter(recipe => recipe.user_id === user?.id)
      .filter(recipe => !needle || `${recipe.name} ${recipe.description ?? ''}`.toLocaleLowerCase().includes(needle))
      .filter(recipe => !filters?.difficulty || recipe.difficulty === filters.difficulty)
      .filter(recipe => { const duration=recipeDurationMinutes(recipe);return !filters?.maxTime || (duration!=null && duration<=filters.maxTime); })
      .filter(recipe => !filters?.tags?.length || filters.tags.every(tag => recipe.tags?.includes(tag)))
      .filter(recipe => !filters?.mealType || !recipe.meal_type || recipe.meal_type === filters.mealType)
      .slice(0,50);
  }, [recipes,user?.id,error]);
  return {
    catalogRecipes: recipes.filter(recipe => recipe.is_public),
    userRecipes: recipes.filter(recipe => recipe.user_id === user?.id),
    isLoading, error, searchRecipes,
    getRecipeById: (id: string) => fetchUnifiedRecipe(id),
    getRecipesByMealType: (mealType: MenuMealType) => searchRecipes('',{ mealType }),
    getPopularRecipes: (limit = 20) => searchRecipes('').then(rows => rows.slice(0,limit)),
    getFavoriteRecipes: () => searchRecipes(''), refreshCatalog: fetchRecipes, refreshUserRecipes: fetchRecipes,
  };
}
