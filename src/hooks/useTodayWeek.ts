/**
 * PRP-234 PR3 — useTodayWeek.
 *
 * Projette les prochains repas planifiés de la semaine courante
 * (today + futur jusqu'à dimanche). Wrapper léger autour de
 * `useWeeklyMenu` (PR2) qui filtre les entries non-passées et limite
 * à `max` repas pour le panel Today.
 */
import { useMemo } from 'react';
import { format, startOfWeek } from 'date-fns';

import { useWeeklyMenu, type MenuEntryView } from '@/hooks/useWeeklyMenu';

// Ordre meal_type pour trier les repas dans une même journée.
const MEAL_ORDER: Record<MenuEntryView['meal_type'], number> = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
  snack: 3,
};

// JS `Date.getDay()` renvoie 0=Dim, 1=Lun… ; on aligne sur la même
// convention que `meal_plan_entries.day_of_week`.
function todayDayOfWeek(): number {
  return new Date().getDay();
}

export interface TodayWeekItem {
  id: string;
  day_of_week: number;
  meal_type: MenuEntryView['meal_type'];
  recipe_id: string | null;
  recipe_name: string;
  servings: number;
  prep_time: number;
  cook_time: number;
}

export function useTodayWeek(max = 3) {
  const weekStart = useMemo(
    () => format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    [],
  );
  const menu = useWeeklyMenu(weekStart);

  const upcoming = useMemo<TodayWeekItem[]>(() => {
    const entries = menu.data?.entries ?? [];
    const today = todayDayOfWeek();
    // Convertit la convention semaine (0=Dim) en index « jours
    // restants à partir d'aujourd'hui inclus, Lundi-first ».
    const distanceFromToday = (day: number): number => {
      // Lundi = 1, … Dimanche = 0 → mapper sur 0..6 depuis lundi.
      const mondayIdx = (day + 6) % 7;
      const todayMondayIdx = (today + 6) % 7;
      const diff = mondayIdx - todayMondayIdx;
      return diff < 0 ? 7 + diff : diff;
    };
    return entries
      .filter((e) => distanceFromToday(e.day_of_week) >= 0)
      .sort((a, b) => {
        const distA = distanceFromToday(a.day_of_week);
        const distB = distanceFromToday(b.day_of_week);
        if (distA !== distB) return distA - distB;
        return MEAL_ORDER[a.meal_type] - MEAL_ORDER[b.meal_type];
      })
      .slice(0, max);
  }, [menu.data, max]);

  return {
    items: upcoming,
    isLoading: menu.isLoading,
    isError: menu.isError,
    refetch: menu.refetch,
  };
}
