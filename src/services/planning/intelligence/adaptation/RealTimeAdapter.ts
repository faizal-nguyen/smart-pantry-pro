/**
 * Real-Time Adapter
 * Système d'adaptation en temps réel pour la planification de repas
 */

import {
  AdaptationEvent,
  AdaptationEventType,
  AdaptationStrategy,
  CurrentContext
} from '../types';
import {
  WeeklyMealPlan,
  MealPlanEntry,
  PlanningContext,
  Recipe,
  RecipeCandidate
} from '../../types';
import { SmartRecommender } from '../recommendation/SmartRecommender';
import { supabase } from '@/integrations/supabase/client';

interface AdaptedMealPlan extends WeeklyMealPlan {
  adaptations?: AdaptationRecord[];
  warnings?: AdaptationWarning[];
}

interface AdaptationRecord {
  timestamp: Date;
  eventType: AdaptationEventType;
  originalMeal: MealPlanEntry;
  adaptedMeal: MealPlanEntry;
  reason: string;
  confidence: number;
}

interface AdaptationWarning {
  type: string;
  message: string;
  meals: string[];
  severity: 'low' | 'medium' | 'high';
}

interface AdaptationResult {
  success: boolean;
  plan: AdaptedMealPlan;
  confidence?: number;
}

export class RealTimeAdapter {
  private recommender: SmartRecommender;
  private adaptationStrategies: Map<AdaptationEventType, AdaptationStrategy>;
  
  constructor() {
    this.recommender = new SmartRecommender();
    this.adaptationStrategies = this.initializeStrategies();
  }
  
  /**
   * Adapte un plan en fonction d'un événement
   */
  async adaptPlan(
    currentPlan: WeeklyMealPlan,
    event: AdaptationEvent,
    context: PlanningContext
  ): Promise<AdaptedMealPlan> {
    console.log('🔄 Adapting meal plan', { event, planId: currentPlan.id });
    
    // 1. Sélectionner la stratégie appropriée
    const strategy = this.selectStrategy(event);
    
    if (!strategy) {
      console.warn('No strategy found for event type:', event.type);
      return this.createWarningPlan(currentPlan, event);
    }
    
    // 2. Exécuter la stratégie d'adaptation
    try {
      const adapted = await strategy.execute(currentPlan, event);
      
      // 3. Valider l'adaptation
      const validation = await this.validateAdaptation(adapted, currentPlan, context);
      
      if (!validation.isValid) {
        return this.fallbackAdaptation(currentPlan, event, validation.reasons);
      }
      
      // 4. Enregistrer l'adaptation
      await this.recordAdaptation(currentPlan, adapted, event);
      
      return adapted;
      
    } catch (error) {
      console.error('Adaptation failed:', error);
      return this.createWarningPlan(currentPlan, event);
    }
  }
  
  /**
   * Initialise les stratégies d'adaptation
   */
  private initializeStrategies(): Map<AdaptationEventType, AdaptationStrategy> {
    const strategies = new Map<AdaptationEventType, AdaptationStrategy>();
    
    // Stratégie pour indisponibilité d'ingrédients
    strategies.set(AdaptationEventType.INGREDIENT_UNAVAILABLE, {
      name: 'Ingredient Substitution',
      applicableEvents: [AdaptationEventType.INGREDIENT_UNAVAILABLE],
      priority: 1,
      execute: async (plan, event) => this.handleIngredientUnavailability(plan, event)
    });
    
    // Stratégie pour changement d'horaire
    strategies.set(AdaptationEventType.SCHEDULE_CHANGE, {
      name: 'Schedule Adjustment',
      applicableEvents: [AdaptationEventType.SCHEDULE_CHANGE],
      priority: 2,
      execute: async (plan, event) => this.handleScheduleChange(plan, event)
    });
    
    // Stratégie pour mise à jour du budget
    strategies.set(AdaptationEventType.BUDGET_UPDATE, {
      name: 'Budget Optimization',
      applicableEvents: [AdaptationEventType.BUDGET_UPDATE],
      priority: 3,
      execute: async (plan, event) => this.handleBudgetUpdate(plan, event)
    });
    
    // Stratégie pour restriction alimentaire
    strategies.set(AdaptationEventType.DIETARY_RESTRICTION_ADDED, {
      name: 'Dietary Restriction Handler',
      applicableEvents: [AdaptationEventType.DIETARY_RESTRICTION_ADDED],
      priority: 1,
      execute: async (plan, event) => this.handleNewRestriction(plan, event)
    });
    
    // Stratégie pour ajout d'invité
    strategies.set(AdaptationEventType.GUEST_ADDED, {
      name: 'Guest Accommodation',
      applicableEvents: [AdaptationEventType.GUEST_ADDED],
      priority: 2,
      execute: async (plan, event) => this.handleGuestAddition(plan, event)
    });
    
    // Stratégie pour changement météo
    strategies.set(AdaptationEventType.WEATHER_CHANGE, {
      name: 'Weather Adaptation',
      applicableEvents: [AdaptationEventType.WEATHER_CHANGE],
      priority: 4,
      execute: async (plan, event) => this.handleWeatherChange(plan, event)
    });
    
    return strategies;
  }
  
