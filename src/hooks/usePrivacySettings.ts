/**
 * PRP-235 PR5 — usePrivacySettings refactor.
 *
 * Avant : appels direct Supabase + RPC `delete_user_data` /
 * `export_user_data` (durcis en hotfix #26 mais toujours exposés au
 * client).
 *
 * Après : tout passe par `/api/v1/settings/*` (PR5). Le backend
 * force `auth.uid()` via RLS + middleware + RPC durci. Aucun
 * destructive call direct n'est possible depuis la console
 * DevTools.
 *
 * Sémantique « suppression » change : c'est maintenant une **demande**
 * tracée dans `data_deletion_requests` (status `pending`). Un worker
 * backend (futur) finalise — l'app n'efface plus les données
 * inline. Trade-off : pas d'effet immédiat côté UI, mais
 * conformité RGPD propre + auditabilité.
 */
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  getPrivacySettings,
  patchPrivacySettings,
  postPrivacyDeleteRequest,
  postPrivacyExport,
  type PrivacySettings,
} from '@/services/privacyApi';

export type { PrivacySettings };

const DEFAULT_SETTINGS: PrivacySettings = {
  hasConsent: false,
  allowAnalytics: false,
  saveHistory: true,
  allowImageProcessing: true,
  shareAnonymizedData: false,
  batterySaver: false,
  dataRetention: 'standard',
};

export function usePrivacySettings() {
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [showConsentDialog, setShowConsentDialog] = useState(false);

  // ----- Load -----
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { settings: loaded } = await getPrivacySettings();
        if (active) setSettings(loaded);
      } catch (err) {
        // 401/non-auth → on garde DEFAULT_SETTINGS, sans toast (peut
        // arriver pendant la phase de session loading).
        if (active && import.meta.env.DEV) {
          console.warn('[usePrivacySettings] load failed:', err);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // ----- Update -----
  const updateSettings = useCallback(
    async (next: Partial<PrivacySettings>) => {
      // Optimistic update — rollback si l'API échoue.
      const previous = settings;
      const optimistic = { ...settings, ...next };
      setSettings(optimistic);
      applyPrivacySettings(optimistic);
      try {
        const { settings: confirmed } = await patchPrivacySettings(next);
        setSettings(confirmed);
        applyPrivacySettings(confirmed);
      } catch (err) {
        setSettings(previous);
        applyPrivacySettings(previous);
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        toast.error(`Sauvegarde impossible : ${message}`);
      }
    },
    [settings],
  );

  // ----- Consent -----
  const requestConsent = useCallback(() => setShowConsentDialog(true), []);

  const isFeatureAllowed = useCallback(
    (feature: keyof PrivacySettings): boolean => {
      if (!settings.hasConsent) return false;
      return !!settings[feature];
    },
    [settings],
  );

  // ----- Export (download) -----
  const exportUserData = useCallback(async () => {
    try {
      const data = await postPrivacyExport();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smart-pantry-data-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Données exportées');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error(`Export impossible : ${message}`);
    }
  }, []);

  // ----- Delete request -----
  // PR5 — plus de destruction inline. On crée une demande tracée
  // dans data_deletion_requests ; un worker backend finalise.
  const requestDataDeletion = useCallback(async () => {
    try {
      const res = await postPrivacyDeleteRequest();
      if (res.alreadyPending) {
        toast.info('Une demande de suppression est déjà en attente.');
      } else {
        toast.success('Demande enregistrée — tu recevras une confirmation par email.');
      }
      return res;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error(`Demande impossible : ${message}`);
      throw err;
    }
  }, []);

  return {
    settings,
    isLoading,
    hasConsent: settings.hasConsent,
    showConsentDialog,
    setShowConsentDialog,
    updateSettings,
    requestConsent,
    isFeatureAllowed,
    exportUserData,
    requestDataDeletion,
  };
}

// ---- Side effects ---------------------------------------------------

function applyPrivacySettings(settings: PrivacySettings) {
  if (typeof window === 'undefined') return;

  // Analytics flag (consommé par les wrappers analytics ailleurs).
  (window as unknown as { analyticsEnabled?: boolean }).analyticsEnabled =
    settings.allowAnalytics;

  // Battery saver visuel — class CSS gérée par PRP-237 tokens.
  if (settings.batterySaver) {
    document.documentElement.classList.add('battery-saver');
  } else {
    document.documentElement.classList.remove('battery-saver');
  }

  // Mode privé pour l'historique de session.
  if (!settings.saveHistory) {
    sessionStorage.setItem('private-mode', 'true');
  } else {
    sessionStorage.removeItem('private-mode');
  }
}
