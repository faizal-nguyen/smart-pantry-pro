/**
 * PRP-235 PR5 — DataPrivacySection (refonte).
 *
 * Trois cartes :
 *   1. Mes données : historique des conversations (seul réglage à effet
 *      réel ici, lu en SQL par la mémoire de l'assistant ; il ne couvre pas
 *      `assistant_action_log`), puis mesure d'usage et photos, dites
 *      exactement
 *   2. Data retention (dropdown)
 *   3. Export + Demande de suppression (CTAs), avec sa boîte de confirmation
 *
 * V11-06 E6c : l'interrupteur principal (`hasConsent`) et les réglages
 * `allowAnalytics`, `shareAnonymizedData`, `allowImageProcessing` et
 * `batterySaver` ne sont plus affichés : rien ne les lisait. Leurs valeurs
 * restent enregistrées, l'API les accepte toujours.
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
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Loader2, Shield, Trash2 } from 'lucide-react';

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
import { useDeletionRequest } from '@/hooks/useDeletionRequest';
import type { DeletionRequestView, PrivacyDataRetention } from '@/services/privacyApi';
import { formatDate } from '@smart/shared';

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
  minimal: 'Minimale — 7 jours',
  standard: 'Standard — 30 jours',
  full: 'Complète — pas d’effacement automatique',
};

/** What the latest deletion request means for the user; never « terminée » while photos remain. */
function deletionStatusText(request: DeletionRequestView): string {
  if (request.status === 'completed') {
    return request.completedAt
      ? `Suppression terminée le ${formatDate(request.completedAt, 'dayMonthYear')}.`
      : 'Suppression terminée.';
  }
  if (request.status === 'failed') return 'La suppression n’a pas pu aboutir. Tu peux refaire une demande.';
  if (request.filesPending) {
    return 'Tes données sont effacées, mais certaines photos n’ont pas pu l’être. La demande reste ouverte tant qu’elles ne le sont pas.';
  }
  return 'Demande enregistrée, traitée dans l’heure.';
}

export default function DataPrivacySection() {
  const {
    owner,
    settings,
    isLoading, error, isUpdating,
    updateSettings,
    exportUserData,
    requestDataDeletion,
  } = usePrivacySettings();
  const deletion = useDeletionRequest(owner);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

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
      // Recorded even when the photos failed: show the request as it stands.
      await deletion.refresh();
    }
  };

  return (
    <div className="space-y-4">
      {/* Mes données */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" aria-hidden="true" />
            Mes données
          </CardTitle>
          <CardDescription>
            Contrôler comment Kitchen OS utilise tes informations.
            Conforme RGPD — tu peux exporter ou demander la suppression à
            tout moment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && <p role="status" className="text-sm text-muted-foreground">Chargement de tes choix de confidentialité…</p>}
          <ToggleRow
            id="privacy-history"
            label="Sauvegarder mes conversations avec l’assistant"
            description="Conserve tes échanges avec l’assistant, pour la durée choisie ci-dessous. Ce choix est indépendant de la mémoire ; les actions faites par l’assistant restent consignées."
            checked={settings.saveHistory}
            onCheckedChange={(v) => updateSettings({ saveHistory: v })}
            disabled={!!error || isUpdating || isLoading}
          />
          <Separator />
          <section aria-labelledby="privacy-records-title" className="space-y-2">
            <h4 id="privacy-records-title" className="text-sm font-medium">Mesure d’usage et photos</h4>
            <p className="text-sm text-muted-foreground">
              Aucune mesure d’usage dédiée n’est active. Pour ses suggestions, l’application enregistre les recettes proposées, ouvertes, ajoutées à « À cuisiner bientôt » ou retirées, et préparées, ainsi que tes retours sur une recette.
            </p>
            <p className="text-sm text-muted-foreground">
              Une photo n’est analysée que lorsque tu l’envoies ; les codes-barres sont lus sur ton appareil.
            </p>
          </section>
        </CardContent>
      </Card>

      {/* Rétention */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conservation des données</CardTitle>
          <CardDescription>
            Durée des nouveaux souvenirs et échanges de l’assistant. Les données expirées sont exclues,
            puis nettoyées à la prochaine utilisation. Le profil confirmé, le stock et les recettes ont leurs propres règles de conservation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={settings.dataRetention}
            onValueChange={(v) =>
              updateSettings({ dataRetention: v as PrivacyDataRetention })
            }
            disabled={!!error || isUpdating || isLoading}
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
            className="min-h-11 w-full justify-start gap-2"
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
            className="min-h-11 w-full justify-start gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isRequesting}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Demander la suppression de mes données
          </Button>

          {deletion.request ? (
            <div className="space-y-2 rounded-md border border-border p-3" role="status">
              <p className="text-sm">{deletionStatusText(deletion.request)}</p>
              {deletion.request.filesPending ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11"
                  onClick={() => void handleDelete()}
                  disabled={isRequesting}
                >
                  {isRequesting ? 'Effacement…' : 'Réessayer d’effacer mes photos'}
                </Button>
              ) : null}
            </div>
          ) : null}

          <p className="pt-1 text-xs text-muted-foreground">
            La suppression n’est pas immédiate : ta demande est enregistrée puis
            traitée automatiquement dans l’heure. Ton compte de connexion reste
            ouvert.
          </p>
          <Link to="/confidentialite" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">
            Lire la politique de confidentialité
          </Link>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Demander la suppression de mes données</AlertDialogTitle>
            <AlertDialogDescription>
              Cette demande sera traitée automatiquement dans l’heure : toutes
              tes données (inventaire, recettes et photos, courses, historique,
              préférences, mémoire de l’assistant) seront alors effacées de
              manière définitive et irréversible. Ton compte de connexion reste
              ouvert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11" disabled={isRequesting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              disabled={isRequesting}
              className="min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRequesting ? 'Envoi…' : 'Confirmer la demande'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
