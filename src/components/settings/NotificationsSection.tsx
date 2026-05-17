/**
 * PRP-235 PR1 — NotificationsSection.
 *
 * Migre les switches notification existants de `Settings.tsx`
 * legacy. État local pour l'instant — **PR6 raccorde proprement à
 * `useAppStore.notificationSettings`** et au service worker quand
 * il sera disponible. Une note discrète prévient l'utilisateur que
 * le wiring n'est pas encore actif.
 *
 * Préserve volontairement l'UX existante pour ne pas casser
 * l'habitude visuelle pendant un sprint.
 */
import React, { useState } from 'react';
import { Bell } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

export default function NotificationsSection() {
  // État local transitoire — sera remplacé par useAppStore en PR6.
  const [expiryAlerts, setExpiryAlerts] = useState(true);
  const [shoppingReminders, setShoppingReminders] = useState(true);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" aria-hidden="true" />
          Notifications
        </CardTitle>
        <CardDescription>
          Préférences locales — le système de notifications complet arrive bientôt.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Label htmlFor="notif-expiry">Alertes de péremption</Label>
            <p className="text-sm text-muted-foreground">
              Recevoir une alerte quand un produit approche de sa date d&apos;expiration.
            </p>
          </div>
          <Switch
            id="notif-expiry"
            checked={expiryAlerts}
            onCheckedChange={setExpiryAlerts}
            aria-label="Activer les alertes de péremption"
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Label htmlFor="notif-shopping">Rappels de courses</Label>
            <p className="text-sm text-muted-foreground">
              Recevoir un rappel quand ta liste de courses contient des articles à acheter.
            </p>
          </div>
          <Switch
            id="notif-shopping"
            checked={shoppingReminders}
            onCheckedChange={setShoppingReminders}
            aria-label="Activer les rappels de courses"
          />
        </div>
      </CardContent>
    </Card>
  );
}
