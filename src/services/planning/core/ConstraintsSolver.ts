/**
 * Constraints Solver
 * Résout les contraintes de planification de repas
 */

import { 
  WeeklyMealPlan,
  PlanningConstraints,
  ConstraintValidation,
  ConstraintViolation,
  MealPlanEntry
} from '../types';

export class ConstraintsSolver {
  /**
   * Valide un plan contre un ensemble de contraintes
   */
  async validate(
    plan: WeeklyMealPlan, 
    constraints: PlanningConstraints
  ): Promise<ConstraintValidation> {
    const violations: ConstraintViolation[] = [];
    const suggestions: string[] = [];
    
    // Valider les contraintes de budget
    const budgetViolations = this.validateBudgetConstraints(plan, constraints.budget);
    violations.push(...budgetViolations);
    
    // Valider les contraintes de temps
    const timeViolations = this.validateTimeConstraints(plan, constraints.time);
    violations.push(...timeViolations);
    
    // Valider les contraintes nutritionnelles
    const nutritionViolations = this.validateNutritionConstraints(plan, constraints.nutrition);
    violations.push(...nutritionViolations);
    
    // Valider les contraintes diététiques
    const dietaryViolations = this.validateDietaryConstraints(plan, constraints.dietary);
    violations.push(...dietaryViolations);
    
    // Valider les contraintes de variété
    const varietyViolations = this.validateVarietyConstraints(plan, constraints.variety);
    violations.push(...varietyViolations);
    
    // Générer des suggestions pour les violations
    if (violations.length > 0) {
      suggestions.push(...this.generateSuggestions(violations, plan));
    }
    
    return {
      isValid: violations.filter(v => v.severity === 'critical').length === 0,
      violations,
      suggestions
    };
  }
  
  /**
   * Validation des contraintes de budget
   */
  private validateBudgetConstraints(
    plan: WeeklyMealPlan, 
    budgetConstraints: PlanningConstraints['budget']
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    
    // Vérifier le budget hebdomadaire
    if (plan.totalEstimatedCost > budgetConstraints.weekly) {
      const overBudget = plan.totalEstimatedCost - budgetConstraints.weekly;
      violations.push({
        constraint: 'weekly_budget',
        message: `Le plan dépasse le budget hebdomadaire de ${overBudget.toFixed(2)}€`,
        severity: budgetConstraints.strict ? 'critical' : 'major',
        data: { 
          actual: plan.totalEstimatedCost, 
          limit: budgetConstraints.weekly,
          overBy: overBudget
        }
      });
    }
    
    // Vérifier le budget journalier si défini
    if (budgetConstraints.daily) {
      const costByDay = this.calculateCostByDay(plan.meals);
      
      Object.entries(costByDay).forEach(([day, cost]) => {
        if (cost > budgetConstraints.daily!) {
          violations.push({
            constraint: 'daily_budget',
            message: `Jour ${this.getDayName(+day)} dépasse le budget journalier`,
            severity: 'minor',
            data: { day: +day, cost, limit: budgetConstraints.daily }
          });
        }
      });
    }
    
    return violations;
  }
  
  /**
   * Validation des contraintes de temps
   */
  private validateTimeConstraints(
    plan: WeeklyMealPlan, 
    timeConstraints: PlanningConstraints['time']
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    
    // Vérifier le temps max par repas
    plan.meals.forEach(meal => {
      const totalTime = meal.prepTime + meal.cookTime;
      
      if (totalTime > timeConstraints.maxPrepTimePerMeal) {
        violations.push({
          constraint: 'max_prep_time_per_meal',
          message: `${meal.recipeName} prend ${totalTime} min (max: ${timeConstraints.maxPrepTimePerMeal})`,
          severity: 'minor',
          data: { meal, totalTime, limit: timeConstraints.maxPrepTimePerMeal }
        });
      }
    });
    
    // Vérifier le temps total par jour
    const timeByDay = this.calculateTimeByDay(plan.meals);
    
    Object.entries(timeByDay).forEach(([day, time]) => {
      if (time > timeConstraints.maxTotalDailyTime) {
        violations.push({
          constraint: 'max_daily_time',
          message: `Jour ${this.getDayName(+day)} nécessite ${time} min de cuisine`,
          severity: 'major',
          data: { day: +day, time, limit: timeConstraints.maxTotalDailyTime }
        });
      }
    });
    
    // Vérifier les jours occupés
    timeConstraints.busyDays.forEach(busyDay => {
      const dayIndex = this.getDayIndex(busyDay);
      const dayTime = timeByDay[dayIndex] || 0;
      
      if (dayTime > 30) { // Max 30 min les jours occupés
        violations.push({
          constraint: 'busy_day_time',
          message: `${busyDay} est un jour chargé mais nécessite ${dayTime} min`,
          severity: 'major',
          data: { day: busyDay, time: dayTime }
        });
      }
    });
    
    return violations;
  }
  