  /**
   * Gère l'indisponibilité d'ingrédients
   */
  private async handleIngredientUnavailability(
    plan: WeeklyMealPlan,
    event: AdaptationEvent
  ): Promise<AdaptedMealPlan> {
    const unavailableIngredient = event.data.ingredient;
    const affectedMeals = this.findAffectedMeals(plan, unavailableIngredient);
    
    if (affectedMeals.length === 0) {
      return plan; // Aucun repas affecté
    }
    
    const adaptedPlan = { ...plan, adaptations: [], warnings: [] };
    
    for (const meal of affectedMeals) {
      // Essayer différentes stratégies dans l'ordre
      const strategies = [
        () => this.substituteIngredient(meal, unavailableIngredient),
        () => this.findSimilarRecipe(meal, unavailableIngredient),
        () => this.modifyRecipe(meal, unavailableIngredient),
        () => this.swapWithOtherMeal(plan, meal)
      ];
      
      let adapted = false;
      
      for (const strategy of strategies) {
        const result = await strategy();
        
        if (result.success) {
          // Mettre à jour le repas dans le plan
          const mealIndex = plan.meals.findIndex(m => m.id === meal.id);
          if (mealIndex !== -1) {
            adaptedPlan.meals[mealIndex] = result.adaptedMeal;
            
            // Enregistrer l'adaptation
            adaptedPlan.adaptations!.push({
              timestamp: new Date(),
              eventType: event.type,
              originalMeal: meal,
              adaptedMeal: result.adaptedMeal,
              reason: result.reason,
              confidence: result.confidence
            });
          }
          
          adapted = true;
          break;
        }
      }
      
      if (!adapted) {
        // Ajouter un avertissement si aucune adaptation n'a fonctionné
        adaptedPlan.warnings!.push({
          type: 'ingredient_unavailable',
          message: `Impossible d'adapter le repas "${meal.recipeName}" sans ${unavailableIngredient}`,
          meals: [meal.id],
          severity: 'high'
        });
      }
    }
    
    return adaptedPlan;
  }
  
  /**
   * Substitue un ingrédient dans un repas
   */
  private async substituteIngredient(
    meal: MealPlanEntry,
    ingredientToReplace: string
  ): Promise<{ success: boolean; adaptedMeal: MealPlanEntry; reason: string; confidence: number }> {
    try {
      // Récupérer les substitutions possibles
      const substitutions = await this.getIngredientSubstitutions(ingredientToReplace);
      
      if (substitutions.length === 0) {
        return { success: false, adaptedMeal: meal, reason: 'No substitutions available', confidence: 0 };
      }
      
      // Choisir la meilleure substitution
      const bestSubstitute = substitutions[0];
      
      // Adapter le repas avec la substitution
      const adaptedMeal: MealPlanEntry = {
        ...meal,
        adaptations: [
          ...(meal.adaptations || []),
          {
            type: 'ingredient_substitution',
            original: ingredientToReplace,
            substitute: bestSubstitute.name,
            confidence: bestSubstitute.confidence
          }
        ]
      };
      
      return {
        success: true,
        adaptedMeal,
        reason: `Remplacé ${ingredientToReplace} par ${bestSubstitute.name}`,
        confidence: bestSubstitute.confidence
      };
      
    } catch (error) {
      console.error('Substitution failed:', error);
      return { success: false, adaptedMeal: meal, reason: 'Substitution error', confidence: 0 };
    }
  }
  
