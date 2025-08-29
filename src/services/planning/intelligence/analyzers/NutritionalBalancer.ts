/**
 * Nutritional Balancer
 * Analyseur pour l'équilibrage nutritionnel des plans de repas
 */

import { WeeklyMealPlan, MealPlanEntry, NutritionalConstraints } from '../../types';
import { LearnedPreferences, CurrentContext } from '../types';

interface NutritionalAnalysis {
  dailyNutrition: DailyNutrition[];
  weeklyTotals: WeeklyNutrition;
  deficiencies: NutrientDeficiency[];
  excesses: NutrientExcess[];
  recommendations: NutritionalRecommendation[];
  balanceScore: number;
}

interface DailyNutrition {
  day: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  vitamins: Record<string, number>;
  minerals: Record<string, number>;
  balanceScore: number;
}

interface WeeklyNutrition {
  totalCalories: number;
  avgDailyCalories: number;
  macroDistribution: {
    protein: number;
    carbs: number;
    fat: number;
  };
  micronutrients: Record<string, number>;
}

interface NutrientDeficiency {
  nutrient: string;
  currentAmount: number;
  targetAmount: number;
  severity: 'low' | 'medium' | 'high';
  suggestions: string[];
}

interface NutrientExcess {
  nutrient: string;
  currentAmount: number;
  targetAmount: number;
  healthImpact: string;
  suggestions: string[];
}

interface NutritionalRecommendation {
  type: 'add_meal' | 'replace_meal' | 'modify_portion' | 'add_supplement';
  priority: number;
  description: string;
  targetMeal?: string;
  alternatives?: string[];
}

export class NutritionalBalancer {
  private dailyTargets = {
    calories: 2000,
    protein: 150, // grammes
    carbs: 250,
    fat: 75,
    fiber: 25,
    vitamins: {
      'C': 90, // mg
      'D': 20, // μg
      'B12': 2.4, // μg
      'folate': 400 // μg
    },
    minerals: {
      'iron': 18, // mg
      'calcium': 1000, // mg
      'zinc': 11 // mg
    }
  };
  
  /**
   * Analyse l'équilibre nutritionnel d'un plan
   */
  async analyzeNutritionalBalance(
    plan: WeeklyMealPlan,
    preferences: LearnedPreferences,
    context?: CurrentContext
  ): Promise<NutritionalAnalysis> {
    console.log('🥗 Analyzing nutritional balance for plan:', plan.id);
    
    // 1. Calculer la nutrition quotidienne
    const dailyNutrition = await this.calculateDailyNutrition(plan);
    
    // 2. Calculer les totaux hebdomadaires
    const weeklyTotals = this.calculateWeeklyTotals(dailyNutrition);
    
    // 3. Adapter les targets aux préférences utilisateur
    const adaptedTargets = this.adaptTargetsToPreferences(preferences, context);
    
    // 4. Identifier les déficiences
    const deficiencies = this.identifyDeficiencies(weeklyTotals, adaptedTargets);
    
    // 5. Identifier les excès
    const excesses = this.identifyExcesses(weeklyTotals, adaptedTargets);
    
    // 6. Générer des recommandations
    const recommendations = await this.generateNutritionalRecommendations(
      plan,
      deficiencies,
      excesses,
      preferences
    );
    
    // 7. Calculer le score d'équilibre global
    const balanceScore = this.calculateBalanceScore(
      weeklyTotals,
      adaptedTargets,
      deficiencies,
      excesses
    );
    
    return {
      dailyNutrition,
      weeklyTotals,
      deficiencies,
      excesses,
      recommendations,
      balanceScore
    };
  }
  
