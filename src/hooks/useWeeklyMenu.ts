/**
 * PRP-234 PR2 — useWeeklyMenu hook.
 *
 * Lit la semaine courante depuis `weekly_meal_plans + meal_plan_entries`
 * et expose `addEntry` / `removeEntry` mutations qui écrivent
 * directement via Supabase (latence ~100ms vs ~2-3s pour le tool
 * assistant). Le tool `add_recipe_to_meal_plan` reste utilisable côté
 * assistant — son écriture rafraîchit ce hook via `agentEvents`.
 *
 * Pattern miroir de `useCookingJournal` (PRP-223 PR7) : useQuery +
 * useMutation + `queryClient.invalidateQueries` + abonnement
 * `useAgentDbInvalidation` pour re-fetch après écrit assistant.
 */
import { useAuthSessionOptional } from '@/hooks/useAuthenticatedUser';
import { commandForIntent, executeStockCommand, finishIntent, pendingIntent } from '@/services/stockCommands';
import { fetchUnifiedRecipe } from '@/lib/recipeSource';
import type { RecipeReference } from '@smart/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAgentDbInvalidation } from '@/lib/agentEvents';

export type MenuMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MenuEntryView {
  id: string;
  day_of_week: number;
  meal_type: MenuMealType;
  recipe_id: string | null;
  recipe_reference?: RecipeReference | null;
  recipe_name: string;
  servings: number;
  prep_time: number;
  cook_time: number;
}

export interface WeeklyMenuView {
  meal_plan_id: string | null;
  week_start_date: string;
  entries: MenuEntryView[];
}

export interface AddEntryInput {
  recipe_id: string;
  day_of_week: number;
  meal_type: MenuMealType;
}

const QUERY_KEY = ['weekly-menu'] as const;

interface RawEntry {
  id: string;
  day_of_week: number | null;
  meal_type: string | null;
  recipe_id: string | null;
  recipe_reference?: RecipeReference | null;
  recipe_name: string | null;
  servings: number | null;
  prep_time: number | null;
  cook_time: number | null;
}

interface RawPlanRow {
  id: string;
  meal_plan_entries: RawEntry[] | null;
}

function normaliseEntries(rows: RawEntry[] | null | undefined): MenuEntryView[] {
  if (!rows?.length) return [];
  return rows
    .filter((r): r is RawEntry & { meal_type: MenuMealType; day_of_week: number } => {
      const validMeal =
        r.meal_type === 'breakfast' ||
        r.meal_type === 'lunch' ||
        r.meal_type === 'dinner' ||
        r.meal_type === 'snack';
      return validMeal && typeof r.day_of_week === 'number';
    })
    .map((r) => ({
      id: r.id,
      day_of_week: r.day_of_week,
      meal_type: r.meal_type,
      recipe_id: r.recipe_reference?.id ?? r.recipe_id,
      recipe_reference: r.recipe_reference,
      recipe_name: r.recipe_name ?? '',
      servings: r.servings ?? 1,
      prep_time: r.prep_time ?? 0,
      cook_time: r.cook_time ?? 0,
    }));
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Erreur inconnue';
}

export function useWeeklyMenu(weekStart: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuthSessionOptional();
  const userId = user?.id;

  const query = useQuery<WeeklyMenuView>({
    queryKey: [...QUERY_KEY, userId, weekStart],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_meal_plans')
        .select(
          'id, meal_plan_entries(id, day_of_week, meal_type, recipe_id, recipe_reference, recipe_name, servings, prep_time, cook_time)',
        )
        .eq('user_id', userId!)
        .eq('week_start_date', weekStart)
        .maybeSingle();
      if (error) throw error;
      const plan = data as RawPlanRow | null;
      return {
        meal_plan_id: plan?.id ?? null,
        week_start_date: weekStart,
        entries: normaliseEntries(plan?.meal_plan_entries),
      };
    },
  });

  useAgentDbInvalidation(['meal_plan_entries', 'weekly_meal_plans'], query.refetch);

  const addEntry = useMutation({
    mutationFn: async (input: AddEntryInput) => {
      if (!userId) throw new Error('Non authentifié');

      const day = new Date(`${weekStart}T12:00:00`);
      day.setDate(day.getDate() + input.day_of_week);
      const date = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
      const intent = `menu:${date}:${input.meal_type}:${input.recipe_id}`;
      const pending = await pendingIntent(intent);
      if (pending && pending.command_type !== 'plan_recipe') throw new Error('La planification précédente reste à vérifier.');
      const recipe = pending ? null : await fetchUnifiedRecipe(input.recipe_id);
      if (!pending && !recipe) throw new Error('Recette introuvable.');
      const command = pending ?? await commandForIntent('plan_recipe', intent, {
        recipe: { id: recipe!.id, source: recipe!.source }, servings: recipe!.servings, date, meal_type: input.meal_type,
      });
      const result = await executeStockCommand(command);
      await finishIntent(intent);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Recette ajoutée au menu' });
    },
    onError: (err: unknown) => {
      toast({
        variant: 'destructive',
        title: 'Ajout impossible',
        description: errorMessage(err),
      });
    },
  });

  const removeEntry = useMutation({
    mutationFn: async (entryId: string) => {
      if (!query.data?.entries.some(entry => entry.id === entryId)) throw new Error('Ce repas n’est plus disponible.');
      const { error, data } = await supabase
        .from('meal_plan_entries')
        .delete()
        .eq('meal_plan_id',query.data!.meal_plan_id!)
        .eq('id', entryId).select('id');
      if (error || data?.length !== 1) throw error ?? new Error('Suppression non confirmée.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Recette retirée du menu' });
    },
    onError: (err: unknown) => {
      toast({
        variant: 'destructive',
        title: 'Retrait impossible',
        description: errorMessage(err),
      });
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    addEntry,
    removeEntry,
  };
}
