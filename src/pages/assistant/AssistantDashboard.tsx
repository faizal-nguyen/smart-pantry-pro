/**
 * AssistantDashboard - Dashboard principal de la section Assistant IA
 * Implémente la vue d'ensemble du PRP-040.1 pour la section Assistant
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Bot, MessageCircle, Lightbulb, Target, Brain, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useAgeAdaptiveUI } from '@/hooks/useFamilyMode';
import AppNavigation from '@/components/navigation/AppNavigation';
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
    return <div>Chargement...</div>;
  }

  if (!user) {
    return <div>Non authentifié</div>;
  }

  // Mock data - à remplacer par de vraies données
  const dashboardStats = {
    totalQuestions: 47,
    suggestions: 12,
    nutritionAnalyses: 8,
    savedTime: '2h 30min'
  };

  const quickActions = [
    {
      title: 'Chat IA',
      description: 'Poser une question à votre assistant',
      icon: <MessageCircle className="w-6 h-6" />,
      action: () => navigate('/assistant/chat'),
      badge: 'Populaire',
      childFriendlyName: 'Parler avec l\'assistant'
    },
    {
      title: 'Suggestions',
      description: 'Découvrir des recommandations personnalisées',
      icon: <Lightbulb className="w-6 h-6" />,
      action: () => navigate('/assistant/suggestions'),
      badge: `${dashboardStats.suggestions} nouvelles`,
      childFriendlyName: 'Mes suggestions'
    },
    {
      title: 'Analyse Nutritionnelle',
      description: 'Analyser vos habitudes alimentaires',
      icon: <Target className="w-6 h-6" />,
      action: () => navigate('/assistant/nutrition'),
      badge: 'Avancé',
      childFriendlyName: 'Mes nutriments'
    },
    {
      title: 'IA Rapide',
      description: 'Questions rapides et réponses instantanées',
      icon: <Zap className="w-6 h-6" />,
      action: () => navigate('/assistant/chat'),
      badge: 'Instant',
      childFriendlyName: 'Questions rapides'
    }
  ];

  const recentInteractions = [
    { 
      question: 'Quelle recette puis-je faire avec des œufs et du fromage ?', 
      type: 'recipe', 
      time: '2 min' 
    },
    { 
      question: 'Combien de protéines dans 100g de poulet ?', 
      type: 'nutrition', 
      time: '5 min' 
    },
    { 
      question: 'Comment conserver les tomates fraîches ?', 
      type: 'tips', 
      time: '1h' 
    }
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

        {/* Stats rapides */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Questions</p>
                  <p className="text-2xl font-bold">{dashboardStats.totalQuestions}</p>
                </div>
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Suggestions</p>
                  <p className="text-2xl font-bold">{dashboardStats.suggestions}</p>
                </div>
                <Lightbulb className="w-5 h-5 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Analyses</p>
                  <p className="text-2xl font-bold">{dashboardStats.nutritionAnalyses}</p>
                </div>
                <Target className="w-5 h-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Temps gagné</p>
                  <p className="text-xl font-bold">{dashboardStats.savedTime}</p>
                </div>
                <Zap className="w-5 h-5 text-green-500" />
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

        {/* Interactions récentes */}
        <Card>
          <CardHeader>
            <CardTitle>Interactions Récentes</CardTitle>
            <CardDescription>
              Vos dernières conversations avec l'assistant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentInteractions.map((interaction, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mt-1">
                    {interaction.type === 'recipe' && <MessageCircle className="w-4 h-4 text-primary" />}
                    {interaction.type === 'nutrition' && <Target className="w-4 h-4 text-primary" />}
                    {interaction.type === 'tips' && <Lightbulb className="w-4 h-4 text-primary" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{interaction.question}</p>
                    <p className="text-xs text-muted-foreground mt-1">Il y a {interaction.time}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {interaction.type === 'recipe' && 'Recette'}
                    {interaction.type === 'nutrition' && 'Nutrition'}
                    {interaction.type === 'tips' && 'Conseil'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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