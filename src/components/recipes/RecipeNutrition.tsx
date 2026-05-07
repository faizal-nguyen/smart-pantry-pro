import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Apple, 
  Wheat, 
  Droplet, 
  Flame, 
  Dumbbell,
  Cookie,
  Beef,
  AlertCircle,
  RefreshCw,
  Info
} from 'lucide-react';
import { openFoodFactsService } from '@/services/nutrition/openFoodFactsService';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RecipeIngredient {
  ingredient_name: string;
  quantity: number;
  unit: string;
}

/**
 * Persisted nutrition payload stored on `recipes.nutrition_info`.
 * Shape mirrors `openFoodFactsService.calculateRecipeNutrition`'s
 * return value plus a `computedAt` ISO timestamp for cache age
 * debugging.
 */
interface CachedNutrition {
  totalNutrition: NutritionData;
  missingIngredients?: string[];
  foundIngredients?: unknown[];
  computedAt?: string;
}

/** Type guard for the JSONB blob coming back from Supabase. */
function isCachedNutrition(value: unknown): value is CachedNutrition {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return !!v.totalNutrition && typeof v.totalNutrition === 'object';
}

interface RecipeNutritionProps {
  ingredients: RecipeIngredient[];
  servings: number;
  /**
   * When provided alongside `cachedNutrition`, the component renders
   * immediately from the cache and skips the OpenFoodFacts round-trip.
   * On a cache miss, the live compute is persisted back to
   * `recipes.nutrition_info` so subsequent views stay instant.
   */
  recipeId?: string;
  cachedNutrition?: unknown;
}

interface NutritionData {
  energy_kcal?: number;
  proteins?: number;
  carbohydrates?: number;
  sugars?: number;
  fat?: number;
  saturated_fat?: number;
  fiber?: number;
  salt?: number;
}

