/**
 * Budget Optimizer
 * Optimise les plans de repas selon les contraintes budgétaires
 */

import { WeeklyMealPlan, MealPlanEntry, RecipeCandidate, BudgetConstraints } from '../../types';
import { LearnedPreferences, CurrentContext } from '../types';
import { supabase } from '@/integrations/supabase/client';

interface BudgetAnalysis {
  totalCost: number;
  dailyCosts: DailyCost[];
  budgetUtilization: number;
  costBreakdown: CostBreakdown;
  optimizations: BudgetOptimization[];
  savingsOpportunities: SavingsOpportunity[];
  riskLevel: 'low' | 'medium' | 'high';
}

interface DailyCost {
  day: number;
  dayName: string;
  totalCost: number;
  mealCosts: { mealId: string; cost: number; mealType: string }[];
  budgetShare: number;
}

interface CostBreakdown {
  ingredients: { category: string; cost: number; percentage: number }[];
  mealTypes: { type: string; cost: number; percentage: number }[];
  complexity: { level: string; cost: number; percentage: number }[];
}

interface BudgetOptimization {
  type: 'substitute_ingredient' | 'replace_meal' | 'adjust_portions' | 'bulk_cooking';
  description: string;
  targetMeals: string[];
  potentialSavings: number;
  implementationDifficulty: 'easy' | 'medium' | 'hard';
  priority: number;
}

interface SavingsOpportunity {
  category: string;
  currentSpending: number;
  optimizedSpending: number;
  savings: number;
  actions: string[];
}

export class BudgetOptimizer {
  private ingredientPrices: Map<string, number> = new Map();
  private seasonalPriceFactors: Map<string, number> = new Map();
  private bulkDiscountThreshold = 5; // 5 portions pour déclencher les remises bulk
  
  constructor() {
    this.initializePriceData();
  }
  
  /**
   * Analyse le budget d'un plan de repas
   */
  async analyzeBudget(
    plan: WeeklyMealPlan,
    budgetConstraints: BudgetConstraints,
    preferences: LearnedPreferences,
    context?: CurrentContext
  ): Promise<BudgetAnalysis> {
    console.log('💰 Analyzing budget for plan:', plan.id);
    
    // 1. Calculer le coût total détaillé
    const { totalCost, dailyCosts } = await this.calculateDetailedCosts(plan);
    
    // 2. Analyser l'utilisation du budget
    const budgetUtilization = totalCost / budgetConstraints.weeklyBudget;
    
    // 3. Créer la répartition des coûts
    const costBreakdown = await this.createCostBreakdown(plan, totalCost);
    
    // 4. Identifier les optimisations possibles
    const optimizations = await this.identifyOptimizations(
      plan,
      budgetConstraints,
      preferences,
      totalCost
    );
    
    // 5. Trouver les opportunités d'économies
    const savingsOpportunities = await this.findSavingsOpportunities(
      plan,
      costBreakdown,
      preferences
    );
    
    // 6. Évaluer le niveau de risque budgétaire
    const riskLevel = this.evaluateBudgetRisk(
      budgetUtilization,
      budgetConstraints,
      context
    );
    
    return {
      totalCost,
      dailyCosts,
      budgetUtilization,
      costBreakdown,
      optimizations,
      savingsOpportunities,
      riskLevel
    };
  }
  
  /**
   * Optimise un plan selon le budget
   */
  async optimizeForBudget(
    plan: WeeklyMealPlan,
    budgetConstraints: BudgetConstraints,
    preferences: LearnedPreferences,
    targetSavings?: number
  ): Promise<WeeklyMealPlan> {
    const analysis = await this.analyzeBudget(plan, budgetConstraints, preferences);
    
    // Si le plan respecte déjà le budget, retourner tel quel
    if (analysis.budgetUtilization <= 1.0 && !targetSavings) {
      return plan;
    }
    
    const optimizedPlan = { ...plan };
    const targetReduction = targetSavings || 
      (analysis.totalCost - budgetConstraints.weeklyBudget);
    
    if (targetReduction <= 0) {
      return plan;
    }
    
    // Appliquer les optimisations par ordre de priorité
    let totalSavings = 0;
    const appliedOptimizations = [];
    
    for (const optimization of analysis.optimizations) {
      if (totalSavings >= targetReduction) break;
      
      const result = await this.applyOptimization(optimizedPlan, optimization);
      
      if (result.success) {
        totalSavings += result.savings;
        appliedOptimizations.push(optimization);
        
        console.log(`💡 Applied optimization: ${optimization.description} - Saved €${result.savings.toFixed(2)}`);
      }
    }
    
    // Enregistrer les optimisations appliquées
    optimizedPlan.budgetOptimizations = appliedOptimizations;
    optimizedPlan.estimatedSavings = totalSavings;
    
    return optimizedPlan;
  }
  
