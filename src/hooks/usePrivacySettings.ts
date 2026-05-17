import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from 'sonner';

export interface PrivacySettings {
  hasConsent: boolean;
  consentDate?: string;
  allowAnalytics: boolean;
  saveHistory: boolean;
  allowImageProcessing: boolean;
  shareAnonymizedData: boolean;
  batterySaver: boolean;
  autoDeleteAfter?: number; // days
  dataRetention?: 'minimal' | 'standard' | 'full';
}

const DEFAULT_SETTINGS: PrivacySettings = {
  hasConsent: false,
  allowAnalytics: false,
  saveHistory: true,
  allowImageProcessing: true,
  shareAnonymizedData: false,
  batterySaver: false,
  dataRetention: 'standard'
};

export function usePrivacySettings() {
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  
  const supabase = useSupabaseClient();
  const user = useUser();

  // Load settings from local storage and database
  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    try {
      // First check local storage for anonymous users
      const localSettings = localStorage.getItem('privacy-settings');
      if (localSettings) {
        setSettings(JSON.parse(localSettings));
      }

      // If user is logged in, fetch from database
      if (user) {
        const { data, error } = await supabase
          .from('user_privacy_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (data && !error) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...data.settings
          });
        }
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update settings
  const updateSettings = useCallback(async (newSettings: Partial<PrivacySettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    // Save to local storage
    localStorage.setItem('privacy-settings', JSON.stringify(updated));

    // Save to database if user is logged in
    if (user) {
      try {
        await supabase
          .from('user_privacy_settings')
          .upsert({
            user_id: user.id,
            settings: updated,
            updated_at: new Date().toISOString()
          });
      } catch (error) {
        console.error('Error saving privacy settings:', error);
        toast.error('Erreur lors de la sauvegarde des paramètres');
      }
    }

    // Apply settings
    applyPrivacySettings(updated);
  }, [settings, user, supabase]);

  // Request consent
  const requestConsent = useCallback(() => {
    setShowConsentDialog(true);
  }, []);

  // Check if specific feature is allowed
  const isFeatureAllowed = useCallback((feature: keyof PrivacySettings): boolean => {
    if (!settings.hasConsent) return false;
    return !!settings[feature];
  }, [settings]);

  // Delete all user data
  const deleteAllData = useCallback(async () => {
    if (!user) {
      // Clear local data
      localStorage.clear();
      sessionStorage.clear();
      toast.success('Données locales supprimées');
      return;
    }

    try {
      // Le RPC SECURITY DEFINER `delete_user_data(p_user_id UUID)` est
      // durci (migration 20260517071100) : il rejette tout call où
      // `auth.uid() != p_user_id`. Le param name côté SQL est
      // `p_user_id` — passer `{ user_id }` envoyait NULL et ne
      // supprimait rien côté legit (bug silencieux pré-hotfix).
      const { error: rpcError } = await supabase.rpc('delete_user_data', { p_user_id: user.id });
      if (rpcError) throw rpcError;

      // Clear local storage
      localStorage.clear();
      sessionStorage.clear();

      // Reset settings
      setSettings(DEFAULT_SETTINGS);

      toast.success('Toutes vos données ont été supprimées');
    } catch (error) {
      console.error('Error deleting user data:', error);
      toast.error('Erreur lors de la suppression des données');
    }
  }, [user, supabase]);

  // Export user data (GDPR compliance)
  const exportUserData = useCallback(async () => {
    if (!user) {
      toast.error('Vous devez être connecté pour exporter vos données');
      return;
    }

    try {
      // Param name SQL = `p_user_id` (cf. migration hotfix
      // 20260517071100). Passer `user_id` envoyait NULL côté Postgres,
      // l'export retournait des objets `null` partout. Avec le param
      // correct + le guard `auth.uid() = p_user_id`, le call retourne
      // uniquement les données du caller authentifié.
      const { data, error } = await supabase.rpc('export_user_data', {
        p_user_id: user.id
      });

      if (error) throw error;

      // Create download
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smart-pantry-data-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Données exportées avec succès');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Erreur lors de l\'export des données');
    }
  }, [user, supabase]);

  // Check data retention and clean old data
  useEffect(() => {
    if (!settings.autoDeleteAfter || !user) return;

    const checkDataRetention = async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - settings.autoDeleteAfter!);

      try {
        // Delete old scan history
        await supabase
          .from('scan_history')
          .delete()
          .eq('user_id', user.id)
          .lt('created_at', cutoffDate.toISOString());

        // Delete old analytics
        if (!settings.allowAnalytics) {
          await supabase
            .from('analytics_events')
            .delete()
            .eq('user_id', user.id);
        }
      } catch (error) {
        console.error('Error cleaning old data:', error);
      }
    };

    // Run cleanup daily
    const interval = setInterval(checkDataRetention, 24 * 60 * 60 * 1000);
    checkDataRetention(); // Run immediately

    return () => clearInterval(interval);
  }, [settings.autoDeleteAfter, settings.allowAnalytics, user, supabase]);

  return {
    settings,
    isLoading,
    hasConsent: settings.hasConsent,
    showConsentDialog,
    updateSettings,
    requestConsent,
    isFeatureAllowed,
    deleteAllData,
    exportUserData,
    setShowConsentDialog
  };
}

// Apply privacy settings to the app
function applyPrivacySettings(settings: PrivacySettings) {
  // Disable analytics if not allowed
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.analyticsEnabled = settings.allowAnalytics;
    
    // Disable error tracking if not allowed
    if (window.Sentry && !settings.allowAnalytics) {
      window.Sentry.close();
    }
  }

  // Apply battery saver mode
  if (settings.batterySaver) {
    document.documentElement.classList.add('battery-saver');
  } else {
    document.documentElement.classList.remove('battery-saver');
  }

  // Clear history if not allowed
  if (!settings.saveHistory) {
    sessionStorage.setItem('private-mode', 'true');
  } else {
    sessionStorage.removeItem('private-mode');
  }
}