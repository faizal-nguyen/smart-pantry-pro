"use client";

import React, { useState } from 'react';
import { 
  Cloud, 
  Calendar, 
  Leaf, 
  Tag,
  CheckCircle,
  XCircle,
  Settings,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Clock,
  Euro,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useContextualAdaptation } from '@/hooks/useContextualAdaptation';
import { useRealTimeAdaptations } from '@/hooks/useRealTimeAdaptations';
import { RealTimeNotifications } from '@/components/context/RealTimeNotifications';
import { AdaptationLog, UserContextPreferences } from '@/services/context/types';

interface ContextualAdaptationsPanelProps {
  userId: string;
  currentPlan?: any;
  onPlanAdapted?: (adaptedPlan: any) => void;
  className?: string;
}

export const ContextualAdaptationsPanel: React.FC<ContextualAdaptationsPanelProps> = ({
  userId,
  currentPlan,
  onPlanAdapted,
  className
}) => {
  const [activeTab, setActiveTab] = useState<'adaptations' | 'realtime' | 'settings'>('adaptations');

  const {
    adaptedPlan,
    adaptations,
    isAdapting,
    error,
    confidence,
    executionTime,
    preferences,
    adaptPlan,
    refreshContext,
    updatePreferences,
    applyAdaptation,
    rejectAdaptation
  } = useContextualAdaptation({ 
    userId,
    enabled: true,
    autoRefresh: false 
  });

  // Hook pour les adaptations temps réel
  const {
    adaptations: realTimeAdaptations,
    isConnected: isRealTimeConnected,
    isLoading: isRealTimeLoading,
    error: realTimeError,
    lastUpdate: realTimeLastUpdate,
    adaptationCount: realTimeCount,
    forceUpdate: forceRealTimeUpdate,
    markAdaptationAsApplied,
    markAdaptationAsRejected,
    getHighConfidenceAdaptations
  } = useRealTimeAdaptations({
    userId,
    preferences: preferences || {
      weather_adaptation: true,
      calendar_sync: true,
      seasonal_preferences: true,
      price_optimization: true,
      weather_sensitivity: 'medium',
      schedule_flexibility: 'medium',
      max_adaptations_per_week: 5
    },
    enabled: !!preferences,
    autoConnect: true,
    onAdaptationReceived: (newAdaptations) => {
      console.log(`📡 Received ${newAdaptations.length} real-time adaptations`);
    }
  });

  // Adapter automatiquement quand le plan change
  React.useEffect(() => {
    if (currentPlan && preferences) {
      adaptPlan(currentPlan);
    }
  }, [currentPlan, preferences, adaptPlan]);

  const handleAdaptationAction = async (adaptation: AdaptationLog, action: 'apply' | 'reject') => {
    const adaptationId = `${adaptation.type}_${adaptation.day}_${adaptation.adapted}`;
    
    if (action === 'apply') {
      await applyAdaptation(adaptationId);
      // Notifier le parent du plan modifié
      if (adaptedPlan && onPlanAdapted) {
        onPlanAdapted(adaptedPlan.adaptedPlan);
      }
    } else {
      await rejectAdaptation(adaptationId);
    }
  };

  const handlePreferenceChange = async (key: keyof UserContextPreferences, value: any) => {
    await updatePreferences({ [key]: value });
  };

  if (!preferences) {
    return (
      <Card className={cn("contextual-adaptations-panel", className)}>
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <span className="ml-2">Chargement du contexte...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={cn("contextual-adaptations-panel", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Adaptations Intelligentes
            </CardTitle>
            <div className="flex items-center gap-2">
              {confidence > 0 && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      ⚡ {Math.round(confidence * 100)}%
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Confiance des adaptations
                  </TooltipContent>
                </Tooltip>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshContext}
                disabled={isAdapting}
              >
                <RefreshCw className={cn("w-4 h-4", isAdapting && "animate-spin")} />
              </Button>
            </div>
          </div>
          
          {executionTime > 0 && (
            <p className="text-sm text-muted-foreground">
              Dernière adaptation en {executionTime.toFixed(0)}ms
            </p>
          )}
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="adaptations" className="flex items-center gap-2 text-xs">
                <CheckCircle className="w-3 h-3" />
                Statiques
                {adaptations.length > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-xs">
                    {adaptations.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="realtime" className="flex items-center gap-2 text-xs relative">
                <TrendingUp className="w-3 h-3" />
                Temps Réel
                {isRealTimeConnected && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                )}
                {realTimeCount > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-xs">
                    {realTimeCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2 text-xs">
                <Settings className="w-4 h-4" />
                Réglages
              </TabsTrigger>
            </TabsList>

            <div className="mt-4">
              <TabsContent value="adaptations" className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Erreur</AlertTitle>
                    <AlertDescription>{error.message}</AlertDescription>
                  </Alert>
                )}

                {isAdapting && (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertTitle>Analyse en cours</AlertTitle>
                    <AlertDescription>
                      Adaptation du plan selon le contexte (météo, saisons, promotions)...
                    </AlertDescription>
                  </Alert>
                )}

                {adaptations.length === 0 && !isAdapting ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                    <p className="text-gray-600">Votre plan est déjà optimal !</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Aucune adaptation nécessaire pour le moment
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {adaptations.map((adaptation, index) => (
                        <AdaptationCard
                          key={`${adaptation.type}_${adaptation.day}_${index}`}
                          adaptation={adaptation}
                          onAction={(action) => handleAdaptationAction(adaptation, action)}
                          index={index}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {adaptedPlan && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Résumé de l'Impact</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-700">
                          {adaptedPlan.impact.changesCount}
                        </p>
                        <p className="text-xs text-gray-600">Changements</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-700">
                          {adaptedPlan.impact.overallScore}/100
                        </p>
                        <p className="text-xs text-gray-600">Score Global</p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="realtime" className="space-y-4">
                {/* Statut de la connexion temps réel */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">Adaptations Temps Réel</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isRealTimeConnected ? (
                      <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                        ● Connecté
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        ● Déconnecté
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={forceRealTimeUpdate}
                      disabled={!isRealTimeConnected || isRealTimeLoading}
                      className="h-7 px-2"
                    >
                      <RefreshCw className={cn("w-3 h-3", isRealTimeLoading && "animate-spin")} />
                    </Button>
                  </div>
                </div>

                {/* Erreur temps réel */}
                {realTimeError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Erreur Temps Réel</AlertTitle>
                    <AlertDescription>{realTimeError}</AlertDescription>
                  </Alert>
                )}

                {/* Dernière mise à jour */}
                {realTimeLastUpdate && (
                  <div className="text-xs text-gray-500 text-center">
                    Dernière mise à jour: {realTimeLastUpdate.toLocaleTimeString('fr-FR')}
                  </div>
                )}

                {/* Liste des adaptations temps réel */}
                {realTimeAdaptations.length === 0 && !isRealTimeLoading ? (
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 mx-auto text-blue-500 mb-3 opacity-50" />
                    <p className="text-gray-600">En attente d'adaptations...</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Le système surveille météo, saisons et promotions
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {realTimeAdaptations.map((adaptation, index) => (
                        <motion.div
                          key={adaptation.id}
                          layout
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -20, scale: 0.95 }}
                          transition={{ delay: index * 0.1 }}
                          className="relative"
                        >
                          <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start gap-3">
                                {adaptation.type === 'weather' && <Cloud className="w-4 h-4 text-blue-500 mt-0.5" />}
                                {adaptation.type === 'seasonal' && <Leaf className="w-4 h-4 text-green-500 mt-0.5" />}
                                {adaptation.type === 'promotion' && <Tag className="w-4 h-4 text-orange-500 mt-0.5" />}
                                {adaptation.type === 'calendar' && <Calendar className="w-4 h-4 text-purple-500 mt-0.5" />}
                                
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-xs">
                                      {adaptation.type}
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">
                                      Temps réel
                                    </Badge>
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                  </div>
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {adaptation.reason}
                                  </p>
                                  {adaptation.savings && (
                                    <p className="text-xs text-green-600 mt-1">
                                      💰 Économie: {adaptation.savings}€
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Progress 
                                  value={adaptation.confidence * 100} 
                                  className="w-16 h-2"
                                />
                                <span className="text-xs text-gray-500 ml-1">
                                  {Math.round(adaptation.confidence * 100)}%
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markAdaptationAsRejected(adaptation.id)}
                                className="h-7 px-3 text-xs"
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Ignorer
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  markAdaptationAsApplied(adaptation.id);
                                  // TODO: Appliquer réellement l'adaptation au plan
                                }}
                                className="h-7 px-3 text-xs bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Appliquer
                              </Button>
                            </div>
                          </div>
                          
                          {/* Indicateur temps réel */}
                          <div className="absolute -top-1 -left-1">
                            <div className="w-3 h-3 bg-green-400 rounded-full animate-ping" />
                            <div className="absolute top-0 left-0 w-3 h-3 bg-green-400 rounded-full" />
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {/* Adaptations haute confiance */}
                {getHighConfidenceAdaptations().length > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Recommandations Prioritaires ({getHighConfidenceAdaptations().length})
                    </h4>
                    <p className="text-sm text-green-800">
                      Ces adaptations ont une confiance élevée (&gt;80%) et méritent votre attention.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <ContextualSettingsPanel
                  preferences={preferences}
                  onPreferenceChange={handlePreferenceChange}
                />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Notifications flottantes pour adaptations temps réel */}
      {realTimeCount > 0 && (
        <RealTimeNotifications
          adaptations={realTimeAdaptations}
          onAdaptationAction={(adaptationId, action) => {
            if (action === 'apply') {
              markAdaptationAsApplied(adaptationId);
              // TODO: Appliquer réellement l'adaptation
            } else {
              markAdaptationAsRejected(adaptationId);
            }
          }}
        />
      )}
    </TooltipProvider>
  );
};

// === COMPOSANTS INTERNES ===

interface AdaptationCardProps {
  adaptation: AdaptationLog;
  onAction: (action: 'apply' | 'reject') => void;
  index: number;
}

const AdaptationCard: React.FC<AdaptationCardProps> = ({ adaptation, onAction, index }) => {
  const getAdaptationIcon = (type: string) => {
    switch (type) {
      case 'weather': return <Cloud className="w-4 h-4 text-blue-500" />;
      case 'schedule': return <Calendar className="w-4 h-4 text-purple-500" />;
      case 'seasonal': return <Leaf className="w-4 h-4 text-green-500" />;
      case 'promotion': return <Tag className="w-4 h-4 text-orange-500" />;
      default: return <TrendingUp className="w-4 h-4 text-gray-500" />;
    }
  };

  const getAdaptationLabel = (type: string) => {
    switch (type) {
      case 'weather': return 'Météo';
      case 'schedule': return 'Planning';
      case 'seasonal': return 'Saison';
      case 'promotion': return 'Promo';
      default: return 'Autre';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.1 }}
      className="p-4 border rounded-lg bg-white"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          {getAdaptationIcon(adaptation.type)}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {getAdaptationLabel(adaptation.type)}
              </Badge>
              <span className="text-xs text-gray-500">Jour {adaptation.day + 1}</span>
            </div>
            <p className="text-sm text-gray-700">{adaptation.reason}</p>
            {adaptation.savings && (
              <p className="text-xs text-green-600 mt-1">
                💰 Économie: {adaptation.savings}€
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Progress 
            value={adaptation.confidence * 100} 
            className="w-16 h-2"
          />
          <span className="text-xs text-gray-500 ml-1">
            {Math.round(adaptation.confidence * 100)}%
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAction('reject')}
          className="flex items-center gap-1"
        >
          <XCircle className="w-3 h-3" />
          Ignorer
        </Button>
        <Button
          size="sm"
          onClick={() => onAction('apply')}
          className="flex items-center gap-1"
        >
          <CheckCircle className="w-3 h-3" />
          Appliquer
        </Button>
      </div>
    </motion.div>
  );
};

interface ContextualSettingsPanelProps {
  preferences: UserContextPreferences;
  onPreferenceChange: (key: keyof UserContextPreferences, value: any) => void;
}

const ContextualSettingsPanel: React.FC<ContextualSettingsPanelProps> = ({
  preferences,
  onPreferenceChange
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-blue-500" />
            <div>
              <p className="font-medium text-sm">Adaptation météo</p>
              <p className="text-xs text-gray-600">Adapter selon la température</p>
            </div>
          </div>
          <Switch
            checked={preferences.weather_adaptation}
            onCheckedChange={(checked) => 
              onPreferenceChange('weather_adaptation', checked)
            }
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-500" />
            <div>
              <p className="font-medium text-sm">Synchronisation agenda</p>
              <p className="text-xs text-gray-600">Adapter selon les horaires</p>
            </div>
          </div>
          <Switch
            checked={preferences.calendar_sync}
            onCheckedChange={(checked) => 
              onPreferenceChange('calendar_sync', checked)
            }
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-green-500" />
            <div>
              <p className="font-medium text-sm">Produits de saison</p>
              <p className="text-xs text-gray-600">Privilégier les produits frais</p>
            </div>
          </div>
          <Switch
            checked={preferences.seasonal_preferences}
            onCheckedChange={(checked) => 
              onPreferenceChange('seasonal_preferences', checked)
            }
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Euro className="w-4 h-4 text-orange-500" />
            <div>
              <p className="font-medium text-sm">Optimisation prix</p>
              <p className="text-xs text-gray-600">Trouver les meilleures offres</p>
            </div>
          </div>
          <Switch
            checked={preferences.price_optimization}
            onCheckedChange={(checked) => 
              onPreferenceChange('price_optimization', checked)
            }
          />
        </div>
      </div>

      <div className="pt-4 border-t">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Sensibilité</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Adaptations par semaine</span>
            <span className="font-medium">{preferences.max_adaptations_per_week || 5}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Sensibilité météo</span>
            <Badge variant="secondary" className="capitalize">
              {preferences.weather_sensitivity}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Flexibilité planning</span>
            <Badge variant="secondary" className="capitalize">
              {preferences.schedule_flexibility}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};