  /**
   * Gère un changement d'horaire
   */
  private async handleScheduleChange(
    plan: WeeklyMealPlan,
    event: AdaptationEvent
  ): Promise<AdaptedMealPlan> {
    const { dayOfWeek, newTimeAvailable, mealType } = event.data;
    
    // Trouver les repas affectés
    const affectedMeals = plan.meals.filter(meal => 
      meal.dayOfWeek === dayOfWeek && 
      (!mealType || meal.mealType === mealType)
    );
    
    const adaptedPlan = { ...plan, adaptations: [], warnings: [] };
    
    for (const meal of affectedMeals) {
      // Si moins de temps disponible, chercher une recette plus rapide
      if (newTimeAvailable < meal.prepTime + meal.cookTime) {
        const quickAlternative = await this.findQuickAlternative(
          meal,
          newTimeAvailable,
          plan.context.availableRecipes
        );
        
        if (quickAlternative) {
          // Remplacer le repas
          const mealIndex = plan.meals.findIndex(m => m.id === meal.id);
          if (mealIndex !== -1) {
            adaptedPlan.meals[mealIndex] = quickAlternative;
            
            adaptedPlan.adaptations!.push({
              timestamp: new Date(),
              eventType: event.type,
              originalMeal: meal,
              adaptedMeal: quickAlternative,
              reason: `Temps réduit à ${newTimeAvailable} minutes`,
              confidence: 0.9
            });
          }
        } else {
          // Avertissement si pas d'alternative trouvée
          adaptedPlan.warnings!.push({
            type: 'schedule_conflict',
            message: `Pas de recette trouvée pour ${newTimeAvailable} minutes`,
            meals: [meal.id],
            severity: 'medium'
          });
        }
      }
    }
    
    return adaptedPlan;
  }
  
  /**
   * Gère une mise à jour du budget
   */
  private async handleBudgetUpdate(
    plan: WeeklyMealPlan,
    event: AdaptationEvent
  ): Promise<AdaptedMealPlan> {
    const newBudget = event.data.newBudget;
    const currentCost = this.calculatePlanCost(plan);
    
    if (currentCost <= newBudget) {
      return plan; // Pas besoin d'adaptation
    }
    
    const adaptedPlan = { ...plan, adaptations: [], warnings: [] };
    const reductionNeeded = currentCost - newBudget;
    const reductionPerMeal = reductionNeeded / plan.meals.length;
    
    // Trier les repas par coût décroissant
    const mealsByCost = [...plan.meals].sort((a, b) => 
      (b.estimatedCost || 0) - (a.estimatedCost || 0)
    );
    
    let totalSaved = 0;
    
    for (const meal of mealsByCost) {
      if (totalSaved >= reductionNeeded) break;
      
      // Chercher une alternative moins chère
      const budgetAlternative = await this.findBudgetAlternative(
        meal,
        (meal.estimatedCost || 0) - reductionPerMeal,
        plan.context.availableRecipes
      );
      
      if (budgetAlternative) {
        const savings = (meal.estimatedCost || 0) - (budgetAlternative.estimatedCost || 0);
        totalSaved += savings;
        
        // Remplacer le repas
        const mealIndex = plan.meals.findIndex(m => m.id === meal.id);
        if (mealIndex !== -1) {
          adaptedPlan.meals[mealIndex] = budgetAlternative;
          
          adaptedPlan.adaptations!.push({
            timestamp: new Date(),
            eventType: event.type,
            originalMeal: meal,
            adaptedMeal: budgetAlternative,
            reason: `Économie de ${savings.toFixed(2)}€`,
            confidence: 0.85
          });
        }
      }
    }
    
    if (totalSaved < reductionNeeded) {
      adaptedPlan.warnings!.push({
        type: 'budget_exceeded',
        message: `Budget dépassé de ${(reductionNeeded - totalSaved).toFixed(2)}€`,
        meals: [],
        severity: 'medium'
      });
    }
    
    return adaptedPlan;
  }
  
