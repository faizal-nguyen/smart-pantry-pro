/**
 * PRP-234 PR2 — MenuWeekGrid.
 *
 * Grille 7 jours × 4 types de repas pour visualiser la semaine. Sur
 * desktop : CSS grid 7 colonnes. Sur mobile (< md) : `<details>`
 * accordion par jour avec les 4 slots empilés.
 *
 * A11y : container `role="grid"` + `aria-label`, chaque jour
 * `role="row"` avec `role="rowheader"`, chaque slot vide est un
 * `<button>` clavier (Enter/Space → ouvre dialog). Slots remplis
 * délèguent leur sémantique à `MenuEntryCard`.
 */
import React from 'react';
import { Plus } from 'lucide-react';

import { cn } from '@/lib/utils';
import MenuEntryCard from './MenuEntryCard';
import type { MenuEntryView, MenuMealType } from '@/hooks/useWeeklyMenu';
import type { MenuSlot } from './AddRecipeToMenuDialog';

interface MenuWeekGridProps {
  entries: MenuEntryView[];
  onAddSlot: (slot: MenuSlot) => void;
  onRemoveEntry: (entryId: string) => void;
  removingId?: string;
}

// Lundi-first (FR habit) — `day_of_week` valeurs 0..6.
const DAYS: { value: number; long: string; short: string }[] = [
  { value: 1, long: 'Lundi', short: 'Lun.' },
  { value: 2, long: 'Mardi', short: 'Mar.' },
  { value: 3, long: 'Mercredi', short: 'Mer.' },
  { value: 4, long: 'Jeudi', short: 'Jeu.' },
  { value: 5, long: 'Vendredi', short: 'Ven.' },
  { value: 6, long: 'Samedi', short: 'Sam.' },
  { value: 0, long: 'Dimanche', short: 'Dim.' },
];

const MEAL_TYPES: { value: MenuMealType; label: string; short: string }[] = [
  { value: 'breakfast', label: 'Petit-déj.', short: 'P.déj.' },
  { value: 'lunch', label: 'Déjeuner', short: 'Déj.' },
  { value: 'dinner', label: 'Dîner', short: 'Dîn.' },
  { value: 'snack', label: 'Snack', short: 'Snack' },
];

function entryKey(day: number, meal: MenuMealType): string {
  return `${day}-${meal}`;
}

interface EmptySlotProps {
  day: number;
  dayLong: string;
  meal: MenuMealType;
  mealLabel: string;
  onAddSlot: (slot: MenuSlot) => void;
}

function EmptySlot({ day, dayLong, meal, mealLabel, onAddSlot }: EmptySlotProps) {
  return (
    <button
      type="button"
      onClick={() =>
        onAddSlot({
          day_of_week: day,
          meal_type: meal,
          day_label: dayLong,
          meal_label: mealLabel,
        })
      }
      className="flex h-full min-h-[64px] w-full items-center justify-center rounded-md border border-dashed bg-surface/40 text-muted-foreground transition-colors hover:bg-surface/80 hover:text-foreground focus:bg-surface/80 focus:text-foreground focus:outline-none"
      aria-label={`Ajouter une recette — ${dayLong} ${mealLabel.toLowerCase()}`}
    >
      <Plus className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}

export default function MenuWeekGrid({
  entries,
  onAddSlot,
  onRemoveEntry,
  removingId,
}: MenuWeekGridProps) {
  const byKey = new Map<string, MenuEntryView>();
  for (const e of entries) {
    byKey.set(entryKey(e.day_of_week, e.meal_type), e);
  }

  return (
    <>
      {/* Desktop grid — 7 colonnes */}
      <div
        role="grid"
        aria-label="Menus de la semaine"
        className="hidden md:grid md:grid-cols-7 md:gap-3"
      >
        {DAYS.map((day) => (
          <div key={day.value} role="row" className="flex flex-col gap-2">
            <div
              role="rowheader"
              className="text-center text-sm font-medium text-muted-foreground"
            >
              {day.short}
            </div>
            {MEAL_TYPES.map((meal) => {
              const entry = byKey.get(entryKey(day.value, meal.value));
              return (
                <div
                  key={meal.value}
                  role="gridcell"
                  aria-label={`${day.long} — ${meal.label}`}
                  className={cn(
                    'rounded-md',
                    entry ? '' : 'bg-transparent',
                  )}
                >
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                    {meal.short}
                  </p>
                  {entry ? (
                    <MenuEntryCard
                      entry={entry}
                      onRemove={onRemoveEntry}
                      disabled={removingId === entry.id}
                    />
                  ) : (
                    <EmptySlot
                      day={day.value}
                      dayLong={day.long}
                      meal={meal.value}
                      mealLabel={meal.label}
                      onAddSlot={onAddSlot}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Mobile accordion — un <details> par jour */}
      <div className="space-y-2 md:hidden" aria-label="Menus de la semaine">
        {DAYS.map((day) => {
          const dayCount = MEAL_TYPES.reduce(
            (n, m) => (byKey.has(entryKey(day.value, m.value)) ? n + 1 : n),
            0,
          );
          return (
            <details
              key={day.value}
              className="rounded-md border bg-surface/40 open:bg-surface/70"
            >
              <summary className="flex cursor-pointer items-center justify-between p-3 text-sm font-medium">
                <span>{day.long}</span>
                <span className="text-xs text-muted-foreground">
                  {dayCount === 0 ? 'Aucune' : `${dayCount} repas`}
                </span>
              </summary>
              <div className="space-y-3 border-t p-3">
                {MEAL_TYPES.map((meal) => {
                  const entry = byKey.get(entryKey(day.value, meal.value));
                  return (
                    <div key={meal.value}>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {meal.label}
                      </p>
                      {entry ? (
                        <MenuEntryCard
                          entry={entry}
                          onRemove={onRemoveEntry}
                          disabled={removingId === entry.id}
                        />
                      ) : (
                        <EmptySlot
                          day={day.value}
                          dayLong={day.long}
                          meal={meal.value}
                          mealLabel={meal.label}
                          onAddSlot={onAddSlot}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}
