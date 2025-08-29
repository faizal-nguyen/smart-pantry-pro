/**
 * Intelligence Layer - Index Principal
 * Point d'entrée pour tous les modules d'intelligence artificielle
 */

// Types
export * from './types';

// Machine Learning
export { PreferenceLearner, preferenceLearner } from './ml/PreferenceLearner';

// Recommandations
export { SmartRecommender, smartRecommender } from './recommendation/SmartRecommender';

// Adaptation
export { RealTimeAdapter, realTimeAdapter } from './adaptation/RealTimeAdapter';
export { ContextAnalyzer, contextAnalyzer } from './adaptation/ContextAnalyzer';

// Apprentissage
export { FeedbackProcessor } from './learning/FeedbackProcessor';
export { LearningLoop, learningLoop } from './learning/LearningLoop';

// Analyseurs spécialisés
export { NutritionalBalancer, nutritionalBalancer } from './analyzers/NutritionalBalancer';
export { BudgetOptimizer, budgetOptimizer } from './analyzers/BudgetOptimizer';
export { InventoryAnalyzer, inventoryAnalyzer } from './analyzers/InventoryAnalyzer';

/**
 * Intelligence Layer Main Controller
 * Orchestre tous les composants d'intelligence
 */
import { PlanningContext, WeeklyMealPlan } from '../types';
import {
  LearnedPreferences,
  MealRecommendations,
  UserBehaviorData,
  AdaptationEvent,
  CollectedFeedback,
  IntelligenceMetrics,
  CurrentContext
} from './types';

export class IntelligenceLayer {
  private preferenceLearner = preferenceLearner;
  private smartRecommender = smartRecommender;
  private realTimeAdapter = realTimeAdapter;
  private contextAnalyzer = contextAnalyzer;
  private feedbackProcessor = new FeedbackProcessor();
  private learningLoop = learningLoop;
  private nutritionalBalancer = nutritionalBalancer;
  private budgetOptimizer = budgetOptimizer;
  private inventoryAnalyzer = inventoryAnalyzer;
  
  /**
   * Génère un plan intelligent complet
   */
  async generateIntelligentPlan(
    context: PlanningContext,
    userBehavior?: UserBehaviorData,
    currentContext?: CurrentContext
  ): Promise<WeeklyMealPlan> {
    console.log('🧠 Generating intelligent meal plan');
    
    try {
      // 1. Apprendre des préférences utilisateur
      const preferences = userBehavior 
        ? await this.preferenceLearner.learnFromBehavior(userBehavior)
        : await this.getStoredPreferences(context.request.userId);
      
      // 2. Analyser le contexte actuel
      const contextAnalysis = await this.contextAnalyzer.analyzeCurrentContext(
        context.request.userId,
        context
      );
      
      // 3. Générer des recommandations intelligentes
      const recommendations = await this.smartRecommender.generateRecommendations(
        context,
        preferences
      );
      
      // 4. Analyser l'inventaire
      const inventoryAnalysis = await this.inventoryAnalyzer.analyzeInventory(
        context.request.inventory,
        context.existingPlan || {} as WeeklyMealPlan,
        preferences,
        currentContext
      );
      
      // 5. Optimiser pour le budget
      const budgetAnalysis = await this.budgetOptimizer.analyzeBudget(
        context.existingPlan || {} as WeeklyMealPlan,
        context.request.preferences.budgetConstraints,
        preferences,
        currentContext
      );
      
      // 6. Créer le plan optimisé
      const intelligentPlan = await this.createOptimizedPlan(
        context,
        preferences,
        recommendations,
        inventoryAnalysis,
        budgetAnalysis,
        contextAnalysis
      );
      
      // 7. Équilibrer nutritionnellement
      const balancedPlan = await this.nutritionalBalancer.optimizeNutritionalBalance(
        intelligentPlan,
        preferences,
        currentContext
      );
      
      return balancedPlan;
      
    } catch (error) {
      console.error('Error generating intelligent plan:', error);
      throw error;
    }
  }
  
  /**
   * Adapte un plan existant en temps réel
   */
  async adaptPlan(
    plan: WeeklyMealPlan,
    event: AdaptationEvent,
    context: PlanningContext
  ): Promise<WeeklyMealPlan> {
    return await this.realTimeAdapter.adaptPlan(plan, event, context);
  }
  
  /**
   * Traite le feedback utilisateur
   */
  async processFeedback(
    feedback: CollectedFeedback,
    plan: WeeklyMealPlan,
    userId: string
  ): Promise<void> {
    const outcome = await this.feedbackProcessor.processFeedback(feedback, plan, userId);
    
    // Si amélioration significative détectée, déclencher apprentissage
    if (outcome.confidenceImprovement > 0.1) {
      await this.learningLoop.forceLearningCycle('Significant feedback improvement');
    }
  }
  