  /**
   * Gère l'ajout d'une nouvelle restriction alimentaire
   */
  private async handleNewRestriction(
    plan: WeeklyMealPlan,
    event: AdaptationEvent
  ): Promise<AdaptedMealPlan> {
    const restriction = event.data.restriction;
    const adaptedPlan = { ...plan, adaptations: [], warnings: [] };
    
    // Identifier les repas non conformes
    const nonCompliantMeals = await this.findNonCompliantMeals(plan, restriction);
    
    for (const meal of nonCompliantMeals) {
      // Chercher une alternative conforme
      const compliantAlternative = await this.findCompliantAlternative(
        meal,
        restriction,
        plan.context.availableRecipes
      );
      
      if (compliantAlternative) {
        const mealIndex = plan.meals.findIndex(m => m.id === meal.id);
        if (mealIndex !== -1) {
          adaptedPlan.meals[mealIndex] = compliantAlternative;
          
          adaptedPlan.adaptations!.push({
            timestamp: new Date(),
            eventType: event.type,
            originalMeal: meal,
            adaptedMeal: compliantAlternative,
            reason: `Adapté pour restriction: ${restriction}`,
            confidence: 0.95
          });
        }
      } else {
        adaptedPlan.warnings!.push({
          type: 'dietary_restriction',
          message: `Pas d'alternative trouvée pour "${meal.recipeName}" avec restriction ${restriction}`,
          meals: [meal.id],
          severity: 'high'
        });
      }
    }
    
    return adaptedPlan;
  }
  
  /**
   * Gère l'ajout d'invités
   */
  private async handleGuestAddition(
    plan: WeeklyMealPlan,
    event: AdaptationEvent
  ): Promise<AdaptedMealPlan> {
    const { guestCount, dayOfWeek, mealType, preferences } = event.data;
    const adaptedPlan = { ...plan, adaptations: [], warnings: [] };
    
    // Trouver les repas affectés
    const affectedMeals = plan.meals.filter(meal => 
      (!dayOfWeek || meal.dayOfWeek === dayOfWeek) &&
      (!mealType || meal.mealType === mealType)
    );
    
    for (const meal of affectedMeals) {
      // Ajuster les portions
      const newServings = (meal.servings || 4) + guestCount;
      
      // Vérifier si la recette peut être mise à l'échelle
      const canScale = await this.canScaleRecipe(meal.recipeId, newServings);
      
      if (canScale) {
        // Mettre à jour les portions et le coût
        const scaledMeal: MealPlanEntry = {
          ...meal,
          servings: newServings,
          estimatedCost: this.scaleRecipeCost(meal.estimatedCost || 0, meal.servings || 4, newServings),
          adaptations: [
            ...(meal.adaptations || []),
            {
              type: 'portion_adjustment',
              originalServings: meal.servings,
              newServings,
              guestCount
            }
          ]
        };
        
        const mealIndex = plan.meals.findIndex(m => m.id === meal.id);
        if (mealIndex !== -1) {
          adaptedPlan.meals[mealIndex] = scaledMeal;
          
          adaptedPlan.adaptations!.push({
            timestamp: new Date(),
            eventType: event.type,
            originalMeal: meal,
            adaptedMeal: scaledMeal,
            reason: `Portions ajustées pour ${guestCount} invité(s)`,
            confidence: 0.9
          });
        }
      } else {
        // Chercher une recette alternative qui convient mieux pour plus de personnes
        const crowdPleaser = await this.findCrowdPleaserAlternative(
          meal,
          newServings,
          preferences,
          plan.context.availableRecipes
        );
        
        if (crowdPleaser) {
          const mealIndex = plan.meals.findIndex(m => m.id === meal.id);
          if (mealIndex !== -1) {
            adaptedPlan.meals[mealIndex] = crowdPleaser;
            
            adaptedPlan.adaptations!.push({
              timestamp: new Date(),
              eventType: event.type,
              originalMeal: meal,
              adaptedMeal: crowdPleaser,
              reason: `Recette adaptée pour ${newServings} personnes`,
              confidence: 0.85
            });
          }
        }
      }
    }
    
    return adaptedPlan;
  }
  
