/**
 * Shopping List Bridge Service
 * Converts meal plans to shopping list items compatible with existing shopping system
 */

import { supabase } from '@/integrations/supabase/client';
import { WeeklyMealPlan, MealPlanEntry } from '../types';
import { OptimizedShoppingList, ShoppingListItem } from '../smartMealPlannerService';

interface ExistingShoppingItem {
  id?: string;
  product_id: string;
  name: string;
  quantity: number;
  unit: string;
  is_purchased: boolean;
  category?: string;
  store_section?: string;
  estimated_price?: number;
}

interface IngredientAggregation {
  name: string;
  totalQuantity: number;
  unit: string;
  estimatedCost: number;
  category: string;
  recipeNames: string[];
  mealIds: string[];
}

export class ShoppingListBridge {
  /**
   * Converts a meal plan to shopping list items compatible with existing system
   */
  async convertMealPlanToShoppingList(
    plan: WeeklyMealPlan,
    userId: string,
    mergeWithExisting: boolean = true
  ): Promise<{
    items: ExistingShoppingItem[];
    summary: {
      totalItems: number;
      totalEstimatedCost: number;
      newItems: number;
      mergedItems: number;
    };
  }> {
    console.log('🛒 Converting meal plan to shopping list:', plan.id);

    try {
      // 1. Extract and aggregate all ingredients from meal plan
      const aggregatedIngredients = await this.aggregateIngredients(plan);
      
      // 2. Convert to existing shopping list format
      const newShoppingItems = await this.convertToShoppingItems(
        aggregatedIngredients,
        userId
      );
      
      // 3. Merge with existing shopping list if requested
      let finalItems = newShoppingItems;
      let mergedCount = 0;
      
      if (mergeWithExisting) {
        const mergeResult = await this.mergeWithExistingList(newShoppingItems, userId);
        finalItems = mergeResult.items;
        mergedCount = mergeResult.mergedCount;
      }
      
      // 4. Save to database
      await this.saveShoppingItems(finalItems, userId);
      
      const summary = {
        totalItems: finalItems.length,
        totalEstimatedCost: finalItems.reduce((sum, item) => sum + (item.estimated_price || 0), 0),
        newItems: newShoppingItems.length - mergedCount,
        mergedItems: mergedCount
      };

      console.log('✅ Shopping list conversion completed:', summary);
      
      return { items: finalItems, summary };
      
    } catch (error) {
      console.error('❌ Failed to convert meal plan to shopping list:', error);
      throw error;
    }
  }

  /**
   * Aggregates ingredients from all meals in the plan
   */
  private async aggregateIngredients(plan: WeeklyMealPlan): Promise<IngredientAggregation[]> {
    const ingredientMap = new Map<string, IngredientAggregation>();
    
    for (const meal of plan.meals) {
      try {
        // Get recipe ingredients from database
        const { data: recipe, error } = await supabase
          .from('recipes_catalog')
          .select('ingredients_json, title')
          .eq('id', meal.recipeId)
          .single();
        
        if (error || !recipe?.ingredients_json) {
          console.warn(`Missing recipe data for meal ${meal.id}`);
          continue;
        }
        
        const ingredients = recipe.ingredients_json as any[];
        
        for (const ingredient of ingredients) {
          const name = ingredient.name?.toLowerCase().trim();
          if (!name) continue;
          
          const quantity = parseFloat(ingredient.amount || ingredient.quantity || '1');
          const unit = ingredient.unit || 'piece';
          
          // Scale quantity based on servings
          const scaledQuantity = quantity * (meal.servings / (recipe.servings || 4));
          
          if (ingredientMap.has(name)) {
            const existing = ingredientMap.get(name)!;
            
            // Aggregate quantities (same unit) or convert units if possible
            if (existing.unit === unit) {
              existing.totalQuantity += scaledQuantity;
            } else {
              // Try to convert units or keep separate
              const convertedQuantity = this.convertUnits(scaledQuantity, unit, existing.unit);
              if (convertedQuantity !== null) {
                existing.totalQuantity += convertedQuantity;
              } else {
                // Keep as separate item with different unit
                const separateKey = `${name}_${unit}`;
                ingredientMap.set(separateKey, {
                  name: ingredient.name,
                  totalQuantity: scaledQuantity,
                  unit,
                  estimatedCost: this.estimateIngredientCost(ingredient.name, scaledQuantity, unit),
                  category: this.categorizeIngredient(ingredient.name),
                  recipeNames: [recipe.title],
                  mealIds: [meal.id]
                });
                continue;
              }
            }
            
            existing.recipeNames.push(recipe.title);
            existing.mealIds.push(meal.id);
            existing.estimatedCost = this.estimateIngredientCost(name, existing.totalQuantity, existing.unit);
          } else {
            ingredientMap.set(name, {
              name: ingredient.name,
              totalQuantity: scaledQuantity,
              unit,
              estimatedCost: this.estimateIngredientCost(ingredient.name, scaledQuantity, unit),
              category: this.categorizeIngredient(ingredient.name),
              recipeNames: [recipe.title],
              mealIds: [meal.id]
            });
          }
        }
        
      } catch (error) {
        console.error(`Error processing meal ${meal.id}:`, error);
      }
    }
    
    return Array.from(ingredientMap.values());
  }