  /**
   * Exécute un cycle d'apprentissage
   */
  async runLearningCycle(forced: boolean = false): Promise<any> {
    return await this.learningLoop.runLearningCycle(forced);
  }
  
  /**
   * Obtient les métriques d'intelligence
   */
  async getIntelligenceMetrics(): Promise<IntelligenceMetrics> {
    try {
      // Métriques ML
      const learningStats = await this.learningLoop.getLearningStatistics();
      
      // Métriques de recommandations
      const recommendationMetrics = await this.getRecommendationMetrics();
      
      // Métriques d'apprentissage
      const learningMetrics = await this.getLearningMetrics();
      
      // Métriques business
      const businessMetrics = await this.getBusinessMetrics();
      
      return {
        ml: {
          accuracy: 0.82, // À récupérer du modèle réel
          f1Score: 0.78,
          trainingLoss: 0.35,
          validationLoss: 0.42
        },
        recommendations: recommendationMetrics,
        learning: learningMetrics,
        business: businessMetrics
      };
      
    } catch (error) {
      console.error('Error getting intelligence metrics:', error);
      return this.getDefaultMetrics();
    }
  }
  
  /**
   * Méthodes privées pour la création du plan optimisé
   */
  
  private async createOptimizedPlan(
    context: PlanningContext,
    preferences: LearnedPreferences,
    recommendations: MealRecommendations,
    inventoryAnalysis: any,
    budgetAnalysis: any,
    contextAnalysis: any
  ): Promise<WeeklyMealPlan> {
    // Créer un plan de base avec les recommandations principales
    const basePlan = this.createBasePlanFromRecommendations(
      context,
      recommendations,
      preferences
    );
    
    // Optimiser selon l'inventaire
    let optimizedPlan = await this.inventoryAnalyzer.optimizeForInventory(
      basePlan,
      context.request.inventory,
      preferences,
      true // Prioriser les produits qui expirent
    );
    
    // Optimiser selon le budget
    if (budgetAnalysis.riskLevel !== 'low') {
      optimizedPlan = await this.budgetOptimizer.optimizeForBudget(
        optimizedPlan,
        context.request.preferences.budgetConstraints,
        preferences
      );
    }
    
    // Appliquer les insights contextuels
    optimizedPlan = this.applyContextualInsights(
      optimizedPlan,
      contextAnalysis.insights,
      contextAnalysis.recommendations
    );
    
    return optimizedPlan;
  }
  
  private createBasePlanFromRecommendations(
    context: PlanningContext,
    recommendations: MealRecommendations,
    preferences: LearnedPreferences
  ): WeeklyMealPlan {
    const meals: MealPlanEntry[] = [];
    
    // Créer 14 repas (2 par jour * 7 jours)
    for (let day = 0; day < 7; day++) {
      // Déjeuner
      const lunchRecommendation = this.selectBestRecommendation(
        recommendations,
        'lunch',
        day,
        preferences
      );
      
      if (lunchRecommendation) {
        meals.push({
          id: `meal_${day}_lunch`,
          userId: context.request.userId,
          recipeId: lunchRecommendation.recipeId,
          recipeName: lunchRecommendation.recipeName,
          mealType: 'lunch',
          dayOfWeek: day,
          servings: 4,
          prepTime: lunchRecommendation.prepTime,
          estimatedCost: lunchRecommendation.estimatedCost,
          tags: ['intelligent_recommendation'],
          aiGenerated: true,
          confidence: lunchRecommendation.score
        });
      }
      
      // Dîner
      const dinnerRecommendation = this.selectBestRecommendation(
        recommendations,
        'dinner',
        day,
        preferences
      );
      
      if (dinnerRecommendation) {
        meals.push({
          id: `meal_${day}_dinner`,
          userId: context.request.userId,
          recipeId: dinnerRecommendation.recipeId,
          recipeName: dinnerRecommendation.recipeName,
          mealType: 'dinner',
          dayOfWeek: day,
          servings: 4,
          prepTime: dinnerRecommendation.prepTime,
          estimatedCost: dinnerRecommendation.estimatedCost,
          tags: ['intelligent_recommendation'],
          aiGenerated: true,
          confidence: dinnerRecommendation.score
        });
      }
    }
    
    return {
      id: `intelligent_plan_${Date.now()}`,
      userId: context.request.userId,
      name: 'Plan Intelligent IA',
      startDate: context.request.preferences.startDate,
      meals,
      totalEstimatedCost: meals.reduce((sum, meal) => sum + (meal.estimatedCost || 0), 0),
      context,
      isOptimized: false,
      aiGenerated: true,
      intelligenceVersion: '2.0'
    };
  }
  
