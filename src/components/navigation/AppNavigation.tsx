/**
 * AppNavigation - Composant Principal de Navigation.
 *
 * Wraps les shells responsive (MobileNavigation / TabletNavigation /
 * DesktopNavigation) et oriente le rendu suivant le breakpoint. La
 * structure hiérarchique vient de NavigationHub (PRP-237 PR2 :
 * Assistant first, champs legacy PRP-040 supprimés).
 * Fixed: React hooks ordering violation (2025-10-04)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, Shield, Users, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Hooks et services
import { useFamilyMode, useFamilyNavigation, useAgeAdaptiveUI } from '@/hooks/useFamilyMode';
import { useBreakpoints, useResponsiveZones } from '@/hooks/useResponsiveZones';
import { useHybridGrid, usePlatformAdaptiveTouch } from '@/hooks/useHybridGrid';
import { usePersonalization } from '@/hooks/usePersonalization';

// Composants de navigation spécialisés
import MobileNavigation from './MobileNavigation';
import TabletNavigation from './TabletNavigation';
import DesktopNavigation from './DesktopNavigation';

// Configuration de navigation
import { useNavigationConfig } from './NavigationHub';
import { useInventory } from '@/hooks/useInventory';
import { useShoppingList } from '@/hooks/useShoppingList';

// Types
import { User } from '@supabase/supabase-js';
import { FamilyProfile, NavigationSection } from '@/types/family-mode';

// Styles
import '@/styles/enhanced-layout.css';

interface AppNavigationProps {
  children: React.ReactNode;
  user: User;
}

interface FamilyModeIndicatorProps {
  currentProfile: FamilyProfile;
  isSupervisionActive: boolean;
  onProfileSwitch: () => void;
}

/**
 * Indicateur du Mode Famille
 */