  /**
   * Converts aggregated ingredients to existing shopping list item format
   */
  private async convertToShoppingItems(
    aggregatedIngredients: IngredientAggregation[],
    userId: string
  ): Promise<ExistingShoppingItem[]> {
    const shoppingItems: ExistingShoppingItem[] = [];
    
    for (const ingredient of aggregatedIngredients) {
      try {
        // Try to find existing product in database
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id, name, category, avg_price')
          .ilike('name', `%${ingredient.name}%`)
          .limit(1)
          .single();
        
        const item: ExistingShoppingItem = {
          product_id: existingProduct?.id || `temp_${crypto.randomUUID()}`,
          name: ingredient.name,
          quantity: Math.ceil(ingredient.totalQuantity * 100) / 100, // Round to 2 decimals
          unit: ingredient.unit,
          is_purchased: false,
          category: existingProduct?.category || ingredient.category,
          estimated_price: existingProduct?.avg_price || ingredient.estimatedCost
        };
        
        shoppingItems.push(item);
        
      } catch (error) {
        console.error(`Error converting ingredient ${ingredient.name}:`, error);
        
        // Fallback item
        shoppingItems.push({
          product_id: `temp_${crypto.randomUUID()}`,
          name: ingredient.name,
          quantity: ingredient.totalQuantity,
          unit: ingredient.unit,
          is_purchased: false,
          category: ingredient.category,
          estimated_price: ingredient.estimatedCost
        });
      }
    }
    
    return shoppingItems;
  }

  /**
   * Merges new items with existing shopping list
   */
  private async mergeWithExistingList(
    newItems: ExistingShoppingItem[],
    userId: string
  ): Promise<{ items: ExistingShoppingItem[]; mergedCount: number }> {
    try {
      // Get existing shopping list items
      const { data: existingItems, error } = await supabase
        .from('shopping_list')
        .select('*')
        .eq('user_id', userId)
        .eq('is_purchased', false);
      
      if (error || !existingItems) {
        console.warn('Could not load existing shopping list, using new items only');
        return { items: newItems, mergedCount: 0 };
      }
      
      const mergedItems: ExistingShoppingItem[] = [...existingItems];
      let mergedCount = 0;
      
      for (const newItem of newItems) {
        // Try to find existing item to merge
        const existingIndex = mergedItems.findIndex(existing => 
          this.isSameProduct(existing, newItem)
        );
        
        if (existingIndex !== -1) {
          // Merge quantities
          const existing = mergedItems[existingIndex];
          
          if (existing.unit === newItem.unit) {
            existing.quantity += newItem.quantity;
            existing.estimated_price = (existing.estimated_price || 0) + (newItem.estimated_price || 0);
            mergedCount++;
          } else {
            // Different units, keep as separate items
            mergedItems.push(newItem);
          }
        } else {
          // New item, add to list
          mergedItems.push(newItem);
        }
      }
      
      return { items: mergedItems, mergedCount };
      
    } catch (error) {
      console.error('Error merging with existing list:', error);
      return { items: newItems, mergedCount: 0 };
    }
  }

