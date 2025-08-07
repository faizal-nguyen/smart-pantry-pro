/**
 * Smart Meal Planner Service - Evolution V2
 * Advanced meal planning with AI optimization, budget constraints, and nutritional goals
 */

import { StreamingAIService } from '@/services/ai/streamingAIService';
import { UserHealthProfile } from '@/services/ai/nutritionalAIService';

export interface UserPreferences {
  userId: string;
  dietaryRestrictions: string[];
  allergies: string[];
  cuisinePreferences: string[];
  cookingSkillLevel: 'beginner' | 'intermediate' | 'advanced';
  timeConstraints: {
    maxPrepTime: number; // minutes
    maxCookTime: number; // minutes
    busyDays: string[]; // days of week
  };
  familySize: number;
  budgetConstraints: {
    weeklyBudget: number;
    strictMode: boolean;
  };
  nutritionalGoals: {
    targetCalories?: number;
    macroRatios?: {
      protein: number;
      carbs: number;
      fat: number;
    };
  };
  equipmentAvailable: string[];
  shoppingPreferences: {
    preferLocal: boolean;
    organicPreference: 'none' | 'some' | 'all';
    maxTripFrequency: number; // times per week
  };
}

export interface WeeklyMealPlan {
  id: string;
  userId: string;
  weekStartDate: Date;
  meals: MealPlanEntry[];
  totalEstimatedCost: number;
  nutritionalSummary: WeeklyNutritionSummary;
  shoppingList: OptimizedShoppingList;
  alternativeOptions: AlternativeMeal[];
  createdAt: Date;
  status: 'draft' | 'active' | 'completed';
}

export interface MealPlanEntry {
  id: string;
  dayOfWeek: number; // 0-6
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeId: string;
  recipeName: string;
  servings: number;
  estimatedCost: number;
  prepTime: number;
  cookTime: number;
  nutritionalInfo: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  requiredIngredients: PlanningIngredient[];
  missingIngredients: PlanningIngredient[];
  confidence: number; // 0-1, how well it matches preferences
}

export interface PlanningIngredient {
  name: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  category: string;
  alternatives?: string[];
  seasonality: 'in_season' | 'out_of_season' | 'year_round';
}

export interface OptimizedShoppingList {
  totalCost: number;
  estimatedSavings: number;
  items: ShoppingListItem[];
  storeRecommendations: StoreRecommendation[];
  bulkBuyingOpportunities: BulkBuyItem[];
  seasonalSubstitutions: SeasonalSubstitution[];
}

export interface ShoppingListItem {
  ingredient: PlanningIngredient;
  totalQuantityNeeded: number;
  consolidatedUnit: string;
  estimatedUnitPrice: number;
  totalCost: number;
  priority: 'essential' | 'preferred' | 'optional';
  storeSection: string;
  bestStoresToBuy: string[];
  couponsAvailable?: Coupon[];
}

export interface StoreRecommendation {
  storeName: string;
  totalCost: number;
  itemsAvailable: number;
  distance?: number;
  specialOffers: string[];
}

export interface BulkBuyItem {
  ingredient: string;
  normalQuantity: number;
  bulkQuantity: number;
  normalCost: number;
  bulkCost: number;
  savings: number;
  storageRecommendations: string;
}

export interface SeasonalSubstitution {
  originalIngredient: string;
  substitute: string;
  reason: string;
  costDifference: number;
  nutritionalImpact: string;
}

export interface Coupon {
  description: string;
  discount: number;
  expiryDate: Date;
  minPurchase?: number;
}

export interface WeeklyNutritionSummary {
  totalCalories: number;
  averageDailyCalories: number;
  macroDistribution: {
    protein: { grams: number; percentage: number };
    carbs: { grams: number; percentage: number };
    fat: { grams: number; percentage: number };
  };
  micronutrientHighlights: {
    strong: string[]; // nutrients well-covered
    weak: string[]; // nutrients lacking
  };
  varietyScore: number; // 0-100
  healthScore: number; // 0-100
}

export interface AlternativeMeal {
  originalMealId: string;
  alternativeRecipeId: string;
  alternativeRecipeName: string;
  reason: string;
  costDifference: number;
  nutritionalDifference: string;
  confidence: number;
}

