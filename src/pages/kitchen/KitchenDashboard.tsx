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
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ChefHat } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

import { supabase } from '@/integrations/supabase/client';
import AppNavigation from '@/components/navigation/AppNavigation';
import { PageLoader } from '@/components/layout/PageLoader';
import TodayContinuePanel from '@/components/kitchen/TodayContinuePanel';
import TodayRecommendationsPanel from '@/components/kitchen/TodayRecommendationsPanel';
import TodayWeekPanel from '@/components/kitchen/TodayWeekPanel';
import TodayAntiWastePanel from '@/components/kitchen/TodayAntiWastePanel';

const KitchenDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };
    getUser();
  }, []);

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <AppNavigation user={user}>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center gap-3">
            <ChefHat className="text-primary w-6 h-6" />
            <h1 className="font-bold text-foreground text-3xl">
              Aujourd&apos;hui en cuisine
            </h1>
          </div>
          <p className="text-muted-foreground text-base">
            Qu&apos;est-ce qu&apos;on cuisine ?
          </p>
        </div>

        {/* 4 Today panels — 1 col mobile, 2 cols desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TodayContinuePanel />
          <TodayRecommendationsPanel />
          <TodayWeekPanel />
          <TodayAntiWastePanel />
        </div>
      </div>
    </AppNavigation>
  );
};

export default KitchenDashboard;
