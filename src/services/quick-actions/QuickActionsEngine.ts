import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/lib/database.types';

// Types pour le système Quick Actions
interface ActionResult {
  success: boolean;
  data?: any;
  message?: string;
  warnings?: string;
  error?: string;
  metadata?: {
    executionTime?: number;
    itemsProcessed?: number;
    changes?: string[];
  };
}

interface ActionContext {
  userId: string;
  familySize?: number;
  preferences?: UserPreferences;
  currentWeek?: Date;
  triggerMethod?: 'button' | 'shortcut' | 'gesture' | 'voice' | 'auto';
}

interface UserPreferences {
  cuisines: string[];
  dietaryRestrictions: string[];
  budgetConstraints: {
    weeklyBudget: number;
    maxMealCost: number;
  };
  timeConstraints: {
    maxPrepTime: number;
    maxCookTime: number;
  };
  familySize: number;
}

interface WeeklyMealPlan {
  id: string;
  userId: string;
  weekStartDate: Date;
  status: 'draft' | 'active' | 'completed';
  meals: MealPlanEntry[];
  totalEstimatedCost: number;
  nutritionalSummary?: any;
}

interface MealPlanEntry {
  id: string;
  dayOfWeek: number; // 0 = dimanche, 1 = lundi, etc.
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeId: string;
  servings: number;
  estimatedCost: number;
  estimatedTime: number;
  notes?: string;
}

interface Recipe {
  id: string;
  name: string;
  description: string;
  prepTime: number;
  cookTime: number;
  difficulty: string;
  servings: number;
  ingredients: any[];
  instructions: string;
  category?: string;
  tags?: string[];
  nutritionalInfo?: any;
}

// Interface pour les handlers d'actions
abstract class ActionHandler {
  protected supabase: SupabaseClient<Database>;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
  }

  abstract execute(context: ActionContext, params?: any): Promise<ActionResult>;

  protected async getCurrentWeekPlan(userId: string): Promise<WeeklyMealPlan | null> {
    try {
      const weekStart = this.getWeekStart(new Date());
      
      const { data: plan } = await this.supabase
        .from('weekly_meal_plans')
        .select(`
          *,
          meal_plan_entries(*)
        `)
        .eq('user_id', userId)
        .eq('week_start_date', weekStart.toISOString().split('T')[0])
        .single();

      return plan ? this.transformPlanData(plan) : null;
    } catch (error) {
      console.warn('Failed to get current week plan:', error);
      return null;
    }
  }

  protected async getLastCompletedPlan(userId: string): Promise<WeeklyMealPlan | null> {
    try {
      const { data: plan } = await this.supabase
        .from('weekly_meal_plans')
        .select(`
          *,
          meal_plan_entries(*)
        `)
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('week_start_date', { ascending: false })
        .limit(1)
        .single();

      return plan ? this.transformPlanData(plan) : null;
    } catch (error) {
      console.warn('Failed to get last completed plan:', error);
      return null;
    }
  }

  protected getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lundi comme début de semaine
    return new Date(d.setDate(diff));
  }

  protected transformPlanData(plan: any): WeeklyMealPlan {
    return {
      id: plan.id,
      userId: plan.user_id,
      weekStartDate: new Date(plan.week_start_date),
      status: plan.status,
      meals: plan.meal_plan_entries?.map((entry: any) => ({
        id: entry.id,
        dayOfWeek: entry.day_of_week,
        mealType: entry.meal_type,
        recipeId: entry.recipe_id,
        servings: entry.servings,
        estimatedCost: entry.estimated_cost || 0,
        estimatedTime: entry.estimated_time || 0,
        notes: entry.notes
      })) || [],
      totalEstimatedCost: plan.total_estimated_cost || 0,
      nutritionalSummary: plan.nutritional_summary
    };
  }
}

