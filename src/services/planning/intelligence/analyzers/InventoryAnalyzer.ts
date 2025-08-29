/**
 * Inventory Analyzer
 * Analyse l'inventaire pour optimiser la planification des repas
 */

import { WeeklyMealPlan, MealPlanEntry, InventoryItem } from '../../types';
import { LearnedPreferences, CurrentContext } from '../types';
import { supabase } from '@/integrations/supabase/client';

interface InventoryAnalysis {
  coverageScore: number;
  expiryAlerts: ExpiryAlert[];
  utilizationPlan: UtilizationPlan;
  shoppingNeeds: ShoppingNeed[];
  wasteRisk: WasteRisk[];
  optimizations: InventoryOptimization[];
}

interface ExpiryAlert {
  productId: string;
  productName: string;
  daysUntilExpiry: number;
  quantity: number;
  unit: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  suggestedUse: string[];
}

interface UtilizationPlan {
  dailyUsage: DailyUsage[];
  unusedItems: UnusedItem[];
  overusedItems: OverusedItem[];
  efficiencyScore: number;
}

interface DailyUsage {
  day: number;
  dayName: string;
  itemsUsed: { name: string; quantity: number; purpose: string }[];
  itemsExpiring: string[];
  utilizationScore: number;
}

interface UnusedItem {
  name: string;
  quantity: number;
  daysInInventory: number;
  suggestedRecipes: string[];
  wasteRisk: number;
}

interface OverusedItem {
  name: string;
  plannedUsage: number;
  availableQuantity: number;
  shortfall: number;
  alternatives: string[];
}

interface WasteRisk {
  category: string;
  riskLevel: number;
  affectedItems: string[];
  preventionActions: string[];
}

interface InventoryOptimization {
  type: 'prioritize_expiring' | 'substitute_missing' | 'bulk_use' | 'preserve';
  description: string;
  affectedMeals: string[];
  items: string[];
  impact: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface ShoppingNeed {
  ingredient: string;
  quantity: number;
  unit: string;
  urgency: 'immediate' | 'this_week' | 'next_week';
  estimatedCost: number;
  alternatives: string[];
}

export class InventoryAnalyzer {
  private expiryThresholds = {
    critical: 1, // 1 jour
    high: 3,     // 3 jours  
    medium: 7,   // 1 semaine
    low: 14      // 2 semaines
  };
  
  private preservationMethods = {
    'légumes': ['congélation', 'déshydratation', 'lacto-fermentation'],
    'fruits': ['congélation', 'confiture', 'compote'],
    'viandes': ['congélation', 'marinade', 'séchage'],
    'produits laitiers': ['congélation (fromage)', 'yaourt maison'],
    'herbes': ['séchage', 'huile aromatisée', 'glaçons d\'herbes']
  };
  
  /**
   * Analyse complète de l'inventaire
   */
  async analyzeInventory(
    inventory: InventoryItem[],
    plan: WeeklyMealPlan,
    preferences: LearnedPreferences,
    context?: CurrentContext
  ): Promise<InventoryAnalysis> {
    console.log('📦 Analyzing inventory for optimization');
    
    // 1. Analyser les alertes d'expiration
    const expiryAlerts = this.analyzeExpiry(inventory);
    
    // 2. Planifier l'utilisation de l'inventaire
    const utilizationPlan = await this.planInventoryUtilization(
      inventory,
      plan,
      expiryAlerts
    );
    
    // 3. Calculer le score de couverture
    const coverageScore = await this.calculateCoverageScore(inventory, plan);
    
    // 4. Identifier les besoins d'achat
    const shoppingNeeds = await this.identifyShoppingNeeds(inventory, plan);
    
    // 5. Évaluer les risques de gaspillage
    const wasteRisk = await this.assessWasteRisks(inventory, utilizationPlan);
    
    // 6. Générer les optimisations
    const optimizations = await this.generateInventoryOptimizations(
      inventory,
      plan,
      expiryAlerts,
      utilizationPlan,
      preferences
    );
    
    return {
      coverageScore,
      expiryAlerts,
      utilizationPlan,
      shoppingNeeds,
      wasteRisk,
      optimizations
    };
  }
  
