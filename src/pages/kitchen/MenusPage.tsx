/**
 * PRP-234 PR2 — MenusPage.
 *
 * Page V1 servie sur `/kitchen/meal-planning` (re-export depuis
 * `src/pages/MealPlanningPage.tsx`). Remplace `CipherMealPlanningPage`
 * et toute la layer Cipher/famille/security par un layout simple :
 * header + week nav + grille 7×4 + dialog ajouter + CTA assistant.
 *
 * Source de vérité = `weekly_meal_plans + meal_plan_entries` via
 * `useWeeklyMenu`. L'assistant peut écrire via
 * `add_recipe_to_meal_plan` ; `useAgentDbInvalidation` rafraîchit
 * automatiquement.
 */
import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, MessageSquarePlus, Loader2, ShoppingBasket, X } from 'lucide-react';
import KitchenPageHeader from '@/components/layout/KitchenPageHeader';
import { useCalendarNow } from '@/hooks/useCalendarNow';
import { currentMenuWeek, menuWeekFromParam, menuWeekLabel, shiftMenuWeek } from '@/lib/menuWeek';

import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useWeeklyMenu, type MenuEntryView } from '@/hooks/useWeeklyMenu';
import { useMenuEdit } from '@/hooks/useMenuEdit';
import MenuWeekGrid from '@/components/meal-planning/MenuWeekGrid';
import MoveMealDialog from '@/components/meal-planning/MoveMealDialog';
import LeftoverDialog from '@/components/meal-planning/LeftoverDialog';
import type { MenuCardActions } from '@/components/meal-planning/MenuEntryCard';
import AddRecipeToMenuDialog, {
  type MenuSlot,
} from '@/components/meal-planning/AddRecipeToMenuDialog';
import { useAskAssistant } from '@/hooks/useAskAssistant';
import RecipesMenusSwitch from '@/components/recipes/RecipesMenusSwitch';


