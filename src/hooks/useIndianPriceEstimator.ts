import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RecipeIngredient } from './useRecipes';

interface PriceEstimate {
  name: string;
  frenchName: string;
  englishName: string;
  quantity: number;
  unit: string;
  estimatedPrice: number;
  basePrice: number;
  source: string;
}

interface PriceEstimationResult {
  estimates: PriceEstimate[];
  totalCost: number;
  currency: string;
  source: string;
  disclaimer: string;
}

export const useIndianPriceEstimator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estimatePrices = async (
    ingredients: RecipeIngredient[],
    recipeId?: string
  ): Promise<PriceEstimationResult | null> => {
    setLoading(true);
    setError(null);

    try {
      // Transform ingredients to the format expected by the API
      const ingredientData = ingredients.map(ing => ({
        name: ing.ingredient_name,
        quantity: ing.quantity || 1,
        unit: ing.unit || 'unité'
      }));

      const response = await supabase.functions.invoke('indian-price-estimator', {
        body: {
          ingredients: ingredientData,
          recipeId
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to estimate prices');
      }

      return response.data as PriceEstimationResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error estimating Indian prices:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const isIndianRecipe = (cuisineCategory?: string, tags?: string[]): boolean => {
    if (!cuisineCategory && !tags) return false;
    
    const indianKeywords = ['indien', 'indienne', 'indian', 'desi', 'punjabi', 'tamil', 'bengali', 'gujarati'];
    
    // Check cuisine category
    if (cuisineCategory && indianKeywords.some(keyword => 
      cuisineCategory.toLowerCase().includes(keyword)
    )) {
      return true;
    }
    
    // Check tags
    if (tags && tags.some(tag => 
      indianKeywords.some(keyword => tag.toLowerCase().includes(keyword))
    )) {
      return true;
    }
    
    return false;
  };

  const formatPriceDisplay = (estimate: PriceEstimate): string => {
    return `${estimate.quantity} ${estimate.unit} ${estimate.name}: ${estimate.estimatedPrice.toFixed(2)}€`;
  };

  return {
    estimatePrices,
    isIndianRecipe,
    formatPriceDisplay,
    loading,
    error
  };
};