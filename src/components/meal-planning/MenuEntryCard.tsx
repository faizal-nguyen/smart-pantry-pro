/**
 * PRP-234 PR2 — MenuEntryCard.
 *
 * Affichage d'une entrée meal_plan_entries dans un slot de la grille Menus : nom de la recette,
 * temps total, portions et actions.
 *
 * V11-01 E1 : un repas planifié avec sa recette est cuisiné par une commande rattachée au repas.
 * « Cuisinée » est lu en base (cooked_command_id), et la fiche ouverte depuis la carte porte le
 * repas (`?meal=`).
 * V11-01 E3b : portions en pas à pas, « Déplacer », « Prévoir des restes » et « Retirer » passent
 * par update_menu, depuis la page (actions). Un reste (leftover_of) n'est ni cuisiné ni déduit.
 * V11-01 E3d : sur la grille d'ordinateur, la carte se saisit au pointeur (drag) ; « Déplacer… » reste.
 */
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, Check, Clock, GripVertical, Minus, MoreHorizontal, Plus, Soup, Undo2, Users, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { recipeDetailPath } from '@/lib/recipeLinks';
import { leftoverCapacity, servingsBounds, slotLabel } from '@/lib/menuEdit';
import { useCookRecipe } from '@/hooks/useCookRecipe';
import { useRefreshWeeklyMenu, type MenuEntryView } from '@/hooks/useWeeklyMenu';
import type { MenuSlotRef } from '@/lib/menuEdit';
import { APP_LOCALE } from '@smart/shared';

/** The type a held meal travels under: the app's own, never its name as plain text. */
export const MENU_ENTRY_DRAG_TYPE = 'application/x-smart-menu-entry';

/** What the page lets a card do; dialogs open once, in the page. */
export interface MenuCardActions {
  /** The week as loaded: servings bounds, and the meal a leftover comes from. */
  entries: MenuEntryView[];
  /** The meal an edit is running on; while one runs, every card's edits wait (one at a time). */
  busyId: string | null;
  onServings: (entry: MenuEntryView, servings: number) => void;
  onMove: (entry: MenuEntryView) => void;
  onLeftover: (entry: MenuEntryView) => void;
  onRemove: (entry: MenuEntryView) => void;
  /** V11-01 E3d: a meal dropped on a slot of the computer grid; an occupied one swaps (as « Déplacer… »). */
  onDrop?: (entry: MenuEntryView, slot: MenuSlotRef, occupant: MenuEntryView | null) => void;
}

/** V11-01 E3d: a card of the computer grid, held by the pointer. */
export interface CardDrag {
  enabled: boolean;
  dragging: boolean;
  onStart: () => void;
  onEnd: () => void;
}

interface MenuEntryCardProps {
  entry: MenuEntryView;
  actions: MenuCardActions;
  drag?: CardDrag;
}

