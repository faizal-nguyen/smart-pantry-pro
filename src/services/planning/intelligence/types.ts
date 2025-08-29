/**
 * Types pour l'Intelligence Layer
 */

import { MealType } from '../types';

// Types pour l'apprentissage des préférences
export interface UserBehaviorData {
  // Actions explicites
  recipesLiked: string[];
  recipesDisliked: string[];
  recipesCooked: string[];
  recipesSkipped: string[];
  
  // Actions implicites
  viewDuration: Record<string, number>;
  searchQueries: string[];
  filterUsage: FilterPattern[];
  
  // Contexte
  cookingTimes: TimePattern[];
  shoppingPatterns: ShoppingBehavior[];
  seasonalPreferences: SeasonalPattern[];
}

export interface TimePattern {
  dayOfWeek: number;
  mealType: MealType;
  averagePrepTime: number;
  complexity: 'simple' | 'medium' | 'complex';
}

export interface FilterPattern {
  filters: string[];
  frequency: number;
  context: string;
  timestamp: Date;
}

export interface ShoppingBehavior {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  averageSpend: number;
  preferredStores: string[];
  peakShoppingDays: number[];
}

export interface SeasonalPattern {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  preferredIngredients: string[];
  avoidedIngredients: string[];
  mealTemperaturePreference: 'hot' | 'cold' | 'mixed';
}

export interface LearnedPreferences {
  cuisineAffinities: Record<string, number>;
  ingredientPreferences: {
    loved: string[];
    liked: string[];
    neutral: string[];
    disliked: string[];
    allergens: string[];
  };
  cookingHabits: {
    preferredMealTimes: TimePattern[];
    averageCookingTime: number;
    complexityPreference: 'simple' | 'medium' | 'complex';
    batchCookingTendency: number;
  };
  nutritionalTendencies: {
    averageCaloriesPerMeal: number;
    macroDistribution: {
      protein: number;
      carbs: number;
      fat: number;
    };
    healthScore: number;
    dietaryPattern: string;
  };
  confidenceScore: number;
}

export interface FeatureVector {
  // Goûts
  sweetPreference: number;
  spicyTolerance: number;
  vegetableAffinity: number;
  proteinPreference: number;
  
  // Habitudes
  cookingFrequency: number;
  mealComplexity: number;
  timeConstraints: number;
  varietySeeking: number;
  
  // Nutrition
  healthConsciousness: number;
  calorieAwareness: number;
  macroBalance: number;
  
  // Comportement
  adventurousness: number;
  priceConsciousness: number;
  seasonalPreference: number;
}

export interface UserTasteProfile {
  // Préférences de base
  sweetness: number; // 0-1
  saltiness: number;
  sourness: number;
  bitterness: number;
  umami: number;
  spiciness: number;
  
  // Textures préférées
  textures: {
    crispy: number;
    creamy: number;
    chewy: number;
    soft: number;
    crunchy: number;
  };
  
  // Complexité
  flavorComplexity: 'simple' | 'moderate' | 'complex';
  adventurousness: number; // 0-1
  
  // Influences culturelles
  culturalAffinities: {
    cuisine: string;
    affinity: number;
  }[];
}

// Types pour les recommandations
export interface MealRecommendations {
  primaryRecommendations: RecommendedMeal[];
  alternativeOptions: RecommendedMeal[];
  quickOptions: RecommendedMeal[];
  healthyOptions: RecommendedMeal[];
  budgetOptions: RecommendedMeal[];
  explanations: RecommendationExplanation[];
}

export interface RecommendedMeal {
  recipeId: string;
  recipeName: string;
  score: number;
  matchReasons: string[];
  nutritionalMatch: number;
  preferenceMatch: number;
  contextMatch: number;
  estimatedCost: number;
  prepTime: number;
}

export interface RecommendationExplanation {
  recipeId: string;
  explanation: string;
  confidence: number;
  factors: {
    factor: string;
    weight: number;
    contribution: number;
  }[];
}

export interface ContextFactors {
  season: string;
  weather?: WeatherContext;
  timeOfDay: number;
  dayOfWeek: number;
  inventory: any;
  recentMeals: string[];
  upcomingEvents?: string[];
}

export interface WeatherContext {
  temperature: number;
  condition: 'sunny' | 'rainy' | 'cloudy' | 'snowy';
  humidity: number;
}

