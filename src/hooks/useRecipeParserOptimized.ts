import { useState } from "react";

// Types pour l'extraction optimisée
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

interface ExtractionPerformance {
  total_time_ms: number;
  model_used: string;
  content_size: number;
  structured_data: boolean;
}

// Hook optimisé pour extraire les recettes
export const useRecipeParserOptimized = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [performance, setPerformance] = useState<ExtractionPerformance | null>(null);
  
  const extractRecipeFromURL = async (url: string): Promise<ExtractedRecipe | null> => {
    setLoading(true);
    setError(null);
    setPerformance(null);
    
    try {
      console.log('🚀 Extracting recipe (optimized) from URL:', url);
      
      // Utiliser l'API optimisée
      const apiUrl = '/api/extract-recipe-ultra-optimized';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        // Timeout à 30 secondes pour les sites complexes
        signal: AbortSignal.timeout(30000)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success || !result.recipe) {
        throw new Error(result.error || 'Extraction failed');
      }
      
      // Stocker les métriques de performance
      if (result.performance) {
        setPerformance(result.performance);
        console.log('⚡ Performance:', result.performance);
      }
      
      if (result.cached) {
        console.log('✨ Recipe served from cache');
      }
      
      console.log('✅ Recipe extracted successfully:', result.recipe.name);
      return result.recipe;
      
    } catch (err) {
      let errorMessage = 'Erreur inconnue';
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'L\'extraction a pris trop de temps (>30s). Veuillez réessayer.';
        } else if (err.message.includes('signal timed out')) {
          errorMessage = 'Temps dépassé. Essayez avec une URL différente.';
        } else if (err.message.includes('Failed to fetch')) {
          errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.';
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
    error,
    performance
  };
};