// Handler: Répéter la semaine précédente
class RepeatWeekHandler extends ActionHandler {
  async execute(context: ActionContext, params?: any): Promise<ActionResult> {
    try {
      // 1. Récupérer le dernier plan complet
      const lastPlan = await this.getLastCompletedPlan(context.userId);
      
      if (!lastPlan) {
        return {
          success: false,
          error: 'Aucun plan précédent à répéter',
          message: 'Créez d\'abord un plan de repas pour pouvoir le répéter'
        };
      }

      // 2. Créer un nouveau plan pour la semaine courante
      const currentWeekStart = this.getWeekStart(new Date());
      const newPlan = await this.clonePlanForCurrentWeek(lastPlan, currentWeekStart);

      // 3. Vérifier les disponibilités d'ingrédients
      const availability = await this.checkIngredientsAvailability(newPlan);

      // 4. Ajuster les portions si nécessaire pour la famille
      if (context.familySize && context.familySize !== lastPlan.meals[0]?.servings) {
        await this.adjustPortionsForFamily(newPlan.id, context.familySize);
      }

      return {
        success: true,
        data: newPlan,
        message: `Plan du ${lastPlan.weekStartDate.toLocaleDateString('fr-FR')} répété pour cette semaine`,
        warnings: availability.missing.length > 0 
          ? `Ingrédients manquants: ${availability.missing.slice(0, 3).join(', ')}${availability.missing.length > 3 ? '...' : ''}`
          : undefined,
        metadata: {
          executionTime: Date.now(),
          itemsProcessed: lastPlan.meals.length,
          changes: [`${lastPlan.meals.length} repas clonés`, 'Portions ajustées']
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la répétition',
        message: 'Impossible de répéter le plan précédent'
      };
    }
  }

  private async clonePlanForCurrentWeek(originalPlan: WeeklyMealPlan, weekStart: Date): Promise<WeeklyMealPlan> {
    // Créer le nouveau plan principal
    const { data: newPlan, error: planError } = await this.supabase
      .from('weekly_meal_plans')
      .insert({
        user_id: originalPlan.userId,
        week_start_date: weekStart.toISOString().split('T')[0],
        status: 'active',
        total_estimated_cost: originalPlan.totalEstimatedCost,
        nutritional_summary: originalPlan.nutritionalSummary
      })
      .select()
      .single();

    if (planError) throw planError;

    // Cloner toutes les entrées de repas
    const mealEntries = originalPlan.meals.map(meal => ({
      meal_plan_id: newPlan.id,
      day_of_week: meal.dayOfWeek,
      meal_type: meal.mealType,
      recipe_id: meal.recipeId,
      servings: meal.servings,
      estimated_cost: meal.estimatedCost,
      estimated_time: meal.estimatedTime,
      notes: meal.notes
    }));

    const { error: entriesError } = await this.supabase
      .from('meal_plan_entries')
      .insert(mealEntries);

    if (entriesError) throw entriesError;

    return {
      ...originalPlan,
      id: newPlan.id,
      weekStartDate: weekStart,
      status: 'active'
    };
  }

  private async checkIngredientsAvailability(plan: WeeklyMealPlan): Promise<{available: string[], missing: string[]}> {
    try {
      // Récupérer tous les ingrédients nécessaires
      const recipeIds = plan.meals.map(meal => meal.recipeId);
      const { data: recipes } = await this.supabase
        .from('recipes_catalog')
        .select('ingredients')
        .in('id', recipeIds);

      const allIngredients = new Set<string>();
      recipes?.forEach(recipe => {
        if (recipe.ingredients) {
          const ingredients = typeof recipe.ingredients === 'string' 
            ? JSON.parse(recipe.ingredients) 
            : recipe.ingredients;
          ingredients.forEach((ing: any) => allIngredients.add(ing.name?.toLowerCase()));
        }
      });

      // Vérifier contre l'inventaire
      const { data: inventory } = await this.supabase
        .from('pantry_items')
        .select('name, quantity')
        .eq('user_id', plan.userId)
        .gt('quantity', 0);

      const available = inventory?.map(item => item.name.toLowerCase()) || [];
      const missing = Array.from(allIngredients).filter(ingredient => 
        !available.some(inv => inv.includes(ingredient))
      );

      return {
        available: available,
        missing: missing
      };
    } catch (error) {
      console.warn('Failed to check ingredients availability:', error);
      return { available: [], missing: [] };
    }
  }

  private async adjustPortionsForFamily(planId: string, familySize: number): Promise<void> {
    const scaleFactor = familySize / 2; // Base 2 personnes
    
    await this.supabase
      .from('meal_plan_entries')
      .update({
        servings: Math.ceil(familySize),
        estimated_cost: Math.round(scaleFactor * 100) / 100 // Ajuster le coût
      })
      .eq('meal_plan_id', planId);
  }
}

// Handler: Mode survie
class SurvivalModeHandler extends ActionHandler {
  async execute(context: ActionContext, params?: any): Promise<ActionResult> {
    try {
      const currentWeekStart = this.getWeekStart(new Date());
      
      // Supprimer le plan existant s'il y en a un
      await this.clearCurrentWeekPlan(context.userId, currentWeekStart);

      // Créer un nouveau plan de survie
      const survivalPlan = await this.createSurvivalPlan(context.userId, currentWeekStart, context.familySize || 2);
      
      return {
        success: true,
        data: survivalPlan,
        message: 'Mode survie activé! Que du simple cette semaine 🏠',
        metadata: {
          executionTime: Date.now(),
          itemsProcessed: 7, // Une semaine de repas
          changes: ['Plan existant remplacé', 'Recettes ultra-simples sélectionnées']
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur mode survie',
        message: 'Impossible d\'activer le mode survie'
      };
    }
  }

  private async createSurvivalPlan(userId: string, weekStart: Date, familySize: number): Promise<WeeklyMealPlan> {
    // Créer le plan principal
    const { data: plan, error: planError } = await this.supabase
      .from('weekly_meal_plans')
      .insert({
        user_id: userId,
        week_start_date: weekStart.toISOString().split('T')[0],
        status: 'active',
        total_estimated_cost: 35.00, // Budget minimaliste
        nutritional_summary: { mode: 'survival', complexity: 'minimal' }
      })
      .select()
      .single();

    if (planError) throw planError;

    // Recettes de survie pour la semaine
    const survivalRecipes = await this.getSurvivalRecipes();
    
    const mealPlan = [
      { day: 1, meal: 'dinner', recipe: survivalRecipes.pasta, cost: 3.50 },
      { day: 2, meal: 'dinner', recipe: survivalRecipes.omelette, cost: 4.00 },
      { day: 3, meal: 'dinner', recipe: survivalRecipes.sandwich, cost: 5.00 },
      { day: 4, meal: 'dinner', recipe: survivalRecipes.pasta, cost: 3.50 }, // Répétition
      { day: 5, meal: 'dinner', recipe: survivalRecipes.takeout, cost: 12.00 }, // On craque le vendredi
      { day: 6, meal: 'dinner', recipe: survivalRecipes.frozenPizza, cost: 4.00 },
      { day: 7, meal: 'dinner', recipe: survivalRecipes.friedRice, cost: 3.00 }
    ];

    // Créer les entrées de repas
    const entries = mealPlan.map(entry => ({
      meal_plan_id: plan.id,
      day_of_week: entry.day,
      meal_type: entry.meal,
      recipe_id: entry.recipe.id,
      servings: familySize,
      estimated_cost: entry.cost * (familySize / 2),
      estimated_time: entry.recipe.time,
      notes: 'Mode survie - ultra simple'
    }));

    const { error: entriesError } = await this.supabase
      .from('meal_plan_entries')
      .insert(entries);

    if (entriesError) throw entriesError;

    return {
      id: plan.id,
      userId,
      weekStartDate: weekStart,
      status: 'active',
      meals: entries.map((entry, index) => ({
        id: `temp-${index}`,
        dayOfWeek: entry.day_of_week,
        mealType: entry.meal_type as any,
        recipeId: entry.recipe_id,
        servings: entry.servings,
        estimatedCost: entry.estimated_cost,
        estimatedTime: entry.estimated_time,
        notes: entry.notes
      })),
      totalEstimatedCost: entries.reduce((sum, entry) => sum + entry.estimated_cost, 0)
    };
  }

  private async getSurvivalRecipes() {
    return {
      pasta: { id: 'survival-pasta', name: 'Pâtes au beurre', time: 10 },
      omelette: { id: 'survival-omelette', name: 'Omelette', time: 8 },
      sandwich: { id: 'survival-sandwich', name: 'Club sandwich', time: 5 },
      takeout: { id: 'survival-takeout', name: 'Commande extérieur', time: 30 },
      frozenPizza: { id: 'survival-pizza', name: 'Pizza surgelée améliorée', time: 15 },
      friedRice: { id: 'survival-rice', name: 'Riz sauté aux restes', time: 12 }
    };
  }

  private async clearCurrentWeekPlan(userId: string, weekStart: Date): Promise<void> {
    const { data: existingPlan } = await this.supabase
      .from('weekly_meal_plans')
      .select('id')
      .eq('user_id', userId)
      .eq('week_start_date', weekStart.toISOString().split('T')[0])
      .single();

    if (existingPlan) {
      await this.supabase
        .from('meal_plan_entries')
        .delete()
        .eq('meal_plan_id', existingPlan.id);

      await this.supabase
        .from('weekly_meal_plans')
        .delete()
        .eq('id', existingPlan.id);
    }
  }
}

// Handler: Vider le frigo
class EmptyFridgeHandler extends ActionHandler {
  async execute(context: ActionContext, params?: any): Promise<ActionResult> {
    try {
      // 1. Récupérer l'inventaire qui expire bientôt
      const expiringItems = await this.getExpiringItems(context.userId);
      
      if (expiringItems.length === 0) {
        return {
          success: true,
          message: 'Aucun produit en péremption imminente trouvé! 👍',
          data: { recipes: [], items: [] }
        };
      }

      // 2. Trouver des recettes utilisant ces ingrédients
      const recipes = await this.findRecipesForIngredients(expiringItems);

      // 3. Créer des suggestions de repas
      const suggestions = await this.createFridgeEmptyingSuggestions(recipes, expiringItems);

      return {
        success: true,
        data: {
          expiringItems,
          recipes,
          suggestions
        },
        message: `${suggestions.length} suggestions pour utiliser ${expiringItems.length} produits qui expirent`,
        metadata: {
          executionTime: Date.now(),
          itemsProcessed: expiringItems.length,
          changes: [`${suggestions.length} recettes suggérées`]
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur vider frigo',
        message: 'Impossible d\'analyser le frigo'
      };
    }
  }

  private async getExpiringItems(userId: string): Promise<Array<{id: string, name: string, quantity: number, expiryDate: string, location: string}>> {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const { data: items } = await this.supabase
      .from('pantry_items')
      .select('id, name, quantity, expiry_date, location')
      .eq('user_id', userId)
      .not('expiry_date', 'is', null)
      .lte('expiry_date', threeDaysFromNow.toISOString())
      .gt('quantity', 0)
      .order('expiry_date', { ascending: true });

    return items?.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      expiryDate: item.expiry_date!,
      location: item.location || 'pantry'
    })) || [];
  }