  /**
   * Calcule les coûts détaillés
   */
  private async calculateDetailedCosts(plan: WeeklyMealPlan): Promise<{
    totalCost: number;
    dailyCosts: DailyCost[];
  }> {
    const dailyCosts: DailyCost[] = [];
    let totalCost = 0;
    
    // Analyser chaque jour
    for (let day = 0; day < 7; day++) {
      const dayMeals = plan.meals.filter(meal => meal.dayOfWeek === day);
      const mealCosts = [];
      let dayCost = 0;
      
      for (const meal of dayMeals) {
        const mealCost = await this.calculateMealCost(meal);
        mealCosts.push({
          mealId: meal.id,
          cost: mealCost,
          mealType: meal.mealType
        });
        dayCost += mealCost;
      }
      
      dailyCosts.push({
        day,
        dayName: this.getDayName(day),
        totalCost: dayCost,
        mealCosts,
        budgetShare: dayCost / plan.totalEstimatedCost * 100
      });
      
      totalCost += dayCost;
    }
    
    return { totalCost, dailyCosts };
  }
  
  /**
   * Calcule le coût d'un repas
   */
  private async calculateMealCost(meal: MealPlanEntry): Promise<number> {
    try {
      // Récupérer les ingrédients de la recette
      const { data, error } = await supabase
        .from('recipes_catalog')
        .select('ingredients_json')
        .eq('id', meal.recipeId)
        .single();
      
      if (error || !data?.ingredients_json) {
        return meal.estimatedCost || this.getDefaultMealCost(meal);
      }
      
      const ingredients = data.ingredients_json;
      let totalCost = 0;
      
      // Calculer le coût de chaque ingrédient
      for (const ingredient of ingredients) {
        const cost = await this.calculateIngredientCost(
          ingredient,
          meal.servings || 4
        );
        totalCost += cost;
      }
      
      // Ajouter les coûts de base (énergie, temps, etc.)
      const baseCost = 1.5; // Coût de base par repas
      totalCost += baseCost;
      
      return totalCost;
      
    } catch (error) {
      console.error('Error calculating meal cost:', error);
      return meal.estimatedCost || this.getDefaultMealCost(meal);
    }
  }
  
  /**
   * Calcule le coût d'un ingrédient
   */
  private async calculateIngredientCost(ingredient: any, servings: number): Promise<number> {
    const basePrice = this.ingredientPrices.get(ingredient.name?.toLowerCase()) || 2.0;
    const quantity = parseFloat(ingredient.quantity) || 1;
    
    // Facteur saisonnier
    const seasonalFactor = this.seasonalPriceFactors.get(ingredient.name?.toLowerCase()) || 1.0;
    
    // Ajustement pour le nombre de portions
    const portionFactor = servings / 4;
    
    return basePrice * quantity * seasonalFactor * portionFactor;
  }
  
  /**
   * Crée la répartition des coûts
   */
  private async createCostBreakdown(plan: WeeklyMealPlan, totalCost: number): Promise<CostBreakdown> {
    const categoryTotals: Record<string, number> = {};
    const mealTypeTotals: Record<string, number> = {};
    const complexityTotals: Record<string, number> = {};
    
    // Analyser chaque repas
    for (const meal of plan.meals) {
      const mealCost = await this.calculateMealCost(meal);
      
      // Par type de repas
      mealTypeTotals[meal.mealType] = (mealTypeTotals[meal.mealType] || 0) + mealCost;
      
      // Par complexité
      const complexity = await this.getMealComplexity(meal);
      complexityTotals[complexity] = (complexityTotals[complexity] || 0) + mealCost;
      
      // Par catégorie d'ingrédients
      const categories = await this.getMealCategories(meal);
      categories.forEach(category => {
        categoryTotals[category.name] = (categoryTotals[category.name] || 0) + category.cost;
      });
    }
    
    return {
      ingredients: Object.entries(categoryTotals).map(([category, cost]) => ({
        category,
        cost,
        percentage: (cost / totalCost) * 100
      })),
      mealTypes: Object.entries(mealTypeTotals).map(([type, cost]) => ({
        type,
        cost,
        percentage: (cost / totalCost) * 100
      })),
      complexity: Object.entries(complexityTotals).map(([level, cost]) => ({
        level,
        cost,
        percentage: (cost / totalCost) * 100
      }))
    };
  }
  
