import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { OnboardingStepData } from '@/types/onboarding';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import SplashStep from './SplashStep';
import InteractiveStep from './InteractiveStep';
import MultiSelectStep from './MultiSelectStep';
import SliderStep from './SliderStep';
import PriorityRankingStep from './PriorityRankingStep';
import QuickScanStep from './QuickScanStep';

interface OnboardingStepProps {
  step: OnboardingStepData;
  totalSteps: number;
  onNext: (answer?: any) => void;
  onPrevious?: () => void;
  onSkip?: () => void;
  canGoBack?: boolean;
  initialAnswer?: any;
}

const OnboardingStep: React.FC<OnboardingStepProps> = ({
  step,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  canGoBack = false,
  initialAnswer
}) => {
  const [answer, setAnswer] = useState(initialAnswer);
  const controls = useAnimation();

  useEffect(() => {
    controls.start({
      opacity: [0, 1],
      y: [20, 0],
      transition: { duration: 0.5 }
    });
  }, [step, controls]);

  const handleNext = () => {
    onNext(answer);
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
  };

  const renderStepContent = () => {
    switch (step.type) {
      case 'splash':
        return (
          <SplashStep
            title={step.content.title}
            subtitle={step.content.subtitle}
            animation={step.content.animation}
            icon={step.content.icon}
          />
        );
      case 'interactive':
        return (
          <InteractiveStep
            question={step.question}
            options={step.options}
            value={answer}
            onChange={setAnswer}
            illustration={step.illustration}
            followUp={step.followUp}
          />
        );
      case 'multi-select':
        return (
          <MultiSelectStep
            question={step.question}
            options={step.options}
            selected={answer || []}
            onChange={setAnswer}
          />
        );
      case 'slider':
        return (
          <SliderStep
            question={step.question}
            range={step.range}
            value={answer || 0.5}
            onChange={setAnswer}
          />
        );
      case 'priority-ranking':
        return (
          <PriorityRankingStep
            question={step.question}
            items={step.items}
            ranked={answer || []}
            onChange={setAnswer}
          />
        );
      case 'quick-scan':
        return (
          <QuickScanStep
            title={step.title!}
            subtitle={step.subtitle!}
            onScanComplete={setAnswer}
            hasScanned={Boolean(answer)}
          />
        );
      default:
        return null;
    }
  };

  const canProceed = () => {
    if (step.skipable) return true;
    if (step.type === 'splash') return true;
    if (step.type === 'multi-select') return Array.isArray(answer) ? answer.length > 0 : false;
    if (step.type === 'priority-ranking') return Array.isArray(answer) ? answer.length > 0 : false;
    return answer !== undefined && answer !== null && answer !== '';
  };

  const isLastStep = step.index === totalSteps - 1;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header with progress */}
      <div className="safe-area-inset-top px-6 pt-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          {canGoBack && onPrevious && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrevious}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="flex-1" />
          <div className="text-sm text-gray-500">
            {step.index + 1} / {totalSteps}
          </div>
        </div>
        
        <Progress 
          value={((step.index + 1) / totalSteps) * 100} 
          className="h-1 bg-white/20"
        />
      </div>

      {/* Content */}
      <motion.div
        className="flex-1 flex flex-col justify-center px-6"
        animate={controls}
      >
        {renderStepContent()}
      </motion.div>

      {/* Actions */}
      <div className="safe-area-inset-bottom px-6 pb-6">
        <div className="flex gap-3">
          {step.skipable && (
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="flex-1 py-4 text-gray-600 hover:text-gray-900"
            >
              Passer
            </Button>
          )}
          
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className={cn(
              "flex-1 py-4 rounded-2xl font-semibold transition-all",
              canProceed()
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            {isLastStep ? "Commencer" : "Continuer"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingStep;