/**
 * PRP-234 PR2 — MenuEntryCard.
 *
 * Affichage d'une entrée meal_plan_entries dans un slot de la grille
 * Menus : nom de la recette, temps total (prep+cook), nombre de
 * portions, bouton « Ouvrir » (si recipe_id) et bouton « Retirer ».
 */
import { useNavigate } from 'react-router-dom';
import { Check, Clock, Undo2, Users, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { recipeDetailPath } from '@/lib/recipeLinks';
import { useCookRecipe } from '@/hooks/useCookRecipe';
import type { MenuEntryView } from '@/hooks/useWeeklyMenu';

interface MenuEntryCardProps {
  entry: MenuEntryView;
  onRemove: (entryId: string) => void;
  disabled?: boolean;
}

export default function MenuEntryCard({ entry, onRemove, disabled }: MenuEntryCardProps) {
  const navigate = useNavigate();
  const totalTime = entry.prep_time + entry.cook_time;
  const reference = entry.recipe_reference ?? (entry.recipe_id ? { id:entry.recipe_id,source:'auto' as const } : null);
  const canOpen = !!reference;
  const cooking = useCookRecipe(reference ? { ...reference, name: entry.recipe_name, servings: entry.servings } : null);
  const cooked = cooking.status === 'cooked' || cooking.status === 'undoing';

  const open = () => {
    if (!reference) return;
    navigate(recipeDetailPath(reference,entry.servings));
  };

  return (
    <div className="kitchen-menu-entry">
      {canOpen ? (
        <button
          type="button"
          onClick={open}
          className="kitchen-menu-entry-title"
          aria-label={`Ouvrir ${entry.recipe_name}`}
        >
          {entry.recipe_name}
        </button>
      ) : (
        <p className="kitchen-menu-entry-title">{entry.recipe_name}</p>
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
      <div className="flex items-center justify-between gap-1">
        {canOpen && cooked ? (
          <span className="inline-flex items-center gap-1">
            <Button type="button" variant="ghost" size="sm" className="min-h-11 px-2 text-xs gap-1" disabled
              aria-label={`${entry.recipe_name} est cuisinée`}>
              <Check className="h-3 w-3" aria-hidden="true" />
              Cuisinée ✓
            </Button>
            <Button type="button" variant="ghost" size="sm" className="min-h-11 px-2 text-xs gap-1"
              disabled={cooking.status === 'undoing'} onClick={() => void cooking.undo()}
              aria-label={`Annuler : ${entry.recipe_name} n’est pas cuisinée`}>
              <Undo2 className="h-3 w-3" aria-hidden="true" />
              Annuler
            </Button>
          </span>
        ) : canOpen ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 px-2 text-xs gap-1"
            disabled={disabled || cooking.status === 'cooking'}
            onClick={() => void cooking.cook()}
            aria-label={`Marquer ${entry.recipe_name} comme cuisinée`}
          >
            <Check className="h-3 w-3" aria-hidden="true" />
            Cuisinée
          </Button>
        ) : (
          <span aria-hidden="true" />
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11 px-2 text-xs gap-1 text-muted-foreground"
          disabled={disabled}
          onClick={() => onRemove(entry.id)}
          aria-label={`Retirer ${entry.recipe_name} du menu`}
        >
          <X className="h-3 w-3" aria-hidden="true" />
          Retirer
        </Button>
      </div>
    </div>
  );
}