  /**
   * Identifie les optimisations budgétaires
   */
  private async identifyOptimizations(
    plan: WeeklyMealPlan,
    budgetConstraints: BudgetConstraints,
    preferences: LearnedPreferences,
    totalCost: number
  ): Promise<BudgetOptimization[]> {
    const optimizations: BudgetOptimization[] = [];
    let priority = 1;
    
    // Si le budget est dépassé, optimisations agressives
    if (totalCost > budgetConstraints.weeklyBudget) {
      const excessAmount = totalCost - budgetConstraints.weeklyBudget;
      
      // 1. Remplacer les repas les plus chers
      const expensiveMeals = [...plan.meals]
        .sort((a, b) => (b.estimatedCost || 0) - (a.estimatedCost || 0))
        .slice(0, 3);
      
      optimizations.push({
        type: 'replace_meal',
        description: `Remplacer les repas les plus chers pour économiser €${(excessAmount * 0.6).toFixed(2)}`,
        targetMeals: expensiveMeals.map(m => m.id),
        potentialSavings: excessAmount * 0.6,
        implementationDifficulty: 'medium',
        priority: priority++
      });
      
      // 2. Substitutions d'ingrédients coûteux
      const expensiveIngredients = await this.findExpensiveIngredients(plan);
      
      if (expensiveIngredients.length > 0) {
        optimizations.push({
          type: 'substitute_ingredient',
          description: `Remplacer ${expensiveIngredients.length} ingrédients coûteux`,
          targetMeals: expensiveIngredients.map(ing => ing.mealId),
          potentialSavings: expensiveIngredients.reduce((sum, ing) => sum + ing.savings, 0),
          implementationDifficulty: 'easy',
          priority: priority++
        });
      }
    }
    
    // 3. Opportunités de bulk cooking
    const bulkOpportunities = await this.findBulkCookingOpportunities(plan, preferences);
    
    if (bulkOpportunities.length > 0) {
      optimizations.push({
        type: 'bulk_cooking',
        description: 'Cuisiner en lot pour économiser sur les ingrédients',
        targetMeals: bulkOpportunities.map(opp => opp.mealId),
        potentialSavings: bulkOpportunities.reduce((sum, opp) => sum + opp.savings, 0),
        implementationDifficulty: 'medium',
        priority: priority++
      });
    }
    
    // 4. Ajustements de portions intelligents
    const portionOptimizations = await this.findPortionOptimizations(plan);
    
    if (portionOptimizations.length > 0) {
      optimizations.push({
        type: 'adjust_portions',
        description: 'Ajuster les portions pour réduire le gaspillage',
        targetMeals: portionOptimizations.map(opt => opt.mealId),
        potentialSavings: portionOptimizations.reduce((sum, opt) => sum + opt.savings, 0),
        implementationDifficulty: 'easy',
        priority: priority++
      });
    }
    
    // 5. Optimisations saisonnières
    const seasonalOptimizations = await this.findSeasonalOptimizations(plan);
    
    if (seasonalOptimizations.length > 0) {
      optimizations.push({
        type: 'substitute_ingredient',
        description: 'Utiliser des ingrédients de saison moins chers',
        targetMeals: seasonalOptimizations.map(opt => opt.mealId),
        potentialSavings: seasonalOptimizations.reduce((sum, opt) => sum + opt.savings, 0),
        implementationDifficulty: 'easy',
        priority: priority++
      });
    }
    
    return optimizations.sort((a, b) => a.priority - b.priority);
  }
  
