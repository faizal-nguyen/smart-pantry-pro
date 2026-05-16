/**
 * PRP-234 PR2 — MenuEntryCard.
 *
 * Affichage d'une entrée meal_plan_entries dans un slot de la grille
 * Menus : nom de la recette, temps total (prep+cook), nombre de
 * portions, bouton « Ouvrir » (si recipe_id) et bouton « Retirer ».
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Clock, Users, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { fireRecipeAssistantAction } from '@/lib/recipeActions';
import type { MenuEntryView } from '@/hooks/useWeeklyMenu';

interface MenuEntryCardProps {
  entry: MenuEntryView;
  onRemove: (entryId: string) => void;
  disabled?: boolean;
}

export default function MenuEntryCard({ entry, onRemove, disabled }: MenuEntryCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const totalTime = entry.prep_time + entry.cook_time;
  const canOpen = !!entry.recipe_id;
  const [cookedPending, setCookedPending] = useState(false);

  const open = () => {
    if (!canOpen) return;
    navigate(`/kitchen/recipes/${entry.recipe_id}`);
  };

  const handleCooked = async () => {
    if (cookedPending) return;
    setCookedPending(true);
    try {
      // PRP-234 PR4 — délégué à l'assistant : il appellera
      // `record_recipe_feedback` (cooking_journal) + ajustera
      // l'inventaire via `consume_inventory_items`. Bénéficie de
      // l'undo 15 min PRP-221.
      const title = await fireRecipeAssistantAction(
        {
          id: entry.recipe_id ?? entry.id,
          name: entry.recipe_name,
          servings: entry.servings,
        },
        'cooked',
      );
      toast({ title, description: `Recette : ${entry.recipe_name}` });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Action impossible',
        description: err instanceof Error ? err.message : 'Erreur inconnue',
      });
    } finally {
      setCookedPending(false);
    }
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
      <div className="flex items-center justify-between gap-1">
        {canOpen ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] gap-1"
            disabled={disabled || cookedPending}
            onClick={() => void handleCooked()}
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
          className="h-7 px-2 text-[11px] gap-1 text-muted-foreground"
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