const FamilyModeIndicator: React.FC<FamilyModeIndicatorProps> = ({
  currentProfile,
  isSupervisionActive,
  onProfileSwitch
}) => {
  const { adaptiveInterface, isChildMode } = useAgeAdaptiveUI();

  if (!isChildMode) return null;

  return (
    <div className={cn(
      "fixed top-2 right-2 z-50 bg-primary/10 backdrop-blur-sm rounded-lg px-3 py-2",
      "flex items-center gap-2 text-sm border border-primary/20",
      adaptiveInterface.simplifiedNavigation && "px-4 py-3 text-base"
    )}>
      <div className={cn(
        "w-2 h-2 rounded-full",
        isSupervisionActive ? "bg-amber-500 animate-pulse" : "bg-green-500"
      )} />
      
      <span className="font-medium text-primary">
        {currentProfile.name}
      </span>
      
      {isSupervisionActive && (
        <Shield className="w-4 h-4 text-amber-600" />
      )}
      
      <button
        onClick={onProfileSwitch}
        className="ml-2 p-1 hover:bg-primary/10 rounded transition-colors"
        aria-label="Changer de profil"
      >
        <Users className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * Alerte de Restriction d'Accès
 */
interface AccessRestrictionAlertProps {
  section: NavigationSection;
  reason: string;
  onDismiss: () => void;
}

const AccessRestrictionAlert: React.FC<AccessRestrictionAlertProps> = ({
  section,
  reason,
  onDismiss
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg p-6 max-w-sm w-full border shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          <h3 className="font-semibold text-lg">Accès Restreint</h3>
        </div>
        
        <p className="text-muted-foreground mb-6">
          Cette section ({section}) n'est pas accessible pour votre profil.
        </p>
        
        <p className="text-sm text-muted-foreground mb-4">
          Raison: {reason}
        </p>
        
        <button
          onClick={onDismiss}
          className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Compris
        </button>
      </div>
    </div>
  );
};

/**
 * Sélecteur de Profil Famille
 */
interface FamilyProfileSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: FamilyProfile;
  availableProfiles: FamilyProfile[];
  onSwitchProfile: (profileId: string) => void;
  isLoading: boolean;
}

const FamilyProfileSelector: React.FC<FamilyProfileSelectorProps> = ({
  isOpen,
  onClose,
  currentProfile,
  availableProfiles,
  onSwitchProfile,
  isLoading
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg p-6 max-w-md w-full border shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Choisir un Profil
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-3">
          {availableProfiles.map(profile => (
            <button
              key={profile.id}
              onClick={() => onSwitchProfile(profile.id)}
              disabled={isLoading || profile.id === currentProfile.id}
              className={cn(
                "w-full p-4 rounded-lg border text-left transition-all",
                "hover:bg-primary/5 hover:border-primary/30",
                profile.id === currentProfile.id && "border-primary bg-primary/10",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  profile.type === 'parent' ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
                )}>
                  {profile.avatar ? (
                    <img 
                      src={profile.avatar} 
                      alt={profile.name} 
                      className="w-10 h-10 rounded-full object-cover" 
                    />
                  ) : (
                    <span className="font-semibold">
                      {profile.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                
                <div>
                  <p className="font-medium">{profile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {profile.type === 'parent' ? 'Parent' : `Enfant (${profile.age} ans)`}
                  </p>
                </div>
                
                {profile.id === currentProfile.id && (
                  <div className="ml-auto w-2 h-2 bg-primary rounded-full" />
                )}
              </div>
            </button>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Les profils enfants ont des restrictions adaptées à leur âge
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Composant Principal AppNavigation
 */
export const AppNavigation: React.FC<AppNavigationProps> = ({ children, user }) => {
  // État local
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [accessRestriction, setAccessRestriction] = useState<{
    section: NavigationSection;
    reason: string;
  } | null>(null);

  // Hooks
  const navigate = useNavigate();
  const location = useLocation();
  const { hasCompletedOnboarding, isLoading: personalizationLoading } = usePersonalization();
  
  // Hooks famille
  const {
    currentProfile,
    availableProfiles,
    isFamilyModeActive,
    isChildProfile,
    isSupervisionActive,
    switchProfile,
    canAccessSection,
    isLoading: familyLoading,
    error: familyError
  } = useFamilyMode();

  const { navigateToSection, getAccessibleSections } = useFamilyNavigation();
  const { adaptiveInterface, getStyleClasses, isChildMode } = useAgeAdaptiveUI();

  // Hooks responsive
  // Bug fix: previously destructured only `isMobile/isTablet/isDesktop`,
  // but useBreakpoints also exposes `isWide` (>= lg). Pages rendered
  // at lg+ matched none of the three navs → no menu visible at all.
  // Treat `isWide` as desktop-flavoured for the sidebar render.
  const { isMobile, isTablet, isDesktop, isWide } = useBreakpoints();
  const isDesktopOrWide = isDesktop || isWide;
  const { zones } = useResponsiveZones();
  const touchZones = usePlatformAdaptiveTouch();
  
  // PRP-230 Commit 3 : useNavigationConfig ne prend plus de familyConfig —
  // la nav ne se ramifie plus par profil/âge. Voir NavigationHub.tsx pour
  // le rationale et le hors-scope vers PRP-234.
  const navigationConfig = useNavigationConfig();

  // Badges de navigation (à consommer / items courses)
  const { inventory } = useInventory();
  const { shoppingList } = useShoppingList();

  const toConsumeCount = useMemo(() => {
    try {
      const now = Date.now();
      return (inventory || []).filter(it => {
        if (!it.expiry_date) return false;
        const d = new Date(it.expiry_date).getTime();
        const days = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
        return days <= 3; // J-3/J-1/expirés
      }).length;
    } catch { return 0; }
  }, [inventory]);

  const shoppingCount = useMemo(() => {
    try {
      return (shoppingList || []).filter(it => !it.is_purchased).length;
    } catch { return 0; }
  }, [shoppingList]);

  const navigationConfigWithBadges = useMemo(() => {
    // Use object spreading to preserve React component references (icons)
    const mainNavigation = navigationConfig.mainNavigation.map((item: any) => {
      if (item.id === 'pantry') {
        const badgeVal = toConsumeCount > 0 ? toConsumeCount : undefined;
        return {
          ...item,
          badge: badgeVal,
          subItems: (item.subItems || []).map((s: any) =>
            s.id === 'pantry-alerts' ? { ...s, badge: badgeVal } : s
          )
        };
      }
      if (item.id === 'shopping') {
        const badgeVal = shoppingCount > 0 ? shoppingCount : undefined;
        return {
          ...item,
          badge: badgeVal,
          subItems: (item.subItems || []).map((s: any) =>
            s.id === 'shopping-list' ? { ...s, badge: badgeVal } : s
          )
        };
      }
      return item;
    });

    return {
      mainNavigation,
      specialNavigation: navigationConfig.specialNavigation || [],
      allNavigation: [...mainNavigation, ...(navigationConfig.specialNavigation || [])]
    };
  }, [navigationConfig, toConsumeCount, shoppingCount]);

  // Enhanced layout hooks
  const { grid, isReady: gridReady } = useHybridGrid({
    mode: location.pathname.includes('/shopping') ? 'shopping' : 
          location.pathname.includes('/kitchen') ? 'cooking' : 'browsing',
    density: adaptiveInterface.buttonSpacing === 'spacious' ? 'low' : 'medium',
    performanceMode: 'balanced',
  });

  // Effet pour rediriger si l'accès est restreint
  useEffect(() => {
    if (!currentProfile || !canAccessSection) return;

    const currentSection = location.pathname.split('/')[1] as NavigationSection;
    if (currentSection && !canAccessSection(currentSection)) {
      const accessibleSections = getAccessibleSections();
      if (accessibleSections.length > 0) {
        const redirectSection = accessibleSections[0];
        setAccessRestriction({
          section: currentSection,
          reason: `Cette section nécessite l'âge minimum de ${
            currentProfile.age || 0 < 7 ? '7 ans' : '13 ans'
          }`
        });
        setTimeout(() => {
          navigate(`/${redirectSection}`);
        }, 3000);
      }
    }
  }, [location.pathname, currentProfile, canAccessSection, getAccessibleSections, navigate]);

  // Gestion du changement de profil
  const handleProfileSwitch = async (profileId: string) => {
    try {
      await switchProfile(profileId);
      setShowProfileSelector(false);
    } catch (error) {
      console.error('Erreur lors du changement de profil:', error);
    }
  };

  // Redirection onboarding (via useEffect pour éviter setState pendant render)
  // IMPORTANT: Doit être AVANT les early returns pour respecter Rules of Hooks
  // Audit P1: gate skippable. Si l'utilisateur a explicitement choisi
  // "Plus tard" (localStorage.skipOnboarding === '1'), on n'impose plus
  // la redirection — il peut reprendre depuis Settings quand il veut.
  React.useEffect(() => {
    const userSkipped =
      typeof window !== 'undefined' &&
      window.localStorage.getItem('skipOnboarding') === '1';
    if (
      currentProfile &&
      !personalizationLoading &&
      !hasCompletedOnboarding() &&
      !userSkipped &&
      location.pathname !== '/onboarding' &&
      location.pathname !== '/auth'
    ) {
      navigate('/onboarding', { replace: true });
    }
  }, [currentProfile, personalizationLoading, hasCompletedOnboarding, location.pathname, navigate]);

  // Chargement
  if (familyLoading || personalizationLoading || !gridReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            {isFamilyModeActive ? 'Chargement du mode famille...' : 'Chargement...'}
          </p>
        </div>
      </div>
    );
  }

  // Erreur famille
  if (familyError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Erreur Mode Famille</h2>
          <p className="text-muted-foreground mb-6">{familyError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen bg-background flex flex-col",
      getStyleClasses(),
      isFamilyModeActive && "family-mode-active",
      isChildMode && "child-mode-active",
      isSupervisionActive && "supervision-active"
    )}>
      {/* PRP-237 PR2 — FamilyModeIndicator + FamilyProfileSelector
          retirés du shell. Family mode est inactif en V1 (PRP-222 PR3b)
          ; les composants restent définis dans ce fichier pour permettre
          un re-mount éventuel mais leur suppression complète est cadrée
          par PRP-234 quand useFamilyMode aura été refactoré. */}

      {/* Navigation Responsive */}
      {isMobile && (
        <MobileNavigation
          navigationConfig={navigationConfigWithBadges}
          currentProfile={currentProfile}
          onNavigate={navigateToSection}
        />
      )}
      
      {isTablet && (
        <TabletNavigation
          navigationConfig={navigationConfigWithBadges}
          currentProfile={currentProfile}
          onNavigate={navigateToSection}
        />
      )}
      
      {isDesktopOrWide && (
        <DesktopNavigation
          navigationConfig={navigationConfigWithBadges}
          currentProfile={currentProfile}
          onNavigate={navigateToSection}
        />
      )}

      {/* Contenu Principal */}
      <main className={cn(
        "flex-1",
        // Bottom nav: ~64px content + dynamic safe-area-inset-bottom.
        // Use calc to auto-track home indicator height per device.
        isMobile && "pb-[calc(64px+env(safe-area-inset-bottom))] pt-0",
        isTablet && "ml-16 pb-16",
        isDesktopOrWide && "ml-64 pb-0",
        isChildMode && adaptiveInterface.buttonSpacing === 'spacious' && "p-6",
        !isChildMode && "min-h-screen"
      )}>
        <div className={cn(
          "w-full h-full",
          adaptiveInterface.simplifiedNavigation && "max-w-4xl mx-auto"
        )}>
          {children}
        </div>
      </main>

      {/* PRP-237 PR2 — FamilyProfileSelector unmounted (see header note). */}

      {/* Alerte de Restriction d'Accès */}
      {accessRestriction && (
        <AccessRestrictionAlert
          section={accessRestriction.section}
          reason={accessRestriction.reason}
          onDismiss={() => setAccessRestriction(null)}
        />
      )}
    </div>
  );
};

export default AppNavigation;
