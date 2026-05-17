/**
 * PRP-235 PR6 + fix(a11y) — AppearanceSection.
 *
 * 1) Theme toggle light/dark via `useTheme` (V1, livré en PR1)
 * 2) Carte « Préférences système détectées » read-only via
 *    `useAccessibility` — possible maintenant que le hook a été
 *    re-formaté (auparavant cassé avec `\n` littéraux à L68+).
 *
 * Les préférences d'accessibilité (reduced-motion, high-contrast,
 * large-text, forced-colors) sont contrôlées au niveau OS via les
 * media queries `prefers-*`. Smart Pantry les respecte
 * automatiquement (classes CSS posées sur `<html>`). On les expose
 * en read-only pour transparence — un toggle UI serait une
 * fausse promesse (pas d'override possible depuis l'app).
 */
import React from 'react';
import { Accessibility, Moon, Palette, Sun } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/hooks/useTheme';
import { useAccessibility } from '@/hooks/useAccessibility';
import { useToast } from '@/hooks/use-toast';

interface OsPreferenceRowProps {
  label: string;
  detected: boolean;
  description: string;
}

function OsPreferenceRow({ label, detected, description }: OsPreferenceRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Badge variant={detected ? 'default' : 'secondary'} className="flex-shrink-0">
        {detected ? 'Détectée' : 'Non détectée'}
      </Badge>
    </div>
  );
}

export default function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const { settings } = useAccessibility();
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
    <div className="space-y-4">
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Accessibility className="h-4 w-4" aria-hidden="true" />
            Préférences système détectées
          </CardTitle>
          <CardDescription>
            Smart Pantry respecte automatiquement les réglages
            d&apos;accessibilité de ton système. Pour les modifier, va dans les
            réglages de ton OS.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <OsPreferenceRow
            label="Animations réduites"
            detected={settings.reducedMotion}
            description="Réduit les animations et transitions visuelles."
          />
          <Separator />
          <OsPreferenceRow
            label="Contraste élevé"
            detected={settings.highContrast}
            description="Renforce les contrastes pour faciliter la lecture."
          />
          <Separator />
          <OsPreferenceRow
            label="Texte agrandi"
            detected={settings.largeText}
            description="Augmente la taille des éléments d&apos;interface."
          />
          <Separator />
          <OsPreferenceRow
            label="Couleurs forcées (Windows)"
            detected={settings.forcedColors}
            description="Utilise la palette de couleurs définie par le système."
          />
        </CardContent>
      </Card>
    </div>
  );
}
