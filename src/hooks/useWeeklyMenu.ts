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
import { useEffect, useState } from 'react';
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
      recipe_id: r.recipe_id,
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
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setUserId(data.user?.id ?? null);
    });
    return () => {
      active = false;
    };
  }, []);

  const query = useQuery<WeeklyMenuView>({
    queryKey: [...QUERY_KEY, userId, weekStart],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_meal_plans')
        .select(
          'id, meal_plan_entries(id, day_of_week, meal_type, recipe_id, recipe_name, servings, prep_time, cook_time)',
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

      // 1. find-or-create weekly_meal_plans for this week
      let planId = query.data?.meal_plan_id ?? null;
      if (!planId) {
        const { data: created, error: createErr } = await supabase
          .from('weekly_meal_plans')
          .insert({ user_id: userId, week_start_date: weekStart })
          .select('id')
          .single();
        if (createErr) throw createErr;
        planId = (created as { id: string }).id;
      }

      // 2. fetch recipe denormalised fields (name + times + servings)
      const { data: recipe, error: recErr } = await supabase
        .from('recipes')
        .select('name, servings, prep_time, cook_time')
        .eq('id', input.recipe_id)
        .maybeSingle();
      if (recErr) throw recErr;
      if (!recipe) throw new Error('Recette introuvable');
      const r = recipe as {
        name: string;
        servings: number | null;
        prep_time: number | null;
        cook_time: number | null;
      };

      // 3. INSERT meal_plan_entries
      const { data: entry, error: insertErr } = await supabase
        .from('meal_plan_entries')
        .insert({
          meal_plan_id: planId,
          day_of_week: input.day_of_week,
          meal_type: input.meal_type,
          recipe_id: input.recipe_id,
          recipe_name: r.name,
          servings: r.servings ?? 1,
          prep_time: r.prep_time ?? 0,
          cook_time: r.cook_time ?? 0,
        })
        .select('id')
        .single();
      if (insertErr) throw insertErr;

      // PRP-234 PR4 — log `recipe_interactions.planned` pour
      // alimenter le PreferenceScorer V1 (PRP-226 PR6) : une recette
      // planifiée signale un intérêt utilisateur même si elle n'est
      // pas (encore) cuisinée. Best-effort : un échec d'insert ne
      // remonte pas — l'entrée meal_plan est déjà créée.
      void supabase
        .from('recipe_interactions')
        .insert({
          user_id: userId,
          recipe_id: input.recipe_id,
          interaction_type: 'planned',
        })
        .then(({ error: interactionErr }) => {
          if (interactionErr) {
            console.warn('[useWeeklyMenu] planned interaction log failed:', interactionErr.message);
          }
        });

      return (entry as { id: string }).id;
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
      const { error } = await supabase
        .from('meal_plan_entries')
        .delete()
        .eq('id', entryId);
      if (error) throw error;
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
