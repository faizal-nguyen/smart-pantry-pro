"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, 
  Zap, 
  Package, 
  RotateCcw, 
  Sparkles,
  ChefHat,
  Keyboard,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuickActions } from '@/hooks/useQuickActions';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface QuickAction {
  id: string;
  icon: React.ComponentType<any>;
  label: string;
  shortcut: string;
  color: string;
  description: string;
  estimatedTime: string;
  category: 'planning' | 'emergency' | 'optimization' | 'intelligence';
}

interface QuickActionBarProps {
  className?: string;
  variant?: 'horizontal' | 'vertical' | 'grid' | 'compact';
  showLabels?: boolean;
  showShortcuts?: boolean;
  showProgress?: boolean;
  autoHide?: boolean;
  position?: 'top' | 'bottom' | 'fixed';
  onActionStart?: (actionId: string) => void;
  onActionComplete?: (actionId: string, result: any) => void;
}

export const QuickActionBar: React.FC<QuickActionBarProps> = ({
  className,
  variant = 'horizontal',
  showLabels = true,
  showShortcuts = true,
  showProgress = true,
  autoHide = false,
  position = 'top',
  onActionStart,
  onActionComplete
}) => {
  const { executeAction, isExecuting, actionStats } = useQuickActions();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [showTooltips, setShowTooltips] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [executionProgress, setExecutionProgress] = useState<Record<string, number>>({});
  const [recentResults, setRecentResults] = useState<Record<string, any>>({});

  // Configuration des actions
  const actions: QuickAction[] = [
    {
      id: 'repeat_week',
      icon: RefreshCw,
      label: 'Répéter',
      shortcut: 'Cmd+R',
      color: '#4CAF50',
      description: 'Clone le dernier plan de repas réussi',
      estimatedTime: '< 5s',
      category: 'planning'
    },
    {
      id: 'survival_mode',
      icon: Zap,
      label: 'Survie',
      shortcut: 'Cmd+S',
      color: '#FF9800',
      description: 'Plan ultra-simple pour la semaine',
      estimatedTime: '< 3s',
      category: 'emergency'
    },
    {
      id: 'empty_fridge',
      icon: Package,
      label: 'Vider frigo',
      shortcut: 'Cmd+E',
      color: '#2196F3',
      description: 'Utilise les produits qui périment bientôt',
      estimatedTime: '< 10s',
      category: 'optimization'
    },
    {
      id: 'reset_week',
      icon: RotateCcw,
      label: 'Reset',
      shortcut: 'Cmd+X',
      color: '#F44336',
      description: 'Efface le plan actuel pour repartir à zéro',
      estimatedTime: '< 2s',
      category: 'planning'
    },
    {
      id: 'smart_suggest',
      icon: Sparkles,
      label: 'IA Suggest',
      shortcut: 'Cmd+I',
      color: '#9C27B0',
      description: 'Recommandations personnalisées par IA',
      estimatedTime: '< 8s',
      category: 'intelligence'
    },
    {
      id: 'batch_cooking',
      icon: ChefHat,
      label: 'Batch Cook',
      shortcut: 'Cmd+B',
      color: '#00BCD4',
      description: 'Organise la préparation groupée des repas',
      estimatedTime: '< 7s',
      category: 'optimization'
    }
  ];

  // Gestion des raccourcis clavier
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        const action = actions.find(a => {
          const shortcutKey = a.shortcut.split('+')[1].toLowerCase();
          return shortcutKey === e.key.toLowerCase();
        });
        
        if (action && !isExecuting) {
          e.preventDefault();
          handleAction(action.id);
          
          // Animation visuelle du raccourci
          const button = document.querySelector(`[data-action="${action.id}"]`);
          if (button) {
            button.classList.add('animate-pulse');
            setTimeout(() => button.classList.remove('animate-pulse'), 300);
          }
        }
      }

      // Toggle tooltips avec 'K'
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowTooltips(!showTooltips);
        toast.info(showTooltips ? 'Raccourcis cachés' : 'Raccourcis affichés');
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [isExecuting, showTooltips, actions]);

  // Auto-hide logic
  useEffect(() => {
    if (!autoHide) return;

    let hideTimer: NodeJS.Timeout;
    
    const handleMouseMove = () => {
      setIsVisible(true);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        if (!isExecuting && !activeAction) {
          setIsVisible(false);
        }
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(hideTimer);
    };
  }, [autoHide, isExecuting, activeAction]);

  const handleAction = useCallback(async (actionId: string) => {
    if (isExecuting) return;

    setActiveAction(actionId);
    onActionStart?.(actionId);
    
    // Simulation de progression pour l'UX
    if (showProgress) {
      setExecutionProgress(prev => ({ ...prev, [actionId]: 0 }));
      
      const progressInterval = setInterval(() => {
        setExecutionProgress(prev => {
          const current = prev[actionId] || 0;
          if (current >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return { ...prev, [actionId]: Math.min(90, current + 10 + Math.random() * 15) };
        });
      }, 200);
    }
    
    try {
      const context = {
        userId: 'current-user', // À récupérer du contexte auth
        familySize: 2, // À récupérer des préférences
        triggerMethod: 'button' as const
      };

      const result = await executeAction(actionId, context);
      
      if (showProgress) {
        setExecutionProgress(prev => ({ ...prev, [actionId]: 100 }));
        setTimeout(() => {
          setExecutionProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[actionId];
            return newProgress;
          });
        }, 1000);
      }

      // Stocker le résultat pour affichage
      setRecentResults(prev => ({ ...prev, [actionId]: result }));
      
      if (result.success) {
        // Animations spécifiques par action
        if (actionId === 'repeat_week') {
          animateCalendarRotation();
        } else if (actionId === 'survival_mode') {
          animateSimplification();
        } else if (actionId === 'smart_suggest') {
          animateBrainSpark();
        }

        toast.success(result.message || 'Action exécutée avec succès!', {
          description: result.metadata?.changes?.[0],
          duration: 4000,
          action: result.data ? {
            label: 'Voir résultats',
            onClick: () => console.log('Résultats:', result.data)
          } : undefined
        });
      } else {
        toast.error(result.error || result.message || 'Action échouée', {
          description: 'Veuillez réessayer dans quelques instants'
        });
      }

      onActionComplete?.(actionId, result);
    } catch (error) {
      if (showProgress) {
        setExecutionProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[actionId];
          return newProgress;
        });
      }

      toast.error('Erreur lors de l\'exécution', {
        description: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    } finally {
      setActiveAction(null);
    }
  }, [executeAction, isExecuting, showProgress, onActionStart, onActionComplete]);

  // Animations personnalisées
  const animateCalendarRotation = () => {
    const calendar = document.querySelector('.calendar-grid');
    if (calendar) {
      calendar.classList.add('animate-spin');
      setTimeout(() => calendar.classList.remove('animate-spin'), 1000);
    }
  };

  const animateSimplification = () => {
    // Animation qui simplifie visuellement l'interface
    document.body.style.filter = 'blur(2px)';
    setTimeout(() => {
      document.body.style.filter = 'none';
    }, 500);
  };

  const animateBrainSpark = () => {
    // Effet de particules pour l'IA
    const sparkles = Array.from({ length: 20 }, (_, i) => {
      const sparkle = document.createElement('div');
      sparkle.style.cssText = `
        position: fixed;
        width: 4px;
        height: 4px;
        background: #9C27B0;
        border-radius: 50%;
        pointer-events: none;
        z-index: 1000;
        left: ${Math.random() * window.innerWidth}px;
        top: ${Math.random() * window.innerHeight}px;
        animation: sparkle 1s ease-out forwards;
      `;
      document.body.appendChild(sparkle);
      
      setTimeout(() => sparkle.remove(), 1000);
    });
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'vertical':
        return 'flex-col space-y-2';
      case 'grid':
        return 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2';
      case 'compact':
        return 'flex space-x-1';
      default:
        return 'flex space-x-2 overflow-x-auto';
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return 'bottom-0 left-0 right-0 border-t border-b-0';
      case 'fixed':
        return 'fixed bottom-4 left-1/2 transform -translate-x-1/2';
      default:
        return 'top-0 left-0 right-0 border-b border-t-0';
    }
  };

  const ActionButton = ({ action }: { action: QuickAction }) => {
    const isActive = activeAction === action.id;
    const hasRecentResult = recentResults[action.id];
    const progress = executionProgress[action.id];
    
    const buttonContent = (
      <motion.button
        data-action={action.id}
        className={cn(
          "relative flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200",
          "hover:scale-105 active:scale-95",
          "focus:outline-none focus:ring-2 focus:ring-offset-1",
          variant === 'compact' ? "px-2 py-1 text-xs" : "",
          isActive 
            ? "bg-white text-gray-900 shadow-lg border-2" 
            : "bg-gray-100 hover:bg-white text-gray-700 border border-gray-200",
          isExecuting && !isActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        )}
        style={{
          borderColor: isActive ? action.color : undefined,
          boxShadow: isActive ? `0 4px 12px ${action.color}33` : undefined
        }}
        onClick={() => handleAction(action.id)}
        disabled={isExecuting}
        whileHover={!isExecuting ? { y: -1 } : {}}
        whileTap={!isExecuting ? { scale: 0.98 } : {}}
      >
        {/* Icône avec animation */}
        <motion.div
          className="flex-shrink-0"
          animate={
            isActive ? { 
              rotate: action.id === 'repeat_week' ? 360 : 0,
              scale: [1, 1.2, 1] 
            } : {}
          }
          transition={{ duration: 0.5 }}
        >
          <action.icon 
            size={variant === 'compact' ? 16 : 20} 
            color={isActive ? action.color : undefined}
          />
        </motion.div>

        {/* Label */}
        {showLabels && (
          <span className={variant === 'compact' ? 'hidden sm:inline' : 'text-sm'}>
            {action.label}
          </span>
        )}

        {/* Progression */}
        {showProgress && typeof progress === 'number' && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
            <motion.div
              className="h-full rounded-b-lg"
              style={{ backgroundColor: action.color }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}

        {/* Badge de raccourci */}
        {showShortcuts && !variant.includes('compact') && (
          <Badge 
            variant="secondary" 
            className="absolute -top-1 -right-1 text-xs px-1 py-0 h-5 bg-gray-800 text-white"
          >
            {action.shortcut.split('+')[1]}
          </Badge>
        )}

        {/* Indicateur de succès récent */}
        {hasRecentResult && hasRecentResult.success && (
          <motion.div
            className="absolute -top-1 -left-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <CheckCircle size={12} />
          </motion.div>
        )}

        {/* Indicateur d'erreur récente */}
        {hasRecentResult && !hasRecentResult.success && (
          <motion.div
            className="absolute -top-1 -left-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <AlertTriangle size={12} />
          </motion.div>
        )}
      </motion.button>
    );

    return showTooltips ? (
      <Tooltip>
        <TooltipTrigger asChild>
          {buttonContent}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{action.label}</p>
            <p className="text-xs text-gray-400">{action.description}</p>
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Clock size={10} />
                <span>{action.estimatedTime}</span>
              </div>
              <div className="flex items-center gap-1">
                <Keyboard size={10} />
                <span>{action.shortcut}</span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    ) : buttonContent;
  };

  return (
    <TooltipProvider>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={cn(
              "bg-white/95 backdrop-blur-sm shadow-sm border rounded-lg p-3 z-30",
              position === 'fixed' ? "max-w-4xl" : "w-full",
              getPositionClasses(),
              className
            )}
            initial={{ opacity: 0, y: position === 'bottom' ? 50 : -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: position === 'bottom' ? 50 : -50 }}
            transition={{ duration: 0.3 }}
          >
            {/* En-tête avec stats si on a la place */}
            {variant === 'grid' && actionStats && (
              <div className="flex items-center justify-between mb-3 pb-2 border-b">
                <h3 className="font-semibold text-gray-800">Actions rapides</h3>
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <TrendingUp size={12} />
                    <span>{actionStats.successRate}% succès</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>{actionStats.averageTime}ms moy.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className={getVariantClasses()}>
              {actions.map((action) => (
                <ActionButton key={action.id} action={action} />
              ))}
            </div>

            {/* Aide raccourcis */}
            {showShortcuts && variant !== 'compact' && (
              <div className="mt-3 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  Pressez{' '}
                  <Badge variant="secondary" className="text-xs px-1 py-0">
                    {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+K
                  </Badge>
                  {' '}pour {showTooltips ? 'masquer' : 'voir'} les raccourcis
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Styles CSS pour les animations */}
      <style jsx>{`
        @keyframes sparkle {
          0% { opacity: 0; transform: scale(0) translateY(0); }
          50% { opacity: 1; transform: scale(1) translateY(-20px); }
          100% { opacity: 0; transform: scale(0) translateY(-40px); }
        }
      `}</style>
    </TooltipProvider>
  );
};