  /**
   * Gère un changement de météo
   */
  private async handleWeatherChange(
    plan: WeeklyMealPlan,
    event: AdaptationEvent
  ): Promise<AdaptedMealPlan> {
    const { temperature, condition, forecastDays } = event.data;
    const adaptedPlan = { ...plan, adaptations: [], warnings: [] };
    
    // Déterminer le type de repas approprié selon la météo
    const mealPreference = this.getWeatherMealPreference(temperature, condition);
    
    // Adapter les repas des prochains jours
    const daysToAdapt = forecastDays || 3;
    const today = new Date();
    
    for (let i = 0; i < daysToAdapt; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);
      const dayOfWeek = targetDate.getDay();
      
      const mealsToAdapt = plan.meals.filter(meal => 
        meal.dayOfWeek === dayOfWeek
      );
      
      for (const meal of mealsToAdapt) {
        const weatherScore = await this.getWeatherSuitabilityScore(meal, temperature, condition);
        
        // Si le repas n'est pas adapté à la météo
        if (weatherScore < 0.5) {
          const weatherAppropriate = await this.findWeatherAppropriateAlternative(
            meal,
            mealPreference,
            plan.context.availableRecipes
          );
          
          if (weatherAppropriate) {
            const mealIndex = plan.meals.findIndex(m => m.id === meal.id);
            if (mealIndex !== -1) {
              adaptedPlan.meals[mealIndex] = weatherAppropriate;
              
              adaptedPlan.adaptations!.push({
                timestamp: new Date(),
                eventType: event.type,
                originalMeal: meal,
                adaptedMeal: weatherAppropriate,
                reason: `Adapté pour ${condition} (${temperature}°C)`,
                confidence: 0.75
              });
            }
          }
        }
      }
    }
    
