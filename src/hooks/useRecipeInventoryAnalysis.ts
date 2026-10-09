import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { RecipeStockPreview, StockAllocation } from '@smart/shared';
import type { InventoryItem } from './useInventory';
import type { RecipeIngredient } from './useRecipes';
import { useAuthSessionOptional } from './useAuthenticatedUser';
import { previewRecipeStock } from '@/services/stockCommands';

export interface InventoryMatch {
  ingredient: RecipeIngredient; inventoryItem: InventoryItem;
  matchType: 'exact' | 'fuzzy' | 'substitution'; confidence: number; allocations?: StockAllocation[];
}
export interface Substitution { original: string; substitute: string; ratio: number; notes: string; confidence: number; }
export interface MissingIngredient { ingredient: RecipeIngredient; urgency: 'high' | 'medium' | 'low'; possibleSubstitutions?: Substitution[]; reason?: string; }
export interface ShoppingListItem { ingredient: RecipeIngredient; quantity: number; unit: string; priority: number; storeSection: string; }
export interface InventoryAnalysis {
  recipeId: string; canMake: boolean; confidence: number; availableIngredients: InventoryMatch[];
  missingIngredients: MissingIngredient[]; possibleSubstitutions: Substitution[];
  shoppingList: ShoppingListItem[]; lastAnalyzed: Date; preview: RecipeStockPreview;
}

export function analysisFromPreview(preview: RecipeStockPreview): InventoryAnalysis {
  const ingredients: RecipeIngredient[] = preview.recipe.ingredients.map((ingredient,index) => ({
    ...ingredient, id: `${preview.recipe.id}:${index}`, recipe_id: preview.recipe.id,
    quantity: ingredient.quantity == null ? undefined : ingredient.quantity * preview.servings / preview.recipe.servings,
    unit: ingredient.unit ?? undefined, is_essential: ingredient.is_essential !== false,
    inventory_product_id: ingredient.inventory_product_id ?? undefined,
  }));
  const availableIngredients: InventoryMatch[] = [];
  ingredients.forEach((ingredient,index) => {
    const allocations = preview.allocations.filter(allocation => allocation.ingredient_index === index);
    const lot = preview.lots.find(candidate => candidate.id === allocations[0]?.inventory_id);
    if (!lot) return;
    availableIngredients.push({ ingredient, allocations, matchType: 'exact', confidence: 1,
      inventoryItem: { id: lot.id, product_id: lot.product_id, quantity: lot.quantity, unit: lot.unit ?? undefined,
        stock_version: lot.stock_version, expiry_date: lot.expiry_date ?? undefined,
        product: { id: lot.product_id, name: lot.product_name, unit_type: lot.unit ?? '', category: '' } },
    });
  });
  const missingIngredients = preview.missing.map(missing => ({
    ingredient: { ...ingredients[missing.ingredient_index], quantity: missing.quantity ?? undefined },
    urgency: 'high' as const, reason: missing.reason,
  }));
  const essential = preview.recipe.ingredients.filter(ingredient => ingredient.is_essential !== false).length;
  const unknown = preview.missing.filter(missing => missing.is_essential).length;
  return { recipeId: preview.recipe.id, canMake: essential > 0 && unknown === 0,
    confidence: essential ? (essential-unknown)/essential : 0, availableIngredients, missingIngredients,
    possibleSubstitutions: [], shoppingList: missingIngredients.filter(missing => missing.ingredient.quantity != null && missing.ingredient.unit)
      .map(missing => ({ ingredient: missing.ingredient, quantity: missing.ingredient.quantity!, unit: missing.ingredient.unit!, priority: 1, storeSection: 'Autres' })),
    lastAnalyzed: new Date(), preview,
  };
}

export async function analyzeRecipeInventory(recipeId: string,servings?: number): Promise<InventoryAnalysis> {
  return analysisFromPreview(await previewRecipeStock({ id: recipeId, source: 'auto' },servings));
}

export function useRecipeInventoryAnalysis(recipeId: string,servings?: number) {
  const { user } = useAuthSessionOptional();
  const query = useQuery({ queryKey: ['recipe-inventory-analysis',user?.id,recipeId,servings ?? null],
    queryFn: () => analyzeRecipeInventory(recipeId,servings), enabled: !!user && !!recipeId,
    staleTime: 30_000, retry: 1,
  });
  return { analysis: query.data, loading: query.isLoading, error: query.error, refetch: query.refetch,
    isStale: query.data ? Date.now()-query.data.lastAnalyzed.getTime()>30_000 : true };
}

export function useMultipleRecipeAnalysis(recipeIds: string[]) {
  const [analyses,setAnalyses] = useState<Record<string,InventoryAnalysis>>({});
  const [loading,setLoading] = useState(false);
  const key = recipeIds.join('|');
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.allSettled(key.split('|').filter(Boolean).map(id => analyzeRecipeInventory(id))).then(results => {
      if (!active) return;
      const next: Record<string,InventoryAnalysis> = {};
      results.forEach(result => { if (result.status === 'fulfilled') next[result.value.recipeId] = result.value; });
      setAnalyses(next); setLoading(false);
    });
    return () => { active = false; };
  },[key]);
  return { analyses,loading };
}
