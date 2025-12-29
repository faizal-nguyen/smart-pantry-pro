import { supabase } from '@/integrations/supabase/client';
import { weatherContextService } from './WeatherContextService';
import { calendarContextService } from './CalendarContextService';
import { seasonalityEngine } from './SeasonalityEngine';
import { promotionsContextService } from './PromotionsContextService';
import { cipherMemory } from '@/services/cipher/CipherMemoryService';
import {
  UserContextPreferences,
  WeatherContext,
  CalendarContext,
  SeasonalContext,
  PromotionsContext,
  AdaptationLog,
  AdaptationResult,
  PlanImpact,
  AdaptedMealPlan,
  CipherContextualRecommendation
} from './types';

// Types internes
interface MealPlan {
  id: string;
  userId: string;
  weekStart: Date;
  meals: MealEntry[];
  totalCost?: number;
  totalPrepTime?: number;
  familySize: number;
}

interface MealEntry {
  id: string;
  day: number;
  recipe: Recipe;
  servings: number;
  adaptationReason?: string;
  prepTip?: string;
  shoppingTip?: string;
}

interface Recipe {
  id: string;
  name: string;
  tags?: string[];
  prepTime: number;
  cookTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  ingredients: any[];
  cost?: number;
  seasonalScore?: number;
}

/**
 * Moteur d'adaptation contextuel principal
 * Coordonne tous les services pour adapter les plans de repas
 */
export class ContextAdapter {
  private weatherService = weatherContextService;
  private calendarService = calendarContextService;
  private seasonalityEngine = seasonalityEngine;
  private promotionsService = promotionsContextService;
  
  /**
   * Adapte un plan de repas selon tous les contextes
   */
  async adaptMealPlan(
    basePlan: MealPlan,
    userId: string,
    preferences: UserContextPreferences
  ): Promise<AdaptedMealPlan> {
    const startTime = performance.now();
    
    try {
      // 1. Récupérer toutes les données contextuelles en parallèle
      const contextData = await this.gatherContextData(
        userId, 
        basePlan, 
        preferences
      );
      
      // 2. Obtenir les recommandations Cipher si disponibles
      const cipherRecommendations = await this.getCipherRecommendations(
        userId,
        contextData,
        preferences
      );
      
      // 3. Appliquer les adaptations par ordre de priorité
      let adaptedPlan = { ...basePlan };
      const adaptationLog: AdaptationLog[] = [];
      
      // Ordre d'adaptation:
      // 1. Calendrier (contraintes absolues)
      // 2. Météo (confort et praticité)
      // 3. Saisonnalité (qualité et prix)
      // 4. Promotions (opportunités économiques)
      // 5. Recommandations Cipher (personnalisation)
      
      if (contextData.calendar && preferences.calendar_sync) {
        const calendarAdaptation = await this.adaptToSchedule(
          adaptedPlan, 
          contextData.calendar,
          preferences
        );
        adaptedPlan = calendarAdaptation.plan;
        adaptationLog.push(...calendarAdaptation.changes);
      }
      
      if (contextData.weather && preferences.weather_adaptation) {
        const weatherAdaptation = await this.adaptToWeather(
          adaptedPlan, 
          contextData.weather,
          preferences
        );
        adaptedPlan = weatherAdaptation.plan;
        adaptationLog.push(...weatherAdaptation.changes);
      }
      
      if (contextData.seasonal && preferences.seasonal_preferences) {
        const seasonalAdaptation = await this.adaptToSeasons(
          adaptedPlan, 
          contextData.seasonal,
          preferences
        );
        adaptedPlan = seasonalAdaptation.plan;
        adaptationLog.push(...seasonalAdaptation.changes);
      }
      
      if (contextData.promotions && preferences.price_optimization) {
        const promotionAdaptation = await this.adaptToPromotions(
          adaptedPlan, 
          contextData.promotions,
          preferences
        );
        adaptedPlan = promotionAdaptation.plan;
        adaptationLog.push(...promotionAdaptation.changes);
      }
      
      // Appliquer les recommandations Cipher
      if (cipherRecommendations.length > 0) {
        const cipherAdaptation = await this.applyCipherRecommendations(
          adaptedPlan,
          cipherRecommendations,
          preferences
        );
        adaptedPlan = cipherAdaptation.plan;
        adaptationLog.push(...cipherAdaptation.changes);
      }
      
      // 4. Calculer la confiance et l'impact
      const confidence = this.calculateConfidence(adaptationLog);
      const impact = this.calculateImpact(basePlan, adaptedPlan);
      
      // 5. Enregistrer les adaptations
      const adaptationTime = performance.now() - startTime;
      await this.logAdaptations(userId, basePlan.id, adaptationLog, adaptationTime);
      
      // 6. Enregistrer dans Cipher pour apprentissage
      await this.recordInCipher(userId, basePlan, adaptedPlan, adaptationLog);
      
      return {
        originalPlan: basePlan,
        adaptedPlan,
        adaptations: adaptationLog,
        confidence,
        impact,
        executionTime: adaptationTime,
        context: contextData,
        cipherRecommendations
      };
    } catch (error) {
      console.error('Failed to adapt meal plan:', error);
      
      // Retourner le plan original en cas d'erreur
      return {
        originalPlan: basePlan,
        adaptedPlan: basePlan,
        adaptations: [],
        confidence: 0,
        impact: this.getZeroImpact(),
        executionTime: performance.now() - startTime,
        context: {
          weather: null,
          calendar: null,
          seasonal: null,
          promotions: null
        }
      };
    }
  }