export interface Budget {
  weeklyLimit: number;
  monthlyLimit: number;
  strictMode: boolean;
  categoryLimits?: {
    proteins: number;
    produce: number;
    dairy: number;
    pantryItems: number;
  };
}

export interface AdjustedMealPlan extends WeeklyMealPlan {
  budgetAdjustments: BudgetAdjustment[];
  removedMeals: MealPlanEntry[];
  suggestedSubstitutions: MealSubstitution[];
}

export interface BudgetAdjustment {
  type: 'ingredient_substitution' | 'portion_reduction' | 'meal_replacement' | 'store_change';
  description: string;
  costSaved: number;
  impactLevel: 'low' | 'medium' | 'high';
}

export interface MealSubstitution {
  originalRecipe: string;
  suggestedRecipe: string;
  reason: string;
  costSavings: number;
  nutritionalImpact: string;
}

export interface Season {
  name: 'spring' | 'summer' | 'fall' | 'winter';
  months: number[];
}

export interface SeasonalRecommendations {
  season: Season;
  featuredIngredients: string[];
  featuredRecipes: string[];
  budgetTips: string[];
  nutritionalFocus: string[];
}

export class SmartMealPlannerService extends StreamingAIService {
  /**
   * Generate optimized weekly meal plan
   */
  async generateWeeklyPlan(
    preferences: UserPreferences,
    healthProfile?: UserHealthProfile,
    currentInventory: any[] = []
  ): Promise<WeeklyMealPlan> {
    const systemPrompt = this.buildMealPlanningPrompt(preferences, healthProfile);
    
    const userMessage = `
Créer un plan de repas optimal pour la semaine basé sur:

**CONTRAINTES:**
- Budget hebdomadaire: ${preferences.budgetConstraints.weeklyBudget}€
- Famille de ${preferences.familySize} personnes  
- Temps de préparation max: ${preferences.timeConstraints.maxPrepTime} min
- Niveau culinaire: ${preferences.cookingSkillLevel}
- Allergies: ${preferences.allergies.join(', ') || 'Aucune'}
- Restrictions: ${preferences.dietaryRestrictions.join(', ') || 'Aucune'}

**INVENTAIRE DISPONIBLE:**
${currentInventory.map(item => `${item.quantity} ${item.unit} de ${item.product?.name}`).join('\n') || 'Inventaire vide'}

**OBJECTIFS:**
1. Respecter le budget strict: ${preferences.budgetConstraints.strictMode}
2. Optimiser l'utilisation de l'inventaire existant
3. Équilibrer la nutrition selon le profil santé
4. Minimiser le gaspillage alimentaire
5. Varier les plats et cuisines

Générer un plan complet avec liste de courses optimisée et alternatives.
`;

    try {
      const response = await this.chat(systemPrompt, userMessage);
      return this.parseMealPlan(response, preferences);
    } catch (error) {
      console.error('Meal planning failed:', error);
      throw error;
    }
  }

  /**
   * Optimize shopping list with bulk buying and seasonal considerations
   */
  async optimizeShoppingList(
    mealPlan: WeeklyMealPlan,
    preferences: UserPreferences
  ): Promise<OptimizedShoppingList> {
    // Group ingredients by category and consolidate quantities
    const consolidatedIngredients = this.consolidateIngredients(mealPlan.meals);
    
    // Apply seasonal optimizations
    const seasonallyOptimized = await this.applySeasonalOptimizations(
      consolidatedIngredients, 
      this.getCurrentSeason()
    );
    
    // Calculate bulk buying opportunities
    const bulkOpportunities = this.calculateBulkBuyingOpportunities(
      seasonallyOptimized,
      preferences.familySize
    );
    
    // Estimate store-specific pricing and recommendations
    const storeRecommendations = await this.generateStoreRecommendations(
      seasonallyOptimized,
      preferences.shoppingPreferences
    );
    
    // Calculate total costs and savings
    const totalCost = seasonallyOptimized.reduce((sum, item) => sum + item.totalCost, 0);
    const estimatedSavings = bulkOpportunities.reduce((sum, bulk) => sum + bulk.savings, 0);
    
    return {
      totalCost: Math.round(totalCost * 100) / 100,
      estimatedSavings: Math.round(estimatedSavings * 100) / 100,
      items: seasonallyOptimized,
      storeRecommendations,
      bulkBuyingOpportunities: bulkOpportunities,
      seasonalSubstitutions: await this.getSeasonalSubstitutions(consolidatedIngredients)
    };
  }

