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
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MessageSquarePlus, Loader2 } from 'lucide-react';
import { addDays, format, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { User } from '@supabase/supabase-js';

import { supabase } from '@/integrations/supabase/client';
import AppNavigation from '@/components/navigation/AppNavigation';
import { PageLoader } from '@/components/layout/PageLoader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useWeeklyMenu } from '@/hooks/useWeeklyMenu';
import MenuWeekGrid from '@/components/meal-planning/MenuWeekGrid';
import AddRecipeToMenuDialog, {
  type MenuSlot,
} from '@/components/meal-planning/AddRecipeToMenuDialog';
import { getAssistantRequestId, postAssistantText } from '@/services/assistantApi';

function isoWeekStart(date: Date): string {
  // Lundi-first (FR convention)
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return format(monday, 'yyyy-MM-dd');
}

function weekLabel(weekStart: string): string {
  const monday = new Date(`${weekStart}T00:00:00`);
  const sunday = addDays(monday, 6);
  // « Semaine du 19 → 25 mai »
  if (format(monday, 'MM') === format(sunday, 'MM')) {
    return `Semaine du ${format(monday, 'd', { locale: fr })} → ${format(sunday, 'd MMM', { locale: fr })}`;
  }
  return `Semaine du ${format(monday, 'd MMM', { locale: fr })} → ${format(sunday, 'd MMM', { locale: fr })}`;
}

export default function MenusPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [weekStart, setWeekStart] = useState<string>(() => isoWeekStart(new Date()));
  const [openDialog, setOpenDialog] = useState(false);
  const [slot, setSlot] = useState<MenuSlot | null>(null);
  const [assistantLoading, setAssistantLoading] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const menu = useWeeklyMenu(weekStart);

  if (authLoading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;

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

  const handleRemoveEntry = async (entryId: string) => {
    try {
      await menu.removeEntry.mutateAsync(entryId);
    } catch {
      /* toast already fired */
    }
  };

  const askAssistant = async () => {
    if (assistantLoading) return;
    setAssistantLoading(true);
    try {
      const { client_request_id } = await getAssistantRequestId();
      await postAssistantText({
        text: `Aide-moi à planifier mes repas de la ${weekLabel(weekStart).toLowerCase()}. Tu peux ajouter des recettes à mon menu directement.`,
        clientRequestId: client_request_id,
      });
      toast({
        title: 'Demande envoyée à l’assistant',
        description: 'Sa réponse arrive dans la conversation.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast({
        variant: 'destructive',
        title: 'Assistant indisponible',
        description: message,
      });
    } finally {
      setAssistantLoading(false);
    }
  };

  const shiftWeek = (deltaDays: number) => {
    const monday = new Date(`${weekStart}T00:00:00`);
    setWeekStart(format(addDays(monday, deltaDays), 'yyyy-MM-dd'));
  };

  const isThisWeek = weekStart === isoWeekStart(new Date());
  const entries = menu.data?.entries ?? [];
  const removingId = menu.removeEntry.isPending
    ? menu.removeEntry.variables ?? undefined
    : undefined;

  return (
    <AppNavigation user={user}>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Menus</h1>
            <p className="mt-1 text-muted-foreground">
              Organiser les repas de la semaine avec tes recettes et ton inventaire.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={askAssistant}
            disabled={assistantLoading}
            className="gap-2 self-start md:self-auto"
          >
            {assistantLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
            )}
            Demander à l&apos;assistant
          </Button>
        </div>

        {/* Week navigator */}
        <div className="flex items-center justify-between gap-3 rounded-md border bg-surface/40 p-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => shiftWeek(-7)}
            aria-label="Semaine précédente"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div className="flex flex-col items-center text-center">
            <p className="text-sm font-medium">{weekLabel(weekStart)}</p>
            {!isThisWeek && (
              <button
                type="button"
                onClick={() => setWeekStart(isoWeekStart(new Date()))}
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
            onClick={() => shiftWeek(7)}
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
              entries={entries}
              onAddSlot={handleAddSlot}
              onRemoveEntry={handleRemoveEntry}
              removingId={removingId}
            />
            {entries.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                Aucun repas planifié cette semaine — clique sur un créneau pour
                ajouter une recette.
              </p>
            )}
          </>
        )}

        <AddRecipeToMenuDialog
          open={openDialog}
          onOpenChange={setOpenDialog}
          slot={slot}
          isAdding={menu.addEntry.isPending}
          onSelect={handleSelectRecipe}
        />
      </div>
    </AppNavigation>
  );
}
