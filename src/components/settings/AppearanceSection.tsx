/**
 * PRP-235 PR6 — AppearanceSection (theme V1).
 *
 * Inchangé depuis PR1 : theme toggle light/dark via `useTheme`. Le
 * design system global vit dans PRP-237 (tokens), Smart Pantry
 * respecte automatiquement les préférences OS d'accessibilité
 * (`prefers-reduced-motion`, `prefers-contrast`) via les classes CSS.
 *
 * **Out of scope** : afficher les préférences OS détectées
 * (reduced-motion, high-contrast, large-text). `useAccessibility.ts`
 * est cassé sur `main` (fichier malformé avec `\n` littéraux à
 * partir de L68, jamais importé donc jamais détecté). Fix de ce
 * fichier reste hors scope PR6 — sera traité en suivi dédié.
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
          Personnalise l&apos;interface selon ton confort visuel. Smart
          Pantry respecte automatiquement les préférences
          d&apos;accessibilité de ton système.
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