// Types pour l'adaptation
export interface AdaptationEvent {
  type: AdaptationEventType;
  timestamp: Date;
  data: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export enum AdaptationEventType {
  INGREDIENT_UNAVAILABLE = 'INGREDIENT_UNAVAILABLE',
  SCHEDULE_CHANGE = 'SCHEDULE_CHANGE',
  BUDGET_UPDATE = 'BUDGET_UPDATE',
  DIETARY_RESTRICTION_ADDED = 'DIETARY_RESTRICTION_ADDED',
  GUEST_ADDED = 'GUEST_ADDED',
  WEATHER_CHANGE = 'WEATHER_CHANGE',
  PREFERENCE_UPDATE = 'PREFERENCE_UPDATE',
  HEALTH_GOAL_CHANGE = 'HEALTH_GOAL_CHANGE'
}

export interface AdaptationStrategy {
  name: string;
  applicableEvents: AdaptationEventType[];
  priority: number;
  execute: (plan: any, event: AdaptationEvent) => Promise<any>;
}

// Types pour le feedback
export interface UserFeedback {
  type: 'explicit' | 'implicit';
  sentiment: 'positive' | 'negative' | 'neutral';
  aspectRatings?: {
    taste: number;
    difficulty: number;
    time: number;
    cost: number;
    health: number;
  };
  comments?: string;
  timestamp: Date;
}

export interface CollectedFeedback {
  planId: string;
  mealFeedback: Record<string, UserFeedback>;
  overallSatisfaction: number;
  wouldRepeat: boolean;
  completionRate: number;
}

export interface LearningOutcome {
  modelUpdated: boolean;
  patternsLearned: number;
  recommendationAdjustments: any;
  confidenceImprovement: number;
}

// Types pour les patterns
export interface Pattern {
  id: string;
  type: PatternType;
  confidence: number;
  occurrences: number;
  firstSeen: Date;
  lastSeen: Date;
  data: any;
}

export enum PatternType {
  CUISINE_ROTATION = 'CUISINE_ROTATION',
  INGREDIENT_COMBINATION = 'INGREDIENT_COMBINATION',
  TIME_PREFERENCE = 'TIME_PREFERENCE',
  NUTRITIONAL_CYCLE = 'NUTRITIONAL_CYCLE',
  SEASONAL_PREFERENCE = 'SEASONAL_PREFERENCE',
  BUDGET_PATTERN = 'BUDGET_PATTERN',
  COMPLEXITY_PROGRESSION = 'COMPLEXITY_PROGRESSION'
}

// Types pour l'apprentissage continu
export interface LearningCycleResult {
  cycleCompleted: boolean;
  improvement: number;
  newPatternsDiscovered: Pattern[];
  modelVersion: string;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
}

export interface TrainingDataset {
  features: any; // TensorFlow tensor
  labels: any; // TensorFlow tensor
  featureSize: number;
  labelSize: number;
  metadata: {
    collectionPeriod: Date;
    userCount: number;
    recipeCount: number;
  };
}

export interface ModelMetrics {
  accuracy: number;
  loss: number;
  validationAccuracy: number;
  validationLoss: number;
  trainingTime: number;
  epochsCompleted: number;
}

// Types pour la personnalisation familiale
export interface FamilyMember {
  id: string;
  name: string;
  age: number;
  role: 'parent' | 'child' | 'other';
  dietaryRestrictions: string[];
  allergies: string[];
  preferences: Partial<UserTasteProfile>;
  history: UserBehaviorData;
}

export interface AggregatedPreferences {
  commonPreferences: CommonPreferences;
  absoluteRestrictions: string[];
  acceptableCompromises: Compromise[];
  rotationStrategy: RotationStrategy;
  memberAdaptations: MemberAdaptation[];
}

export interface CommonPreferences {
  cuisines: string[];
  ingredients: string[];
  maxSpiceLevel: number;
  sharedTextures: string[];
}

export interface Compromise {
  aspect: string;
  originalPreference: any;
  compromiseValue: any;
  affectedMembers: string[];
  acceptanceScore: number;
}

export interface RotationStrategy {
  type: 'daily' | 'meal-based' | 'weekly';
  schedule: RotationSchedule[];
}

export interface RotationSchedule {
  period: string;
  focusMember: string;
  adaptationsForOthers: string[];
}

export interface MemberAdaptation {
  memberId: string;
  mealId: string;
  adaptationType: 'portion' | 'side-dish' | 'seasoning' | 'substitution';
  details: string;
}

// Types pour les métriques
export interface IntelligenceMetrics {
  ml: {
    accuracy: number;
    f1Score: number;
    trainingLoss: number;
    validationLoss: number;
  };
  recommendations: {
    clickThroughRate: number;
    conversionRate: number;
    diversityScore: number;
    noveltyScore: number;
  };
  learning: {
    newPatternsThisWeek: number;
    profileCompleteness: number;
    dataPointsCollected: number;
    feedbackProcessed: number;
  };
  business: {
    userEngagement: number;
    planCompletionRate: number;
    wasteReduction: number;
    budgetOptimization: number;
  };
}

// Types pour le contexte actuel
export interface CurrentContext {
  weather: {
    temperature: number;
    condition: string;
  };
  timeAvailable: number;
  healthGoals: {
    active: boolean;
    targets: any;
  };
  budgetRemaining: number;
  inventoryStatus: 'low' | 'medium' | 'high';
  upcomingEvents: string[];
  moodIndicators?: string[];
}