export function RecipeNutrition({
  ingredients,
  servings,
  recipeId,
  cachedNutrition,
}: RecipeNutritionProps) {
  const [loading, setLoading] = useState(false);
  const [nutritionData, setNutritionData] = useState<NutritionData | null>(null);
  const [missingIngredients, setMissingIngredients] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [foundIngredients, setFoundIngredients] = useState<any[]>([]);

  useEffect(() => {
    // PRP-220 follow-up: prefer the persisted nutrition_info blob if
    // it's a usable cache. Saves ~10 OpenFoodFacts HTTP round-trips
    // per recipe view. Recipes saved before this landed get a lazy
    // backfill on their next view (see fetchNutritionData below).
    if (isCachedNutrition(cachedNutrition)) {
      setNutritionData(cachedNutrition.totalNutrition);
      setMissingIngredients(cachedNutrition.missingIngredients ?? []);
      setFoundIngredients(
        Array.isArray(cachedNutrition.foundIngredients)
          ? cachedNutrition.foundIngredients
          : []
      );
      return;
    }
    if (ingredients.length > 0) {
      fetchNutritionData();
    }
    // We deliberately depend on the cached blob's identity, not its
    // content — Supabase returns a fresh object on each row read, but
    // the cache is row-level so identity tracks "the recipe changed"
    // closely enough for this lazy-backfill case.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingredients, cachedNutrition]);

  const persistNutrition = (result: {
    totalNutrition: NutritionData;
    missingIngredients: string[];
    foundIngredients: unknown[];
  }) => {
    if (!recipeId) return;
    const payload: CachedNutrition = {
      ...result,
      computedAt: new Date().toISOString(),
    };
    // Fire-and-forget: the user UX has no dependency on the write
    // succeeding (the next render will just recompute). RLS already
    // restricts the update to the row's owner, so a stale token or a
    // shared session can't corrupt anyone else's cache.
    void supabase
      .from('recipes')
      .update({ nutrition_info: payload })
      .eq('id', recipeId)
      .then(({ error }) => {
        if (error) {
          console.warn('[RecipeNutrition] cache persist failed:', error.message);
        }
      });
  };

  const fetchNutritionData = async (clearCache = false) => {
    setLoading(true);
    try {
      if (clearCache) {
        openFoodFactsService.clearCache();
      }

      const result = await openFoodFactsService.calculateRecipeNutrition(ingredients);
      setNutritionData(result.totalNutrition);
      setMissingIngredients(result.missingIngredients);
      setFoundIngredients(result.foundIngredients);
      persistNutrition(result);

      console.log('📊 Résultats nutritionnels:', {
        total: result.totalNutrition,
        trouvés: result.foundIngredients.length,
        manquants: result.missingIngredients,
        cachedFor: recipeId ?? 'n/a',
      });
    } catch (error) {
      console.error('Error fetching nutrition data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de calculer les valeurs nutritionnelles",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getNutrientIcon = (nutrient: string) => {
    switch (nutrient) {
      case 'energy': return <Flame className="h-4 w-4" />;
      case 'proteins': return <Beef className="h-4 w-4" />;
      case 'carbohydrates': return <Wheat className="h-4 w-4" />;
      case 'sugars': return <Cookie className="h-4 w-4" />;
      case 'fat': return <Droplet className="h-4 w-4" />;
      case 'fiber': return <Apple className="h-4 w-4" />;
      default: return null;
    }
  };

  const getPerServing = (value: number | undefined): string => {
    if (!value) return '0';
    return (value / servings).toFixed(1);
  };

  const getDailyValue = (nutrient: string, value: number | undefined): number => {
    if (!value) return 0;
    
    // Valeurs journalières recommandées (pour un adulte)
    const dailyValues: Record<string, number> = {
      energy_kcal: 2000,
      proteins: 50,
      carbohydrates: 300,
      sugars: 90,
      fat: 70,
      saturated_fat: 20,
      fiber: 25,
      salt: 6,
    };

    const perServing = value / servings;
    const daily = dailyValues[nutrient];
    
    return daily ? Math.round((perServing / daily) * 100) : 0;
  };

  const getNutriScoreEstimate = (): string => {
    if (!nutritionData) return 'N/A';
    
    // Calcul simplifié du Nutri-Score
    let score = 0;
    
    // Négatifs
    if (nutritionData.energy_kcal) score += (nutritionData.energy_kcal / servings) / 100;
    if (nutritionData.saturated_fat) score += (nutritionData.saturated_fat / servings) * 2;
    if (nutritionData.sugars) score += (nutritionData.sugars / servings) * 0.5;
    if (nutritionData.salt) score += (nutritionData.salt / servings) * 10;
    
    // Positifs
    if (nutritionData.fiber) score -= (nutritionData.fiber / servings) * 2;
    if (nutritionData.proteins) score -= (nutritionData.proteins / servings) * 0.5;
    
    if (score < 0) return 'A';
    if (score < 3) return 'B';
    if (score < 11) return 'C';
    if (score < 19) return 'D';
    return 'E';
  };

  const getNutriScoreColor = (score: string): string => {
    const colors: Record<string, string> = {
      A: 'bg-green-500',
      B: 'bg-lime-500',
      C: 'bg-yellow-500',
      D: 'bg-orange-500',
      E: 'bg-red-500',
    };
    return colors[score] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Valeurs nutritionnelles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!nutritionData) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Valeurs nutritionnelles
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              className={`${getNutriScoreColor(getNutriScoreEstimate())} text-white font-bold`}
            >
              Nutri-Score {getNutriScoreEstimate()}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchNutritionData(true)}
              title="Recalculer avec cache vidé"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Par portion ({servings} portions)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calories principales */}
        <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-600" />
              <span className="font-semibold">Calories</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-orange-600">
                {getPerServing(nutritionData.energy_kcal)} kcal
              </div>
              <div className="text-sm text-muted-foreground">
                {getDailyValue('energy_kcal', nutritionData.energy_kcal)}% AJR
              </div>
            </div>
          </div>
        </div>

        {/* Macronutriments */}
        <div className="space-y-3">
          {/* Protéines */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Beef className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium">Protéines</span>
              </div>
              <span className="text-sm font-semibold">
                {getPerServing(nutritionData.proteins)}g
              </span>
            </div>
            <Progress 
              value={getDailyValue('proteins', nutritionData.proteins)} 
              className="h-2"
            />
          </div>

          {/* Glucides */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wheat className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium">Glucides</span>
              </div>
              <span className="text-sm font-semibold">
                {getPerServing(nutritionData.carbohydrates)}g
              </span>
            </div>
            <Progress 
              value={getDailyValue('carbohydrates', nutritionData.carbohydrates)} 
              className="h-2"
            />
            {nutritionData.sugars !== undefined && (
              <p className="text-xs text-muted-foreground ml-6">
                dont sucres: {getPerServing(nutritionData.sugars)}g
              </p>
            )}
          </div>

          {/* Lipides */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplet className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Lipides</span>
              </div>
              <span className="text-sm font-semibold">
                {getPerServing(nutritionData.fat)}g
              </span>
            </div>
            <Progress 
              value={getDailyValue('fat', nutritionData.fat)} 
              className="h-2"
            />
            {nutritionData.saturated_fat !== undefined && (
              <p className="text-xs text-muted-foreground ml-6">
                dont saturés: {getPerServing(nutritionData.saturated_fat)}g
              </p>
            )}
          </div>

          {/* Fibres */}
          {nutritionData.fiber !== undefined && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Apple className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Fibres</span>
                </div>
                <span className="text-sm font-semibold">
                  {getPerServing(nutritionData.fiber)}g
                </span>
              </div>
              <Progress 
                value={getDailyValue('fiber', nutritionData.fiber)} 
                className="h-2"
              />
            </div>
          )}

          {/* Sel */}
          {nutritionData.salt !== undefined && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Sel</span>
                <span className="text-sm font-semibold">
                  {getPerServing(nutritionData.salt)}g
                </span>
              </div>
              <Progress 
                value={getDailyValue('salt', nutritionData.salt)} 
                className="h-2"
              />
            </div>
          )}
        </div>

        {/* Avertissement */}
        {missingIngredients.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Données manquantes pour {missingIngredients.length} ingrédient{missingIngredients.length > 1 ? 's' : ''}
              </p>
              {showDetails && (
                <div className="space-y-2 mt-2">
                  <div>
                    <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">Ingrédients non trouvés:</p>
                    <ul className="text-xs text-yellow-700 dark:text-yellow-300">
                      {missingIngredients.map((ing, i) => (
                        <li key={i}>• {ing}</li>
                      ))}
                    </ul>
                  </div>
                  {foundIngredients.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-300 mt-2">Ingrédients trouvés:</p>
                      <ul className="text-xs text-yellow-700 dark:text-yellow-300">
                        {foundIngredients.map((item, i) => (
                          <li key={i}>
                            • {item.name}: {item.nutrition.energy_kcal?.toFixed(0)} kcal, 
                            {item.nutrition.proteins?.toFixed(1)}g protéines
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-yellow-700"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Masquer' : 'Voir les détails'}
              </Button>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="h-3 w-3 mt-0.5" />
          <p>
            Valeurs calculées à partir de la base OpenFoodFacts. 
            Les valeurs réelles peuvent varier selon les marques et la préparation.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}