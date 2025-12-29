/**
 * Meal Planning Analysis Hook - Evolution V2
 * Extends useRecipeInventoryAnalysis patterns for comprehensive meal planning
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  SeasonalRecommendations,
  MealType
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
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
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

  /**
   * Load user's meal planning preferences
   */
  const loadUserPreferences = useCallback(async () => {
    if (!user?.user?.id) {
      console.log('No user found, skipping preferences load');
      return;
    }

    setState(prev => ({ ...prev, isLoadingPreferences: true, error: null }));

    try {
      const { data, error } = await supabase
        .from('user_meal_preferences')
        .select('*')
        .maybeSingle(); // Use maybeSingle instead of single

      if (error) {
        throw error;
      }

      if (data) {
        const preferences: UserPreferences = {
          userId: user.user.id,
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
        const defaultPreferences = createDefaultPreferences(user.user.id);
        
        // Save default preferences to database directly
        try {
          await supabase
            .from('user_meal_preferences')
            .insert({
              user_id: user.user.id,
              dietary_restrictions: defaultPreferences.dietaryRestrictions,
              allergies: defaultPreferences.allergies,
              cuisine_preferences: defaultPreferences.cuisinePreferences,
              cooking_skill_level: defaultPreferences.cookingSkillLevel,
              max_prep_time: defaultPreferences.timeConstraints.maxPrepTime,
              max_cook_time: defaultPreferences.timeConstraints.maxCookTime,
              busy_days: defaultPreferences.timeConstraints.busyDays,
              family_size: defaultPreferences.familySize,
              weekly_budget: defaultPreferences.budgetConstraints.weeklyBudget,
              strict_budget_mode: defaultPreferences.budgetConstraints.strictMode,
              nutritional_goals: defaultPreferences.nutritionalGoals,
              equipment_available: defaultPreferences.equipmentAvailable,
              prefer_local: defaultPreferences.shoppingPreferences.preferLocal,
              organic_preference: defaultPreferences.shoppingPreferences.organicPreference,
              max_trip_frequency: defaultPreferences.shoppingPreferences.maxTripFrequency
            });
        } catch (insertError) {
          console.log('Could not create default preferences:', insertError);
        }
        
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

  // Load user on mount
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: userData, error } = await supabase.auth.getUser();
        if (userData.user && !error) {
          setUser(userData);
        }
      } catch (error) {
        console.error('Error getting user:', error);
      }
    };
    
    getUser();
  }, []);

  // Load user preferences on mount
  useEffect(() => {
    if (user) {
      loadUserPreferences();
    }
  }, [user, loadUserPreferences]);

  // Load seasonal recommendations
  useEffect(() => {
    if (mealPlannerService) {
      loadSeasonalRecommendations();
    }
  }, [mealPlannerService]);

  // Load current week plan after user and functions are ready
  useEffect(() => {
    console.log('🔍 useEffect for loading plan triggered, user:', user?.user?.id);
    if (!user?.user?.id) {
      console.log('❌ No user yet, skipping load');
      return;
    }

    const loadCurrentWeekPlan = async () => {
      console.log('🔍 Starting to load current week plan for user:', user.user.id);
      try {
        // Get Monday of current week
        const today = new Date();
        const dayOfWeek = today.getDay();
        // If Sunday (0), go back 6 days, otherwise go back (dayOfWeek - 1) days
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(today);
        monday.setDate(today.getDate() - daysToMonday);
        monday.setHours(0, 0, 0, 0);
        const mondayString = monday.toISOString().split('T')[0];
        console.log('📅 Today is:', today.toDateString(), 'Day of week:', dayOfWeek);
        console.log('📅 Looking for plan starting on Monday:', mondayString);

        // First, let's see all plans for this user
        const { data: allPlans, error: allPlansError } = await supabase
          .from('weekly_meal_plans')
          .select('id, week_start_date, status, created_at')
          .eq('user_id', user.user.id)
          .order('week_start_date', { ascending: false });

        if (allPlansError) {
          console.error('Error loading all plans:', allPlansError);
        } else {
          console.log('📅 All plans for user:', allPlans);
        }

        // Load plan for current week
        const { data: planData, error: planError } = await supabase
          .from('weekly_meal_plans')
          .select('*')
          .eq('user_id', user.user.id)
          .eq('week_start_date', mondayString)
          .maybeSingle();

        if (planError) {
          console.error('❌ Error loading week plan:', planError);
          return;
        }

        if (planData) {
          console.log('✅ Found existing plan for current week:', planData.id, 'Status:', planData.status);
          // Load meal entries directly here
          const { data: mealEntries, error: entriesError } = await supabase
            .from('meal_plan_entries')
            .select('*')
            .eq('meal_plan_id', planData.id)
            .order('day_of_week', { ascending: true });

          if (entriesError) {
            console.error('❌ Error loading meal entries:', entriesError);
            return;
          }

          console.log('✅ Loaded meal entries:', mealEntries?.length || 0);

          // Convert meal entries to the expected format
          const meals = (mealEntries || []).map(entry => ({
            id: entry.id,
            dayOfWeek: entry.day_of_week,
            mealType: entry.meal_type,
            recipeId: entry.recipe_id,
            recipeName: entry.recipe_name,
            servings: entry.servings,
            estimatedCost: entry.estimated_cost,
            prepTime: entry.prep_time,
            cookTime: entry.cook_time,
            estimatedTime: entry.prep_time + entry.cook_time,
            nutritionalInfo: entry.nutritional_info,
            requiredIngredients: entry.required_ingredients,
            missingIngredients: entry.missing_ingredients,
            confidence: entry.confidence
          }));

          const plan = {
            id: planData.id,
            userId: planData.user_id,
            weekStartDate: new Date(planData.week_start_date),
            meals: meals,
            totalEstimatedCost: meals.reduce((sum, meal) => sum + (meal.estimatedCost || 0), 0),
            nutritionalSummary: planData.nutritional_summary || {},
            shoppingList: planData.shopping_list || {},
            alternativeOptions: planData.alternative_options || [],
            createdAt: new Date(planData.created_at),
            status: planData.status || 'draft'
          };

          setState(prev => ({ 
            ...prev, 
            currentPlan: plan,
            optimizedShoppingList: plan.shoppingList
          }));

          console.log('✅ Successfully loaded plan with', meals.length, 'meals');
        } else {
          console.log('📅 No existing plan found for week starting:', mondayString);
        }
      } catch (error) {
        console.error('❌ Failed to load current week plan:', error);
      }
    };

    loadCurrentWeekPlan();
  }, [user]);

  /**
   * Save user preferences
   */
  const saveUserPreferences = useCallback(async (preferences: Partial<UserPreferences>) => {
    if (!user?.user?.id) {
      toast.error('Utilisateur non connecté');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_meal_preferences')
        .upsert({
          user_id: user.user.id,
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
    queryKey: ['weekly-meal-plans', user?.user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('weekly_meal_plans')
        .select('*')
        .eq('user_id', user.user.id)
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
      // First save the weekly plan with existing columns only
      // Ensure week_start_date is just the date part (YYYY-MM-DD) for PostgreSQL DATE type
      const weekStartDateString = plan.weekStartDate.toISOString().split('T')[0];
      
      const planData: any = {
        id: plan.id,
        user_id: user.user.id,
        week_start_date: weekStartDateString,
        status: plan.status || 'draft',
        nutritional_summary: plan.nutritionalSummary || {},
        shopping_list: plan.shoppingList || {},
        alternative_options: plan.alternativeOptions || []
      };

      const { data: savedPlan, error: planError } = await supabase
        .from('weekly_meal_plans')
        .upsert(planData, {
          onConflict: 'id'
        })
        .select()
        .single();

      if (planError) throw planError;

      // Then save the meal entries separately
      if (plan.meals && plan.meals.length > 0) {
        // Delete existing entries for this plan
        await supabase
          .from('meal_plan_entries')
          .delete()
          .eq('meal_plan_id', plan.id);

        // Insert new entries
        const mealEntries = plan.meals.map(meal => ({
          meal_plan_id: plan.id,
          day_of_week: meal.dayOfWeek,
          meal_type: meal.mealType,
          recipe_id: null, // Set to null to avoid foreign key constraint issues
          recipe_name: meal.recipeName || 'Sans nom',
          servings: meal.servings || 4,
          estimated_cost: meal.estimatedCost || 0,
          prep_time: meal.prepTime || 0,
          cook_time: meal.cookTime || 0,
          nutritional_info: meal.nutritionalInfo || {},
          required_ingredients: meal.requiredIngredients || [],
          missing_ingredients: meal.missingIngredients || [],
          confidence: meal.confidence || 1.0
        }));

        const { error: entriesError } = await supabase
          .from('meal_plan_entries')
          .insert(mealEntries);

        if (entriesError) throw entriesError;
        
        console.log('✅ Meal entries saved successfully:', mealEntries.length);
      }

      // Invalidate query cache
      queryClient.invalidateQueries(['weekly-meal-plans']);
      
      console.log('✅ Meal plan saved successfully with ID:', plan.id);
      toast.success('Plan de repas sauvegardé');
    } catch (error) {
      console.error('Failed to save meal plan:', error);
      toast.error('Erreur lors de la sauvegarde');
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
        .eq('user_id', user.user.id);

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
      // Load the plan
      const { data: planData, error: planError } = await supabase
        .from('weekly_meal_plans')
        .select('*')
        .eq('id', planId)
        .eq('user_id', user.user.id)
        .single();

      if (planError) throw planError;

      // Load the meal entries
      const { data: mealEntries, error: entriesError } = await supabase
        .from('meal_plan_entries')
        .select('*')
        .eq('meal_plan_id', planId)
        .order('day_of_week', { ascending: true });

      if (entriesError) throw entriesError;

      // Convert meal entries to the expected format
      const meals = (mealEntries || []).map(entry => ({
        id: entry.id,
        dayOfWeek: entry.day_of_week,
        mealType: entry.meal_type,
        recipeId: entry.recipe_id,
        recipeName: entry.recipe_name,
        servings: entry.servings,
        estimatedCost: entry.estimated_cost,
        prepTime: entry.prep_time,
        cookTime: entry.cook_time,
        estimatedTime: entry.prep_time + entry.cook_time,
        nutritionalInfo: entry.nutritional_info,
        requiredIngredients: entry.required_ingredients,
        missingIngredients: entry.missing_ingredients,
        confidence: entry.confidence
      }));

      const plan: WeeklyMealPlan = {
        id: planData.id,
        userId: planData.user_id,
        weekStartDate: new Date(planData.week_start_date),
        meals: meals,
        totalEstimatedCost: meals.reduce((sum, meal) => sum + (meal.estimatedCost || 0), 0), // Calculate from meals
        nutritionalSummary: planData.nutritional_summary || {},
        shoppingList: planData.shopping_list || {},
        alternativeOptions: planData.alternative_options || [],
        createdAt: new Date(planData.created_at),
        status: planData.status || 'draft'
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

  /**
   * Update a specific meal in the current plan
   */
  const updateMealInPlan = useCallback(async (
    dayIndex: number, 
    mealType: MealType, 
    recipeId: string | null
  ) => {
    
    let workingPlan = state.currentPlan;
    
    if (!workingPlan) {
      // Créer un plan par défaut si aucun n'existe
      const today = new Date();
      const dayOfWeek = today.getDay();
      // If Sunday (0), go back 6 days, otherwise go back (dayOfWeek - 1) days
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - daysToMonday);
      startOfWeek.setHours(0, 0, 0, 0);
      
      workingPlan = {
        id: crypto.randomUUID(),
        userId: user?.user?.id || 'temp',
        weekStartDate: startOfWeek,
        meals: [],
        totalEstimatedCost: 0,
        nutritionalSummary: {
          totalCalories: 0,
          avgProtein: 0,
          avgCarbs: 0,
          avgFat: 0,
          avgFiber: 0,
          healthScore: 0,
          varietyScore: 0
        },
        shoppingList: {
          items: [],
          totalEstimatedCost: 0,
          estimatedSavings: 0,
          storeRecommendations: []
        },
        alternativeOptions: [],
        budgetAdjustments: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Mettre à jour l'état avec le nouveau plan
      setState(prev => ({ ...prev, currentPlan: workingPlan }));
    }

    try {
      // Créer une copie du plan à utiliser
      const updatedPlan = { ...workingPlan };
      
      // Trouver l'index du repas à mettre à jour
      const mealIndex = updatedPlan.meals.findIndex(
        meal => meal.dayOfWeek === dayIndex && meal.mealType === mealType
      );

      if (recipeId) {
        // Récupérer les détails de la recette depuis la base de données
        let recipe;
        try {
          // Essayer d'abord dans 'recipes' (ancienne table)
          const { data: recipeData, error: recipeError } = await supabase
            .from('recipes')
            .select('*')
            .eq('id', recipeId)
            .single();

          if (!recipeError && recipeData) {
            recipe = recipeData;
          } else {
            // Si pas trouvé, essayer dans 'recipes_catalog' (nouvelle table)
            const { data: catalogData, error: catalogError } = await supabase
              .from('recipes_catalog')
              .select('*')
              .eq('id', recipeId)
              .single();
              
            if (!catalogError && catalogData) {
              recipe = catalogData;
            } else {
              console.error('Recette non trouvée dans aucune table');
              throw new Error('Recette non trouvée');
            }
          }
        } catch (error) {
          console.error('Impossible de récupérer la recette, utilisation de données par défaut:', error);
          recipe = {
            name: 'Recette non trouvée',
            prep_time: 15,
            cook_time: 30,
            servings: 4,
            estimated_cost: 5.0
          };
        }

        const newMeal = {
          id: crypto.randomUUID(),
          dayOfWeek: dayIndex,
          mealType,
          recipeId,
          recipeName: recipe.name || recipe.title || 'Recette sans nom',
          servings: recipe.servings || 4,
          estimatedCost: recipe.estimated_cost || 5.0,
          prepTime: recipe.prep_time || 15,
          cookTime: recipe.cook_time || 30,
          estimatedTime: (recipe.prep_time || 15) + (recipe.cook_time || 30),
          nutritionalInfo: {
            calories: recipe.calories || 500,
            protein: recipe.protein || 20,
            carbs: recipe.carbs || 60,
            fat: recipe.fat || 15,
            fiber: recipe.fiber || 5
          },
          requiredIngredients: [],
          missingIngredients: [],
          confidence: 1.0
        };

        if (mealIndex >= 0) {
          // Remplacer le repas existant
          updatedPlan.meals[mealIndex] = newMeal;
        } else {
          // Ajouter un nouveau repas
          updatedPlan.meals.push(newMeal);
        }
      } else if (mealIndex >= 0) {
        // Supprimer le repas si recipeId est null
        updatedPlan.meals.splice(mealIndex, 1);
      }

      // Recalculer le coût total
      updatedPlan.totalEstimatedCost = updatedPlan.meals.reduce(
        (sum, meal) => sum + (meal.estimatedCost || 0), 
        0
      );

      // Mettre à jour l'état avec une nouvelle référence d'objet pour forcer le re-render
      setState(prev => ({ 
        ...prev, 
        currentPlan: {
          ...updatedPlan,
          updatedAt: new Date() // Force update timestamp pour déclencher le re-render
        }
      }));

      // Sauvegarder le plan si il a un ID
      if (updatedPlan.id) {
        await saveMealPlan(updatedPlan);
      }

      toast.success('Repas mis à jour');
    } catch (error) {
      console.error('Failed to update meal:', error);
      toast.error('Erreur lors de la mise à jour du repas');
    }
  }, [state.currentPlan, supabase, generateWeeklyPlan, saveMealPlan]);

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
    updateMealInPlan,
    
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