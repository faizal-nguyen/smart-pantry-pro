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

import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import SettingsShell from '@/components/settings/SettingsShell';
import KitchenPageHeader from '@/components/layout/KitchenPageHeader';

const SettingsPage: React.FC = () => {
  const user = useAuthenticatedUser();

  return (
    <div className="culinary-page kitchen-page kitchen-settings-page">
      <KitchenPageHeader title="Paramètres" description="Ta cuisine, selon tes envies et tes préférences."/>
      <SettingsShell user={user} />
    </div>
  );
};

export default SettingsPage;
