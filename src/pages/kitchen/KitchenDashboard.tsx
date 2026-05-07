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

  // P1 polish: removed the mock `dashboardStats` (totalRecipes: 247,
  // etc.) and `recentRecipes` array flagged by the UI/UX audit. The
  // numbers were never real and broke user trust. Until a real
  // aggregator hook is wired (TODO: useKitchenStats), the hub shows
  // navigation cards only — no fabricated numbers.
  const quickActions = [
    {
      title: 'Parcourir les Recettes',
      description: 'Découvrir de nouvelles recettes',
      icon: <BookOpen className="w-6 h-6" />,
      action: () => navigate('/kitchen/recipes'),
      badge: undefined,
      childFriendlyName: 'Voir les recettes',
    },
    {
      title: 'Mes Favoris',
      description: 'Mes recettes préférées',
      icon: <Heart className="w-6 h-6" />,
      action: () => navigate('/kitchen/favorites'),
      badge: undefined,
      childFriendlyName: 'Mes préférées',
    },
    {
      title: 'Planification Repas',
      description: 'Organiser mes repas de la semaine',
      icon: <CalendarDays className="w-6 h-6" />,
      action: () => navigate('/kitchen/meal-planning'),
      badge: undefined,
      childFriendlyName: 'Planifier mes repas',
    },
    {
      title: 'Activité Récente',
      description: 'Voir mes dernières recettes consultées',
      icon: <Clock className="w-6 h-6" />,
      action: () => navigate('/kitchen/recipes'),
      badge: undefined,
      childFriendlyName: 'Mes dernières recettes',
    },
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

        {/* P1 polish: removed the "Recettes Récentes" mock block.
            The previous list was hardcoded (carbonara / César / risotto)
            with click-handlers pointing at fake ids. A real "recently
            viewed" feed needs a `recipe_views` table or a localStorage
            ring buffer — TODO when we build the real activity hook. */}
      </div>
    </AppNavigation>
  );
};

export default KitchenDashboard;