/**
 * `/settings` — page paramètres.
 *
 * PRP-235 PR1 : transforme la page monolithique (403 LoC) en un
 * orchestrateur léger qui auth + monte le `SettingsShell`. Toute la
 * logique sectionnelle vit dans `src/components/settings/*Section.tsx`
 * + `SettingsShell.tsx`. Le shell utilise URL state (`?section=...`)
 * pour permettre les deep-links et la nav latérale via NavigationHub.
 */
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Settings as SettingsIcon } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

import { supabase } from '@/integrations/supabase/client';
import AppNavigation from '@/components/navigation/AppNavigation';
import { PageLoader } from '@/components/layout/PageLoader';
import SettingsShell from '@/components/settings/SettingsShell';

const SettingsPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <PageLoader />;
  }

  // P2 fix (carried from legacy Settings.tsx) : redirect unauthed
  // users to /auth instead of trapping them on a navless screen.
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <AppNavigation user={user}>
      <div className="container mx-auto max-w-5xl p-4 md:p-6 app-content">
        <header className="mb-6 flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
            <SettingsIcon className="h-6 w-6" aria-hidden="true" />
            Paramètres
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Ton compte, ta mémoire assistant, tes préférences et ta confidentialité.
          </p>
        </header>
        <SettingsShell user={user} />
      </div>
    </AppNavigation>
  );
};

export default SettingsPage;
