/**
 * Types pour le système de planification des repas
 */

// Types de base réexportés du service existant
export {
  UserPreferences,
  WeeklyMealPlan,
  MealPlanEntry,
  PlanningIngredient,
  OptimizedShoppingList,
  ShoppingListItem,
  StoreRecommendation,
  BulkBuyItem,
  SeasonalSubstitution,
  AlternativeMeal,
  Budget,
  AdjustedMealPlan,
  BudgetAdjustment,
  MealSubstitution,
  Season,
  SeasonalRecommendations,
  WeeklyNutritionSummary
} from './smartMealPlannerService';

// Types pour le Core Planning Engine
export interface PlanningRequest {
  userId: string;
  weekStartDate?: Date;
  preferences: UserPreferences;
  constraints: PlanningConstraints;
  optimizationMode: 'budget' | 'nutrition' | 'time' | 'balanced';
  existingInventory?: InventoryItem[];
  excludedRecipes?: string[];
}

export interface PlanningConstraints {
  budget: {
    weekly: number;
    daily?: number;
    strict: boolean;
  };
  time: {
    maxPrepTimePerMeal: number;
    maxTotalDailyTime: number;
    busyDays: string[];
  };
  nutrition: {
    minCaloriesPerDay: number;
    maxCaloriesPerDay: number;
    macroTargets?: MacroNutrients;
    micronutrientRequirements?: string[];
  };
  dietary: {
    restrictions: DietaryRestriction[];
    allergies: Allergen[];
    preferences: CuisinePreference[];
  };
  variety: {
    maxRecipeRepetitionPerWeek: number;
    minCuisineTypesPerWeek: number;
    preferNewRecipes: boolean;
  };
}

export interface PlanningResult {
  success: boolean;
  plan?: WeeklyMealPlan;
  alternatives?: AlternativePlan[];
  warnings?: PlanningWarning[];
  optimizationScore: OptimizationScore;
  estimatedSavings?: number;
}

export interface PlanningContext {
  request: PlanningRequest;
  availableRecipes: RecipeCandidate[];
  inventoryAnalysis: InventoryAnalysis;
  seasonalAnalysis: SeasonalAnalysis;
  preferencesAnalysis: PreferencesAnalysis;
  weekStartDate: Date;
  daysToplan: number;
  mealsPerDay: string[];
}

export interface RecipeCandidate {
  recipe: Recipe;
  score: number;
  matchReasons: string[];
  missingIngredients: Ingredient[];
  inventoryMatch: number; // 0-1
  seasonalScore: number; // 0-1
  nutritionalFit: number; // 0-1
  budgetFit: number; // 0-1
}

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  ingredients_json: Ingredient[];
  instructions: string;
  photo_url?: string;
  nutrition_json?: NutritionalInfo;
  tags: string[];
  difficulty: number;
  prep_time: number;
  cook_time: number;
  rest_time?: number;
  servings: number;
  source?: string;
  verified_status: boolean;
  rating_avg?: number;
  rating_count?: number;
}

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  notes?: string;
}

export interface InventoryItem {
  id: string;
  product: {
    id: string;
    name: string;
    category?: string;
  };
  quantity: number;
  unit: string;
  expiry_date?: string;
}

export interface NutritionalInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  vitamins?: Record<string, number>;
  minerals?: Record<string, number>;
}

export interface MacroNutrients {
  protein: number;
  carbs: number;
  fat: number;
}

export interface OptimizationScore {
  overall: number; // 0-1
  nutrition: number;
  budget: number;
  variety: number;
  timeEfficiency: number;
}

export interface AlternativePlan {
  id: string;
  reason: string;
  description: string;
  modifications: string[];
  impactOnScore: number;
  plan: Partial<WeeklyMealPlan>;
}

export interface PlanningWarning {
  type: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  data?: any;
}

// Enums et constantes
export enum DietaryRestriction {
  VEGETARIAN = 'vegetarian',
  VEGAN = 'vegan',
  GLUTEN_FREE = 'gluten-free',
  DAIRY_FREE = 'dairy-free',
  NUT_FREE = 'nut-free',
  HALAL = 'halal',
  KOSHER = 'kosher',
  LOW_CARB = 'low-carb',
  KETO = 'keto',
  PALEO = 'paleo'
}

