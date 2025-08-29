/**
 * Meal Plan Optimizer
 * Optimise les plans de repas selon plusieurs critères
 */

import { 
  WeeklyMealPlan, 
  OptimizationCriteria,
  MealPlanEntry,
  OptimizationScore
} from '../types';

export class MealPlanOptimizer {
  /**
   * Optimise une liste de plans selon les critères donnés
   */
  optimize(plans: WeeklyMealPlan[], criteria: OptimizationCriteria): WeeklyMealPlan[] {
    // Calculer le score composite pour chaque plan
    const scoredPlans = plans
      .map(plan => ({
        plan,
        score: this.calculateCompositeScore(plan, criteria)
      }))
      .sort((a, b) => b.score - a.score);
    
    // Appliquer des optimisations locales aux meilleurs plans
    return scoredPlans
      .slice(0, Math.min(5, scoredPlans.length)) // Garder les 5 meilleurs
      .map(item => this.applyLocalOptimizations(item.plan, criteria));
  }
  
  /**
   * Calcule un score composite basé sur les critères
   */
  private calculateCompositeScore(
    plan: WeeklyMealPlan, 
    criteria: OptimizationCriteria
  ): number {
    const scores = {
      budget: this.calculateBudgetScore(plan),
      nutrition: this.calculateNutritionScore(plan),
      variety: this.calculateVarietyScore(plan),
      inventory: this.calculateInventoryUsageScore(plan),
      time: this.calculateTimeScore(plan)
    };
    
    // Normaliser les scores selon la direction d'optimisation
    Object.entries(criteria).forEach(([key, config]) => {
      if (config.target === 'minimize') {
        scores[key as keyof typeof scores] = 1 - scores[key as keyof typeof scores];
      }
    });
    
    // Calculer le score pondéré
    return Object.entries(criteria).reduce((total, [key, config]) => {
      return total + (scores[key as keyof typeof scores] * config.weight);
    }, 0);
  }
  
  /**
   * Applique des optimisations locales à un plan
   */
  private applyLocalOptimizations(
    plan: WeeklyMealPlan, 
    criteria: OptimizationCriteria
  ): WeeklyMealPlan {
    let optimizedPlan = { ...plan };
    
    // Optimisation budget si c'est une priorité
    if (criteria.budget.weight > 0.3) {
      optimizedPlan = this.optimizeBudgetLocally(optimizedPlan);
    }
    
    // Optimisation nutrition si c'est une priorité
    if (criteria.nutrition.weight > 0.3) {
      optimizedPlan = this.optimizeNutritionLocally(optimizedPlan);
    }
    
    // Optimisation temps si c'est une priorité
    if (criteria.time.weight > 0.3) {
      optimizedPlan = this.optimizeTimeLocally(optimizedPlan);
    }
    
    return optimizedPlan;
  }
  
  /**
   * Calcul des scores individuels
   */
  
  private calculateBudgetScore(plan: WeeklyMealPlan): number {
    // Score basé sur le coût total (plus c'est bas, mieux c'est)
    const maxBudget = 150; // Budget hebdomadaire max typique
    const score = 1 - (plan.totalEstimatedCost / maxBudget);
    return Math.max(0, Math.min(1, score));
  }
  
  private calculateNutritionScore(plan: WeeklyMealPlan): number {
    if (!plan.nutritionalSummary) return 0.5;
    
    // Utiliser le healthScore du résumé nutritionnel
    return plan.nutritionalSummary.healthScore / 100;
  }
  
  private calculateVarietyScore(plan: WeeklyMealPlan): number {
    // Score basé sur la diversité des recettes
    const uniqueRecipes = new Set(plan.meals.map(meal => meal.recipeId));
    const varietyScore = uniqueRecipes.size / plan.meals.length;
    
    // Bonus pour diversité de cuisines
    const uniqueCuisines = new Set(
      plan.meals.map(meal => this.extractCuisineFromMeal(meal))
    );
    const cuisineBonus = Math.min(0.2, uniqueCuisines.size * 0.05);
    
    return Math.min(1, varietyScore + cuisineBonus);
  }
  
  private calculateInventoryUsageScore(plan: WeeklyMealPlan): number {
    // Score basé sur l'utilisation d'ingrédients de l'inventaire
    const totalIngredients = plan.meals.reduce(
      (sum, meal) => sum + meal.requiredIngredients.length, 0
    );
    const missingIngredients = plan.meals.reduce(
      (sum, meal) => sum + meal.missingIngredients.length, 0
    );
    
    if (totalIngredients === 0) return 0.5;
    
    const usageRate = 1 - (missingIngredients / totalIngredients);
    return Math.max(0, Math.min(1, usageRate));
  }
  