export default function MenuEntryCard({ entry, actions, drag }: MenuEntryCardProps) {
  const navigate = useNavigate();
  const refreshMenu = useRefreshWeeklyMenu();
  const isLeftover = !!entry.leftover_of;
  const origin = isLeftover ? actions.entries.find(item => item.id === entry.leftover_of) ?? null : null;
  const totalTime = entry.prep_time + entry.cook_time;
  // A leftover opens the recipe of its meal; it is never cooked nor counted on its own.
  const source = origin ?? entry;
  const reference = source.recipe_reference ?? (source.recipe_id ? { id: source.recipe_id, source: 'auto' as const } : null);
  const canOpen = !!reference && (!isLeftover || !!origin);
  // Only a meal planned with its recipe reference can be linked: the server compares them.
  const meal = !isLeftover && entry.recipe_reference
    ? { id: entry.id, version: entry.version, cookedCommandId: entry.cooked_command_id, refresh: refreshMenu }
    : null;
  const cooking = useCookRecipe(!isLeftover && reference ? { ...reference, name: entry.recipe_name, servings: entry.servings } : null, meal);
  const cooked = cooking.status === 'cooked' || cooking.status === 'undoing';
  const busy = actions.busyId === entry.id;
  // aria-disabled, not disabled: a focused button that becomes disabled drops keyboard focus.
  const locked = actions.busyId !== null;
  const bounds = servingsBounds(entry, actions.entries);
  const canLess = !locked && entry.servings > bounds.min;
  const canMore = !locked && entry.servings < bounds.max;
  const [menuOpen, setMenuOpen] = useState(false);
  const canLeftover = !isLeftover && !!entry.recipe_reference && leftoverCapacity(entry, actions.entries) > 0;
  // A dialog opens once the menu has closed, from its trigger: the page gives focus back to it.
  const opening = useRef<'move' | 'leftover' | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const openPending = () => {
    const next = opening.current;
    opening.current = null;
    if (next) trigger.current?.focus();
    if (next === 'move') actions.onMove(entry);
    else if (next === 'leftover') actions.onLeftover(entry);
  };

  const open = () => {
    if (!reference) return;
    navigate(recipeDetailPath(reference, entry.servings, meal?.id));
  };

  return (
    <div className="kitchen-menu-entry" data-leftover={isLeftover} data-dragging={drag?.dragging || undefined} draggable={drag?.enabled || undefined}
      onDragStart={drag?.enabled ? event => {
        event.dataTransfer?.setData(MENU_ENTRY_DRAG_TYPE, entry.id);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
        drag.onStart();
      } : undefined}
      onDragEnd={drag ? () => drag.onEnd() : undefined}>
      {drag?.enabled && <GripVertical className="kitchen-menu-grip h-4 w-4" aria-hidden="true" />}
      {canOpen ? (
        <button type="button" onClick={open} className="kitchen-menu-entry-title" aria-label={`Ouvrir ${entry.recipe_name}`}>
          {entry.recipe_name}
        </button>
      ) : (
        <p className="kitchen-menu-entry-title">{entry.recipe_name}</p>
      )}
      {isLeftover && <p className="kitchen-menu-entry-origin">
        <Soup className="h-3 w-3" aria-hidden="true" />
        {origin ? `Reste du ${slotLabel(origin).toLocaleLowerCase(APP_LOCALE)}` : 'Reste d’un repas d’une autre semaine'}
      </p>}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {totalTime > 0 && !isLeftover && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {totalTime} min
          </span>
        )}
        <span className="kitchen-menu-servings" role="group" aria-label={`Portions de ${entry.recipe_name}`}>
          <Button type="button" variant="ghost" size="icon" className="kitchen-menu-step h-11 w-11" aria-disabled={!canLess}
            aria-label={`Une portion de moins pour ${entry.recipe_name}`} onClick={() => { if (canLess) actions.onServings(entry, entry.servings - 1); }}>
            <Minus className="h-3 w-3" aria-hidden="true" />
          </Button>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Users className="h-3 w-3" aria-hidden="true" />
            <span aria-label={`${entry.servings} portions`}>{entry.servings}</span>
          </span>
          <Button type="button" variant="ghost" size="icon" className="kitchen-menu-step h-11 w-11" aria-disabled={!canMore}
            aria-label={`Une portion de plus pour ${entry.recipe_name}`} onClick={() => { if (canMore) actions.onServings(entry, entry.servings + 1); }}>
            <Plus className="h-3 w-3" aria-hidden="true" />
          </Button>
        </span>
      </div>
      <div className="flex items-center justify-between gap-1">
        {!isLeftover && canOpen && cooked ? (
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
        ) : !isLeftover && canOpen ? (
          <Button type="button" variant="ghost" size="sm" className="min-h-11 px-2 text-xs gap-1"
            disabled={busy || cooking.status === 'cooking'} onClick={() => void cooking.cook()}
            aria-label={`Marquer ${entry.recipe_name} comme cuisinée`}>
            <Check className="h-3 w-3" aria-hidden="true" />
            Cuisinée
          </Button>
        ) : (
          <span aria-hidden="true" />
        )}
        {/* Not modal: a dialog opened from a modal Radix menu can leave the page without clicks once closed. */}
        <DropdownMenu modal={false} open={menuOpen} onOpenChange={open => setMenuOpen(open && !locked)}>
          <DropdownMenuTrigger asChild>
            <Button ref={trigger} type="button" variant="ghost" size="icon" className="kitchen-menu-more h-11 w-11 shrink-0" aria-disabled={locked}
              aria-label={`Autres actions pour ${entry.recipe_name}`}>
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onCloseAutoFocus={openPending}>
            <DropdownMenuItem className="min-h-11 gap-2" onSelect={() => { opening.current = 'move'; }}>
              <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />Déplacer…
            </DropdownMenuItem>
            {canLeftover && <DropdownMenuItem className="min-h-11 gap-2" onSelect={() => { opening.current = 'leftover'; }}>
              <Soup className="h-4 w-4" aria-hidden="true" />Prévoir des restes…
            </DropdownMenuItem>}
            <DropdownMenuItem className="min-h-11 gap-2" onSelect={() => actions.onRemove(entry)}>
              <X className="h-4 w-4" aria-hidden="true" />Retirer du menu
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