  /**
   * Saves shopping items to database
   */
  private async saveShoppingItems(
    items: ExistingShoppingItem[],
    userId: string
  ): Promise<void> {
    try {
      // Clear existing meal plan generated items
      await supabase
        .from('shopping_list')
        .delete()
        .eq('user_id', userId)
        .eq('source', 'meal_plan');
      
      // Insert new items
      const itemsToInsert = items.map(item => ({
        user_id: userId,
        product_id: item.product_id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        is_purchased: false,
        category: item.category,
        estimated_price: item.estimated_price,
        source: 'meal_plan',
        created_at: new Date().toISOString()
      }));
      
      const { error } = await supabase
        .from('shopping_list')
        .insert(itemsToInsert);
      
      if (error) {
        console.error('Failed to save shopping items:', error);
        throw error;
      }
      
      console.log(`✅ Saved ${itemsToInsert.length} shopping items to database`);
      
    } catch (error) {
      console.error('Error saving shopping items:', error);
      throw error;
    }
  }

  /**
   * Updates shopping list when meal plan changes
   */
  async syncShoppingListWithPlan(
    planId: string,
    userId: string
  ): Promise<void> {
    try {
      // Get updated meal plan
      const { data: plan, error } = await supabase
        .from('weekly_meal_plans')
        .select(`
          *,
          meals:meal_plan_entries(*)
        `)
        .eq('id', planId)
        .eq('user_id', userId)
        .single();
      
      if (error || !plan) {
        throw new Error(`Failed to load meal plan ${planId}`);
      }
      
      // Convert to WeeklyMealPlan format
      const weeklyPlan: WeeklyMealPlan = {
        id: plan.id,
        userId: plan.user_id,
        name: plan.name || 'Weekly Plan',
        weekStartDate: new Date(plan.week_start_date),
        meals: plan.meals || [],
        totalEstimatedCost: plan.total_estimated_cost || 0,
        status: plan.status,
        createdAt: new Date(plan.created_at)
      };
      
      // Regenerate shopping list
      await this.convertMealPlanToShoppingList(weeklyPlan, userId, true);
      
      console.log(`✅ Shopping list synced with meal plan ${planId}`);
      
    } catch (error) {
      console.error('Error syncing shopping list with plan:', error);
      throw error;
    }
  }

  /**
   * Removes ingredients from shopping list when meal is completed
   */
  async deductCompletedMealIngredients(
    mealId: string,
    userId: string
  ): Promise<void> {
    try {
      // Get meal details
      const { data: meal, error } = await supabase
        .from('meal_plan_entries')
        .select('recipe_id, servings')
        .eq('id', mealId)
        .eq('user_id', userId)
        .single();
      
      if (error || !meal) {
        console.warn(`Could not load meal ${mealId} for deduction`);
        return;
      }
      
      // Get recipe ingredients
      const { data: recipe } = await supabase
        .from('recipes_catalog')
        .select('ingredients_json, servings')
        .eq('id', meal.recipe_id)
        .single();
      
      if (!recipe?.ingredients_json) return;
      
      const ingredients = recipe.ingredients_json as any[];
      
      // Deduct each ingredient from shopping list
      for (const ingredient of ingredients) {
        const name = ingredient.name?.toLowerCase().trim();
        if (!name) continue;
        
        const quantity = parseFloat(ingredient.amount || ingredient.quantity || '1');
        const scaledQuantity = quantity * (meal.servings / (recipe.servings || 4));
        
        // Find and update shopping list item
        await supabase
          .from('shopping_list')
          .update({ 
            quantity: Math.max(0, (await this.getCurrentQuantity(name, userId)) - scaledQuantity)
          })
          .eq('user_id', userId)
          .ilike('name', `%${name}%`)
          .eq('is_purchased', false);
      }
      
      console.log(`✅ Deducted ingredients for completed meal ${mealId}`);
      
    } catch (error) {
      console.error('Error deducting meal ingredients:', error);
    }
  }

  /**
   * Utility Methods
   */
  
  private async getCurrentQuantity(ingredientName: string, userId: string): Promise<number> {
    try {
      const { data } = await supabase
        .from('shopping_list')
        .select('quantity')
        .eq('user_id', userId)
        .ilike('name', `%${ingredientName}%`)
        .eq('is_purchased', false)
        .single();
      
      return data?.quantity || 0;
    } catch {
      return 0;
    }
  }