  /**
   * Trouve les opportunités d'économies
   */
  private async findSavingsOpportunities(
    plan: WeeklyMealPlan,
    costBreakdown: CostBreakdown,
    preferences: LearnedPreferences
  ): Promise<SavingsOpportunity[]> {
    const opportunities: SavingsOpportunity[] = [];
    
    // 1. Économies sur les protéines
    const proteinCategory = costBreakdown.ingredients.find(cat => 
      cat.category === 'proteins'
    );
    
    if (proteinCategory && proteinCategory.percentage > 40) {
      const currentSpending = proteinCategory.cost;
      const optimizedSpending = currentSpending * 0.75; // 25% d'économie possible
      
      opportunities.push({
        category: 'Protéines',
        currentSpending,
        optimizedSpending,
        savings: currentSpending - optimizedSpending,
        actions: [
          'Alterner viandes et légumineuses',
          'Acheter en promotion',
          'Privilégier les morceaux moins chers',
          'Cuisiner plus de poisson blanc'
        ]
      });
    }
    
    // 2. Économies sur les repas complexes
    const complexMeals = costBreakdown.complexity.find(comp => 
      comp.level === 'complex'
    );
    
    if (complexMeals && complexMeals.percentage > 30) {
      opportunities.push({
        category: 'Complexité des repas',
        currentSpending: complexMeals.cost,
        optimizedSpending: complexMeals.cost * 0.6,
        savings: complexMeals.cost * 0.4,
        actions: [
          'Simplifier 2-3 recettes par semaine',
          'Utiliser des techniques de batch cooking',
          'Préparer des bases réutilisables'
        ]
      });
    }
    
    // 3. Économies sur les repas du week-end
    const weekendCosts = await this.getWeekendCosts(plan);
    if (weekendCosts > plan.totalEstimatedCost * 0.4) { // Plus de 40% du budget
      opportunities.push({
        category: 'Repas du week-end',
        currentSpending: weekendCosts,
        optimizedSpending: weekendCosts * 0.8,
        savings: weekendCosts * 0.2,
        actions: [
          'Équilibrer les coûts week-end/semaine',
          'Préparer certains plats à l\'avance',
          'Utiliser les restes de la semaine'
        ]
      });
    }
    
    return opportunities.filter(opp => opp.savings >= 2); // Minimum 2€ d'économie
  }
  
  /**
   * Applique une optimisation budgétaire
   */
  private async applyOptimization(
    plan: WeeklyMealPlan,
    optimization: BudgetOptimization
  ): Promise<{ success: boolean; savings: number }> {
    try {
      switch (optimization.type) {
        case 'replace_meal':
          return await this.replaceMealsForBudget(plan, optimization);
          
        case 'substitute_ingredient':
          return await this.substituteExpensiveIngredients(plan, optimization);
          
        case 'adjust_portions':
          return await this.adjustPortionsForBudget(plan, optimization);
          
        case 'bulk_cooking':
          return await this.implementBulkCooking(plan, optimization);
          
        default:
          return { success: false, savings: 0 };
      }
      
    } catch (error) {
      console.error('Error applying optimization:', error);
      return { success: false, savings: 0 };
    }
  }
  
  /**
   * Remplace des repas pour respecter le budget
   */
  private async replaceMealsForBudget(
    plan: WeeklyMealPlan,
    optimization: BudgetOptimization
  ): Promise<{ success: boolean; savings: number }> {
    let totalSavings = 0;
    
    for (const mealId of optimization.targetMeals) {
      const meal = plan.meals.find(m => m.id === mealId);
      if (!meal) continue;
      
      // Chercher une alternative moins chère
      const alternative = await this.findBudgetAlternative(
        meal,
        (meal.estimatedCost || 0) * 0.7 // 30% moins cher
      );
      
      if (alternative) {
        const savings = (meal.estimatedCost || 0) - alternative.estimatedCost;
        totalSavings += savings;
        
        // Remplacer le repas
        const mealIndex = plan.meals.findIndex(m => m.id === mealId);
        if (mealIndex !== -1) {
          plan.meals[mealIndex] = {
            ...alternative,
            budgetOptimization: {
              type: 'meal_replacement',
              originalCost: meal.estimatedCost || 0,
              savings
            }
          };
        }
      }
    }
    
    return {
      success: totalSavings > 0,
      savings: totalSavings
    };
  }
  
