import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTutorial } from '@/hooks/useTutorial';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InteractiveTutorialProps {
  className?: string;
}

const GestureIcon: React.FC<{ gesture: string }> = ({ gesture }) => {
  switch (gesture) {
    case 'tap':
      return <span className="text-lg">👆</span>;
    case 'point':
      return <span className="text-lg">👉</span>;
    case 'pulse':
      return <span className="text-lg">💫</span>;
    case 'swipe':
      return <span className="text-lg">👈</span>;
    default:
      return <span className="text-lg">✨</span>;
  }
};

const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({ className }) => {
  const {
    state,
    nextHighlight,
    previousHighlight,
    skipTutorial,
    getCurrentHighlight,
    progress,
    canGoBack,
    isLastHighlight
  } = useTutorial();

  const overlayRef = useRef<HTMLDivElement>(null);
  const currentHighlight = getCurrentHighlight();

  useEffect(() => {
    if (!state.isActive) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        skipTutorial();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [state.isActive, skipTutorial]);

  // Find the highlighted element and calculate position
  const getHighlightPosition = () => {
    if (!currentHighlight) return null;

    const element = document.querySelector(`[data-tutorial="${currentHighlight.element}"]`);
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      element: rect
    };
  };

  const highlightPosition = getHighlightPosition();

  if (!state.isActive || !currentHighlight) {
    return null;
  }

  const getTooltipPosition = () => {
    if (!highlightPosition) return { top: '50%', left: '50%' };

    const { top, left, width, height } = highlightPosition.element;
    const position = currentHighlight.position || 'bottom';

    switch (position) {
      case 'top':
        return {
          top: top - 10,
          left: left + width / 2,
          transform: 'translate(-50%, -100%)'
        };
      case 'bottom':
        return {
          top: top + height + 10,
          left: left + width / 2,
          transform: 'translate(-50%, 0)'
        };
      case 'left':
        return {
          top: top + height / 2,
          left: left - 10,
          transform: 'translate(-100%, -50%)'
        };
      case 'right':
        return {
          top: top + height / 2,
          left: left + width + 10,
          transform: 'translate(0, -50%)'
        };
      case 'center':
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        };
    }
  };

  const tooltipPosition = getTooltipPosition();

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
          className
        )}
      >
        {/* Highlight Spotlight */}
        {highlightPosition && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute border-4 border-primary rounded-xl shadow-2xl"
            style={{
              top: highlightPosition.top - 8,
              left: highlightPosition.left - 8,
              width: highlightPosition.width + 16,
              height: highlightPosition.height + 16,
              boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 20px rgba(59, 130, 246, 0.5)`
            }}
          />
        )}

        {/* Pulse Animation for highlighted element */}
        {highlightPosition && currentHighlight.gesture === 'pulse' && (
          <motion.div
            className="absolute border-2 border-primary rounded-xl"
            style={{
              top: highlightPosition.top - 4,
              left: highlightPosition.left - 4,
              width: highlightPosition.width + 8,
              height: highlightPosition.height + 8
            }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}

        {/* Tutorial Tooltip */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="absolute max-w-sm"
          style={tooltipPosition}
        >
          <Card className="p-4 bg-white dark:bg-gray-800 shadow-2xl border-primary/20">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <GestureIcon gesture={currentHighlight.gesture} />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Étape {state.currentHighlightIndex + 1} / {state.highlights.length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={skipTutorial}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Progress */}
              <Progress value={progress} className="h-1" />

              {/* Message */}
              <p className="text-sm text-gray-900 dark:text-white font-medium leading-relaxed">
                {currentHighlight.message}
              </p>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {canGoBack && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={previousHighlight}
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Précédent
                  </Button>
                )}
                
                <Button
                  onClick={nextHighlight}
                  size="sm"
                  className="flex-1"
                >
                  {isLastHighlight ? 'Terminer' : 'Suivant'}
                  {!isLastHighlight && <ArrowRight className="w-4 h-4 ml-1" />}
                </Button>
              </div>

              {/* Skip option */}
              <Button
                variant="ghost"
                size="sm"
                onClick={skipTutorial}
                className="w-full text-xs text-gray-500 hover:text-gray-700"
              >
                Passer le tutoriel
              </Button>
            </div>
          </Card>

          {/* Tooltip Arrow */}
          <div
            className={cn(
              "absolute w-3 h-3 bg-white dark:bg-gray-800 border border-primary/20 rotate-45",
              currentHighlight.position === 'top' && "bottom-[-6px] left-1/2 transform -translate-x-1/2",
              currentHighlight.position === 'bottom' && "top-[-6px] left-1/2 transform -translate-x-1/2",
              currentHighlight.position === 'left' && "right-[-6px] top-1/2 transform -translate-y-1/2",
              currentHighlight.position === 'right' && "left-[-6px] top-1/2 transform -translate-y-1/2",
              (!currentHighlight.position || currentHighlight.position === 'center') && "hidden"
            )}
          />
        </motion.div>

        {/* Background click to advance */}
        <div
          className="absolute inset-0 cursor-pointer"
          onClick={nextHighlight}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default InteractiveTutorial;