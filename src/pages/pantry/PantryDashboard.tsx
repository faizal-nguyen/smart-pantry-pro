/**
 * PantryDashboard - Dashboard principal du garde-manger
 * Vue d'ensemble de l'inventaire avec mode famille
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ScanQrCode, Bell, Plus, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useAgeAdaptiveUI } from '@/hooks/useFamilyMode';
import AppNavigation from '@/components/navigation/AppNavigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

const PantryDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { adaptiveInterface, isChildMode } = useAgeAdaptiveUI();

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

  const quickActions = [
    {
      title: isChildMode ? 'Scanner un produit' : 'Scanner',
      description: 'Ajouter des produits rapidement',
      icon: ScanQrCode,
      path: '/pantry/scanner',
      color: 'bg-blue-500'
    },
    {
      title: isChildMode ? 'Voir mes produits' : 'Inventaire',
      description: 'Gérer tous vos produits',
      icon: Package,
      path: '/pantry/inventory',
      color: 'bg-green-500'
    },
    {
      title: isChildMode ? 'Mes alertes' : 'Alertes',
      description: 'Produits bientôt périmés',
      icon: Bell,
      path: '/pantry/alerts',
      color: 'bg-amber-500'
    }
  ];

  return (
    <AppNavigation user={user}>
      <div className={cn(
        "p-4 space-y-6",
        isChildMode && "p-6 space-y-8"
      )}>
        <div>
          <h1 className={cn(
            "text-2xl font-bold text-foreground mb-2",
            isChildMode && "text-3xl"
          )}>
            {isChildMode ? 'Ma Réserve Magique 🏠' : 'Garde-Manger'}
          </h1>
          <p className={cn(
            "text-muted-foreground",
            isChildMode && "text-lg"
          )}>
            {isChildMode ? 
              'Découvre tous tes produits et garde-les frais!' :
              'Gérez votre inventaire alimentaire intelligemment'
            }
          </p>
        </div>

      {/* Actions rapides */}
      <div className={cn(
        "grid gap-4",
        isChildMode ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      )}>
        {quickActions.map((action) => {
          const IconComponent = action.icon;
          
          return (
            <Card
              key={action.path}
              className={cn(
                "cursor-pointer hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-primary/20",
                isChildMode && "p-2"
              )}
              onClick={() => navigate(action.path)}
            >
              <CardHeader className={cn(
                "pb-3",
                isChildMode && "pb-4"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    `${action.color} p-2 rounded-lg text-white`,
                    isChildMode && "p-3"
                  )}>
                    <IconComponent className={cn(
                      "w-5 h-5",
                      isChildMode && "w-6 h-6"
                    )} />
                  </div>
                  <div>
                    <CardTitle className={cn(
                      "text-lg",
                      isChildMode && "text-xl"
                    )}>
                      {action.title}
                    </CardTitle>
                    {!adaptiveInterface.simplifiedNavigation && (
                      <CardDescription className={cn(
                        isChildMode && "text-base"
                      )}>
                        {action.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Statistiques rapides */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <span className={cn(
                "text-sm text-muted-foreground",
                isChildMode && "text-base"
              )}>
                {isChildMode ? 'Produits' : 'Total produits'}
              </span>
            </div>
            <p className={cn(
              "text-2xl font-bold text-primary mt-1",
              isChildMode && "text-3xl"
            )}>
              24
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" />
              <span className={cn(
                "text-sm text-muted-foreground",
                isChildMode && "text-base"
              )}>
                {isChildMode ? 'À surveiller' : 'Bientôt périmés'}
              </span>
            </div>
            <p className={cn(
              "text-2xl font-bold text-amber-600 mt-1",
              isChildMode && "text-3xl"
            )}>
              3
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-green-500" />
              <span className={cn(
                "text-sm text-muted-foreground",
                isChildMode && "text-base"
              )}>
                {isChildMode ? 'Économies' : 'Économies mois'}
              </span>
            </div>
            <p className={cn(
              "text-2xl font-bold text-green-600 mt-1",
              isChildMode && "text-3xl"
            )}>
              45€
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-500" />
              <span className={cn(
                "text-sm text-muted-foreground",
                isChildMode && "text-base"
              )}>
                {isChildMode ? 'Ajoutés' : 'Ajouts semaine'}
              </span>
            </div>
            <p className={cn(
              "text-2xl font-bold text-blue-600 mt-1",
              isChildMode && "text-3xl"
            )}>
              7
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Message d'encouragement pour enfants */}
      {isChildMode && (
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-lg font-medium text-green-700 mb-2">
                Super travail ! 🌟
              </p>
              <p className="text-green-600">
                Tu as bien géré tes produits cette semaine. Continue comme ça !
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </AppNavigation>
  );
};

export default PantryDashboard;