  private convertUnits(quantity: number, fromUnit: string, toUnit: string): number | null {
    // Basic unit conversions
    const conversions: Record<string, Record<string, number>> = {
      'kg': { 'g': 1000, 'kg': 1 },
      'g': { 'kg': 0.001, 'g': 1 },
      'l': { 'ml': 1000, 'l': 1 },
      'ml': { 'l': 0.001, 'ml': 1 },
      'piece': { 'pieces': 1, 'pièce': 1, 'pièces': 1 },
      'cup': { 'ml': 240, 'l': 0.24 },
      'tbsp': { 'ml': 15, 'tsp': 3 },
      'tsp': { 'ml': 5, 'tbsp': 0.333 }
    };

    const from = fromUnit.toLowerCase();
    const to = toUnit.toLowerCase();
    
    if (conversions[from] && conversions[from][to]) {
      return quantity * conversions[from][to];
    }
    
    return null; // Cannot convert
  }

  private estimateIngredientCost(name: string, quantity: number, unit: string): number {
    // Basic cost estimation based on ingredient type
    const baseCosts: Record<string, number> = {
      // Proteins (per 100g)
      'poulet': 3.5,
      'bœuf': 8.0,
      'porc': 5.0,
      'saumon': 12.0,
      'thon': 4.0,
      'œufs': 0.3,
      'tofu': 1.5,
      'lentilles': 0.5,
      
      // Vegetables (per 100g)
      'tomates': 1.0,
      'oignons': 0.4,
      'carottes': 0.6,
      'courgettes': 1.2,
      'poivrons': 1.8,
      'brocolis': 1.5,
      'épinards': 2.0,
      
      // Grains (per 100g)
      'pâtes': 0.4,
      'riz': 0.5,
      'pommes de terre': 0.8,
      'pain': 1.0,
      
      // Dairy (per 100ml/100g)
      'lait': 0.4,
      'fromage': 4.0,
      'yaourt': 1.2,
      'beurre': 2.5,
      
      // Others
      'huile d\'olive': 3.0,
      'ail': 2.0,
      'basilic': 8.0, // Fresh herbs are expensive
      'parmesan': 8.0
    };

    const nameKey = name.toLowerCase();
    const baseCost = baseCosts[nameKey] || 1.5; // Default 1.5€ per 100g/ml
    
    // Convert to cost per unit
    let costPerUnit = baseCost;
    
    if (unit.includes('kg')) {
      costPerUnit = baseCost * 10; // 100g base -> kg
    } else if (unit.includes('g')) {
      costPerUnit = baseCost / 100; // 100g base -> g
    } else if (unit.includes('l')) {
      costPerUnit = baseCost * 10; // 100ml base -> l
    } else if (unit.includes('ml')) {
      costPerUnit = baseCost / 100; // 100ml base -> ml
    }
    
    return Math.round(quantity * costPerUnit * 100) / 100;
  }

  private categorizeIngredient(name: string): string {
    const nameKey = name.toLowerCase();
    
    const categories: Record<string, string[]> = {
      'protein': ['poulet', 'bœuf', 'porc', 'saumon', 'thon', 'œufs', 'tofu', 'lentilles'],
      'vegetables': ['tomates', 'oignons', 'carottes', 'courgettes', 'poivrons', 'brocolis', 'épinards'],
      'grains': ['pâtes', 'riz', 'pommes de terre', 'pain', 'farine'],
      'dairy': ['lait', 'fromage', 'yaourt', 'beurre', 'crème'],
      'condiments': ['huile', 'vinaigre', 'sel', 'poivre', 'épices'],
      'herbs': ['basilic', 'persil', 'coriandre', 'thym', 'romarin']
    };
    
    for (const [category, ingredients] of Object.entries(categories)) {
      if (ingredients.some(ing => nameKey.includes(ing))) {
        return category;
      }
    }
    
    return 'other';
  }

  private isSameProduct(item1: ExistingShoppingItem, item2: ExistingShoppingItem): boolean {
    // Check if two items represent the same product
    const name1 = item1.name.toLowerCase().trim();
    const name2 = item2.name.toLowerCase().trim();
    
    // Exact match
    if (name1 === name2) return true;
    
    // Similar names (basic similarity check)
    const similarity = this.calculateStringSimilarity(name1, name2);
    return similarity > 0.8;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Simple similarity calculation using Jaccard index
    const set1 = new Set(str1.split(' '));
    const set2 = new Set(str2.split(' '));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }
}

// Export singleton instance
export const shoppingListBridge = new ShoppingListBridge();