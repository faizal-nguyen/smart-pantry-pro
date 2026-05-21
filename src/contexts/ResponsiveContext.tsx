/**
 * PRP-238 PR1 etape (b) — ResponsiveProvider unique throttle rAF.
 *
 * Avant : `useViewport`, `useBreakpoints`, `useResponsiveZones`,
 *   `useHybridGrid` et cousins installaient chacun leurs propres
 *   listeners `resize` + `orientationchange` + `visualViewport`. Sur une
 *   page qui en utilise 3, on a 3x les listeners et 3x le re-render
 *   sur chaque resize.
 *
 * Maintenant : un seul Provider monte au plus haut, throttle via
 *   `requestAnimationFrame`, et expose les valeurs aux consommateurs
 *   via Context. Les hooks legacy deviennent des consommateurs.
 *
 * `--mobile-nav-height` est lu depuis la CSS variable (etape (a)) pour
 * rester cohérent avec le layout réel.
 */
import { createContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export interface ResponsiveViewport {
  /** Largeur reportee par `window.innerWidth` (CSS pixels). */
  width: number;
  /** Hauteur reportee par `window.innerHeight`. */
  height: number;
  /**
   * Hauteur effectivement visible, exclut la barre de navigation
   * mobile dynamique sur iOS Safari quand `visualViewport` est dispo.
   */
  availableHeight: number;
}

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

export interface ResponsiveContextValue {
  viewport: ResponsiveViewport;
  breakpoint: Breakpoint;
  /** Raccourci pour `breakpoint === 'mobile'`. */
  isMobile: boolean;
  /**
   * Hauteur de la bottom nav mobile lue depuis la CSS variable
   * `--mobile-nav-height` (en px). Sur sm+ vaut 0 (sidebar prend
   * le relais).
   */
  navHeight: number;
}

const BREAKPOINTS = {
  // Mêmes seuils que `HybridGoldenGrid.generateHybridGrid` utilisé par
  // le hook legacy `useBreakpoints` pour eviter une divergence visuelle.
  mobile: 640,   // < 640 => mobile
  tablet: 768,   // 640-767 => tablet
  desktop: 1024, // 768-1023 => desktop
  // wide >= 1024
} as const;

function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.desktop) return 'wide';
  if (width >= BREAKPOINTS.tablet) return 'desktop';
  if (width >= BREAKPOINTS.mobile) return 'tablet';
  return 'mobile';
}

function readViewport(): ResponsiveViewport {
  if (typeof window === 'undefined') {
    return { width: 1024, height: 768, availableHeight: 768 };
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  const availableHeight = window.visualViewport?.height ?? height;
  return { width, height, availableHeight };
}

function readNavHeight(): number {
  if (typeof window === 'undefined') return 0;
  // Lit la CSS variable --mobile-nav-height (en rem) et convertit en px.
  // Sur sm+ la variable vaut 0 (cf. src/index.css).
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--mobile-nav-height');
  const value = raw.trim();
  if (!value) return 0;
  if (value.endsWith('rem')) {
    const rem = parseFloat(value);
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return rem * rootFontSize;
  }
  if (value.endsWith('px')) return parseFloat(value);
  return parseFloat(value) || 0;
}

export const ResponsiveContext = createContext<ResponsiveContextValue | null>(null);

export function ResponsiveProvider({ children }: { children: ReactNode }) {
  const [viewport, setViewport] = useState<ResponsiveViewport>(readViewport);
  const [navHeight, setNavHeight] = useState<number>(readNavHeight);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => {
      setViewport(readViewport());
      setNavHeight(readNavHeight());
    };

    const onResize = () => {
      // Throttle via rAF : evite la cascade de setState sur chaque event
      // resize qu'iOS Safari spamme pendant le scroll (barre URL).
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        update();
      });
    };

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });
    window.visualViewport?.addEventListener('resize', onResize, { passive: true });

    // Initial sync (au cas où la variable CSS aurait change entre le
    // useState init et le mount, ex: SSR ou hydration).
    update();

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const value = useMemo<ResponsiveContextValue>(() => {
    const breakpoint = getBreakpoint(viewport.width);
    return {
      viewport,
      breakpoint,
      isMobile: breakpoint === 'mobile',
      navHeight,
    };
  }, [viewport, navHeight]);

  return <ResponsiveContext.Provider value={value}>{children}</ResponsiveContext.Provider>;
}
