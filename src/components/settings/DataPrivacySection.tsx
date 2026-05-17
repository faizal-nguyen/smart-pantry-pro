/**
 * PRP-235 PR1 — DataPrivacySection.
 *
 * Migre l'UX legacy Confidentialité & Données dans une section
 * dédiée. Wiring inchangé : `usePrivacySettings.exportUserData` +
 * `usePrivacySettings.deleteAllData`. Le RPC sous-jacent
 * `delete_user_data` / `export_user_data` a été durci en hotfix
 * (PR #26, migration 20260517071100) : guard `auth.uid()` +
 * `REVOKE EXECUTE FROM PUBLIC`. Pas de risque RGPD résiduel.
 *
 * Drop volontaire : carte « Appareils connectés » (aucun backing
 * data). PR5 refera cette section avec les endpoints
 * `/api/settings/privacy*` (export downloadable + flow demande de
 * suppression sur `data_deletion_requests`).
 */
import React, { useState } from 'react';
import { Database, Download, Shield, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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

export default function DataPrivacySection() {
  const { exportUserData, deleteAllData } = usePrivacySettings();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteAllData();
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" aria-hidden="true" />
          Mes données
        </CardTitle>
        <CardDescription>
          Exporter ou supprimer l&apos;ensemble de tes données (RGPD).
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
          <Download className="h-4 w-4" aria-hidden="true" />
          {isExporting ? 'Export en cours…' : 'Exporter mes données'}
        </Button>

        <Separator />

        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setShowDeleteDialog(true)}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Supprimer toutes mes données
        </Button>

        <p className="flex items-start gap-2 pt-2 text-xs text-muted-foreground">
          <Database className="mt-0.5 h-3 w-3 flex-shrink-0" aria-hidden="true" />
          <span>
            L&apos;export inclut inventaire, recettes, courses, scan history et
            préférences de confidentialité. La suppression est définitive et
            irréversible.
          </span>
        </p>
      </CardContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer toutes mes données</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive et irréversible. Elle effacera ton
              inventaire, tes recettes, ta liste de courses, ton historique de
              scans et tes préférences. Veux-tu vraiment continuer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Suppression…' : 'Supprimer définitivement'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
