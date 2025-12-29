/**
 * Family Mode Hooks - Gestion du Mode Famille
 * Hooks pour l'intégration du mode famille dans Smart Pantry Pro
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import FamilyContextService from '@/services/family/FamilyContextService';
import { 
  FamilyProfile, 
  ParentalControls, 
  FamilyNavigationConfig, 
  AgeAdaptiveInterface,
  NavigationSection,
  FamilyModeHook,
  DEFAULT_AGE_GROUPS
} from '@/types/family-mode';

/**
 * Hook principal pour le mode famille
 */
export const useFamilyMode = (): FamilyModeHook => {
  // Version simplifiée sans base de données - crée un profil par défaut
  const [currentProfile, setCurrentProfile] = useState<FamilyProfile | null>(() => ({
    id: 'default-adult',
    name: 'Utilisateur',
    type: 'parent',
    age: 25,
    avatar: null,
    restrictions: {
      allowedSections: ['pantry', 'kitchen', 'shopping', 'assistant', 'insights'] as NavigationSection[],
      blockedFeatures: [],
      timeRestrictions: null,
      allowedActions: ['create', 'edit', 'delete', 'share']
    },
    preferences: {
      theme: 'system',
      language: 'fr',
      notifications: true
    }
  }));
  const [availableProfiles, setAvailableProfiles] = useState<FamilyProfile[]>([]);
  const [parentalControls, setParentalControls] = useState<ParentalControls | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Pas de chargement
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const familyService = FamilyContextService.getInstance();

  // États dérivés
  const isFamilyModeActive = availableProfiles.some(p => p.type === 'child');
  const isChildProfile = currentProfile?.type === 'child';
  const isSupervisionActive = parentalControls?.isEnabled && isChildProfile;

  /**
   * Initialiser le mode famille
   */
  useEffect(() => {
    // Version simplifiée - pas d'initialisation base de données
    const initializeFamilyMode = async () => {
      console.log('Family mode initialized with default profile');
      // Le profil par défaut est déjà créé dans useState
    };

    initializeFamilyMode();
  }, []);

  /**
   * Changer de profil
   */
  const switchProfile = useCallback(async (profileId: string) => {
    // Version simplifiée - pas de changement de profil pour l'instant
    console.log('Profile switch requested:', profileId);
  }, [navigate]);

  /**
   * Créer un profil enfant
   */
  const createChildProfile = useCallback(async (profileData: Omit<FamilyProfile, 'id'>) => {
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Utilisateur non authentifié');

      const newProfile = await familyService.createChildProfile(profileData, session.user.id);
      return newProfile;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du profil');
      console.error('Erreur lors de la création du profil enfant:', err);
      throw err;
    }
  }, []);

  /**
   * Mettre à jour les contrôles parentaux
   */
  const updateParentalControls = useCallback(async (controls: Partial<ParentalControls>) => {
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Utilisateur non authentifié');

      const updatedControls = { ...parentalControls, ...controls } as ParentalControls;
      
      await supabase
        .from('parental_controls')
        .upsert({
          parent_id: session.user.id,
          is_enabled: updatedControls.isEnabled,
          settings: updatedControls.settings,
          updated_at: new Date().toISOString()
        });

      setParentalControls(updatedControls);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour des contrôles');
      console.error('Erreur lors de la mise à jour des contrôles parentaux:', err);
    }
  }, [parentalControls]);

  /**
   * Vérifier l'accès à une section
   */
  const canAccessSection = useCallback((section: NavigationSection) => {
    return familyService.canAccessSection(section, currentProfile);
  }, [currentProfile]);

  /**
   * Vérifier si une action nécessite une approbation parentale
   */
  const requiresParentalApproval = useCallback((action: string) => {
    return familyService.requiresParentalApproval(action, currentProfile);
  }, [currentProfile]);

  /**
   * Obtenir l'interface adaptative pour le profil actuel
   */
  const getAdaptiveInterface = useCallback((): AgeAdaptiveInterface => {
    if (!currentProfile) return DEFAULT_AGE_GROUPS['18+'];
    
    if (currentProfile.type === 'parent') return DEFAULT_AGE_GROUPS['18+'];
    
    const age = currentProfile.age || 18;
    if (age <= 6) return DEFAULT_AGE_GROUPS['3-6'];
    if (age <= 12) return DEFAULT_AGE_GROUPS['7-12'];
    if (age <= 17) return DEFAULT_AGE_GROUPS['13-17'];
    
    return DEFAULT_AGE_GROUPS['18+'];
  }, [currentProfile]);

  return {
    // État de la famille
    currentProfile,
    availableProfiles,
    parentalControls,
    
    // Actions
    switchProfile,
    createChildProfile,
    updateParentalControls,
    
    // Vérifications
    canAccessSection,
    requiresParentalApproval,
    getAdaptiveInterface,
    
    // États
    isFamilyModeActive,
    isChildProfile,
    isSupervisionActive,
    
    // Chargement
    isLoading,
    error
  };
};

/**
 * Hook pour la navigation adaptée au profil famille
 */
