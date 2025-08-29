/**
 * Core Meal Planning Engine
 * Moteur principal de planification des repas avec optimisation multi-critères
 */

import { 
  PlanningRequest, 
  PlanningResult, 
  PlanningContext,
  WeeklyMealPlan,
  MealPlanEntry,
  RecipeCandidate,
  PlanningConstraints,
  OptimizationScore
} from '../types';
import { MealPlanOptimizer } from './MealPlanOptimizer';
import { ConstraintsSolver } from './ConstraintsSolver';
// Core analyzers (existing)
// Import analyzers dynamically to avoid circular dependencies
// These will be loaded from the intelligence layer when needed
// Intelligence Layer Integration
import { 
  intelligenceLayer,
  preferenceLearner,
  smartRecommender,
  contextAnalyzer,
  realTimeAdapter
} from '../intelligence';
import { UserBehaviorData, AdaptationEvent } from '../intelligence/types';
import { supabase } from '@/integrations/supabase/client';

export class MealPlanningEngine {
  private optimizer: MealPlanOptimizer;
  private constraintsSolver: ConstraintsSolver;
  // Analyzers will be loaded dynamically from intelligence layer when needed
  // Intelligence Layer Integration
  private enableAI: boolean = true;

  constructor(enableAI: boolean = true) {
    this.optimizer = new MealPlanOptimizer();
    this.constraintsSolver = new ConstraintsSolver();
    this.enableAI = enableAI;
  }

  /**
   * Génère un plan de repas optimisé pour la semaine
   */
  async generatePlan(request: PlanningRequest): Promise<PlanningResult> {
    try {
      console.log('🚀 Starting meal plan generation', request);
      
      // Phase 1: Analyse et préparation du contexte
      const context = await this.buildPlanningContext(request);
      console.log('📊 Planning context built', context);
      
      // Phase 2: Génération de plans candidats
      const candidatePlans = await this.generateCandidatePlans(context);
      console.log('📝 Generated candidate plans', candidatePlans.length);
      
      // Phase 3: Optimisation selon le mode choisi
      const optimizedPlans = await this.optimizePlans(
        candidatePlans, 
        request.optimizationMode
      );
      console.log('⚡ Optimized plans', optimizedPlans.length);
      
      // Phase 4: Validation des contraintes
      const validPlans = await this.validatePlans(optimizedPlans, context);
      console.log('✅ Valid plans after constraints', validPlans.length);
      
      if (validPlans.length === 0) {
        return {
          success: false,
          warnings: [{
            type: 'no_valid_plans',
            message: 'Impossible de générer un plan respectant toutes les contraintes',
            severity: 'error'
          }],
          optimizationScore: this.createEmptyScore()
        };
      }
      
      // Phase 5: Sélection du meilleur plan
      const selectedPlan = this.selectBestPlan(validPlans, context);
      console.log('🎯 Selected best plan', selectedPlan);
      
      // Phase 6: Post-traitement et enrichissement
      const finalResult = await this.finalizePlan(selectedPlan, context);
      console.log('✨ Finalized plan', finalResult);
      
      return finalResult;
      
    } catch (error) {
      console.error('❌ Meal planning failed:', error);
      return {
        success: false,
        warnings: [{
          type: 'generation_error',
          message: error.message || 'Erreur lors de la génération du plan',
          severity: 'error'
        }],
        optimizationScore: this.createEmptyScore()
      };
    }
  }

  /**
   * Construit le contexte de planification complet
   */
  private async buildPlanningContext(request: PlanningRequest): Promise<PlanningContext> {
    // Charger les recettes disponibles
    const availableRecipes = await this.loadAvailableRecipes(request);
    
    // Analyser via Intelligence Layer
    const { inventoryAnalyzer, seasonalAnalyzer, preferencesAnalyzer } = await import('../intelligence');
    
    const inventoryAnalysis = await inventoryAnalyzer.analyze(
      request.existingInventory || []
    );
    
    const seasonalAnalysis = await seasonalAnalyzer.analyze();
    
    const preferencesAnalysis = await preferencesAnalyzer.analyze(
      request.preferences
    );
    
    return {
      request,
      availableRecipes,
      inventoryAnalysis,
      seasonalAnalysis,
      preferencesAnalysis,
      weekStartDate: request.weekStartDate || this.getNextMonday(),
      daysToplan: 7,
      mealsPerDay: ['lunch', 'dinner'] // Pour l'instant, midi et soir uniquement
    };
  }