  /**
   * Adapt meal plan to budget constraints
   */
  async adaptToBudget(
    plan: WeeklyMealPlan,
    budget: Budget
  ): Promise<AdjustedMealPlan> {
    const currentCost = plan.totalEstimatedCost;
    const weeklyLimit = budget.weeklyLimit;
    
    if (currentCost <= weeklyLimit) {
      return {
        ...plan,
        budgetAdjustments: [],
        removedMeals: [],
        suggestedSubstitutions: []
      };
    }
    
    const overbudget = currentCost - weeklyLimit;
    const adjustments: BudgetAdjustment[] = [];
    const substitutions: MealSubstitution[] = [];
    let adjustedMeals = [...plan.meals];
    let savedAmount = 0;
    
    // Strategy 1: Replace expensive ingredients with cheaper alternatives
    for (const meal of adjustedMeals) {
      if (savedAmount >= overbudget) break;
      
      const expensiveIngredients = meal.requiredIngredients
        .filter(ing => ing.estimatedCost > 5)
        .sort((a, b) => b.estimatedCost - a.estimatedCost);
      
      for (const ingredient of expensiveIngredients) {
        const alternative = await this.findCheaperAlternative(ingredient);
        if (alternative && (ingredient.estimatedCost - alternative.estimatedCost) > 1) {
          const savings = ingredient.estimatedCost - alternative.estimatedCost;
          savedAmount += savings;
          
          adjustments.push({
            type: 'ingredient_substitution',
            description: `Remplacer ${ingredient.name} par ${alternative.name}`,
            costSaved: savings,
            impactLevel: savings > 3 ? 'high' : 'medium'
          });
          
          if (savedAmount >= overbudget) break;
        }
      }
    }
    
    // Strategy 2: Replace expensive meals with budget-friendly alternatives
    if (savedAmount < overbudget) {
      const expensiveMeals = adjustedMeals
        .filter(meal => meal.estimatedCost > 8)
        .sort((a, b) => b.estimatedCost - a.estimatedCost);
      
      for (const meal of expensiveMeals) {
        if (savedAmount >= overbudget) break;
        
        const budgetAlternative = await this.findBudgetMealAlternative(meal, budget);
        if (budgetAlternative) {
          const savings = meal.estimatedCost - budgetAlternative.estimatedCost;
          savedAmount += savings;
          
          substitutions.push({
            originalRecipe: meal.recipeName,
            suggestedRecipe: budgetAlternative.recipeName,
            reason: 'Budget optimization',
            costSavings: savings,
            nutritionalImpact: 'Minimal impact on nutrition'
          });
          
          // Replace meal in adjusted plan
          const mealIndex = adjustedMeals.findIndex(m => m.id === meal.id);
          if (mealIndex !== -1) {
            adjustedMeals[mealIndex] = budgetAlternative;
          }
        }
      }
    }
    
    // Recalculate total cost
    const newTotalCost = adjustedMeals.reduce((sum, meal) => sum + meal.estimatedCost, 0);
    
    return {
      ...plan,
      meals: adjustedMeals,
      totalEstimatedCost: Math.round(newTotalCost * 100) / 100,
      budgetAdjustments: adjustments,
      removedMeals: [],
      suggestedSubstitutions: substitutions
    };
  }

  /**
   * Get seasonal recommendations
   */
  async seasonalOptimization(season: Season): Promise<SeasonalRecommendations> {
    const seasonalData = this.getSeasonalData(season);
    
    return {
      season,
      featuredIngredients: seasonalData.ingredients,
      featuredRecipes: seasonalData.recipes,
      budgetTips: seasonalData.budgetTips,
      nutritionalFocus: seasonalData.nutritionalFocus
    };
  }

