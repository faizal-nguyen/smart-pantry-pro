/**
 * PRP-235 PR6 — NotificationsSection (full wiring).
 *
 * Avant (PR1) : switches en useState local, note transitoire.
 * Après : raccordé à `useAppStore.notificationSettings` (source de
 * vérité globale, persistée). Bouton « Activer les notifications »
 * qui déclenche `Notification.requestPermission()` via
 * `requestNotificationPermission()`.
 *
 * Limite assumée V1 : un service worker dédié reste à implémenter
 * pour réellement déclencher expiry / shopping reminders. Le toggle
 * persiste la préférence — quand le worker arrivera, il la lira
 * automatiquement. UX honnête : si permission='denied', on indique
 * que les switches sont désactivés au niveau OS.
 */
import React from 'react';
import { Bell, BellOff, ShieldAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/store/appStore';

export default function NotificationsSection() {
  const notificationSettings = useAppStore((s) => s.notificationSettings);
  const updateNotificationSettings = useAppStore((s) => s.updateNotificationSettings);
  const requestNotificationPermission = useAppStore((s) => s.requestNotificationPermission);

  const { enabled, expiryReminders, shoppingReminders, permission } = notificationSettings;

  const browserSupports = typeof window !== 'undefined' && 'Notification' in window;
  const denied = permission === 'denied';
  const notGranted = permission !== 'granted';

  // Si l'OS a refusé, on disable les switches pour éviter la fausse
  // promesse — l'utilisateur doit ré-autoriser depuis les réglages
  // système, on ne peut pas le faire pour lui.
  const switchesDisabled = denied || !enabled;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {enabled && !denied ? (
            <Bell className="h-5 w-5" aria-hidden="true" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          )}
          Notifications
        </CardTitle>
        <CardDescription>
          Reçois des rappels pour ton inventaire et tes courses.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!browserSupports && (
          <div
            role="status"
            className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100"
          >
            <p className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>
                Ton navigateur ne supporte pas les notifications. Cette
                section restera désactivée.
              </span>
            </p>
          </div>
        )}

        {browserSupports && denied && (
          <div
            role="status"
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <p className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>
                Les notifications sont bloquées au niveau du navigateur.
                Réautorise-les depuis les réglages de ton système pour
                pouvoir les activer ici.
              </span>
            </p>
          </div>
        )}

        {browserSupports && notGranted && !denied && (
          <div className="flex flex-col gap-2 rounded-md border bg-surface/40 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Activer les notifications</p>
              <p className="text-xs text-muted-foreground">
                Smart Pantry te demandera l&apos;autorisation du navigateur.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void requestNotificationPermission()}
            >
              Demander l&apos;autorisation
            </Button>
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Label htmlFor="notif-enabled">Notifications actives</Label>
            <p className="text-xs text-muted-foreground">
              Active globalement les rappels de l&apos;app. Les types
              individuels se règlent en-dessous.
            </p>
          </div>
          <Switch
            id="notif-enabled"
            checked={enabled && !denied}
            disabled={denied || !browserSupports}
            onCheckedChange={(v) => updateNotificationSettings({ enabled: v })}
            aria-label="Activer les notifications"
          />
        </div>

        <Separator />

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Label
              htmlFor="notif-expiry"
              className={switchesDisabled ? 'text-muted-foreground' : ''}
            >
              Alertes de péremption
            </Label>
            <p className="text-xs text-muted-foreground">
              Recevoir une alerte quand un produit approche de sa date d&apos;expiration.
            </p>
          </div>
          <Switch
            id="notif-expiry"
            checked={expiryReminders}
            disabled={switchesDisabled}
            onCheckedChange={(v) => updateNotificationSettings({ expiryReminders: v })}
            aria-label="Alertes de péremption"
          />
        </div>

        <Separator />

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Label
              htmlFor="notif-shopping"
              className={switchesDisabled ? 'text-muted-foreground' : ''}
            >
              Rappels de courses
            </Label>
            <p className="text-xs text-muted-foreground">
              Recevoir un rappel quand ta liste de courses contient des articles à acheter.
            </p>
          </div>
          <Switch
            id="notif-shopping"
            checked={shoppingReminders}
            disabled={switchesDisabled}
            onCheckedChange={(v) => updateNotificationSettings({ shoppingReminders: v })}
            aria-label="Rappels de courses"
          />
        </div>
      </CardContent>
    </Card>
  );
}