  /**
   * Calcule la nutrition quotidienne
   */
  private async calculateDailyNutrition(plan: WeeklyMealPlan): Promise<DailyNutrition[]> {
    const dailyNutrition: DailyNutrition[] = [];
    
    // Analyser chaque jour de la semaine (0 = dimanche, 6 = samedi)
    for (let day = 0; day < 7; day++) {
      const dayMeals = plan.meals.filter(meal => meal.dayOfWeek === day);
      
      let dayNutrition = {
        day,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        vitamins: {} as Record<string, number>,
        minerals: {} as Record<string, number>,
        balanceScore: 0
      };
      
      // Sommer la nutrition de tous les repas du jour
      for (const meal of dayMeals) {
        const mealNutrition = await this.getMealNutrition(meal);
        
        dayNutrition.calories += mealNutrition.calories;
        dayNutrition.protein += mealNutrition.protein;
        dayNutrition.carbs += mealNutrition.carbs;
        dayNutrition.fat += mealNutrition.fat;
        dayNutrition.fiber += mealNutrition.fiber;
        
        // Additionner vitamines et minéraux
        Object.entries(mealNutrition.vitamins).forEach(([vitamin, amount]) => {
          dayNutrition.vitamins[vitamin] = (dayNutrition.vitamins[vitamin] || 0) + amount;
        });
        
        Object.entries(mealNutrition.minerals).forEach(([mineral, amount]) => {
          dayNutrition.minerals[mineral] = (dayNutrition.minerals[mineral] || 0) + amount;
        });
      }
      
      // Calculer le score d'équilibre du jour
      dayNutrition.balanceScore = this.calculateDailyBalanceScore(dayNutrition);
      
      dailyNutrition.push(dayNutrition);
    }
    
    return dailyNutrition;
  }
  
  /**
   * Obtient la nutrition d'un repas
   */
  private async getMealNutrition(meal: MealPlanEntry): Promise<any> {
    try {
      // En production, récupérer la vraie nutrition de la recette
      const { data, error } = await supabase
        .from('recipes_catalog')
        .select('nutrition_json')
        .eq('id', meal.recipeId)
        .single();
      
      if (error || !data?.nutrition_json) {
        // Valeurs par défaut si pas de données nutritionnelles
        return this.getDefaultNutrition();
      }
      
      const nutrition = data.nutrition_json;
      
      // Ajuster selon le nombre de portions
      const servingMultiplier = (meal.servings || 4) / 4;
      
      return {
        calories: (nutrition.calories || 0) * servingMultiplier,
        protein: (nutrition.protein || 0) * servingMultiplier,
        carbs: (nutrition.carbs || 0) * servingMultiplier,
        fat: (nutrition.fat || 0) * servingMultiplier,
        fiber: (nutrition.fiber || 0) * servingMultiplier,
        vitamins: this.scaleNutrients(nutrition.vitamins || {}, servingMultiplier),
        minerals: this.scaleNutrients(nutrition.minerals || {}, servingMultiplier)
      };
      
    } catch (error) {
      console.error('Error getting meal nutrition:', error);
      return this.getDefaultNutrition();
    }
  }
  
  /**
   * Calcule les totaux hebdomadaires
   */
  private calculateWeeklyTotals(dailyNutrition: DailyNutrition[]): WeeklyNutrition {
    const totals = dailyNutrition.reduce((acc, day) => {
      acc.calories += day.calories;
      acc.protein += day.protein;
      acc.carbs += day.carbs;
      acc.fat += day.fat;
      acc.fiber += day.fiber;
      
      // Sommer vitamines et minéraux
      Object.entries(day.vitamins).forEach(([vitamin, amount]) => {
        acc.vitamins[vitamin] = (acc.vitamins[vitamin] || 0) + amount;
      });
      
      Object.entries(day.minerals).forEach(([mineral, amount]) => {
        acc.minerals[mineral] = (acc.minerals[mineral] || 0) + amount;
      });
      
      return acc;
    }, {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      vitamins: {} as Record<string, number>,
      minerals: {} as Record<string, number>
    });
    
    const totalMacros = totals.protein * 4 + totals.carbs * 4 + totals.fat * 9;
    
    return {
      totalCalories: totals.calories,
      avgDailyCalories: totals.calories / 7,
      macroDistribution: {
        protein: (totals.protein * 4) / totalMacros,
        carbs: (totals.carbs * 4) / totalMacros,
        fat: (totals.fat * 9) / totalMacros
      },
      micronutrients: {
        ...totals.vitamins,
        ...totals.minerals,
        fiber: totals.fiber
      }
    };
  }
  