export enum Allergen {
  GLUTEN = 'gluten',
  DAIRY = 'dairy',
  EGGS = 'eggs',
  NUTS = 'nuts',
  PEANUTS = 'peanuts',
  SOY = 'soy',
  FISH = 'fish',
  SHELLFISH = 'shellfish',
  SESAME = 'sesame'
}

export enum CuisinePreference {
  FRENCH = 'française',
  ITALIAN = 'italienne',
  MEDITERRANEAN = 'méditerranéenne',
  ASIAN = 'asiatique',
  INDIAN = 'indienne',
  MEXICAN = 'mexicaine',
  MOROCCAN = 'marocaine',
  VEGETARIAN = 'végétarienne',
  HEALTHY = 'saine',
  COMFORT = 'comfort food'
}

export enum DayOfWeek {
  MONDAY = 0,
  TUESDAY = 1,
  WEDNESDAY = 2,
  THURSDAY = 3,
  FRIDAY = 4,
  SATURDAY = 5,
  SUNDAY = 6
}

export enum MealType {
  BREAKFAST = 'breakfast',
  LUNCH = 'lunch',
  DINNER = 'dinner',
  SNACK = 'snack'
}

// Interfaces pour les analyses
export interface InventoryAnalysis {
  availableIngredients: string[];
  expiringIngredients: ExpiringItem[];
  totalValue: number;
  coverageScore: number; // 0-1, combien de recettes peuvent être couvertes
}

export interface ExpiringItem {
  item: InventoryItem;
  daysUntilExpiry: number;
  priority: 'high' | 'medium' | 'low';
}

export interface SeasonalAnalysis {
  currentSeason: Season;
  seasonalIngredients: string[];
  priceMultipliers: Record<string, number>;
  recommendations: string[];
}

export interface PreferencesAnalysis {
  topCuisines: string[];
  avoidIngredients: string[];
  preferredIngredients: string[];
  skillMatchedRecipes: string[];
  timeConstrainedDays: string[];
}

// Types pour les optimiseurs
export interface OptimizationCriteria {
  budget: { weight: number; target: 'minimize' | 'maximize' };
  nutrition: { weight: number; target: 'minimize' | 'maximize' };
  variety: { weight: number; target: 'minimize' | 'maximize' };
  inventory: { weight: number; target: 'minimize' | 'maximize' };
  time: { weight: number; target: 'minimize' | 'maximize' };
}

export interface ConstraintValidation {
  isValid: boolean;
  violations: ConstraintViolation[];
  suggestions: string[];
}

export interface ConstraintViolation {
  constraint: string;
  message: string;
  severity: 'critical' | 'major' | 'minor';
  data?: any;
}

// Types pour les templates
export interface MealPlanTemplate {
  id: string;
  userId?: string;
  name: string;
  description?: string;
  isPublic: boolean;
  templateData: TemplateData;
  tags: string[];
  estimatedWeeklyCost?: number;
  averageDailyCalories?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateData {
  meals: TemplateMeal[];
  preferences: Partial<UserPreferences>;
  nutritionalTargets?: NutritionalTargets;
}

export interface TemplateMeal {
  dayOfWeek: DayOfWeek;
  mealType: MealType;
  recipeId?: string;
  recipeName: string;
  tags: string[];
}

export interface NutritionalTargets {
  dailyCalories: { min: number; max: number };
  macroRatios?: MacroNutrients;
  micronutrients?: string[];
}

// Types pour les analytics
export interface MealPlanAnalytics {
  userId: string;
  weekStartDate: Date;
  planCompletionRate: number;
  recipesCooked: number;
  recipesSkipped: number;
  plannedCost: number;
  actualCost: number;
  savingsAchieved: number;
  nutritionGoalsMet: boolean;
  averageHealthScore: number;
  userSatisfactionScore?: number;
  favoriteRecipes: string[];
  rejectedRecipes: string[];
}