  private async findRecipesForIngredients(ingredients: Array<{name: string}>): Promise<Recipe[]> {
    try {
      // Chercher dans les templates d'urgence d'abord
      const { data: templates } = await this.supabase
        .from('emergency_meal_templates')
        .select('*')
        .eq('is_active', true)
        .limit(10);

      // Puis dans le catalogue principal
      const { data: catalogRecipes } = await this.supabase
        .from('recipes_catalog')
        .select('*')
        .limit(10);

      const allRecipes = [...(templates || []), ...(catalogRecipes || [])];
      
      return allRecipes
        .map(recipe => this.templateToRecipe(recipe))
        .filter(recipe => this.recipeMatchesIngredients(recipe, ingredients));
    } catch (error) {
      console.warn('Failed to find recipes for ingredients:', error);
      return [];
    }
  }

  private templateToRecipe(template: any): Recipe {
    return {
      id: template.id,
      name: template.name || 'Recette',
      description: template.description || '',
      prepTime: template.max_prep_time || template.prep_time || 15,
      cookTime: template.max_cook_time || template.cook_time || 15,
      difficulty: template.difficulty_level || template.difficulty || 'easy',
      servings: template.serving_size || template.servings || 2,
      ingredients: this.parseIngredients(template.ingredients_required || template.ingredients),
      instructions: template.instructions || '',
      category: template.category || 'emergency'
    };
  }

