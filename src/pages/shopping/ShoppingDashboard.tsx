/**
 * ShoppingDashboard - Dashboard principal de la section Courses
 * Implémente la vue d'ensemble du PRP-040.1 pour la section Shopping
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { ShoppingCart, Store, History, Plus, CheckCircle2, Euro } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useAgeAdaptiveUI } from '@/hooks/useFamilyMode';
import AppNavigation from '@/components/navigation/AppNavigation';
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
    return <div>Chargement...</div>;
  }

  if (!user) {
    return <div>Non authentifié</div>;
  }

  // Mock data - à remplacer par de vraies données
  const dashboardStats = {
    activeItems: 12,
    completedItems: 8,
    totalBudget: 85.50,
    savedMoney: 15.30
  };

  const quickActions = [
    {
      title: 'Ma Liste de Courses',
      description: 'Gérer ma liste de courses actuelle',
      icon: <ShoppingCart className="w-6 h-6" />,
      action: () => navigate('/shopping/list'),
      badge: `${dashboardStats.activeItems} articles`,
      childFriendlyName: 'Ma liste'
    },
    {
      title: 'Mode Magasin',
      description: 'Interface optimisée pour faire ses courses',
      icon: <Store className="w-6 h-6" />,
      action: () => navigate('/shopping/store-mode'),
      badge: 'Pratique',
      childFriendlyName: 'Mode magasin'
    },
    {
      title: 'Historique',
      description: 'Voir mes achats précédents',
      icon: <History className="w-6 h-6" />,
      action: () => navigate('/shopping/history'),
      badge: 'Nouveau',
      childFriendlyName: 'Mes anciens achats'
    },
    {
      title: 'Ajouter Rapidement',
      description: 'Ajouter des articles à ma liste',
      icon: <Plus className="w-6 h-6" />,
      action: () => navigate('/shopping/list'),
      badge: 'Rapide',
      childFriendlyName: 'Ajouter'
    }
  ];

  const recentItems = [
    { name: 'Pain complet', category: 'Boulangerie', status: 'pending' },
    { name: 'Lait bio', category: 'Produits frais', status: 'completed' },
    { name: 'Pommes', category: 'Fruits & Légumes', status: 'completed' }
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

        {/* Stats rapides */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">À acheter</p>
                  <p className="text-2xl font-bold">{dashboardStats.activeItems}</p>
                </div>
                <ShoppingCart className="w-5 h-5 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Terminés</p>
                  <p className="text-2xl font-bold">{dashboardStats.completedItems}</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Budget</p>
                  <p className="text-2xl font-bold">€{dashboardStats.totalBudget}</p>
                </div>
                <Euro className="w-5 h-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Économies</p>
                  <p className="text-2xl font-bold">€{dashboardStats.savedMoney}</p>
                </div>
                <Euro className="w-5 h-5 text-green-500" />
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

        {/* Liste actuelle - aperçu */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Liste Actuelle</CardTitle>
                <CardDescription>
                  Aperçu de votre liste de courses
                </CardDescription>
              </div>
              <Button 
                onClick={() => navigate('/shopping/list')}
                size="sm"
              >
                Voir tout
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      item.status === 'completed' ? "bg-green-500" : "bg-gray-300"
                    )} />
                    <div>
                      <h4 className={cn(
                        "font-medium",
                        item.status === 'completed' && "line-through text-muted-foreground"
                      )}>
                        {item.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">{item.category}</p>
                    </div>
                  </div>
                  <Badge 
                    variant={item.status === 'completed' ? 'default' : 'outline'}
                  >
                    {item.status === 'completed' ? 'Terminé' : 'À faire'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Progrès de la semaine */}
        <Card>
          <CardHeader>
            <CardTitle>Progrès de la Semaine</CardTitle>
            <CardDescription>
              Votre activité shopping cette semaine
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-2">
                  <span>Articles achetés</span>
                  <span>{dashboardStats.completedItems}/{dashboardStats.activeItems + dashboardStats.completedItems}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: `${(dashboardStats.completedItems / (dashboardStats.activeItems + dashboardStats.completedItems)) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  {Math.round((dashboardStats.completedItems / (dashboardStats.activeItems + dashboardStats.completedItems)) * 100)}%
                </p>
                <p className="text-sm text-muted-foreground">Terminé</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppNavigation>
  );
};

export default ShoppingDashboard;