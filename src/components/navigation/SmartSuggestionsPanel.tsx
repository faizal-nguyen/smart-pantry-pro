/**
 * SmartSuggestionsPanel - Composant React pour les suggestions intelligentes
 * Implémente PRP-040.3 - Interface suggestions personnalisées avec mode famille
 */

"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  ChefHat, 
  AlertCircle, 
  PackageOpen, 
  Coffee,
  Calendar,
  CloudRain,
  AlertTriangle,
  Star,
  Users,
  HelpCircle,
  Zap,
  X,
  Clock,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  smartSuggestions, 
  SmartSuggestion, 
  SuggestionContext 
} from '@/services/navigation-intelligence/SmartSuggestions';
import { contextAnalyzer } from '@/services/navigation-intelligence/ContextAnalyzer';
import { useFamilyMode } from '@/hooks/useFamilyMode';
import { NavigationSection } from '@/types/family-mode';

interface SmartSuggestionsPanelProps {
  visible: boolean;
  currentSection: NavigationSection;
  onAction: (action: string, data?: any) => void;
  onNavigate: (section: NavigationSection, data?: any) => void;
  className?: string;
}

const iconMap = {
  Sparkles, ChefHat, AlertCircle, PackageOpen, Coffee, Calendar,
  CloudRain, AlertTriangle, Star, Users, HelpCircle, Zap
};

