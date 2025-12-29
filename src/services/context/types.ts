// Types for the Contextual System
// PRP-032.4 - Smart adaptation based on weather, calendar, seasons, and promotions

// ====================================================================
// WEATHER TYPES
// ====================================================================

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface WeatherData {
  date: Date;
  temp: number;
  feels_like: number;
  humidity: number;
  weather: string;
  description: string;
  rain: number;
  wind: number;
  uv_index?: number;
}

export interface WeeklyWeatherAnalysis {
  avgTemp: number;
  tempTrend: 'rising' | 'falling' | 'stable';
  rainyDays: number;
  extremeWeather: Array<{
    date: Date;
    type: 'heat' | 'cold' | 'storm' | 'heavy_rain';
    severity: 'moderate' | 'severe';
  }>;
  recommendations: MealRecommendation[];
}

export interface WeatherContext {
  current: WeatherData;
  forecast: WeatherData[];
  analysis: WeeklyWeatherAnalysis;
  impact: WeatherImpact;
}

export interface WeatherImpact {
  mealTypeImpact: {
    hot_meals: number;
    cold_meals: number;
    comfort_food: number;
    bbq: number;
  };
  cookingMethodImpact: {
    oven: number;
    stovetop: number;
    no_cook: number;
    slow_cooker: number;
  };
}

export interface MealRecommendation {
  day: number;
  type: string;
  suggestion: string;
  reason: string;
  alternatives?: string[];
  priority?: 'low' | 'medium' | 'high';
}

// ====================================================================
// CALENDAR TYPES
// ====================================================================

export type EventCategory = 
  | 'birthday' 
  | 'work_meeting' 
  | 'sport' 
  | 'travel' 
  | 'dinner_event' 
  | 'family_event'
  | 'other';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location?: string;
  attendees?: number;
  type: EventCategory;
  impact: 'low' | 'medium' | 'high';
  familyMembers?: string[]; // For family mode
}

export interface MealTimeSlots {
  lunch: {
    available: boolean;
    timeWindow: number; // minutes
    suggestion: 'quick_lunch' | 'normal_lunch' | 'skip_lunch';
  };
  dinner: {
    available: boolean;
    timeWindow: number;
    suggestion: 'prepare_ahead' | 'normal_dinner' | 'order_out';
  };
}

export interface DaySchedule {
  date: Date;
  events: CalendarEvent[];
  busyScore: number; // 0-10
  mealTimeAvailable: MealTimeSlots;
  recommendations: MealRecommendation[];
  suggestedMealComplexity: 'simple' | 'medium' | 'complex';
}

export interface CalendarContext {
  weekSchedule: DaySchedule[];
  specialOccasions: CalendarEvent[];
  overallBusyScore: number;
  recommendations: MealRecommendation[];
  familySchedule?: FamilyScheduleContext; // For family mode
}

export interface FamilyScheduleContext {
  memberSchedules: Map<string, DaySchedule[]>;
  conflicts: Array<{
    date: Date;
    type: 'meal_time' | 'absence' | 'preference';
    affectedMembers: string[];
    resolution?: string;
  }>;
  commonAvailability: MealTimeSlots[];
}

// ====================================================================
// SEASONAL TYPES
// ====================================================================

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonalIngredient {
  id: string;
  name: string;
  category: 'fruit' | 'vegetable' | 'fish' | 'meat';
  peakMonths: number[];
  availability: {
    [month: number]: {
      inSeason: boolean;
      quality: 'poor' | 'good' | 'excellent';
      priceIndex: number;
    };
  };
  origin: 'local' | 'national' | 'imported';
  score?: number; // Calculated seasonal score
}

export interface SeasonalRecommendation {
  type: 'ingredient_spotlight' | 'seasonal_theme' | 'recipe_suggestion';
  title: string;
  description: string;
  recipes?: any[]; // Recipe suggestions
  ingredients?: SeasonalIngredient[];
  priority: 'low' | 'medium' | 'high';
}

export interface SeasonalContext {
  currentSeason: Season;
  month: number;
  inSeasonProducts: SeasonalIngredient[];
  seasonalRecipes: any[]; // Recipe[]
  upcomingProducts: SeasonalIngredient[];
  endingProducts: SeasonalIngredient[];
  recommendations: SeasonalRecommendation[];
}

