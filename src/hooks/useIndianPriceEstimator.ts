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
  
  // Forcer l'utilisation du calcul local si la fonction Edge a des problèmes
  const FORCE_LOCAL_CALCULATION = true;

  // Fonction locale de secours pour calculer les prix
  const calculateLocalPrices = (ingredients: RecipeIngredient[]): PriceEstimationResult => {
    const estimates = ingredients.map(ing => {
      const quantity = ing.quantity || 1;
      const unit = (ing.unit || 'unité').toLowerCase().trim();
      let basePrice = 5.0; // Prix par défaut
      let finalPrice = basePrice;
      
      // Prix spéciaux pour différents ingrédients
      const name = ing.ingredient_name.toLowerCase();
      if (name.includes('eau') || name.includes('water')) {
        basePrice = 0.001; // €/L
      } else if (name.includes('huile végétale') || name.includes('vegetable oil')) {
        basePrice = 3.0; // €/L
      } else if (name.includes('huile') || name.includes('oil')) {
        basePrice = 3.0; // €/L
      } else if (name.includes('sel') || name.includes('salt')) {
        basePrice = 0.8; // €/kg
      } else if (name.includes('sucre') || name.includes('sugar')) {
        basePrice = 1.2; // €/kg
      } else if (name.includes('farine') || name.includes('flour')) {
        basePrice = 1.0; // €/kg
      } else if (name.includes('lait') || name.includes('milk')) {
        basePrice = 1.2; // €/L
      } else if (name.includes('oeuf') || name.includes('egg')) {
        basePrice = 0.25; // €/unité
      }
      
      console.log(`Prix de base pour ${name}: ${basePrice}€`);
      
      // Calcul selon l'unité
      if (unit.includes('ml')) {
        finalPrice = basePrice * (quantity / 1000);
        console.log(`Calcul ML: ${quantity}ml × ${basePrice}€/L ÷ 1000 = ${finalPrice}€`);
      } else if (unit.includes('cl')) {
        finalPrice = basePrice * (quantity / 100);
        console.log(`Calcul CL: ${quantity}cl × ${basePrice}€/L ÷ 100 = ${finalPrice}€`);
      } else if (unit === 'l' || unit.includes('litre')) {
        finalPrice = basePrice * quantity;
        console.log(`Calcul L: ${quantity}L × ${basePrice}€/L = ${finalPrice}€`);
      } else if (unit.includes('g') && !unit.includes('kg')) {
        finalPrice = basePrice * (quantity / 1000);
        console.log(`Calcul G: ${quantity}g × ${basePrice}€/kg ÷ 1000 = ${finalPrice}€`);
      } else if (unit === 'kg' || unit.includes('kilogramme')) {
        finalPrice = basePrice * quantity;
        console.log(`Calcul KG: ${quantity}kg × ${basePrice}€/kg = ${finalPrice}€`);
      } else if (unit.includes('cuillère à soupe') || unit.includes('cas')) {
        finalPrice = basePrice * (quantity * 15 / 1000);
        console.log(`Calcul CAS: ${quantity} cas × 15ml × ${basePrice}€/L ÷ 1000 = ${finalPrice}€`);
      } else if (unit.includes('cuillère à café') || unit.includes('cac')) {
        finalPrice = basePrice * (quantity * 5 / 1000);
        console.log(`Calcul CAC: ${quantity} cac × 5ml × ${basePrice}€/L ÷ 1000 = ${finalPrice}€`);
      } else if (unit.includes('tasse')) {
        finalPrice = basePrice * (quantity * 250 / 1000);
        console.log(`Calcul TASSE: ${quantity} tasse × 250ml × ${basePrice}€/L ÷ 1000 = ${finalPrice}€`);
      } else {
        // Pour les unités, estimer 10g
        finalPrice = basePrice * (quantity * 10 / 1000);
        console.log(`Calcul UNITÉ: ${quantity} unité × 10g × ${basePrice}€/kg ÷ 1000 = ${finalPrice}€`);
      }
      
      return {
        name: ing.ingredient_name,
        frenchName: ing.ingredient_name,
        englishName: ing.ingredient_name,
        quantity,
        unit: ing.unit || 'unité',
        estimatedPrice: Math.round(finalPrice * 100) / 100,
        basePrice,
        source: 'local-estimate'
      };
    });
    
    const totalCost = Math.round(estimates.reduce((sum, e) => sum + e.estimatedPrice, 0) * 100) / 100;
    
    return {
      estimates,
      totalCost,
      currency: '€',
      source: 'local-estimate',
      disclaimer: 'Prix estimés localement (fonction Edge non disponible)'
    };
  };

  const estimatePrices = async (
    ingredients: RecipeIngredient[],
    recipeId?: string
  ): Promise<PriceEstimationResult | null> => {
    setLoading(true);
    setError(null);

    try {
      // Si on force le calcul local, l'utiliser directement
      if (FORCE_LOCAL_CALCULATION) {
        console.log('Utilisation forcée du calcul local des prix');
        return calculateLocalPrices(ingredients);
      }
      
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
        // Si la fonction Edge échoue, utiliser le calcul local
        console.warn('Fonction Edge non disponible, utilisation du calcul local');
        return calculateLocalPrices(ingredients);
      }
      
      // Vérifier et corriger les prix aberrants
      const data = response.data as PriceEstimationResult;
      console.log('Prix reçus de la fonction Edge:', data);
      
      if (data && data.estimates) {
        let hasCorrections = false;
        data.estimates = data.estimates.map(est => {
          // Log pour debug
          console.log(`Vérification prix pour ${est.name}: ${est.estimatedPrice}€`);
          
          // Si le prix est supérieur à 1€ pour de l'eau, c'est une erreur
          if ((est.name.toLowerCase().includes('eau') || est.name.toLowerCase().includes('water')) && 
              est.estimatedPrice > 1) {
            console.warn(`Prix aberrant détecté pour ${est.name}: ${est.estimatedPrice}€, correction appliquée`);
            hasCorrections = true;
            // Calculer le bon prix pour l'eau
            const waterPrice = 0.001 * (est.quantity / 1000); // 0.001€/L
            return {
              ...est,
              estimatedPrice: Math.round(waterPrice * 100) / 100
            };
          }
          
          // Si le prix est supérieur à 10€ pour de l'huile en petite quantité, c'est une erreur
          if ((est.name.toLowerCase().includes('huile') || est.name.toLowerCase().includes('oil')) && 
              est.estimatedPrice > 10 && est.quantity < 1000) {
            console.warn(`Prix aberrant détecté pour ${est.name}: ${est.estimatedPrice}€ pour ${est.quantity}${est.unit}, correction appliquée`);
            hasCorrections = true;
            // Calculer le bon prix pour l'huile
            let oilPrice = 3.0; // €/L par défaut
            if (est.unit.toLowerCase().includes('ml')) {
              oilPrice = 3.0 * (est.quantity / 1000);
            } else if (est.unit.toLowerCase().includes('cl')) {
              oilPrice = 3.0 * (est.quantity / 100);
            } else if (est.unit.toLowerCase().includes('l')) {
              oilPrice = 3.0 * est.quantity;
            }
            return {
              ...est,
              estimatedPrice: Math.round(oilPrice * 100) / 100
            };
          }
          
          return est;
        });
        
        if (hasCorrections) {
          // Recalculer le total
          data.totalCost = Math.round(data.estimates.reduce((sum, e) => sum + e.estimatedPrice, 0) * 100) / 100;
          console.log('Prix corrigés appliqués, nouveau total:', data.totalCost);
        }
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error estimating Indian prices:', err);
      // En cas d'erreur, utiliser le calcul local
      return calculateLocalPrices(ingredients);
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