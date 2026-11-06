import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { useAgeAdaptiveUI, useFamilyMode, useFamilyNavigation } from '@/hooks/useFamilyMode';
import { useNavCounts } from '@/hooks/useNavCounts';
import type { NavigationSection } from '@/types/family-mode';
import { cn } from '@/lib/utils';
import MobileNavigation from './MobileNavigation';
import RoutineHeader from './RoutineHeader';
import { useNavigationConfig } from './NavigationHub';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

/** Shared culinary shell. CSS owns the single navigation breakpoint. */
export function AppNavigation({ children, user }: { children: React.ReactNode; user: User }) {
  const navigate = useNavigate(), location = useLocation();
  const { currentProfile, isFamilyModeActive, isSupervisionActive, canAccessSection, isLoading: familyLoading, error: familyError } = useFamilyMode();
  const { navigateToSection, getAccessibleSections } = useFamilyNavigation();
  const { getStyleClasses, isChildMode } = useAgeAdaptiveUI();
  const [accessRestriction, setAccessRestriction] = useState<{ section: NavigationSection; reason: string } | null>(null);
  const navigationConfig = useNavigationConfig();
  const { expiringSoonCount: toConsumeCount, shoppingOpenCount: shoppingCount } = useNavCounts(user.id);
  const navigationConfigWithBadges = useMemo(() => {
    // Use object spreading to preserve React component references (icons)
    const mainNavigation = navigationConfig.mainNavigation.map(item => {
      if (item.id === 'pantry') {
        const badgeVal = toConsumeCount > 0 ? toConsumeCount : undefined;
        return {
          ...item,
          badge: badgeVal,
          subItems: (item.subItems || []).map(s =>
            s.id === 'pantry-alerts' ? { ...s, badge: badgeVal } : s
          )
        };
      }
      if (item.id === 'shopping') {
        const badgeVal = shoppingCount > 0 ? shoppingCount : undefined;
        return {
          ...item,
          badge: badgeVal,
          subItems: (item.subItems || []).map(s =>
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

  // Effet pour rediriger si l'accès est restreint
  useEffect(() => {
    if (!isFamilyModeActive || !currentProfile || !canAccessSection) {
      setAccessRestriction(null);
      return;
    }

    const currentSection = location.pathname.split('/')[1] as NavigationSection;
    if (currentSection && !canAccessSection(currentSection)) {
      const accessibleSections = getAccessibleSections();
      if (accessibleSections.length > 0) {
        const redirectSection = accessibleSections[0];
        setAccessRestriction({
          section: currentSection,
          reason: `Cette section nécessite l'âge minimum de ${
            (currentProfile.age || 0) < 7 ? '7 ans' : '13 ans'
          }`
        });
        const timer = setTimeout(() => {
          navigate(`/${redirectSection}`);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
    setAccessRestriction(null);
  }, [location.pathname, isFamilyModeActive, currentProfile, canAccessSection, getAccessibleSections, navigate]);


  if (familyLoading) return <div className="min-h-screen flex items-center justify-center bg-background" role="status"><Loader2 className="mr-2 h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />Chargement de ta cuisine…</div>;
  if (familyError) return <div className="min-h-screen flex items-center justify-center bg-background p-4"><div className="max-w-md space-y-4" role="alert"><AlertTriangle aria-hidden="true" /><h1 className="text-xl font-semibold">Erreur Mode Famille</h1><p>{familyError}</p><button className="min-h-11 rounded-md bg-primary px-4 text-primary-foreground" onClick={()=>window.location.reload()}>Réessayer</button></div></div>;
  return <div data-testid="app-navigation" className={cn('kitchen-shell min-h-screen bg-background text-foreground flex flex-col', getStyleClasses(), isFamilyModeActive && 'family-mode-active', isChildMode && 'child-mode-active', isSupervisionActive && 'supervision-active')}>
    <a href="#kitchen-content" className="kitchen-skip-link">Aller au contenu</a>
    <RoutineHeader navigationConfig={navigationConfigWithBadges} />
    <MobileNavigation navigationConfig={navigationConfigWithBadges} currentProfile={currentProfile} onNavigate={navigateToSection} />
    <main id="kitchen-content" tabIndex={-1} className="kitchen-main flex-1 min-w-0">{children}</main>
    <AlertDialog open={!!accessRestriction} onOpenChange={open=>{if(!open)setAccessRestriction(null);}}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Accès restreint</AlertDialogTitle><AlertDialogDescription>{accessRestriction?.reason}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogAction className="min-h-11" onClick={()=>setAccessRestriction(null)}>Compris</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </div>;
}
export default AppNavigation;
