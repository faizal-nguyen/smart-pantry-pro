"use client";

import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Calendar, 
  Leaf, 
  Tag,
  AlertCircle,
  Settings,
  RefreshCw,
  Sun,
  CloudRain,
  Snowflake,
  ThermometerSun,
  Clock,
  Users,
  ChevronRight,
  MapPin,
  Euro,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  WeatherContext,
  CalendarContext,
  SeasonalContext,
  PromotionsContext,
  UserContextPreferences,
  AdaptationLog
} from '@/services/context/types';

interface ContextualPanelProps {
  planId: string;
  userId: string;
  onRefresh?: () => void;
  className?: string;
}

interface FullContext {
  weather: WeatherContext | null;
  calendar: CalendarContext | null;
  seasonal: SeasonalContext | null;
  promotions: PromotionsContext | null;
  adaptations?: AdaptationLog[];
}

export const ContextualPanel: React.FC<ContextualPanelProps> = ({ 
  planId, 
  userId,
  onRefresh,
  className 
}) => {
  const [context, setContext] = useState<FullContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<UserContextPreferences | null>(null);
  const [activeTab, setActiveTab] = useState<'weather' | 'calendar' | 'seasonal' | 'promotions'>('weather');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadContext();
  }, [planId, userId]);

  const loadContext = async () => {
    setLoading(true);
    try {
      const [contextData, userPrefs] = await Promise.all([
        fetchContext(planId),
        fetchUserPreferences(userId)
      ]);
      setContext(contextData);
      setPreferences(userPrefs);
    } catch (error) {
      console.error('Failed to load context:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadContext();
    onRefresh?.();
    setRefreshing(false);
  };

  const toggleFeature = async (feature: keyof UserContextPreferences) => {
    if (!preferences) return;
    
    const newValue = !preferences[feature];
    const updatedPrefs = { ...preferences, [feature]: newValue };
    
    setPreferences(updatedPrefs);
    await updatePreference(userId, feature, newValue);
    
    // Recharger le contexte si activé
    if (newValue) {
      await loadContext();
    }
  };

  if (loading) {
    return (
      <Card className={cn("contextual-panel animate-pulse", className)}>
        <CardContent className="h-96" />
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={cn("contextual-panel", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-500" />
              Contexte Intelligent
            </CardTitle>
            <Button
              onClick={handleRefresh}
              variant="ghost"
              size="sm"
              disabled={refreshing}
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="weather" className="flex items-center gap-2">
                <Cloud className="w-4 h-4" />
                <span className="hidden sm:inline">Météo</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Agenda</span>
              </TabsTrigger>
              <TabsTrigger value="seasonal" className="flex items-center gap-2">
                <Leaf className="w-4 h-4" />
                <span className="hidden sm:inline">Saison</span>
              </TabsTrigger>
              <TabsTrigger value="promotions" className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                <span className="hidden sm:inline">Promos</span>
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="mt-4"
              >
                <TabsContent value="weather" className="space-y-4">
                  <WeatherPanel 
                    weather={context?.weather}
                    enabled={preferences?.weather_adaptation || false}
                    onToggle={() => toggleFeature('weather_adaptation')}
                  />
                </TabsContent>
                
                <TabsContent value="calendar" className="space-y-4">
                  <CalendarPanel
                    calendar={context?.calendar}
                    enabled={preferences?.calendar_sync || false}
                    onToggle={() => toggleFeature('calendar_sync')}
                  />
                </TabsContent>
                
                <TabsContent value="seasonal" className="space-y-4">
                  <SeasonalPanel
                    seasonal={context?.seasonal}
                    enabled={preferences?.seasonal_preferences || false}
                    onToggle={() => toggleFeature('seasonal_preferences')}
                  />
                </TabsContent>
                
                <TabsContent value="promotions" className="space-y-4">
                  <PromotionsPanel
                    promotions={context?.promotions}
                    enabled={preferences?.price_optimization || false}
                    onToggle={() => toggleFeature('price_optimization')}
                  />
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>

          {/* Résumé des adaptations */}
          {context?.adaptations && context.adaptations.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="flex items-center gap-2 font-medium text-blue-900 mb-3">
                <CheckCircle className="w-4 h-4" />
                {context.adaptations.length} adaptations appliquées
              </h4>
              <div className="space-y-2">
                {context.adaptations.slice(0, 3).map((adaptation, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <Badge variant="secondary" className="mt-0.5">
                      {adaptation.type === 'weather' ? '☀️' :
                       adaptation.type === 'schedule' ? '📅' :
                       adaptation.type === 'seasonal' ? '🍃' : '🏷️'}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-gray-700">{adaptation.reason}</p>
                      {adaptation.savings && (
                        <p className="text-green-600 text-xs mt-1">
                          Économie: {adaptation.savings}€
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

// === PANELS SPÉCIFIQUES ===

interface WeatherPanelProps {
  weather: WeatherContext | null;
  enabled: boolean;
  onToggle: () => void;
}

const WeatherPanel: React.FC<WeatherPanelProps> = ({ weather, enabled, onToggle }) => {
  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'clear':
      case 'sunny':
        return <Sun className="w-5 h-5 text-yellow-500" />;
      case 'rain':
      case 'drizzle':
        return <CloudRain className="w-5 h-5 text-blue-500" />;
      case 'snow':
        return <Snowflake className="w-5 h-5 text-blue-300" />;
      default:
        return <Cloud className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Adaptation météo</h3>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          aria-label="Activer adaptation météo"
        />
      </div>

      {enabled && weather && (
        <>
          {/* Météo actuelle */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                {getWeatherIcon(weather.current.weather)}
                <div>
                  <p className="font-medium text-lg">{weather.current.temp}°C</p>
                  <p className="text-sm text-gray-600">{weather.current.description}</p>
                </div>
              </div>
              <div className="text-right text-sm text-gray-600">
                <p>Ressenti: {weather.current.feels_like}°C</p>
                <p>Humidité: {weather.current.humidity}%</p>
              </div>
            </div>
          </div>

          {/* Analyse hebdomadaire */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Cette semaine</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-xs text-gray-600">Température moyenne</p>
                <p className="font-medium">{weather.analysis.avgTemp}°C</p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-xs text-gray-600">Jours de pluie</p>
                <p className="font-medium">{weather.analysis.rainyDays} jours</p>
              </div>
            </div>
          </div>

          {/* Recommandations */}
          {weather.analysis.recommendations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Suggestions</h4>
              {weather.analysis.recommendations.slice(0, 3).map((rec, i) => (
                <div key={i} className="p-3 bg-yellow-50 rounded-lg flex items-start gap-2">
                  <ThermometerSun className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">{rec.reason}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Jour {rec.day + 1} - {rec.suggestion}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

interface CalendarPanelProps {
  calendar: CalendarContext | null;
  enabled: boolean;
  onToggle: () => void;
}

const CalendarPanel: React.FC<CalendarPanelProps> = ({ calendar, enabled, onToggle }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Synchronisation agenda</h3>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          aria-label="Activer synchronisation agenda"
        />
      </div>

      {enabled && calendar && (
        <>
          {/* Score de charge global */}
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Charge de la semaine</p>
              <Badge variant={calendar.overallBusyScore > 6 ? "destructive" : "secondary"}>
                {calendar.overallBusyScore}/10
              </Badge>
            </div>
            <Progress value={calendar.overallBusyScore * 10} className="h-2" />
          </div>

          {/* Journées spéciales */}
          {calendar.specialOccasions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Occasions spéciales</h4>
              {calendar.specialOccasions.map((event, i) => (
                <div key={i} className="p-3 bg-purple-50 rounded-lg flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-gray-600">
                      {format(event.start, 'EEEE d MMMM', { locale: fr })}
                    </p>
                  </div>
                  {event.attendees && event.attendees > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      <Users className="w-3 h-3 mr-1" />
                      {event.attendees}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Recommandations planning */}
          {calendar.recommendations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Adaptations suggérées</h4>
              {calendar.recommendations.slice(0, 3).map((rec, i) => (
                <div key={i} className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700">{rec.reason}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-gray-500" />
                    <p className="text-xs text-gray-500">
                      Jour {rec.day + 1} - {rec.suggestion}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

interface SeasonalPanelProps {
  seasonal: SeasonalContext | null;
  enabled: boolean;
  onToggle: () => void;
}

const SeasonalPanel: React.FC<SeasonalPanelProps> = ({ seasonal, enabled, onToggle }) => {
  const getSeasonEmoji = (season: string) => {
    switch (season) {
      case 'spring': return '🌸';
      case 'summer': return '☀️';
      case 'autumn': return '🍂';
      case 'winter': return '❄️';
      default: return '🍃';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Produits de saison</h3>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          aria-label="Activer produits de saison"
        />
      </div>

      {enabled && seasonal && (
        <>
          {/* Saison actuelle */}
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getSeasonEmoji(seasonal.currentSeason)}</span>
              <div>
                <p className="font-medium capitalize">{seasonal.currentSeason}</p>
                <p className="text-sm text-gray-600">
                  {seasonal.inSeasonProducts.length} produits en pleine saison
                </p>
              </div>
            </div>
          </div>

          {/* Top produits de saison */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Meilleurs produits du moment</h4>
            <div className="grid grid-cols-2 gap-2">
              {seasonal.inSeasonProducts.slice(0, 6).map((product, i) => (
                <div key={i} className="p-2 bg-gray-50 rounded flex items-center justify-between">
                  <span className="text-sm font-medium">{product.name}</span>
                  <div className="flex items-center gap-1">
                    {product.score && product.score > 80 && (
                      <Badge variant="secondary" className="text-xs bg-green-100">
                        Top
                      </Badge>
                    )}
                    <span className="text-xs text-gray-500">
                      -{Math.round((1 - product.availability[seasonal.month].priceIndex) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommandations saisonnières */}
          {seasonal.recommendations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Suggestions</h4>
              {seasonal.recommendations.slice(0, 2).map((rec, i) => (
                <div key={i} className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-900">{rec.title}</p>
                  <p className="text-xs text-gray-600 mt-1">{rec.description}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

interface PromotionsPanelProps {
  promotions: PromotionsContext | null;
  enabled: boolean;
  onToggle: () => void;
}

const PromotionsPanel: React.FC<PromotionsPanelProps> = ({ promotions, enabled, onToggle }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Promotions locales</h3>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          aria-label="Activer promotions locales"
        />
      </div>

      {enabled && promotions && (
        <>
          {/* Économies potentielles */}
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Économies possibles</p>
                <p className="text-2xl font-bold text-green-700">
                  {promotions.totalSavingsPotential.toFixed(2)}€
                </p>
              </div>
              <Euro className="w-8 h-8 text-green-500" />
            </div>
          </div>

          {/* Meilleures offres */}
          {promotions.bestDeals.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Meilleures offres</h4>
              {promotions.bestDeals.slice(0, 3).map((deal, i) => (
                <div key={i} className="p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{deal.promotion.product}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="w-3 h-3 text-gray-500" />
                        <p className="text-xs text-gray-600">{deal.storeName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive" className="text-xs">
                        -{deal.promotion.discountPercent}%
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {deal.promotion.discountedPrice}€
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recommandations */}
          {promotions.recommendations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Opportunités</h4>
              {promotions.recommendations.slice(0, 2).map((rec, i) => (
                <div key={i} className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">{rec.title}</p>
                  <p className="text-xs text-gray-600 mt-1">{rec.description}</p>
                  {rec.totalSavings && (
                    <p className="text-xs text-green-600 mt-2">
                      Économie totale: {rec.totalSavings}€
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// === FONCTIONS UTILITAIRES (MOCK) ===

async function fetchContext(planId: string): Promise<FullContext> {
  // En production, appeler l'API
  return {
    weather: null,
    calendar: null,
    seasonal: null,
    promotions: null,
    adaptations: []
  };
}

async function fetchUserPreferences(userId: string): Promise<UserContextPreferences> {
  // En production, récupérer depuis la base
  return {
    weather_adaptation: true,
    calendar_sync: false,
    seasonal_preferences: true,
    price_optimization: true,
    weather_sensitivity: 'medium',
    schedule_flexibility: 'flexible',
    price_sensitivity: 'medium',
    seasonal_commitment: 'moderate',
    home_location: { lat: 48.8566, lng: 2.3522 }
  };
}

async function updatePreference(
  userId: string, 
  feature: keyof UserContextPreferences, 
  value: any
): Promise<void> {
  // En production, sauvegarder dans la base
  console.log(`Updating ${feature} to ${value} for user ${userId}`);
}