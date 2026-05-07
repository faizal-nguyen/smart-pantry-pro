import React from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingFlow } from '@/components/onboarding';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Button } from '@/components/ui/button';

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, startOnboarding } = useOnboarding();

  const handleOnboardingComplete = () => {
    // Clear any prior skip flag so a re-completed onboarding wins.
    try {
      window.localStorage.removeItem('skipOnboarding');
    } catch {
      // private mode — no-op
    }
    navigate('/', { replace: true });
  };

  /**
   * Audit P1: onboarding must be skippable. Persist the choice so the
   * AppNavigation gate doesn't bounce the user back here on every
   * reload. Settings → "Recommencer le tutoriel" clears the flag and
   * re-engages the gate.
   */
  const handleSkip = () => {
    try {
      window.localStorage.setItem('skipOnboarding', '1');
    } catch {
      // private mode — fall through; user can still reach the app this
      // time, the gate will just nag again next session.
    }
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
    <div className="relative min-h-screen">
      <OnboardingFlow onComplete={handleOnboardingComplete} />
      {/* Skip control fixed in the corner so it stays reachable on every
          step of the flow without restructuring OnboardingFlow itself. */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSkip}
        className="fixed top-4 right-4 z-50 text-muted-foreground hover:text-foreground"
        aria-label="Passer l'onboarding pour l'instant"
      >
        Plus tard
      </Button>
    </div>
  );
};

export default OnboardingPage;