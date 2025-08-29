"use client";

import { useEffect } from 'react';
import { useMealPlanningAnalysis } from '@/hooks/useMealPlanningAnalysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, ChefHat, DollarSign, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WeeklyCalendar } from '@/components/meal-planning/WeeklyCalendar';
import { RecommendationsPanel } from '@/components/meal-planning/RecommendationsPanel';
import { NutritionalOverview } from '@/components/meal-planning/NutritionalOverview';
import { ShoppingListPreview } from '@/components/meal-planning/ShoppingListPreview';
import { SmartAdvicePanel } from '@/components/meal-planning/SmartAdvicePanel';

export default function MealPlanningPage() {
  const {
    currentPlan,
    userPreferences,
    optimizedShoppingList,
    seasonalRecommendations,
    isGeneratingPlan,
    isOptimizingList,
    isLoadingPreferences,
    planningInsights,
    generateWeeklyPlan,
    optimizeShoppingList,
    adaptToBudget,
    loadUserPreferences,
    hasPreferences,
    canGeneratePlan,
    totalWeeklyCost,
    estimatedSavings,
    isWithinBudget
  } = useMealPlanningAnalysis();

  useEffect(() => {
    if (!hasPreferences) {
      loadUserPreferences();
    }
  }, [hasPreferences, loadUserPreferences]);

  const handleGeneratePlan = async () => {
    if (canGeneratePlan) {
      await generateWeeklyPlan();
    }
  };

  const handleOptimizeList = async () => {
    if (currentPlan) {
      await optimizeShoppingList(currentPlan);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Planification des Repas
          </h1>
          <p className="text-muted-foreground">
            Planifiez vos repas de la semaine et optimisez votre budget
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleGeneratePlan}
            disabled={!canGeneratePlan || isGeneratingPlan}
            className="gap-2"
          >
            <ChefHat className="h-4 w-4" />
            {isGeneratingPlan ? 'Génération...' : 'Générer Plan'}
          </Button>
          
          {currentPlan && (
            <Button
              variant="outline"
              onClick={handleOptimizeList}
              disabled={isOptimizingList}
              className="gap-2"
            >
              <DollarSign className="h-4 w-4" />
              {isOptimizingList ? 'Optimisation...' : 'Optimiser'}
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <CalendarDays className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                Semaine
              </p>
              <p className="text-2xl font-bold">
                {currentPlan ? 
                  `${currentPlan.weekStartDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` 
                  : 'Aucun plan'
                }
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <DollarSign className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                Budget
              </p>
              <p className="text-2xl font-bold">
                {totalWeeklyCost.toFixed(2)}€
              </p>
              <p className="text-xs text-muted-foreground">
                /{userPreferences?.budgetConstraints.weeklyBudget || 100}€
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <TrendingUp className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                Score Santé
              </p>
              <p className="text-2xl font-bold">
                {planningInsights.healthScore}/10
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <ChefHat className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                Variété
              </p>
              <p className="text-2xl font-bold">
                {planningInsights.varietyScore}/10
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Calendar - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Planning Hebdomadaire
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WeeklyCalendar 
                plan={currentPlan}
                onMealChange={(dayIndex, mealType, recipeId) => {
                  console.log('Meal changed:', { dayIndex, mealType, recipeId });
                }}
                isEditable={!isGeneratingPlan}
              />
            </CardContent>
          </Card>

          {/* Nutritional Overview */}
          {currentPlan && (
            <Card>
              <CardHeader>
                <CardTitle>Aperçu Nutritionnel</CardTitle>
              </CardHeader>
              <CardContent>
                <NutritionalOverview 
                  plan={currentPlan}
                  userPreferences={userPreferences}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tabbed Sidebar Content */}
          <Card>
            <CardContent className="p-0">
              <Tabs defaultValue="recommendations" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="recommendations" className="text-xs">
                    💡 Suggestions
                  </TabsTrigger>
                  <TabsTrigger value="advice" className="text-xs">
                    🧠 Conseils
                  </TabsTrigger>
                  <TabsTrigger value="shopping" className="text-xs">
                    🛒 Courses
                  </TabsTrigger>
                </TabsList>

                <div className="p-4">
                  <TabsContent value="recommendations" className="mt-0">
                    <RecommendationsPanel 
                      recommendations={seasonalRecommendations}
                      userPreferences={userPreferences}
                      currentPlan={currentPlan}
                      onAcceptRecommendation={(recipeId) => {
                        console.log('Recommendation accepted:', recipeId);
                      }}
                    />
                  </TabsContent>

                  <TabsContent value="advice" className="mt-0">
                    <SmartAdvicePanel 
                      currentPlan={currentPlan}
                      userPreferences={userPreferences}
                      onApplyAdvice={(adviceId, action) => {
                        console.log('Advice applied:', { adviceId, action });
                      }}
                    />
                  </TabsContent>

                  <TabsContent value="shopping" className="mt-0">
                    {optimizedShoppingList ? (
                      <ShoppingListPreview 
                        shoppingList={optimizedShoppingList}
                        onExportToShoppingList={() => {
                          console.log('Export to shopping list');
                        }}
                      />
                    ) : (
                      <div className="text-center p-8 text-muted-foreground">
                        <div className="text-4xl mb-2">🛒</div>
                        <h3 className="font-medium mb-1">Pas de liste de courses</h3>
                        <p className="text-sm">
                          Générez un plan de repas pour créer votre liste
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Loading States */}
      {isLoadingPreferences && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span>Chargement des préférences...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Warning */}
      {!isWithinBudget && totalWeeklyCost > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-orange-600" />
              <span className="text-orange-800">
                Budget dépassé de {(totalWeeklyCost - (userPreferences?.budgetConstraints.weeklyBudget || 100)).toFixed(2)}€
              </span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => userPreferences && adaptToBudget(userPreferences.budgetConstraints)}
                className="ml-auto"
              >
                Optimiser
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}