import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/lib/database.types';

// Types pour le Panic Engine
interface PanicContext {
  userId: string;
  timeAvailable: number;
  stressLevel: 1 | 2 | 3 | 4 | 5;
  familyMembers: number;
  currentLocation?: { lat: number; lng: number };
  inventory?: InventoryItem[];
  preferences?: UserPreferences;
  triggerType?: 'manual' | 'automatic' | 'time_based' | 'context_based' | 'shake' | 'gesture';
}

interface PanicSolution {
  id: string;
  type: 'instant' | 'delivery' | 'prepared' | 'restaurant';
  title: string;
  description: string;
  timeRequired: number;
  estimatedCost?: number;
  difficulty: 'trivial' | 'easy' | 'medium';
  confidence: number; // 0-100
  steps?: string[];
  ingredients?: Ingredient[];
  restaurant?: RestaurantInfo;
  recipe?: Recipe;
  category?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
  category?: string;
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

interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  alternatives?: string[];
}

interface RestaurantInfo {
  id: string;
  name: string;
  cuisine: string;
  estimatedTime: number;
  estimatedCost: number;
  rating: number;
  distance: number;
}

interface Recipe {
  id: string;
  name: string;
  description: string;
  mainIngredients: string[];
  prepTime: number;
  cookTime: number;
  difficulty: 'trivial' | 'easy' | 'medium' | 'hard';
  steps: string[];
  servings: number;
  ingredients: Ingredient[];
  nutritionalInfo?: any;
}

interface CachedSolution extends PanicSolution {
  validUntil: Date;
  contextHash: string;
}

export class PanicEngine {
  private contextHashCache = new Map<string, string>();
  private solutionCache = new Map<string, CachedSolution[]>();

  constructor(
    private supabaseClient: SupabaseClient<Database> = supabase
  ) {}

  /**
   * Point d'entrée principal - déclenchement du mode panique
   * Garantit une réponse en moins de 30 secondes
   */
  async triggerPanic(context: PanicContext): Promise<PanicSolution[]> {
    const startTime = Date.now();
    
    try {
      // 1. Logger l'événement de panique immédiatement
      const panicEventId = await this.logPanicEvent(context, startTime);
      
      // 2. Vérifier le cache de solutions pré-calculées
      const cachedSolutions = await this.getCachedSolutions(context);
      if (cachedSolutions.length > 0) {
        await this.updatePanicEventResult(panicEventId, cachedSolutions, 'cache', startTime);
        return this.rankSolutions(cachedSolutions, context).slice(0, 3);
      }
      
      // 3. Générer des solutions en parallèle avec timeout de sécurité
      const solutionPromises = [
        this.generateInstantSolutions(context),
        this.generateDeliverySolutions(context),
        this.generatePreparedSolutions(context)
      ];

      // Timeout de sécurité à 25s pour garder 5s de marge
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Solution generation timeout')), 25000)
      );

      const [instant, delivery, prepared] = await Promise.race([
        Promise.all(solutionPromises),
        timeoutPromise
      ]);
      
      // 4. Combiner et ranker toutes les solutions
      const allSolutions = [...instant, ...delivery, ...prepared];
      const rankedSolutions = this.rankSolutions(allSolutions, context);
      
      // 5. Prendre seulement les 3 meilleures
      const top3Solutions = rankedSolutions.slice(0, 3);
      
      // 6. Mettre en cache pour la prochaine fois (arrière-plan)
      this.cacheSolutions(top3Solutions, context).catch(err => 
        console.warn('Cache storage failed:', err)
      );
      
      // 7. Vérifier que nous respectons la contrainte de temps
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime > 30000) {
        console.error(`Panic resolution took ${elapsedTime}ms - using emergency solutions`);
        const emergencySolutions = await this.getEmergencySolutions();
        await this.updatePanicEventResult(panicEventId, emergencySolutions, 'emergency', startTime);
        return emergencySolutions;
      }
      
