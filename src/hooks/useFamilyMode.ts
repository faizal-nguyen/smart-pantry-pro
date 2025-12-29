/**
 * Family Mode Hooks - Version Simplifiée
 * Version temporaire qui évite les erreurs de base de données
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FamilyProfile, 
  ParentalControls, 
  FamilyNavigationConfig, 
  AgeAdaptiveInterface,
  NavigationSection,
  FamilyModeHook
} from '@/types/family-mode';

/**
 * Hook principal pour le mode famille - Version Simplifiée
 */
export const useFamilyMode = (): FamilyModeHook => {
  // Profil par défaut (adulte)
  const defaultProfile: FamilyProfile = {
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
  };

  const [currentProfile] = useState<FamilyProfile | null>(defaultProfile);
  const [availableProfiles] = useState<FamilyProfile[]>([defaultProfile]);
  const [parentalControls] = useState<ParentalControls | null>(null);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  // États dérivés - Mode famille activé
  const isFamilyModeActive = availableProfiles.length > 1 || currentProfile?.type === 'child';
  const isChildProfile = currentProfile?.type === 'child' || false;
  const isSupervisionActive = false;

  // Actions simplifiées
  const switchProfile = useCallback(async (profileId: string) => {
    console.log('Profile switch requested:', profileId);
  }, []);

  const createChildProfile = useCallback(async () => {
    console.log('Child profile creation requested');
    return defaultProfile;
  }, []);

  const updateParentalControls = useCallback(async () => {
    console.log('Parental controls update requested');
  }, []);

  // Vérifications d'accès
  const canAccessSection = useCallback((section: NavigationSection) => {
    if (!currentProfile) return true;
    return currentProfile.restrictions.allowedSections.includes(section);
  }, [currentProfile]);

  const requiresParentalApproval = useCallback(() => false, []);

  const getAdaptiveInterface = useCallback((): AgeAdaptiveInterface => ({
    buttonSpacing: 'normal',
    iconSize: 'medium',
    simplifiedNavigation: false,
    largerText: false,
    highContrast: false,
    reducedMotion: false,
    colorScheme: 'default',
    assistiveFeatures: []
  }), []);

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
    
    // État de chargement
    isLoading,
    error
  };
};

/**
 * Hook pour la navigation famille
 */
export const useFamilyNavigation = () => {
  const { canAccessSection } = useFamilyMode();
  const navigate = useNavigate();
  const location = useLocation();

  const navigateToSection = useCallback((section: NavigationSection, subPath?: string) => {
    if (!canAccessSection(section)) {
      console.warn(`Access denied to section: ${section}`);
      return;
    }
    
    const path = subPath ? `/${section}/${subPath}` : `/${section}`;
    navigate(path);
  }, [canAccessSection, navigate]);

  const requestParentalApproval = useCallback(async () => {
    console.log('Parental approval requested');
    return false;
  }, []);

  const getAccessibleSections = useCallback((): NavigationSection[] => {
    return ['pantry', 'kitchen', 'shopping', 'assistant', 'insights'];
  }, []);

  const getAdaptiveInterface = useCallback((): AgeAdaptiveInterface => ({
    buttonSpacing: 'normal',
    iconSize: 'medium',
    simplifiedNavigation: false,
    largerText: false,
    highContrast: false,
    reducedMotion: false,
    colorScheme: 'default',
    assistiveFeatures: []
  }), []);

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

  const [isParentalMode] = useState(false);

  const toggleParentalMode = useCallback(async () => {
    console.log('Toggle parental mode requested');
  }, []);

  const updateRestriction = useCallback(async () => {
    console.log('Update restriction requested');
  }, []);

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