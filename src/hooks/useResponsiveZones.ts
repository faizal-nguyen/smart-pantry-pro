/**
 * Enhanced Responsive Zones Hook
 * Implements responsive zone architecture with golden ratio proportions
 * Based on PRP-022-Layout-Optimization specification
 */

import { useState, useEffect, useMemo } from 'react';
import { HybridGoldenGrid } from '@/design-system/HybridGoldenGrid';
import { useResponsive } from '@/hooks/useResponsive';

interface Viewport {
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  availableHeight: number; // Excludes browser UI
}

interface BreakpointState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWide: boolean;
  current: 'mobile' | 'tablet' | 'desktop' | 'wide';
  fibonacciBreakpoint?: 'mobile' | 'tablet' | 'desktop' | 'wide';
}

interface ResponsiveZone {
  height?: string | number;
  width?: string | number;
  span: number;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  className?: string;
}

interface ResponsiveZones {
  hero: ResponsiveZone;
  primary: ResponsiveZone;
  secondary: ResponsiveZone;
  sidebar?: ResponsiveZone;
  navigation: ResponsiveZone;
  contextual?: ResponsiveZone;
}

/**
 * PRP-238 PR1 etape (b) — adaptateur. Le viewport vient maintenant du
 * `ResponsiveContext` partage (listener unique throttle rAF). On garde la
 * signature publique de Viewport pour ne casser aucun appelant existant.
 */
export const useViewport = (): Viewport => {
  const { viewport } = useResponsive();
  return useMemo(
    () => ({
      width: viewport.width,
      height: viewport.height,
      innerWidth: viewport.width,
      innerHeight: viewport.height,
      availableHeight: viewport.availableHeight,
    }),
    [viewport.width, viewport.height, viewport.availableHeight],
  );
};

export const useBreakpoints = (): BreakpointState => {
  const viewport = useViewport();
  
  return useMemo(() => {
    const width = viewport.width;
    const grid = HybridGoldenGrid.generateHybridGrid(viewport.width, viewport.height);
    
    // Standard breakpoint detection
    const isMobile = width < grid.breakpoints.sm;
    const isTablet = width >= grid.breakpoints.sm && width < grid.breakpoints.md;
    const isDesktop = width >= grid.breakpoints.md && width < grid.breakpoints.lg;
    const isWide = width >= grid.breakpoints.lg;
    
    // Determine current breakpoint
    let current: 'mobile' | 'tablet' | 'desktop' | 'wide' = 'mobile';
    if (isWide) current = 'wide';
    else if (isDesktop) current = 'desktop';
    else if (isTablet) current = 'tablet';
    
    // Fibonacci breakpoint detection for fine-tuning
    let fibonacciBreakpoint: 'mobile' | 'tablet' | 'desktop' | 'wide' | undefined;
    if (width >= grid.breakpoints.fibonacci.wide) fibonacciBreakpoint = 'wide';
    else if (width >= grid.breakpoints.fibonacci.desktop) fibonacciBreakpoint = 'desktop';
    else if (width >= grid.breakpoints.fibonacci.tablet) fibonacciBreakpoint = 'tablet';
    else if (width >= grid.breakpoints.fibonacci.mobile) fibonacciBreakpoint = 'mobile';
    
    return {
      isMobile,
      isTablet,
      isDesktop,
      isWide,
      current,
      fibonacciBreakpoint,
    };
  }, [viewport]);
};