      // 8. Succès - logger et retourner
      await this.updatePanicEventResult(panicEventId, top3Solutions, 'generated', startTime);
      return top3Solutions;
      
    } catch (error) {
      console.error('Panic engine failed:', error);
      const emergencySolutions = await this.getEmergencySolutions();
      
      // Log de l'erreur
      try {
        await this.logPanicError(context.userId, error as Error, startTime);
      } catch (logError) {
        console.error('Failed to log panic error:', logError);
      }
      
      return emergencySolutions;
    }
  }

  /**
   * Génère des solutions instantanées basées sur l'inventaire et les recettes d'urgence
   */
  private async generateInstantSolutions(context: PanicContext): Promise<PanicSolution[]> {
    const solutions: PanicSolution[] = [];
    
    try {
      // 1. Solutions basées sur l'inventaire disponible
      if (context.inventory && context.inventory.length > 0) {
        const quickRecipes = await this.findQuickRecipesWithIngredients(
          context.inventory,
          context.timeAvailable || 15
        );
        
        for (const recipe of quickRecipes) {
          solutions.push({
            id: `instant-${recipe.id}`,
            type: 'instant',
            title: recipe.name,
            description: `Avec ce que vous avez: ${recipe.mainIngredients.slice(0, 3).join(', ')}`,
            timeRequired: recipe.prepTime + recipe.cookTime,
            difficulty: this.mapRecipeDifficulty(recipe.difficulty),
            confidence: this.calculateRecipeConfidence(recipe, context),
            recipe,
            steps: this.simplifySteps(recipe.steps),
            category: 'inventory-based'
          });
        }
      }
    } catch (error) {
      console.warn('Failed to generate inventory-based solutions:', error);
    }
    
    // 2. Solutions d'urgence universelles (toujours disponibles)
    solutions.push(...this.getUniversalEmergencySolutions(context));
    
    return solutions;
  }

  /**
   * Génère des solutions de livraison basées sur la localisation
   */
  private async generateDeliverySolutions(context: PanicContext): Promise<PanicSolution[]> {
    if (!context.currentLocation) {
      return [];
    }

    try {
      const nearbyOptions = await this.getNearbyDeliveryOptions(
        context.currentLocation,
        {
          maxDeliveryTime: Math.min(context.timeAvailable || 45, 45),
          familySize: context.familyMembers,
          cuisinePreferences: context.preferences?.cuisines || [],
          maxBudget: context.preferences?.budgetConstraints?.maxMealCost
        }
      );
      
      return nearbyOptions.map(option => ({
        id: `delivery-${option.id}`,
        type: 'delivery' as const,
        title: option.name,
        description: `${option.cuisine} - Livraison ${option.estimatedTime}min`,
        timeRequired: option.estimatedTime,
        estimatedCost: option.estimatedCost,
        difficulty: 'trivial' as const,
        confidence: this.calculateDeliveryConfidence(option, context),
        restaurant: option,
        category: 'delivery'
      }));
    } catch (error) {
      console.warn('Failed to generate delivery solutions:', error);
      return [];
    }
  }

  /**
   * Génère des solutions pour plats préparés/congelés
   */
  private async generatePreparedSolutions(context: PanicContext): Promise<PanicSolution[]> {
    try {
      const freezerMeals = await this.getFreezerMeals(context.userId);
      
      return freezerMeals.map(meal => ({
        id: `prepared-${meal.id}`,
        type: 'prepared' as const,
        title: meal.name,
        description: `Au congélateur - ${meal.defrostTime ? `Décongélation ${meal.defrostTime}min` : 'Prêt à réchauffer'}`,
        timeRequired: (meal.defrostTime || 0) + (meal.reheatingTime || 5),
        difficulty: 'trivial' as const,
        confidence: 100, // Les plats préparés sont fiables
        steps: meal.reheatingInstructions || ['Suivre les instructions sur l\'emballage'],
        category: 'prepared'
      }));
    } catch (error) {
      console.warn('Failed to generate prepared solutions:', error);
      return [];
    }
  }

  /**
   * Classe les solutions selon le contexte et les préférences utilisateur
   */
  private rankSolutions(solutions: PanicSolution[], context: PanicContext): PanicSolution[] {
    return solutions.sort((a, b) => {
      const scoreA = this.calculateSolutionScore(a, context);
      const scoreB = this.calculateSolutionScore(b, context);
      return scoreB - scoreA;
    });
  }

  /**
   * Calcule un score pour une solution donnée selon le contexte
   */
  private calculateSolutionScore(solution: PanicSolution, context: PanicContext): number {
    let score = solution.confidence;
    
    // Bonus pour rapidité
    if (solution.timeRequired <= 10) score += 25;
    else if (solution.timeRequired <= 20) score += 15;
    else if (solution.timeRequired <= 30) score += 5;
    
    // Bonus pour simplicité
    if (solution.difficulty === 'trivial') score += 20;
    else if (solution.difficulty === 'easy') score += 10;
    
    // Bonus/malus selon niveau de stress
    if (context.stressLevel >= 4) {
      // Haute stress: favoriser instant et préparé
      if (solution.type === 'instant') score += 30;
      if (solution.type === 'prepared') score += 25;
      if (solution.type === 'delivery') score += 10; // Moins bon car attente
    } else if (context.stressLevel <= 2) {
      // Faible stress: peut accepter plus de complexité
      if (solution.type === 'instant' && solution.difficulty === 'easy') score += 15;
    }
    
    // Malus pour coût élevé
    if (solution.estimatedCost) {
      const budgetLimit = context.preferences?.budgetConstraints?.maxMealCost || 25;
      if (solution.estimatedCost > budgetLimit) score -= 15;
      if (solution.estimatedCost > budgetLimit * 1.5) score -= 30;
    }
    
    // Bonus pour taille de famille
    if (context.familyMembers > 1) {
      if (solution.type === 'delivery') score += 10; // Plus pratique pour familles
      if (solution.type === 'instant' && solution.recipe?.servings && solution.recipe.servings >= context.familyMembers) {
        score += 15;
      }
    }
    
    // Contraintes temporelles
    if (context.timeAvailable && solution.timeRequired > context.timeAvailable) {
      score -= 50; // Forte pénalité si dépasse le temps disponible
    }
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Solutions d'urgence universelles toujours disponibles
   */
  private getUniversalEmergencySolutions(context: PanicContext): PanicSolution[] {
    const baseSolutions: PanicSolution[] = [
      {
        id: 'instant-pasta-aglio',
        type: 'instant',
        title: 'Pâtes Aglio e Olio Express',
        description: 'Pâtes, huile d\'olive, ail - 8 minutes chrono',
        timeRequired: 8,
        difficulty: 'trivial',
        confidence: 95,
        steps: [
          'Faire bouillir l\'eau salée',
          'Cuire les pâtes selon emballage',
          'Faire revenir l\'ail émincé dans l\'huile',
          'Mélanger pâtes + huile, servir avec parmesan'
        ],
        ingredients: [
          { name: 'Pâtes', amount: 100, unit: 'g' },
          { name: 'Huile d\'olive', amount: 3, unit: 'c. à soupe' },
          { name: 'Ail', amount: 2, unit: 'gousses' },
          { name: 'Parmesan', amount: 30, unit: 'g' }
        ],
        category: 'universal'
      },
      {
        id: 'instant-omelette',
        type: 'instant',
        title: 'Omelette Garnie Express',
        description: 'Œufs + tout ce que vous trouvez dans le frigo',
        timeRequired: 6,
        difficulty: 'trivial',
        confidence: 92,
        steps: [
          'Battre 2-3 œufs avec sel et poivre',
          'Ajouter fromage râpé ou jambon si disponible',
          'Cuire dans poêle beurrée 3-4 minutes',
          'Plier en deux et servir'
        ],
        ingredients: [
          { name: 'Œufs', amount: 3, unit: 'pièces' },
          { name: 'Beurre', amount: 1, unit: 'c. à soupe' },
          { name: 'Garniture au choix', amount: 50, unit: 'g' }
        ],
        category: 'universal'
      },
      {
        id: 'instant-sandwich',
        type: 'instant',
        title: 'Sandwich Complet',
        description: 'Pain, garnitures disponibles - 3 minutes',
        timeRequired: 3,
        difficulty: 'trivial',
        confidence: 88,
        steps: [
          'Toaster le pain si souhaité',
          'Tartiner avec beurre/mayo',
          'Ajouter jambon, fromage, salade',
          'Fermer et découper'
        ],
        category: 'universal'
      }
    ];

    // Ajuster selon la taille de famille
    return baseSolutions.map(solution => ({
      ...solution,
      // Multiplier les ingrédients si famille nombreuse
      ingredients: solution.ingredients?.map(ing => ({
        ...ing,
        amount: ing.amount * Math.max(1, Math.floor(context.familyMembers / 2))
      }))
    }));
  }

  /**
   * Solutions d'urgence absolue (dernier recours)
   */
  private async getEmergencySolutions(): Promise<PanicSolution[]> {
    return [
      {
        id: 'emergency-cereals',
        type: 'instant',
        title: 'Céréales ou Tartines',
        description: 'Le classique qui sauve toujours',
        timeRequired: 2,
        difficulty: 'trivial',
        confidence: 100,
        steps: [
          'Sortir céréales et lait',
          'Servir dans un bol',
          'Ou faire des tartines beurre/confiture'
        ],
        category: 'emergency'
      },
      {
        id: 'emergency-order',
        type: 'delivery',
        title: 'Commander une Pizza',
        description: 'Téléphoner à la pizzeria du coin',
        timeRequired: 30,
        difficulty: 'trivial',
        confidence: 95,
        estimatedCost: 15,
        steps: [
          'Chercher le numéro de la pizzeria locale',
          'Téléphoner et commander',
          'Attendre la livraison'
        ],
        category: 'emergency'
      },
      {
        id: 'emergency-ready-meal',
        type: 'instant',
        title: 'Plat Préparé du Commerce',
        description: 'Micro-ondes 3 minutes et c\'est prêt',
        timeRequired: 4,
        difficulty: 'trivial',
        confidence: 90,
        steps: [
          'Sortir plat du frigo/congélateur',
          'Percer film plastique',
          'Micro-ondes selon instructions',
          'Laisser reposer 1 minute'
        ],
        category: 'emergency'
      }
    ];
  }

  // === MÉTHODES UTILITAIRES ===

  private async findQuickRecipesWithIngredients(inventory: InventoryItem[], maxTime: number): Promise<Recipe[]> {
    try {
      // Requête vers la table emergency_meal_templates pour trouver des recettes
      const { data: templates } = await this.supabaseClient
        .from('emergency_meal_templates')
        .select('*')
        .lte('max_prep_time', maxTime)
        .eq('is_active', true)
        .order('success_rate', { ascending: false })
        .limit(5);

      if (!templates) return [];

      // Convertir templates en format Recipe
      return templates.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description || '',
        mainIngredients: this.extractMainIngredients(template.ingredients_required),
        prepTime: template.max_prep_time || 0,
        cookTime: template.max_cook_time || 0,
        difficulty: template.difficulty_level as 'trivial' | 'easy' | 'medium' | 'hard' || 'easy',
        steps: template.instructions?.split('\n') || [],
        servings: template.serving_size || 2,
        ingredients: this.parseIngredientsFromJson(template.ingredients_required)
      }));
    } catch (error) {
      console.warn('Failed to find recipes with ingredients:', error);
      return [];
    }
  }

  private async getNearbyDeliveryOptions(
    location: { lat: number; lng: number },
    options: {
      maxDeliveryTime: number;
      familySize: number;
      cuisinePreferences: string[];
      maxBudget?: number;
    }
  ): Promise<RestaurantInfo[]> {
    // Simulé pour le moment - dans une vraie implémentation, 
    // ceci ferait appel à une API comme Uber Eats, Deliveroo, etc.
    return [
      {
        id: 'pizza-mario',
        name: 'Pizza Mario',
        cuisine: 'Italien',
        estimatedTime: 25,
        estimatedCost: 12 * options.familySize,
        rating: 4.2,
        distance: 1.2
      },
      {
        id: 'sushi-zen',
        name: 'Sushi Zen',
        cuisine: 'Japonais',
        estimatedTime: 30,
        estimatedCost: 18 * options.familySize,
        rating: 4.5,
        distance: 0.8
      },
      {
        id: 'burger-station',
        name: 'Burger Station',
        cuisine: 'Américain',
        estimatedTime: 20,
        estimatedCost: 10 * options.familySize,
        rating: 3.9,
        distance: 1.5
      }
    ].filter(restaurant => {
      // Filtrer par budget
      if (options.maxBudget && restaurant.estimatedCost > options.maxBudget) return false;
      
      // Filtrer par temps de livraison
      if (restaurant.estimatedTime > options.maxDeliveryTime) return false;
      
      // Filtrer par préférences culinaires si spécifiées
      if (options.cuisinePreferences.length > 0) {
        return options.cuisinePreferences.some(pref => 
          restaurant.cuisine.toLowerCase().includes(pref.toLowerCase())
        );
      }
      
      return true;
    });
  }

  private async getFreezerMeals(userId: string): Promise<Array<{
    id: string;
    name: string;
    defrostTime?: number;
    reheatingTime?: number;
    reheatingInstructions?: string[];
  }>> {
    try {
      // Chercher dans l'inventaire les plats préparés congelés
      const { data: freezerItems } = await this.supabaseClient
        .from('pantry_items')
        .select('*')
        .eq('user_id', userId)
        .eq('location', 'freezer')
        .eq('category', 'prepared_meals')
        .gt('quantity', 0);

      if (!freezerItems) return [];

      return freezerItems.map(item => ({
        id: item.id,
        name: item.name,
        defrostTime: 15, // Défaut 15 minutes micro-ondes
        reheatingTime: 5,
        reheatingInstructions: [
          'Retirer du congélateur',
          'Percer le film',
          'Micro-ondes 2min + remuer + 2min',
          'Vérifier température au centre'
        ]
      }));
    } catch (error) {
      console.warn('Failed to get freezer meals:', error);
      return [];
    }
  }

  // === CACHE ET PERFORMANCE ===

  private async getCachedSolutions(context: PanicContext): Promise<PanicSolution[]> {
    try {
      const contextHash = this.generateContextHash(context);
      
      const { data: cachedSolutions } = await this.supabaseClient
        .from('pre_computed_solutions')
        .select('*')
        .eq('user_id', context.userId)
        .eq('context_hash', contextHash)
        .contains('validity_period', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(3);

      if (!cachedSolutions || cachedSolutions.length === 0) return [];

      return cachedSolutions.map(cached => ({
        ...(cached.solution_data as PanicSolution),
        id: `cached-${cached.id}`
      }));
    } catch (error) {
      console.warn('Failed to get cached solutions:', error);
      return [];
    }
  }

  private async cacheSolutions(solutions: PanicSolution[], context: PanicContext): Promise<void> {
    try {
      const contextHash = this.generateContextHash(context);
      const validUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      const cacheEntries = solutions.map(solution => ({
        user_id: context.userId,
        solution_type: solution.type,
        solution_data: solution,
        validity_period: `[${new Date().toISOString()},${validUntil.toISOString()})`,
        context_hash: contextHash,
        context_factors: {
          stressLevel: context.stressLevel,
          timeAvailable: context.timeAvailable,
          familyMembers: context.familyMembers
        },
        generation_cost_ms: Date.now() - performance.now()
      }));

      await this.supabaseClient
        .from('pre_computed_solutions')
        .insert(cacheEntries);
    } catch (error) {
      console.warn('Failed to cache solutions:', error);
    }
  }

  private generateContextHash(context: PanicContext): string {
    const hashInput = JSON.stringify({
      stressLevel: context.stressLevel,
      timeAvailable: context.timeAvailable,
      familyMembers: context.familyMembers,
      location: context.currentLocation ? 
        `${Math.round(context.currentLocation.lat * 100)},${Math.round(context.currentLocation.lng * 100)}` : 
        null,
      inventoryHash: context.inventory ? 
        context.inventory.map(i => i.name).sort().join(',') : 
        null
    });

    // Simple hash function (en production, utiliser crypto.subtle ou similar)
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  // === LOGGING ET ANALYTICS ===

  private async logPanicEvent(context: PanicContext, startTime: number): Promise<string> {
    try {
      const { data, error } = await this.supabaseClient
        .from('panic_events')
        .insert({
          user_id: context.userId,
          trigger_type: context.triggerType || 'manual',
          user_stress_level: context.stressLevel,
          family_members_present: context.familyMembers,
          context_data: {
            timeAvailable: context.timeAvailable,
            hasLocation: !!context.currentLocation,
            inventoryCount: context.inventory?.length || 0,
            hasPreferences: !!context.preferences,
            timestamp: new Date().toISOString()
          }
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Failed to log panic event:', error);
      return 'unknown';
    }
  }

  private async updatePanicEventResult(
    eventId: string, 
    solutions: PanicSolution[], 
    source: 'cache' | 'generated' | 'emergency',
    startTime: number
  ): Promise<void> {
    try {
      const timeToResolution = Math.floor((Date.now() - startTime) / 1000);
      
      await this.supabaseClient
        .from('panic_events')
        .update({
          solutions_offered: solutions.map(s => ({
            id: s.id,
            type: s.type,
            title: s.title,
            confidence: s.confidence
          })),
          time_to_resolution: timeToResolution,
          generation_time_ms: Date.now() - startTime,
          success: solutions.length > 0,
          solution_details: {
            source,
            solutionCount: solutions.length,
            topConfidence: Math.max(...solutions.map(s => s.confidence))
          }
        })
        .eq('id', eventId);
    } catch (error) {
      console.warn('Failed to update panic event result:', error);
    }
  }

  private async logPanicError(userId: string, error: Error, startTime: number): Promise<void> {
    try {
      await this.supabaseClient
        .from('panic_events')
        .insert({
          user_id: userId,
          trigger_type: 'manual',
          success: false,
          time_to_resolution: Math.floor((Date.now() - startTime) / 1000),
          feedback: `Error: ${error.message}`,
          context_data: {
            error: true,
            errorMessage: error.message,
            timestamp: new Date().toISOString()
          }
        });
    } catch (logError) {
      console.error('Failed to log panic error:', logError);
    }
  }

  // === MÉTHODES UTILITAIRES PRIVÉES ===

  private mapRecipeDifficulty(difficulty: string): 'trivial' | 'easy' | 'medium' {
    switch (difficulty.toLowerCase()) {
      case 'trivial': return 'trivial';
      case 'easy': return 'easy';
      case 'medium': return 'medium';
      default: return 'easy';
    }
  }

  private calculateRecipeConfidence(recipe: Recipe, context: PanicContext): number {
    let confidence = 80; // Base confidence
    
    // Bonus pour simplicité
    if (recipe.difficulty === 'trivial') confidence += 15;
    if (recipe.prepTime <= 5) confidence += 10;
    
    // Bonus si correspond aux contraintes temps
    if (context.timeAvailable && recipe.prepTime + recipe.cookTime <= context.timeAvailable) {
      confidence += 10;
    }
    
    // Bonus pour taille de portion adaptée
    if (recipe.servings >= context.familyMembers) confidence += 5;
    
    return Math.min(100, confidence);
  }

  private calculateDeliveryConfidence(restaurant: RestaurantInfo, context: PanicContext): number {
    let confidence = 75; // Base confidence pour livraison
    
    // Bonus pour note élevée
    if (restaurant.rating >= 4.5) confidence += 15;
    else if (restaurant.rating >= 4.0) confidence += 10;
    else if (restaurant.rating >= 3.5) confidence += 5;
    
    // Bonus pour proximité
    if (restaurant.distance <= 1) confidence += 10;
    else if (restaurant.distance <= 2) confidence += 5;
    
    // Bonus pour rapidité
    if (restaurant.estimatedTime <= 20) confidence += 10;
    else if (restaurant.estimatedTime <= 30) confidence += 5;
    
    return Math.min(100, confidence);
  }

  private simplifySteps(steps: string[]): string[] {
    return steps
      .slice(0, 4) // Maximum 4 étapes pour panic mode
      .map(step => step.replace(/\d+\.\s*/, '').substring(0, 50))
      .filter(step => step.length > 5);
  }

  private extractMainIngredients(ingredientsJson: any): string[] {
    try {
      if (typeof ingredientsJson === 'string') {
        ingredientsJson = JSON.parse(ingredientsJson);
      }
      
      if (Array.isArray(ingredientsJson)) {
        return ingredientsJson
          .slice(0, 4)
          .map(ing => ing.name || '')
          .filter(name => name.length > 0);
      }
      
      return [];
    } catch {
      return [];
    }
  }

  private parseIngredientsFromJson(ingredientsJson: any): Ingredient[] {
    try {
      if (typeof ingredientsJson === 'string') {
        ingredientsJson = JSON.parse(ingredientsJson);
      }
      
      if (Array.isArray(ingredientsJson)) {
        return ingredientsJson.map(ing => ({
          name: ing.name || '',
          amount: ing.amount || 0,
          unit: ing.unit || '',
          alternatives: ing.alternatives || []
        }));
      }
      
      return [];
    } catch {
      return [];
    }
  }
}

// Export d'une instance par défaut
export const panicEngine = new PanicEngine();