  private parseIngredients(ingredientsData: any): any[] {
    try {
      if (typeof ingredientsData === 'string') {
        return JSON.parse(ingredientsData);
      }
      return Array.isArray(ingredientsData) ? ingredientsData : [];
    } catch {
      return [];
    }
  }

  private recipeMatchesIngredients(recipe: Recipe, availableIngredients: Array<{name: string}>): boolean {
    const availableNames = availableIngredients.map(ing => ing.name.toLowerCase());
    const recipeIngredients = recipe.ingredients.map((ing: any) => ing.name?.toLowerCase() || '');
    
    // Vérifie si au moins 2 ingrédients de la recette sont disponibles
    const matchCount = recipeIngredients.filter(ing => 
      availableNames.some(available => available.includes(ing) || ing.includes(available))
    ).length;

    return matchCount >= Math.min(2, recipeIngredients.length);
  }

  private async createFridgeEmptyingSuggestions(recipes: Recipe[], expiringItems: Array<{name: string, expiryDate: string}>): Promise<Array<{recipe: Recipe, priority: string, itemsUsed: string[]}>> {
    return recipes.map(recipe => {
      const itemsUsed = expiringItems
        .filter(item => this.recipeUsesIngredient(recipe, item.name))
        .map(item => item.name);

      const urgencyScore = expiringItems
        .filter(item => itemsUsed.includes(item.name))
        .reduce((score, item) => {
          const daysToExpiry = Math.floor((new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          return score + (3 - daysToExpiry); // Plus c'est urgent, plus le score est haut
        }, 0);

      return {
        recipe,
        priority: urgencyScore >= 4 ? 'high' : urgencyScore >= 2 ? 'medium' : 'low',
        itemsUsed
      };
    }).sort((a, b) => {
      const priorityScore = { high: 3, medium: 2, low: 1 };
      return priorityScore[b.priority as keyof typeof priorityScore] - priorityScore[a.priority as keyof typeof priorityScore];
    });
  }

  private recipeUsesIngredient(recipe: Recipe, ingredientName: string): boolean {
    return recipe.ingredients.some((ing: any) => {
      const recipeIngName = ing.name?.toLowerCase() || '';
      const targetName = ingredientName.toLowerCase();
      return recipeIngName.includes(targetName) || targetName.includes(recipeIngName);
    });
  }
}

// Handler: Reset semaine
class ResetWeekHandler extends ActionHandler {
  async execute(context: ActionContext, params?: any): Promise<ActionResult> {
    try {
      const currentWeekStart = this.getWeekStart(new Date());
      
      // Supprimer le plan existant
      await this.clearCurrentWeekPlan(context.userId, currentWeekStart);

      return {
        success: true,
        message: 'Semaine réinitialisée! Vous pouvez créer un nouveau plan ✨',
        data: { weekStart: currentWeekStart },
        metadata: {
          executionTime: Date.now(),
          changes: ['Plan actuel supprimé', 'Semaine prête pour nouveau plan']
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur reset',
        message: 'Impossible de réinitialiser la semaine'
      };
    }
  }

  private async clearCurrentWeekPlan(userId: string, weekStart: Date): Promise<void> {
    const { data: existingPlan } = await this.supabase
      .from('weekly_meal_plans')
      .select('id')
      .eq('user_id', userId)
      .eq('week_start_date', weekStart.toISOString().split('T')[0])
      .single();

    if (existingPlan) {
      await this.supabase
        .from('meal_plan_entries')
        .delete()
        .eq('meal_plan_id', existingPlan.id);

      await this.supabase
        .from('weekly_meal_plans')
        .delete()
        .eq('id', existingPlan.id);
    }
  }
}

// Handler: Suggestion IA
class SmartSuggestHandler extends ActionHandler {
  async execute(context: ActionContext, params?: any): Promise<ActionResult> {
    try {
      // Analyser le contexte utilisateur
      const userContext = await this.analyzeUserContext(context.userId);
      
      // Générer des suggestions IA
      const suggestions = await this.generateSmartSuggestions(userContext, context);

      return {
        success: true,
        data: suggestions,
        message: `${suggestions.length} suggestions IA personnalisées générées 🤖`,
        metadata: {
          executionTime: Date.now(),
          itemsProcessed: suggestions.length,
          changes: ['Analyse contextuelle effectuée', 'Suggestions générées']
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur IA',
        message: 'Impossible de générer les suggestions'
      };
    }
  }

  private async analyzeUserContext(userId: string): Promise<any> {
    // Analyser l'historique des repas, inventaire, préférences
    const [mealHistory, inventory, preferences] = await Promise.all([
      this.getUserMealHistory(userId),
      this.getUserInventory(userId),
      this.getUserPreferences(userId)
    ]);

    return {
      mealHistory,
      inventory,
      preferences,
      analysisTime: new Date()
    };
  }

  private async generateSmartSuggestions(userContext: any, context: ActionContext): Promise<any[]> {
    // IA simple basée sur des règles pour le moment
    const suggestions = [];

    // Suggestion basée sur l'inventaire
    if (userContext.inventory.vegetables.length > 3) {
      suggestions.push({
        type: 'inventory_optimization',
        title: 'Curry de légumes',
        description: 'Utilisez vos légumes variés dans un curry savoureux',
        confidence: 0.85,
        category: 'optimization'
      });
    }

    // Suggestion basée sur l'historique
    if (userContext.mealHistory.popularCuisines.includes('italien')) {
      suggestions.push({
        type: 'preference_based',
        title: 'Risotto aux champignons',
        description: 'Basé sur votre goût pour la cuisine italienne',
        confidence: 0.78,
        category: 'preference'
      });
    }

    // Suggestion saisonnière
    const season = this.getCurrentSeason();
    suggestions.push({
      type: 'seasonal',
      title: `Recette de ${season}`,
      description: `Profitez des produits de saison`,
      confidence: 0.72,
      category: 'seasonal'
    });

    return suggestions;
  }

  private async getUserMealHistory(userId: string): Promise<any> {
    const { data: history } = await this.supabase
      .from('weekly_meal_plans')
      .select('*, meal_plan_entries(*)')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('week_start_date', { ascending: false })
      .limit(4);

    return {
      recentPlans: history?.length || 0,
      popularCuisines: ['italien', 'français'], // Analyse simplifiée
      avgMealsPerWeek: history?.reduce((sum, plan) => sum + (plan.meal_plan_entries?.length || 0), 0) / (history?.length || 1)
    };
  }

  private async getUserInventory(userId: string): Promise<any> {
    const { data: items } = await this.supabase
      .from('pantry_items')
      .select('name, category, quantity')
      .eq('user_id', userId)
      .gt('quantity', 0);

    const byCategory = items?.reduce((acc, item) => {
      const cat = item.category || 'other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item.name);
      return acc;
    }, {} as any) || {};

    return {
      totalItems: items?.length || 0,
      vegetables: byCategory.vegetables || [],
      proteins: byCategory.proteins || [],
      dairy: byCategory.dairy || []
    };
  }

  private async getUserPreferences(userId: string): Promise<any> {
    const { data: prefs } = await this.supabase
      .from('user_meal_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    return prefs || {
      cuisine_preferences: [],
      dietary_restrictions: [],
      max_prep_time: 30
    };
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'printemps';
    if (month >= 5 && month <= 7) return 'été';
    if (month >= 8 && month <= 10) return 'automne';
    return 'hiver';
  }
}

// Handler: Batch Cooking
class BatchCookingHandler extends ActionHandler {
  async execute(context: ActionContext, params?: any): Promise<ActionResult> {
    try {
      const currentPlan = await this.getCurrentWeekPlan(context.userId);
      
      if (!currentPlan) {
        return {
          success: false,
          message: 'Aucun plan de repas actuel trouvé',
          error: 'Créez d\'abord un plan de repas'
        };
      }

      // Analyser les opportunités de batch cooking
      const batchOpportunities = await this.analyzeBatchOpportunities(currentPlan);
      
      // Créer un planning de batch cooking
      const batchSchedule = this.createBatchSchedule(batchOpportunities);

      return {
        success: true,
        data: {
          opportunities: batchOpportunities,
          schedule: batchSchedule,
          estimatedTimeSaved: this.calculateTimeSaved(batchOpportunities)
        },
        message: `${batchOpportunities.length} opportunités de batch cooking identifiées`,
        metadata: {
          executionTime: Date.now(),
          itemsProcessed: batchOpportunities.length,
          changes: [`Planning batch cooking créé`]
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur batch cooking',
        message: 'Impossible d\'organiser le batch cooking'
      };
    }
  }

  private async analyzeBatchOpportunities(plan: WeeklyMealPlan): Promise<any[]> {
    const opportunities = [];

    // Grouper par techniques de cuisson similaires
    const mealsByTechnique = this.groupMealsByTechnique(plan.meals);
    
    for (const [technique, meals] of Object.entries(mealsByTechnique)) {
      if (Array.isArray(meals) && meals.length > 1) {
        opportunities.push({
          type: 'technique',
          technique,
          meals: meals,
          timeSaved: meals.length * 10, // 10 min par repas groupé
          description: `Préparer ensemble: ${meals.map(m => `Jour ${m.dayOfWeek}`).join(', ')}`
        });
      }
    }

    // Chercher les ingrédients communs
    const mealsByIngredient = await this.groupMealsByCommonIngredients(plan.meals);
    
    for (const [ingredient, meals] of Object.entries(mealsByIngredient)) {
      if (Array.isArray(meals) && meals.length > 1) {
        opportunities.push({
          type: 'ingredient',
          ingredient,
          meals: meals,
          timeSaved: 15, // Économie de préparation
          description: `Préparer ${ingredient} en une fois pour ${meals.length} repas`
        });
      }
    }

    return opportunities;
  }

  private groupMealsByTechnique(meals: MealPlanEntry[]): Record<string, MealPlanEntry[]> {
    const techniques: Record<string, MealPlanEntry[]> = {};
    
    meals.forEach(meal => {
      // Déterminer la technique basée sur le temps de cuisson
      let technique = 'mijoté'; // par défaut
      
      if (meal.estimatedTime <= 15) technique = 'sauté';
      else if (meal.estimatedTime <= 30) technique = 'grillé';
      else technique = 'mijoté';

      if (!techniques[technique]) techniques[technique] = [];
      techniques[technique].push(meal);
    });

    return techniques;
  }

  private async groupMealsByCommonIngredients(meals: MealPlanEntry[]): Promise<Record<string, MealPlanEntry[]>> {
    const ingredientGroups: Record<string, MealPlanEntry[]> = {};

    // Récupérer les recettes et leurs ingrédients
    const recipeIds = meals.map(meal => meal.recipeId);
    const { data: recipes } = await this.supabase
      .from('recipes_catalog')
      .select('id, ingredients')
      .in('id', recipeIds);

    // Analyser les ingrédients communs
    const commonIngredients = ['oignon', 'ail', 'tomate', 'carotte', 'pomme de terre'];
    
    commonIngredients.forEach(ingredient => {
      const mealsWithIngredient = meals.filter(meal => {
        const recipe = recipes?.find(r => r.id === meal.recipeId);
        if (!recipe) return false;
        
        const ingredients = this.parseIngredients(recipe.ingredients);
        return ingredients.some((ing: any) => 
          ing.name?.toLowerCase().includes(ingredient.toLowerCase())
        );
      });

      if (mealsWithIngredient.length > 1) {
        ingredientGroups[ingredient] = mealsWithIngredient;
      }
    });

    return ingredientGroups;
  }

  private parseIngredients(ingredientsData: any): any[] {
    try {
      if (typeof ingredientsData === 'string') {
        return JSON.parse(ingredientsData);
      }
      return Array.isArray(ingredientsData) ? ingredientsData : [];
    } catch {
      return [];
    }
  }

  private createBatchSchedule(opportunities: any[]): any[] {
    return opportunities.map((opp, index) => ({
      id: `batch-${index}`,
      day: 'dimanche', // Jour classique de batch cooking
      timeSlot: index === 0 ? 'matin' : 'après-midi',
      task: opp.description,
      estimatedTime: Math.max(30, opp.timeSaved * 2), // Temps de préparation
      benefit: `Économie: ${opp.timeSaved}min en semaine`
    }));
  }

  private calculateTimeSaved(opportunities: any[]): number {
    return opportunities.reduce((total, opp) => total + opp.timeSaved, 0);
  }
}

/**
 * Moteur principal des Quick Actions
 */
export class QuickActionsEngine {
  private actionHandlers: Map<string, ActionHandler>;

  constructor(
    private supabase: SupabaseClient<Database> = supabase
  ) {
    this.registerActionHandlers();
  }

  private registerActionHandlers(): void {
    this.actionHandlers = new Map([
      ['repeat_week', new RepeatWeekHandler(this.supabase)],
      ['survival_mode', new SurvivalModeHandler(this.supabase)],
      ['empty_fridge', new EmptyFridgeHandler(this.supabase)],
      ['reset_week', new ResetWeekHandler(this.supabase)],
      ['smart_suggest', new SmartSuggestHandler(this.supabase)],
      ['batch_cooking', new BatchCookingHandler(this.supabase)]
    ]);
  }

  /**
   * Exécute une quick action avec timeout et logging
   */
  async executeAction(
    actionType: string, 
    context: ActionContext, 
    params?: any
  ): Promise<ActionResult> {
    const startTime = performance.now();
    
    try {
      const handler = this.actionHandlers.get(actionType);
      if (!handler) {
        throw new Error(`Type d'action inconnu: ${actionType}`);
      }

      // Exécuter avec timeout de 10 secondes
      const result = await this.withTimeout(
        handler.execute(context, params),
        10000
      );

      // Logger l'utilisation réussie
      await this.logActionUsage(actionType, context, startTime, true, result);
      
      return result;

    } catch (error) {
      const errorResult: ActionResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        message: 'L\'action a échoué'
      };

      // Logger l'échec
      await this.logActionUsage(actionType, context, startTime, false, errorResult, error as Error);
      
      return errorResult;
    }
  }

  /**
   * Exécute une promesse avec timeout
   */
  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    const timeout = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Action timeout - trop lent')), ms)
    );
    return Promise.race([promise, timeout]);
  }

  /**
   * Enregistre l'utilisation d'une action pour analytics
   */
  private async logActionUsage(
    actionType: string, 
    context: ActionContext, 
    startTime: number, 
    success: boolean, 
    result: ActionResult,
    error?: Error
  ): Promise<void> {
    try {
      const executionTime = Math.floor(performance.now() - startTime);
      
      await this.supabase
        .from('quick_actions_usage')
        .insert({
          user_id: context.userId,
          action_type: actionType,
          execution_time_ms: executionTime,
          success,
          error_message: error?.message || null,
          result_data: success ? result : null,
          trigger_method: context.triggerMethod || 'button',
          family_size: context.familySize || 1
        });
    } catch (logError) {
      console.warn('Failed to log action usage:', logError);
    }
  }

  /**
   * Récupère les statistiques d'utilisation pour un utilisateur
   */
  async getActionStats(userId: string, days: number = 30): Promise<any> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const { data: stats } = await this.supabase
        .from('quick_actions_usage')
        .select('action_type, success, execution_time_ms, trigger_method')
        .eq('user_id', userId)
        .gte('created_at', since.toISOString());

      if (!stats) return {};

      return {
        totalActions: stats.length,
        successRate: stats.filter(s => s.success).length / stats.length,
        averageTime: stats.reduce((sum, s) => sum + s.execution_time_ms, 0) / stats.length,
        mostUsedAction: this.getMostFrequent(stats.map(s => s.action_type)),
        preferredTrigger: this.getMostFrequent(stats.map(s => s.trigger_method)),
        actionBreakdown: this.groupBy(stats, 'action_type')
      };
    } catch (error) {
      console.warn('Failed to get action stats:', error);
      return {};
    }
  }

