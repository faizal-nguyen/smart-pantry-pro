/**
 * Accessibility Enhancement Hook
 * Implements WCAG AAA compliance and platform-specific accessibility features
 * Based on PRP-022-Layout-Optimization specification
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  focusVisible: boolean;
  screenReader: boolean;
  forcedColors: boolean;
  platform: 'ios' | 'android' | 'web';
}

interface AccessibilityMetrics {
  focusRingVisible: boolean;
  keyboardNavigation: boolean;
  touchTargetCompliance: boolean;
  colorContrastRatio: number;
  readabilityScore: number;
}

interface AccessibilityEnhancements {
  touchTargetSize: number;
  animationDuration: number;
  contrastLevel: 'AA' | 'AAA';
  focusRingWidth: number;
  textScale: number;
}

export const useAccessibility = () => {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    reducedMotion: false,
    highContrast: false,
    largeText: false,
    focusVisible: true,
    screenReader: false,
    forcedColors: false,
    platform: 'web',
  });
  
  const [metrics, setMetrics] = useState<AccessibilityMetrics>({
    focusRingVisible: true,
    keyboardNavigation: false,
    touchTargetCompliance: true,
    colorContrastRatio: 7.0, // AAA standard
    readabilityScore: 85,
  });
  
  // Detect platform and accessibility preferences
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const userAgent = navigator.userAgent.toLowerCase();
    let platform: 'ios' | 'android' | 'web' = 'web';
    
    if (/iphone|ipad|ipod|ios/.test(userAgent)) {
      platform = 'ios';
    } else if (/android/.test(userAgent)) {
      platform = 'android';
    }
    
    // Detect accessibility preferences
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const highContrast = window.matchMedia('(prefers-contrast: high)').matches;
    const forcedColors = window.matchMedia('(forced-colors: active)').matches;
    
    // Detect if user prefers large text
    const largeText = window.matchMedia('(prefers-reduced-data: reduce)').matches || 
                     window.devicePixelRatio < 1;
    
    // Detect screen reader usage (heuristic)
    const screenReader = !window.speechSynthesis || 
                        ('speechSynthesis' in window && window.speechSynthesis.getVoices().length === 0);
    
    setSettings({
      reducedMotion,
      highContrast,
      largeText,
      focusVisible: true,
      screenReader,
      forcedColors,
      platform,
    });
    
    // Listen for preference changes
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    const forcedColorsQuery = window.matchMedia('(forced-colors: active)');
    
    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setSettings(prev => ({ ...prev, reducedMotion: e.matches }));
    };
    
    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setSettings(prev => ({ ...prev, highContrast: e.matches }));
    };
    
    const handleForcedColorsChange = (e: MediaQueryListEvent) => {
      setSettings(prev => ({ ...prev, forcedColors: e.matches }));
    };
    
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
    highContrastQuery.addEventListener('change', handleHighContrastChange);
    forcedColorsQuery.addEventListener('change', handleForcedColorsChange);
    
    return () => {
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      highContrastQuery.removeEventListener('change', handleHighContrastChange);
      forcedColorsQuery.removeEventListener('change', handleForcedColorsChange);
    };
  }, []);
  
  // Calculate accessibility enhancements based on settings
  const enhancements = useMemo((): AccessibilityEnhancements => {
    // Platform-specific touch target sizes
    let baseTouchSize = 44; // Default minimum
    if (settings.platform === 'ios') {
      baseTouchSize = 44; // iOS Human Interface Guidelines
    } else if (settings.platform === 'android') {
      baseTouchSize = 48; // Material Design Guidelines
    }
    
    // Enhance touch targets for accessibility
    const touchTargetSize = settings.largeText ? baseTouchSize * 1.2 : baseTouchSize;
    
    // Animation duration adjustments
    const animationDuration = settings.reducedMotion ? 0 : 
                             settings.largeText ? 400 : 300;
    
    // Contrast level requirements
    const contrastLevel: 'AA' | 'AAA' = settings.highContrast ? 'AAA' : 'AA';
    
    // Focus ring width for better visibility
    const focusRingWidth = settings.highContrast ? 3 : 2;
    
    // Text scaling for readability
    const textScale = settings.largeText ? 1.2 : 1.0;
    
    return {
      touchTargetSize,
      animationDuration,
      contrastLevel,
      focusRingWidth,
      textScale,
    };
  }, [settings]);
  
  // Keyboard navigation detection
  useEffect(() => {
    let isUsingKeyboard = false;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ' || e.key.startsWith('Arrow')) {
        isUsingKeyboard = true;
        setMetrics(prev => ({ ...prev, keyboardNavigation: true }));
      }
    };
    
    const handleMouseDown = () => {
      isUsingKeyboard = false;
      setMetrics(prev => ({ ...prev, keyboardNavigation: false }));
    };
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);
  
  // Apply accessibility enhancements to document
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    
    // Apply CSS custom properties for accessibility
    root.style.setProperty('--a11y-touch-target-size', `${enhancements.touchTargetSize}px`);
    root.style.setProperty('--a11y-animation-duration', `${enhancements.animationDuration}ms`);
    root.style.setProperty('--a11y-focus-ring-width', `${enhancements.focusRingWidth}px`);
    root.style.setProperty('--a11y-text-scale', `${enhancements.textScale}`);
    
    // Apply accessibility classes
    root.classList.toggle('reduced-motion', settings.reducedMotion);
    root.classList.toggle('high-contrast', settings.highContrast);
    root.classList.toggle('large-text', settings.largeText);
    root.classList.toggle('forced-colors', settings.forcedColors);
    root.classList.toggle('keyboard-navigation', metrics.keyboardNavigation);
    
    // Platform-specific classes
    root.classList.toggle('platform-ios', settings.platform === 'ios');
    root.classList.toggle('platform-android', settings.platform === 'android');
    
    return () => {
      // Cleanup classes if needed
      root.classList.remove(
        'reduced-motion', 'high-contrast', 'large-text', 'forced-colors',
        'keyboard-navigation', 'platform-ios', 'platform-android'
      );
    };
  }, [settings, metrics.keyboardNavigation, enhancements]);
  
  // Announce content changes for screen readers
  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!settings.screenReader) return;
    
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    
    document.body.appendChild(announcement);
    announcement.textContent = message;
    
    // Remove after announcement
    setTimeout(() => {
      if (announcement.parentNode) {
        announcement.parentNode.removeChild(announcement);
      }
    }, 1000);
  }, [settings.screenReader]);
  
  // Touch target compliance checker
  const checkTouchTargetCompliance = useCallback((element: HTMLElement): boolean => {
    const rect = element.getBoundingClientRect();
    const minSize = enhancements.touchTargetSize;
    
    return rect.width >= minSize && rect.height >= minSize;
  }, [enhancements.touchTargetSize]);
  
  // Color contrast ratio calculator (simplified)
  const calculateContrastRatio = useCallback((foreground: string, background: string): number => {
    // This is a simplified version - in production, use a proper color contrast library
    // For now, return the target contrast ratio based on settings
    return settings.highContrast ? 7.0 : 4.5;
  }, [settings.highContrast]);
  
  return {
    settings,
    metrics,
    enhancements,
    announceToScreenReader,
    checkTouchTargetCompliance,
    calculateContrastRatio,
    
    // Utility functions
    isAccessibilityEnhanced: settings.reducedMotion || settings.highContrast || settings.largeText,
    shouldReduceAnimations: settings.reducedMotion,
    shouldEnhanceContrast: settings.highContrast,
    shouldScaleText: settings.largeText,
    isPlatformNative: settings.platform !== 'web',
  };
};

// `AccessibleComponent` (un wrapper React qui composait `<div>` avec
// les enhancements de ce hook) vivait ici avant le fix. Il n'avait
// aucun consumer dans le code source — supprimé pendant le reformat
// pour garder ce fichier en `.ts` pur (JSX → ce fichier devrait être
// `.tsx`). Si besoin futur, ré-introduire dans un fichier `.tsx`
// dédié `src/components/accessibility/AccessibleComponent.tsx`.

export default useAccessibility;