  /**
   * Adapte les targets nutritionnels aux préférences
   */
  private adaptTargetsToPreferences(
    preferences: LearnedPreferences,
    context?: CurrentContext
  ): any {
    const baseTargets = { ...this.dailyTargets };
    
    // Ajuster selon les tendances nutritionnelles
    const { nutritionalTendencies } = preferences;
    
    if (nutritionalTendencies.averageCaloriesPerMeal) {
      baseTargets.calories = nutritionalTendencies.averageCaloriesPerMeal * 3; // 3 repas par jour
    }
    
    // Ajuster la distribution des macros
    const { macroDistribution } = nutritionalTendencies;
    const totalCalories = baseTargets.calories;
    
    baseTargets.protein = (totalCalories * macroDistribution.protein) / 4; // 4 cal/g
    baseTargets.carbs = (totalCalories * macroDistribution.carbs) / 4;
    baseTargets.fat = (totalCalories * macroDistribution.fat) / 9; // 9 cal/g
    
    // Ajustements contextuels
    if (context?.healthGoals?.active) {
      // Ajustements pour objectifs santé spécifiques
      if (context.healthGoals.targets?.weightLoss) {
        baseTargets.calories *= 0.85; // Réduction calorique
        baseTargets.protein *= 1.2; // Augmentation protéines
      }
      
      if (context.healthGoals.targets?.muscleGain) {
        baseTargets.protein *= 1.5; // Beaucoup plus de protéines
        baseTargets.calories *= 1.1; // Légère augmentation calorique
      }
    }
    
    return baseTargets;
  }
  
  /**
   * Identifie les déficiences nutritionnelles
   */
  private identifyDeficiencies(
    weeklyNutrition: WeeklyNutrition,
    targets: any
  ): NutrientDeficiency[] {
    const deficiencies: NutrientDeficiency[] = [];
    const weeklyTargets = this.convertToWeeklyTargets(targets);
    
    // Vérifier les macronutriments
    const macros = [
      { name: 'calories', current: weeklyNutrition.totalCalories, target: weeklyTargets.calories },
      { name: 'protein', current: weeklyNutrition.avgDailyCalories * weeklyNutrition.macroDistribution.protein / 4 * 7, target: weeklyTargets.protein },
      { name: 'fiber', current: weeklyNutrition.micronutrients.fiber || 0, target: weeklyTargets.fiber }
    ];
    
    macros.forEach(macro => {
      const deficitRatio = macro.current / macro.target;
      
      if (deficitRatio < 0.8) { // Déficit de plus de 20%
        deficiencies.push({
          nutrient: macro.name,
          currentAmount: macro.current,
          targetAmount: macro.target,
          severity: deficitRatio < 0.6 ? 'high' : deficitRatio < 0.7 ? 'medium' : 'low',
          suggestions: this.getNutrientSuggestions(macro.name)
        });
      }
    });
    
    // Vérifier les micronutriments
    Object.entries(weeklyTargets.vitamins).forEach(([vitamin, target]) => {
      const current = weeklyNutrition.micronutrients[vitamin] || 0;
      const ratio = current / target;
      
      if (ratio < 0.7) {
        deficiencies.push({
          nutrient: `vitamin_${vitamin}`,
          currentAmount: current,
          targetAmount: target,
          severity: ratio < 0.5 ? 'high' : ratio < 0.6 ? 'medium' : 'low',
          suggestions: this.getVitaminSuggestions(vitamin)
        });
      }
    });
    
    return deficiencies;
  }
  
  /**
   * Identifie les excès nutritionnels
   */
  private identifyExcesses(
    weeklyNutrition: WeeklyNutrition,
    targets: any
  ): NutrientExcess[] {
    const excesses: NutrientExcess[] = [];
    const weeklyTargets = this.convertToWeeklyTargets(targets);
    
    // Vérifier les excès caloriques
    if (weeklyNutrition.totalCalories > weeklyTargets.calories * 1.2) {
      excesses.push({
        nutrient: 'calories',
        currentAmount: weeklyNutrition.totalCalories,
        targetAmount: weeklyTargets.calories,
        healthImpact: 'Risque de prise de poids',
        suggestions: [
          'Réduire les portions',
          'Choisir des repas moins caloriques',
          'Augmenter les légumes'
        ]
      });
    }
    
    // Vérifier l'excès de graisses saturées
    const fatCalories = weeklyNutrition.avgDailyCalories * weeklyNutrition.macroDistribution.fat * 7;
    if (fatCalories / weeklyTargets.calories > 0.35) { // Plus de 35% des calories en graisse
      excesses.push({
        nutrient: 'fat',
        currentAmount: fatCalories / 9,
        targetAmount: weeklyTargets.fat,
        healthImpact: 'Risque cardiovasculaire accru',
        suggestions: [
          'Réduire les fritures',
          'Choisir des protéines maigres',
          'Utiliser des modes de cuisson plus sains'
        ]
      });
    }
    
    return excesses;
  }
  