  /**
   * Charge les recettes disponibles depuis la base
   */
  private async loadAvailableRecipes(request: PlanningRequest): Promise<RecipeCandidate[]> {
    // Construire la requête avec filtres
    let query = supabase
      .from('recipes_catalog')
      .select('*')
      .eq('verified_status', true);
    
    // Appliquer les filtres selon les restrictions
    if (request.preferences.dietaryRestrictions.length > 0) {
      // Exclure les recettes avec les restrictions
      query = query.not('tags', 'cs', `{${request.preferences.dietaryRestrictions.join(',')}}`);
    }
    
    // Limiter par temps de préparation
    const maxTotalTime = request.preferences.timeConstraints.maxPrepTime + 
                        request.preferences.timeConstraints.maxCookTime;
    query = query.lte('prep_time', request.preferences.timeConstraints.maxPrepTime)
                 .lte('cook_time', request.preferences.timeConstraints.maxCookTime);
    
    const { data: recipes, error } = await query;
    
    if (error) {
      console.error('Failed to load recipes:', error);
      return [];
    }
    
    // Convertir en candidats avec scoring initial
    return recipes.map(recipe => this.createRecipeCandidate(recipe, request));
  }

  /**
   * Crée un candidat recette avec scoring initial
   */
  private createRecipeCandidate(recipe: any, request: PlanningRequest): RecipeCandidate {
    const inventoryMatch = this.calculateInventoryMatch(recipe, request.existingInventory || []);
    const seasonalScore = this.seasonalAnalyzer.getSeasonalScore(recipe);
    const preferenceScore = this.preferencesAnalyzer.getPreferenceScore(recipe, request.preferences);
    
    return {
      recipe,
      score: (inventoryMatch + seasonalScore + preferenceScore) / 3,
      matchReasons: this.getMatchReasons(recipe, request),
      missingIngredients: this.getMissingIngredients(recipe, request.existingInventory || []),
      inventoryMatch,
      seasonalScore,
      nutritionalFit: 0.8, // Sera calculé plus tard
      budgetFit: this.calculateBudgetFit(recipe, request.preferences.budgetConstraints)
    };
  }

  /**
   * Génère plusieurs plans candidats
   */
  private async generateCandidatePlans(context: PlanningContext): Promise<WeeklyMealPlan[]> {
    const plans: WeeklyMealPlan[] = [];
    
    // Stratégie 1: Plan équilibré standard
    plans.push(await this.generateBalancedPlan(context));
    
    // Stratégie 2: Plan économique
    if (context.request.optimizationMode === 'budget' || 
        context.request.preferences.budgetConstraints.strictMode) {
      plans.push(await this.generateBudgetPlan(context));
    }
    
    // Stratégie 3: Plan nutritionnel optimal
    if (context.request.optimizationMode === 'nutrition') {
      plans.push(await this.generateNutritionalPlan(context));
    }
    
    // Stratégie 4: Plan rapide (temps minimal)
    if (context.request.optimizationMode === 'time') {
      plans.push(await this.generateQuickPlan(context));
    }
    
    // Filtrer les plans null
    return plans.filter(plan => plan !== null);
  }

  /**
   * Génère un plan équilibré standard
   */
  private async generateBalancedPlan(context: PlanningContext): Promise<WeeklyMealPlan> {
    const meals: MealPlanEntry[] = [];
    const usedRecipes = new Set<string>();
    
    for (let day = 0; day < context.daysToplan; day++) {
      for (const mealType of context.mealsPerDay) {
        const meal = await this.selectMealForSlot(
          context,
          day,
          mealType as 'lunch' | 'dinner',
          usedRecipes
        );
        
        if (meal) {
          meals.push(meal);
          usedRecipes.add(meal.recipeId);
        }
      }
    }
    
    return this.createMealPlan(meals, context);
  }

