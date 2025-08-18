export interface OnboardingStepBase {
  id: string;
  index: number;
  skipable?: boolean;
  title?: string;
  subtitle?: string;
}

export interface SplashStepData extends OnboardingStepBase {
  type: 'splash';
  content: {
    title: string;
    subtitle: string;
    animation?: string;
    icon?: string;
  };
}

export interface InteractiveStepData extends OnboardingStepBase {
  type: 'interactive';
  question: string;
  options: string[];
  followUp?: Record<string, string | null>;
  illustration?: string;
}

export interface MultiSelectStepData extends OnboardingStepBase {
  type: 'multi-select';
  question: string;
  options: Array<{
    id: string;
    icon: string;
    label: string;
  }>;
}

export interface SliderStepData extends OnboardingStepBase {
  type: 'slider';
  question: string;
  range: {
    min: { label: string; emoji: string };
    mid: { label: string; emoji: string };
    max: { label: string; emoji: string };
  };
}

export interface PriorityRankingStepData extends OnboardingStepBase {
  type: 'priority-ranking';
  question: string;
  items: string[];
}

export interface QuickScanStepData extends OnboardingStepBase {
  type: 'quick-scan';
  title: string;
  subtitle: string;
  skipable: true;
}

export type OnboardingStepData = 
  | SplashStepData 
  | InteractiveStepData 
  | MultiSelectStepData 
  | SliderStepData 
  | PriorityRankingStepData 
  | QuickScanStepData;

export interface OnboardingAnswer {
  stepId: string;
  value: any;
  timestamp: Date;
}

export interface OnboardingState {
  currentStepIndex: number;
  answers: OnboardingAnswer[];
  isCompleted: boolean;
  hasStarted: boolean;
}

export interface PersonalizationData {
  householdSize: string;
  householdConfig?: string;
  dietaryPreferences: string[];
  cookingLevel: number;
  goals: string[];
  initialInventoryScan?: boolean;
  onboardingCompletedAt: Date;
}

export interface TutorialHighlight {
  element: string;
  message: string;
  gesture: 'tap' | 'point' | 'pulse' | 'swipe';
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export interface TutorialState {
  isActive: boolean;
  currentHighlightIndex: number;
  highlights: TutorialHighlight[];
  hasSeenTutorial: boolean;
}