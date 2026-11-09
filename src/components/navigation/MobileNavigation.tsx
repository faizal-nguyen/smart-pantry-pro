import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NavigationItem } from './NavigationHub';
import { FamilyProfile, NavigationSection } from '@/types/family-mode';
import { isNavigationActive } from '@/lib/routineRoutes';
import { cn } from '@/lib/utils';
interface Props {
  navigationConfig: { mainNavigation:NavigationItem[]; specialNavigation:NavigationItem[]; allNavigation:NavigationItem[] };
  currentProfile:FamilyProfile|null; onNavigate:(section:NavigationSection,path?:string) => void;
}
export default function MobileNavigation({ navigationConfig }: Props) {
  const location = useLocation(), navigate = useNavigate(), ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const measure = () => document.documentElement.style.setProperty('--mobile-nav-total-height',`${ref.current?.getBoundingClientRect().height ?? 0}px`);
    measure(); const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (ref.current) observer?.observe(ref.current);
    window.addEventListener('resize',measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize',measure); document.documentElement.style.removeProperty('--mobile-nav-total-height'); };
  },[]);
  return <nav ref={ref} aria-label="Navigation principale" data-testid="mobile-bottom-nav" className="kitchen-bottom-nav fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur-md">
    <div className="grid grid-cols-5 gap-1 p-1">
      {navigationConfig.mainNavigation.map(item => {
        const active = isNavigationActive(location.pathname,item.path), Icon = item.icon;
        return <button key={item.id} onClick={() => navigate(item.path)} aria-current={active ? 'page' : undefined} className={cn('min-h-[64px] min-w-11 rounded-lg flex flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring',active ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}>
          <Icon className="h-5 w-5" aria-hidden="true" /><span className="break-words">{item.id === 'pantry' ? 'Stock' : item.label}</span>
          {!!item.badge && <span className="sr-only">{item.badge} à traiter</span>}
        </button>;
      })}
    </div>
  </nav>;
}
