/**
 * Smart Recommender
 * Moteur de recommandations intelligent pour la planification de repas
 */

import { 
  MealRecommendations,
  RecommendedMeal,
  LearnedPreferences,
  ContextFactors,
  RecommendationExplanation,
  CurrentContext
} from '../types';
import { 
  PlanningContext,
  RecipeCandidate,
  Recipe
} from '../../types';
import { PreferenceLearner } from '../ml/PreferenceLearner';
import { supabase } from '@/integrations/supabase/client';

export class SmartRecommender {
  private preferenceLearner: PreferenceLearner;
  private collaborativeCache: Map<string, any> = new Map();
  
  constructor() {
    this.preferenceLearner = new PreferenceLearner();
  }
  
  /**
   * Génère des recommandations personnalisées
   */
  async generateRecommendations(
    context: PlanningContext,
    preferences: LearnedPreferences
  ): Promise<MealRecommendations> {
    console.log('🎯 Generating smart recommendations', { context, preferences });
    
    // 1. Analyse du contexte actuel
    const contextFactors = await this.analyzeContext(context);
    
    // 2. Filtrage collaboratif
    const collaborativeMatches = await this.findCollaborativeMatches(
      preferences,
      context.request.userId
    );
    
    // 3. Recommandations basées sur le contenu
    const contentBasedMatches = await this.findContentMatches(
      preferences,
      context.availableRecipes
    );
    
    // 4. Hybridation et scoring
    const hybridRecommendations = this.hybridizeRecommendations(
      collaborativeMatches,
      contentBasedMatches,
      contextFactors
    );
    
    // 5. Personnalisation finale et segmentation
    const personalizedRecs = this.personalizeRecommendations(
      hybridRecommendations,
      preferences,
      context
    );
    
    // 6. Catégoriser les recommandations
    return this.categorizeRecommendations(personalizedRecs, preferences, contextFactors);
  }
  
  /**
   * Analyse le contexte actuel pour la recommandation
   */
  private async analyzeContext(context: PlanningContext): Promise<ContextFactors> {
    const now = new Date();
    
    // Récupérer les repas récents
    const recentMeals = await this.getRecentMeals(context.request.userId);
    
    return {
      season: this.getCurrentSeason(),
      weather: await this.getWeatherContext(),
      timeOfDay: now.getHours(),
      dayOfWeek: now.getDay(),
      inventory: context.inventoryAnalysis,
      recentMeals,
      upcomingEvents: await this.getUpcomingEvents(context.request.userId)
    };
  }
  
  /**
   * Filtrage collaboratif - trouve des recettes aimées par des utilisateurs similaires
   */
  private async findCollaborativeMatches(
    preferences: LearnedPreferences,
    userId: string
  ): Promise<RecommendedMeal[]> {
    // Vérifier le cache
    const cacheKey = `collab_${userId}`;
    if (this.collaborativeCache.has(cacheKey)) {
      const cached = this.collaborativeCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 3600000) { // 1 heure
        return cached.data;
      }
    }
    