  /**
   * Trouve une alternative budgétaire pour un repas
   */
  private async findBudgetAlternative(
    meal: MealPlanEntry,
    targetCost: number
  ): Promise<MealPlanEntry | null> {
    try {
      // Chercher des recettes similaires moins chères
      const { data, error } = await supabase
        .from('recipes_catalog')
        .select('id, title, prep_time, cook_time, difficulty, tags')
        .neq('id', meal.recipeId)
        .limit(20);
      
      if (error || !data) return null;
      
      // Évaluer chaque alternative
      const alternatives = await Promise.all(
        data.map(async recipe => {
          const estimatedCost = await this.estimateRecipeCost(recipe, meal.servings || 4);
          const similarity = this.calculateMealSimilarity(meal, recipe);
          
          return {
            recipe,
            estimatedCost,
            similarity,
            score: similarity * (targetCost / estimatedCost) // Favoriser moins cher + similaire
          };
        })
      );
      
      // Filtrer et trier par score
      const viableAlternatives = alternatives
        .filter(alt => alt.estimatedCost <= targetCost && alt.similarity >= 0.6)
        .sort((a, b) => b.score - a.score);
      
      if (viableAlternatives.length === 0) return null;
      
      const best = viableAlternatives[0];
      
      return {
        ...meal,
        recipeId: best.recipe.id,
        recipeName: best.recipe.title,
        prepTime: best.recipe.prep_time,
        cookTime: best.recipe.cook_time,
        estimatedCost: best.estimatedCost
      };
      
    } catch (error) {
      console.error('Error finding budget alternative:', error);
      return null;
    }
  }
  
  /**
   * Trouve les ingrédients coûteux à substituer
   */
  private async findExpensiveIngredients(plan: WeeklyMealPlan): Promise<any[]> {
    const expensiveIngredients = [];
    
    for (const meal of plan.meals) {
      try {
        const { data, error } = await supabase
          .from('recipes_catalog')
          .select('ingredients_json')
          .eq('id', meal.recipeId)
          .single();
        
        if (error || !data?.ingredients_json) continue;
        
        const ingredients = data.ingredients_json;
        
        for (const ingredient of ingredients) {
          const cost = await this.calculateIngredientCost(ingredient, meal.servings || 4);
          const pricePerUnit = cost / (parseFloat(ingredient.quantity) || 1);
          
          // Si l'ingrédient coûte plus de 3€ par unité
          if (pricePerUnit > 3) {
            const alternatives = await this.findIngredientAlternatives(ingredient);
            
            if (alternatives.length > 0) {
              const bestAlternative = alternatives[0];
              const savings = cost - bestAlternative.cost;
              
              if (savings > 0.5) { // Au moins 0.5€ d'économie
                expensiveIngredients.push({
                  mealId: meal.id,
                  ingredient: ingredient.name,
                  currentCost: cost,
                  alternative: bestAlternative,
                  savings
                });
              }
            }
          }
        }
        
      } catch (error) {
        console.error('Error analyzing meal ingredients:', error);
      }
    }
    
    return expensiveIngredients;
  }
  
  /**
   * Trouve les opportunités de bulk cooking
   */
  private async findBulkCookingOpportunities(
    plan: WeeklyMealPlan,
    preferences: LearnedPreferences
  ): Promise<any[]> {
    const opportunities = [];
    
    // Identifier les recettes qui peuvent être faites en lot
    const bulkSuitableTypes = ['sauce', 'base', 'marinade', 'soupe', 'curry'];
    const bulkMeals = plan.meals.filter(meal => 
      bulkSuitableTypes.some(type => 
        meal.tags?.includes(type) || 
        meal.recipeName.toLowerCase().includes(type)
      )
    );
    
    // Grouper par type de cuisine pour identifier les synergies
    const cuisineGroups: Record<string, MealPlanEntry[]> = {};
    
    bulkMeals.forEach(meal => {
      const cuisine = this.extractCuisine(meal.recipeName);
      if (!cuisineGroups[cuisine]) cuisineGroups[cuisine] = [];
      cuisineGroups[cuisine].push(meal);
    });
    
    // Calculer les économies potentielles
    Object.entries(cuisineGroups).forEach(([cuisine, meals]) => {
      if (meals.length >= 2) {
        const totalCost = meals.reduce((sum, meal) => sum + (meal.estimatedCost || 0), 0);
        const bulkSavings = totalCost * 0.15; // 15% d'économie en bulk
        
        opportunities.push({
          mealId: meals[0].id,
          cuisine,
          mealCount: meals.length,
          savings: bulkSavings,
          difficulty: meals.length > 3 ? 'hard' : 'medium'
        });
      }
    });
    
    return opportunities;
  }
  