// ====================================================================
// PROMOTIONS TYPES
// ====================================================================

export interface Store {
  id: string;
  chain: string;
  name: string;
  distance: number;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
}

export interface Promotion {
  id: string;
  product: string;
  category?: string;
  brand?: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercent: number;
  validUntil: Date;
  quantity?: string;
  conditions?: any;
}

export interface StorePromotion {
  storeId: string;
  storeName: string;
  distance: number;
  promotion: Promotion;
}

export interface ComboOpportunity {
  recipeName: string;
  products: StorePromotion[];
  savings: number;
  missingIngredients?: string[];
}

export interface PromotionRecommendation {
  type: 'bulk_opportunity' | 'urgency' | 'combo' | 'seasonal_deal';
  title: string;
  description: string;
  products: StorePromotion[];
  savingsPotential?: number;
  totalSavings?: number;
  priority?: 'low' | 'medium' | 'high';
  recipeName?: string; // For combo type
}

export interface PromotionsContext {
  promotions: StorePromotion[];
  byCategory: Map<string, StorePromotion[]>;
  totalSavingsPotential: number;
  recommendations: PromotionRecommendation[];
  expiringToday: StorePromotion[];
  bestDeals: StorePromotion[];
  familyDeals?: FamilyPromotionsContext; // For family mode
}

export interface FamilyPromotionsContext {
  bulkDeals: StorePromotion[]; // Good for large families
  multipackOffers: StorePromotion[];
  estimatedWeeklySavings: number;
}

// ====================================================================
// USER PREFERENCES
// ====================================================================

export interface UserContextPreferences {
  // Feature toggles
  weather_adaptation: boolean;
  calendar_sync: boolean;
  seasonal_preferences: boolean;
  price_optimization: boolean;
  
  // Sensitivities
  weather_sensitivity: 'low' | 'medium' | 'high';
  schedule_flexibility: 'rigid' | 'flexible' | 'very_flexible';
  price_sensitivity: 'low' | 'medium' | 'high';
  seasonal_commitment: 'low' | 'moderate' | 'high';
  
  // Locations
  home_location: Coordinates & { address?: string; timezone?: string };
  work_location?: Coordinates & { address?: string };
  preferred_stores?: string[];
  max_store_distance?: number;
  
  // Adaptation preferences
  max_adaptations_per_week?: number;
  adaptation_aggressiveness?: 'conservative' | 'moderate' | 'aggressive';
  
  // Family mode
  family_context_enabled?: boolean;
  family_schedule_priority?: 'individual' | 'balanced' | 'family_first';
  
  // Other preferences
  max_price_per_item?: number;
  excluded_categories?: string[];
}

// ====================================================================
// ADAPTATION TYPES
// ====================================================================

export interface AdaptationLog {
  type: 'weather' | 'schedule' | 'seasonal' | 'promotion' | 'family' | 'combined';
  day: number;
  original: string;
  adapted: string;
  reason: string;
  confidence: number;
  savings?: number;
  familyImpact?: {
    affectedMembers: string[];
    satisfaction: Map<string, number>;
  };
}

export interface AdaptationResult {
  plan: any; // MealPlan
  changes: AdaptationLog[];
}

export interface PlanImpact {
  changesCount: number;
  changePercent: number;
  costImpact: number;
  timeImpact: number;
  nutritionImpact: number;
  overallScore: number;
  familySatisfaction?: Map<string, number>; // For family mode
}

export interface AdaptedMealPlan {
  originalPlan: any; // MealPlan
  adaptedPlan: any; // MealPlan
  adaptations: AdaptationLog[];
  confidence: number;
  impact: PlanImpact;
  executionTime: number;
  context: {
    weather: WeatherContext | null;
    calendar: CalendarContext | null;
    seasonal: SeasonalContext | null;
    promotions: PromotionsContext | null;
  };
  cipherRecommendations?: any[]; // From Cipher integration
}

// ====================================================================
// CONTEXT CACHE TYPES
// ====================================================================

export interface CacheEntry {
  key: string;
  type: 'weather' | 'calendar' | 'seasonal' | 'promotions' | 'combined';
  data: any;
  metadata: {
    source: string;
    confidence: number;
    timestamp: Date;
  };
  expiresAt: Date;
}

