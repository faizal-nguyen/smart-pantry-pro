import { useMemo } from 'react';
import type { User } from '@supabase/supabase-js';
import { useNavCounts } from '@/hooks/useNavCounts';
import MobileNavigation from './MobileNavigation';
import RoutineHeader from './RoutineHeader';
import { useNavigationConfig } from './NavigationHub';

/** Shared culinary shell. CSS owns the single navigation breakpoint. */
export function AppNavigation({ children, user }: { children: React.ReactNode; user: User }) {
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

  return <div data-testid="app-navigation" className="kitchen-shell min-h-screen bg-background text-foreground flex flex-col">
    <a href="#kitchen-content" className="kitchen-skip-link">Aller au contenu</a>
    <RoutineHeader navigationConfig={navigationConfigWithBadges} />
    <MobileNavigation navigationConfig={navigationConfigWithBadges} />
    <main id="kitchen-content" tabIndex={-1} className="kitchen-main flex-1 min-w-0">{children}</main>
  </div>;
}
export default AppNavigation;