export const useResponsiveZones = (): {
  zones: ResponsiveZones;
  applyZone: (zone: keyof ResponsiveZones) => ResponsiveZone;
  grid: ReturnType<typeof HybridGoldenGrid.generateHybridGrid>;
} => {
  const viewport = useViewport();
  const { isTablet, isMobile, isDesktop, isWide } = useBreakpoints();
  
  const grid = useMemo(() => 
    HybridGoldenGrid.generateHybridGrid(viewport.width, viewport.height), 
    [viewport.width, viewport.height]
  );
  
  const zones = useMemo((): ResponsiveZones => {
    const goldenRatio = 1.618;
    
    if (isMobile) {
      return {
        hero: { 
          height: '61.8vh', 
          span: 12,
          className: 'mobile-hero-zone'
        },
        primary: { 
          height: 'auto', 
          span: 12,
          className: 'mobile-primary-zone'
        },
        secondary: { 
          height: 'auto', 
          span: 12,
          className: 'mobile-secondary-zone'
        },
        navigation: { 
          position: 'bottom', 
          height: grid.touchTargets.minimum,
          span: 12,
          className: 'mobile-navigation-zone'
        },
      };
    }
    
    if (isTablet) {
      const heroColumns = Math.round(12 / goldenRatio); // ~7 columns
      const sidebarColumns = 12 - heroColumns; // ~5 columns
      
      return {
        hero: { 
          height: '50vh', 
          span: heroColumns,
          className: 'tablet-hero-zone'
        },
        sidebar: { 
          height: '50vh', 
          span: sidebarColumns,
          className: 'tablet-sidebar-zone'
        },
        primary: { 
          height: 'auto', 
          span: 12,
          className: 'tablet-primary-zone'
        },
        secondary: { 
          height: 'auto', 
          span: 12,
          className: 'tablet-secondary-zone'
        },
        navigation: { 
          position: 'bottom', 
          height: grid.touchTargets.comfortable,
          span: 12,
          className: 'tablet-navigation-zone'
        },
      };
    }
    
    if (isDesktop || isWide) {
      // Three column golden ratio layout for desktop
      const sidebarWidth = `${100 / goldenRatio / goldenRatio}%`; // ~38.2%
      const heroWidth = `${100 / goldenRatio}%`; // ~61.8%
      
      return {
        sidebar: { 
          width: sidebarWidth, 
          span: 3,
          className: 'desktop-sidebar-zone'
        },
        hero: { 
          width: heroWidth, 
          span: 7,
          className: 'desktop-hero-zone'
        },
        contextual: { 
          width: 'auto', 
          span: 2,
          className: 'desktop-contextual-zone'
        },
        primary: { 
          height: 'auto', 
          span: 9,
          className: 'desktop-primary-zone'
        },
        secondary: { 
          height: 'auto', 
          span: 3,
          className: 'desktop-secondary-zone'
        },
        navigation: { 
          position: 'left', 
          width: grid.touchTargets.generous,
          span: 1,
          className: 'desktop-navigation-zone'
        },
      };
    }
    
    // Fallback to mobile layout
    return {
      hero: { height: '61.8vh', span: 12 },
      primary: { height: 'auto', span: 12 },
      secondary: { height: 'auto', span: 12 },
      navigation: { position: 'bottom', height: grid.touchTargets.minimum, span: 12 },
    };
  }, [viewport, isTablet, isMobile, isDesktop, isWide, grid]);
  
  const applyZone = (zone: keyof ResponsiveZones): ResponsiveZone => {
    return zones[zone] || { height: 'auto', span: 12 };
  };
  
  return { zones, applyZone, grid };
};

/**
 * Hook for managing adaptive hero height based on content and context
 */
export const useAdaptiveHero = (
  contentDensity: 'low' | 'medium' | 'high' = 'medium',
  context: 'cooking' | 'shopping' | 'browsing' = 'browsing',
  performanceMode: 'high' | 'balanced' | 'low' = 'balanced'
): {
  heroHeight: number;
  heroHeightVh: string;
  heroClassName: string;
} => {
  const viewport = useViewport();
  const [heroHeight, setHeroHeight] = useState(0);
  
  useEffect(() => {
    const calculateOptimalHeight = () => {
      const baseGolden = viewport.availableHeight * 0.618;
      
      // Content density adjustments
      const densityMultiplier = {
        low: 0.85,    // More hero (52.5%)
        medium: 1.0,  // Golden ratio (61.8%)
        high: 1.15,   // Less hero (71%)
      }[contentDensity];
      
      // Context-aware adjustments
      const contextAdjustment = {
        cooking: 0.9,     // Less hero, more content visible
        shopping: 1.0,    // Standard golden ratio
        browsing: 1.1,    // More hero for discovery
      }[context];
      
      // Performance-based limits
      const performanceLimit = {
        high: 1.0,
        balanced: 0.95,   // Slightly reduce for performance
        low: 0.85,        // Significantly reduce for low-end devices
      }[performanceMode];
      
      const adaptiveHeight = Math.round(
        baseGolden * densityMultiplier * contextAdjustment * performanceLimit
      );
      
      // Ensure minimum usability (never less than 40% or more than 75%)
      const clampedHeight = Math.max(
        viewport.availableHeight * 0.4,
        Math.min(adaptiveHeight, viewport.availableHeight * 0.75)
      );
      
      setHeroHeight(clampedHeight);
    };
    
    calculateOptimalHeight();
  }, [viewport, contentDensity, context, performanceMode]);
  
  const heroHeightVh = useMemo(() => {
    const vhPercentage = (heroHeight / viewport.availableHeight) * 100;
    return `${Math.round(vhPercentage * 10) / 10}vh`;
  }, [heroHeight, viewport.availableHeight]);
  
  const heroClassName = useMemo(() => {
    return `adaptive-hero adaptive-hero--${contentDensity} adaptive-hero--${context} adaptive-hero--${performanceMode}`;
  }, [contentDensity, context, performanceMode]);
  
  return {
    heroHeight,
    heroHeightVh,
    heroClassName,
  };
};

export default useResponsiveZones;