  /**
   * Rassemble toutes les données contextuelles
   */
  private async gatherContextData(
    userId: string,
    plan: MealPlan,
    preferences: UserContextPreferences
  ) {
    const promises = [];
    
    // Météo
    const weatherPromise = preferences.weather_adaptation 
      ? this.weatherService.getWeatherContext(preferences.home_location)
      : Promise.resolve(null);
    promises.push(weatherPromise);
    
    // Calendrier
    const calendarPromise = preferences.calendar_sync
      ? this.calendarService.getCalendarContext(
          userId, 
          plan.weekStart,
          preferences.family_context_enabled
        )
      : Promise.resolve(null);
    promises.push(calendarPromise);
    
    // Saisonnalité
    const seasonalPromise = preferences.seasonal_preferences
      ? this.seasonalityEngine.getSeasonalContext(
          new Date(),
          plan.familySize
        )
      : Promise.resolve(null);
    promises.push(seasonalPromise);
    
    // Promotions
    const promotionsPromise = preferences.price_optimization
      ? this.promotionsService.getPromotionsContext(
          preferences.home_location,
          preferences,
          plan.familySize
        )
      : Promise.resolve(null);
    promises.push(promotionsPromise);
    
    const [weather, calendar, seasonal, promotions] = await Promise.all(promises);
    
    return {
      weather: weather as WeatherContext | null,
      calendar: calendar as CalendarContext | null,
      seasonal: seasonal as SeasonalContext | null,
      promotions: promotions as PromotionsContext | null
    };
  }