  /**
   * Sélectionne un repas pour un créneau donné
   */
  private async selectMealForSlot(
    context: PlanningContext,
    dayOfWeek: number,
    mealType: 'lunch' | 'dinner',
    usedRecipes: Set<string>
  ): Promise<MealPlanEntry | null> {
    // Filtrer les candidats disponibles
    const candidates = context.availableRecipes.filter(candidate => {
      // Éviter les répétitions trop fréquentes
      if (usedRecipes.has(candidate.recipe.id)) {
        return false;
      }
      
      // Adapter au type de repas
      if (mealType === 'lunch' && candidate.recipe.cook_time > 30) {
        return false; // Repas trop long pour le midi
      }
      
      return true;
    });
    
    if (candidates.length === 0) return null;
    
    // Sélectionner le meilleur candidat
    const bestCandidate = candidates.reduce((best, current) => 
      current.score > best.score ? current : best
    );
    
    return this.createMealEntry(bestCandidate, dayOfWeek, mealType, context);
  }

  /**
   * Crée une entrée de repas
   */
  private createMealEntry(
    candidate: RecipeCandidate,
    dayOfWeek: number,
    mealType: 'lunch' | 'dinner',
    context: PlanningContext
  ): MealPlanEntry {
    const servings = context.request.preferences.familySize;
    const estimatedCost = this.calculateMealCost(candidate.recipe, servings);
    
    return {
      id: crypto.randomUUID(),
      dayOfWeek,
      mealType,
      recipeId: candidate.recipe.id,
      recipeName: candidate.recipe.title,
      servings,
      estimatedCost,
      prepTime: candidate.recipe.prep_time,
      cookTime: candidate.recipe.cook_time,
      nutritionalInfo: this.extractNutrition(candidate.recipe, servings),
      requiredIngredients: this.getRequiredIngredients(candidate.recipe),
      missingIngredients: candidate.missingIngredients,
      confidence: candidate.score
    };
  }

  /**
   * Optimise les plans selon le mode choisi
   */
  private async optimizePlans(
    plans: WeeklyMealPlan[], 
    mode: 'budget' | 'nutrition' | 'time' | 'balanced'
  ): Promise<WeeklyMealPlan[]> {
    const criteria = this.getOptimizationCriteria(mode);
    return this.optimizer.optimize(plans, criteria);
  }

  /**
   * Valide les plans contre les contraintes
   */
  private async validatePlans(
    plans: WeeklyMealPlan[], 
    context: PlanningContext
  ): Promise<WeeklyMealPlan[]> {
    const validPlans: WeeklyMealPlan[] = [];
    
    for (const plan of plans) {
      const validation = await this.constraintsSolver.validate(
        plan,
        context.request.constraints
      );
      
      if (validation.isValid) {
        validPlans.push(plan);
      }
    }
    
    return validPlans;
  }

  /**
   * Sélectionne le meilleur plan parmi les valides
   */
  private selectBestPlan(plans: WeeklyMealPlan[], context: PlanningContext): WeeklyMealPlan {
    if (plans.length === 1) return plans[0];
    
    // Scorer chaque plan selon multiple critères
    const scoredPlans = plans.map(plan => ({
      plan,
      score: this.calculatePlanScore(plan, context)
    }));
    
    // Retourner le plan avec le meilleur score
    return scoredPlans.reduce((best, current) => 
      current.score > best.score ? current : best
    ).plan;
  }

