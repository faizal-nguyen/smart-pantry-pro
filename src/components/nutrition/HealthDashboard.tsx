/**
 * Health Dashboard - Evolution V2
 * Personalized nutrition tracking and health insights
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNutritionalAI } from '@/hooks/useNutritionalAI';
import { 
  Heart, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Activity,
  Zap,
  Droplets,
  Apple,
  Scale,
  Calendar,
  Users,
  Award
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function HealthDashboard() {
  const {
    healthProfile,
    currentAnalysis,
    recommendations,
    macroTracking,
    isAnalyzing,
    isLoadingProfile,
    hasHealthProfile,
    isHealthy,
    needsAttention,
    calorieProgress,
    analyzeNutritionalProfile,
    trackTodaysMacros
  } = useNutritionalAI();

  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    // Track today's macros on component mount
    if (hasHealthProfile) {
      trackTodaysMacros();
    }
  }, [hasHealthProfile, trackTodaysMacros]);

  if (!hasHealthProfile) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Tableau de Bord Santé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="mb-4">
                <Heart className="mx-auto h-16 w-16 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium mb-2">Créez votre profil santé</h3>
              <p className="text-gray-600 mb-4">
                Configurez vos objectifs santé pour obtenir des analyses nutritionnelles personnalisées
              </p>
              <Button>
                <Target className="mr-2 h-4 w-4" />
                Configurer mon profil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingProfile || isAnalyzing) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Analyse en cours...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Overall Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Tableau de Bord Santé
            </div>
            <Badge variant={isHealthy ? "default" : "secondary"} className="text-sm">
              {isHealthy ? (
                <>
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Excellent
                </>
              ) : (
                <>
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  À améliorer
                </>
              )}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Nutritional Score */}
            <div className="text-center">
              <div className="mb-2">
                <Award className="mx-auto h-8 w-8 text-yellow-500" />
              </div>
              <div className="text-2xl font-bold text-green-600">
                {currentAnalysis?.nutritionalScore || 0}/100
              </div>
              <div className="text-sm text-gray-600">Score Nutritionnel</div>
            </div>

            {/* Calories Progress */}
            <div className="text-center">
              <div className="mb-2">
                <Zap className="mx-auto h-8 w-8 text-orange-500" />
              </div>
              <div className="text-2xl font-bold">
                {Math.round(calorieProgress)}%
              </div>
              <div className="text-sm text-gray-600">Objectif Calorique</div>
              <Progress value={calorieProgress} className="mt-2" />
            </div>

            {/* Weight Status */}
            <div className="text-center">
              <div className="mb-2">
                <Scale className="mx-auto h-8 w-8 text-blue-500" />
              </div>
              <div className="text-2xl font-bold">
                {healthProfile?.weight} kg
              </div>
              <div className="text-sm text-gray-600">Poids Actuel</div>
            </div>

            {/* Activity Level */}
            <div className="text-center">
              <div className="mb-2">
                <Activity className="mx-auto h-8 w-8 text-purple-500" />
              </div>
              <div className="text-lg font-medium capitalize">
                {healthProfile?.activityLevel?.replace('_', ' ') || 'Non défini'}
              </div>
              <div className="text-sm text-gray-600">Niveau d'Activité</div>
            </div>
          </div>

          {/* Health Alerts */}
          {needsAttention && currentAnalysis?.healthAlerts && (
            <div className="mt-6 space-y-2">
              {currentAnalysis.healthAlerts.slice(0, 2).map((alert, index) => (
                <Alert key={index} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{alert.category}:</strong> {alert.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Dashboard Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
          <TabsTrigger value="goals">Objectifs</TabsTrigger>
          <TabsTrigger value="recommendations">Conseils</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Macros */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Apple className="h-4 w-4" />
                  Macronutriments du jour
                </CardTitle>
              </CardHeader>
              <CardContent>
                {macroTracking ? (
                  <div className="space-y-4">
                    {/* Protein */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Protéines</span>
                        <span>{macroTracking.consumedProtein}g / {macroTracking.targetProtein}g</span>
                      </div>
                      <Progress 
                        value={(macroTracking.consumedProtein / macroTracking.targetProtein) * 100}
                        className="h-2"
                      />
                    </div>

                    {/* Carbs */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Glucides</span>
                        <span>{macroTracking.consumedCarbs}g / {macroTracking.targetCarbs}g</span>
                      </div>
                      <Progress 
                        value={(macroTracking.consumedCarbs / macroTracking.targetCarbs) * 100}
                        className="h-2"
                      />
                    </div>

                    {/* Fat */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Lipides</span>
                        <span>{macroTracking.consumedFat}g / {macroTracking.targetFat}g</span>
                      </div>
                      <Progress 
                        value={(macroTracking.consumedFat / macroTracking.targetFat) * 100}
                        className="h-2"
                      />
                    </div>

                    {/* Water */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="flex items-center gap-1">
                          <Droplets className="h-3 w-3 text-blue-500" />
                          Hydratation
                        </span>
                        <span>{macroTracking.waterIntake}L / {macroTracking.targetWater}L</span>
                      </div>
                      <Progress 
                        value={(macroTracking.waterIntake / macroTracking.targetWater) * 100}
                        className="h-2"
                      />
                    </div>

                    {/* Adherence Score */}
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Score d'adhérence</span>
                        <Badge variant={macroTracking.adherenceScore >= 80 ? "default" : "secondary"}>
                          {macroTracking.adherenceScore}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    Aucune donnée pour aujourd'hui
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Health Profile Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Profil Santé
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Âge</span>
                    <span>{healthProfile?.age} ans</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Genre</span>
                    <span className="capitalize">{healthProfile?.gender}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Taille</span>
                    <span>{healthProfile?.height} cm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Objectifs</span>
                    <div className="text-right">
                      {healthProfile?.goals.map((goal, index) => (
                        <Badge key={index} variant="outline" className="ml-1 text-xs">
                          {goal.type.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {healthProfile?.allergies && healthProfile.allergies.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Allergies</span>
                      <div className="text-right">
                        {healthProfile.allergies.map((allergy, index) => (
                          <Badge key={index} variant="destructive" className="ml-1 text-xs">
                            {allergy}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Nutrition Tab */}
        <TabsContent value="nutrition" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Analyse Nutritionnelle Détaillée</CardTitle>
            </CardHeader>
            <CardContent>
              {currentAnalysis ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Macronutrients */}
                  <div>
                    <h4 className="font-medium mb-3">Macronutriments</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>Protéines</span>
                        <div className="text-right">
                          <div>{currentAnalysis.macronutrients.protein.grams}g</div>
                          <div className="text-xs text-gray-500">
                            {currentAnalysis.macronutrients.protein.percentage}%
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Glucides</span>
                        <div className="text-right">
                          <div>{currentAnalysis.macronutrients.carbohydrates.grams}g</div>
                          <div className="text-xs text-gray-500">
                            {currentAnalysis.macronutrients.carbohydrates.percentage}%
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Lipides</span>
                        <div className="text-right">
                          <div>{currentAnalysis.macronutrients.fat.grams}g</div>
                          <div className="text-xs text-gray-500">
                            {currentAnalysis.macronutrients.fat.percentage}%
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Fibres</span>
                        <div>{currentAnalysis.macronutrients.fiber.grams}g</div>
                      </div>
                    </div>
                  </div>

                  {/* Micronutrients */}
                  <div>
                    <h4 className="font-medium mb-3">Vitamines & Minéraux</h4>
                    <div className="space-y-2">
                      {Object.entries(currentAnalysis.micronutrients.vitamins).map(([vitamin, data]) => (
                        <div key={vitamin} className="flex justify-between text-sm">
                          <span>{vitamin}</span>
                          <span>{data.amount}{data.unit} ({data.dailyValuePercentage}%)</span>
                        </div>
                      ))}
                      {Object.entries(currentAnalysis.micronutrients.minerals).map(([mineral, data]) => (
                        <div key={mineral} className="flex justify-between text-sm">
                          <span>{mineral}</span>
                          <span>{data.amount}{data.unit} ({data.dailyValuePercentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Button onClick={() => analyzeNutritionalProfile()}>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Analyser ma nutrition
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {healthProfile?.goals.map((goal, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-base capitalize">
                    {goal.type.replace('_', ' ')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Priorité</span>
                      <Badge variant={goal.priority === 'high' ? 'default' : 'secondary'}>
                        {goal.priority}
                      </Badge>
                    </div>
                    {goal.targetValue && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Objectif</span>
                        <span>{goal.targetValue}</span>
                      </div>
                    )}
                    {goal.timeframe && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Délai</span>
                        <span>{goal.timeframe} jours</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          {recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendations.slice(0, 6).map((rec) => (
                <Card key={rec.id}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{rec.title}</span>
                      <Badge variant={rec.priority === 'high' ? 'default' : 'secondary'}>
                        Impact: {rec.estimatedImpact}/10
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-3">{rec.description}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="outline">{rec.type}</Badge>
                      <Badge variant="outline">{rec.difficulty}</Badge>
                      <Badge variant="outline">{rec.timeframe}</Badge>
                    </div>
                    <p className="text-sm text-green-600">{rec.nutritionalBenefit}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Target className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucune recommandation</h3>
                <p className="text-gray-600 mb-4">
                  Effectuez une analyse nutritionnelle pour obtenir des conseils personnalisés
                </p>
                <Button onClick={() => analyzeNutritionalProfile()}>
                  Générer des recommandations
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Last Updated */}
      {currentAnalysis && (
        <div className="text-center text-sm text-gray-500">
          Dernière analyse: {format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}
        </div>
      )}
    </div>
  );
}