/**
 * PRP-234 PR2 — MenuEntryCard.
 *
 * Affichage d'une entrée meal_plan_entries dans un slot de la grille
 * Menus : nom de la recette, temps total (prep+cook), nombre de
 * portions, bouton « Ouvrir » (si recipe_id) et bouton « Retirer ».
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { MenuEntryView } from '@/hooks/useWeeklyMenu';

interface MenuEntryCardProps {
  entry: MenuEntryView;
  onRemove: (entryId: string) => void;
  disabled?: boolean;
}

export default function MenuEntryCard({ entry, onRemove, disabled }: MenuEntryCardProps) {
  const navigate = useNavigate();
  const totalTime = entry.prep_time + entry.cook_time;
  const canOpen = !!entry.recipe_id;

  const open = () => {
    if (!canOpen) return;
    navigate(`/kitchen/recipes/${entry.recipe_id}`);
  };

  return (
    <div className="rounded-md border bg-surface/80 p-2 text-left text-sm shadow-sm flex flex-col gap-1">
      {canOpen ? (
        <button
          type="button"
          onClick={open}
          className="font-medium leading-snug line-clamp-2 hover:underline text-left"
          aria-label={`Ouvrir ${entry.recipe_name}`}
        >
          {entry.recipe_name}
        </button>
      ) : (
        <p className="font-medium leading-snug line-clamp-2">{entry.recipe_name}</p>
      )}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {totalTime > 0 && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {totalTime} min
          </span>
        )}
        {entry.servings > 0 && (
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" aria-hidden="true" />
            {entry.servings}
          </span>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 self-end px-2 text-[11px] gap-1 text-muted-foreground"
        disabled={disabled}
        onClick={() => onRemove(entry.id)}
        aria-label={`Retirer ${entry.recipe_name} du menu`}
      >
        <X className="h-3 w-3" aria-hidden="true" />
        Retirer
      </Button>
    </div>
  );
}
