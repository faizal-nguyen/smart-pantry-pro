/**
 * KitchenDashboard — `/kitchen` (Aujourd'hui en cuisine).
 *
 * PRP-234 PR3 — remplace les 3 nav cards de PR1 par les 4 panels
 * Today branchés sur des données réelles :
 *   - Continuer       (recipe_interactions.viewed + imports inbox)
 *   - À cuisiner      (POST /api/v1/recommendations/suggest, top 3)
 *   - Cette semaine   (useWeeklyMenu projeté à aujourd'hui+)
 *   - Anti-gaspi      (inventory.expiry_date ≤ 7j)
 *
 * Chaque panel a son propre loading/error/empty state — pas de
 * spinner global, pas de page blanche si un bloc tombe.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChefHat, Plus } from 'lucide-react';

import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { Button } from '@/components/ui/button';
import TodayContinuePanel from '@/components/kitchen/TodayContinuePanel';
import TodayRecommendationsPanel from '@/components/kitchen/TodayRecommendationsPanel';
import TodayWeekPanel from '@/components/kitchen/TodayWeekPanel';
import TodayAntiWastePanel from '@/components/kitchen/TodayAntiWastePanel';

const KitchenDashboard: React.FC = () => {
  // PRP-238 PR2 — AuthenticatedLayout garantit l'auth. On appelle le
  // hook pour valider qu'on est bien dans le tree authentifie, meme
  // si `user` n'est pas utilise ici.
  const user = useAuthenticatedUser();
  void user;

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
        {/* Header — PRP-237 PR4: actions directes vers la library
            depuis le dashboard, demandé par l'utilisateur 2026-05-17. */}
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ChefHat className="text-primary h-5 w-5" aria-hidden="true" />
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                Aujourd&apos;hui en cuisine
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Qu&apos;est-ce qu&apos;on cuisine ?
            </p>
          </div>
          {/* Mobile audit P2#7 — boutons sont des cibles tactiles cuisine.
              On les passe à h-11 (44px iOS minimum) au lieu de size="sm" (h-9). */}
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" className="h-11" asChild>
              <Link to="/kitchen/recipes?tab=library" data-testid="primary-action">
                <BookOpen className="h-4 w-4 mr-2" />
                Mes recettes
              </Link>
            </Button>
            <Button variant="default" className="h-11" asChild>
              <Link to="/kitchen/recipes?tab=import" data-testid="primary-action">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Link>
            </Button>
          </div>
        </header>

        {/* 4 Today panels — 1 col mobile, 2 cols desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TodayContinuePanel />
          <TodayRecommendationsPanel />
          <TodayWeekPanel />
          <TodayAntiWastePanel />
        </div>
      </div>
  );
};

export default KitchenDashboard;
