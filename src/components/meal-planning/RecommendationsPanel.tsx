"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Lightbulb, 
  TrendingUp, 
  Leaf, 
  DollarSign, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Snowflake,
  Sun
} from 'lucide-react';
import { WeeklyMealPlan, UserPreferences } from '@/services/planning/types';

interface RecommendationsPanelProps {
  recommendations: any;
  userPreferences: UserPreferences | null;
  currentPlan: WeeklyMealPlan | null;
  onAcceptRecommendation: (recipeId: string) => void;
}

interface Recommendation {
  id: string;
  type: 'seasonal' | 'budget' | 'nutrition' | 'inventory' | 'tip';
  title: string;
  description: string;
  actionText?: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  category: string;
  data?: any;
}

export function RecommendationsPanel({ 
  recommendations, 
  userPreferences, 
  currentPlan,
  onAcceptRecommendation 
}: RecommendationsPanelProps) {
  const [acceptedRecommendations, setAcceptedRecommendations] = useState<Set<string>>(new Set());

  // Generate smart recommendations based on current context
  const generateRecommendations = (): Recommendation[] => {
    const recs: Recommendation[] = [];

    // Seasonal recommendations
    const currentMonth = new Date().getMonth();
    const season = currentMonth >= 2 && currentMonth <= 4 ? 'spring' :
                  currentMonth >= 5 && currentMonth <= 7 ? 'summer' :
                  currentMonth >= 8 && currentMonth <= 10 ? 'fall' : 'winter';

    if (season === 'winter') {
      recs.push({
        id: 'winter-comfort',
        type: 'seasonal',
        title: 'Plats réconfortants d\'hiver',
        description: 'Profitez des soupes, pot-au-feu et gratins de saison',
        category: 'Saisonnier',
        priority: 'medium',
        icon: '🍲',
        actionText: 'Voir les recettes'
      });
    } else if (season === 'summer') {
      recs.push({
        id: 'summer-fresh',
        type: 'seasonal',
        title: 'Salades fraîches d\'été',
        description: 'Des plats légers avec des légumes de saison',
        category: 'Saisonnier',
        priority: 'high',
        icon: '🥗',
        actionText: 'Découvrir'
      });
    }

    // Budget recommendations
    if (currentPlan && userPreferences) {
      const budgetUsage = (currentPlan.totalEstimatedCost / userPreferences.budgetConstraints.weeklyBudget) * 100;
      
      if (budgetUsage > 90) {
        recs.push({
          id: 'budget-warning',
          type: 'budget',
          title: 'Budget dépassé',
          description: `Vous dépassez votre budget de ${(currentPlan.totalEstimatedCost - userPreferences.budgetConstraints.weeklyBudget).toFixed(2)}€`,
          category: 'Budget',
          priority: 'high',
          icon: '⚠️',
          actionText: 'Optimiser'
        });
      } else if (budgetUsage > 75) {
        recs.push({
          id: 'budget-caution',
          type: 'budget',
          title: 'Attention au budget',
          description: 'Vous utilisez 75% de votre budget hebdomadaire',
          category: 'Budget',
          priority: 'medium',
          icon: '💰',
          actionText: 'Surveiller'
        });
      }
    }

    // Nutritional recommendations
    if (currentPlan) {
      const mealCount = currentPlan.meals.length;
      const vegetarianMeals = currentPlan.meals.filter(meal => 
        meal.tags?.includes('végétarien') || meal.tags?.includes('vegan')
      ).length;
      
      if (vegetarianMeals / mealCount < 0.3) {
        recs.push({
          id: 'add-vegetables',
          type: 'nutrition',
          title: 'Ajouter plus de légumes',
          description: 'Essayez d\'inclure plus de repas à base de légumes cette semaine',
          category: 'Nutrition',
          priority: 'medium',
          icon: '🥬',
          actionText: 'Voir options'
        });
      }
    }

    // Practical tips
    const today = new Date().getDay();
    
    if (currentPlan?.meals.some(meal => meal.preparationTips?.some(tip => tip.type === 'defrost'))) {
      recs.push({
        id: 'defrost-reminder',
        type: 'tip',
        title: 'Pensez à décongeler',
        description: 'Vous avez des plats qui nécessitent une décongélation',
        category: 'Conseils',
        priority: 'high',
        icon: '❄️',
        actionText: 'Voir détails'
      });
    }

    // Batch cooking suggestion for Sunday
    if (today <= 1) { // Monday or earlier
      recs.push({
        id: 'batch-cooking',
        type: 'tip',
        title: 'Batch cooking du dimanche',
        description: 'Préparez plusieurs repas en une fois pour gagner du temps',
        category: 'Organisation',
        priority: 'low',
        icon: '👨‍🍳',
        actionText: 'Planifier'
      });
    }

    return recs;
  };

  const smartRecommendations = generateRecommendations();

  const handleAcceptRecommendation = (rec: Recommendation) => {
    setAcceptedRecommendations(prev => new Set([...prev, rec.id]));
    if (rec.data?.recipeId) {
      onAcceptRecommendation(rec.data.recipeId);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-orange-200 bg-orange-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-orange-500" />;
      default: return <Lightbulb className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-3">
        {smartRecommendations.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">Aucune recommandation</h3>
              <p className="text-sm text-muted-foreground">
                Créez un plan de repas pour recevoir des suggestions personnalisées
              </p>
            </CardContent>
          </Card>
        ) : (
          smartRecommendations.map((rec) => {
            const isAccepted = acceptedRecommendations.has(rec.id);
            
            return (
              <Card 
                key={rec.id} 
                className={`transition-all ${getPriorityColor(rec.priority)} ${
                  isAccepted ? 'opacity-50' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getPriorityIcon(rec.priority)}
                        <div className="text-lg">{rec.icon}</div>
                        <div>
                          <h4 className="font-medium text-sm">{rec.title}</h4>
                          <Badge variant="outline" className="text-xs mt-1">
                            {rec.category}
                          </Badge>
                        </div>
                      </div>
                      
                      {isAccepted && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground">
                      {rec.description}
                    </p>

                    {/* Action Button */}
                    {rec.actionText && !isAccepted && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleAcceptRecommendation(rec)}
                        className="w-full"
                      >
                        {rec.actionText}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        {/* Quick Actions */}
        <Card className="border-dashed">
          <CardContent className="p-4">
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Actions Rapides
            </h4>
            <div className="grid grid-cols-1 gap-2">
              <Button variant="ghost" size="sm" className="justify-start">
                🎲 Générer un nouveau plan
              </Button>
              <Button variant="ghost" size="sm" className="justify-start">
                🔄 Remplacer les repas répétés
              </Button>
              <Button variant="ghost" size="sm" className="justify-start">
                ⚖️ Équilibrer la nutrition
              </Button>
              <Button variant="ghost" size="sm" className="justify-start">
                💰 Optimiser le budget
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}