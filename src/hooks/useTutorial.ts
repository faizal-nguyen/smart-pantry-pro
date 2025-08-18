import { useState, useEffect, useCallback } from 'react';
import { TutorialState, TutorialHighlight } from '@/types/onboarding';
import { TUTORIAL_HIGHLIGHTS, TUTORIAL_STORAGE_KEY } from '@/config/onboarding';

const initialState: TutorialState = {
  isActive: false,
  currentHighlightIndex: 0,
  highlights: TUTORIAL_HIGHLIGHTS,
  hasSeenTutorial: false
};

export const useTutorial = () => {
  const [state, setState] = useState<TutorialState>(initialState);

  // Load tutorial state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsedState = JSON.parse(saved);
        setState({
          ...initialState,
          hasSeenTutorial: parsedState.hasSeenTutorial || false
        });
      } catch (error) {
        console.error('Failed to parse tutorial state:', error);
      }
    }
  }, []);

  // Save state to localStorage
  const saveState = useCallback((newState: TutorialState) => {
    setState(newState);
    localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify({
      hasSeenTutorial: newState.hasSeenTutorial
    }));
  }, []);

  const startTutorial = useCallback((customHighlights?: TutorialHighlight[]) => {
    const highlights = customHighlights || TUTORIAL_HIGHLIGHTS;
    const newState = {
      ...state,
      isActive: true,
      currentHighlightIndex: 0,
      highlights
    };
    saveState(newState);
  }, [state, saveState]);

  const nextHighlight = useCallback(() => {
    if (state.currentHighlightIndex < state.highlights.length - 1) {
      const newState = {
        ...state,
        currentHighlightIndex: state.currentHighlightIndex + 1
      };
      saveState(newState);
    } else {
      // Tutorial completed
      const newState = {
        ...state,
        isActive: false,
        hasSeenTutorial: true,
        currentHighlightIndex: 0
      };
      saveState(newState);
    }
  }, [state, saveState]);

  const previousHighlight = useCallback(() => {
    if (state.currentHighlightIndex > 0) {
      const newState = {
        ...state,
        currentHighlightIndex: state.currentHighlightIndex - 1
      };
      saveState(newState);
    }
  }, [state, saveState]);

  const skipTutorial = useCallback(() => {
    const newState = {
      ...state,
      isActive: false,
      hasSeenTutorial: true,
      currentHighlightIndex: 0
    };
    saveState(newState);
  }, [state, saveState]);

  const restartTutorial = useCallback(() => {
    const newState = {
      ...state,
      isActive: true,
      currentHighlightIndex: 0,
      hasSeenTutorial: false
    };
    saveState(newState);
  }, [state, saveState]);

  const getCurrentHighlight = useCallback((): TutorialHighlight | null => {
    return state.highlights[state.currentHighlightIndex] || null;
  }, [state.highlights, state.currentHighlightIndex]);

  const shouldShowTutorial = useCallback(() => {
    return !state.hasSeenTutorial && !state.isActive;
  }, [state.hasSeenTutorial, state.isActive]);

  // Helper to check if an element should be highlighted
  const isElementHighlighted = useCallback((elementId: string) => {
    const currentHighlight = getCurrentHighlight();
    return state.isActive && currentHighlight?.element === elementId;
  }, [state.isActive, getCurrentHighlight]);

  const progress = ((state.currentHighlightIndex + 1) / state.highlights.length) * 100;

  return {
    state,
    startTutorial,
    nextHighlight,
    previousHighlight,
    skipTutorial,
    restartTutorial,
    getCurrentHighlight,
    shouldShowTutorial,
    isElementHighlighted,
    progress,
    totalHighlights: state.highlights.length,
    canGoBack: state.currentHighlightIndex > 0,
    isLastHighlight: state.currentHighlightIndex >= state.highlights.length - 1
  };
};