  /**
   * Adaptation selon la météo
   */
  private async adaptToWeather(
    plan: MealPlan, 
    weather: WeatherContext,
    preferences: UserContextPreferences
  ): Promise<AdaptationResult> {
    const changes: AdaptationLog[] = [];
    const adaptedMeals = [...plan.meals];
    
    // Analyser chaque jour
    for (let dayIndex = 0; dayIndex < adaptedMeals.length && dayIndex < 7; dayIndex++) {
      const meal = adaptedMeals[dayIndex];
      const dayWeatherIndex = dayIndex * 8; // 8 intervalles par jour
      
      if (dayWeatherIndex >= weather.forecast.length) continue;
      
      const dayWeather = weather.forecast[dayWeatherIndex];
      const recommendation = weather.analysis.recommendations.find(r => r.day === dayIndex);
      
      // Adapter selon la température
      let shouldAdapt = false;
      let adaptationType = '';
      
      if (dayWeather.temp > 30 && preferences.weather_sensitivity !== 'low') {
        // Très chaud -> plats froids
        if (meal.recipe.tags?.includes('hot_dish') || meal.recipe.cookTime > 30) {
          shouldAdapt = true;
          adaptationType = 'hot_weather';
        }
      } else if (dayWeather.temp < 5 && preferences.weather_sensitivity !== 'low') {
        // Très froid -> plats chauds
        if (meal.recipe.tags?.includes('cold_dish') || meal.recipe.tags?.includes('salad')) {
          shouldAdapt = true;
          adaptationType = 'cold_weather';
        }
      } else if (dayWeather.rain > 5 && preferences.weather_sensitivity === 'high') {
        // Pluie -> comfort food
        if (!meal.recipe.tags?.includes('comfort_food')) {
          shouldAdapt = Math.random() < 0.5; // 50% de chance
          adaptationType = 'rainy_day';
        }
      }
      
      if (shouldAdapt && recommendation) {
        const alternative = await this.findAlternativeRecipe(
          meal.recipe,
          adaptationType,
          plan.familySize
        );
        
        if (alternative) {
          adaptedMeals[dayIndex] = {
            ...meal,
            recipe: alternative,
            adaptationReason: recommendation.reason
          };
          
          changes.push({
            type: 'weather',
            day: dayIndex,
            original: meal.recipe.id,
            adapted: alternative.id,
            reason: recommendation.reason,
            confidence: this.getWeatherConfidence(dayWeather, preferences)
          });
        }
      }
    }
    
    return {
      plan: { ...plan, meals: adaptedMeals },
      changes
    };
  }

  /**
   * Adaptation selon le planning
   */
  private async adaptToSchedule(
    plan: MealPlan,
    calendar: CalendarContext,
    preferences: UserContextPreferences
  ): Promise<AdaptationResult> {
    const changes: AdaptationLog[] = [];
    const adaptedMeals = [...plan.meals];
    
    calendar.weekSchedule.forEach((daySchedule, dayIndex) => {
      if (dayIndex >= adaptedMeals.length) return;
      
      const meal = adaptedMeals[dayIndex];
      const needsAdaptation = this.assessScheduleAdaptation(
        daySchedule,
        meal.recipe,
        preferences
      );
      
      if (needsAdaptation) {
        const complexityNeeded = daySchedule.suggestedMealComplexity;
        const timeAvailable = daySchedule.mealTimeAvailable.dinner.timeWindow;
        
        this.findScheduleAppropriateRecipe(
          meal.recipe,
          complexityNeeded,
          timeAvailable,
          plan.familySize
        ).then(alternative => {
          if (alternative) {
            adaptedMeals[dayIndex] = {
              ...meal,
              recipe: alternative,
              adaptationReason: `Journée ${daySchedule.busyScore >= 7 ? 'très ' : ''}chargée`,
              prepTip: daySchedule.mealTimeAvailable.dinner.suggestion === 'prepare_ahead' 
                ? 'Préparer la veille si possible' 
                : undefined
            };
            
            const mainReason = daySchedule.events.find(e => e.type === 'dinner_event')
              ? `Événement: ${daySchedule.events.find(e => e.type === 'dinner_event')!.title}`
              : `Journée chargée (score ${daySchedule.busyScore}/10)`;
            
            changes.push({
              type: 'schedule',
              day: dayIndex,
              original: meal.recipe.id,
              adapted: alternative.id,
              reason: mainReason,
              confidence: 0.9
            });
          }
        });
      }
      
      // Gérer les occasions spéciales
      const specialEvent = daySchedule.events.find(e => 
        ['birthday', 'dinner_event'].includes(e.type)
      );
      
      if (specialEvent) {
        this.handleSpecialOccasion(
          specialEvent,
          dayIndex,
          adaptedMeals,
          changes,
          plan.familySize
        );
      }
    });
    
    // Gérer les conflits famille si applicable
    if (calendar.familySchedule) {
      this.handleFamilyScheduleConflicts(
        calendar.familySchedule,
        adaptedMeals,
        changes
      );
    }
    
    return {
      plan: { ...plan, meals: adaptedMeals },
      changes
    };
  }