export function SmartSuggestionsPanel({ 
  visible, 
  currentSection, 
  onAction, 
  onNavigate,
  className = ""
}: SmartSuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [contextData, setContextData] = useState<any>(null);
  const { currentProfile, isFamilyModeActive } = useFamilyMode();

  // Animation variants
  const panelVariants = {
    hidden: { opacity: 0, y: -20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 0.95 }
  };

  const suggestionVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.1 }
    }),
    exit: { opacity: 0, x: 30 }
  };

  /**
   * Met à jour les suggestions basées sur le contexte
   */
  const updateSuggestions = useCallback(async () => {
    if (!visible) return;

    setLoading(true);
    try {
      // Analyser le contexte actuel
      const context = await contextAnalyzer.analyzeCurrentContext();
      setContextData(context);

      // Construire le contexte de suggestion
      const suggestionContext: SuggestionContext = {
        userId: 'user-123', // TODO: Obtenir l'ID utilisateur réel
        currentSection,
        timeOfDay: context.time.hour,
        dayOfWeek: context.time.dayOfWeek,
        sessionDuration: Date.now() - (localStorage.getItem('session_start') ? 
          parseInt(localStorage.getItem('session_start')!) : Date.now()),
        recentActions: [], // TODO: Récupérer les actions récentes
        familyProfile: currentProfile || undefined,
        currentInventory: [], // TODO: Récupérer l'inventaire
        weatherContext: {
          temperature: context.external.temperature,
          condition: context.external.weather
        },
        budgetStatus: {
          remaining: 50, // TODO: Récupérer le budget réel
          percentUsed: 65
        }
      };

      // Générer les suggestions
      const newSuggestions = await smartSuggestions.generateSuggestions(suggestionContext);
      setSuggestions(newSuggestions);

      // Marquer comme affichées
      newSuggestions.forEach(async (suggestion) => {
        await smartSuggestions.markSuggestionShown(
          suggestionContext.userId,
          suggestion.id,
          context
        );
      });

    } catch (error) {
      console.error('Failed to update suggestions:', error);
    } finally {
      setLoading(false);
    }
  }, [visible, currentSection, currentProfile]);

  /**
   * Gère l'action sur une suggestion
   */
  const handleSuggestionAction = useCallback(async (suggestion: SmartSuggestion) => {
    try {
      // Enregistrer l'action
      await smartSuggestions.handleSuggestionAction(
        'user-123', // TODO: ID utilisateur réel
        suggestion.id,
        'accept',
        []
      );

      // Exécuter l'action
      switch (suggestion.action.type) {
        case 'navigate':
          onNavigate(suggestion.action.target as NavigationSection, suggestion.action.data);
          break;
        case 'execute':
          onAction(suggestion.action.target, suggestion.action.data);
          break;
        case 'prompt':
          onAction('show_prompt', { 
            type: suggestion.action.target, 
            data: suggestion.action.data 
          });
          break;
        case 'tutorial':
          onAction('start_tutorial', { 
            tutorial: suggestion.action.target,
            introMode: suggestion.action.data?.introMode
          });
          break;
      }

      // Retirer la suggestion de la liste
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));

    } catch (error) {
      console.error('Failed to handle suggestion action:', error);
    }
  }, [onAction, onNavigate]);

  /**
   * Dismiss une suggestion
   */
  const handleDismiss = useCallback(async (suggestion: SmartSuggestion) => {
    try {
      await smartSuggestions.handleSuggestionAction(
        'user-123', // TODO: ID utilisateur réel
        suggestion.id,
        'dismiss'
      );

      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    } catch (error) {
      console.error('Failed to dismiss suggestion:', error);
    }
  }, []);

  /**
   * Obtient l'icône pour une suggestion
   */
  const getIcon = (iconName: string) => {
    const Icon = iconMap[iconName as keyof typeof iconMap];
    return Icon || Sparkles;
  };

  /**
   * Détermine les couleurs selon la priorité et le mode famille
   */
  const getSuggestionStyles = (suggestion: SmartSuggestion) => {
    const isChildMode = currentProfile?.type === 'child';
    
    const baseStyles = {
      high: 'border-red-200 bg-red-50 hover:bg-red-100',
      medium: 'border-blue-200 bg-blue-50 hover:bg-blue-100',
      low: 'border-gray-200 bg-gray-50 hover:bg-gray-100'
    };

    const childStyles = {
      high: 'border-pink-200 bg-pink-50 hover:bg-pink-100',
      medium: 'border-purple-200 bg-purple-50 hover:bg-purple-100', 
      low: 'border-green-200 bg-green-50 hover:bg-green-100'
    };

    return isChildMode ? childStyles[suggestion.priority] : baseStyles[suggestion.priority];
  };

  // Effet pour mettre à jour les suggestions
  useEffect(() => {
    updateSuggestions();
    
    // Mettre à jour toutes les 5 minutes
    const interval = setInterval(updateSuggestions, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [updateSuggestions]);

  // Auto-hide des suggestions non urgentes
  useEffect(() => {
    suggestions.forEach(suggestion => {
      if (suggestion.presentation.autoHide && suggestion.presentation.showDuration) {
        const timer = setTimeout(() => {
          setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
        }, suggestion.presentation.showDuration);

        return () => clearTimeout(timer);
      }
    });
  }, [suggestions]);

  if (!visible || suggestions.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={panelVariants}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`bg-card/90 backdrop-blur-md border rounded-lg shadow-lg ${className}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">
                {currentProfile?.type === 'child' ? 'Suggestions magiques !' : 'Suggestions intelligentes'}
              </h3>
            </div>
            
            {/* Indicateur de contexte */}
            {contextData && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className={`h-2 w-2 rounded-full ${
                    contextData.external.temperature > 20 ? 'bg-orange-400' : 'bg-blue-400'
                  }`} />
                  {contextData.external.temperature}°C
                </div>
                {contextData.inventory.expiringItems > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {contextData.inventory.expiringItems} expirent
                  </Badge>
                )}
                {isFamilyModeActive && (
                  <Badge variant="secondary" className="text-xs">
                    👨‍👩‍👧‍👦 Famille
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Suggestions List */}
        <div className="p-4 space-y-3">
          <AnimatePresence>
            {loading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center py-8"
              >
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="ml-2 text-sm text-muted-foreground">
                  {currentProfile?.type === 'child' ? 'Magie en cours...' : 'Analyse en cours...'}
                </span>
              </motion.div>
            ) : (
              suggestions.map((suggestion, index) => {
                const Icon = getIcon(suggestion.icon);
                const isChildMode = currentProfile?.type === 'child';
                const suggestionText = suggestion.familyAdaptation?.adaptedLanguage || suggestion.description;

                return (
                  <motion.div
                    key={suggestion.id}
                    custom={index}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={suggestionVariants}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className={`${getSuggestionStyles(suggestion)} transition-all duration-200 cursor-pointer`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Icône avec animation selon la priorité */}
                          <motion.div
                            animate={suggestion.presentation.urgent ? {
                              scale: [1, 1.1, 1],
                              transition: { duration: 1, repeat: Infinity }
                            } : {}}
                            className={`p-2 rounded-full ${
                              suggestion.priority === 'high' ? 'bg-primary/20' : 'bg-muted/50'
                            }`}
                          >
                            <Icon className={`h-5 w-5 ${
                              suggestion.priority === 'high' ? 'text-primary' : 'text-muted-foreground'
                            }`} />
                          </motion.div>

                          {/* Contenu principal */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <h4 className={`font-medium ${isChildMode ? 'text-lg' : 'text-sm'}`}>
                                  {suggestion.title}
                                </h4>
                                <p className={`text-muted-foreground ${isChildMode ? 'text-base' : 'text-sm'} mt-1`}>
                                  {suggestionText}
                                </p>

                                {/* Métadonnées contextuelles */}
                                <div className="flex items-center gap-2 mt-2">
                                  {/* Barre de confiance */}
                                  <div className="flex items-center gap-2">
                                    <div className="h-1 w-16 bg-muted rounded-full overflow-hidden">
                                      <motion.div 
                                        className="h-full bg-primary rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${suggestion.confidence * 100}%` }}
                                        transition={{ duration: 0.8, delay: index * 0.1 }}
                                      />
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {Math.round(suggestion.confidence * 100)}%
                                    </span>
                                  </div>

                                  {/* Badges contextuels */}
                                  {suggestion.context.timeRelevant && (
                                    <Badge variant="outline" className="text-xs gap-1">
                                      <Clock className="h-3 w-3" />
                                      Urgent
                                    </Badge>
                                  )}

                                  {suggestion.context.familyRelevant && isFamilyModeActive && (
                                    <Badge variant="secondary" className="text-xs">
                                      👨‍👩‍👧‍👦 Famille
                                    </Badge>
                                  )}

                                  {suggestion.familyAdaptation?.supervisedAction && (
                                    <Badge variant="outline" className="text-xs text-orange-600">
                                      👀 Supervision
                                    </Badge>
                                  )}
                                </div>

                                {/* Facteurs contextuels */}
                                {suggestion.context.reasoning.length > 0 && !isChildMode && (
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    💡 {suggestion.context.reasoning.slice(0, 2).join(' • ')}
                                  </div>
                                )}

                                {/* Estimation temps */}
                                {suggestion.estimatedTimeToAction && (
                                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                    <Target className="h-3 w-3" />
                                    ~{suggestion.estimatedTimeToAction} min
                                  </div>
                                )}
                              </div>

                              {/* Bouton dismiss */}
                              {suggestion.presentation.dismissible && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDismiss(suggestion);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 mt-3">
                              <Button
                                variant={suggestion.priority === 'high' ? 'default' : 'outline'}
                                size={isChildMode ? 'default' : 'sm'}
                                className="flex-1"
                                onClick={() => handleSuggestionAction(suggestion)}
                              >
                                {suggestion.action.type === 'navigate' && '👆 '}
                                {suggestion.action.type === 'tutorial' && '📚 '}
                                {suggestion.action.type === 'execute' && '⚡ '}
                                {isChildMode ? 'C\'est parti !' : 'Appliquer'}
                              </Button>

                              {/* Action secondaire pour mode famille */}
                              {suggestion.familyAdaptation?.supervisedAction && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleParentalApproval(suggestion)}
                                >
                                  👨‍👩‍👧‍👦 Demander
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>

          {/* Footer avec métriques si mode avancé */}
          {!currentProfile || currentProfile.type === 'parent' ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="pt-3 border-t border-border/50"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
                <span>
                  Contexte: {contextData?.time.season} • {contextData?.external.weather}
                </span>
              </div>
            </motion.div>
          ) : null}
        </div>
      </motion.div>
    </AnimatePresence>
  );

  // === HANDLERS ===
  // Handlers are already defined above using useCallback

  async function handleParentalApproval(suggestion: SmartSuggestion) {
    // TODO: Implémenter la demande d'approbation parentale
    onAction('request_parental_approval', {
      suggestion: suggestion.id,
      action: suggestion.action
    });
  }
}

/**
 * Hook personnalisé pour les suggestions intelligentes
 */
export function useSmartSuggestions(currentSection: NavigationSection) {
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { currentProfile } = useFamilyMode();

  const refreshSuggestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const context = await contextAnalyzer.analyzeCurrentContext();
      
      const suggestionContext: SuggestionContext = {
        userId: 'user-123',
        currentSection,
        timeOfDay: context.time.hour,
        dayOfWeek: context.time.dayOfWeek,
        sessionDuration: 0,
        recentActions: [],
        familyProfile: currentProfile || undefined
      };

      const newSuggestions = await smartSuggestions.generateSuggestions(suggestionContext);
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Failed to refresh suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentSection, currentProfile]);

  const trackSuggestionClick = useCallback(async (suggestion: SmartSuggestion) => {
    await smartSuggestions.handleSuggestionAction(
      'user-123',
      suggestion.id,
      'accept'
    );
  }, []);

  return {
    suggestions,
    isLoading,
    refreshSuggestions,
    trackSuggestionClick
  };
}

export default SmartSuggestionsPanel;