  /**
   * Analyse les produits qui expirent
   */
  private analyzeExpiry(inventory: InventoryItem[]): ExpiryAlert[] {
    const today = new Date();
    const alerts: ExpiryAlert[] = [];
    
    inventory.forEach(item => {
      if (!item.expiryDate) return;
      
      const expiryDate = new Date(item.expiryDate);
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilExpiry <= this.expiryThresholds.low) {
        let urgency: ExpiryAlert['urgency'];
        
        if (daysUntilExpiry <= this.expiryThresholds.critical) {
          urgency = 'critical';
        } else if (daysUntilExpiry <= this.expiryThresholds.high) {
          urgency = 'high';
        } else if (daysUntilExpiry <= this.expiryThresholds.medium) {
          urgency = 'medium';
        } else {
          urgency = 'low';
        }
        
        alerts.push({
          productId: item.id,
          productName: item.name,
          daysUntilExpiry,
          quantity: item.quantity,
          unit: item.unit,
          urgency,
          suggestedUse: this.getSuggestedUseForItem(item)
        });
      }
    });
    
    return alerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  }
  
  /**
   * Planifie l'utilisation de l'inventaire
   */
  private async planInventoryUtilization(
    inventory: InventoryItem[],
    plan: WeeklyMealPlan,
    expiryAlerts: ExpiryAlert[]
  ): Promise<UtilizationPlan> {
    const dailyUsage: DailyUsage[] = [];
    const usedItems = new Set<string>();
    
    // Analyser l'utilisation jour par jour
    for (let day = 0; day < 7; day++) {
      const dayMeals = plan.meals.filter(meal => meal.dayOfWeek === day);
      const itemsUsed = [];
      const itemsExpiring = expiryAlerts
        .filter(alert => alert.daysUntilExpiry === day + 1)
        .map(alert => alert.productName);
      
      // Analyser les ingrédients utilisés dans les repas du jour
      for (const meal of dayMeals) {
        const mealIngredients = await this.getMealIngredients(meal);
        
        mealIngredients.forEach(ingredient => {
          const inventoryItem = inventory.find(item => 
            this.ingredientsMatch(item.name, ingredient.name)
          );
          
          if (inventoryItem) {
            usedItems.add(inventoryItem.id);
            itemsUsed.push({
              name: inventoryItem.name,
              quantity: ingredient.quantity || 0,
              purpose: meal.recipeName
            });
          }
        });
      }
      
      // Calculer le score d'utilisation du jour
      const utilizationScore = this.calculateDailyUtilizationScore(
        itemsUsed,
        itemsExpiring,
        day
      );
      
      dailyUsage.push({
        day,
        dayName: this.getDayName(day),
        itemsUsed,
        itemsExpiring,
        utilizationScore
      });
    }
    
    // Identifier les items non utilisés
    const unusedItems = inventory
      .filter(item => !usedItems.has(item.id))
      .map(item => ({
        name: item.name,
        quantity: item.quantity,
        daysInInventory: this.calculateDaysInInventory(item),
        suggestedRecipes: this.getSuggestedRecipesForItem(item),
        wasteRisk: this.calculateWasteRisk(item)
      }));
    
    // Identifier les items surutilisés
    const overusedItems = await this.findOverusedItems(inventory, plan);
    
    // Calculer le score d'efficacité global
    const efficiencyScore = this.calculateEfficiencyScore(
      inventory.length,
      usedItems.size,
      unusedItems.length,
      overusedItems.length
    );
    
    return {
      dailyUsage,
      unusedItems,
      overusedItems,
      efficiencyScore
    };
  }
  
  /**
   * Calcule le score de couverture de l'inventaire
   */
  private async calculateCoverageScore(
    inventory: InventoryItem[],
    plan: WeeklyMealPlan
  ): Promise<number> {
    if (inventory.length === 0) return 0;
    
    let totalNeeded = 0;
    let totalCovered = 0;
    
    // Analyser chaque repas du plan
    for (const meal of plan.meals) {
      const requiredIngredients = await this.getMealIngredients(meal);
      totalNeeded += requiredIngredients.length;
      
      // Vérifier la disponibilité dans l'inventaire
      const coveredIngredients = requiredIngredients.filter(ingredient => 
        inventory.some(item => 
          this.ingredientsMatch(item.name, ingredient.name) &&
          this.hasSufficientQuantity(item, ingredient)
        )
      );
      
      totalCovered += coveredIngredients.length;
    }
    
    return totalNeeded > 0 ? totalCovered / totalNeeded : 0;
  }
  
