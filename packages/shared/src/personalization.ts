import { z } from 'zod';
import type { RecipeReference } from './stock-commands.js';
import type { StockAllocation, StockMissing } from './quantities.js';

const terms = z.array(z.string().trim().min(1).max(80)).max(30);
export const DietSchema = z.enum(['vegetarian','vegan','gluten_free','lactose_free','no_pork','no_alcohol','halal','kosher']);
export const NutritionProfileSettingsSchema = z.object({
  consent: z.boolean(),
  allergies: terms,
  excludedIngredients: terms,
  diets: z.array(DietSchema).max(8),
  likedIngredients: terms,
  avoidedIngredients: terms,
  cuisines: terms,
  usualTimeMinutes: z.number().int().min(1).max(600).nullable(),
  skill: z.enum(['beginner','intermediate','advanced']).nullable(),
  equipment: terms,
  usualServings: z.number().int().min(1).max(20).nullable(),
  goals: z.array(z.enum(['anti_waste','quick','variety','more_fiber','protein','vegetables'])).max(6),
  targets: z.object({
    enabled: z.boolean(),
    dailyCaloriesKcal: z.number().min(1).max(20000).nullable(),
    dailyProteinG: z.number().min(1).max(1000).nullable(),
  }).strict(),
  shareWithAssistant: z.boolean(),
}).strict().superRefine((value,ctx) => {
  if (!value.targets.enabled && (value.targets.dailyCaloriesKcal !== null || value.targets.dailyProteinG !== null)) {
    ctx.addIssue({ code:z.ZodIssueCode.custom,path:['targets'],message:'Les cibles désactivées doivent rester vides.' });
  }
});
export type NutritionProfileSettings = z.infer<typeof NutritionProfileSettingsSchema>;
export function emptyNutritionProfile(): NutritionProfileSettings {
  return { consent:false,allergies:[],excludedIngredients:[],diets:[],likedIngredients:[],avoidedIngredients:[],cuisines:[],
    usualTimeMinutes:null,skill:null,equipment:[],usualServings:null,goals:[],
    targets:{ enabled:false,dailyCaloriesKcal:null,dailyProteinG:null },shareWithAssistant:false };
}
export const NutritionProfileSchema = z.object({
  user_id:z.string().uuid(),version:z.number().int().nonnegative(),schema_version:z.literal(1),
  settings:NutritionProfileSettingsSchema,updated_at:z.string().nullable(),
  origin:z.enum(['explicit','imported','legacy_server','empty']),
}).strict();
export type NutritionProfile = z.infer<typeof NutritionProfileSchema>;
export const ProfileWriteSchema = z.object({
  command_id:z.string().uuid(),expected_version:z.number().int().nonnegative(),
  operation:z.enum(['save','clear']),settings:NutritionProfileSettingsSchema,
  origin:z.enum(['explicit','imported']).default('explicit'),
}).strict().superRefine((value,ctx) => {
  if (value.operation==='save' && !value.settings.consent) ctx.addIssue({ code:z.ZodIssueCode.custom,path:['settings','consent'],message:'Confirmez l’enregistrement de votre profil.' });
});
export type ProfileWrite = z.infer<typeof ProfileWriteSchema>;
export interface ProfileWriteResult { applied_version:number; profile:NutritionProfile; }
export interface NutritionProfileRead { profile:NutritionProfile; legacyServerPresent:boolean; }

export const MealContextSchema = z.object({
  goal:z.enum(['tonight','quick','anti_waste','light','high_protein','comfort','batch_cooking']).optional(),
  mealType:z.enum(['breakfast','lunch','dinner','snack']).optional(),
  timeLimitMinutes:z.number().int().min(1).max(600).optional(),
  servings:z.number().int().min(1).max(20).optional(),
  query:z.string().trim().max(200).optional(),
  ingredient:z.string().trim().min(1).max(200).optional(),
  proteinFamily:z.enum(['poulet','boeuf','agneau','poisson','fruits_de_mer','tofu','oeuf','mixte']).optional(),
  proteinCut:z.string().trim().min(1).max(80).optional(),
  dietaryFlag:z.enum(['vegetarien','vegan','sans_porcin','sans_alcool']).optional(),
  craving:z.enum(['warm','fresh','comfort','any']).optional(),
  almostThreshold:z.number().int().min(0).max(10).optional(),
  limitPerBucket:z.number().int().min(1).max(20).optional(),
  nearExpiryDays:z.number().int().min(1).max(30).optional(),
  includeRecentFallback:z.boolean().optional(),
}).strict();
export type MealContext = z.infer<typeof MealContextSchema>;
export type ProfileFeedback = 'repeat'|'dislike'|'too_long'|'not_today';
export const RecommendationFeedbackSchema = z.object({
  command_id:z.string().uuid(),recipe:z.object({ id:z.string().uuid(),source:z.enum(['recipes','user_recipes','recipes_catalog']) }).strict(),
  feedback:z.enum(['repeat','dislike','too_long','not_today']),event_id:z.string().uuid().nullable().default(null),
}).strict();
export type RecommendationFeedback = z.infer<typeof RecommendationFeedbackSchema>;
export interface RecommendationReason {
  code:'STOCK_AVAILABLE'|'STOCK_MISSING'|'STOCK_UNCERTAIN'|'NEAR_DATE'|'TIME_FITS'|'TIME_UNKNOWN'|'DECLARED_TASTE'|'FEEDBACK'|'VARIETY'|'NUTRITION_GOAL'|'EQUIPMENT_UNKNOWN'|'CRAVING'|'KNOWN_VEGETABLES';
  text:string;
}
export interface ConstraintEvaluation {
  status:'compatible'|'incompatible'|'verify';
  findings:Array<{ code:string;ingredient:string|null;message:string }>;
  registry_version:string;
  limitations:string[];
}
export interface NutritionEstimate {
  status:'known'|'estimated'|'partial'|'unavailable';
  coverage:number;
  known_ingredients:number;
  total_ingredients:number;
  per_serving:{ energyKcal:number|null;proteinG:number|null;fiberG:number|null };
  sources:Array<{ product_id:string;source:string;updated_at:string|null;base:'100g' }>;
  limitations:string[];
}
export interface RecommendationEvidence {
  reference:{ id:string;source:Exclude<RecipeReference['source'],'auto'> };
  profile_version:number;
  stock_version:string;
  calculated_at:string;
  duration_minutes:number|null;
  constraints:ConstraintEvaluation;
  availability:{ status:'available'|'missing'|'verify';missing:StockMissing[];allocations:StockAllocation[];uncertainties:string[];excluded_lots:string[];excluded_lot_reasons?:Array<{ id:string;date_kind:'use_by'|'best_before'|'unknown';message:string }> };
  nutrition:NutritionEstimate;
  reason_codes:RecommendationReason[];
  unavailable_criteria:string[];
}
export const LotDateKindSchema = z.enum(['use_by','best_before','unknown']);
export const LotQuantityQualitySchema = z.enum(['measured','estimated','unknown']);