  /**
   * Build meal planning system prompt
   */
  private buildMealPlanningPrompt(
    preferences: UserPreferences, 
    healthProfile?: UserHealthProfile
  ): string {
    return `Tu es un chef nutritionniste expert spécialisé dans la planification de repas optimisée.

**EXPERTISE:**
- Planification nutritionnelle personnalisée
- Optimisation budgétaire et anti-gaspillage  
- Adaptation aux contraintes familiales
- Cuisine française et internationale
- Gestion des allergies et restrictions

**PROFIL UTILISATEUR:**
- Famille: ${preferences.familySize} personnes
- Niveau culinaire: ${preferences.cookingSkillLevel}
- Budget hebdomadaire: ${preferences.budgetConstraints.weeklyBudget}€ ${preferences.budgetConstraints.strictMode ? '(strict)' : '(flexible)'}
- Temps max préparation: ${preferences.timeConstraints.maxPrepTime} min
- Temps max cuisson: ${preferences.timeConstraints.maxCookTime} min
- Allergies: ${preferences.allergies.join(', ') || 'Aucune'}
- Restrictions: ${preferences.dietaryRestrictions.join(', ') || 'Aucune'}
- Équipements: ${preferences.equipmentAvailable.join(', ') || 'Équipement standard'}

${healthProfile ? `**OBJECTIFS SANTÉ:**
- Âge: ${healthProfile.age} ans, ${healthProfile.gender}
- Poids: ${healthProfile.weight} kg, Taille: ${healthProfile.height} cm
- Activité: ${healthProfile.activityLevel}
- Objectifs: ${healthProfile.goals.map(g => g.type).join(', ')}` : ''}

**MISSION:**
1. Créer un plan de 7 jours équilibré et varié
2. Respecter IMPÉRATIVEMENT le budget
3. Optimiser l'utilisation de l'inventaire existant
4. Proposer 3 repas principaux + 1 collation par jour
5. Calculer précisément les coûts et nutrition
6. Générer une liste de courses optimisée
7. Prévoir des alternatives pour flexibilité

**STRATÉGIES D'OPTIMISATION:**
- Utiliser les ingrédients de saison (moins chers)
- Privilégier les achats en vrac pour économies
- Planifier les restes et transformations
- Équilibrer protéines animales/végétales
- Adapter les portions selon la famille
- Recommander les meilleurs magasins

Format de réponse: JSON structuré avec plan détaillé, coûts, nutrition et alternatives.`;
  }

  /**
   * Parse meal plan from AI response
   */
  private parseMealPlan(response: string, preferences: UserPreferences): WeeklyMealPlan {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.validateAndEnrichMealPlan(parsed, preferences);
      }
      