  /**
   * Génère des recommandations nutritionnelles
   */
  private async generateNutritionalRecommendations(
    plan: WeeklyMealPlan,
    deficiencies: NutrientDeficiency[],
    excesses: NutrientExcess[],
    preferences: LearnedPreferences
  ): Promise<NutritionalRecommendation[]> {
    const recommendations: NutritionalRecommendation[] = [];
    let priority = 1;
    
    // Recommandations pour les déficiences importantes
    const highDeficiencies = deficiencies.filter(d => d.severity === 'high');
    
    for (const deficiency of highDeficiencies) {
      if (deficiency.nutrient === 'protein') {
        const proteinRichMeals = await this.findProteinRichAlternatives(plan, preferences);
        
        recommendations.push({
          type: 'replace_meal',
          priority: priority++,
          description: `Ajouter plus de protéines (manque ${(deficiency.targetAmount - deficiency.currentAmount).toFixed(0)}g)`,
          alternatives: proteinRichMeals
        });
      }
      
      if (deficiency.nutrient === 'fiber') {
        recommendations.push({
          type: 'add_meal',
          priority: priority++,
          description: 'Ajouter des légumes riches en fibres ou des légumineuses',
          alternatives: ['salade de lentilles', 'légumes grillés', 'soupe de légumes']
        });
      }
      
      if (deficiency.nutrient.startsWith('vitamin_')) {
        const vitamin = deficiency.nutrient.replace('vitamin_', '');
        recommendations.push({
          type: 'modify_portion',
          priority: priority++,
          description: `Augmenter les aliments riches en vitamine ${vitamin}`,
          alternatives: this.getVitaminRichFoods(vitamin)
        });
      }
    }
    
    // Recommandations pour les excès
    for (const excess of excesses) {
      if (excess.nutrient === 'calories') {
        recommendations.push({
          type: 'modify_portion',
          priority: priority++,
          description: 'Réduire les portions ou choisir des alternatives moins caloriques',
          alternatives: await this.findLowerCalorieAlternatives(plan, preferences)
        });
      }
      
      if (excess.nutrient === 'fat') {
        recommendations.push({
          type: 'replace_meal',
          priority: priority++,
          description: 'Remplacer par des repas moins gras',
          alternatives: await this.findLowFatAlternatives(plan, preferences)
        });
      }
    }
    
    // Recommandations d'équilibrage général
    const imbalancedDays = await this.findImbalancedDays(plan);
    for (const day of imbalancedDays) {
      recommendations.push({
        type: 'add_meal',
        priority: priority++,
        description: `Équilibrer la nutrition du ${this.getDayName(day.day)}`,
        targetMeal: day.suggestion
      });
    }
    
    return recommendations.sort((a, b) => a.priority - b.priority);
  }
  
  /**
   * Calcule le score d'équilibre quotidien
   */
  private calculateDailyBalanceScore(dayNutrition: DailyNutrition): number {
    let score = 1.0;
    
    // Pénaliser si trop éloigné des targets
    const targets = this.dailyTargets;
    
    // Score calories (±20% acceptable)
    const calorieRatio = dayNutrition.calories / targets.calories;
    if (calorieRatio < 0.8 || calorieRatio > 1.2) {
      score -= Math.abs(calorieRatio - 1) * 0.3;
    }
    
    // Score protéines (minimum 80% du target)
    const proteinRatio = dayNutrition.protein / targets.protein;
    if (proteinRatio < 0.8) {
      score -= (0.8 - proteinRatio) * 0.4;
    }
    
    // Score équilibre macros
    const totalCalories = dayNutrition.calories;
    if (totalCalories > 0) {
      const proteinPercent = (dayNutrition.protein * 4) / totalCalories;
      const carbsPercent = (dayNutrition.carbs * 4) / totalCalories;
      const fatPercent = (dayNutrition.fat * 9) / totalCalories;
      
      // Ranges idéaux: protéines 15-25%, glucides 45-65%, lipides 20-35%
      if (proteinPercent < 0.15 || proteinPercent > 0.25) score -= 0.1;
      if (carbsPercent < 0.45 || carbsPercent > 0.65) score -= 0.1;
      if (fatPercent < 0.20 || fatPercent > 0.35) score -= 0.1;
    }
    
    // Score fibres
    const fiberRatio = dayNutrition.fiber / targets.fiber;
    if (fiberRatio < 0.7) {
      score -= (0.7 - fiberRatio) * 0.2;
    }
    
    return Math.max(0, Math.min(score, 1));
  }
  
