/**
 * AssistantDashboard - Dashboard principal de la section Assistant IA
 * Implémente la vue d'ensemble du PRP-040.1 pour la section Assistant
 */

import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Bot, MessageCircle, Lightbulb, Target, Brain, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useAgeAdaptiveUI } from '@/hooks/useFamilyMode';
import AppNavigation from '@/components/navigation/AppNavigation';
import { PageLoader } from '@/components/layout/PageLoader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const AssistantDashboard: React.FC = () => {
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

  // P1 polish: removed the mock `dashboardStats` (47 questions, 12
  // suggestions, "2h 30min" saved — fabricated) and the hardcoded
  // `recentInteractions` list flagged by the UI/UX audit. Until a
  // real assistant_history hook lands, the dashboard shows the action
  // grid + features cards only.
  const quickActions = [
    {
      title: 'Chat IA',
      description: 'Poser une question à votre assistant',
      icon: <MessageCircle className="w-6 h-6" />,
      action: () => navigate('/assistant/chat'),
      badge: undefined,
      childFriendlyName: 'Parler avec l\'assistant',
    },
    {
      title: 'IA Rapide',
      description: 'Questions rapides et réponses instantanées',
      icon: <Zap className="w-6 h-6" />,
      action: () => navigate('/assistant/chat'),
      badge: undefined,
      childFriendlyName: 'Questions rapides',
    },
  ];

  const features = [
    {
      title: 'Recommandations Recettes',
      description: 'L\'IA analyse vos goûts et votre inventaire pour suggérer des recettes parfaites',
      icon: <Brain className="w-5 h-5" />,
      status: 'active'
    },
    {
      title: 'Analyse Nutritionnelle',
      description: 'Évaluation automatique de vos repas et conseils personnalisés',
      icon: <Target className="w-5 h-5" />,
      status: 'active'
    },
    {
      title: 'Planning Intelligent',
      description: 'Planification automatique des repas selon vos préférences',
      icon: <Lightbulb className="w-5 h-5" />,
      status: 'coming-soon'
    }
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
            <Bot className={cn(
              "text-primary",
              adaptiveInterface.iconSize === 'large' ? "w-8 h-8" : "w-6 h-6"
            )} />
            <h1 className={cn(
              "font-bold text-foreground",
              adaptiveInterface.largerText ? "text-4xl" : "text-3xl"
            )}>
              Assistant IA
            </h1>
          </div>
          <p className={cn(
            "text-muted-foreground",
            adaptiveInterface.largerText ? "text-lg" : "text-base"
          )}>
            Votre assistant intelligent pour la cuisine et la nutrition
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

        {/* P1 polish: removed the "Interactions Récentes" mock list
            (3 hardcoded questions about œufs/fromage, protéines de
            poulet, conservation tomates) — fabricated. A real
            assistant-history hook should land before re-enabling. */}

        {/* Fonctionnalités IA */}
        <Card>
          <CardHeader>
            <CardTitle>Fonctionnalités IA</CardTitle>
            <CardDescription>
              Découvrez tout ce que votre assistant peut faire
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{feature.title}</h4>
                      <Badge 
                        variant={feature.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {feature.status === 'active' ? 'Actif' : 'Bientôt'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppNavigation>
  );
};

export default AssistantDashboard;