      // Fallback: create basic plan
      return this.createFallbackMealPlan(preferences);
    } catch (error) {
      console.warn('Failed to parse meal plan, using fallback:', error);
      return this.createFallbackMealPlan(preferences);
    }
  }

  /**
   * Validate and enrich parsed meal plan
   */
  private validateAndEnrichMealPlan(
    parsed: any, 
    preferences: UserPreferences
  ): WeeklyMealPlan {
    // Ensure all required fields exist and add computed fields
    const enriched: WeeklyMealPlan = {
      id: parsed.id || crypto.randomUUID(),
      userId: preferences.userId,
      weekStartDate: new Date(),
      meals: parsed.meals || [],
      totalEstimatedCost: parsed.totalEstimatedCost || 50,
      nutritionalSummary: parsed.nutritionalSummary || this.createDefaultNutritionSummary(),
      shoppingList: parsed.shoppingList || this.createEmptyShoppingList(),
      alternativeOptions: parsed.alternativeOptions || [],
      createdAt: new Date(),
      status: 'draft'
    };
    
    return enriched;
  }

  /**
   * Create fallback meal plan when parsing fails
   */
  private createFallbackMealPlan(preferences: UserPreferences): WeeklyMealPlan {
    const basicMeals: MealPlanEntry[] = [];
    
    // Create 7 days of basic meals
    for (let day = 0; day < 7; day++) {
      // Breakfast
      basicMeals.push({
        id: crypto.randomUUID(),
        dayOfWeek: day,
        mealType: 'breakfast',
        recipeId: 'fallback-breakfast',
        recipeName: 'Petit-déjeuner équilibré',
        servings: preferences.familySize,
        estimatedCost: 3,
        prepTime: 10,
        cookTime: 5,
        nutritionalInfo: { calories: 300, protein: 15, carbs: 40, fat: 10 },
        requiredIngredients: [],
        missingIngredients: [],
        confidence: 0.7
      });
      
      // Lunch
      basicMeals.push({
        id: crypto.randomUUID(),
        dayOfWeek: day,
        mealType: 'lunch',
        recipeId: 'fallback-lunch',
        recipeName: 'Déjeuner équilibré',
        servings: preferences.familySize,
        estimatedCost: 6,
        prepTime: 20,
        cookTime: 15,
        nutritionalInfo: { calories: 500, protein: 25, carbs: 50, fat: 20 },
        requiredIngredients: [],
        missingIngredients: [],
        confidence: 0.7
      });
      
      // Dinner
      basicMeals.push({
        id: crypto.randomUUID(),
        dayOfWeek: day,
        mealType: 'dinner',
        recipeId: 'fallback-dinner',
        recipeName: 'Dîner équilibré',
        servings: preferences.familySize,
        estimatedCost: 8,
        prepTime: 30,
        cookTime: 25,
        nutritionalInfo: { calories: 600, protein: 30, carbs: 45, fat: 25 },
        requiredIngredients: [],
        missingIngredients: [],
        confidence: 0.7
      });
    }
    
    return {
      id: crypto.randomUUID(),
      userId: preferences.userId,
      weekStartDate: new Date(),
      meals: basicMeals,
      totalEstimatedCost: 119, // 7 days * (3+6+8)
      nutritionalSummary: this.createDefaultNutritionSummary(),
      shoppingList: this.createEmptyShoppingList(),
      alternativeOptions: [],
      createdAt: new Date(),
      status: 'draft'
    };
  }

  /**
   * Helper functions
   */
  private consolidateIngredients(meals: MealPlanEntry[]): ShoppingListItem[] {
    const ingredientMap = new Map<string, ShoppingListItem>();
    
    for (const meal of meals) {
      for (const ingredient of [...meal.requiredIngredients, ...meal.missingIngredients]) {
        const key = ingredient.name.toLowerCase();
        
        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key)!;
          existing.totalQuantityNeeded += ingredient.quantity;
          existing.totalCost += ingredient.estimatedCost;
        } else {
          ingredientMap.set(key, {
            ingredient,
            totalQuantityNeeded: ingredient.quantity,
            consolidatedUnit: ingredient.unit,
            estimatedUnitPrice: ingredient.estimatedCost / ingredient.quantity,
            totalCost: ingredient.estimatedCost,
            priority: 'essential',
            storeSection: ingredient.category || 'Autres',
            bestStoresToBuy: ['Supermarché local']
          });
        }
      }
    }
    
    return Array.from(ingredientMap.values());
  }

  private async applySeasonalOptimizations(
    items: ShoppingListItem[], 
    season: Season
  ): Promise<ShoppingListItem[]> {
    // Apply seasonal price adjustments and substitutions
    return items.map(item => {
      const seasonalMultiplier = this.getSeasonalPriceMultiplier(item.ingredient.name, season);
      return {
        ...item,
        totalCost: item.totalCost * seasonalMultiplier,
        estimatedUnitPrice: item.estimatedUnitPrice * seasonalMultiplier
      };
    });
  }

  private calculateBulkBuyingOpportunities(
    items: ShoppingListItem[], 
    familySize: number
  ): BulkBuyItem[] {
    return items
      .filter(item => item.totalQuantityNeeded * familySize > 2) // Worth buying in bulk
      .map(item => {
        const bulkQuantity = Math.ceil(item.totalQuantityNeeded * 2);
        const bulkDiscount = 0.15; // 15% bulk discount
        const normalCost = item.totalCost;
        const bulkCost = normalCost * bulkQuantity * (1 - bulkDiscount);
        
        return {
          ingredient: item.ingredient.name,
          normalQuantity: item.totalQuantityNeeded,
          bulkQuantity,
          normalCost,
          bulkCost,
          savings: (normalCost * bulkQuantity) - bulkCost,
          storageRecommendations: `Conserver au frais, utiliser dans les ${bulkQuantity > 5 ? 14 : 7} jours`
        };
      })
      .filter(bulk => bulk.savings > 2); // Only suggest if saves more than 2€
  }

  private async generateStoreRecommendations(
    items: ShoppingListItem[], 
    preferences: any
  ): Promise<StoreRecommendation[]> {
    // Mock store recommendations - in production, integrate with store APIs
    const stores = [
      {
        storeName: 'Carrefour',
        totalCost: items.reduce((sum, item) => sum + item.totalCost, 0) * 0.95,
        itemsAvailable: items.length,
        distance: 2.1,
        specialOffers: ['10% sur les fruits et légumes bio', '2+1 gratuit sur les conserves']
      },
      {
        storeName: 'Leclerc',
        totalCost: items.reduce((sum, item) => sum + item.totalCost, 0) * 0.92,
        itemsAvailable: Math.floor(items.length * 0.9),
        distance: 3.5,
        specialOffers: ['15% sur les produits locaux', 'Carte fidélité -5%']
      },
      {
        storeName: 'Marché local',
        totalCost: items.reduce((sum, item) => sum + item.totalCost, 0) * 1.05,
        itemsAvailable: Math.floor(items.length * 0.6),
        distance: 1.2,
        specialOffers: ['Produits ultra-frais', 'Direct producteur']
      }
    ];
    
    return stores.sort((a, b) => {
      if (preferences?.preferLocal) {
        return a.distance - b.distance;
      }
      return a.totalCost - b.totalCost;
    });
  }

  private async getSeasonalSubstitutions(ingredients: ShoppingListItem[]): Promise<SeasonalSubstitution[]> {
    const season = this.getCurrentSeason();
    const substitutions: SeasonalSubstitution[] = [];
    
    // Example seasonal substitutions
    const seasonalSubs = {
      'winter': { 'tomate': 'tomate en conserve', 'salade': 'chou' },
      'summer': { 'chou': 'salade', 'conserve': 'frais' }
    };
    
    const currentSubs = seasonalSubs[season.name as keyof typeof seasonalSubs] || {};
    
    for (const item of ingredients) {
      const substitute = currentSubs[item.ingredient.name.toLowerCase() as keyof typeof currentSubs];
      if (substitute) {
        substitutions.push({
          originalIngredient: item.ingredient.name,
          substitute,
          reason: `Meilleur prix en ${season.name}`,
          costDifference: -1.5, // 1.50€ d'économie
          nutritionalImpact: 'Impact nutritionnel minimal'
        });
      }
    }
    
    return substitutions;
  }

  private async findCheaperAlternative(ingredient: PlanningIngredient): Promise<PlanningIngredient | null> {
    // Mock implementation - in production, query ingredient database
    const alternatives: Record<string, Partial<PlanningIngredient>> = {
      'saumon': { name: 'cabillaud', estimatedCost: ingredient.estimatedCost * 0.6 },
      'boeuf': { name: 'porc', estimatedCost: ingredient.estimatedCost * 0.7 },
      'bio': { name: ingredient.name.replace('bio', ''), estimatedCost: ingredient.estimatedCost * 0.8 }
    };
    
    const key = Object.keys(alternatives).find(k => ingredient.name.toLowerCase().includes(k));
    if (key) {
      return {
        ...ingredient,
        ...alternatives[key]
      } as PlanningIngredient;
    }
    
    return null;
  }

  private async findBudgetMealAlternative(meal: MealPlanEntry, budget: Budget): Promise<MealPlanEntry | null> {
    // Mock budget-friendly meal alternatives
    const budgetAlternatives: Record<string, Partial<MealPlanEntry>> = {
      'default': {
        recipeName: 'Pâtes à la sauce tomate',
        estimatedCost: 4,
        nutritionalInfo: { calories: 450, protein: 15, carbs: 70, fat: 12 }
      }
    };
    
    const alternative = budgetAlternatives['default'];
    return {
      ...meal,
      id: crypto.randomUUID(),
      ...alternative
    } as MealPlanEntry;
  }

  private getCurrentSeason(): Season {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return { name: 'spring', months: [2, 3, 4] };
    if (month >= 5 && month <= 7) return { name: 'summer', months: [5, 6, 7] };
    if (month >= 8 && month <= 10) return { name: 'fall', months: [8, 9, 10] };
    return { name: 'winter', months: [11, 0, 1] };
  }

  private getSeasonalData(season: Season) {
    const seasonalData = {
      spring: {
        ingredients: ['asperges', 'radis', 'épinards', 'petits pois', 'fraises'],
        recipes: ['Salade de printemps', 'Risotto aux asperges', 'Tarte aux fraises'],
        budgetTips: ['Profiter des primeurs', 'Éviter les légumes d\'hiver chers'],
        nutritionalFocus: ['Vitamines C', 'Détox', 'Légèreté']
      },
      summer: {
        ingredients: ['tomates', 'courgettes', 'aubergines', 'melons', 'pêches'],
        recipes: ['Ratatouille', 'Gazpacho', 'Salade de fruits'],
        budgetTips: ['Acheter local et de saison', 'Faire des conserves'],
        nutritionalFocus: ['Hydratation', 'Antioxydants', 'Fibres']
      },
      fall: {
        ingredients: ['potiron', 'champignons', 'pommes', 'poires', 'châtaignes'],
        recipes: ['Soupe de potiron', 'Tarte aux pommes', 'Risotto aux champignons'],
        budgetTips: ['Stocks pour l\'hiver', 'Profiter des récoltes'],
        nutritionalFocus: ['Vitamines A', 'Préparation hiver', 'Réconfort']
      },
      winter: {
        ingredients: ['chou', 'poireaux', 'carottes', 'navets', 'agrumes'],
        recipes: ['Pot-au-feu', 'Soupe de légumes', 'Salade d\'hiver'],
        budgetTips: ['Légumes de conservation', 'Plats mijotés économiques'],
        nutritionalFocus: ['Vitamine C', 'Réchauffement', 'Immunité']
      }
    };
    
    return seasonalData[season.name];
  }

  private getSeasonalPriceMultiplier(ingredient: string, season: Season): number {
    // Simplified seasonal pricing - in production, use real market data
    const seasonalPricing = {
      'tomate': { summer: 0.7, winter: 1.4 },
      'courgette': { summer: 0.6, winter: 1.5 },
      'potiron': { fall: 0.8, spring: 1.3 },
      'asperge': { spring: 0.9, winter: 2.0 }
    };
    
    const pricing = seasonalPricing[ingredient.toLowerCase() as keyof typeof seasonalPricing];
    return pricing ? (pricing[season.name as keyof typeof pricing] || 1) : 1;
  }

  private createDefaultNutritionSummary(): WeeklyNutritionSummary {
    return {
      totalCalories: 9800, // ~1400 per day
      averageDailyCalories: 1400,
      macroDistribution: {
        protein: { grams: 490, percentage: 20 },
        carbs: { grams: 1225, percentage: 50 },
        fat: { grams: 327, percentage: 30 }
      },
      micronutrientHighlights: {
        strong: ['Vitamine C', 'Fer', 'Calcium'],
        weak: ['Vitamine D', 'Oméga-3']
      },
      varietyScore: 75,
      healthScore: 80
    };
  }

  private createEmptyShoppingList(): OptimizedShoppingList {
    return {
      totalCost: 0,
      estimatedSavings: 0,
      items: [],
      storeRecommendations: [],
      bulkBuyingOpportunities: [],
      seasonalSubstitutions: []
    };
  }
}

// Export singleton instance
let smartMealPlannerInstance: SmartMealPlannerService | null = null;

export function getSmartMealPlannerService(apiKey: string): SmartMealPlannerService {
  if (!smartMealPlannerInstance || smartMealPlannerInstance['apiKey'] !== apiKey) {
    smartMealPlannerInstance = new SmartMealPlannerService(apiKey);
  }
  return smartMealPlannerInstance;
}