    return adaptedPlan;
  }
  
  /**
   * Méthodes utilitaires
   */
  
  private findAffectedMeals(plan: WeeklyMealPlan, ingredient: string): MealPlanEntry[] {
    // Mock - en production, analyser les ingrédients de chaque recette
    return plan.meals.filter(meal => 
      Math.random() > 0.7 // Simulation - 30% des repas contiennent l'ingrédient
    );
  }
  
  private async getIngredientSubstitutions(ingredient: string): Promise<any[]> {
    // Mock - en production, utiliser une base de données de substitutions
    const substitutions: Record<string, any[]> = {
      'beurre': [
        { name: 'huile d\'olive', confidence: 0.9 },
        { name: 'huile de coco', confidence: 0.85 },
        { name: 'margarine', confidence: 0.8 }
      ],
      'lait': [
        { name: 'lait d\'amande', confidence: 0.9 },
        { name: 'lait de soja', confidence: 0.85 },
        { name: 'lait d\'avoine', confidence: 0.85 }
      ],
      'farine': [
        { name: 'farine d\'amande', confidence: 0.8 },
        { name: 'farine de riz', confidence: 0.85 },
        { name: 'farine de sarrasin', confidence: 0.75 }
      ]
    };
    
    return substitutions[ingredient.toLowerCase()] || [];
  }
  
  private async findQuickAlternative(
    meal: MealPlanEntry,
    maxTime: number,
    availableRecipes: RecipeCandidate[]
  ): Promise<MealPlanEntry | null> {
    const quickRecipes = availableRecipes.filter(candidate => 
      (candidate.recipe.prep_time + candidate.recipe.cook_time) <= maxTime
    );
    
    if (quickRecipes.length === 0) return null;
    
    // Prendre la recette la mieux notée
    const bestQuick = quickRecipes.sort((a, b) => b.score - a.score)[0];
    
    return {
      ...meal,
      recipeId: bestQuick.recipe.id,
      recipeName: bestQuick.recipe.title,
      prepTime: bestQuick.recipe.prep_time,
      cookTime: bestQuick.recipe.cook_time,
      estimatedCost: this.estimateRecipeCost(bestQuick.recipe)
    };
  }
  
  private calculatePlanCost(plan: WeeklyMealPlan): number {
    return plan.meals.reduce((total, meal) => 
      total + (meal.estimatedCost || 0), 0
    );
  }
  
  private estimateRecipeCost(recipe: Recipe): number {
    // Estimation simple basée sur le nombre d'ingrédients
    const ingredientCount = recipe.ingredients_json?.length || 0;
    return 2 + (ingredientCount * 0.5);
  }
  
  private async findBudgetAlternative(
    meal: MealPlanEntry,
    maxCost: number,
    availableRecipes: RecipeCandidate[]
  ): Promise<MealPlanEntry | null> {
    const budgetRecipes = availableRecipes.filter(candidate => {
      const cost = this.estimateRecipeCost(candidate.recipe);
      return cost <= maxCost;
    });
    
    if (budgetRecipes.length === 0) return null;
    
    // Prendre la recette avec le meilleur rapport qualité/prix
    const bestValue = budgetRecipes.sort((a, b) => {
      const costA = this.estimateRecipeCost(a.recipe);
      const costB = this.estimateRecipeCost(b.recipe);
      const valueA = a.score / costA;
      const valueB = b.score / costB;
      return valueB - valueA;
    })[0];
    
    return {
      ...meal,
      recipeId: bestValue.recipe.id,
      recipeName: bestValue.recipe.title,
      estimatedCost: this.estimateRecipeCost(bestValue.recipe)
    };
  }
  
  private async findNonCompliantMeals(
    plan: WeeklyMealPlan,
    restriction: string
  ): Promise<MealPlanEntry[]> {
    // Mock - en production, analyser chaque recette
    return plan.meals.filter(meal => Math.random() > 0.8);
  }
  
  private async findCompliantAlternative(
    meal: MealPlanEntry,
    restriction: string,
    availableRecipes: RecipeCandidate[]
  ): Promise<MealPlanEntry | null> {
    // Mock - filtrer les recettes selon la restriction
    const compliantRecipes = availableRecipes.filter(candidate => {
      // Simulation de vérification de conformité
      return Math.random() > 0.3;
    });
    
    if (compliantRecipes.length === 0) return null;
    
    const best = compliantRecipes.sort((a, b) => b.score - a.score)[0];
    
    return {
      ...meal,
      recipeId: best.recipe.id,
      recipeName: best.recipe.title,
      tags: [...(meal.tags || []), restriction]
    };
  }
  
  private async canScaleRecipe(recipeId: string, newServings: number): Promise<boolean> {
    // Mock - certaines recettes ne se mettent pas bien à l'échelle
    return newServings <= 12 && Math.random() > 0.2;
  }
  
  private scaleRecipeCost(originalCost: number, originalServings: number, newServings: number): number {
    return originalCost * (newServings / originalServings);
  }
  
  private async findCrowdPleaserAlternative(
    meal: MealPlanEntry,
    servings: number,
    preferences: any,
    availableRecipes: RecipeCandidate[]
  ): Promise<MealPlanEntry | null> {
    // Filtrer les recettes populaires et faciles à faire en grande quantité
    const crowdPleasers = availableRecipes.filter(candidate => 
      candidate.recipe.difficulty <= 3 && // Pas trop complexe
      candidate.score > 0.7 // Bien noté
    );
    
    if (crowdPleasers.length === 0) return null;
    
    const best = crowdPleasers[0];
    
    return {
      ...meal,
      recipeId: best.recipe.id,
      recipeName: best.recipe.title,
      servings,
      estimatedCost: this.scaleRecipeCost(
        this.estimateRecipeCost(best.recipe),
        4,
        servings
      )
    };
  }
  
  private getWeatherMealPreference(temperature: number, condition: string): string {
    if (temperature < 10 || condition === 'rainy' || condition === 'snowy') {
      return 'warm_comfort';
    } else if (temperature > 25 || condition === 'sunny') {
      return 'light_fresh';
    }
    return 'neutral';
  }
  
  private async getWeatherSuitabilityScore(
    meal: MealPlanEntry,
    temperature: number,
    condition: string
  ): Promise<number> {
    // Mock - évaluer si le repas convient à la météo
    const isWarm = Math.random() > 0.5;
    const isLight = Math.random() > 0.5;
    
    if (temperature < 10 && isWarm) return 0.9;
    if (temperature > 25 && isLight) return 0.9;
    if (temperature < 10 && isLight) return 0.2;
    if (temperature > 25 && isWarm) return 0.3;
    
    return 0.6;
  }
  
  private async findWeatherAppropriateAlternative(
    meal: MealPlanEntry,
    preference: string,
    availableRecipes: RecipeCandidate[]
  ): Promise<MealPlanEntry | null> {
    // Mock - filtrer selon la préférence météo
    const weatherAppropriate = availableRecipes.filter(candidate => {
      if (preference === 'warm_comfort') {
        return Math.random() > 0.5; // Simulation - 50% sont des plats réconfortants
      } else if (preference === 'light_fresh') {
        return Math.random() > 0.5; // Simulation - 50% sont des plats légers
      }
      return true;
    });
    
    if (weatherAppropriate.length === 0) return null;
    
    const best = weatherAppropriate[0];
    
    return {
      ...meal,
      recipeId: best.recipe.id,
      recipeName: best.recipe.title
    };
  }
  
  private selectStrategy(event: AdaptationEvent): AdaptationStrategy | null {
    return this.adaptationStrategies.get(event.type) || null;
  }
  
  private async validateAdaptation(
    adapted: AdaptedMealPlan,
    original: WeeklyMealPlan,
    context: PlanningContext
  ): Promise<{ isValid: boolean; reasons: string[] }> {
    const reasons: string[] = [];
    
    // Vérifier les contraintes de base
    if (adapted.meals.length !== original.meals.length) {
      reasons.push('Nombre de repas différent');
    }
    
    // Vérifier les contraintes nutritionnelles
    const nutritionValid = await this.validateNutrition(adapted, context);
    if (!nutritionValid) {
      reasons.push('Contraintes nutritionnelles non respectées');
    }
    
    // Vérifier le budget
    const budgetValid = this.validateBudget(adapted, context);
    if (!budgetValid) {
      reasons.push('Budget dépassé');
    }
    
    return {
      isValid: reasons.length === 0,
      reasons
    };
  }
  
  private async validateNutrition(plan: AdaptedMealPlan, context: PlanningContext): Promise<boolean> {
    // Mock - validation nutritionnelle
    return true;
  }
  
  private validateBudget(plan: AdaptedMealPlan, context: PlanningContext): boolean {
    const totalCost = this.calculatePlanCost(plan);
    return totalCost <= context.request.preferences.budgetConstraints.weeklyBudget;
  }
  
  private async fallbackAdaptation(
    plan: WeeklyMealPlan,
    event: AdaptationEvent,
    validationReasons: string[]
  ): Promise<AdaptedMealPlan> {
    return {
      ...plan,
      warnings: [{
        type: 'adaptation_failed',
        message: `Adaptation échouée: ${validationReasons.join(', ')}`,
        meals: [],
        severity: 'high'
      }]
    };
  }
  
  private createWarningPlan(plan: WeeklyMealPlan, event: AdaptationEvent): AdaptedMealPlan {
    return {
      ...plan,
      warnings: [{
        type: 'no_adaptation_strategy',
        message: `Aucune stratégie disponible pour l'événement ${event.type}`,
        meals: [],
        severity: 'medium'
      }]
    };
  }
  
  private async recordAdaptation(
    original: WeeklyMealPlan,
    adapted: AdaptedMealPlan,
    event: AdaptationEvent
  ): Promise<void> {
    try {
      // Enregistrer l'adaptation dans la base de données
      const { error } = await supabase
        .from('meal_planning_analytics')
        .insert({
          plan_id: original.id,
          event_type: 'adaptation',
          event_data: {
            adaptationEvent: event,
            originalPlan: original.id,
            adaptedPlan: adapted.id,
            adaptations: adapted.adaptations,
            warnings: adapted.warnings
          }
        });
      
      if (error) {
        console.error('Failed to record adaptation:', error);
      }
    } catch (error) {
      console.error('Error recording adaptation:', error);
    }
  }
}

// Export singleton instance
export const realTimeAdapter = new RealTimeAdapter();