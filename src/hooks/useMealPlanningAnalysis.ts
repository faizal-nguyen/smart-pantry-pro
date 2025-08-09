/**
 * Meal Planning Analysis Hook - Evolution V2
 * Extends useRecipeInventoryAnalysis patterns for comprehensive meal planning
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { useInventory } from './useInventory';
import { useRecipes } from './useRecipes';
import { useNutritionalAI } from './useNutritionalAI';
import { 
  getSmartMealPlannerService,
  SmartMealPlannerService,
  WeeklyMealPlan,
  UserPreferences,
  OptimizedShoppingList,
  AdjustedMealPlan,
  Budget,
  SeasonalRecommendations
} from '@/services/planning/smartMealPlannerService';
import { toast } from 'sonner';

export interface MealPlanningState {
  currentPlan: WeeklyMealPlan | null;
  userPreferences: UserPreferences | null;
  optimizedShoppingList: OptimizedShoppingList | null;
  seasonalRecommendations: SeasonalRecommendations | null;
  isGeneratingPlan: boolean;
  isOptimizingList: boolean;
  isLoadingPreferences: boolean;
  error: string | null;
  lastGenerated: Date | null;
}

export function useMealPlanningAnalysis() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const queryClient = useQueryClient();
  const { inventory } = useInventory();
  const { recipes } = useRecipes();
  const { healthProfile } = useNutritionalAI();
  
  const [state, setState] = useState<MealPlanningState>({
    currentPlan: null,
    userPreferences: null,
    optimizedShoppingList: null,
    seasonalRecommendations: null,
    isGeneratingPlan: false,
    isOptimizingList: false,
    isLoadingPreferences: false,
    error: null,
    lastGenerated: null
  });

  const mealPlannerService = useState<SmartMealPlannerService | null>(() => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    return apiKey ? getSmartMealPlannerService(apiKey) : null;
  })[0];

  // Load user preferences on mount
  useEffect(() => {
    if (user) {
      loadUserPreferences();
    }
  }, [user]);

  // Load seasonal recommendations
  useEffect(() => {
    if (mealPlannerService) {
      loadSeasonalRecommendations();
    }
  }, [mealPlannerService]);

  /**
   * Load user's meal planning preferences
   */
  const loadUserPreferences = useCallback(async () => {
    if (!user) return;

    setState(prev => ({ ...prev, isLoadingPreferences: true, error: null }));

    try {
      const { data, error } = await supabase
        .from('user_meal_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is OK
        throw error;
      }

      if (data) {
        const preferences: UserPreferences = {
          userId: user.id,
          dietaryRestrictions: data.dietary_restrictions || [],
          allergies: data.allergies || [],
          cuisinePreferences: data.cuisine_preferences || [],
          cookingSkillLevel: data.cooking_skill_level || 'intermediate',
          timeConstraints: {
            maxPrepTime: data.max_prep_time || 30,
            maxCookTime: data.max_cook_time || 45,
            busyDays: data.busy_days || []
          },
          familySize: data.family_size || 2,
          budgetConstraints: {
            weeklyBudget: data.weekly_budget || 100,
            strictMode: data.strict_budget_mode || false
          },
          nutritionalGoals: data.nutritional_goals || {},
          equipmentAvailable: data.equipment_available || [],
          shoppingPreferences: {
            preferLocal: data.prefer_local || false,
            organicPreference: data.organic_preference || 'some',
            maxTripFrequency: data.max_trip_frequency || 2
          }
        };

        setState(prev => ({ 
          ...prev, 
          userPreferences: preferences,
          isLoadingPreferences: false 
        }));
      } else {
        // Create default preferences
        const defaultPreferences = createDefaultPreferences(user.id);
        setState(prev => ({ 
          ...prev, 
          userPreferences: defaultPreferences,
          isLoadingPreferences: false 
        }));
      }
    } catch (error: any) {
      console.error('Failed to load user preferences:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message,
        isLoadingPreferences: false 
      }));
    }
  }, [user, supabase]);

  /**
   * Save user preferences
   */
  const saveUserPreferences = useCallback(async (preferences: Partial<UserPreferences>) => {
    if (!user) {
      toast.error('Utilisateur non connecté');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_meal_preferences')
        .upsert({
          user_id: user.id,
          dietary_restrictions: preferences.dietaryRestrictions,
          allergies: preferences.allergies,
          cuisine_preferences: preferences.cuisinePreferences,
          cooking_skill_level: preferences.cookingSkillLevel,
          max_prep_time: preferences.timeConstraints?.maxPrepTime,
          max_cook_time: preferences.timeConstraints?.maxCookTime,
          busy_days: preferences.timeConstraints?.busyDays,
          family_size: preferences.familySize,
          weekly_budget: preferences.budgetConstraints?.weeklyBudget,
          strict_budget_mode: preferences.budgetConstraints?.strictMode,
          nutritional_goals: preferences.nutritionalGoals,
          equipment_available: preferences.equipmentAvailable,
          prefer_local: preferences.shoppingPreferences?.preferLocal,
          organic_preference: preferences.shoppingPreferences?.organicPreference,
          max_trip_frequency: preferences.shoppingPreferences?.maxTripFrequency,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      // Update state with new preferences
      setState(prev => ({
        ...prev,
        userPreferences: prev.userPreferences ? { ...prev.userPreferences, ...preferences } : null
      }));

      toast.success('Préférences sauvegardées');
    } catch (error: any) {
      console.error('Failed to save preferences:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  }, [user, supabase]);

  /**
   * Generate weekly meal plan
   */
  const generateWeeklyPlan = useCallback(async (
    customPreferences?: Partial<UserPreferences>
  ) => {
    if (!mealPlannerService || !state.userPreferences) {
      toast.error('Service ou préférences non disponibles');
      return;
    }

    setState(prev => ({ ...prev, isGeneratingPlan: true, error: null }));

    try {
      const preferences = customPreferences 
        ? { ...state.userPreferences, ...customPreferences }
        : state.userPreferences;

      const plan = await mealPlannerService.generateWeeklyPlan(
        preferences,
        healthProfile || undefined,
        inventory || []
      );

      // Save plan to database
      await saveMealPlan(plan);

      setState(prev => ({ 
        ...prev, 
        currentPlan: plan,
        lastGenerated: new Date(),
        isGeneratingPlan: false 
      }));

      // Auto-generate optimized shopping list
      optimizeShoppingList(plan);

      toast.success('Plan de repas généré avec succès');
    } catch (error: any) {
      console.error('Failed to generate meal plan:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message,
        isGeneratingPlan: false 
      }));
      toast.error('Erreur lors de la génération du plan');
    }
  }, [mealPlannerService, state.userPreferences, healthProfile, inventory]);

  /**
   * Optimize shopping list for current meal plan
   */
  const optimizeShoppingList = useCallback(async (plan?: WeeklyMealPlan) => {
    if (!mealPlannerService || !state.userPreferences) return;

    const targetPlan = plan || state.currentPlan;
    if (!targetPlan) {
      toast.error('Aucun plan de repas disponible');
      return;
    }

    setState(prev => ({ ...prev, isOptimizingList: true }));

    try {
      const optimizedList = await mealPlannerService.optimizeShoppingList(
        targetPlan,
        state.userPreferences
      );

      setState(prev => ({ 
        ...prev, 
        optimizedShoppingList: optimizedList,
        isOptimizingList: false 
      }));

      toast.success(`Liste de courses optimisée - Économies estimées: ${optimizedList.estimatedSavings.toFixed(2)}€`);
    } catch (error: any) {
      console.error('Failed to optimize shopping list:', error);
      setState(prev => ({ ...prev, isOptimizingList: false }));
      toast.error('Erreur lors de l\'optimisation');
    }
  }, [mealPlannerService, state.userPreferences, state.currentPlan]);

  /**
   * Adapt meal plan to budget constraints
   */
  const adaptToBudget = useCallback(async (budget: Budget) => {
    if (!mealPlannerService || !state.currentPlan) {
      toast.error('Plan de repas non disponible');
      return;
    }

    try {
      const adjustedPlan = await mealPlannerService.adaptToBudget(
        state.currentPlan,
        budget
      );

      setState(prev => ({ ...prev, currentPlan: adjustedPlan }));

      const totalSavings = adjustedPlan.budgetAdjustments
        .reduce((sum, adj) => sum + adj.costSaved, 0);

      if (totalSavings > 0) {
        toast.success(`Plan adapté au budget - Économies: ${totalSavings.toFixed(2)}€`);
      } else {
        toast.success('Plan déjà dans votre budget');
      }

      // Re-optimize shopping list with adjusted plan
      optimizeShoppingList(adjustedPlan);
    } catch (error: any) {
      console.error('Failed to adapt to budget:', error);
      toast.error('Erreur lors de l\'adaptation au budget');
    }
  }, [mealPlannerService, state.currentPlan, optimizeShoppingList]);

  /**
   * Load seasonal recommendations
   */
  const loadSeasonalRecommendations = useCallback(async () => {
    if (!mealPlannerService) return;

    try {
      // Get current season
      const month = new Date().getMonth();
      let season: any;
      if (month >= 2 && month <= 4) season = { name: 'spring', months: [2, 3, 4] };
      else if (month >= 5 && month <= 7) season = { name: 'summer', months: [5, 6, 7] };
      else if (month >= 8 && month <= 10) season = { name: 'fall', months: [8, 9, 10] };
      else season = { name: 'winter', months: [11, 0, 1] };

      const recommendations = await mealPlannerService.seasonalOptimization(season);
      
      setState(prev => ({ 
        ...prev, 
        seasonalRecommendations: recommendations 
      }));
    } catch (error) {
      console.error('Failed to load seasonal recommendations:', error);
    }
  }, [mealPlannerService]);

  /**
   * Get meal plan for specific week
   */
  const { data: weeklyPlans, isLoading: isLoadingPlans } = useQuery({
    queryKey: ['weekly-meal-plans', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('weekly_meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('week_start_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 300000 // 5 minutes
  });

  /**
   * Save meal plan to database
   */
  const saveMealPlan = async (plan: WeeklyMealPlan) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('weekly_meal_plans')
        .upsert({
          id: plan.id,
          user_id: user.id,
          week_start_date: plan.weekStartDate.toISOString(),
          meals: plan.meals,
          total_estimated_cost: plan.totalEstimatedCost,
          nutritional_summary: plan.nutritionalSummary,
          shopping_list: plan.shoppingList,
          alternative_options: plan.alternativeOptions,
          status: plan.status
        }, {
          onConflict: 'id'
        });

      if (error) throw error;

      // Invalidate query cache
      queryClient.invalidateQueries(['weekly-meal-plans']);
    } catch (error) {
      console.error('Failed to save meal plan:', error);
    }
  };

  /**
   * Delete meal plan
   */
  const deleteMealPlan = useCallback(async (planId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('weekly_meal_plans')
        .delete()
        .eq('id', planId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update state if deleted plan was current
      if (state.currentPlan?.id === planId) {
        setState(prev => ({ 
          ...prev, 
          currentPlan: null,
          optimizedShoppingList: null
        }));
      }

      // Invalidate query cache
      queryClient.invalidateQueries(['weekly-meal-plans']);
      
      toast.success('Plan de repas supprimé');
    } catch (error: any) {
      console.error('Failed to delete meal plan:', error);
      toast.error('Erreur lors de la suppression');
    }
  }, [user, supabase, queryClient, state.currentPlan]);

  /**
   * Load existing meal plan
   */
  const loadMealPlan = useCallback(async (planId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('weekly_meal_plans')
        .select('*')
        .eq('id', planId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      const plan: WeeklyMealPlan = {
        id: data.id,
        userId: data.user_id,
        weekStartDate: new Date(data.week_start_date),
        meals: data.meals,
        totalEstimatedCost: data.total_estimated_cost,
        nutritionalSummary: data.nutritional_summary,
        shoppingList: data.shopping_list,
        alternativeOptions: data.alternative_options,
        createdAt: new Date(data.created_at),
        status: data.status
      };

      setState(prev => ({ 
        ...prev, 
        currentPlan: plan,
        optimizedShoppingList: plan.shoppingList
      }));
    } catch (error: any) {
      console.error('Failed to load meal plan:', error);
      toast.error('Erreur lors du chargement du plan');
    }
  }, [user, supabase]);

  return {
    // State
    ...state,
    weeklyPlans,
    isLoadingPlans,
    
    // Actions
    loadUserPreferences,
    saveUserPreferences,
    generateWeeklyPlan,
    optimizeShoppingList,
    adaptToBudget,
    loadSeasonalRecommendations,
    saveMealPlan: (plan: WeeklyMealPlan) => saveMealPlan(plan),
    deleteMealPlan,
    loadMealPlan,
    
    // Computed
    hasPreferences: !!state.userPreferences,
    canGeneratePlan: !!state.userPreferences && !!mealPlannerService,
    totalWeeklyCost: state.currentPlan?.totalEstimatedCost || 0,
    estimatedSavings: state.optimizedShoppingList?.estimatedSavings || 0,
    isWithinBudget: state.userPreferences ? 
      (state.currentPlan?.totalEstimatedCost || 0) <= state.userPreferences.budgetConstraints.weeklyBudget : true,
    
    // Planning insights
    planningInsights: {
      varietyScore: state.currentPlan?.nutritionalSummary.varietyScore || 0,
      healthScore: state.currentPlan?.nutritionalSummary.healthScore || 0,
      budgetUtilization: state.userPreferences ? 
        Math.round(((state.currentPlan?.totalEstimatedCost || 0) / state.userPreferences.budgetConstraints.weeklyBudget) * 100) : 0,
      itemsToShop: state.optimizedShoppingList?.items.length || 0,
      alternativesAvailable: state.currentPlan?.alternativeOptions.length || 0
    }
  };
}

/**
 * Create default user preferences
 */
function createDefaultPreferences(userId: string): UserPreferences {
  return {
    userId,
    dietaryRestrictions: [],
    allergies: [],
    cuisinePreferences: ['française', 'méditerranéenne'],
    cookingSkillLevel: 'intermediate',
    timeConstraints: {
      maxPrepTime: 30,
      maxCookTime: 45,
      busyDays: ['monday', 'wednesday']
    },
    familySize: 2,
    budgetConstraints: {
      weeklyBudget: 80,
      strictMode: false
    },
    nutritionalGoals: {
      targetCalories: 2000
    },
    equipmentAvailable: ['four', 'plaques', 'frigo', 'micro-ondes'],
    shoppingPreferences: {
      preferLocal: false,
      organicPreference: 'some',
      maxTripFrequency: 2
    }
  };
}

/**
 * Hook for recipe-specific meal planning analysis
 */
export function useRecipeMealPlanningAnalysis(recipeId: string) {
  const { state } = useMealPlanningAnalysis();
  
  const recipeInCurrentPlan = state.currentPlan?.meals.find(
    meal => meal.recipeId === recipeId
  );
  
  const recipeAlternatives = state.currentPlan?.alternativeOptions.filter(
    alt => alt.originalMealId === recipeInCurrentPlan?.id
  );
  
  return {
    isInCurrentPlan: !!recipeInCurrentPlan,
    mealEntry: recipeInCurrentPlan,
    alternatives: recipeAlternatives || [],
    estimatedCostInPlan: recipeInCurrentPlan?.estimatedCost || 0,
    nutritionalContribution: recipeInCurrentPlan?.nutritionalInfo,
    canSubstitute: (recipeAlternatives?.length || 0) > 0
  };
}