  /**
   * Calcule le score d'équilibre global
   */
  private calculateBalanceScore(
    weeklyNutrition: WeeklyNutrition,
    targets: any,
    deficiencies: NutrientDeficiency[],
    excesses: NutrientExcess[]
  ): number {
    let score = 1.0;
    
    // Pénaliser selon les déficiences
    const highDeficiencies = deficiencies.filter(d => d.severity === 'high').length;
    const mediumDeficiencies = deficiencies.filter(d => d.severity === 'medium').length;
    
    score -= highDeficiencies * 0.15;
    score -= mediumDeficiencies * 0.08;
    
    // Pénaliser selon les excès
    score -= excesses.length * 0.1;
    
    // Bonus pour équilibre des macros
    const { macroDistribution } = weeklyNutrition;
    const idealDistribution = { protein: 0.2, carbs: 0.55, fat: 0.25 };
    
    const macroBalance = 1 - (
      Math.abs(macroDistribution.protein - idealDistribution.protein) +
      Math.abs(macroDistribution.carbs - idealDistribution.carbs) +
      Math.abs(macroDistribution.fat - idealDistribution.fat)
    ) / 2;
    
    score = (score + macroBalance) / 2;
    
    return Math.max(0, Math.min(score, 1));
  }
  
  /**
   * Trouve des alternatives riches en protéines
   */
  private async findProteinRichAlternatives(
    plan: WeeklyMealPlan,
    preferences: LearnedPreferences
  ): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('recipes_catalog')
        .select('id, title, nutrition_json')
        .not('nutrition_json', 'is', null)
        .limit(50);
      
      if (error || !data) return [];
      
      // Filtrer les recettes riches en protéines (>25g par portion)
      const proteinRich = data
        .filter(recipe => {
          const nutrition = recipe.nutrition_json;
          return nutrition && nutrition.protein >= 25;
        })
        .sort((a, b) => b.nutrition_json.protein - a.nutrition_json.protein)
        .slice(0, 10)
        .map(recipe => recipe.title);
      