  private getMostFrequent(arr: string[]): string {
    return arr.sort((a, b) =>
      arr.filter(v => v === a).length - arr.filter(v => v === b).length
    ).pop() || '';
  }

  private groupBy(arr: any[], key: string): Record<string, any[]> {
    return arr.reduce((groups, item) => {
      const group = item[key] || 'unknown';
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
      return groups;
    }, {});
  }

  /**
   * Liste toutes les actions disponibles
   */
  getAvailableActions(): Array<{id: string, name: string, description: string, estimatedTime: string}> {
    return [
      {
        id: 'repeat_week',
        name: 'Répéter semaine',
        description: 'Clone le dernier plan de repas réussi',
        estimatedTime: '< 5s'
      },
      {
        id: 'survival_mode',
        name: 'Mode survie',
        description: 'Plan ultra-simple pour la semaine',
        estimatedTime: '< 3s'
      },
      {
        id: 'empty_fridge',
        name: 'Vider le frigo',
        description: 'Suggestions pour utiliser les produits qui périment',
        estimatedTime: '< 10s'
      },
      {
        id: 'reset_week',
        name: 'Reset semaine',
        description: 'Efface le plan actuel pour repartir à zéro',
        estimatedTime: '< 2s'
      },
      {
        id: 'smart_suggest',
        name: 'Suggestion IA',
        description: 'Recommandations personnalisées par intelligence artificielle',
        estimatedTime: '< 8s'
      },
      {
        id: 'batch_cooking',
        name: 'Batch cooking',
        description: 'Organise la préparation groupée des repas',
        estimatedTime: '< 7s'
      }
    ];
  }
}

// Export de l'instance par défaut
export const quickActionsEngine = new QuickActionsEngine();