  /**
   * Validation des contraintes nutritionnelles
   */
  private validateNutritionConstraints(
    plan: WeeklyMealPlan, 
    nutritionConstraints: PlanningConstraints['nutrition']
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    
    if (!plan.nutritionalSummary) return violations;
    
    const avgDailyCalories = plan.nutritionalSummary.averageDailyCalories;
    
    // Vérifier les calories minimales
    if (avgDailyCalories < nutritionConstraints.minCaloriesPerDay) {
      violations.push({
        constraint: 'min_calories',
        message: `Apport calorique insuffisant: ${avgDailyCalories} cal/jour`,
        severity: 'critical',
        data: { 
          actual: avgDailyCalories, 
          minimum: nutritionConstraints.minCaloriesPerDay 
        }
      });
    }
    
    // Vérifier les calories maximales
    if (avgDailyCalories > nutritionConstraints.maxCaloriesPerDay) {
      violations.push({
        constraint: 'max_calories',
        message: `Apport calorique excessif: ${avgDailyCalories} cal/jour`,
        severity: 'major',
        data: { 
          actual: avgDailyCalories, 
          maximum: nutritionConstraints.maxCaloriesPerDay 
        }
      });
    }
    
    // Vérifier les ratios de macronutriments si définis
    if (nutritionConstraints.macroTargets) {
      const macros = plan.nutritionalSummary.macroDistribution;
      const targets = nutritionConstraints.macroTargets;
      
      // Tolérance de 10% sur les ratios
      const tolerance = 10;
      
      if (Math.abs(macros.protein.percentage - targets.protein) > tolerance) {
        violations.push({
          constraint: 'macro_protein',
          message: `Protéines: ${macros.protein.percentage.toFixed(0)}% (cible: ${targets.protein}%)`,
          severity: 'minor',
          data: { actual: macros.protein.percentage, target: targets.protein }
        });
      }
    }
    
    return violations;
  }
  
  /**
   * Validation des contraintes diététiques
   */
  private validateDietaryConstraints(
    plan: WeeklyMealPlan, 
    dietaryConstraints: PlanningConstraints['dietary']
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    
    // Pour l'instant, on suppose que les recettes ont déjà été filtrées
    // TODO: Implémenter une vérification plus poussée des ingrédients
    
    return violations;
  }
  
  /**
   * Validation des contraintes de variété
   */
  private validateVarietyConstraints(
    plan: WeeklyMealPlan, 
    varietyConstraints: PlanningConstraints['variety']
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    
    // Compter les répétitions de recettes
    const recipeCount = new Map<string, number>();
    plan.meals.forEach(meal => {
      const count = recipeCount.get(meal.recipeId) || 0;
      recipeCount.set(meal.recipeId, count + 1);
    });
    
    // Vérifier les répétitions maximales
    recipeCount.forEach((count, recipeId) => {
      if (count > varietyConstraints.maxRecipeRepetitionPerWeek) {
        const meal = plan.meals.find(m => m.recipeId === recipeId);
        violations.push({
          constraint: 'max_recipe_repetition',
          message: `"${meal?.recipeName}" apparaît ${count} fois cette semaine`,
          severity: 'minor',
          data: { 
            recipe: meal?.recipeName, 
            count, 
            max: varietyConstraints.maxRecipeRepetitionPerWeek 
          }
        });
      }
    });
    
    // Vérifier la diversité des cuisines
    const cuisines = new Set(
      plan.meals.map(meal => this.extractCuisineFromRecipeName(meal.recipeName))
    );
    
    if (cuisines.size < varietyConstraints.minCuisineTypesPerWeek) {
      violations.push({
        constraint: 'min_cuisine_variety',
        message: `Seulement ${cuisines.size} types de cuisine différents`,
        severity: 'minor',
        data: { 
          actual: cuisines.size, 
          minimum: varietyConstraints.minCuisineTypesPerWeek,
          cuisines: Array.from(cuisines)
        }
      });
    }
    
    return violations;
  }
  
