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
      
      // Utiliser l'API locale en développement, relative en production
      const isDevelopment = window.location.hostname === 'localhost';
      const apiUrl = isDevelopment 
        ? 'http://localhost:3001/api/extract-recipe'
        : '/api/extract-recipe';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        // Timeout après 60 secondes pour les recettes complexes
        signal: AbortSignal.timeout(60000)
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
      let errorMessage = 'Erreur inconnue';
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'L\'extraction prend plus de temps que prévu. Veuillez patienter ou réessayer avec une URL différente.';
        } else if (err.message.includes('signal timed out')) {
          errorMessage = 'Temps d\'extraction dépassé (60s). La recette est peut-être trop complexe ou le site est lent.';
        } else if (err.message.includes('Failed to fetch')) {
          errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.';
        } else if (err.message.includes('CORS')) {
          errorMessage = 'Erreur de configuration. Rechargez la page et réessayez.';
        } else {
          errorMessage = err.message;
        }
      }
      
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