  private calculateTimeScore(plan: WeeklyMealPlan): number {
    // Score basé sur le temps total de préparation
    const totalTime = plan.meals.reduce(
      (sum, meal) => sum + meal.prepTime + meal.cookTime, 0
    );
    
    const maxAcceptableTime = 60 * 14; // 2h par jour max
    const score = 1 - (totalTime / maxAcceptableTime);
    
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * Optimisations locales
   */
  
  private optimizeBudgetLocally(plan: WeeklyMealPlan): WeeklyMealPlan {
    // Identifier les repas les plus chers
    const sortedMeals = [...plan.meals].sort((a, b) => b.estimatedCost - a.estimatedCost);
    const expensiveMeals = sortedMeals.slice(0, 3);
    
    // Pour chaque repas cher, essayer de réduire les portions ou simplifier
    const optimizedMeals = plan.meals.map(meal => {
      if (expensiveMeals.includes(meal) && meal.estimatedCost > 10) {
        // Réduire légèrement les portions pour économiser
        const reducedServings = Math.max(meal.servings - 1, 2);
        const costReduction = (meal.servings - reducedServings) / meal.servings;
        
        return {
          ...meal,
          servings: reducedServings,
          estimatedCost: meal.estimatedCost * (1 - costReduction * 0.8)
        };
      }
      return meal;
    });
    
    // Recalculer le coût total
    const newTotalCost = optimizedMeals.reduce((sum, meal) => sum + meal.estimatedCost, 0);
    
    return {
      ...plan,
      meals: optimizedMeals,
      totalEstimatedCost: newTotalCost
    };
  }
  
  private optimizeNutritionLocally(plan: WeeklyMealPlan): WeeklyMealPlan {
    // Analyser l'équilibre nutritionnel actuel
    const nutritionByDay = this.groupNutritionByDay(plan.meals);
    
    // Identifier les jours déséquilibrés
    const optimizedMeals = plan.meals.map(meal => {
      const dayNutrition = nutritionByDay[meal.dayOfWeek];
      
      // Si le jour manque de protéines et c'est un repas du soir
      if (dayNutrition.protein < 50 && meal.mealType === 'dinner') {
        // Augmenter légèrement les portions pour plus de protéines
        return {
          ...meal,
          servings: meal.servings + 1,
          nutritionalInfo: {
            ...meal.nutritionalInfo,
            protein: meal.nutritionalInfo.protein * 1.2
          }
        };
      }
      
      return meal;
    });
    
    // Recalculer le résumé nutritionnel
    const newNutritionalSummary = this.recalculateNutritionalSummary(optimizedMeals);
    
    return {
      ...plan,
      meals: optimizedMeals,
      nutritionalSummary: newNutritionalSummary
    };
  }
  
  private optimizeTimeLocally(plan: WeeklyMealPlan): WeeklyMealPlan {
    // Identifier les jours chargés (temps total > 90 min)
    const timeByDay = this.groupTimeByDay(plan.meals);
    
    const optimizedMeals = plan.meals.map(meal => {
      const dayTime = timeByDay[meal.dayOfWeek];
      
      // Si le jour est trop chargé et c'est un plat complexe
      if (dayTime > 90 && (meal.prepTime + meal.cookTime) > 45) {
        // Proposer une version simplifiée (fictive pour l'instant)
        return {
          ...meal,
          recipeName: meal.recipeName + ' (version express)',
          prepTime: Math.floor(meal.prepTime * 0.7),
          cookTime: Math.floor(meal.cookTime * 0.8)
        };
      }
      
      return meal;
    });
    
    return {
      ...plan,
      meals: optimizedMeals
    };
  }
  
  /**
   * Helpers
   */
  
  private extractCuisineFromMeal(meal: MealPlanEntry): string {
    // Simple extraction basée sur le nom du plat
    const recipeName = meal.recipeName.toLowerCase();
    
    if (recipeName.includes('pasta') || recipeName.includes('pizza')) return 'italienne';
    if (recipeName.includes('curry') || recipeName.includes('dal')) return 'indienne';
    if (recipeName.includes('tajine') || recipeName.includes('couscous')) return 'marocaine';
    if (recipeName.includes('wok') || recipeName.includes('sushi')) return 'asiatique';
    
    return 'française'; // Par défaut
  }
  
  private groupNutritionByDay(meals: MealPlanEntry[]): Record<number, any> {
    const byDay: Record<number, any> = {};
    
    for (let day = 0; day < 7; day++) {
      const dayMeals = meals.filter(meal => meal.dayOfWeek === day);
      byDay[day] = {
        calories: dayMeals.reduce((sum, meal) => sum + meal.nutritionalInfo.calories, 0),
        protein: dayMeals.reduce((sum, meal) => sum + meal.nutritionalInfo.protein, 0),
        carbs: dayMeals.reduce((sum, meal) => sum + meal.nutritionalInfo.carbs, 0),
        fat: dayMeals.reduce((sum, meal) => sum + meal.nutritionalInfo.fat, 0)
      };
    }
    
    return byDay;
  }
  
  private groupTimeByDay(meals: MealPlanEntry[]): Record<number, number> {
    const byDay: Record<number, number> = {};
    
    for (let day = 0; day < 7; day++) {
      const dayMeals = meals.filter(meal => meal.dayOfWeek === day);
      byDay[day] = dayMeals.reduce(
        (sum, meal) => sum + meal.prepTime + meal.cookTime, 0
      );
    }
    
    return byDay;
  }
  
  private recalculateNutritionalSummary(meals: MealPlanEntry[]): any {
    const totalNutrition = meals.reduce((acc, meal) => ({
      calories: acc.calories + meal.nutritionalInfo.calories,
      protein: acc.protein + meal.nutritionalInfo.protein,
      carbs: acc.carbs + meal.nutritionalInfo.carbs,
      fat: acc.fat + meal.nutritionalInfo.fat
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    
    const totalCalories = totalNutrition.calories;
    const proteinPercentage = (totalNutrition.protein * 4 / totalCalories) * 100;
    const carbsPercentage = (totalNutrition.carbs * 4 / totalCalories) * 100;
    const fatPercentage = (totalNutrition.fat * 9 / totalCalories) * 100;
    
    return {
      totalCalories,
      averageDailyCalories: Math.round(totalCalories / 7),
      macroDistribution: {
        protein: { grams: totalNutrition.protein, percentage: proteinPercentage },
        carbs: { grams: totalNutrition.carbs, percentage: carbsPercentage },
        fat: { grams: totalNutrition.fat, percentage: fatPercentage }
      },
      micronutrientHighlights: {
        strong: ['Vitamine C', 'Fer'],
        weak: ['Vitamine D']
      },
      varietyScore: this.calculateVarietyScore({ meals } as WeeklyMealPlan) * 100,
      healthScore: this.calculateHealthScore(totalNutrition, meals.length)
    };
  }
  
  private calculateHealthScore(nutrition: any, mealCount: number): number {
    // Score de santé simple basé sur l'équilibre
    const avgCaloriesPerMeal = nutrition.calories / mealCount;
    const idealCaloriesPerMeal = 600;
    const calorieScore = 1 - Math.abs(avgCaloriesPerMeal - idealCaloriesPerMeal) / idealCaloriesPerMeal;
    
    // Vérifier l'équilibre des macros (idéal: 30% protéines, 40% glucides, 30% lipides)
    const proteinCal = nutrition.protein * 4;
    const carbsCal = nutrition.carbs * 4;
    const fatCal = nutrition.fat * 9;
    const totalMacroCal = proteinCal + carbsCal + fatCal;
    
    const proteinRatio = proteinCal / totalMacroCal;
    const carbsRatio = carbsCal / totalMacroCal;
    const fatRatio = fatCal / totalMacroCal;
    
    const macroScore = 
      (1 - Math.abs(proteinRatio - 0.3)) * 0.33 +
      (1 - Math.abs(carbsRatio - 0.4)) * 0.33 +
      (1 - Math.abs(fatRatio - 0.3)) * 0.34;
    
    return Math.round((calorieScore * 0.5 + macroScore * 0.5) * 100);
  }
  
  /**
   * Obtenir le score d'optimisation d'un plan
   */
  getOptimizationScore(plan: WeeklyMealPlan): OptimizationScore {
    return {
      overall: 0.85,
      nutrition: this.calculateNutritionScore(plan),
      budget: this.calculateBudgetScore(plan),
      variety: this.calculateVarietyScore(plan),
      timeEfficiency: this.calculateTimeScore(plan)
    };
  }
}