  /**
   * Génère des suggestions pour résoudre les violations
   */
  private generateSuggestions(
    violations: ConstraintViolation[], 
    plan: WeeklyMealPlan
  ): string[] {
    const suggestions: string[] = [];
    
    // Suggestions pour le budget
    const budgetViolations = violations.filter(v => v.constraint.includes('budget'));
    if (budgetViolations.length > 0) {
      suggestions.push('Remplacer quelques recettes par des options plus économiques');
      suggestions.push('Réduire les portions pour les plats les plus chers');
      suggestions.push('Privilégier les ingrédients de saison');
    }
    
    // Suggestions pour le temps
    const timeViolations = violations.filter(v => v.constraint.includes('time'));
    if (timeViolations.length > 0) {
      suggestions.push('Préparer certains plats à l\'avance le weekend');
      suggestions.push('Choisir des recettes plus rapides pour les jours chargés');
      suggestions.push('Utiliser le batch cooking pour gagner du temps');
    }
    
    // Suggestions pour la nutrition
    const nutritionViolations = violations.filter(v => v.constraint.includes('calories') || v.constraint.includes('macro'));
    if (nutritionViolations.length > 0) {
      suggestions.push('Ajuster les portions pour équilibrer l\'apport calorique');
      suggestions.push('Ajouter plus de légumes pour augmenter le volume sans trop de calories');
      suggestions.push('Équilibrer les protéines sur la semaine');
    }
    
    // Suggestions pour la variété
    const varietyViolations = violations.filter(v => v.constraint.includes('variety') || v.constraint.includes('repetition'));
    if (varietyViolations.length > 0) {
      suggestions.push('Explorer de nouvelles recettes chaque semaine');
      suggestions.push('Alterner entre différents types de cuisine');
      suggestions.push('Essayer des variations d\'une même recette');
    }
    
    return suggestions;
  }
  
  /**
   * Helpers
   */
  
  private calculateCostByDay(meals: MealPlanEntry[]): Record<number, number> {
    const costByDay: Record<number, number> = {};
    
    for (let day = 0; day < 7; day++) {
      const dayMeals = meals.filter(meal => meal.dayOfWeek === day);
      costByDay[day] = dayMeals.reduce((sum, meal) => sum + meal.estimatedCost, 0);
    }
    
    return costByDay;
  }
  
  private calculateTimeByDay(meals: MealPlanEntry[]): Record<number, number> {
    const timeByDay: Record<number, number> = {};
    
    for (let day = 0; day < 7; day++) {
      const dayMeals = meals.filter(meal => meal.dayOfWeek === day);
      timeByDay[day] = dayMeals.reduce(
        (sum, meal) => sum + meal.prepTime + meal.cookTime, 0
      );
    }
    
    return timeByDay;
  }
  
  private getDayName(dayIndex: number): string {
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    return days[dayIndex] || `Jour ${dayIndex}`;
  }
  
  private getDayIndex(dayName: string): number {
    const dayMap: Record<string, number> = {
      'monday': 0, 'lundi': 0,
      'tuesday': 1, 'mardi': 1,
      'wednesday': 2, 'mercredi': 2,
      'thursday': 3, 'jeudi': 3,
      'friday': 4, 'vendredi': 4,
      'saturday': 5, 'samedi': 5,
      'sunday': 6, 'dimanche': 6
    };
    
    return dayMap[dayName.toLowerCase()] || 0;
  }
  
  private extractCuisineFromRecipeName(recipeName: string): string {
    const name = recipeName.toLowerCase();
    
    if (name.includes('pasta') || name.includes('pizza') || name.includes('risotto')) {
      return 'italienne';
    }
    if (name.includes('curry') || name.includes('dal') || name.includes('tikka')) {
      return 'indienne';
    }
    if (name.includes('tajine') || name.includes('couscous')) {
      return 'marocaine';
    }
    if (name.includes('wok') || name.includes('sushi') || name.includes('pad thai')) {
      return 'asiatique';
    }
    if (name.includes('tacos') || name.includes('burrito')) {
      return 'mexicaine';
    }
    
    return 'française';
  }
}