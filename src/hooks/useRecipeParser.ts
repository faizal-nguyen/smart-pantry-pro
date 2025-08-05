import { useState } from "react";

// Types simplifiés pour l'extraction de recettes
export interface ExtractedRecipe {
  name: string;
  description: string;
  cuisine_type: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'dessert' | 'appetizer' | 'snack';
  prep_time: number;
  cook_time: number;
  total_time: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  ingredients: ExtractedIngredient[];
  instructions: string[];
  nutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  tags: string[];
  image_url: string;
  source_url: string;
}

export interface ExtractedIngredient {
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

// Hook simplifié pour extraire les recettes avec OpenAI uniquement
export const useRecipeParser = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const extractRecipeFromURL = async (url: string): Promise<ExtractedRecipe | null> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🤖 Extracting recipe from URL:', url);
      
      // Déterminer si on est en local ou en production
      const isLocal = window.location.hostname === 'localhost';
      const apiUrl = isLocal 
        ? 'https://smart-pantry-pro.vercel.app/api/extract-recipe'
        : '/api/extract-recipe';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success || !result.recipe) {
        throw new Error(result.error || 'Extraction failed');
      }
      
      console.log('✅ Recipe extracted successfully:', result.recipe.name);
      return result.recipe;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('❌ Recipe extraction error:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  return {
    extractRecipeFromURL,
    loading,
    error
  };
};