    try {
      // Trouver les utilisateurs similaires basé sur les préférences
      const similarUsers = await this.findSimilarUsers(userId, preferences);
      
      if (similarUsers.length === 0) {
        return [];
      }
      
      // Récupérer les recettes populaires parmi les utilisateurs similaires
      const { data: popularRecipes, error } = await supabase
        .from('user_recipes')
        .select(`
          recipe_id,
          recipes_catalog (
            id,
            title,
            prep_time,
            cook_time,
            nutrition_json,
            tags
          )
        `)
        .in('user_id', similarUsers.map(u => u.userId))
        .eq('personal_rating', 5)
        .limit(20);
      
      if (error) {
        console.error('Error fetching collaborative recipes:', error);
        return [];
      }
      
      // Transformer en recommandations
      const recommendations = (popularRecipes || [])
        .filter(item => item.recipe_id && item.recipes_catalog)
        .map(item => ({
          recipeId: item.recipe_id,
          recipeName: item.recipes_catalog.title,
          score: 0.8, // Score de base pour filtrage collaboratif
          matchReasons: ['Populaire parmi des utilisateurs similaires'],
          nutritionalMatch: 0.7,
          preferenceMatch: 0.8,
          contextMatch: 0.6,
          estimatedCost: this.estimateRecipeCost(item.recipes_catalog),
          prepTime: item.recipes_catalog.prep_time
        }));
      
      // Mettre en cache
      this.collaborativeCache.set(cacheKey, {
        data: recommendations,
        timestamp: Date.now()
      });
      
      return recommendations;
      
    } catch (error) {
      console.error('Collaborative filtering error:', error);
      return [];
    }
  }
  
  /**
   * Recommandations basées sur le contenu
   */
  private async findContentMatches(
    preferences: LearnedPreferences,
    availableRecipes: RecipeCandidate[]
  ): Promise<RecommendedMeal[]> {
    return availableRecipes
      .map(candidate => {
        // Calculer les scores de correspondance
        const preferenceScore = this.calculatePreferenceScore(candidate, preferences);
        const nutritionalScore = this.calculateNutritionalScore(candidate, preferences);
        const contextScore = candidate.seasonalScore * 0.5 + candidate.inventoryMatch * 0.5;
        
        // Score composite
        const totalScore = (preferenceScore * 0.4 + nutritionalScore * 0.3 + contextScore * 0.3);
        
        const matchReasons = this.generateMatchReasons(candidate, preferences);
        
        return {
          recipeId: candidate.recipe.id,
          recipeName: candidate.recipe.title,
          score: totalScore,
          matchReasons,
          nutritionalMatch: nutritionalScore,
          preferenceMatch: preferenceScore,
          contextMatch: contextScore,
          estimatedCost: this.estimateRecipeCost(candidate.recipe),
          prepTime: candidate.recipe.prep_time
        };
      })
      .filter(rec => rec.score > 0.5) // Seuil de pertinence
      .sort((a, b) => b.score - a.score)
      .slice(0, 50); // Top 50
  }
  
  /**
   * Hybridation des recommandations
   */
  private hybridizeRecommendations(
    collaborative: RecommendedMeal[],
    contentBased: RecommendedMeal[],
    contextFactors: ContextFactors
  ): RecommendedMeal[] {
    const hybridMap = new Map<string, RecommendedMeal>();
    
    // Poids pour l'hybridation
    const weights = {
      collaborative: 0.4,
      content: 0.6,
      context: 0.3
    };
    
    // Ajouter les recommandations basées sur le contenu
    contentBased.forEach(rec => {
      hybridMap.set(rec.recipeId, {
        ...rec,
        score: rec.score * weights.content
      });
    });
    
    // Fusionner avec les recommandations collaboratives
    collaborative.forEach(rec => {
      if (hybridMap.has(rec.recipeId)) {
        const existing = hybridMap.get(rec.recipeId)!;
        hybridMap.set(rec.recipeId, {
          ...existing,
          score: existing.score + (rec.score * weights.collaborative),
          matchReasons: [...existing.matchReasons, ...rec.matchReasons]
        });
      } else {
        hybridMap.set(rec.recipeId, {
          ...rec,
          score: rec.score * weights.collaborative
        });
      }
    });
    
    // Appliquer les facteurs contextuels
    hybridMap.forEach((rec, id) => {
      const contextBoost = this.calculateContextBoost(rec, contextFactors);
      rec.score = rec.score * (1 + contextBoost * weights.context);
    });
    
    // Retourner sous forme de tableau trié
    return Array.from(hybridMap.values())
      .sort((a, b) => b.score - a.score);
  }
  
  /**
   * Personnalisation finale des recommandations
   */
  private personalizeRecommendations(
    recommendations: RecommendedMeal[],
    preferences: LearnedPreferences,
    context: PlanningContext
  ): RecommendedMeal[] {
    return recommendations.map(rec => {
      // Ajustements basés sur l'historique récent
      const recentPenalty = this.calculateRecentPenalty(rec, context);
      
      // Boost pour la nouveauté si l'utilisateur est aventureux
      const noveltyBoost = preferences.confidenceScore > 0.7 ? 
        this.calculateNoveltyBoost(rec, preferences) : 0;
      
      // Ajustement selon les contraintes de temps
      const timeAdjustment = this.calculateTimeAdjustment(rec, context);
      
      // Score final ajusté
      const adjustedScore = rec.score * (1 - recentPenalty) * 
                           (1 + noveltyBoost) * (1 + timeAdjustment);
      
      return {
        ...rec,
        score: adjustedScore
      };
    });
  }
  
  /**
   * Catégorise les recommandations
   */
  private categorizeRecommendations(
    recommendations: RecommendedMeal[],
    preferences: LearnedPreferences,
    contextFactors: ContextFactors
  ): MealRecommendations {
    const sorted = recommendations.sort((a, b) => b.score - a.score);
    
    // Principales recommandations (top 10)
    const primaryRecommendations = sorted.slice(0, 10);
    
    // Options rapides (< 30 min)
    const quickOptions = sorted
      .filter(rec => rec.prepTime <= 30)
      .slice(0, 5);
    
    // Options santé (basé sur le score nutritionnel)
    const healthyOptions = sorted
      .filter(rec => rec.nutritionalMatch > 0.8)
      .slice(0, 5);
    
    // Options budget (estimation < 5€ par portion)
    const budgetOptions = sorted
      .filter(rec => rec.estimatedCost < 5)
      .slice(0, 5);
    
    // Options alternatives (scores moyens mais variés)
    const alternativeOptions = sorted
      .slice(10, 20)
      .filter(rec => rec.score > 0.6);
    
    // Générer les explications pour les top recommandations
    const explanations = primaryRecommendations
      .slice(0, 5)
      .map(rec => this.generateExplanation(rec, preferences, contextFactors));
    
    return {
      primaryRecommendations,
      alternativeOptions,
      quickOptions,
      healthyOptions,
      budgetOptions,
      explanations
    };
  }
  
  /**
   * Calcul des scores détaillés
   */
  
  private calculatePreferenceScore(
    candidate: RecipeCandidate,
    preferences: LearnedPreferences
  ): number {
    let score = 0;
    let factors = 0;
    
    // Score de cuisine
    const cuisine = this.extractCuisine(candidate.recipe);
    if (preferences.cuisineAffinities[cuisine]) {
      score += preferences.cuisineAffinities[cuisine];
      factors++;
    }
    
    // Score d'ingrédients
    const ingredients = candidate.recipe.ingredients_json || [];
    let ingredientScore = 0;
    let ingredientCount = 0;
    
    ingredients.forEach((ing: any) => {
      const ingName = ing.name?.toLowerCase();
      if (preferences.ingredientPreferences.loved.includes(ingName)) {
        ingredientScore += 1;
      } else if (preferences.ingredientPreferences.liked.includes(ingName)) {
        ingredientScore += 0.7;
      } else if (preferences.ingredientPreferences.disliked.includes(ingName)) {
        ingredientScore -= 0.5;
      } else {
        ingredientScore += 0.3; // Neutre
      }
      ingredientCount++;
    });
    
    if (ingredientCount > 0) {
      score += ingredientScore / ingredientCount;
      factors++;
    }
    
    // Score de complexité
    const complexity = candidate.recipe.difficulty || 3;
    const complexityMatch = preferences.cookingHabits.complexityPreference;
    const complexityScore = 1 - Math.abs(
      (complexityMatch === 'simple' ? 1 : complexityMatch === 'medium' ? 3 : 5) - complexity
    ) / 4;
    score += complexityScore;
    factors++;
    
    return factors > 0 ? score / factors : 0.5;
  }
  
  private calculateNutritionalScore(
    candidate: RecipeCandidate,
    preferences: LearnedPreferences
  ): number {
    const nutrition = candidate.recipe.nutrition_json;
    if (!nutrition) return 0.5;
    
    const targetCalories = preferences.nutritionalTendencies.averageCaloriesPerMeal;
    const calorieDeviation = Math.abs(nutrition.calories - targetCalories) / targetCalories;
    const calorieScore = Math.max(0, 1 - calorieDeviation);
    
    // Score d'équilibre des macros
    const macroTarget = preferences.nutritionalTendencies.macroDistribution;
    const totalMacros = nutrition.protein + nutrition.carbs + nutrition.fat;
    
    if (totalMacros === 0) return calorieScore;
    
    const proteinRatio = nutrition.protein / totalMacros;
    const carbsRatio = nutrition.carbs / totalMacros;
    const fatRatio = nutrition.fat / totalMacros;
    
    const macroScore = 
      (1 - Math.abs(proteinRatio - macroTarget.protein)) * 0.33 +
      (1 - Math.abs(carbsRatio - macroTarget.carbs)) * 0.33 +
      (1 - Math.abs(fatRatio - macroTarget.fat)) * 0.34;
    
    return (calorieScore + macroScore) / 2;
  }
  
  private calculateContextBoost(rec: RecommendedMeal, context: ContextFactors): number {
    let boost = 0;
    
    // Boost saisonnier
    if (this.isSeasonalRecipe(rec.recipeId, context.season)) {
      boost += 0.2;
    }
    
    // Boost météo (repas chauds par temps froid, etc.)
    if (context.weather) {
      if (context.weather.temperature < 10 && this.isWarmingRecipe(rec.recipeId)) {
        boost += 0.15;
      } else if (context.weather.temperature > 25 && this.isRefreshingRecipe(rec.recipeId)) {
        boost += 0.15;
      }
    }
    
    // Boost selon l'heure (repas plus légers le midi)
    if (context.timeOfDay >= 11 && context.timeOfDay <= 14) {
      if (rec.prepTime <= 30) boost += 0.1;
    }
    
    return boost;
  }
  
  /**
   * Méthodes utilitaires
   */
  
  private async findSimilarUsers(
    userId: string, 
    preferences: LearnedPreferences
  ): Promise<{ userId: string; similarity: number }[]> {
    // Pour l'instant, retourner un ensemble mock
    // TODO: Implémenter la vraie recherche de similarité
    return [];
  }
  
  private async getRecentMeals(userId: string): Promise<string[]> {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('meal_plan_entries')
        .select('recipe_id')
        .eq('user_id', userId)
        .gte('created_at', oneWeekAgo.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(entry => entry.recipe_id).filter(Boolean);
    } catch (error) {
      console.error('Error fetching recent meals:', error);
      return [];
    }
  }
  
  private async getWeatherContext(): Promise<any> {
    // Mock pour l'instant
    return {
      temperature: 15,
      condition: 'sunny',
      humidity: 60
    };
  }
  
  private async getUpcomingEvents(userId: string): Promise<string[]> {
    // Mock pour l'instant
    return [];
  }
  
  private getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }
  
  private estimateRecipeCost(recipe: any): number {
    // Estimation simple basée sur le nombre d'ingrédients
    const ingredientCount = recipe.ingredients_json?.length || 0;
    const baseCost = 2; // 2€ de base
    const perIngredientCost = 0.5;
    
    return baseCost + (ingredientCount * perIngredientCost);
  }
  
  private generateMatchReasons(
    candidate: RecipeCandidate,
    preferences: LearnedPreferences
  ): string[] {
    const reasons: string[] = [];
    
    // Raisons basées sur les préférences
    const cuisine = this.extractCuisine(candidate.recipe);
    if (preferences.cuisineAffinities[cuisine] > 0.7) {
      reasons.push(`Cuisine ${cuisine} que vous appréciez`);
    }
    
    // Raisons nutritionnelles
    if (candidate.nutritionalFit > 0.8) {
      reasons.push('Correspond à vos objectifs nutritionnels');
    }
    
    // Raisons pratiques
    if (candidate.recipe.prep_time <= 20) {
      reasons.push('Rapide à préparer');
    }
    
    // Raisons saisonnières
    if (candidate.seasonalScore > 0.8) {
      reasons.push('Ingrédients de saison');
    }
    
    // Raisons d'inventaire
    if (candidate.inventoryMatch > 0.7) {
      reasons.push('Utilise vos ingrédients disponibles');
    }
    
    return reasons;
  }
  
  private generateExplanation(
    rec: RecommendedMeal,
    preferences: LearnedPreferences,
    context: ContextFactors
  ): RecommendationExplanation {
    const factors = [
      {
        factor: 'Préférences gustatives',
        weight: 0.4,
        contribution: rec.preferenceMatch * 0.4
      },
      {
        factor: 'Équilibre nutritionnel',
        weight: 0.3,
        contribution: rec.nutritionalMatch * 0.3
      },
      {
        factor: 'Contexte (saison, inventaire)',
        weight: 0.3,
        contribution: rec.contextMatch * 0.3
      }
    ];
    
    const explanation = `Cette recette correspond bien à vos goûts pour la cuisine ${
      this.extractCuisine({ title: rec.recipeName } as any)
    } et s'aligne avec vos objectifs nutritionnels. ${
      rec.prepTime <= 30 ? 'De plus, elle est rapide à préparer.' : ''
    }`;
    
    return {
      recipeId: rec.recipeId,
      explanation,
      confidence: rec.score,
      factors
    };
  }
  
  private extractCuisine(recipe: { title: string; tags?: string[] }): string {
    // Extraction simple basée sur le titre ou les tags
    const title = recipe.title.toLowerCase();
    
    if (title.includes('pasta') || title.includes('pizza')) return 'italienne';
    if (title.includes('curry') || title.includes('dal')) return 'indienne';
    if (title.includes('tajine') || title.includes('couscous')) return 'marocaine';
    if (title.includes('wok') || title.includes('sushi')) return 'asiatique';
    
    return 'française';
  }
  
  private calculateRecentPenalty(rec: RecommendedMeal, context: PlanningContext): number {
    // Pénaliser les recettes récemment utilisées
    // TODO: Implémenter avec l'historique réel
    return 0;
  }
  
  private calculateNoveltyBoost(rec: RecommendedMeal, preferences: LearnedPreferences): number {
    // Boost pour les nouvelles recettes si l'utilisateur est aventureux
    // TODO: Implémenter avec l'historique
    return 0;
  }
  
  private calculateTimeAdjustment(rec: RecommendedMeal, context: PlanningContext): number {
    // Ajuster selon les contraintes de temps
    const busyDays = context.request.preferences.timeConstraints.busyDays;
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    if (busyDays.includes(today) && rec.prepTime > 30) {
      return -0.2; // Pénalité pour les repas longs les jours chargés
    }
    
    return 0;
  }
  
  private isSeasonalRecipe(recipeId: string, season: string): boolean {
    // Mock - vérifier si la recette est de saison
    return Math.random() > 0.5;
  }
  
  private isWarmingRecipe(recipeId: string): boolean {
    // Mock - vérifier si c'est un plat réconfortant
    return Math.random() > 0.5;
  }
  
  private isRefreshingRecipe(recipeId: string): boolean {
    // Mock - vérifier si c'est un plat rafraîchissant
    return Math.random() > 0.5;
  }
}

// Export singleton instance
export const smartRecommender = new SmartRecommender();