export const useFamilyNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    currentProfile, 
    canAccessSection, 
    requiresParentalApproval,
    getAdaptiveInterface 
  } = useFamilyMode();

  const familyService = FamilyContextService.getInstance();

  /**
   * Naviguer vers une section en tenant compte des restrictions famille
   */
  const navigateToSection = useCallback(async (
    section: NavigationSection, 
    path?: string,
    options?: { 
      requestApproval?: boolean;
      logActivity?: boolean;
    }
  ) => {
    try {
      // Vérifier l'accès à la section
      if (!canAccessSection(section)) {
        console.warn(`Accès refusé à la section ${section} pour le profil ${currentProfile?.name}`);
        return false;
      }

      const targetPath = path || `/${section}`;
      
      // Vérifier si une approbation parentale est nécessaire
      if (requiresParentalApproval('navigation') && options?.requestApproval) {
        const approved = await requestParentalApproval('navigation', targetPath);
        if (!approved) return false;
      }

      // Enregistrer l'activité si nécessaire
      if (currentProfile && options?.logActivity) {
        await familyService.logActivity(
          currentProfile.id,
          'navigation',
          `Navigation vers ${section}: ${targetPath}`,
          'info',
          { section, path: targetPath }
        );
      }

      navigate(targetPath);
      return true;
    } catch (error) {
      console.error('Erreur lors de la navigation:', error);
      return false;
    }
  }, [currentProfile, canAccessSection, requiresParentalApproval, navigate]);

  /**
   * Demander une approbation parentale
   */
  const requestParentalApproval = useCallback(async (
    action: string,
    context: string
  ): Promise<boolean> => {
    // Implémentation simplifiée - à étendre selon les besoins
    return new Promise((resolve) => {
      const confirmed = window.confirm(
        `Cette action nécessite l'approbation d'un parent.\nAction: ${action}\nContexte: ${context}\n\nContinuer?`
      );
      resolve(confirmed);
    });
  }, []);

  /**
   * Obtenir les sections accessibles pour le profil actuel
   */
  const getAccessibleSections = useCallback((): NavigationSection[] => {
    if (!currentProfile) return [];
    
    const allSections: NavigationSection[] = ['pantry', 'kitchen', 'shopping', 'assistant', 'insights', 'settings', 'social', 'games'];
    
    return allSections.filter(section => canAccessSection(section));
  }, [currentProfile, canAccessSection]);

  return {
    navigateToSection,
    requestParentalApproval,
    getAccessibleSections,
    getAdaptiveInterface,
    currentPath: location.pathname,
    isAccessRestricted: (section: NavigationSection) => !canAccessSection(section)
  };
};

/**
 * Hook pour les contrôles parentaux
 */
export const useParentalControls = () => {
  const { 
    parentalControls, 
    updateParentalControls, 
    currentProfile,
    isChildProfile 
  } = useFamilyMode();

  const [isParentalMode, setIsParentalMode] = useState(false);

  /**
   * Activer/désactiver le mode parental
   */
  const toggleParentalMode = useCallback(async (password?: string) => {
    // Vérification de mot de passe simplifiée
    if (!isParentalMode && currentProfile?.type === 'parent') {
      setIsParentalMode(true);
      return true;
    }
    
    if (isParentalMode) {
      setIsParentalMode(false);
      return true;
    }
    
    return false;
  }, [isParentalMode, currentProfile]);

  /**
   * Mettre à jour une restriction spécifique
   */
  const updateRestriction = useCallback(async (
    restrictionType: string,
    value: any
  ) => {
    if (!parentalControls || !isParentalMode) return false;

    try {
      const updatedSettings = {
        ...parentalControls.settings,
        [restrictionType]: value
      };

      await updateParentalControls({
        ...parentalControls,
        settings: updatedSettings
      });

      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la restriction:', error);
      return false;
    }
  }, [parentalControls, isParentalMode, updateParentalControls]);

  return {
    parentalControls,
    isParentalMode,
    isChildProfile,
    toggleParentalMode,
    updateRestriction,
    canModifyControls: currentProfile?.type === 'parent' && isParentalMode
  };
};

/**
 * Hook pour l'interface adaptative selon l'âge
 */
export const useAgeAdaptiveUI = () => {
  const { currentProfile, getAdaptiveInterface } = useFamilyMode();
  
  const adaptiveInterface = useMemo(() => {
    return getAdaptiveInterface();
  }, [getAdaptiveInterface]);

  const getStyleClasses = useCallback(() => {
    const classes: string[] = [];
    
    classes.push(`age-group-${adaptiveInterface.ageGroup}`);
    classes.push(`icon-size-${adaptiveInterface.iconSize}`);
    classes.push(`button-spacing-${adaptiveInterface.buttonSpacing}`);
    classes.push(`animation-${adaptiveInterface.animationLevel}`);
    
    if (adaptiveInterface.simplifiedNavigation) {
      classes.push('simplified-navigation');
    }
    
    if (currentProfile?.type === 'child') {
      classes.push('child-mode');
    }
    
    return classes.join(' ');
  }, [adaptiveInterface, currentProfile]);

  const getIconSize = useCallback(() => {
    const sizeMap = {
      'small': '16px',
      'medium': '20px',
      'large': '24px',
      'extra-large': '32px'
    };
    return sizeMap[adaptiveInterface.iconSize];
  }, [adaptiveInterface.iconSize]);

  return {
    adaptiveInterface,
    getStyleClasses,
    getIconSize,
    isChildMode: currentProfile?.type === 'child',
    isSimplifiedUI: adaptiveInterface.simplifiedNavigation
  };
};

export default useFamilyMode;