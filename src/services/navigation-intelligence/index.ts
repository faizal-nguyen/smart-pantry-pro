/**
 * Navigation Intelligence Services
 * Système d'intelligence de navigation selon PRP-040.3
 */

export { NavigationPredictor, navigationPredictor } from '../intelligence/NavigationPredictor';
export { ContextAnalyzer, contextAnalyzer } from './ContextAnalyzer';
export { PersonalizationEngine, personalizationEngine } from './PersonalizationEngine';
export { BehaviorTracker, behaviorTracker } from './BehaviorTracker';
export { SmartSuggestions, smartSuggestions } from './SmartSuggestions';

// Types
export type {
  NavigationPattern,
  NavigationPrediction,
  MLModelWeights
} from '../intelligence/NavigationPredictor';

export type {
  ContextData,
  ContextualRule
} from './ContextAnalyzer';

export type {
  UserPersonalization,
  PersonalizationRecommendation,
  SmartDefaults
} from './PersonalizationEngine';

export type {
  UserInteraction,
  SessionMetrics,
  BehaviorPattern,
  AnalyticsInsight
} from './BehaviorTracker';

export type {
  SmartSuggestion,
  SuggestionContext,
  SuggestionAnalytics
} from './SmartSuggestions';