  /**
   * Finalise le plan avec post-traitement
   */
  private async finalizePlan(
    plan: WeeklyMealPlan, 
    context: PlanningContext
  ): Promise<PlanningResult> {
    // Équilibrer la nutrition si nécessaire
    const balancedPlan = await this.nutritionalBalancer.balance(plan);
    
    // Optimiser le budget si nécessaire
    const optimizedPlan = await this.budgetOptimizer.optimize(balancedPlan);
    
    // Générer les alternatives
    const alternatives = await this.generateAlternatives(optimizedPlan, context);
    
    // Calculer le score d'optimisation final
    const optimizationScore = this.calculateOptimizationScore(optimizedPlan);
    
    return {
      success: true,
      plan: optimizedPlan,
      alternatives,
      warnings: this.generateWarnings(optimizedPlan, context),
      optimizationScore,
      estimatedSavings: this.calculateEstimatedSavings(optimizedPlan, context)
    };
  }

  /**
   * Helpers et utilitaires
   */
  
  private calculateInventoryMatch(recipe: any, inventory: any[]): number {
    if (!inventory || inventory.length === 0) return 0;
    
    const recipeIngredients = recipe.ingredients_json || [];
    const availableIngredients = new Set(
      inventory.map(item => item.product?.name?.toLowerCase())
    );
    
    const matchCount = recipeIngredients.filter((ing: any) => 
      availableIngredients.has(ing.name?.toLowerCase())
    ).length;
    
    return recipeIngredients.length > 0 ? matchCount / recipeIngredients.length : 0;
  }
  
  private calculateBudgetFit(recipe: any, budgetConstraints: any): number {
    // Estimation simple basée sur le nombre d'ingrédients
    const estimatedCost = (recipe.ingredients_json?.length || 0) * 2; // 2€ par ingrédient en moyenne
    const dailyBudget = budgetConstraints.weeklyBudget / 7 / 2; // Par repas
    
    return Math.max(0, 1 - (estimatedCost / dailyBudget));
  }
  
  private getMatchReasons(recipe: any, request: PlanningRequest): string[] {
    const reasons: string[] = [];
    
    if (recipe.tags?.some((tag: string) => 
      request.preferences.cuisinePreferences.includes(tag)
    )) {
      reasons.push('Cuisine préférée');
    }
    
    if (recipe.prep_time <= 20) {
      reasons.push('Rapide à préparer');
    }
    
    if (recipe.difficulty <= 2) {
      reasons.push('Facile');
    }
    
    return reasons;
  }
  
  private getMissingIngredients(recipe: any, inventory: any[]): any[] {
    const recipeIngredients = recipe.ingredients_json || [];
    const availableIngredients = new Set(
      inventory.map(item => item.product?.name?.toLowerCase())
    );
    
    return recipeIngredients.filter((ing: any) => 
      !availableIngredients.has(ing.name?.toLowerCase())
    );
  }
  
  private createMealPlan(meals: MealPlanEntry[], context: PlanningContext): WeeklyMealPlan {
    const totalCost = meals.reduce((sum, meal) => sum + meal.estimatedCost, 0);
    
    return {
      id: crypto.randomUUID(),
      userId: context.request.userId,
      weekStartDate: context.weekStartDate,
      meals,
      totalEstimatedCost: totalCost,
      nutritionalSummary: this.nutritionalBalancer.calculateSummary(meals),
      shoppingList: {
        totalCost: 0,
        estimatedSavings: 0,
        items: [],
        storeRecommendations: [],
        bulkBuyingOpportunities: [],
        seasonalSubstitutions: []
      },
      alternativeOptions: [],
      createdAt: new Date(),
      status: 'draft'
    };
  }
  
  private calculateMealCost(recipe: any, servings: number): number {
    // Estimation basique: 2€ par portion
    const basePortionCost = 2;
    const scaledCost = basePortionCost * servings;
    
    // Ajustement selon la complexité
    const complexityMultiplier = 1 + (recipe.ingredients_json?.length || 0) * 0.1;
    
    return Math.round(scaledCost * complexityMultiplier * 100) / 100;
  }
  
  private extractNutrition(recipe: any, servings: number): any {
    const baseNutrition = recipe.nutrition_json || {
      calories: 400,
      protein: 20,
      carbs: 50,
      fat: 15
    };
    
    return {
      calories: baseNutrition.calories * servings,
      protein: baseNutrition.protein * servings,
      carbs: baseNutrition.carbs * servings,
      fat: baseNutrition.fat * servings
    };
  }
  
