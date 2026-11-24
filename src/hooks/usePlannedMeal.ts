import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

/**
 * V11-01 E1 — the planned meal a recipe page was opened from (`?meal=`), read under RLS:
 * only a meal of the signed-in account is found. `null`: no such meal any more.
 */
export interface PlannedMealState {
  id: string;
  version: number;
  cooked: boolean;
  /** The recipe the meal plans now; the cooking is linked only if it is this page's. */
  recipe_id: string | null;
}

const MealIdSchema = z.string().uuid();
const MealRowSchema = z.object({
  id: z.string(),
  version: z.number().int().nonnegative(),
  cooked_command_id: z.string().nullable(),
  recipe_reference: z.object({ id: z.string() }).passthrough().nullable(),
});

/** A malformed `meal` parameter is ignored, as if the page was opened from the library. */
export function plannedMealId(value: string | null): string | null {
  return MealIdSchema.safeParse(value).success ? value : null;
}

export function usePlannedMeal(userId: string, mealId: string | null) {
  return useQuery<PlannedMealState | null>({
    queryKey: ['planned-meal', userId, mealId],
    enabled: !!mealId,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_plan_entries')
        .select('id, version, cooked_command_id, recipe_reference')
        .eq('id', mealId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = MealRowSchema.parse(data);
      return { id: row.id, version: row.version, cooked: row.cooked_command_id !== null, recipe_id: row.recipe_reference?.id ?? null };
    },
  });
}
