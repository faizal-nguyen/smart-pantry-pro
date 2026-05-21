/**
 * `/settings` — page paramètres.
 *
 * PRP-235 PR1 : transforme la page monolithique (403 LoC) en un
 * orchestrateur léger qui monte le `SettingsShell`.
 *
 * PRP-238 PR2 : auth check + AppNavigation gérés par AuthenticatedLayout.
 * Cette page utilise `useAuthenticatedUser()` pour récupérer le user.
 */
import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import SettingsShell from '@/components/settings/SettingsShell';

const SettingsPage: React.FC = () => {
  const user = useAuthenticatedUser();

  return (
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
  );
};

export default SettingsPage;
