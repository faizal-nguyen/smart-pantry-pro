import React from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingFlow } from '@/components/onboarding';
import { useOnboarding } from '@/hooks/useOnboarding';

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, startOnboarding } = useOnboarding();

  const handleOnboardingComplete = () => {
    // Navigate to the main app after onboarding is complete
    navigate('/', { replace: true });
  };

  // If onboarding is already completed, redirect to main app
  if (state.isCompleted) {
    navigate('/', { replace: true });
    return null;
  }

  // Start onboarding if not started
  React.useEffect(() => {
    if (!state.hasStarted) {
      startOnboarding();
    }
  }, [state.hasStarted, startOnboarding]);

  return (
    <OnboardingFlow onComplete={handleOnboardingComplete} />
  );
};

export default OnboardingPage;