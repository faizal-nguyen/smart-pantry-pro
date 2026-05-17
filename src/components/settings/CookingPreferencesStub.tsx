/**
 * PRP-235 PR1 — CookingPreferencesStub.
 *
 * Préserve l'accès aux préférences cuisine via le modal
 * `PersonalizationSettings` existant (PRP-220, 285 LoC). PR3
 * refactorera ce modal en section inline pleine page avec une UX
 * plus sobre, mais en attendant l'utilisateur ne perd aucun control.
 */
import React, { useState } from 'react';
import { ChefHat, Settings as SettingsIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PersonalizationSettings } from '@/components/settings/PersonalizationSettings';

export default function CookingPreferencesStub() {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChefHat className="h-5 w-5" aria-hidden="true" />
          Préférences cuisine
        </CardTitle>
        <CardDescription>
          Taille du foyer, niveau de cuisine, objectifs et préférences alimentaires.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Ces préférences alimentent les recommandations de recettes et la
          génération automatique de menus.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
          className="gap-2"
        >
          <SettingsIcon className="h-4 w-4" aria-hidden="true" />
          Modifier mes préférences
        </Button>
      </CardContent>

      {open && (
        <PersonalizationSettings open={open} onClose={() => setOpen(false)} />
      )}
    </Card>
  );
}
