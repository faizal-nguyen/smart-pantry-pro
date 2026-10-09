import { useState, useEffect, useCallback } from 'react';
import { OnboardingState, OnboardingAnswer, OnboardingStepData } from '@/types/onboarding';
import { ONBOARDING_STEPS } from '@/config/onboarding';
import { usePersonalization } from './usePersonalization';
import { useAuthSessionOptional } from './useAuthenticatedUser';

const initialState: OnboardingState = {
  currentStepIndex: 0,
  answers: [],
  isCompleted: false,
  hasStarted: false
};

export const useOnboarding = () => {
  const { user } = useAuthSessionOptional();
  const storageKey = `v10-draft:${user?.id ?? 'anonymous'}:onboarding`;
  const [snapshot, setSnapshot] = useState({ key: storageKey, data: initialState });
  const state = snapshot.key === storageKey ? snapshot.data : initialState;
  const { savePersonalizationData } = usePersonalization();

  // Load onboarding state from localStorage
  useEffect(() => {
    setSnapshot({ key: storageKey, data: initialState });
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsedState = JSON.parse(saved);
        setSnapshot({ key: storageKey, data: parsedState });
      } catch (error) {
        console.error('Failed to parse onboarding state:', error);
      }
    }
  }, [storageKey]);

  // Save state to localStorage whenever it changes
  const saveState = useCallback((newState: OnboardingState) => {
    localStorage.setItem(storageKey, JSON.stringify(newState));
    setSnapshot({ key: storageKey, data: newState });
  }, [storageKey]);

  const startOnboarding = useCallback(() => {
    const newState = {
      ...initialState,
      hasStarted: true,
      currentStepIndex: 0
    };
    saveState(newState);
  }, [saveState]);

  const nextStep = useCallback((answer?: OnboardingAnswer['value']) => {
    const currentStep = ONBOARDING_STEPS[state.currentStepIndex];
    
    // Save answer if provided
    const newAnswers = [...state.answers];
    if (answer !== undefined && answer !== null) {
      const answerIndex = newAnswers.findIndex(a => a.stepId === currentStep.id);
      const newAnswer: OnboardingAnswer = {
        stepId: currentStep.id,
        value: answer,
        timestamp: new Date()
      };
      
      if (answerIndex >= 0) {
        newAnswers[answerIndex] = newAnswer;
      } else {
        newAnswers.push(newAnswer);
      }
    }

    const isLastStep = state.currentStepIndex >= ONBOARDING_STEPS.length - 1;
    
    if (isLastStep) {
      // Complete onboarding
      const newState = {
        ...state,
        answers: newAnswers,
        isCompleted: true
      };
      // Do not mark completion before preferences have actually persisted.
      savePersonalizationData(newAnswers);
      saveState(newState);
    } else {
      // Move to next step
      const newState = {
        ...state,
        answers: newAnswers,
        currentStepIndex: state.currentStepIndex + 1
      };
      saveState(newState);
    }
  }, [state, saveState, savePersonalizationData]);

  const previousStep = useCallback(() => {
    if (state.currentStepIndex > 0) {
      const newState = {
        ...state,
        currentStepIndex: state.currentStepIndex - 1
      };
      saveState(newState);
    }
  }, [state, saveState]);

  const skipStep = useCallback(() => {
    nextStep(null);
  }, [nextStep]);

  const restartOnboarding = useCallback(() => {
    localStorage.removeItem(storageKey);
    saveState(initialState);
  }, [saveState, storageKey]);

  const getCurrentStep = useCallback((): OnboardingStepData | null => {
    return ONBOARDING_STEPS[state.currentStepIndex] || null;
  }, [state.currentStepIndex]);

  const getStepAnswer = useCallback((stepId: string) => {
    return state.answers.find(answer => answer.stepId === stepId)?.value;
  }, [state.answers]);

  const progress = (state.currentStepIndex / ONBOARDING_STEPS.length) * 100;

  return {
    state,
    startOnboarding,
    nextStep,
    previousStep,
    skipStep,
    restartOnboarding,
    getCurrentStep,
    getStepAnswer,
    progress,
    totalSteps: ONBOARDING_STEPS.length,
    needsOnboarding: !state.isCompleted,
    canGoBack: state.currentStepIndex > 0,
    canSkip: getCurrentStep()?.skipable || false
  };
};