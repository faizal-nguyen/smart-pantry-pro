/**
 * Hybrid Grid System Hook
 * Manages dynamic CSS custom properties and grid calculations
 * Based on PRP-022-Layout-Optimization specification
 */

import { useEffect, useState, useMemo } from 'react';
import { HybridGoldenGrid } from '@/design-system/HybridGoldenGrid';
import { useViewport } from '@/hooks/useResponsiveZones';

interface GridContext {
  mode: 'cooking' | 'shopping' | 'browsing';
  density: 'low' | 'medium' | 'high';
  performanceMode: 'high' | 'balanced' | 'low';
}

interface HybridGridState {
  grid: ReturnType<typeof HybridGoldenGrid.generateHybridGrid>;
  cssProperties: Record<string, string>;
  contextualSpacing: number;
  isReady: boolean;
}

export const useHybridGrid = (context?: GridContext): HybridGridState => {
  const viewport = useViewport();
  const [isReady, setIsReady] = useState(false);
  
  const defaultContext: GridContext = {
    mode: 'browsing',
    density: 'medium',
    performanceMode: 'balanced',
  };
  
  const gridContext = { ...defaultContext, ...context };
  
  // Generate grid system based on current viewport
  const grid = useMemo(() => 
    HybridGoldenGrid.generateHybridGrid(viewport.width, viewport.height),
    [viewport.width, viewport.height]
  );
  
  // Generate CSS custom properties
  const cssProperties = useMemo(() => 
    HybridGoldenGrid.generateCSSProperties(viewport.width, viewport.height),
    [viewport.width, viewport.height]
  );
  
  // Calculate contextual spacing
  const contextualSpacing = useMemo(() => 
    HybridGoldenGrid.calculateContextualSpacing(gridContext.mode, gridContext.density),
    [gridContext.mode, gridContext.density]
  );
  
  // Apply CSS custom properties to document root
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    
    // Apply all CSS custom properties
    Object.entries(cssProperties).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
    
    // Apply contextual spacing
    root.style.setProperty('--contextual-spacing', `${contextualSpacing}px`);
    
    // Performance mode adjustments
    const performanceAdjustments = {
      high: {
        '--animation-performance-scale': '1.0',
        '--parallax-enabled': '1',
        '--blur-effects-enabled': '1',
      },
      balanced: {
        '--animation-performance-scale': '0.8',
        '--parallax-enabled': '0.5',
        '--blur-effects-enabled': '0.7',
      },
      low: {
        '--animation-performance-scale': '0.5',
        '--parallax-enabled': '0',
        '--blur-effects-enabled': '0',
      },
    }[gridContext.performanceMode];
    
    Object.entries(performanceAdjustments).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
    
    setIsReady(true);
    
    return () => {
      // Cleanup: remove custom properties if needed
      // Note: In most cases, we want to keep them for consistency
    };
  }, [cssProperties, contextualSpacing, gridContext.performanceMode]);
  
  return {
    grid,
    cssProperties,
    contextualSpacing,
    isReady,
  };
};

/**
 * Hook for platform-adaptive touch zones
 */
export const usePlatformAdaptiveTouch = () => {
  const { grid } = useHybridGrid();
  
  const touchZones = useMemo(() => ({
    minimum: {
      height: grid.touchTargets.minimum,
      width: grid.touchTargets.minimum,
      className: 'touch-zone-minimum',
    },
    comfortable: {
      height: grid.touchTargets.comfortable,
      width: grid.touchTargets.comfortable,
      className: 'touch-zone-comfortable',
    },
    generous: {
      height: grid.touchTargets.generous,
      width: grid.touchTargets.generous,
      className: 'touch-zone-generous',
    },
    contextual: {
      cooking: {
        height: grid.touchTargets.contextual.cooking,
        width: grid.touchTargets.contextual.cooking,
        className: 'touch-zone-cooking',
      },
      shopping: {
        height: grid.touchTargets.contextual.shopping,
        width: grid.touchTargets.contextual.shopping,
        className: 'touch-zone-shopping',
      },
      browsing: {
        height: grid.touchTargets.contextual.browsing,
        width: grid.touchTargets.contextual.browsing,
        className: 'touch-zone-browsing',
      },
    },
  }), [grid.touchTargets]);
  
  return touchZones;
};

/**
 * Hook for golden ratio layout calculations
 */
export const useGoldenLayout = () => {
  const { grid } = useHybridGrid();
  
  const goldenCalculations = useMemo(() => ({
    // Section proportions
    primarySection: (totalHeight: number) => totalHeight * 0.618,
    secondarySection: (totalHeight: number) => totalHeight * 0.382,
    
    // Column proportions
    wideColumn: (totalColumns: number = 12) => Math.round(totalColumns / 1.618),
    narrowColumn: (totalColumns: number = 12) => totalColumns - Math.round(totalColumns / 1.618),
    
    // Content area proportions
    contentToSidebar: (totalWidth: number) => ({
      content: totalWidth * 0.618,
      sidebar: totalWidth * 0.382,
    }),
    
    // Nested golden proportions
    nestedSections: (parentHeight: number) => ({
      major: parentHeight * 0.618 * 0.618, // ~38.2%
      minor: parentHeight * 0.618 * 0.382, // ~23.6%
      remaining: parentHeight * 0.382, // ~38.2%
    }),
    
    // Spacing based on golden ratio
    goldenSpacing: (baseSize: number, level: number = 1) => 
      HybridGoldenGrid.goldenMultiply(baseSize, level),
    
    // Container sizes
    containers: grid.containers,
  }), [grid.containers]);
  
  return goldenCalculations;
};

/**
 * Hook for managing contextual layout adjustments
 */
export const useContextualLayout = (
  mode: 'cooking' | 'shopping' | 'browsing' = 'browsing',
  density: 'low' | 'medium' | 'high' = 'medium'
) => {
  const { grid } = useHybridGrid({ mode, density, performanceMode: 'balanced' });
  
  const layoutAdjustments = useMemo(() => ({
    // Spacing adjustments
    spacing: {
      base: grid.baseGrid.spacing,
      contextual: HybridGoldenGrid.calculateContextualSpacing(mode, density),
    },
    
    // Touch target adjustments
    touchTargets: grid.touchTargets.contextual[mode],
    
    // Container adjustments
    containers: {
      ...grid.containers,
      adjusted: {
        cooking: grid.containers.wide, // Slightly wider for cooking content
        shopping: grid.containers.narrow, // Narrower for focused shopping
        browsing: grid.containers.primary, // Standard for browsing
      }[mode],
    },
    
    // Grid adjustments
    gridColumns: {
      cooking: { primary: 8, secondary: 4 }, // More space for instructions
      shopping: { primary: 7, secondary: 5 }, // Balanced for list and details
      browsing: { primary: 7, secondary: 5 }, // Golden ratio standard
    }[mode],
  }), [grid, mode, density]);
  
  return layoutAdjustments;
};

export default useHybridGrid;