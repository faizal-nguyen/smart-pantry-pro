"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Lightbulb, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Utensils,
  AlertTriangle,
  CheckCircle,
  Snowflake,
  Sun,
  Leaf,
  Users
} from 'lucide-react';
import { WeeklyMealPlan, UserPreferences } from '@/services/planning/types';

interface SmartAdvicePanelProps {
  currentPlan: WeeklyMealPlan | null;
  userPreferences: UserPreferences | null;
  onApplyAdvice: (adviceId: string, action: any) => void;
}

interface SmartAdvice {
  id: string;
  type: 'preparation' | 'budget' | 'nutrition' | 'convenience' | 'seasonal';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  details: string;
  actionText?: string;
  action?: any;
  icon: string;
  category: string;
  estimatedBenefit?: string;
  timeToComplete?: string;
}

export function SmartAdvicePanel({ 
  currentPlan, 
  userPreferences,
  onApplyAdvice 
}: SmartAdvicePanelProps) {
  const [appliedAdvice, setAppliedAdvice] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const generateSmartAdvice = (): SmartAdvice[] => {
    const advice: SmartAdvice[] = [];

    if (!currentPlan) return advice;

    // Preparation Tips - Freezer Management
    const mealsWithFrozenIngredients = currentPlan.meals.filter(meal => 
      meal.preparationTips?.some(tip => tip.type === 'defrost')
    );

    if (mealsWithFrozenIngredients.length > 0) {
      advice.push({
        id: 'freezer-management',
        type: 'preparation',
        priority: 'high',
        title: 'Gestion du congélateur',
        description: 'Optimisez la décongélation de vos aliments',
        details: `Vous avez ${mealsWithFrozenIngredients.length} repas qui nécessitent une décongélation. Planifiez la sortie des aliments du congélateur 12-24h à l'avance.`,
        actionText: 'Créer planning décongélation',
        action: { type: 'create_defrost_schedule', meals: mealsWithFrozenIngredients },
        icon: '❄️',
        category: 'Préparation',
        estimatedBenefit: 'Évite les oublis',
        timeToComplete: '2 min'
      });
    }

    // Batch Cooking Opportunities
    const similarMeals = findSimilarMeals(currentPlan.meals);
    if (similarMeals.length > 0) {
      advice.push({
        id: 'batch-cooking',
        type: 'convenience',
        priority: 'medium',
        title: 'Batch Cooking Recommandé',
        description: 'Préparez plusieurs repas en une fois',
        details: `Vous pouvez préparer ${similarMeals.length} repas similaires en même temps pour économiser du temps et de l'énergie.`,
        actionText: 'Organiser batch cooking',
        action: { type: 'create_batch_schedule', meals: similarMeals },
        icon: '👨‍🍳',
        category: 'Organisation',
        estimatedBenefit: '2h économisées',
        timeToComplete: '5 min'
      });
    }

    // Budget Optimization
    if (userPreferences) {
      const budgetUsage = (currentPlan.totalEstimatedCost / userPreferences.budgetConstraints.weeklyBudget);
      
      if (budgetUsage > 0.9) {
        advice.push({
          id: 'budget-optimization',
          type: 'budget',
          priority: 'high',
          title: 'Optimisation du Budget',
          description: 'Réduisez vos coûts sans compromettre la nutrition',
          details: `Votre budget est dépassé de ${((budgetUsage - 1) * 100).toFixed(1)}%. Voici des suggestions pour réduire les coûts.`,
          actionText: 'Optimiser automatiquement',
          action: { type: 'optimize_budget' },
          icon: '💰',
          category: 'Budget',
          estimatedBenefit: `${(currentPlan.totalEstimatedCost * 0.15).toFixed(2)}€ économisés`,
          timeToComplete: '30 sec'
        });
      }
    }

    // Nutritional Balance
    if (currentPlan.nutritionalSummary) {
      const healthScore = currentPlan.nutritionalSummary.healthScore;
      
      if (healthScore < 7) {
        advice.push({
          id: 'nutrition-balance',
          type: 'nutrition',
          priority: 'medium',
          title: 'Équilibre Nutritionnel',
          description: 'Améliorez l\'équilibre de vos repas',
          details: `Votre score santé est de ${healthScore.toFixed(1)}/10. Ajoutez plus de légumes et réduisez les aliments transformés.`,
          actionText: 'Rééquilibrer automatiquement',
          action: { type: 'rebalance_nutrition' },
          icon: '🥗',
          category: 'Nutrition',
          estimatedBenefit: `Score santé: +${(2).toFixed(1)} points`,
          timeToComplete: '1 min'
        });
      }
    }

    // Seasonal Recommendations
    const currentSeason = getCurrentSeason();
    const seasonalIngredients = getSeasonalIngredients(currentSeason);
    
    advice.push({
      id: 'seasonal-ingredients',
      type: 'seasonal',
      priority: 'low',
      title: `Ingrédients de ${currentSeason}`,
      description: 'Profitez des produits de saison',
      details: `Les ${seasonalIngredients.slice(0, 3).join(', ')} sont particulièrement savoureux et économiques en ce moment.`,
      actionText: 'Voir recettes saisonnières',
      action: { type: 'show_seasonal_recipes', ingredients: seasonalIngredients },
      icon: currentSeason === 'hiver' ? '❄️' : currentSeason === 'été' ? '☀️' : '🍂',
      category: 'Saisonnier',
      estimatedBenefit: '10-20% moins cher',
      timeToComplete: '2 min'
    });

    // Family Size Optimization
    if (userPreferences && userPreferences.familySize > 2) {
      const familyMeals = currentPlan.meals.filter(meal => 
        meal.servings >= userPreferences.familySize
      );
      
      if (familyMeals.length < currentPlan.meals.length * 0.7) {
        advice.push({
          id: 'family-portions',
          type: 'convenience',
          priority: 'medium',
          title: 'Adaptation Taille Famille',
          description: 'Optimisez les portions pour votre famille',
          details: `Adaptez automatiquement les portions pour ${userPreferences.familySize} personnes et gérez les restes.`,
          actionText: 'Adapter les portions',
          action: { type: 'adjust_family_portions', familySize: userPreferences.familySize },
          icon: '👨‍👩‍👧‍👦',
          category: 'Famille',
          estimatedBenefit: 'Moins de gaspillage',
          timeToComplete: '30 sec'
        });
      }
    }

    // Time Management
    const avgPrepTime = currentPlan.meals.reduce((sum, meal) => sum + meal.estimatedTime, 0) / currentPlan.meals.length;
    
    if (userPreferences && avgPrepTime > userPreferences.timeConstraints.maxPrepTime) {
      advice.push({
        id: 'time-optimization',
        type: 'convenience',
        priority: 'medium',
        title: 'Optimisation du Temps',
        description: 'Réduisez le temps de préparation',
        details: `Temps moyen actuel: ${avgPrepTime.toFixed(0)}min. Objectif: ${userPreferences.timeConstraints.maxPrepTime}min.`,
        actionText: 'Suggérer recettes rapides',
        action: { type: 'suggest_quick_recipes', maxTime: userPreferences.timeConstraints.maxPrepTime },
        icon: '⚡',
        category: 'Temps',
        estimatedBenefit: `${(avgPrepTime - userPreferences.timeConstraints.maxPrepTime).toFixed(0)}min économisées/repas`,
        timeToComplete: '1 min'
      });
    }

    return advice.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };

  const findSimilarMeals = (meals: any[]): any[] => {
    // Find meals that share common preparation techniques or ingredients
    const groups: { [key: string]: any[] } = {};
    
    meals.forEach(meal => {
      const key = meal.preparationMethod || meal.mealType;
      if (!groups[key]) groups[key] = [];
      groups[key].push(meal);
    });

    return Object.values(groups).filter(group => group.length > 1).flat();
  };

  const getCurrentSeason = (): string => {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'printemps';
    if (month >= 5 && month <= 7) return 'été';
    if (month >= 8 && month <= 10) return 'automne';
    return 'hiver';
  };

  const getSeasonalIngredients = (season: string): string[] => {
    const seasonal = {
      'printemps': ['asperges', 'radis', 'petits pois', 'artichauts', 'fraises'],
      'été': ['tomates', 'courgettes', 'aubergines', 'pêches', 'melons'],
      'automne': ['courges', 'champignons', 'pommes', 'poires', 'châtaignes'],
      'hiver': ['poireaux', 'choux', 'carottes', 'oranges', 'mandarines']
    };
    
    return seasonal[season as keyof typeof seasonal] || [];
  };

  const smartAdviceList = generateSmartAdvice();

  const getAdviceIcon = (type: string) => {
    switch (type) {
      case 'preparation': return <Utensils className="h-4 w-4" />;
      case 'budget': return <DollarSign className="h-4 w-4" />;
      case 'nutrition': return <Leaf className="h-4 w-4" />;
      case 'convenience': return <Clock className="h-4 w-4" />;
      case 'seasonal': return <Sun className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-orange-200 bg-orange-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  const handleApplyAdvice = (advice: SmartAdvice) => {
    setAppliedAdvice(prev => new Set([...prev, advice.id]));
    onApplyAdvice(advice.id, advice.action);
  };

  const filteredAdvice = selectedCategory === 'all' 
    ? smartAdviceList 
    : smartAdviceList.filter(advice => advice.category.toLowerCase() === selectedCategory);

  const categories = Array.from(new Set(smartAdviceList.map(advice => advice.category)));

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
        >
          Tout ({smartAdviceList.length})
        </Button>
        {categories.map(category => {
          const count = smartAdviceList.filter(advice => advice.category === category).length;
          return (
            <Button
              key={category}
              variant={selectedCategory === category.toLowerCase() ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.toLowerCase())}
            >
              {category} ({count})
            </Button>
          );
        })}
      </div>

      {/* Advice Cards */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-3">
          {filteredAdvice.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">Aucun conseil disponible</h3>
                <p className="text-sm text-muted-foreground">
                  Créez un plan de repas pour recevoir des conseils personnalisés
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredAdvice.map((advice) => {
              const isApplied = appliedAdvice.has(advice.id);
              
              return (
                <Card 
                  key={advice.id}
                  className={`transition-all ${getPriorityColor(advice.priority)} ${
                    isApplied ? 'opacity-60' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {getAdviceIcon(advice.type)}
                            <span className="text-xl">{advice.icon}</span>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm">{advice.title}</h4>
                              <Badge 
                                variant={advice.priority === 'high' ? 'destructive' : 
                                        advice.priority === 'medium' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {advice.priority === 'high' ? 'Urgent' :
                                 advice.priority === 'medium' ? 'Important' : 'Suggéré'}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {advice.category}
                              </Badge>
                              {advice.estimatedBenefit && (
                                <Badge variant="secondary" className="text-xs">
                                  {advice.estimatedBenefit}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {isApplied && (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-sm">{advice.description}</p>
                      
                      {/* Details */}
                      <p className="text-xs text-muted-foreground bg-white/50 p-2 rounded">
                        {advice.details}
                      </p>

                      {/* Benefits & Time */}
                      {(advice.estimatedBenefit || advice.timeToComplete) && (
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {advice.estimatedBenefit && (
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {advice.estimatedBenefit}
                            </div>
                          )}
                          {advice.timeToComplete && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {advice.timeToComplete}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Button */}
                      {advice.actionText && !isApplied && (
                        <Button 
                          size="sm"
                          variant={advice.priority === 'high' ? 'default' : 'outline'}
                          onClick={() => handleApplyAdvice(advice)}
                          className="w-full"
                        >
                          {advice.actionText}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Quick Stats */}
      {smartAdviceList.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-red-600">
                  {smartAdviceList.filter(a => a.priority === 'high').length}
                </div>
                <div className="text-xs text-muted-foreground">Urgent</div>
              </div>
              
              <div>
                <div className="text-lg font-bold text-orange-600">
                  {smartAdviceList.filter(a => a.priority === 'medium').length}
                </div>
                <div className="text-xs text-muted-foreground">Important</div>
              </div>
              
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {appliedAdvice.size}
                </div>
                <div className="text-xs text-muted-foreground">Appliqués</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Learning Notice */}
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-4 w-4 text-purple-600" />
            <h4 className="font-medium text-sm text-purple-800">
              Intelligence Adaptative
            </h4>
          </div>
          <p className="text-xs text-purple-700">
            Les conseils s'améliorent avec vos habitudes. Plus vous utilisez la planification, 
            plus les recommandations deviennent précises et personnalisées.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}