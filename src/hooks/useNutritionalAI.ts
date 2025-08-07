/**
 * Nutritional AI Hook - Evolution V2
 * Manages nutritional analysis, health coaching, and personalized recommendations
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { useInventory } from './useInventory';
import { useRecipes } from './useRecipes';
import { 
  getNutritionalAIService, 
  NutritionalAIService,
  UserHealthProfile,
  NutritionalAnalysis,
  HealthRecommendation,
  MacronutrientTracking,
  NutritionalContext
} from '@/services/ai/nutritionalAIService';
import { toast } from 'sonner';

export interface NutritionalAIState {
  healthProfile: UserHealthProfile | null;
  currentAnalysis: NutritionalAnalysis | null;
  recommendations: HealthRecommendation[];
  macroTracking: MacronutrientTracking | null;
  isAnalyzing: boolean;
  isLoadingProfile: boolean;
  isStreaming: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function useNutritionalAI() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const { inventory } = useInventory();
  const { recipes } = useRecipes();
  
  const [state, setState] = useState<NutritionalAIState>({
    healthProfile: null,
    currentAnalysis: null,
    recommendations: [],
    macroTracking: null,
    isAnalyzing: false,
    isLoadingProfile: false,
    isStreaming: false,
    error: null,
    lastUpdated: null
  });

  const nutritionalService = useRef<NutritionalAIService | null>(null);

  // Initialize nutritional AI service
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (apiKey) {
      nutritionalService.current = getNutritionalAIService(apiKey);
    }
  }, []);

  // Load user health profile on mount
  useEffect(() => {
    if (user) {
      loadHealthProfile();
    }
  }, [user]);

  /**
   * Load user's health profile from database
   */
  const loadHealthProfile = useCallback(async () => {
    if (!user) return;

    setState(prev => ({ ...prev, isLoadingProfile: true, error: null }));

    try {
      const { data, error } = await supabase
        .from('user_health_profiles')
        .select(`
          *,
          health_goals(*),
          medical_conditions(*),
          dietary_preferences(*)
        `)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is OK
        throw error;
      }

      if (data) {
        const healthProfile: UserHealthProfile = {
          id: data.id,
          userId: data.user_id,
          age: data.age,
          gender: data.gender,
          weight: data.weight,
          height: data.height,
          activityLevel: data.activity_level,
          goals: data.health_goals || [],
          medicalConditions: data.medical_conditions || [],
          allergies: data.allergies || [],
          dietaryPreferences: data.dietary_preferences || [],
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at)
        };

        setState(prev => ({ 
          ...prev, 
          healthProfile,
          isLoadingProfile: false 
        }));

        // Trigger initial analysis if profile exists
        if (nutritionalService.current) {
          analyzeNutritionalProfile(healthProfile);
        }
      } else {
        setState(prev => ({ ...prev, isLoadingProfile: false }));
      }
    } catch (error: any) {
      console.error('Failed to load health profile:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message,
        isLoadingProfile: false 
      }));
    }
  }, [user, supabase]);

  /**
   * Create or update user health profile
   */
  const updateHealthProfile = useCallback(async (profileData: Partial<UserHealthProfile>) => {
    if (!user) {
      toast.error('Utilisateur non connecté');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_health_profiles')
        .upsert({
          user_id: user.id,
          age: profileData.age,
          gender: profileData.gender,
          weight: profileData.weight,
          height: profileData.height,
          activity_level: profileData.activityLevel,
          allergies: profileData.allergies,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) throw error;

      // Update goals and conditions separately
      if (profileData.goals) {
        await updateHealthGoals(profileData.goals);
      }
      
      if (profileData.medicalConditions) {
        await updateMedicalConditions(profileData.medicalConditions);
      }
      
      if (profileData.dietaryPreferences) {
        await updateDietaryPreferences(profileData.dietaryPreferences);
      }

      // Reload profile
      await loadHealthProfile();
      
      toast.success('Profil santé mis à jour');
    } catch (error: any) {
      console.error('Failed to update health profile:', error);
      toast.error('Erreur lors de la mise à jour du profil');
    }
  }, [user, supabase, loadHealthProfile]);

  /**
   * Analyze user's nutritional profile
   */
  const analyzeNutritionalProfile = useCallback(async (
    healthProfile?: UserHealthProfile,
    recentMeals: any[] = []
  ) => {
    if (!nutritionalService.current) {
      toast.error('Service nutritionnel non disponible');
      return;
    }

    const profile = healthProfile || state.healthProfile;
    if (!profile) {
      toast.error('Profil santé requis pour l\'analyse');
      return;
    }

    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));

    try {
      const analysis = await nutritionalService.current.analyzeNutritionalProfile(
        profile,
        recentMeals
      );

      setState(prev => ({ 
        ...prev, 
        currentAnalysis: analysis,
        lastUpdated: new Date(),
        isAnalyzing: false 
      }));

      // Generate recommendations based on analysis
      generateHealthRecommendations(profile, analysis);

    } catch (error: any) {
      console.error('Nutritional analysis failed:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message,
        isAnalyzing: false 
      }));
      toast.error('Erreur lors de l\'analyse nutritionnelle');
    }
  }, [state.healthProfile]);

  /**
   * Generate personalized health recommendations
   */
  const generateHealthRecommendations = useCallback(async (
    healthProfile: UserHealthProfile,
    analysis: NutritionalAnalysis
  ) => {
    if (!nutritionalService.current) return;

    try {
      const recommendations = await nutritionalService.current.generateHealthRecommendations(
        healthProfile,
        analysis,
        inventory || []
      );

      setState(prev => ({ ...prev, recommendations }));
    } catch (error: any) {
      console.error('Failed to generate recommendations:', error);
    }
  }, [inventory]);

  /**
   * Track macronutrients for today
   */
  const trackTodaysMacros = useCallback(async (meals: any[] = []) => {
    if (!nutritionalService.current || !state.healthProfile) return;

    try {
      const tracking = await nutritionalService.current.trackMacronutrients(
        state.healthProfile,
        meals,
        new Date()
      );

      setState(prev => ({ ...prev, macroTracking: tracking }));
    } catch (error: any) {
      console.error('Macro tracking failed:', error);
    }
  }, [state.healthProfile]);

  /**
   * Stream nutritional coaching response
   */
  const streamNutritionalCoaching = useCallback(async (
    query: string,
    onChunk: (chunk: any) => void,
    onError?: (error: Error) => void
  ) => {
    if (!nutritionalService.current || !state.healthProfile) {
      toast.error('Service ou profil non disponible');
      return;
    }

    setState(prev => ({ ...prev, isStreaming: true }));

    const context: NutritionalContext = {
      inventory: inventory || [],
      recipes: recipes || [],
      healthProfile: state.healthProfile,
      nutritionalGoals: state.currentAnalysis,
      language: 'fr-FR'
    };

    try {
      await nutritionalService.current.streamNutritionalCoaching(
        query,
        context,
        (chunk) => {
          onChunk(chunk);
        },
        (error) => {
          setState(prev => ({ ...prev, isStreaming: false }));
          onError?.(error);
        }
      );
    } catch (error: any) {
      setState(prev => ({ ...prev, isStreaming: false }));
      console.error('Nutritional coaching failed:', error);
    } finally {
      setState(prev => ({ ...prev, isStreaming: false }));
    }
  }, [state.healthProfile, inventory, recipes, state.currentAnalysis]);

  /**
   * Get nutrition recommendations for specific recipe
   */
  const getRecipeNutritionAdvice = useCallback(async (recipeId: string) => {
    if (!nutritionalService.current || !state.healthProfile) return;

    // Get recipe details
    const recipe = recipes?.find(r => r.id === recipeId);
    if (!recipe) return;

    const query = `Analyser cette recette du point de vue nutritionnel: ${recipe.name}. 
    Ingrédients: ${recipe.ingredients?.map((i: any) => i.name).join(', ')}.
    Comment s'adapte-t-elle à mes objectifs santé ?`;

    return new Promise<string>((resolve) => {
      let fullResponse = '';
      
      streamNutritionalCoaching(
        query,
        (chunk) => {
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            fullResponse += content;
          }
        },
        (error) => {
          console.error('Recipe nutrition advice failed:', error);
          resolve('Impossible d\'analyser cette recette pour le moment.');
        }
      ).then(() => {
        resolve(fullResponse);
      });
    });
  }, [state.healthProfile, recipes, streamNutritionalCoaching]);

  /**
   * Helper functions for profile management
   */
  const updateHealthGoals = async (goals: any[]) => {
    if (!user) return;
    
    // Delete existing goals
    await supabase
      .from('health_goals')
      .delete()
      .eq('user_id', user.id);
    
    // Insert new goals
    if (goals.length > 0) {
      await supabase
        .from('health_goals')
        .insert(goals.map(goal => ({
          user_id: user.id,
          type: goal.type,
          target_value: goal.targetValue,
          timeframe: goal.timeframe,
          priority: goal.priority
        })));
    }
  };

  const updateMedicalConditions = async (conditions: any[]) => {
    if (!user) return;
    
    await supabase
      .from('medical_conditions')
      .delete()
      .eq('user_id', user.id);
    
    if (conditions.length > 0) {
      await supabase
        .from('medical_conditions')
        .insert(conditions.map(condition => ({
          user_id: user.id,
          condition: condition.condition,
          severity: condition.severity,
          restrictions: condition.restrictions,
          notes: condition.notes
        })));
    }
  };

  const updateDietaryPreferences = async (preferences: any[]) => {
    if (!user) return;
    
    await supabase
      .from('dietary_preferences')
      .delete()
      .eq('user_id', user.id);
    
    if (preferences.length > 0) {
      await supabase
        .from('dietary_preferences')
        .insert(preferences.map(pref => ({
          user_id: user.id,
          type: pref.type,
          strictness: pref.strictness
        })));
    }
  };

  return {
    // State
    ...state,
    
    // Actions
    loadHealthProfile,
    updateHealthProfile,
    analyzeNutritionalProfile,
    generateHealthRecommendations,
    trackTodaysMacros,
    streamNutritionalCoaching,
    getRecipeNutritionAdvice,
    
    // Computed
    hasHealthProfile: !!state.healthProfile,
    isHealthy: state.currentAnalysis ? state.currentAnalysis.nutritionalScore >= 70 : null,
    needsAttention: state.currentAnalysis ? state.currentAnalysis.healthAlerts.length > 0 : false,
    calorieProgress: state.macroTracking ? 
      (state.macroTracking.consumedCalories / state.macroTracking.targetCalories) * 100 : 0
  };
}