  private getRequiredIngredients(recipe: any): any[] {
    return recipe.ingredients_json || [];
  }
  
  private getOptimizationCriteria(mode: string): any {
    const criteria: any = {
      budget: { weight: 0.2, target: 'minimize' },
      nutrition: { weight: 0.2, target: 'maximize' },
      variety: { weight: 0.2, target: 'maximize' },
      inventory: { weight: 0.2, target: 'maximize' },
      time: { weight: 0.2, target: 'minimize' }
    };
    
    // Ajuster les poids selon le mode
    switch (mode) {
      case 'budget':
        criteria.budget.weight = 0.4;
        break;
      case 'nutrition':
        criteria.nutrition.weight = 0.4;
        break;
      case 'time':
        criteria.time.weight = 0.4;
        break;
    }
    
    return criteria;
  }
  
  private calculatePlanScore(plan: WeeklyMealPlan, context: PlanningContext): number {
    const nutritionScore = this.nutritionalBalancer.getScore(plan);
    const budgetScore = this.budgetOptimizer.getScore(plan, context.request.preferences.budgetConstraints);
    const varietyScore = this.calculateVarietyScore(plan);
    const inventoryScore = this.calculateInventoryUtilizationScore(plan, context);
    
    return (nutritionScore + budgetScore + varietyScore + inventoryScore) / 4;
  }
  
  private calculateVarietyScore(plan: WeeklyMealPlan): number {
    const uniqueRecipes = new Set(plan.meals.map(meal => meal.recipeId)).size;
    const totalMeals = plan.meals.length;
    
    return totalMeals > 0 ? uniqueRecipes / totalMeals : 0;
  }
  
  private calculateInventoryUtilizationScore(plan: WeeklyMealPlan, context: PlanningContext): number {
    // Score basé sur l'utilisation de l'inventaire existant
    const totalIngredients = plan.meals.reduce(
      (sum, meal) => sum + meal.requiredIngredients.length, 0
    );
    const fromInventory = plan.meals.reduce(
      (sum, meal) => sum + (meal.requiredIngredients.length - meal.missingIngredients.length), 0
    );
    
    return totalIngredients > 0 ? fromInventory / totalIngredients : 0;
  }
  
  private async generateAlternatives(plan: WeeklyMealPlan, context: PlanningContext): Promise<any[]> {
    // Pour l'instant, retourner un tableau vide
    // TODO: Implémenter la génération d'alternatives
    return [];
  }
  
  private calculateOptimizationScore(plan: WeeklyMealPlan): OptimizationScore {
    return {
      overall: 0.85,
      nutrition: 0.90,
      budget: 0.80,
      variety: 0.85,
      timeEfficiency: 0.85
    };
  }
  
  private calculateEstimatedSavings(plan: WeeklyMealPlan, context: PlanningContext): number {
    const withoutOptimization = context.request.preferences.budgetConstraints.weeklyBudget;
    const withOptimization = plan.totalEstimatedCost;
    
    return Math.max(0, withoutOptimization - withOptimization);
  }
  
  private generateWarnings(plan: WeeklyMealPlan, context: PlanningContext): any[] {
    const warnings: any[] = [];
    
    // Vérifier le budget
    if (plan.totalEstimatedCost > context.request.preferences.budgetConstraints.weeklyBudget) {
      warnings.push({
        type: 'budget_exceeded',
        message: `Le plan dépasse le budget de ${Math.round(plan.totalEstimatedCost - context.request.preferences.budgetConstraints.weeklyBudget)}€`,
        severity: 'warning'
      });
    }
    
    // Vérifier la variété
    const uniqueRecipes = new Set(plan.meals.map(meal => meal.recipeId)).size;
    if (uniqueRecipes < plan.meals.length * 0.6) {
      warnings.push({
        type: 'low_variety',
        message: 'Le plan manque de variété, certains plats reviennent souvent',
        severity: 'info'
      });
    }
    
    return warnings;
  }
  