// ====================================================================
// API TYPES
// ====================================================================

export interface WeatherAPIResponse {
  list: Array<{
    dt: number;
    main: {
      temp: number;
      feels_like: number;
      humidity: number;
    };
    weather: Array<{
      main: string;
      description: string;
    }>;
    rain?: {
      '3h': number;
    };
    wind: {
      speed: number;
    };
  }>;
}

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  attendees?: Array<{ email: string }>;
}

// ====================================================================
// CIPHER INTEGRATION TYPES
// ====================================================================

export interface CipherContextualRecommendation {
  contextType: 'weather' | 'schedule' | 'seasonal' | 'promotion';
  recommendation: string;
  confidence: number;
  reasoning: string;
  adaptationType: string;
  familyConsensus?: number; // For family mode
}

export interface ContextualCipherMemory {
  userId: string;
  contextPreferences: Map<string, any>;
  adaptationHistory: AdaptationLog[];
  satisfactionScores: Map<string, number>;
  learningInsights: {
    preferredAdaptations: string[];
    rejectedPatterns: string[];
    contextSensitivity: Map<string, number>;
  };
}

// ====================================================================
// FAMILY MODE TYPES
// ====================================================================

export interface FamilyMemberProfile {
  userId: string;
  role: 'parent' | 'child' | 'other';
  dietaryRestrictions: string[];
  preferences: Record<string, any>;
}

export interface FamilyPreferences {
  familyId: string;
  sharedPreferences: Record<string, any>;
  memberPreferences: Map<string, UserContextPreferences>;
  conflictResolutionStrategy: 'voting' | 'majority' | 'compromise' | 'rotation';
  adaptationPriority: 'health' | 'budget' | 'time' | 'balanced';
}

export interface FamilyConflict {
  id: string;
  type: 'preference' | 'schedule' | 'dietary' | 'budget';
  severity: 'low' | 'medium' | 'high';
  members: string[];
  description: string;
  category: string;
  suggestedResolution?: string;
}

export interface ConflictResolution {
  conflictId: string;
  method: 'voting' | 'compromise' | 'alternative' | 'time_optimization' | 'majority_rule' | 'ai_suggestion';
  outcome: 'resolved' | 'pending' | 'compromise' | 'adapted';
  satisfaction: Map<string, number>; // memberId -> satisfaction score (0-1)
  details?: any;
}

export interface FamilyAdaptationResult {
  familyId: string;
  originalPlan: any;
  adaptedPlan: any;
  memberAdaptations: Map<string, AdaptationLog[]>;
  conflicts: FamilyConflict[];
  resolutions: ConflictResolution[];
  consensusScore: number;
  executionTime: number;
}

export interface FamilyContextualState {
  familyId: string;
  members: FamilyMemberProfile[];
  sharedPreferences: Record<string, any>;
  conflictHistory: FamilyConflict[];
  lastSync: Date;
  consensusLevel: number;
  adaptationStrategy: string;
  lastUpdated: Date;
}

// ====================================================================
// REAL-TIME ADAPTATION TYPES
// ====================================================================

// Configuration des adaptations temps réel
export interface RealTimeAdaptationConfig {
  updateInterval: number;
  maxAdaptationsPerUpdate: number;
  confidenceThreshold: number;
  debounceDelay: number;
  enableWeatherAdaptations: boolean;
  enableCalendarAdaptations: boolean;
  enableSeasonalAdaptations: boolean;
  enablePromotionAdaptations: boolean;
}

// Triggers d'adaptations
export interface AdaptationTrigger {
  type: 'weather' | 'calendar' | 'seasonal' | 'promotion' | 'inventory';
  strength: number; // 0-1
  data?: any;
}

// Résultat d'adaptation temps réel
export interface RealTimeAdaptationResult {
  adaptations: AdaptationLog[];
  confidence: number;
  executionTime: number;
  triggers: AdaptationTrigger[];
  timestamp: Date;
  realTime: boolean;
}

// Extension des types existants pour le temps réel
export interface EnhancedAdaptationLog extends AdaptationLog {
  realTime?: boolean;
  triggers?: AdaptationTrigger[];
  timestamp: Date;
}