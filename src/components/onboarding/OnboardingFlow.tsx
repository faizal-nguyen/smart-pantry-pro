import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboarding } from '@/hooks/useOnboarding';
import { ONBOARDING_STEPS } from '@/config/onboarding';
import OnboardingStep from './OnboardingStep';

interface OnboardingFlowProps {
  onComplete?: () => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const {
    state,
    nextStep,
    previousStep,
    getCurrentStep,
    getStepAnswer,
    canGoBack,
    canSkip,
    totalSteps
  } = useOnboarding();

  const currentStep = getCurrentStep();

  useEffect(() => {
    if (state.isCompleted && onComplete) {
      onComplete();
    }
  }, [state.isCompleted, onComplete]);

  if (!currentStep) {
    return null;
  }

  const handleNext = (answer?: any) => {
    nextStep(answer);
  };

  const handlePrevious = () => {
    if (canGoBack) {
      previousStep();
    }
  };

  const handleSkip = () => {
    nextStep(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          <OnboardingStep
            step={currentStep}
            totalSteps={totalSteps}
            onNext={handleNext}
            onPrevious={canGoBack ? handlePrevious : undefined}
            onSkip={canSkip ? handleSkip : undefined}
            canGoBack={canGoBack}
            initialAnswer={getStepAnswer(currentStep.id)}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default OnboardingFlow;