export default function MenusPage() {
  // PRP-238 PR2 — AuthenticatedLayout garantit l'auth.
  const user = useAuthenticatedUser();
  const [params, setParams] = useSearchParams();
  const recipeName=(params.get('recipe_name')??'').slice(0,200);
  void user;
  // D8 (V11-01): the week is in the address, so the week's shopping and the way back keep it.
  const now = useCalendarNow();
  const weekStart = menuWeekFromParam(params.get('week'), now);
  const setWeekStart = (week: string) => setParams(previous => {
    const copy = new URLSearchParams(previous);
    copy.set('week', week);
    return copy;
  }, { replace: true });
  const [openDialog, setOpenDialog] = useState(false);
  const edit = useMenuEdit();
  const [moving, setMoving] = useState<MenuEntryView | null>(null);
  const [leftoverOf, setLeftoverOf] = useState<MenuEntryView | null>(null);
  // Focus: a dialog closed without change goes back to the card's menu; once an edit is confirmed, to
  // « Annuler », which says what was done (a removed or moved card leaves its place).
  const undoButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [focusUndo, setFocusUndo] = useState(0);
  const focusUndoOnClose = useRef(false);
  const dialogOpener = useRef<HTMLElement | null>(null);
  useEffect(() => { if (focusUndo) undoButton.current?.focus(); }, [focusUndo]);
  const fromCard = (open: (entry: MenuEntryView) => void) => (entry: MenuEntryView) => {
    dialogOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    edit.clearError();
    open(entry);
  };
  const afterDialog = (event: Event) => {
    event.preventDefault();
    if (focusUndoOnClose.current) setFocusUndo(count => count + 1);
    else if (dialogOpener.current?.isConnected) dialogOpener.current.focus();
    focusUndoOnClose.current = false;
    dialogOpener.current = null;
  };
  const confirmed = async (edited: Promise<boolean>) => {
    const done = await edited;
    focusUndoOnClose.current = done;
    return done;
  };
  const [slot, setSlot] = useState<MenuSlot | null>(null);
  const ask = useAskAssistant();

  const menu = useWeeklyMenu(weekStart);

  const handleAddSlot = (s: MenuSlot) => {
    setSlot(s);
    setOpenDialog(true);
  };

  const handleSelectRecipe = async (recipeId: string) => {
    if (!slot) return;
    try {
      await menu.addEntry.mutateAsync({
        recipe_id: recipeId,
        day_of_week: slot.day_of_week,
        meal_type: slot.meal_type,
      });
      setOpenDialog(false);
    } catch {
      // toast already fired by mutation onError
    }
  };


  const askAssistant = () =>
    ask(`Aide-moi à planifier mes repas de la ${menuWeekLabel(weekStart).toLowerCase()}. Tu peux ajouter des recettes à mon menu directement.`);

  const shiftWeek = (weeks: number) => setWeekStart(shiftMenuWeek(weekStart, weeks));

  const isThisWeek = weekStart === currentMenuWeek(now);
  const entries = menu.data?.entries ?? [];
  // A dialog works on the meal as last read (its version after a refusal), and closes once the meal is no
  // longer in the week shown: another week was opened, or it was removed elsewhere.
  const movingEntry = moving ? entries.find(item => item.id === moving.id) ?? null : null;
  const leftoverEntry = leftoverOf ? entries.find(item => item.id === leftoverOf.id) ?? null : null;
  useEffect(() => { if (moving && !movingEntry) setMoving(null); }, [moving, movingEntry]);
  useEffect(() => { if (leftoverOf && !leftoverEntry) setLeftoverOf(null); }, [leftoverOf, leftoverEntry]);
  // V11-01 E3b: the card's edits, confirmed by update_menu and offered for undo.
  const actions: MenuCardActions = {
    entries, busyId: edit.busyId,
    onServings: (entry, servings) => void edit.setServings(entry, servings),
    onMove: fromCard(setMoving), onLeftover: fromCard(setLeftoverOf),
    onRemove: entry => void edit.remove(entry).then(done => { if (done) setFocusUndo(count => count + 1); }),
  };

  return (
    <div className="culinary-page kitchen-page kitchen-menus-page" data-notice={!!(edit.error || edit.lastChange)}>
        <RecipesMenusSwitch />
{recipeName&&<p className="rounded-lg border p-3 text-sm">Choisis un créneau pour « {recipeName} », puis confirme la recette.</p>}
        <KitchenPageHeader title="Menus" description="Une semaine de repas, à ton rythme." actions={<>
          <Button asChild className="min-h-11 gap-2 self-start md:self-auto">
            <Link to={`/shopping/week?week=${weekStart}`}>
              <ShoppingBasket className="h-4 w-4" aria-hidden="true" />
              Courses de la semaine
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={askAssistant}
            className="min-h-11 gap-2 self-start md:self-auto"
          >
            <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
            Demander à l&apos;assistant
          </Button>
        </>}/>


        {/* Week navigator */}
        <div className="kitchen-week-navigation">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => shiftWeek(-1)}
            aria-label="Semaine précédente"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div className="flex flex-col items-center text-center">
            <p className="text-sm font-medium">{menuWeekLabel(weekStart)}</p>
            {!isThisWeek && (
              <button
                type="button"
                onClick={() => setWeekStart(currentMenuWeek(now))}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Revenir à cette semaine
              </button>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => shiftWeek(1)}
            aria-label="Semaine suivante"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Grid + empty / loading / error states */}
        {menu.isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Chargement du menu…
            </CardContent>
          </Card>
        ) : menu.isError ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-sm text-muted-foreground">
              <p>Impossible de charger le menu pour cette semaine.</p>
              <Button type="button" variant="outline" onClick={() => menu.refetch()}>
                Réessayer
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <MenuWeekGrid
              weekStart={weekStart}
              entries={entries}
              onAddSlot={handleAddSlot}
              actions={actions}
            />
            {entries.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                Aucun repas planifié cette semaine — clique sur un créneau pour
                ajouter une recette.
              </p>
            )}
          </>
        )}

        {movingEntry && <MoveMealDialog key={movingEntry.id} entry={movingEntry} entries={entries} busy={!!edit.busyId} error={edit.error}
          onClose={() => setMoving(null)} onCloseAutoFocus={afterDialog} onConfirm={(target, occupant) => confirmed(edit.move(movingEntry, weekStart, target, occupant))} />}
        {leftoverEntry && <LeftoverDialog key={leftoverEntry.id} entry={leftoverEntry} entries={entries} busy={!!edit.busyId} error={edit.error}
          onClose={() => setLeftoverOf(null)} onCloseAutoFocus={afterDialog} onConfirm={(target, servings) => confirmed(edit.addLeftover(leftoverEntry, weekStart, target, servings))} />}

        {/* Fixed at the bottom: the week is long on a phone, and the edit is often far below the title. */}
        <div className="kitchen-menu-notices">
          {edit.error && <p role="alert" className="kitchen-menu-notice" data-tone="error">{edit.error}</p>}
          {/* Always mounted, so that a confirmed edit written into it is announced. */}
          <div role="status" className={edit.lastChange ? 'kitchen-menu-notice' : 'sr-only'}>
            {edit.lastChange && <>
              <p className="min-w-0 flex-[1_1_12rem]">{edit.lastChange.message}</p>
              {/* Once undone, this button leaves: focus goes to « Fermer » rather than being lost. */}
              {!edit.lastChange.undone && <Button ref={undoButton} variant="outline" className="min-h-11" aria-disabled={!!edit.busyId}
                aria-label={`Annuler : ${edit.lastChange.message}`}
                onClick={() => { if (!edit.busyId) void edit.undoLast().then(() => closeButton.current?.focus()); }}>Annuler</Button>}
            </>}
          </div>
          {(edit.error || edit.lastChange) && <Button ref={closeButton} type="button" variant="ghost" size="icon" className="kitchen-menu-notice-close h-11 w-11"
            aria-label="Fermer le message" onClick={edit.dismiss}><X className="h-4 w-4" aria-hidden="true" /></Button>}
        </div>

        <AddRecipeToMenuDialog
          open={openDialog}
          onOpenChange={setOpenDialog}
          slot={slot}
          initialQuery={recipeName}
          isAdding={menu.addEntry.isPending}
          onSelect={handleSelectRecipe}
        />
      </div>
  );
}