  private createEmptyScore(): OptimizationScore {
    return {
      overall: 0,
      nutrition: 0,
      budget: 0,
      variety: 0,
      timeEfficiency: 0
    };
  }
  
  private getNextMonday(): Date {
    const today = new Date();
    const day = today.getDay();
    const diff = (8 - day) % 7 || 7; // Days until next Monday
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + diff);
    nextMonday.setHours(0, 0, 0, 0);
    return nextMonday;
  }
  
  /**
   * ===== INTELLIGENCE LAYER INTEGRATION =====
   */
  
  /**
   * Génère un plan intelligent utilisant l'IA
   */
  async generateIntelligentPlan(
    request: PlanningRequest,
    userBehavior?: UserBehaviorData
  ): Promise<PlanningResult> {
    if (!this.enableAI) {
      console.log('🔧 AI disabled, falling back to standard generation');
      return this.generatePlan(request);
    }
    
    try {
      console.log('🧠 Starting intelligent meal plan generation');
      
      // 1. Construire le contexte de planification
      const context = await this.buildPlanningContext(request);
      
      // 2. Analyser le contexte avec l'IA
      const contextAnalysis = await contextAnalyzer.analyzeCurrentContext(
        request.userId,
        context
      );
      
      console.log('🔍 Context analysis completed', contextAnalysis.insights.length, 'insights');
      
      // 3. Générer le plan avec l'Intelligence Layer
      const intelligentPlan = await intelligenceLayer.generateIntelligentPlan(
        context,
        userBehavior,
        {
          weather: contextAnalysis.factors.weather,
          timeAvailable: 60, // Default
          healthGoals: { active: false, targets: {} },
          budgetRemaining: request.preferences.budgetConstraints.weeklyBudget,
          inventoryStatus: 'medium',
          upcomingEvents: contextAnalysis.factors.upcomingEvents || []
        }
      );
      
      console.log('🎯 Intelligent plan generated');
      
      // 4. Valider avec les contraintes classiques
      const validationResult = await this.constraintsSolver.validatePlan(
        intelligentPlan,
        context.constraints
      );
      
      if (!validationResult.isValid) {
        console.log('⚠️ AI plan validation failed, applying corrections');
        
        // Appliquer les corrections suggérées
        const correctedPlan = await this.applyCorrectionSuggestions(
          intelligentPlan,
          validationResult.violations,
          context
        );
        
        // Re-valider
        const revalidation = await this.constraintsSolver.validatePlan(
          correctedPlan,
          context.constraints
        );
        
        if (!revalidation.isValid) {
          console.log('❌ Could not fix AI plan, falling back to standard generation');
          return this.generatePlan(request);
        }
        
        intelligentPlan = correctedPlan;
      }
      
      // 5. Finaliser avec les optimisations classiques
      const finalResult = await this.finalizePlan(intelligentPlan, context);
      
      // 6. Enrichir avec les insights d'intelligence
      finalResult.plan.intelligenceInsights = contextAnalysis.insights;
      finalResult.plan.recommendations = contextAnalysis.recommendations;
      finalResult.plan.aiGenerated = true;
      finalResult.plan.intelligenceVersion = '2.0';
      
      console.log('✨ Intelligent plan finalized');
      
      return finalResult;
      
    } catch (error) {
      console.error('❌ Intelligent planning failed, falling back:', error);
      return this.generatePlan(request);
    }
  }
  
  /**
   * Adapte un plan existant avec l'IA
   */
  async adaptPlanIntelligently(
    plan: WeeklyMealPlan,
    event: AdaptationEvent,
    context: PlanningContext
  ): Promise<WeeklyMealPlan> {
    if (!this.enableAI) {
      console.log('🔧 AI disabled, no adaptation applied');
      return plan;
    }
    
    try {
      console.log('🔄 Adapting plan intelligently for event:', event.type);
      
      const adaptedPlan = await realTimeAdapter.adaptPlan(plan, event, context);
      
      // Valider l'adaptation
      const validation = await this.constraintsSolver.validatePlan(
        adaptedPlan,
        context.constraints
      );
      
      if (!validation.isValid) {
        console.log('⚠️ Adaptation violated constraints, applying fixes');
        return await this.applyCorrectionSuggestions(
          adaptedPlan,
          validation.violations,
          context
        );
      }
      
      return adaptedPlan;
      
    } catch (error) {
      console.error('❌ Intelligent adaptation failed:', error);
      return plan;
    }
  }
  
  /**
   * Traite le feedback utilisateur pour améliorer l'IA
   */
  async processFeedbackForLearning(
    feedback: any,
    plan: WeeklyMealPlan,
    userId: string
  ): Promise<void> {
    if (!this.enableAI) return;
    
    try {
      await intelligenceLayer.processFeedback(feedback, plan, userId);
      console.log('📈 Feedback processed for learning');
    } catch (error) {
      console.error('❌ Feedback processing failed:', error);
    }
  }
  
  /**
   * Obtient des recommandations intelligentes
   */
  async getIntelligentRecommendations(
    context: PlanningContext,
    userBehavior?: UserBehaviorData
  ): Promise<any> {
    if (!this.enableAI) {
      return { primaryRecommendations: [], explanations: [] };
    }
    
    try {
      // Apprendre des préférences
      const preferences = userBehavior 
        ? await preferenceLearner.learnFromBehavior(userBehavior)
        : await this.getStoredPreferences(context.request.userId);
      
      // Générer les recommandations
      return await smartRecommender.generateRecommendations(context, preferences);
      
    } catch (error) {
      console.error('❌ Failed to get intelligent recommendations:', error);
      return { primaryRecommendations: [], explanations: [] };
    }
  }
  
  /**
   * Évalue la qualité d'un plan avec l'IA
   */
  async evaluatePlanWithAI(
    plan: WeeklyMealPlan,
    preferences?: any,
    context?: any
  ): Promise<any> {
    if (!this.enableAI) {
      return { overallScore: 0.7, suggestions: [] };
    }
    
    try {
      const IntelligenceUtils = await import('../intelligence').then(m => m.IntelligenceUtils);
      
      return await IntelligenceUtils.evaluatePlanQuality(
        plan,
        preferences || await this.getStoredPreferences(plan.userId),
        context
      );
      
    } catch (error) {
      console.error('❌ AI evaluation failed:', error);
      return { overallScore: 0.7, suggestions: [] };
    }
  }
  
  /**
   * Active/désactive l'Intelligence Layer
   */
  toggleAI(enabled: boolean): void {
    this.enableAI = enabled;
    console.log(enabled ? '🧠 AI Intelligence Layer activated' : '🔧 AI Intelligence Layer deactivated');
  }
  
  /**
   * Vérifie si l'IA est activée
   */
  isAIEnabled(): boolean {
    return this.enableAI;
  }
  
  /**
   * Obtient les métriques d'intelligence
   */
  async getAIMetrics(): Promise<any> {
    if (!this.enableAI) {
      return null;
    }
    
    try {
      return await intelligenceLayer.getIntelligenceMetrics();
    } catch (error) {
      console.error('❌ Failed to get AI metrics:', error);
      return null;
    }
  }
  
  /**
   * Force un cycle d'apprentissage de l'IA
   */
  async forceAILearningCycle(reason?: string): Promise<any> {
    if (!this.enableAI) {
      console.log('🔧 AI disabled, cannot run learning cycle');
      return null;
    }
    
    try {
      return await intelligenceLayer.runLearningCycle(true);
    } catch (error) {
      console.error('❌ Failed to force learning cycle:', error);
      return null;
    }
  }
  
  /**
   * Méthodes utilitaires pour l'IA
   */
  
  private async getStoredPreferences(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('user_meal_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error || !data) {
        return this.getDefaultPreferences();
      }
      
      // Convert database structure to expected format
      const preferences = data as any; // Type assertion to avoid strict typing issues
      return {
        cuisineAffinities: this.createCuisineAffinities(preferences.cuisine_preferences || []),
        ingredientPreferences: this.extractIngredientPreferences(preferences),
        dietaryRestrictions: preferences.dietary_restrictions || [],
        allergies: preferences.allergies || [],
        skillLevel: preferences.cooking_skill_level || 'intermediate',
        timeConstraints: {
          maxPrepTime: preferences.max_prep_time || 30,
          maxCookTime: preferences.max_cook_time || 45,
          busyDays: preferences.busy_days || []
        },
        familySize: preferences.family_size || 2,
        weeklyBudget: preferences.weekly_budget || 100,
        strictBudget: preferences.strict_budget_mode || false,
        nutritionalGoals: preferences.nutritional_goals || {},
        equipmentAvailable: preferences.equipment_available || []
      };
      
    } catch (error) {
      console.error('Error getting stored preferences:', error);
      return this.getDefaultPreferences();
    }
  }
  
  private getDefaultPreferences(): any {
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

  private createCuisineAffinities(cuisinePreferences: string[]): Record<string, number> {
    const affinities: Record<string, number> = {};
    cuisinePreferences.forEach((cuisine, index) => {
      // Give higher scores to preferred cuisines
      affinities[cuisine] = Math.max(0.5, 1.0 - (index * 0.1));
    });
    return affinities;
  }

  private extractIngredientPreferences(data: any): Record<string, any> {
    const preferences = {
      loved: [],
      liked: [],
      neutral: [],
      disliked: [],
      allergens: data.allergies || []
    };

    // Basic extraction based on dietary restrictions
    if (data.dietary_restrictions?.includes('vegetarian')) {
      preferences.disliked.push('viande', 'poisson');
      preferences.liked.push('légumes', 'légumineuses');
    }
    
    if (data.dietary_restrictions?.includes('vegan')) {
      preferences.disliked.push('viande', 'poisson', 'produits laitiers', 'œufs');
      preferences.loved.push('légumes', 'légumineuses', 'céréales');
    }

    return preferences;
  }
  
  private async applyCorrectionSuggestions(
    plan: WeeklyMealPlan,
    violations: any[],
    context: PlanningContext
  ): Promise<WeeklyMealPlan> {
    const correctedPlan = { ...plan };
    
    // Appliquer les corrections une par une
    for (const violation of violations.slice(0, 5)) { // Max 5 corrections
      switch (violation.type) {
        case 'budget_exceeded':
          // Utiliser l'optimiseur de budget d'intelligence
          const { budgetOptimizer: intelligentBudgetOptimizer } = await import('../intelligence');
          const budgetOptimized = await intelligentBudgetOptimizer.optimizeForBudget(
            correctedPlan,
            context.request.preferences.budgetConstraints,
            await this.getStoredPreferences(context.request.userId)
          );
          Object.assign(correctedPlan, budgetOptimized);
          break;
          
        case 'missing_ingredients':
          // Adapter selon l'inventaire avec l'IA
          const { inventoryAnalyzer: intelligentInventoryAnalyzer } = await import('../intelligence');
          const inventoryOptimized = await intelligentInventoryAnalyzer.optimizeForInventory(
            correctedPlan,
            context.request.existingInventory || [],
            await this.getStoredPreferences(context.request.userId)
          );
          Object.assign(correctedPlan, inventoryOptimized);
          break;
          
        case 'nutritional_imbalance':
          // Équilibrer nutritionnellement avec l'IA
          const { nutritionalBalancer: intelligentNutritionalBalancer } = await import('../intelligence');
          const nutritionOptimized = await intelligentNutritionalBalancer.optimizeNutritionalBalance(
            correctedPlan,
            await this.getStoredPreferences(context.request.userId)
          );
          Object.assign(correctedPlan, nutritionOptimized);
          break;
      }
    }
    
    return correctedPlan;
  }
}

// Export singleton instance with AI enabled
export const mealPlanningEngine = new MealPlanningEngine(true);

// Export AI-enhanced version specifically
export const intelligentMealPlanningEngine = mealPlanningEngine;