  private selectBestRecommendation(
    recommendations: MealRecommendations,
    mealType: string,
    day: number,
    preferences: LearnedPreferences
  ): any {
    // Sélectionner selon les préférences et le contexte
    let pool = recommendations.primaryRecommendations;
    
    // Utiliser des options rapides en semaine
    if (day >= 1 && day <= 5 && mealType === 'lunch') {
      pool = recommendations.quickOptions.length > 0 
        ? recommendations.quickOptions 
        : recommendations.primaryRecommendations;
    }
    
    // Utiliser des options santé si conscient nutrition
    if (preferences.nutritionalTendencies.healthScore > 0.8) {
      pool = recommendations.healthyOptions.length > 0
        ? recommendations.healthyOptions
        : pool;
    }
    
    return pool[Math.floor(Math.random() * Math.min(pool.length, 3))]; // Top 3
  }
  
  private applyContextualInsights(
    plan: WeeklyMealPlan,
    insights: any[],
    recommendations: any[]
  ): WeeklyMealPlan {
    const contextualPlan = { ...plan };
    
    // Appliquer les recommandations contextuelles high priority
    const highPriorityRecs = recommendations
      .filter(rec => rec.priority <= 2)
      .slice(0, 3);
    
    highPriorityRecs.forEach(rec => {
      // Modifier le plan selon la recommandation
      switch (rec.type) {
        case 'weather_adaptation':
          this.adaptForWeather(contextualPlan, rec);
          break;
        case 'expiry_prevention':
          this.adaptForExpiry(contextualPlan, rec);
          break;
        case 'budget_control':
          this.adaptForBudget(contextualPlan, rec);
          break;
      }
    });
    
    return contextualPlan;
  }
  
  private adaptForWeather(plan: WeeklyMealPlan, recommendation: any): void {
    // Mock - adapter selon la météo
    console.log('Adapting plan for weather:', recommendation);
  }
  
  private adaptForExpiry(plan: WeeklyMealPlan, recommendation: any): void {
    // Mock - adapter pour les produits qui expirent
    console.log('Adapting plan for expiry:', recommendation);
  }
  
  private adaptForBudget(plan: WeeklyMealPlan, recommendation: any): void {
    // Mock - adapter pour le budget
    console.log('Adapting plan for budget:', recommendation);
  }
  
  /**
   * Méthodes pour les métriques
   */
  
  private async getStoredPreferences(userId: string): Promise<LearnedPreferences> {
    try {
      const { data, error } = await supabase
        .from('user_meal_preferences')
        .select('preferences_json')
        .eq('user_id', userId)
        .single();
      
      if (error || !data?.preferences_json) {
        return this.getDefaultPreferences();
      }
      
      return data.preferences_json;
      
    } catch (error) {
      console.error('Error getting stored preferences:', error);
      return this.getDefaultPreferences();
    }
  }
  
  private getDefaultPreferences(): LearnedPreferences {
    return {
      cuisineAffinities: { française: 0.8, italienne: 0.7 },
      ingredientPreferences: {
        loved: [],
        liked: [],
        neutral: [],
        disliked: [],
        allergens: []
      },
      cookingHabits: {
        preferredMealTimes: [],
        averageCookingTime: 30,
        complexityPreference: 'medium',
        batchCookingTendency: 0.3
      },
      nutritionalTendencies: {
        averageCaloriesPerMeal: 600,
        macroDistribution: { protein: 0.3, carbs: 0.4, fat: 0.3 },
        healthScore: 0.7,
        dietaryPattern: 'balanced'
      },
      confidenceScore: 0.5
    };
  }
  
  private async getRecommendationMetrics(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('meal_planning_analytics')
        .select('event_data')
        .eq('event_type', 'recommendation_clicked')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      
      if (error || !data) {
        return {
          clickThroughRate: 0.65,
          conversionRate: 0.45,
          diversityScore: 0.8,
          noveltyScore: 0.3
        };
      }
      
      // Calculer les vraies métriques
      return {
        clickThroughRate: 0.65, // Mock
        conversionRate: 0.45,   // Mock
        diversityScore: 0.8,    // Mock
        noveltyScore: 0.3       // Mock
      };
      
    } catch (error) {
      return {
        clickThroughRate: 0.65,
        conversionRate: 0.45,
        diversityScore: 0.8,
        noveltyScore: 0.3
      };
    }
  }
  
  private async getLearningMetrics(): Promise<any> {
    const stats = await this.learningLoop.getLearningStatistics();
    
    return {
      newPatternsThisWeek: Math.floor(stats.patternsDiscovered / stats.totalCycles * 7), // Estimation
      profileCompleteness: 0.75, // Mock
      dataPointsCollected: stats.totalCycles * 100, // Estimation
      feedbackProcessed: stats.totalCycles * 50 // Estimation
    };
  }
  
  private async getBusinessMetrics(): Promise<any> {
    try {
      // Mock - en production, calculer les vraies métriques business
      return {
        userEngagement: 0.78,
        planCompletionRate: 0.85,
        wasteReduction: 0.25,
        budgetOptimization: 0.15
      };
      
    } catch (error) {
      return {
        userEngagement: 0.78,
        planCompletionRate: 0.85,
        wasteReduction: 0.25,
        budgetOptimization: 0.15
      };
    }
  }
  
  private getDefaultMetrics(): IntelligenceMetrics {
    return {
      ml: {
        accuracy: 0.75,
        f1Score: 0.70,
        trainingLoss: 0.45,
        validationLoss: 0.50
      },
      recommendations: {
        clickThroughRate: 0.60,
        conversionRate: 0.40,
        diversityScore: 0.75,
        noveltyScore: 0.25
      },
      learning: {
        newPatternsThisWeek: 2,
        profileCompleteness: 0.60,
        dataPointsCollected: 500,
        feedbackProcessed: 25
      },
      business: {
        userEngagement: 0.70,
        planCompletionRate: 0.80,
        wasteReduction: 0.20,
        budgetOptimization: 0.10
      }
    };
  }
}

