"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Lightbulb } from 'lucide-react';
import { WeeklyMealPlan, UserPreferences } from '@/services/planning/types';

interface NutritionalOverviewProps {
  plan: WeeklyMealPlan;
  userPreferences: UserPreferences | null;
}

interface NutritionalMetric {
  name: string;
  current: number;
  target: number;
  unit: string;
  status: 'good' | 'warning' | 'danger';
}

export function NutritionalOverview({ plan, userPreferences }: NutritionalOverviewProps) {
  
  const calculateDailyAverages = () => {
    if (!plan.nutritionalSummary) {
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0
      };
    }

    const summary = plan.nutritionalSummary;
    const daysWithMeals = Math.max(1, plan.meals.length / 2); // Assuming 2 meals per day
    
    return {
      calories: summary.totalCalories / daysWithMeals,
      protein: summary.totalProtein / daysWithMeals,
      carbs: summary.totalCarbs / daysWithMeals,
      fat: summary.totalFat / daysWithMeals,
      fiber: summary.totalFiber / daysWithMeals
    };
  };

  const getTargetValues = () => {
    const goals = userPreferences?.nutritionalGoals;
    
    return {
      calories: goals?.targetCalories || 2000,
      protein: goals?.targetProtein || 150,
      carbs: goals?.targetCarbs || 250,
      fat: goals?.targetFat || 70,
      fiber: goals?.targetFiber || 25
    };
  };

  const dailyAverages = calculateDailyAverages();
  const targets = getTargetValues();

  const getMetrics = (): NutritionalMetric[] => [
    {
      name: 'Calories',
      current: dailyAverages.calories,
      target: targets.calories,
      unit: 'kcal',
      status: Math.abs(dailyAverages.calories - targets.calories) <= targets.calories * 0.1 ? 'good' :
              Math.abs(dailyAverages.calories - targets.calories) <= targets.calories * 0.2 ? 'warning' : 'danger'
    },
    {
      name: 'Protéines',
      current: dailyAverages.protein,
      target: targets.protein,
      unit: 'g',
      status: dailyAverages.protein >= targets.protein * 0.8 ? 'good' :
              dailyAverages.protein >= targets.protein * 0.6 ? 'warning' : 'danger'
    },
    {
      name: 'Glucides',
      current: dailyAverages.carbs,
      target: targets.carbs,
      unit: 'g',
      status: Math.abs(dailyAverages.carbs - targets.carbs) <= targets.carbs * 0.15 ? 'good' :
              Math.abs(dailyAverages.carbs - targets.carbs) <= targets.carbs * 0.3 ? 'warning' : 'danger'
    },
    {
      name: 'Lipides',
      current: dailyAverages.fat,
      target: targets.fat,
      unit: 'g',
      status: Math.abs(dailyAverages.fat - targets.fat) <= targets.fat * 0.15 ? 'good' :
              Math.abs(dailyAverages.fat - targets.fat) <= targets.fat * 0.3 ? 'warning' : 'danger'
    },
    {
      name: 'Fibres',
      current: dailyAverages.fiber,
      target: targets.fiber,
      unit: 'g',
      status: dailyAverages.fiber >= targets.fiber * 0.8 ? 'good' :
              dailyAverages.fiber >= targets.fiber * 0.6 ? 'warning' : 'danger'
    }
  ];

  const metrics = getMetrics();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-orange-600 bg-orange-100';
      case 'danger': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (metric: NutritionalMetric) => {
    const percentage = (metric.current / metric.target) * 100;
    
    if (percentage > 110) return <TrendingUp className="h-3 w-3" />;
    if (percentage < 80) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getProgressValue = (metric: NutritionalMetric) => {
    return Math.min(100, (metric.current / metric.target) * 100);
  };

  return (
    <div className="space-y-4">
      {/* Nutritional Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.name}>
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{metric.name}</h4>
                    {getStatusIcon(metric)}
                  </div>
                  <Badge className={`text-xs ${getStatusColor(metric.status)}`}>
                    {metric.status === 'good' ? '✓' : 
                     metric.status === 'warning' ? '⚠' : '✗'}
                  </Badge>
                </div>

                {/* Values */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Actuel</span>
                    <span className="font-medium">
                      {metric.current.toFixed(1)} {metric.unit}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Objectif</span>
                    <span>{metric.target} {metric.unit}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <Progress 
                  value={getProgressValue(metric)} 
                  className="h-2"
                />
                
                <div className="text-xs text-center text-muted-foreground">
                  {getProgressValue(metric).toFixed(0)}% de l'objectif
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weekly Summary */}
      {plan.nutritionalSummary && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-sm mb-3">Résumé de la semaine</h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {plan.nutritionalSummary.healthScore.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">Score santé</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {plan.nutritionalSummary.varietyScore.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">Variété</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {plan.nutritionalSummary.totalCalories.toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground">Calories totales</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {((plan.nutritionalSummary.totalProtein / plan.nutritionalSummary.totalCalories) * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">% Protéines</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Nutritional Recommendations */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Conseils Nutritionnels
          </h4>
          
          <div className="space-y-2">
            {metrics.filter(m => m.status !== 'good').map(metric => (
              <div key={metric.name} className="text-sm p-2 rounded bg-blue-50 border-l-2 border-blue-200">
                {metric.current < metric.target * 0.8 ? (
                  <span className="text-blue-800">
                    💡 Augmentez votre apport en {metric.name.toLowerCase()} 
                    ({(metric.target - metric.current).toFixed(1)} {metric.unit} manquants)
                  </span>
                ) : metric.current > metric.target * 1.2 ? (
                  <span className="text-blue-800">
                    ⚖️ Réduisez votre apport en {metric.name.toLowerCase()} 
                    ({(metric.current - metric.target).toFixed(1)} {metric.unit} en trop)
                  </span>
                ) : (
                  <span className="text-blue-800">
                    ✓ Votre apport en {metric.name.toLowerCase()} est correct
                  </span>
                )}
              </div>
            ))}
            
            {metrics.every(m => m.status === 'good') && (
              <div className="text-sm p-2 rounded bg-green-50 border-l-2 border-green-200">
                <span className="text-green-800">
                  🎉 Excellente répartition nutritionnelle cette semaine !
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}