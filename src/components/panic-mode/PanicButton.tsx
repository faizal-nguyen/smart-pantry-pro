"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertCircle, 
  Clock, 
  Home, 
  Truck, 
  Snowflake, 
  CheckCircle,
  X,
  Zap,
  Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePanicMode } from '@/hooks/usePanicMode';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface PanicSolution {
  id: string;
  type: 'instant' | 'delivery' | 'prepared' | 'restaurant';
  title: string;
  description: string;
  timeRequired: number;
  estimatedCost?: number;
  difficulty: 'trivial' | 'easy' | 'medium';
  confidence: number;
  steps?: string[];
  ingredients?: Array<{name: string; amount: number; unit: string}>;
  restaurant?: any;
  recipe?: any;
  category?: string;
}

interface PanicButtonProps {
  className?: string;
  autoTriggerEnabled?: boolean;
  autoTriggerTime?: string;
  onSolutionSelected?: (solution: PanicSolution) => void;
  variant?: 'floating' | 'inline' | 'compact';
  size?: 'sm' | 'md' | 'lg';
}

export const PanicButton: React.FC<PanicButtonProps> = ({
  className,
  autoTriggerEnabled = true,
  autoTriggerTime = "18:00",
  onSolutionSelected,
  variant = 'floating',
  size = 'md'
}) => {
  const [isPanicking, setIsPanicking] = useState(false);
  const [solutions, setSolutions] = useState<PanicSolution[]>([]);
  const [selectedSolution, setSelectedSolution] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [hasAutoTriggered, setHasAutoTriggered] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { triggerPanicMode, isLoading } = usePanicMode();

  // Auto-trigger logic
  useEffect(() => {
    if (!autoTriggerEnabled || hasAutoTriggered || variant !== 'floating') return;

    const checkTime = () => {
      const now = new Date();
      const [hours, minutes] = autoTriggerTime.split(':').map(Number);
      
      // Vérifier si c'est l'heure du déclenchement automatique
      if (now.getHours() === hours && now.getMinutes() === minutes) {
        if (!hasAutoTriggered) {
          setPulseAnimation(true);
          setTimeout(() => {
            triggerPanic(true);
            setHasAutoTriggered(true);
          }, 2000); // 2 secondes de pulse avant auto-trigger
        }
      }

      // Reset à minuit pour le lendemain
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        setHasAutoTriggered(false);
      }
    };

    const interval = setInterval(checkTime, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [autoTriggerEnabled, autoTriggerTime, hasAutoTriggered, variant]);

  const triggerPanic = useCallback(async (isAuto = false) => {
    if (isLoading || isPanicking) return;
    
    setIsPanicking(true);
    setCountdown(30); // 30 seconds promise
    setPulseAnimation(false);

    // Animation du countdown
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownInterval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      // Contexte pour le panic mode
      const context = {
        userId: 'current-user', // À récupérer du contexte auth
        timeAvailable: 30,
        stressLevel: (isAuto ? 3 : 4) as 1 | 2 | 3 | 4 | 5,
        familyMembers: 2, // À récupérer des préférences
        triggerType: isAuto ? 'automatic' as const : 'manual' as const
      };

      const results = await triggerPanicMode(context);
      setSolutions(results);
      
      // Célébration si on a fait ça sous 30s
      if (countdown && countdown > 0) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']
        });
      }
    } catch (error) {
      console.error('Panic failed:', error);
      // Solutions de fallback
      setSolutions([
        {
          id: 'fallback-pizza',
          type: 'delivery',
          title: 'Commander une pizza',
          description: 'La solution de secours qui marche toujours',
          timeRequired: 25,
          difficulty: 'trivial',
          confidence: 95,
          estimatedCost: 15,
          steps: ['Téléphoner', 'Commander', 'Attendre la livraison']
        },
        {
          id: 'fallback-pasta',
          type: 'instant',
          title: 'Pâtes express',
          description: 'Pâtes + ce que vous avez',
          timeRequired: 12,
          difficulty: 'trivial',
          confidence: 90,
          steps: ['Faire bouillir', 'Cuire pâtes', 'Ajouter sauce', 'Servir']
        },
        {
          id: 'fallback-sandwich',
          type: 'instant',
          title: 'Sandwich garni',
          description: 'Rapide et satisfaisant',
          timeRequired: 5,
          difficulty: 'trivial',
          confidence: 85,
          steps: ['Toaster pain', 'Garnir', 'Assembler', 'Déguster']
        }
      ]);
    } finally {
      clearInterval(countdownInterval);
      setCountdown(null);
    }
  }, [triggerPanicMode, isLoading, isPanicking, countdown]);

  const selectSolution = useCallback((solution: PanicSolution) => {
    setSelectedSolution(solution.id);
    setShowSuccess(true);
    
    // Analytics tracking
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'panic_solution_selected', {
        solution_id: solution.id,
        solution_type: solution.type,
        time_to_select: countdown ? 30 - countdown : 0,
        confidence: solution.confidence
      });
    }

    onSolutionSelected?.(solution);
    
    // Animation de succès puis fermeture
    setTimeout(() => {
      setIsPanicking(false);
      setSolutions([]);
      setSelectedSolution(null);
      setShowSuccess(false);
    }, 2000);
  }, [countdown, onSolutionSelected]);

  const closePanicModal = useCallback(() => {
    setIsPanicking(false);
    setSolutions([]);
    setSelectedSolution(null);
    setShowSuccess(false);
    setCountdown(null);
  }, []);

  const getSolutionIcon = (type: string) => {
    switch (type) {
      case 'instant': return <Home className="w-5 h-5" />;
      case 'delivery': return <Truck className="w-5 h-5" />;
      case 'prepared': return <Snowflake className="w-5 h-5" />;
      default: return <Zap className="w-5 h-5" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'trivial': return 'bg-green-100 text-green-800';
      case 'easy': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getButtonSize = () => {
    switch (size) {
      case 'sm': return variant === 'floating' ? 'w-16 h-16' : 'w-10 h-10';
      case 'lg': return variant === 'floating' ? 'w-24 h-24' : 'w-14 h-14';
      default: return variant === 'floating' ? 'w-20 h-20' : 'w-12 h-12';
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'sm': return 'text-xs';
      case 'lg': return 'text-base';
      default: return 'text-sm';
    }
  };

  if (variant === 'inline') {
    return (
      <div className={cn("space-y-4", className)}>
        <Button
          onClick={() => triggerPanic(false)}
          disabled={isLoading || isPanicking}
          className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <AlertCircle className="w-5 h-5 mr-2" />
          {isLoading || isPanicking ? 'Recherche de solutions...' : 'Mode Panique! 🆘'}
        </Button>
        {/* Modal reste le même */}
        <PanicModal />
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <Button
        onClick={() => triggerPanic(false)}
        disabled={isLoading || isPanicking}
        variant="destructive"
        size="sm"
        className={cn("gap-2", className)}
      >
        <AlertCircle className="w-4 h-4" />
        {isLoading || isPanicking ? 'Recherche...' : 'Panique'}
      </Button>
    );
  }

  // Floating variant (default)
  const PanicModal = () => (
    <AnimatePresence>
      {isPanicking && (
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closePanicModal}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header avec countdown */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-full">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Mode Panique Activé!</h2>
                    <p className="text-red-100">Ne vous inquiétez pas, voici vos solutions</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {countdown && (
                    <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                      <Timer className="w-4 h-4 animate-pulse" />
                      <span className="font-bold">{countdown}s</span>
                    </div>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closePanicModal}
                    className="text-white hover:bg-white/20 rounded-full p-2"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Contenu principal */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {solutions.length === 0 && !showSuccess ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">Recherche des meilleures solutions...</p>
                </div>
              ) : showSuccess ? (
                <motion.div
                  className="text-center py-12"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-green-700 mb-2">Solution sélectionnée!</h3>
                  <p className="text-gray-600">Votre repas est en cours de préparation</p>
                </motion.div>
              ) : (
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Vos 3 meilleures options:</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>Choisissez la solution qui vous convient le mieux</span>
                      <Badge variant="outline">Générées en {countdown ? 30 - countdown : 0}s</Badge>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
                    {solutions.map((solution, index) => (
                      <motion.div
                        key={solution.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card 
                          className={cn(
                            "cursor-pointer transition-all duration-200 hover:shadow-lg border-2",
                            selectedSolution === solution.id 
                              ? "border-green-500 bg-green-50" 
                              : "border-gray-200 hover:border-red-300"
                          )}
                          onClick={() => selectSolution(solution)}
                        >
                          <CardContent className="p-6">
                            {/* En-tête de la solution */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "p-2 rounded-full",
                                  solution.type === 'instant' ? 'bg-blue-100 text-blue-600' :
                                  solution.type === 'delivery' ? 'bg-green-100 text-green-600' :
                                  'bg-purple-100 text-purple-600'
                                )}>
                                  {getSolutionIcon(solution.type)}
                                </div>
                                
                                <div>
                                  <h4 className="font-semibold text-gray-900">{solution.title}</h4>
                                  <p className="text-sm text-gray-600">{solution.description}</p>
                                </div>
                              </div>

                              <Badge className={cn("text-xs font-medium", getDifficultyColor(solution.difficulty))}>
                                {solution.difficulty === 'trivial' ? 'Très facile' :
                                 solution.difficulty === 'easy' ? 'Facile' : 'Moyen'}
                              </Badge>
                            </div>

                            {/* Méta-informations */}
                            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span>{solution.timeRequired} min</span>
                              </div>
                              
                              {solution.estimatedCost && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">💰</span>
                                  <span>{solution.estimatedCost}€</span>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2 col-span-2">
                                <span className="text-gray-500">🎯</span>
                                <span>Confiance: {solution.confidence}%</span>
                              </div>
                            </div>

                            {/* Étapes rapides */}
                            {solution.steps && solution.steps.length > 0 && (
                              <div className="mb-4">
                                <h5 className="font-medium text-gray-800 mb-2">Étapes:</h5>
                                <ul className="text-sm text-gray-600 space-y-1">
                                  {solution.steps.slice(0, 3).map((step, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <span className="bg-gray-200 text-gray-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
                                        {i + 1}
                                      </span>
                                      <span>{step}</span>
                                    </li>
                                  ))}
                                  {solution.steps.length > 3 && (
                                    <li className="text-xs text-gray-500 ml-7">
                                      +{solution.steps.length - 3} étapes supplémentaires
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}

                            {/* Bouton de sélection */}
                            <Button 
                              className="w-full bg-red-500 hover:bg-red-600 text-white"
                              disabled={selectedSolution === solution.id}
                            >
                              {selectedSolution === solution.id ? (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Sélectionné!
                                </>
                              ) : (
                                'Choisir cette solution'
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>

                  {/* Conseils en bas */}
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 p-1 rounded-full shrink-0">
                        <AlertCircle className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-blue-800 mb-1">💡 Conseil pour la prochaine fois</p>
                        <p className="text-blue-700">
                          Planifiez vos repas à l'avance pour éviter les moments de panique. 
                          Vous pouvez aussi préparer quelques plats d'urgence au congélateur!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* Le gros bouton rouge flottant */}
      <motion.button
        className={cn(
          "fixed bottom-6 right-6 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full shadow-lg hover:shadow-xl border-4 border-white z-40 transition-all duration-300",
          getButtonSize(),
          className
        )}
        onClick={() => triggerPanic(false)}
        disabled={isLoading || isPanicking}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={
          pulseAnimation ? {
            scale: [1, 1.1, 1],
            boxShadow: [
              "0 4px 20px rgba(255, 107, 107, 0.4)",
              "0 8px 30px rgba(255, 107, 107, 0.6)",
              "0 4px 20px rgba(255, 107, 107, 0.4)"
            ]
          } : isPanicking ? {
            scale: [1, 1.05, 1],
            rotate: [0, 2, -2, 0],
          } : {}
        }
        transition={{ duration: 0.6, repeat: pulseAnimation || isPanicking ? Infinity : 0 }}
      >
        <div className="flex flex-col items-center justify-center gap-1">
          <motion.div
            animate={isPanicking ? { rotate: 360 } : {}}
            transition={{ duration: 1, repeat: isPanicking ? Infinity : 0 }}
          >
            <AlertCircle className={size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8'} />
          </motion.div>
          
          <div className="text-center">
            <div className={cn("font-bold", getTextSize())}>
              {isLoading || isPanicking ? 'RECHERCHE' : 'PANIQUE!'}
            </div>
            <div className={cn("opacity-90", size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-xs' : 'text-[11px]')}>
              {isLoading || isPanicking ? 'En cours...' : 'Pas d\'idée?'}
            </div>
          </div>
        </div>
      </motion.button>

      <PanicModal />
    </>
  );
};