/**
 * Layout Optimization System - Complete Implementation
 * Central export file for all PRP-022-Layout-Optimization components
 * Includes hybrid golden grid, adaptive hero, morphing navigation, and performance monitoring
 */

// Core Design System
export { HybridGoldenGrid } from './HybridGoldenGrid';
export { default as defaultMaterialYouTokens } from './tokens/material-you-tokens';

// Layout Components
export { 
  AdaptiveHeroViewport, 
  HeroVariants,
  type ContentDensity,
  type UserContext 
} from '@/components/layout/AdaptiveHeroViewport';

export {
  SimplifiedMorphingNav,
  EnhancedLayout,
  useNavigation
} from '@/components/navigation/SimplifiedMorphingNav';

// Responsive Hooks
export {
  useResponsiveZones,
  useViewport,
  useBreakpoints,
  useAdaptiveHero
} from '@/hooks/useResponsiveZones';

// Performance and Accessibility
export {
  PerformanceMonitor,
  LayoutPerformanceProvider,
  useLayoutPerformance,
  PerformanceAwareAnimation,
  OptimizedMotion,
  usePerformanceMonitoring
} from '@/components/performance/PerformanceMonitor';

// Utility Types
export interface LayoutOptimizationConfig {
  performanceMode: 'high' | 'balanced' | 'low';
  enableParallax: boolean;
  enableMorphingNav: boolean;
  enablePerformanceMonitoring: boolean;
  accessibilityLevel: 'AA' | 'AAA';
}

// Pre-configured layout setups
export const LayoutPresets = {
  /**
   * High-performance setup for premium devices
   */
  premium: {
    performanceMode: 'high' as const,
    enableParallax: true,
    enableMorphingNav: true,
    enablePerformanceMonitoring: true,
    accessibilityLevel: 'AAA' as const,
  },
  
  /**
   * Balanced setup for most users
   */
  standard: {
    performanceMode: 'balanced' as const,
    enableParallax: false,
    enableMorphingNav: true,
    enablePerformanceMonitoring: true,
    accessibilityLevel: 'AAA' as const,
  },
  
  /**
   * Optimized setup for low-end devices
   */
  efficient: {
    performanceMode: 'low' as const,
    enableParallax: false,
    enableMorphingNav: false,
    enablePerformanceMonitoring: false,
    accessibilityLevel: 'AA' as const,
  },
  
  /**
   * Accessibility-first setup
   */
  accessible: {
    performanceMode: 'balanced' as const,
    enableParallax: false,
    enableMorphingNav: true,
    enablePerformanceMonitoring: false,
    accessibilityLevel: 'AAA' as const,
  },
} satisfies Record<string, LayoutOptimizationConfig>;

// CSS Classes Export
export const LayoutClasses = {
  // Container classes
  containers: {
    primary: 'container-primary',
    secondary: 'container-secondary',
    full: 'container-full',
    wide: 'container-wide',
    narrow: 'container-narrow',
  },
  
  // Grid classes
  grids: {
    hybrid12: 'hybrid-grid-12',
    golden: 'hybrid-grid-golden',
    goldenReverse: 'hybrid-grid-golden-reverse',
    golden2: 'grid-golden-2',
    golden3: 'grid-golden-3',
  },
  
  // Zone classes
  zones: {
    mobileHero: 'mobile-hero-zone',
    tabletHero: 'tablet-hero-zone',
    desktopHero: 'desktop-hero-zone',
    mobileNav: 'mobile-navigation-zone',
    tabletNav: 'tablet-navigation-zone',
    desktopNav: 'desktop-navigation-zone',
  },
  
  // Touch target classes
  touchTargets: {
    minimum: 'touch-zone-minimum',
    comfortable: 'touch-zone-comfortable',
    generous: 'touch-zone-generous',
    cooking: 'touch-zone-cooking',
    shopping: 'touch-zone-shopping',
    browsing: 'touch-zone-browsing',
  },
  
  // Accessibility classes
  accessibility: {
    enhanced: 'a11y-enhanced',
    focusRing: 'a11y-focus-ring',
    textScale: 'a11y-text-scale',
    srOnly: 'sr-only',
    skipLink: 'skip-link',
  },
};

// Quick Setup Function
export const setupLayoutOptimization = (config: LayoutOptimizationConfig = LayoutPresets.standard) => {
  // Apply configuration to document root
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    
    // Performance mode
    root.style.setProperty('--layout-performance-mode', config.performanceMode);
    
    // Feature flags
    root.style.setProperty('--layout-parallax-enabled', config.enableParallax ? '1' : '0');
    root.style.setProperty('--layout-morphing-nav-enabled', config.enableMorphingNav ? '1' : '0');
    
    // Accessibility level
    root.classList.toggle('a11y-aaa', config.accessibilityLevel === 'AAA');\n    root.classList.toggle('a11y-aa', config.accessibilityLevel === 'AA');\n    \n    console.log('Layout optimization configured:', config);\n  }\n  \n  return config;\n};\n\n// Performance Testing Utilities\nexport const LayoutTestUtils = {\n  measureHeroAdaptation: () => {\n    const hero = document.querySelector('.adaptive-hero-viewport');\n    if (!hero) return null;\n    \n    const rect = hero.getBoundingClientRect();\n    const viewportHeight = window.innerHeight;\n    const ratio = rect.height / viewportHeight;\n    \n    return {\n      height: rect.height,\n      ratio,\n      isWithinBounds: ratio >= 0.4 && ratio <= 0.75,\n      classification: ratio < 0.5 ? 'compact' : ratio > 0.65 ? 'spacious' : 'balanced',\n    };\n  },\n  \n  measureTouchTargetCompliance: () => {\n    const touchElements = document.querySelectorAll('[class*=\"touch-zone\"]');\n    const results = Array.from(touchElements).map(el => {\n      const rect = el.getBoundingClientRect();\n      const minSize = 44; // iOS minimum\n      \n      return {\n        element: el.className,\n        width: rect.width,\n        height: rect.height,\n        compliant: rect.width >= minSize && rect.height >= minSize,\n      };\n    });\n    \n    const complianceRate = results.filter(r => r.compliant).length / results.length;\n    \n    return {\n      elements: results,\n      complianceRate,\n      isFullyCompliant: complianceRate === 1,\n    };\n  },\n  \n  measurePerformanceImpact: async () => {\n    const startTime = performance.now();\n    \n    // Simulate layout operations\n    await new Promise(resolve => {\n      requestAnimationFrame(() => {\n        requestAnimationFrame(resolve);\n      });\n    });\n    \n    const endTime = performance.now();\n    const frameDuration = endTime - startTime;\n    const fps = 1000 / frameDuration;\n    \n    return {\n      frameDuration,\n      fps,\n      performanceScore: fps >= 58 ? 'excellent' : fps >= 45 ? 'good' : 'needs-improvement',\n    };\n  },\n};\n\n// Default export for easy setup\nexport default {\n  HybridGoldenGrid,\n  LayoutPresets,\n  LayoutClasses,\n  setupLayoutOptimization,\n  LayoutTestUtils,\n};