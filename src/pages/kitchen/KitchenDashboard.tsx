/**
 * KitchenDashboard — `/kitchen` surface.
 *
 * PRP-234 PR1 (cleanup) :
 *   - renamed "Cuisine" → "Aujourd'hui en cuisine" to set a clear
 *     daily-action promise instead of a dashboard-hub framing ;
 *   - dropped the "Activité Récente" quick-action (it pointed at a
 *     generic recipes index with no actual activity behind it) ;
 *   - dropped the "Planification Repas" quick-action because its
 *     target page is still `CipherMealPlanningPage` — PR2 re-adds it
 *     as "Menus" once Menus V1 lands ;
 *   - dropped the "Mes Favoris" card — same destination as the
 *     Recettes deep-link, no value at this surface ;
 *   - removed `useAgeAdaptiveUI` (déclassé par PRP-228 — pas de
 *     child-mode override sur cette page) ;
 *   - removed the "Actions Rapides" section header — the grid speaks
 *     for itself, and the wording aligned with the dashboard framing
 *     we're stepping away from.
 *
 * PR3 (Today data) will replace this minimal nav layer with the 5
 * `useTodayKitchen` blocs (Continuer / À cuisiner / À vérifier /
 * Cette semaine / Anti-gaspi).
 */
import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { ChefHat, BookOpen, Package, ShoppingCart } from 'lucide-react';

import AppNavigation from '@/components/navigation/AppNavigation';
import { PageLoader } from '@/components/layout/PageLoader';
import { Card, CardContent } from '@/components/ui/card';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  to: string;
}

const KitchenDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };
    getUser();
  }, []);

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const quickActions: QuickAction[] = [
    {
      title: 'Mes recettes',
      description: 'Parcourir ma bibliothèque et mes imports',
      icon: <BookOpen className="w-6 h-6" />,
      to: '/kitchen/recipes',
    },
    {
      title: 'Mon inventaire',
      description: 'Voir ce que j’ai en stock',
      icon: <Package className="w-6 h-6" />,
      to: '/pantry',
    },
    {
      title: 'Ma liste de courses',
      description: 'Préparer mes prochains achats',
      icon: <ShoppingCart className="w-6 h-6" />,
      to: '/shopping/list',
    },
  ];

  return (
    <AppNavigation user={user}>
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center gap-3">
            <ChefHat className="text-primary w-6 h-6" />
            <h1 className="font-bold text-foreground text-3xl">
              Aujourd&apos;hui en cuisine
            </h1>
          </div>
          <p className="text-muted-foreground text-base">
            Qu&apos;est-ce qu&apos;on cuisine ?
          </p>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Card
              key={action.to}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(action.to)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(action.to);
                }
              }}
              aria-label={`Ouvrir ${action.title}`}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    {action.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-base">{action.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppNavigation>
  );
};

export default KitchenDashboard;