      return proteinRich;
      
    } catch (error) {
      console.error('Error finding protein alternatives:', error);
      return ['Saumon grillé', 'Poulet aux légumes', 'Tofu sauté', 'Lentilles curry'];
    }
  }
  
  /**
   * Trouve des alternatives moins caloriques
   */
  private async findLowerCalorieAlternatives(
    plan: WeeklyMealPlan,
    preferences: LearnedPreferences
  ): Promise<string[]> {
    // Mock - en production, rechercher dans la base
    return [
      'Salade composée',
      'Légumes vapeur',
      'Poisson blanc grillé',
      'Soupe de légumes',
      'Omelette aux légumes'
    ];
  }
  
  /**
   * Trouve des alternatives moins grasses
   */
  private async findLowFatAlternatives(
    plan: WeeklyMealPlan,
    preferences: LearnedPreferences
  ): Promise<string[]> {
    return [
      'Poisson blanc à la vapeur',
      'Blanc de poulet grillé',
      'Légumineuses',
      'Quinoa aux légumes',
      'Salade de fruits de mer'
    ];
  }
  
  /**
   * Trouve les jours déséquilibrés
   */
  private async findImbalancedDays(plan: WeeklyMealPlan): Promise<any[]> {
    const dailyNutrition = await this.calculateDailyNutrition(plan);
    
    return dailyNutrition
      .filter(day => day.balanceScore < 0.7)
      .map(day => ({
        day: day.day,
        score: day.balanceScore,
        suggestion: this.getSuggestionForImbalancedDay(day)
      }));
  }
  
  /**
   * Génère une suggestion pour un jour déséquilibré
   */
  private getSuggestionForImbalancedDay(day: DailyNutrition): string {
    const totalCalories = day.calories;
    
    if (totalCalories === 0) {
      return 'Ajouter des repas pour ce jour';
    }
    
    const proteinPercent = (day.protein * 4) / totalCalories;
    const carbsPercent = (day.carbs * 4) / totalCalories;
    const fatPercent = (day.fat * 9) / totalCalories;
    
    if (proteinPercent < 0.15) {
      return 'Ajouter une source de protéines';
    }
    
    if (day.fiber < this.dailyTargets.fiber * 0.7) {
      return 'Ajouter des légumes ou légumineuses riches en fibres';
    }
    
    if (fatPercent > 0.35) {
      return 'Réduire les matières grasses ou choisir des alternatives plus légères';
    }
    
    if (carbsPercent < 0.45) {
      return 'Ajouter des glucides complexes (céréales complètes)';
    }
    
    return 'Équilibrer les macronutriments';
  }
  
  /**
   * Optimise un plan pour l'équilibre nutritionnel
   */
  async optimizeNutritionalBalance(
    plan: WeeklyMealPlan,
    preferences: LearnedPreferences,
    context?: CurrentContext
  ): Promise<WeeklyMealPlan> {
    const analysis = await this.analyzeNutritionalBalance(plan, preferences, context);
    
    // Si le score est déjà bon, pas besoin d'optimiser
    if (analysis.balanceScore >= 0.8) {
      return plan;
    }
    
    const optimizedPlan = { ...plan };
    
    // Appliquer les recommandations prioritaires
    const highPriorityRecs = analysis.recommendations
      .filter(rec => rec.priority <= 3)
      .slice(0, 5); // Limiter à 5 modifications max
    
    for (const recommendation of highPriorityRecs) {
      switch (recommendation.type) {
        case 'replace_meal':
          await this.applyMealReplacement(optimizedPlan, recommendation);
          break;
          
        case 'add_meal':
          await this.applyMealAddition(optimizedPlan, recommendation);
          break;
          
        case 'modify_portion':
          await this.applyPortionModification(optimizedPlan, recommendation);
          break;
      }
    }
    
    return optimizedPlan;
  }
  
  /**
   * Méthodes utilitaires
   */
  
  private scaleNutrients(nutrients: Record<string, number>, multiplier: number): Record<string, number> {
    const scaled: Record<string, number> = {};
    
    Object.entries(nutrients).forEach(([nutrient, amount]) => {
      scaled[nutrient] = amount * multiplier;
    });
    
    return scaled;
  }
  
  private getDefaultNutrition(): any {
    return {
      calories: 400,
      protein: 20,
      carbs: 50,
      fat: 15,
      fiber: 8,
      vitamins: { C: 30, D: 5 },
      minerals: { iron: 5, calcium: 200 }
    };
  }
  
  private convertToWeeklyTargets(dailyTargets: any): any {
    return {
      calories: dailyTargets.calories * 7,
      protein: dailyTargets.protein * 7,
      carbs: dailyTargets.carbs * 7,
      fat: dailyTargets.fat * 7,
      fiber: dailyTargets.fiber * 7,
      vitamins: Object.fromEntries(
        Object.entries(dailyTargets.vitamins).map(([k, v]) => [k, (v as number) * 7])
      ),
      minerals: Object.fromEntries(
        Object.entries(dailyTargets.minerals).map(([k, v]) => [k, (v as number) * 7])
      )
    };
  }
  
  private getNutrientSuggestions(nutrient: string): string[] {
    const suggestions: Record<string, string[]> = {
      protein: ['Ajouter du poisson', 'Inclure des légumineuses', 'Augmenter les portions de viande'],
      fiber: ['Choisir des céréales complètes', 'Ajouter plus de légumes', 'Inclure des fruits'],
      calories: ['Ajouter des collations saines', 'Augmenter les portions', 'Inclure des féculents']
    };
    
    return suggestions[nutrient] || ['Consulter un nutritionniste'];
  }
  
  private getVitaminSuggestions(vitamin: string): string[] {
    const suggestions: Record<string, string[]> = {
      C: ['Agrumes', 'Poivrons', 'Brocolis', 'Fraises'],
      D: ['Poissons gras', 'Œufs', 'Champignons', 'Exposition solaire'],
      B12: ['Viandes', 'Poissons', 'Produits laitiers', 'Œufs'],
      folate: ['Légumes verts', 'Légumineuses', 'Céréales enrichies']
    };
    
    return suggestions[vitamin] || ['Aliments enrichis'];
  }
  
  private getVitaminRichFoods(vitamin: string): string[] {
    return this.getVitaminSuggestions(vitamin);
  }
  
  private getDayName(day: number): string {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return days[day] || 'Jour inconnu';
  }
  
  private async applyMealReplacement(
    plan: WeeklyMealPlan,
    recommendation: NutritionalRecommendation
  ): Promise<void> {
    // Mock - en production, remplacer effectivement les repas
    console.log('Applying meal replacement:', recommendation);
  }
  
  private async applyMealAddition(
    plan: WeeklyMealPlan,
    recommendation: NutritionalRecommendation
  ): Promise<void> {
    // Mock - en production, ajouter des repas/collations
    console.log('Applying meal addition:', recommendation);
  }
  
  private async applyPortionModification(
    plan: WeeklyMealPlan,
    recommendation: NutritionalRecommendation
  ): Promise<void> {
    // Mock - en production, modifier les portions
    console.log('Applying portion modification:', recommendation);
  }
}

// Export singleton instance
export const nutritionalBalancer = new NutritionalBalancer();