  /**
   * Trouve les optimisations de portions
   */
  private async findPortionOptimizations(plan: WeeklyMealPlan): Promise<any[]> {
    const optimizations = [];
    
    // Identifier les repas avec portions potentiellement excessives
    for (const meal of plan.meals) {
      const standardServings = 4;
      const currentServings = meal.servings || standardServings;
      
      // Si plus de 6 portions, proposer réduction
      if (currentServings > 6) {
        const newServings = Math.ceil(currentServings * 0.8); // 20% de réduction
        const costReduction = (meal.estimatedCost || 0) * 0.2;
        
        optimizations.push({
          mealId: meal.id,
          currentServings,
          optimizedServings: newServings,
          savings: costReduction
        });
      }
      
      // Identifier les repas avec ingrédients gaspillés potentiels
      const wasteRisk = await this.assessWasteRisk(meal);
      if (wasteRisk > 0.3) {
        optimizations.push({
          mealId: meal.id,
          type: 'waste_prevention',
          savings: (meal.estimatedCost || 0) * wasteRisk * 0.5
        });
      }
    }
    
    return optimizations.filter(opt => opt.savings >= 1); // Minimum 1€ d'économie
  }
  
  /**
   * Initialise les données de prix
   */
  private initializePriceData(): void {
    // Prix moyens des ingrédients (€/unité standard)
    const prices: [string, number][] = [
      // Protéines
      ['poulet', 8],
      ['bœuf', 15],
      ['porc', 10],
      ['saumon', 20],
      ['thon', 12],
      ['œufs', 3],
      ['tofu', 4],
      ['lentilles', 2],
      
      // Légumes
      ['tomates', 3],
      ['oignons', 1.5],
      ['carottes', 2],
      ['courgettes', 2.5],
      ['poivrons', 4],
      ['brocolis', 3],
      ['épinards', 4],
      
      // Féculents
      ['pâtes', 1.5],
      ['riz', 2],
      ['pommes de terre', 2],
      ['pain', 2.5],
      
      // Produits laitiers
      ['lait', 1.2],
      ['fromage', 8],
      ['yaourt', 3],
      ['beurre', 5],
      
      // Autres
      ['huile d\'olive', 8],
      ['ail', 3],
      ['basilic', 2],
      ['parmesan', 12]
    ];
    
    prices.forEach(([ingredient, price]) => {
      this.ingredientPrices.set(ingredient, price);
    });
    
    // Facteurs saisonniers (1.0 = prix normal, >1.0 = plus cher)
    const currentMonth = new Date().getMonth();
    const seasonalFactors: [string, number][] = [];
    
    // Prix variables selon la saison
    if (currentMonth >= 10 || currentMonth <= 2) { // Hiver
      seasonalFactors.push(
        ['tomates', 1.5],
        ['courgettes', 1.3],
        ['poivrons', 1.4],
        ['agrumes', 0.8]
      );
    } else if (currentMonth >= 3 && currentMonth <= 5) { // Printemps
      seasonalFactors.push(
        ['asperges', 0.9],
        ['radis', 0.8],
        ['épinards', 0.9]
      );
    } else if (currentMonth >= 6 && currentMonth <= 8) { // Été
      seasonalFactors.push(
        ['tomates', 0.7],
        ['courgettes', 0.8],
        ['aubergines', 0.8],
        ['fruits rouges', 0.9]
      );
    } else { // Automne
      seasonalFactors.push(
        ['courges', 0.8],
        ['champignons', 0.9],
        ['pommes', 0.8]
      );
    }
    
    seasonalFactors.forEach(([ingredient, factor]) => {
      this.seasonalPriceFactors.set(ingredient, factor);
    });
  }
  
  /**
   * Estime le coût d'une recette
   */
  private async estimateRecipeCost(recipe: any, servings: number = 4): Promise<number> {
    try {
      let totalCost = 0;
      
      if (recipe.ingredients_json) {
        for (const ingredient of recipe.ingredients_json) {
          totalCost += await this.calculateIngredientCost(ingredient, servings);
        }
      } else {
        // Estimation basée sur la complexité et le type
        const baseCost = recipe.difficulty ? recipe.difficulty * 1.5 : 4;
        totalCost = baseCost * (servings / 4);
      }
      
      return totalCost;
      
    } catch (error) {
      return servings * 2; // Fallback
    }
  }
  
  /**
   * Méthodes utilitaires
   */
  
