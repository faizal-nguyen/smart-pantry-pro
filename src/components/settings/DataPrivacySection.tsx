/**
 * PRP-235 PR5 — DataPrivacySection (refonte).
 *
 * Surface 4 zones :
 *   1. Consentement (master switch)
 *   2. Toggles fonctionnels (analytics, save history, image, anonyme,
 *      battery saver) — toutes disabled tant que hasConsent = false
 *   3. Data retention (dropdown)
 *   4. Export + Demande de suppression (CTAs)
 *
 * Tout passe par `usePrivacySettings` qui consomme les endpoints
 * `/api/v1/settings/*` (PR5). Plus aucun appel direct RPC depuis
 * le front — l'attaque RPC bypass via DevTools n'est plus
 * exécutable (defense in depth + le hotfix #26 force déjà
 * `auth.uid()`).
 *
 * Suppression : ouvre un AlertDialog double confirmation, puis crée
 * un row `data_deletion_requests` (status `pending`). Aucune
 * suppression inline — un worker backend (futur) finalise.
 */
import React, { useState } from 'react';
import { Download, Loader2, Shield, ShieldCheck, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';
import type { PrivacyDataRetention } from '@/services/privacyApi';

interface ToggleRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ id, label, description, checked, onCheckedChange, disabled }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <Label htmlFor={id} className={disabled ? 'text-muted-foreground' : ''}>
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  );
}

const RETENTION_LABELS: Record<PrivacyDataRetention, string> = {
  minimal: 'Minimale — données effacées sous 7 jours',
  standard: 'Standard — données effacées sous 30 jours',
  full: 'Complète — pas d’effacement automatique',
};

export default function DataPrivacySection() {
  const {
    settings,
    isLoading,
    updateSettings,
    exportUserData,
    requestDataDeletion,
  } = usePrivacySettings();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const consentGiven = settings.hasConsent;

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await exportUserData();
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (isRequesting) return;
    setIsRequesting(true);
    try {
      await requestDataDeletion();
      setShowDeleteDialog(false);
    } catch {
      // Toast déjà émis par le hook.
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Consentement maître */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {consentGiven ? (
              <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            ) : (
              <Shield className="h-5 w-5" aria-hidden="true" />
            )}
            Mes données
          </CardTitle>
          <CardDescription>
            Contrôler comment Smart Pantry utilise tes informations.
            Conforme RGPD — tu peux exporter ou demander la suppression à
            tout moment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ToggleRow
            id="privacy-consent"
            label="J’accepte de partager mes données pour personnaliser l’expérience"
            description="Active les fonctionnalités personnalisées ci-dessous. Tu peux le désactiver à tout moment."
            checked={consentGiven}
            onCheckedChange={(v) => updateSettings({ hasConsent: v })}
            disabled={isLoading}
          />
        </CardContent>
      </Card>

      {/* Fonctionnalités (disabled si pas de consentement) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fonctionnalités</CardTitle>
          <CardDescription>
            {consentGiven
              ? 'Active ou désactive les fonctionnalités qui utilisent tes données.'
              : 'Accepte le partage des données ci-dessus pour activer ces options.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            id="privacy-analytics"
            label="Analytics anonymes"
            description="Permettre l’envoi d’événements anonymisés pour améliorer l’app."
            checked={settings.allowAnalytics}
            onCheckedChange={(v) => updateSettings({ allowAnalytics: v })}
            disabled={!consentGiven || isLoading}
          />
          <Separator />
          <ToggleRow
            id="privacy-history"
            label="Sauvegarder mon historique de scans"
            description="Conserve les scans pour les retrouver et améliorer les suggestions."
            checked={settings.saveHistory}
            onCheckedChange={(v) => updateSettings({ saveHistory: v })}
            disabled={!consentGiven || isLoading}
          />
          <Separator />
          <ToggleRow
            id="privacy-image"
            label="Traitement d’images"
            description="Autorise l’analyse de tes photos (codes-barres, OCR, recettes)."
            checked={settings.allowImageProcessing}
            onCheckedChange={(v) => updateSettings({ allowImageProcessing: v })}
            disabled={!consentGiven || isLoading}
          />
          <Separator />
          <ToggleRow
            id="privacy-share-anon"
            label="Partager des données anonymisées"
            description="Aider à améliorer les recommandations pour tous les utilisateurs."
            checked={settings.shareAnonymizedData}
            onCheckedChange={(v) => updateSettings({ shareAnonymizedData: v })}
            disabled={!consentGiven || isLoading}
          />
          <Separator />
          <ToggleRow
            id="privacy-battery"
            label="Mode économie de batterie"
            description="Réduit les animations et les requêtes en arrière-plan."
            checked={settings.batterySaver}
            onCheckedChange={(v) => updateSettings({ batterySaver: v })}
            disabled={isLoading}
          />
        </CardContent>
      </Card>

      {/* Rétention */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conservation des données</CardTitle>
          <CardDescription>
            Combien de temps Smart Pantry garde tes données (scans, événements).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={settings.dataRetention}
            onValueChange={(v) =>
              updateSettings({ dataRetention: v as PrivacyDataRetention })
            }
            disabled={isLoading}
          >
            <SelectTrigger className="w-full" aria-label="Conservation des données">
              <SelectValue placeholder="Choisir" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(RETENTION_LABELS) as PrivacyDataRetention[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {RETENTION_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Export + suppression */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mes droits RGPD</CardTitle>
          <CardDescription>
            Exporter une copie complète ou demander la suppression.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => void handleExport()}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            {isExporting ? 'Export en cours…' : 'Exporter mes données (JSON)'}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isRequesting}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Demander la suppression de mes données
          </Button>

          <p className="pt-1 text-xs text-muted-foreground">
            La suppression n’est pas immédiate : ta demande est enregistrée et
            traitée sous quelques jours. Tu recevras une confirmation par email
            une fois finalisée.
          </p>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Demander la suppression de mes données</AlertDialogTitle>
            <AlertDialogDescription>
              Cette demande sera enregistrée et traitée par notre équipe. Une
              fois validée, toutes tes données (inventaire, recettes, courses,
              historique, préférences) seront effacées de manière définitive et
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRequesting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              disabled={isRequesting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRequesting ? 'Envoi…' : 'Confirmer la demande'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