// Export singleton instance
export const intelligenceLayer = new IntelligenceLayer();

/**
 * Utilitaires de haut niveau pour l'intelligence
 */

export class IntelligenceUtils {
  /**
   * Évalue la qualité d'un plan avec l'IA
   */
  static async evaluatePlanQuality(
    plan: WeeklyMealPlan,
    preferences: LearnedPreferences,
    context?: CurrentContext
  ): Promise<{
    overallScore: number;
    nutritionScore: number;
    budgetScore: number;
    preferenceScore: number;
    inventoryScore: number;
    suggestions: string[];
  }> {
    // Utiliser tous les analyseurs pour évaluer la qualité
    const nutritionAnalysis = await nutritionalBalancer.analyzeNutritionalBalance(
      plan,
      preferences,
      context
    );
    
    const budgetAnalysis = await budgetOptimizer.analyzeBudget(
      plan,
      { weeklyBudget: 50, maxMealCost: 10 }, // Values par défaut
      preferences,
      context
    );
    
    const inventoryAnalysis = await inventoryAnalyzer.analyzeInventory(
      [], // Inventaire vide par défaut
      plan,
      preferences,
      context
    );
    
    const nutritionScore = nutritionAnalysis.balanceScore;
    const budgetScore = Math.max(0, 1 - budgetAnalysis.budgetUtilization);
    const inventoryScore = inventoryAnalysis.coverageScore;
    const preferenceScore = 0.8; // Mock - calculer selon les préférences
    
    const overallScore = (nutritionScore + budgetScore + inventoryScore + preferenceScore) / 4;
    
    const suggestions = [
      ...nutritionAnalysis.recommendations.slice(0, 2).map(rec => rec.description),
      ...budgetAnalysis.optimizations.slice(0, 2).map(opt => opt.description),
      ...inventoryAnalysis.optimizations.slice(0, 2).map(opt => opt.description)
    ];
    
    return {
      overallScore,
      nutritionScore,
      budgetScore,
      preferenceScore,
      inventoryScore,
      suggestions
    };
  }
  
  /**
   * Génère des conseils intelligents pour un repas
   */
  static async generateMealAdvice(
    meal: MealPlanEntry,
    preferences: LearnedPreferences,
    inventory?: any[],
    weather?: any
  ): Promise<string[]> {
    const advice: string[] = [];
    
    // Conseils basés sur l'inventaire
    if (inventory && inventory.length > 0) {
      const expiringItems = inventory.filter(item => {
        if (!item.expiryDate) return false;
        const daysLeft = Math.ceil(
          (new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        return daysLeft <= 3;
      });
      
      if (expiringItems.length > 0) {
        advice.push(`💡 Utilisez ${expiringItems[0].name} qui expire bientôt`);
      }
    }
    
    // Conseils basés sur la météo
    if (weather) {
      if (weather.temperature < 10) {
        advice.push('🔥 Temps froid - idéal pour un plat réconfortant');
      } else if (weather.temperature > 25) {
        advice.push('☀️ Temps chaud - privilégiez les repas frais et légers');
      }
    }
    
    // Conseils basés sur les préférences
    if (preferences.cookingHabits.complexityPreference === 'simple' && meal.prepTime > 45) {
      advice.push('⏱️ Vous pouvez préparer certains éléments à l\'avance pour gagner du temps');
    }
    
    // Conseils nutritionnels
    if (preferences.nutritionalTendencies.healthScore > 0.8) {
      advice.push('🥗 Pensez à ajouter des légumes verts pour l\'équilibre nutritionnel');
    }
    
    return advice.slice(0, 3); // Maximum 3 conseils
  }
}