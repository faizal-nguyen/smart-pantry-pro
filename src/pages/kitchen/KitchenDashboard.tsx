/**
 * KitchenDashboard - Dashboard principal de la section Cuisine
 * Implémente la vue d'ensemble du PRP-040.1 pour la section Kitchen
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { ChefHat, Heart, CalendarDays, BookOpen, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useAgeAdaptiveUI } from '@/hooks/useFamilyMode';
import AppNavigation from '@/components/navigation/AppNavigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const KitchenDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { adaptiveInterface, getStyleClasses } = useAgeAdaptiveUI();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };
    getUser();
  }, []);

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (!user) {
    return <div>Non authentifié</div>;
  }

  // Mock data - à remplacer par de vraies données
  const dashboardStats = {
    totalRecipes: 247,
    favoriteRecipes: 23,
    plannedMeals: 5,
    recentActivity: 12
  };

  const quickActions = [
    {
      title: 'Parcourir les Recettes',
      description: 'Découvrir de nouvelles recettes',
      icon: <BookOpen className="w-6 h-6" />,
      action: () => navigate('/kitchen/recipes'),
      badge: 'Populaire',
      childFriendlyName: 'Voir les recettes'
    },
    {
      title: 'Mes Favoris',
      description: 'Mes recettes préférées',
      icon: <Heart className="w-6 h-6" />,
      action: () => navigate('/kitchen/favorites'),
      badge: `${dashboardStats.favoriteRecipes}`,
      childFriendlyName: 'Mes préférées'
    },
    {
      title: 'Planification Repas',
      description: 'Organiser mes repas de la semaine',
      icon: <CalendarDays className="w-6 h-6" />,
      action: () => navigate('/kitchen/meal-planning'),
      badge: 'Nouveau',
      childFriendlyName: 'Planifier mes repas'
    },
    {
      title: 'Activité Récente',
      description: 'Voir mes dernières recettes consultées',
      icon: <Clock className="w-6 h-6" />,
      action: () => navigate('/kitchen/recipes'),
      badge: `${dashboardStats.recentActivity}`,
      childFriendlyName: 'Mes dernières recettes'
    }
  ];

  const recentRecipes = [
    { id: 1, name: 'Pâtes à la carbonara', cookTime: '20 min', difficulty: 'Facile' },
    { id: 2, name: 'Salade César', cookTime: '15 min', difficulty: 'Facile' },
    { id: 3, name: 'Risotto aux champignons', cookTime: '35 min', difficulty: 'Moyen' }
  ];

  return (
    <AppNavigation user={user}>
      <div className={cn(
        "container mx-auto p-6 space-y-8",
        getStyleClasses(),
        adaptiveInterface.buttonSpacing === 'spacious' && "space-y-12"
      )}>
        {/* Header */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center gap-3">
            <ChefHat className={cn(
              "text-primary",
              adaptiveInterface.iconSize === 'large' ? "w-8 h-8" : "w-6 h-6"
            )} />
            <h1 className={cn(
              "font-bold text-foreground",
              adaptiveInterface.largerText ? "text-4xl" : "text-3xl"
            )}>
              Cuisine
            </h1>
          </div>
          <p className={cn(
            "text-muted-foreground",
            adaptiveInterface.largerText ? "text-lg" : "text-base"
          )}>
            Découvrez, planifiez et cuisinez vos repas préférés
          </p>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Recettes</p>
                  <p className="text-2xl font-bold">{dashboardStats.totalRecipes}</p>
                </div>
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Favoris</p>
                  <p className="text-2xl font-bold">{dashboardStats.favoriteRecipes}</p>
                </div>
                <Heart className="w-5 h-5 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Planifiés</p>
                  <p className="text-2xl font-bold">{dashboardStats.plannedMeals}</p>
                </div>
                <CalendarDays className="w-5 h-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Récente</p>
                  <p className="text-2xl font-bold">{dashboardStats.recentActivity}</p>
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions rapides */}
        <div>
          <h2 className={cn(
            "font-semibold mb-4",
            adaptiveInterface.largerText ? "text-2xl" : "text-xl"
          )}>
            Actions Rapides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <Card 
                key={index} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={action.action}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        {action.icon}
                      </div>
                      <div>
                        <h3 className={cn(
                          "font-medium",
                          adaptiveInterface.largerText ? "text-lg" : "text-base"
                        )}>
                          {action.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                    </div>
                    {action.badge && (
                      <Badge variant="secondary">{action.badge}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recettes récentes */}
        <Card>
          <CardHeader>
            <CardTitle>Recettes Récentes</CardTitle>
            <CardDescription>
              Vos dernières recettes consultées
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentRecipes.map((recipe) => (
                <div key={recipe.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <ChefHat className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{recipe.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {recipe.cookTime} • {recipe.difficulty}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate(`/kitchen/recipes/${recipe.id}`)}
                  >
                    Voir
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppNavigation>
  );
};

export default KitchenDashboard;