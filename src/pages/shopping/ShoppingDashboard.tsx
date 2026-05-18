/**
 * ShoppingDashboard - Dashboard principal de la section Courses
 * Implémente la vue d'ensemble du PRP-040.1 pour la section Shopping
 */

import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { ShoppingCart, Plus, CheckCircle2, Euro } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useAgeAdaptiveUI } from '@/hooks/useFamilyMode';
import AppNavigation from '@/components/navigation/AppNavigation';
import { PageLoader } from '@/components/layout/PageLoader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const ShoppingDashboard: React.FC = () => {
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
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // P1 polish: removed the mock `dashboardStats` (activeItems: 12,
  // totalBudget: 85.50, savedMoney: 15.30 — all fabricated) and the
  // hardcoded `recentItems` list flagged by the UI/UX audit.
  // TODO: wire useShoppingStats / real recent items when those exist.
  const quickActions = [
    {
      title: 'Ma Liste de Courses',
      description: 'Gérer ma liste de courses actuelle',
      icon: <ShoppingCart className="w-6 h-6" />,
      action: () => navigate('/shopping/list'),
      badge: undefined,
      childFriendlyName: 'Ma liste',
    },
    {
      title: 'Ajouter Rapidement',
      description: 'Ajouter des articles à ma liste',
      icon: <Plus className="w-6 h-6" />,
      action: () => navigate('/shopping/list'),
      badge: undefined,
      childFriendlyName: 'Ajouter',
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
            <ShoppingCart className={cn(
              "text-primary",
              adaptiveInterface.iconSize === 'large' ? "w-8 h-8" : "w-6 h-6"
            )} />
            <h1 className={cn(
              "font-bold text-foreground",
              adaptiveInterface.largerText ? "text-4xl" : "text-3xl"
            )}>
              Courses
            </h1>
          </div>
          <p className={cn(
            "text-muted-foreground",
            adaptiveInterface.largerText ? "text-lg" : "text-base"
          )}>
            Organisez et gérez vos courses efficacement
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

        {/* P1 polish: removed the "Liste Actuelle" mock preview block.
            Showed pain complet / lait bio / pommes — fabricated.
            The "Voir tout" CTA already exists as the "Ma Liste de
            Courses" quick action above. */}

        {/* P1 polish: removed the "Progrès de la Semaine" widget that
            consumed the same fake `dashboardStats` numbers (8/12 items
            "completed" against fabricated totals). Wire a real
            useShoppingProgress() hook later to bring it back. */}
      </div>
    </AppNavigation>
  );
};

export default ShoppingDashboard;