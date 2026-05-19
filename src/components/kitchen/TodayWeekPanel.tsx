/**
 * PRP-234 PR3 — TodayWeekPanel.
 *
 * Affiche les prochains repas planifiés (max 3) de la semaine. Click
 * sur un repas → ouvre la recette si recipe_id, sinon page Menus.
 * Source = `useTodayWeek` (wrap léger sur useWeeklyMenu).
 */
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, ChefHat } from 'lucide-react';

import { useTodayWeek, type TodayWeekItem } from '@/hooks/useTodayWeek';
import {
  PanelChrome,
  PanelEmpty,
  PanelError,
  PanelSkeleton,
} from '@/components/kitchen/TodayPanelShell';

const TITLE = 'Cette semaine';

// `meal_plan_entries.day_of_week` suit JS `Date.getDay()` (0=Dim..6=Sam).
const DAY_LABELS: Record<number, string> = {
  0: 'Dim.',
  1: 'Lun.',
  2: 'Mar.',
  3: 'Mer.',
  4: 'Jeu.',
  5: 'Ven.',
  6: 'Sam.',
};
const MEAL_LABELS: Record<TodayWeekItem['meal_type'], string> = {
  breakfast: 'Petit-déj.',
  lunch: 'Déj.',
  dinner: 'Dîner',
  snack: 'Snack',
};

interface MealRowProps {
  item: TodayWeekItem;
}

function MealRow({ item }: MealRowProps) {
  const totalTime = item.prep_time + item.cook_time;
  const inner = (
    <div className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/60 focus:bg-muted/60 focus:outline-none">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-surface-muted">
        <ChefHat className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium line-clamp-1">{item.recipe_name}</p>
        <p className="text-xs text-muted-foreground">
          {DAY_LABELS[item.day_of_week] ?? 'Jour'} · {MEAL_LABELS[item.meal_type]}
          {totalTime > 0 && ` · ${totalTime} min`}
        </p>
      </div>
    </div>
  );

  if (!item.recipe_id) return inner;
  return (
    <Link
      to={`/kitchen/recipes/${item.recipe_id}`}
      aria-label={`Ouvrir ${item.recipe_name}`}
      className="block"
    >
      {inner}
    </Link>
  );
}

export default function TodayWeekPanel() {
  const navigate = useNavigate();
  const { items, isLoading, isError, refetch } = useTodayWeek(3);

  if (isLoading) return <PanelSkeleton title={TITLE} />;
  if (isError) {
    return (
      <PanelError
        title={TITLE}
        message="Impossible de charger ton menu de la semaine."
        onRetry={() => void refetch()}
      />
    );
  }

  if (items.length === 0) {
    return (
      <PanelEmpty
        title={TITLE}
        message="Aucun repas planifié — ouvre Menus pour préparer la semaine."
        cta={{
          label: 'Créer un menu',
          onClick: () => navigate('/kitchen/meal-planning'),
        }}
      />
    );
  }

  return (
    <PanelChrome title={TITLE}>
      <div className="space-y-1">
        {items.map((item) => (
          <MealRow key={item.id} item={item} />
        ))}
        <button
          type="button"
          onClick={() => navigate('/kitchen/meal-planning')}
          className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline focus:underline focus:outline-none"
        >
          <CalendarDays className="h-3 w-3" aria-hidden="true" />
          Voir tous mes menus
        </button>
      </div>
    </PanelChrome>
  );
}