  /**
   * Adaptation selon la saisonnalité
   */
  private async adaptToSeasons(
    plan: MealPlan,
    seasonal: SeasonalContext,
    preferences: UserContextPreferences
  ): Promise<AdaptationResult> {
    const changes: AdaptationLog[] = [];
    const adaptedMeals = [...plan.meals];
    
    // Calculer le score saisonnier de chaque repas
    for (let i = 0; i < adaptedMeals.length; i++) {
      const meal = adaptedMeals[i];
      const currentScore = meal.recipe.seasonalScore || 
        this.calculateRecipeSeasonalScore(meal.recipe, seasonal.inSeasonProducts);
      
      // Si le score est faible et la sensibilité saisonnière est haute
      if (currentScore < 50 && preferences.seasonal_commitment !== 'low') {
        const seasonalAlternative = await this.findSeasonalAlternative(
          meal.recipe,
          seasonal,
          plan.familySize
        );
        
        if (seasonalAlternative && 
            seasonalAlternative.seasonalScore! > currentScore + 20) {
          adaptedMeals[i] = {
            ...meal,
            recipe: seasonalAlternative,
            adaptationReason: 'Produits de saison',
            shoppingTip: `Cherchez: ${seasonal.inSeasonProducts
              .slice(0, 3)
              .map(p => p.name)
              .join(', ')}`
          };
          
          changes.push({
            type: 'seasonal',
            day: i,
            original: meal.recipe.id,
            adapted: seasonalAlternative.id,
            reason: `Amélioration saisonnière (+${Math.round(seasonalAlternative.seasonalScore! - currentScore)} points)`,
            confidence: 0.75
          });
        }
      }
    }
    
    return {
      plan: { ...plan, meals: adaptedMeals },
      changes
    };
  }

  /**
   * Adaptation selon les promotions
   */
  private async adaptToPromotions(
    plan: MealPlan,
    promotions: PromotionsContext,
    preferences: UserContextPreferences
  ): Promise<AdaptationResult> {
    const changes: AdaptationLog[] = [];
    const adaptedMeals = [...plan.meals];
    
    // Limiter les adaptations promotions selon les préférences
    const maxPromotionAdaptations = preferences.max_adaptations_per_week 
      ? Math.floor(preferences.max_adaptations_per_week! * 0.4) // 40% max pour promotions
      : 3;
    
    let promotionAdaptations = 0;
    
    // Chercher les meilleures opportunités
    for (const recommendation of promotions.recommendations) {
      if (promotionAdaptations >= maxPromotionAdaptations) break;
      
      if (recommendation.type === 'combo' && recommendation.recipeName) {
        // Trouver le meilleur jour pour cette recette
        const bestDayIndex = this.findBestDayForRecipe(
          recommendation.recipeName,
          adaptedMeals,
          preferences
        );
        
        if (bestDayIndex !== -1) {
          const promoRecipe = await this.createRecipeFromPromotion(
            recommendation,
            plan.familySize
          );
          
          if (promoRecipe) {
            adaptedMeals[bestDayIndex] = {
              ...adaptedMeals[bestDayIndex],
              recipe: promoRecipe,
              adaptationReason: `Économie de ${recommendation.totalSavings}€`,
              shoppingTip: `Acheter chez ${recommendation.products[0].storeName}`
            };
            
            changes.push({
              type: 'promotion',
              day: bestDayIndex,
              original: adaptedMeals[bestDayIndex].recipe.id,
              adapted: promoRecipe.id,
              reason: `Promotion: ${recommendation.title} (-${recommendation.totalSavings}€)`,
              confidence: 0.8,
              savings: recommendation.totalSavings
            });
            
            promotionAdaptations++;
          }
        }
      }
    }
    
    return {
      plan: { ...plan, meals: adaptedMeals },
      changes
    };
  }