  /**
   * Identifie les besoins d'achat
   */
  private async identifyShoppingNeeds(
    inventory: InventoryItem[],
    plan: WeeklyMealPlan
  ): Promise<ShoppingNeed[]> {
    const shoppingNeeds: ShoppingNeed[] = [];
    const neededIngredients = new Map<string, {
      totalQuantity: number;
      unit: string;
      urgency: Date;
      meals: string[];
    }>();
    
    // Analyser tous les repas pour identifier les manques
    for (const meal of plan.meals) {
      const requiredIngredients = await this.getMealIngredients(meal);
      const mealDate = this.getMealDate(meal);
      
      requiredIngredients.forEach(ingredient => {
        const inventoryItem = inventory.find(item => 
          this.ingredientsMatch(item.name, ingredient.name)
        );
        
        const needed = ingredient.quantity || 1;
        const available = inventoryItem ? 
          this.convertToStandardUnit(inventoryItem.quantity, inventoryItem.unit, ingredient.unit) : 0;
        
        if (available < needed) {
          const shortfall = needed - available;
          const key = ingredient.name.toLowerCase();
          
          if (neededIngredients.has(key)) {
            const existing = neededIngredients.get(key)!;
            existing.totalQuantity += shortfall;
            existing.meals.push(meal.recipeName);
            
            // Prendre la date la plus urgente
            if (mealDate < existing.urgency) {
              existing.urgency = mealDate;
            }
          } else {
            neededIngredients.set(key, {
              totalQuantity: shortfall,
              unit: ingredient.unit || 'unité',
              urgency: mealDate,
              meals: [meal.recipeName]
            });
          }
        }
      });
    }
    
    // Convertir en besoins d'achat
    const today = new Date();
    
    neededIngredients.forEach((need, ingredientName) => {
      const daysUntilNeeded = Math.ceil(
        (need.urgency.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      let urgency: ShoppingNeed['urgency'];
      if (daysUntilNeeded <= 1) urgency = 'immediate';
      else if (daysUntilNeeded <= 7) urgency = 'this_week';
      else urgency = 'next_week';
      
      const estimatedCost = this.estimateIngredientCost(
        ingredientName,
        need.totalQuantity,
        need.unit
      );
      
      shoppingNeeds.push({
        ingredient: ingredientName,
        quantity: need.totalQuantity,
        unit: need.unit,
        urgency,
        estimatedCost,
        alternatives: this.findIngredientAlternatives(ingredientName)
      });
    });
    
    return shoppingNeeds.sort((a, b) => {
      const urgencyOrder = { immediate: 0, this_week: 1, next_week: 2 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  }
  
  /**
   * Génère les optimisations d'inventaire
   */
  private async generateInventoryOptimizations(
    inventory: InventoryItem[],
    plan: WeeklyMealPlan,
    expiryAlerts: ExpiryAlert[],
    utilizationPlan: UtilizationPlan,
    preferences: LearnedPreferences
  ): Promise<InventoryOptimization[]> {
    const optimizations: InventoryOptimization[] = [];
    
    // 1. Prioriser les produits qui expirent
    const criticalAlerts = expiryAlerts.filter(alert => 
      alert.urgency === 'critical' || alert.urgency === 'high'
    );
    
    if (criticalAlerts.length > 0) {
      const affectedMeals = await this.findMealsUsingIngredients(
        plan,
        criticalAlerts.map(alert => alert.productName)
      );
      
      optimizations.push({
        type: 'prioritize_expiring',
        description: `Utiliser en priorité ${criticalAlerts.length} produits qui expirent bientôt`,
        affectedMeals,
        items: criticalAlerts.map(alert => alert.productName),
        impact: criticalAlerts.reduce((sum, alert) => 
          sum + this.estimateItemValue(alert), 0
        ),
        difficulty: 'easy'
      });
    }
    
    // 2. Substituer les ingrédients manquants
    const missingIngredients = utilizationPlan.overusedItems;
    
    if (missingIngredients.length > 0) {
      optimizations.push({
        type: 'substitute_missing',
        description: `Substituer ${missingIngredients.length} ingrédients manquants`,
        affectedMeals: await this.findMealsUsingIngredients(
          plan,
          missingIngredients.map(item => item.name)
        ),
        items: missingIngredients.map(item => item.name),
        impact: missingIngredients.reduce((sum, item) => sum + item.shortfall * 2, 0),
        difficulty: 'medium'
      });
    }
    
    // 3. Utilisation en lot pour les items abondants
    const abundantItems = inventory.filter(item => 
      item.quantity >= this.getBulkThreshold(item)
    );
    
    if (abundantItems.length > 0) {
      optimizations.push({
        type: 'bulk_use',
        description: `Cuisiner en lot avec ${abundantItems.length} ingrédients abondants`,
        affectedMeals: await this.findBulkCookingOpportunities(plan, abundantItems),
        items: abundantItems.map(item => item.name),
        impact: abundantItems.length * 3, // Impact estimé
        difficulty: 'medium'
      });
    }
    
    // 4. Préservation des items à risque
    const preservationCandidates = inventory.filter(item => {
      const daysLeft = this.getDaysUntilExpiry(item);
      return daysLeft >= 3 && daysLeft <= 10 && item.quantity > 2;
    });
    
    if (preservationCandidates.length > 0) {
      optimizations.push({
        type: 'preserve',
        description: `Préserver ${preservationCandidates.length} produits pour usage futur`,
        affectedMeals: [],
        items: preservationCandidates.map(item => item.name),
        impact: preservationCandidates.reduce((sum, item) => 
          sum + this.estimateItemValue({ 
            productName: item.name, 
            quantity: item.quantity, 
            unit: item.unit 
          }), 0
        ),
        difficulty: 'easy'
      });
    }
    
    return optimizations.sort((a, b) => b.impact - a.impact);
  }
  
  /**
   * Optimise le plan selon l'inventaire disponible
   */
  async optimizeForInventory(
    plan: WeeklyMealPlan,
    inventory: InventoryItem[],
    preferences: LearnedPreferences,
    prioritizeExpiring: boolean = true
  ): Promise<WeeklyMealPlan> {
    const analysis = await this.analyzeInventory(inventory, plan, preferences);
    const optimizedPlan = { ...plan };
    
    if (prioritizeExpiring) {
      // Réorganiser les repas pour utiliser les produits qui expirent en premier
      await this.reorderMealsForExpiry(optimizedPlan, analysis.expiryAlerts);
    }
    
    // Appliquer les optimisations d'inventaire
    for (const optimization of analysis.optimizations.slice(0, 3)) { // Top 3
      await this.applyInventoryOptimization(optimizedPlan, optimization, inventory);
    }
    
    // Mettre à jour les estimations de coût
    await this.updateCostEstimates(optimizedPlan, inventory);
    
    return optimizedPlan;
  }
  
  /**
   * Réorganise les repas pour prioriser les produits qui expirent
   */
  private async reorderMealsForExpiry(
    plan: WeeklyMealPlan,
    expiryAlerts: ExpiryAlert[]
  ): Promise<void> {
    const criticalItems = expiryAlerts.filter(alert => 
      alert.urgency === 'critical' || alert.urgency === 'high'
    );
    
    // Pour chaque item critique, essayer de le programmer plus tôt
    for (const alert of criticalItems) {
      const mealsUsingItem = await this.findMealsUsingIngredient(plan, alert.productName);
      
      for (const meal of mealsUsingItem) {
        // Essayer de déplacer vers les premiers jours
        const targetDay = Math.min(alert.daysUntilExpiry - 1, 2);
        
        if (meal.dayOfWeek > targetDay) {
          // Chercher un créneau libre plus tôt dans la semaine
          const earlierSlot = this.findEarlierSlot(plan, meal, targetDay);
          
          if (earlierSlot) {
            meal.dayOfWeek = earlierSlot.day;
            meal.mealType = earlierSlot.mealType;
          }
        }
      }
    }
  }
  
  /**
   * Trouve un créneau plus tôt dans la semaine
   */
  private findEarlierSlot(
    plan: WeeklyMealPlan,
    meal: MealPlanEntry,
    targetDay: number
  ): { day: number; mealType: string } | null {
    // Chercher un slot libre entre aujourd'hui et le jour cible
    for (let day = 0; day <= targetDay; day++) {
      const existingMeals = plan.meals.filter(m => m.dayOfWeek === day);
      const mealTypes = ['lunch', 'dinner'];
      
      for (const mealType of mealTypes) {
        const hasConflict = existingMeals.some(m => m.mealType === mealType);
        
        if (!hasConflict) {
          return { day, mealType };
        }
      }
    }
    
    return null;
  }
  
  /**
   * Applique une optimisation d'inventaire
   */
  private async applyInventoryOptimization(
    plan: WeeklyMealPlan,
    optimization: InventoryOptimization,
    inventory: InventoryItem[]
  ): Promise<void> {
    switch (optimization.type) {
      case 'prioritize_expiring':
        await this.prioritizeExpiringIngredients(plan, optimization.items);
        break;
        
      case 'substitute_missing':
        await this.substituteMissingIngredients(plan, optimization.items, inventory);
        break;
        
      case 'bulk_use':
        await this.implementBulkUsage(plan, optimization.items);
        break;
        
      case 'preserve':
        await this.implementPreservation(optimization.items, inventory);
        break;
    }
  }
  
  /**
   * Priorise l'utilisation d'ingrédients qui expirent
   */
  private async prioritizeExpiringIngredients(
    plan: WeeklyMealPlan,
    expiringItems: string[]
  ): Promise<void> {
    // Trouver les recettes qui utilisent ces ingrédients
    const recipesWithExpiring = await this.findRecipesUsingIngredients(expiringItems);
    
    // Remplacer les repas actuels par ces recettes si possible
    for (const recipe of recipesWithExpiring.slice(0, 3)) { // Max 3 remplacements
      const suitableMeal = plan.meals.find(meal => 
        this.canReplaceMeal(meal, recipe)
      );
      
      if (suitableMeal) {
        suitableMeal.recipeId = recipe.id;
        suitableMeal.recipeName = recipe.title;
        suitableMeal.tags = [...(suitableMeal.tags || []), 'uses_expiring'];
      }
    }
  }
  
  /**
   * Substitue les ingrédients manquants
   */
  private async substituteMissingIngredients(
    plan: WeeklyMealPlan,
    missingItems: string[],
    inventory: InventoryItem[]
  ): Promise<void> {
    for (const missingItem of missingItems) {
      // Trouver des substituts disponibles dans l'inventaire
      const substitutes = this.findAvailableSubstitutes(missingItem, inventory);
      
      if (substitutes.length > 0) {
        // Mettre à jour les repas qui utilisent cet ingrédient
        const affectedMeals = await this.findMealsUsingIngredient(plan, missingItem);
        
        affectedMeals.forEach(meal => {
          if (!meal.substitutions) meal.substitutions = [];
          meal.substitutions.push({
            original: missingItem,
            substitute: substitutes[0].name,
            reason: 'Ingrédient disponible dans l\'inventaire'
          });
        });
      }
    }
  }
  
  /**
   * Méthodes utilitaires
   */
  
  private getSuggestedUseForItem(item: InventoryItem): string[] {
    const category = this.categorizeItem(item);
    
    const suggestions: Record<string, string[]> = {
      'légumes': ['Sauté de légumes', 'Soupe', 'Ratatouille', 'Curry'],
      'fruits': ['Salade de fruits', 'Smoothie', 'Compote', 'Tarte'],
      'viandes': ['Ragoût', 'Sauté', 'Curry', 'Grillade'],
      'produits laitiers': ['Quiche', 'Gratin', 'Pâtes crémeuses'],
      'herbes': ['Sauce', 'Marinade', 'Infusion', 'Pesto']
    };
    
    return suggestions[category] || ['À utiliser rapidement'];
  }
  
  private calculateDaysInInventory(item: InventoryItem): number {
    if (!item.addedDate) return 0;
    
    const added = new Date(item.addedDate);
    const now = new Date();
    
    return Math.ceil((now.getTime() - added.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  private getSuggestedRecipesForItem(item: InventoryItem): string[] {
    return this.getSuggestedUseForItem(item);
  }
  
  private calculateWasteRisk(item: InventoryItem): number {
    const daysInInventory = this.calculateDaysInInventory(item);
    const daysUntilExpiry = this.getDaysUntilExpiry(item);
    
    if (daysUntilExpiry <= 2) return 0.9;
    if (daysUntilExpiry <= 5) return 0.7;
    if (daysInInventory > 10 && item.quantity > 3) return 0.6;
    
    return 0.2;
  }
  
  private async findOverusedItems(
    inventory: InventoryItem[],
    plan: WeeklyMealPlan
  ): Promise<OverusedItem[]> {
    const overused: OverusedItem[] = [];
    
    // Analyser chaque item d'inventaire
    for (const item of inventory) {
      let plannedUsage = 0;
      
      // Calculer l'utilisation prévue dans le plan
      for (const meal of plan.meals) {
        const mealIngredients = await this.getMealIngredients(meal);
        const usage = mealIngredients
          .filter(ing => this.ingredientsMatch(item.name, ing.name))
          .reduce((sum, ing) => sum + (ing.quantity || 0), 0);
        
        plannedUsage += usage;
      }
      
      // Vérifier s'il y a un déficit
      if (plannedUsage > item.quantity) {
        const shortfall = plannedUsage - item.quantity;
        
        overused.push({
          name: item.name,
          plannedUsage,
          availableQuantity: item.quantity,
          shortfall,
          alternatives: this.findIngredientAlternatives(item.name)
        });
      }
    }
    
    return overused;
  }
  
  private calculateDailyUtilizationScore(
    itemsUsed: any[],
    itemsExpiring: string[],
    day: number
  ): number {
    let score = 0.5; // Score de base
    
    // Bonus pour utiliser des items qui expirent
    const expiringUsed = itemsUsed.filter(used => 
      itemsExpiring.some(expiring => 
        this.ingredientsMatch(used.name, expiring)
      )
    ).length;
    
    if (itemsExpiring.length > 0) {
      score += (expiringUsed / itemsExpiring.length) * 0.4;
    }
    
    // Bonus pour diversité d'utilisation
    const uniqueItems = new Set(itemsUsed.map(item => item.name));
    score += Math.min(uniqueItems.size / 10, 0.3);
    
    // Malus si jour tardif avec items critiques non utilisés
    if (day > 2 && itemsExpiring.length > expiringUsed) {
      score -= 0.2;
    }
    
    return Math.max(0, Math.min(score, 1));
  }
  
  private calculateEfficiencyScore(
    totalItems: number,
    usedItems: number,
    unusedItems: number,
    overusedItems: number
  ): number {
    if (totalItems === 0) return 0;
    
    // Score basé sur l'utilisation
    const utilizationRate = usedItems / totalItems;
    
    // Pénalités pour les problèmes
    const unusedPenalty = (unusedItems / totalItems) * 0.5;
    const overusedPenalty = (overusedItems / totalItems) * 0.3;
    
    const score = utilizationRate - unusedPenalty - overusedPenalty;
    
    return Math.max(0, Math.min(score, 1));
  }
  
  private async getMealIngredients(meal: MealPlanEntry): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('recipes_catalog')
        .select('ingredients_json')
        .eq('id', meal.recipeId)
        .single();
      
      if (error || !data?.ingredients_json) return [];
      
      return data.ingredients_json;
      
    } catch (error) {
      console.error('Error getting meal ingredients:', error);
      return [];
    }
  }
  
  private ingredientsMatch(inventoryName: string, recipeName: string): boolean {
    const normalize = (name: string) => name.toLowerCase().trim();
    const inv = normalize(inventoryName);
    const rec = normalize(recipeName);
    
    return inv.includes(rec) || rec.includes(inv) || inv === rec;
  }
  
  private hasSufficientQuantity(
    inventoryItem: InventoryItem,
    requiredIngredient: any
  ): boolean {
    const available = this.convertToStandardUnit(
      inventoryItem.quantity,
      inventoryItem.unit,
      requiredIngredient.unit || 'unité'
    );
    
    const required = requiredIngredient.quantity || 1;
    
    return available >= required;
  }
  
  private convertToStandardUnit(
    quantity: number,
    fromUnit: string,
    toUnit: string
  ): number {
    // Conversion simplifiée - en production, utiliser une vraie bibliothèque
    if (fromUnit === toUnit) return quantity;
    
    const conversions: Record<string, Record<string, number>> = {
      'kg': { 'g': 1000, 'unité': 1 },
      'g': { 'kg': 0.001, 'unité': 0.001 },
      'l': { 'ml': 1000, 'cl': 100 },
      'ml': { 'l': 0.001, 'cl': 0.1 }
    };
    
    const factor = conversions[fromUnit]?.[toUnit] || 1;
    return quantity * factor;
  }
  
  private getMealDate(meal: MealPlanEntry): Date {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const mealDate = new Date(startOfWeek);
    mealDate.setDate(startOfWeek.getDate() + meal.dayOfWeek);
    
    return mealDate;
  }
  
  private estimateIngredientCost(
    ingredient: string,
    quantity: number,
    unit: string
  ): number {
    const basePrice = this.getBasePrice(ingredient);
    const unitMultiplier = this.getUnitMultiplier(unit);
    
    return basePrice * quantity * unitMultiplier;
  }
  
  private getBasePrice(ingredient: string): number {
    // Prix de base simplifiés (€ par unité standard)
    const prices: Record<string, number> = {
      'viande': 12,
      'poisson': 15,
      'légume': 2,
      'fruit': 3,
      'fromage': 8,
      'épice': 1
    };
    
    // Catégoriser l'ingrédient
    const category = this.categorizeIngredientByName(ingredient);
    
    return prices[category] || 3;
  }
  
  private getUnitMultiplier(unit: string): number {
    const multipliers: Record<string, number> = {
      'kg': 1,
      'g': 0.001,
      'l': 1.2,
      'ml': 0.0012,
      'unité': 1
    };
    
    return multipliers[unit] || 1;
  }
  
  private categorizeIngredientByName(name: string): string {
    const lower = name.toLowerCase();
    
    if (lower.includes('viande') || lower.includes('poulet') || lower.includes('bœuf')) {
      return 'viande';
    } else if (lower.includes('poisson') || lower.includes('saumon') || lower.includes('thon')) {
      return 'poisson';
    } else if (lower.includes('légume') || lower.includes('carotte') || lower.includes('tomate')) {
      return 'légume';
    } else if (lower.includes('fruit') || lower.includes('pomme') || lower.includes('banane')) {
      return 'fruit';
    } else if (lower.includes('fromage') || lower.includes('lait')) {
      return 'fromage';
    }
    
    return 'autre';
  }
  
  private findIngredientAlternatives(ingredient: string): string[] {
    const alternatives: Record<string, string[]> = {
      'bœuf': ['porc', 'agneau', 'veau'],
      'saumon': ['truite', 'dorade', 'colin'],
      'beurre': ['margarine', 'huile d\'olive', 'huile de coco'],
      'crème': ['lait concentré', 'yaourt grec', 'lait de coco'],
      'parmesan': ['gruyère', 'emmental', 'pecorino']
    };
    
    return alternatives[ingredient.toLowerCase()] || [];
  }
  
  private getDayName(day: number): string {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return days[day] || 'Jour inconnu';
  }
  
  private getDaysUntilExpiry(item: InventoryItem): number {
    if (!item.expiryDate) return Infinity;
    
    const expiry = new Date(item.expiryDate);
    const now = new Date();
    
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  private categorizeItem(item: InventoryItem): string {
    return this.categorizeIngredientByName(item.name);
  }
  
  private estimateItemValue(item: { productName: string; quantity: number; unit: string }): number {
    const basePrice = this.getBasePrice(item.productName);
    const unitMultiplier = this.getUnitMultiplier(item.unit);
    
    return basePrice * item.quantity * unitMultiplier;
  }
  
  private getBulkThreshold(item: InventoryItem): number {
    const category = this.categorizeItem(item);
    
    const thresholds: Record<string, number> = {
      'légume': 5,
      'fruit': 8,
      'viande': 3,
      'fromage': 2,
      'autre': 4
    };
    
    return thresholds[category] || 4;
  }
  
  private async findMealsUsingIngredients(
    plan: WeeklyMealPlan,
    ingredients: string[]
  ): Promise<string[]> {
    const mealIds: string[] = [];
    
    for (const meal of plan.meals) {
      const mealIngredients = await this.getMealIngredients(meal);
      
      const hasIngredient = mealIngredients.some(ing => 
        ingredients.some(target => 
          this.ingredientsMatch(ing.name, target)
        )
      );
      
      if (hasIngredient) {
        mealIds.push(meal.id);
      }
    }
    
    return mealIds;
  }
  
  private async findMealsUsingIngredient(
    plan: WeeklyMealPlan,
    ingredient: string
  ): Promise<MealPlanEntry[]> {
    const meals: MealPlanEntry[] = [];
    
    for (const meal of plan.meals) {
      const mealIngredients = await this.getMealIngredients(meal);
      
      const usesIngredient = mealIngredients.some(ing => 
        this.ingredientsMatch(ing.name, ingredient)
      );
      
      if (usesIngredient) {
        meals.push(meal);
      }
    }
    
    return meals;
  }
}

// Export singleton instance
export const inventoryAnalyzer = new InventoryAnalyzer();