  private getDefaultMealCost(meal: MealPlanEntry): number {
    const baseCosts: Record<string, number> = {
      breakfast: 3,
      lunch: 6,
      dinner: 8,
      snack: 2
    };
    
    return baseCosts[meal.mealType] || 5;
  }
  
  private async getMealComplexity(meal: MealPlanEntry): Promise<string> {
    try {
      const { data } = await supabase
        .from('recipes_catalog')
        .select('difficulty')
        .eq('id', meal.recipeId)
        .single();
      
      const difficulty = data?.difficulty || 3;
      
      if (difficulty <= 2) return 'simple';
      if (difficulty <= 3) return 'medium';
      return 'complex';
      
    } catch {
      return 'medium';
    }
  }
  
  private async getMealCategories(meal: MealPlanEntry): Promise<any[]> {
    // Mock - en production, analyser les vraies catégories d'ingrédients
    return [
      { name: 'proteins', cost: (meal.estimatedCost || 0) * 0.4 },
      { name: 'vegetables', cost: (meal.estimatedCost || 0) * 0.3 },
      { name: 'grains', cost: (meal.estimatedCost || 0) * 0.2 },
      { name: 'other', cost: (meal.estimatedCost || 0) * 0.1 }
    ];
  }
  
  private evaluateBudgetRisk(
    utilization: number,
    constraints: BudgetConstraints,
    context?: CurrentContext
  ): 'low' | 'medium' | 'high' {
    if (utilization >= 1.1) return 'high'; // Dépassement de 10%
    if (utilization >= 0.9) return 'medium'; // Utilisation de 90%
    return 'low';
  }
  
  private calculateMealSimilarity(meal: MealPlanEntry, recipe: any): number {
    // Mock - calculer la similarité basée sur les tags, temps de prep, etc.
    let similarity = 0.5;
    
    // Similarité de temps de préparation
    const timeDiff = Math.abs((meal.prepTime || 30) - (recipe.prep_time || 30));
    similarity += Math.max(0, (30 - timeDiff) / 30) * 0.3;
    
    // Similarité de difficulté
    const difficultyDiff = Math.abs((meal.difficulty || 3) - (recipe.difficulty || 3));
    similarity += Math.max(0, (3 - difficultyDiff) / 3) * 0.2;
    
    return Math.min(similarity, 1);
  }
  
  private extractCuisine(recipeName: string): string {
    const name = recipeName.toLowerCase();
    
    if (name.includes('pasta') || name.includes('pizza')) return 'italienne';
    if (name.includes('curry') || name.includes('dal')) return 'indienne';
    if (name.includes('wok') || name.includes('sushi')) return 'asiatique';
    if (name.includes('tacos') || name.includes('chili')) return 'mexicaine';
    
    return 'française';
  }
  
  private async getWeekendCosts(plan: WeeklyMealPlan): Promise<number> {
    const weekendMeals = plan.meals.filter(meal => 
      meal.dayOfWeek === 0 || meal.dayOfWeek === 6 // Dimanche et samedi
    );
    
    return weekendMeals.reduce((total, meal) => 
      total + (meal.estimatedCost || 0), 0
    );
  }
  
  private async findIngredientAlternatives(ingredient: any): Promise<any[]> {
    const alternatives: Record<string, any[]> = {
      'saumon': [
        { name: 'truite', cost: 12, nutritionSimilarity: 0.9 },
        { name: 'sardines', cost: 6, nutritionSimilarity: 0.8 }
      ],
      'bœuf': [
        { name: 'porc', cost: 8, nutritionSimilarity: 0.8 },
        { name: 'poulet', cost: 6, nutritionSimilarity: 0.7 }
      ],
      'parmesan': [
        { name: 'gruyère', cost: 8, nutritionSimilarity: 0.8 },
        { name: 'emmental', cost: 6, nutritionSimilarity: 0.7 }
      ]
    };
    
    return alternatives[ingredient.name?.toLowerCase()] || [];
  }
  
  private async assessWasteRisk(meal: MealPlanEntry): Promise<number> {
    // Mock - évaluer le risque de gaspillage
    // En production, basé sur l'historique utilisateur
    return Math.random() * 0.5;
  }
  
  private getDayName(day: number): string {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return days[day] || 'Jour inconnu';
  }
}

// Export singleton instance
export const budgetOptimizer = new BudgetOptimizer();