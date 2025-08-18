import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTutorial } from '@/hooks/useTutorial';
import { usePersonalization } from '@/hooks/usePersonalization';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, X } from 'lucide-react';

interface TutorialTriggerProps {
  autoStart?: boolean;
}

const TutorialTrigger: React.FC<TutorialTriggerProps> = ({ autoStart = false }) => {
  const { shouldShowTutorial, startTutorial, state } = useTutorial();
  const { hasCompletedOnboarding } = usePersonalization();

  const showTrigger = hasCompletedOnboarding() && shouldShowTutorial() && !state.isActive;

  useEffect(() => {
    if (autoStart && shouldShowTutorial()) {
      // Start tutorial automatically after a short delay
      const timer = setTimeout(() => {
        startTutorial();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [autoStart, shouldShowTutorial, startTutorial]);

  if (!showTrigger) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-20 right-4 z-40"
    >
      <Card className="p-4 bg-primary text-primary-foreground shadow-lg max-w-xs">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-sm">Découvrez Smart Pantry</h3>
              <p className="text-xs opacity-90 mt-1">
                Laissez-nous vous guider dans l'app !
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Mark tutorial as seen without starting it
                const tutorialState = { hasSeenTutorial: true };
                localStorage.setItem('smart-pantry-tutorial', JSON.stringify(tutorialState));
                // Force re-render by triggering a state change
                window.location.reload();
              }}
              className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <Button
            onClick={() => startTutorial()}
            size="sm"
            variant="secondary"
            className="w-full"
          >
            <Play className="w-4 h-4 mr-2" />
            Commencer le tour
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};

export default TutorialTrigger;