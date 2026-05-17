/**
 * PRP-235 PR1 — AppearanceSection.
 *
 * Apparence V1 minimale : toggle theme light/dark via `useTheme`.
 * Déclassé en PR1 : Material You demo (bouton vers une route
 * inexistante) et badge Langue « Bientôt » — alignés avec le
 * principe PRP-235 « no fake feature ».
 *
 * PRP-237 gère le design system global (tokens, palette). Si une
 * preference de densité ou de palette devient stable plus tard, ce
 * fichier l'expose ici en V2 sans toucher au wiring shell.
 */
import React from 'react';
import { Moon, Palette, Sun } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/hooks/use-toast';

export default function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const handleToggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    toast({
      title: 'Thème modifié',
      description: `Mode ${next === 'dark' ? 'sombre' : 'clair'} activé.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" aria-hidden="true" />
          Apparence
        </CardTitle>
        <CardDescription>
          Personnalise l&apos;interface selon ton confort visuel.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {theme === 'light' ? (
              <Sun className="h-5 w-5 text-yellow-500" aria-hidden="true" />
            ) : (
              <Moon className="h-5 w-5 text-blue-500" aria-hidden="true" />
            )}
            <div>
              <Label htmlFor="settings-theme-toggle">Mode sombre</Label>
              <p className="text-sm text-muted-foreground">
                {theme === 'light' ? 'Désactivé' : 'Activé'}
              </p>
            </div>
          </div>
          <Switch
            id="settings-theme-toggle"
            checked={theme === 'dark'}
            onCheckedChange={handleToggle}
            aria-label="Activer le mode sombre"
          />
        </div>
      </CardContent>
    </Card>
  );
}