  /**
   * Applique les recommandations Cipher
   */
  private async applyCipherRecommendations(
    plan: MealPlan,
    recommendations: CipherContextualRecommendation[],
    preferences: UserContextPreferences
  ): Promise<AdaptationResult> {
    const changes: AdaptationLog[] = [];
    const adaptedMeals = [...plan.meals];
    
    // Trier par confiance et appliquer les meilleures
    const topRecommendations = recommendations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, preferences.max_adaptations_per_week || 5);
    
    for (const rec of topRecommendations) {
      // Implémenter selon le type de recommandation
      // TODO: Logique spécifique pour chaque type
      console.log('Applying Cipher recommendation:', rec);
    }
    
    return {
      plan: { ...plan, meals: adaptedMeals },
      changes
    };
  }

  /**
   * Obtient les recommandations Cipher
   */
  private async getCipherRecommendations(
    userId: string,
    contextData: any,
    preferences: UserContextPreferences
  ): Promise<CipherContextualRecommendation[]> {
    try {
      const cipherContext = {
        userId,
        sessionId: `context_${Date.now()}`,
        contextData
      };
      
      const recommendations = await cipherMemory.getContextualRecommendations(
        cipherContext,
        'meal_planning'
      );
      
      return recommendations.map(rec => ({
        contextType: this.mapCipherContextType(rec.recommendation),
        recommendation: rec.recommendation,
        confidence: rec.confidence,
        reasoning: rec.reasoning,
        adaptationType: 'cipher_suggestion'
      }));
    } catch (error) {
      console.error('Failed to get Cipher recommendations:', error);
      return [];
    }
  }

  // === MÉTHODES UTILITAIRES ===

  private async findAlternativeRecipe(
    original: Recipe,
    adaptationType: string,
    familySize: number
  ): Promise<Recipe | null> {
    // Simuler la recherche d'alternative
    // En production, chercher dans la base de recettes
    const mockAlternative: Recipe = {
      ...original,
      id: `${original.id}_adapted`,
      name: `${original.name} (adapté)`,
      tags: this.getAdaptedTags(original.tags || [], adaptationType)
    };
    
    return mockAlternative;
  }

  private getAdaptedTags(originalTags: string[], adaptationType: string): string[] {
    const tags = [...originalTags];
    
    switch (adaptationType) {
      case 'hot_weather':
        return tags.filter(t => t !== 'hot_dish').concat(['cold_dish', 'summer']);
      case 'cold_weather':
        return tags.filter(t => t !== 'cold_dish').concat(['hot_dish', 'comfort_food']);
      case 'rainy_day':
        return tags.concat(['comfort_food']);
      default:
        return tags;
    }
  }

  private getWeatherConfidence(
    weather: any,
    preferences: UserContextPreferences
  ): number {
    const baseConfidence = 0.7;
    const sensitivityBoost = {
      low: 0,
      medium: 0.1,
      high: 0.2
    };
    
    return Math.min(
      0.95,
      baseConfidence + sensitivityBoost[preferences.weather_sensitivity]
    );
  }

  private assessScheduleAdaptation(
    daySchedule: any,
    recipe: Recipe,
    preferences: UserContextPreferences
  ): boolean {
    // Journée très chargée
    if (daySchedule.busyScore >= 8) return true;
    
    // Pas assez de temps pour cuisiner
    const totalCookTime = recipe.prepTime + recipe.cookTime;
    if (totalCookTime > daySchedule.mealTimeAvailable.dinner.timeWindow) return true;
    
    // Flexibilité de l'utilisateur
    if (preferences.schedule_flexibility === 'rigid' && daySchedule.busyScore >= 6) return true;
    
    return false;
  }

  private async findScheduleAppropriateRecipe(
    original: Recipe,
    complexity: string,
    timeAvailable: number,
    familySize: number
  ): Promise<Recipe | null> {
    // Mock - en production, chercher dans la base
    return {
      ...original,
      id: `${original.id}_quick`,
      name: `${original.name} Express`,
      prepTime: Math.min(original.prepTime, 15),
      cookTime: Math.min(original.cookTime, timeAvailable - 15),
      difficulty: 'easy'
    };
  }

  private async handleSpecialOccasion(
    event: any,
    dayIndex: number,
    meals: MealEntry[],
    changes: AdaptationLog[],
    familySize: number
  ) {
    // Logique pour occasions spéciales
    console.log('Handling special occasion:', event);
  }

  private handleFamilyScheduleConflicts(
    familySchedule: any,
    meals: MealEntry[],
    changes: AdaptationLog[]
  ) {
    // Gérer les conflits d'horaires famille
    console.log('Handling family schedule conflicts');
  }

  private calculateRecipeSeasonalScore(
    recipe: Recipe,
    seasonalProducts: any[]
  ): number {
    // Calculer le score saisonnier d'une recette
    let score = 50; // Score de base
    
    // Logique simplifiée
    const seasonalIngredients = recipe.ingredients.filter(ing => 
      seasonalProducts.some(sp => 
        ing.name?.toLowerCase().includes(sp.name.toLowerCase())
      )
    );
    
    score += seasonalIngredients.length * 10;
    
    return Math.min(100, score);
  }

  private async findSeasonalAlternative(
    original: Recipe,
    seasonal: SeasonalContext,
    familySize: number
  ): Promise<Recipe | null> {
    // Mock - chercher une alternative saisonnière
    return {
      ...original,
      id: `${original.id}_seasonal`,
      name: `${original.name} de saison`,
      seasonalScore: 85
    };
  }

  private findBestDayForRecipe(
    recipeName: string,
    meals: MealEntry[],
    preferences: UserContextPreferences
  ): number {
    // Trouver le meilleur jour pour une recette
    // Éviter de remplacer des recettes déjà adaptées
    for (let i = 0; i < meals.length; i++) {
      if (!meals[i].adaptationReason) {
        return i;
      }
    }
    return -1;
  }

  private async createRecipeFromPromotion(
    recommendation: PromotionRecommendation,
    familySize: number
  ): Promise<Recipe | null> {
    // Créer une recette basée sur une promotion
    return {
      id: `promo_${recommendation.recipeName?.toLowerCase().replace(/ /g, '_')}`,
      name: recommendation.recipeName || 'Recette promo',
      tags: ['promotion', 'économique'],
      prepTime: 20,
      cookTime: 30,
      difficulty: 'medium',
      ingredients: recommendation.products.map(p => ({
        name: p.promotion.product,
        amount: 1,
        unit: 'unité'
      })),
      cost: recommendation.totalSavings
    };
  }

  private mapCipherContextType(recommendation: string): 'weather' | 'schedule' | 'seasonal' | 'promotion' {
    // Mapper les recommandations Cipher vers les types de contexte
    if (recommendation.includes('météo') || recommendation.includes('weather')) return 'weather';
    if (recommendation.includes('planning') || recommendation.includes('schedule')) return 'schedule';
    if (recommendation.includes('saison') || recommendation.includes('seasonal')) return 'seasonal';
    return 'promotion';
  }

  private calculateConfidence(adaptations: AdaptationLog[]): number {
    if (adaptations.length === 0) return 1.0;
    
    const avgConfidence = adaptations.reduce((sum, a) => sum + a.confidence, 0) / adaptations.length;
    return Math.round(avgConfidence * 100) / 100;
  }

  private calculateImpact(original: MealPlan, adapted: MealPlan): PlanImpact {
    const changes = adapted.meals.filter((meal, i) => 
      meal.recipe.id !== original.meals[i]?.recipe.id
    ).length;
    
    const changePercent = (changes / original.meals.length) * 100;
    
    // Calculer les différences de coût, temps, nutrition
    const costDiff = this.calculateCostDifference(original, adapted);
    const timeDiff = this.calculateTimeDifference(original, adapted);
    const nutritionDiff = 0; // TODO: Implémenter
    
    const overallScore = this.calculateOverallImpactScore(costDiff, timeDiff, nutritionDiff);
    
    return {
      changesCount: changes,
      changePercent: Math.round(changePercent),
      costImpact: costDiff,
      timeImpact: timeDiff,
      nutritionImpact: nutritionDiff,
      overallScore
    };
  }

  private calculateCostDifference(original: MealPlan, adapted: MealPlan): number {
    const originalCost = original.meals.reduce((sum, meal) => 
      sum + (meal.recipe.cost || 10), 0
    );
    const adaptedCost = adapted.meals.reduce((sum, meal) => 
      sum + (meal.recipe.cost || 10), 0
    );
    
    return adaptedCost - originalCost;
  }

  private calculateTimeDifference(original: MealPlan, adapted: MealPlan): number {
    const originalTime = original.meals.reduce((sum, meal) => 
      sum + meal.recipe.prepTime + meal.recipe.cookTime, 0
    );
    const adaptedTime = adapted.meals.reduce((sum, meal) => 
      sum + meal.recipe.prepTime + meal.recipe.cookTime, 0
    );
    
    return adaptedTime - originalTime;
  }

  private calculateOverallImpactScore(cost: number, time: number, nutrition: number): number {
    // Score composite basé sur les changements
    let score = 50; // Base neutre
    
    // Bonus si économies
    if (cost < 0) score += Math.min(20, Math.abs(cost));
    else score -= Math.min(10, cost);
    
    // Bonus si gain de temps
    if (time < 0) score += Math.min(20, Math.abs(time) / 10);
    else score -= Math.min(10, time / 10);
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private getZeroImpact(): PlanImpact {
    return {
      changesCount: 0,
      changePercent: 0,
      costImpact: 0,
      timeImpact: 0,
      nutritionImpact: 0,
      overallScore: 50
    };
  }

  private async logAdaptations(
    userId: string,
    planId: string,
    adaptations: AdaptationLog[],
    executionTime: number
  ) {
    try {
      // Enregistrer chaque adaptation
      for (const adaptation of adaptations) {
        await supabase.from('context_adaptations_log').insert({
          user_id: userId,
          meal_plan_id: planId,
          adaptation_type: adaptation.type,
          original_suggestion: { recipeId: adaptation.original },
          adapted_suggestion: { recipeId: adaptation.adapted },
          reason: adaptation.reason,
          impact_score: adaptation.confidence,
          confidence_score: adaptation.confidence
        });
      }
      
      console.log(`Logged ${adaptations.length} adaptations in ${executionTime}ms`);
    } catch (error) {
      console.error('Failed to log adaptations:', error);
    }
  }

  private async recordInCipher(
    userId: string,
    original: MealPlan,
    adapted: MealPlan,
    adaptations: AdaptationLog[]
  ) {
    try {
      await cipherMemory.recordExperience(
        {
          userId,
          sessionId: `adapt_${Date.now()}`,
          contextData: { adaptations }
        },
        {
          type: 'context_adaptation',
          data: {
            originalPlanId: original.id,
            adaptedPlanId: adapted.id,
            adaptationCount: adaptations.length,
            adaptationTypes: [...new Set(adaptations.map(a => a.type))]
          },
          outcome: 'success'
        }
      );
    } catch (error) {
      console.error('Failed to record in Cipher:', error);
    }
  }
}

// Export de l'instance
export const contextAdapter = new ContextAdapter();