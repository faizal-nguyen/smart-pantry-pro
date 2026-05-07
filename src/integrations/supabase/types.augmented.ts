/**
 * Manual augmentation for tables missing from the auto-generated
 * `types.ts`.
 *
 * Background: `src/integrations/supabase/types.ts` was generated when
 * the project only had 6 tables (inventory, products, recipes,
 * recipe_ingredients, recipe_conversations, shopping_list). Several
 * later migrations (20250829000001_create_meal_planning_tables.sql,
 * 20250830000002_create_contextual_system_tables.sql, ...) added 40+
 * tables that never made it back into the generated types because no
 * one re-ran `supabase gen types typescript --project-id ...` after
 * deploying them. The remote regen needs an authenticated CLI session
 * we don't have here.
 *
 * This file fills the gap *only* for the 3 tables actively consumed
 * by code that fails to compile today (`useMealPlanningAnalysis.ts`):
 *   - user_meal_preferences  (cf. 20250829000001 §95)
 *   - weekly_meal_plans      (cf. 20250830000002, plus column adds in 20250829000001)
 *   - meal_plan_entries      (cf. 20250829000001 §54)
 *
 * Everything else in the codebase that calls `supabase.from(...)` on
 * other missing tables falls back to the same loosely-typed
 * generic — they were already untyped before this file existed, so
 * nothing regresses.
 *
 * When the user runs `supabase login` + `supabase gen types typescript
 * --project-id jwoxacnflphclslpqfzs > src/integrations/supabase/types.ts`,
 * delete this file — the canonical regeneration will subsume it.
 */
import type { Database as BaseDatabase, Json } from './types';

// ---- user_meal_preferences ------------------------------------------
// cf. supabase/migrations/20250829000001_create_meal_planning_tables.sql §95
interface UserMealPreferencesRow {
  id: string;
  user_id: string;
  dietary_restrictions: string[];
  allergies: string[];
  cuisine_preferences: string[];
  cooking_skill_level: 'beginner' | 'intermediate' | 'advanced';
  max_prep_time: number;
  max_cook_time: number;
  busy_days: string[];
  family_size: number;
  weekly_budget: number;
  strict_budget_mode: boolean;
  nutritional_goals: Json;
  equipment_available: string[];
  prefer_local: boolean;
  organic_preference: 'none' | 'some' | 'all';
  max_trip_frequency: number;
  created_at: string;
  updated_at: string;
}

type UserMealPreferencesInsert = {
  id?: string;
  user_id: string;
  dietary_restrictions?: string[];
  allergies?: string[];
  cuisine_preferences?: string[];
  cooking_skill_level?: 'beginner' | 'intermediate' | 'advanced';
  max_prep_time?: number;
  max_cook_time?: number;
  busy_days?: string[];
  family_size?: number;
  weekly_budget?: number;
  strict_budget_mode?: boolean;
  nutritional_goals?: Json;
  equipment_available?: string[];
  prefer_local?: boolean;
  organic_preference?: 'none' | 'some' | 'all';
  max_trip_frequency?: number;
  created_at?: string;
  updated_at?: string;
};

type UserMealPreferencesUpdate = Partial<UserMealPreferencesInsert>;

// ---- weekly_meal_plans ----------------------------------------------
// Base in 20250830000002_create_contextual_system_tables.sql, columns
// extended in 20250829000001_create_meal_planning_tables.sql.
interface WeeklyMealPlansRow {
  id: string;
  user_id: string;
  week_start_date: string;
  status: string;
  family_size: number | null;
  dietary_restrictions: string[] | null;
  nutritional_summary: Json | null;
  shopping_list: Json | null;
  alternative_options: Json | null;
  created_at: string;
  updated_at: string;
}

type WeeklyMealPlansInsert = {
  id?: string;
  user_id: string;
  week_start_date: string;
  status?: string;
  family_size?: number | null;
  dietary_restrictions?: string[] | null;
  nutritional_summary?: Json | null;
  shopping_list?: Json | null;
  alternative_options?: Json | null;
  created_at?: string;
  updated_at?: string;
};

type WeeklyMealPlansUpdate = Partial<WeeklyMealPlansInsert>;

// ---- meal_plan_entries ----------------------------------------------
// cf. supabase/migrations/20250829000001_create_meal_planning_tables.sql §54
interface MealPlanEntriesRow {
  id: string;
  meal_plan_id: string;
  day_of_week: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipe_id: string | null;
  recipe_name: string;
  servings: number;
  estimated_cost: number;
  prep_time: number;
  cook_time: number;
  nutritional_info: Json;
  required_ingredients: Json;
  missing_ingredients: Json;
  notes: string | null;
  preparation_tips: Json;
  confidence: number;
  created_at: string;
}

type MealPlanEntriesInsert = {
  id?: string;
  meal_plan_id: string;
  day_of_week: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipe_id?: string | null;
  recipe_name: string;
  servings?: number;
  estimated_cost?: number;
  prep_time?: number;
  cook_time?: number;
  nutritional_info?: Json;
  required_ingredients?: Json;
  missing_ingredients?: Json;
  notes?: string | null;
  preparation_tips?: Json;
  confidence?: number;
  created_at?: string;
};

type MealPlanEntriesUpdate = Partial<MealPlanEntriesInsert>;

// ---- Augmented Database type ----------------------------------------

export type Database = Omit<BaseDatabase, 'public'> & {
  public: Omit<BaseDatabase['public'], 'Tables'> & {
    Tables: BaseDatabase['public']['Tables'] & {
      user_meal_preferences: {
        Row: UserMealPreferencesRow;
        Insert: UserMealPreferencesInsert;
        Update: UserMealPreferencesUpdate;
        Relationships: [];
      };
      weekly_meal_plans: {
        Row: WeeklyMealPlansRow;
        Insert: WeeklyMealPlansInsert;
        Update: WeeklyMealPlansUpdate;
        Relationships: [];
      };
      meal_plan_entries: {
        Row: MealPlanEntriesRow;
        Insert: MealPlanEntriesInsert;
        Update: MealPlanEntriesUpdate;
        Relationships: [
          {
            foreignKeyName: 'meal_plan_entries_meal_plan_id_fkey';
            columns: ['meal_plan_id'];
            isOneToOne: false;
            referencedRelation: 'weekly_meal_plans';
            referencedColumns: ['id'];
          },
        ];
      };
    };
  };
};

export type { Json };
