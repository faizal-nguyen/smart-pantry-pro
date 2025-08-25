/**
 * Material You Theme Context
 * Provides dynamic theming based on Material Design 3 principles
 */

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback,
  useMemo,
  ReactNode 
} from 'react';
import { DynamicColorEngine, ColorScheme } from '@/services/color/DynamicColorEngine';
import { MaterialYouTokens, defaultMaterialYouTokens } from '@/design-system/tokens/material-you-tokens';
import { useTheme } from '@/hooks/useTheme';
import { useIsMobile } from '@/hooks/use-mobile';

export interface MaterialYouTheme extends MaterialYouTokens {
  colorScheme: ColorScheme | null;
  isDark: boolean;
  isHighContrast: boolean;
  currentContext: ThemeContext;
}

export type ThemeContext = 
  | 'default'
  | 'breakfast' 
  | 'lunch' 
  | 'dinner' 
  | 'snack' 
  | 'shopping' 
  | 'cooking';

export interface MaterialYouThemeContextValue {
  theme: MaterialYouTheme;
  extractColorFromImage: (imageUrl: string) => Promise<void>;
  setSourceColor: (color: string) => void;
  setThemeContext: (context: ThemeContext) => void;
  resetTheme: () => void;
  isLoading: boolean;
  error: string | null;
}

const MaterialYouThemeContext = createContext<MaterialYouThemeContextValue | undefined>(undefined);

interface MaterialYouThemeProviderProps {
  children: ReactNode;
  defaultSourceColor?: string;
  enableAutoContext?: boolean;
}

export function MaterialYouThemeProvider({
  children,
  defaultSourceColor = '#2DD4BF',
  enableAutoContext = true,
}: MaterialYouThemeProviderProps) {
  const { theme: systemTheme } = useTheme();
  const isMobile = useIsMobile();
  
  const [colorEngine] = useState(() => new DynamicColorEngine());
  const [colorScheme, setColorScheme] = useState<ColorScheme | null>(null);
  const [sourceColor, setSourceColor] = useState(defaultSourceColor);
  const [themeContext, setThemeContext] = useState<ThemeContext>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isDark = systemTheme === 'dark';
  const isHighContrast = false; // TODO: Implement high contrast detection
  
  // Auto-detect theme context based on time of day
  useEffect(() => {
    if (!enableAutoContext) return;
    
    const updateContext = () => {
      const hour = new Date().getHours();
      
      if (hour >= 5 && hour < 11) {
        setThemeContext('breakfast');
      } else if (hour >= 11 && hour < 14) {
        setThemeContext('lunch');
      } else if (hour >= 17 && hour < 21) {
        setThemeContext('dinner');
      } else if (hour >= 14 && hour < 17 || hour >= 21 && hour < 23) {
        setThemeContext('snack');
      } else {
        setThemeContext('default');
      }
    };
    
    updateContext();
    const interval = setInterval(updateContext, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [enableAutoContext]);
  
  // Generate color scheme when source color changes
  useEffect(() => {
    const generateScheme = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const scheme = colorEngine.generateFromColor(sourceColor, {
          platform: isMobile ? 'web' : 'web', // TODO: Detect actual platform
          enhanceFoodColors: true,
          contextualMode: themeContext === 'default' ? undefined : themeContext,
        });
        
        // Apply contextual adjustments if needed
        const adjustedScheme = themeContext !== 'default'
          ? colorEngine.applyContextualAdjustments(scheme, themeContext)
          : scheme;
        
        setColorScheme(adjustedScheme);
        
        // Apply CSS custom properties
        applyThemeToCss(adjustedScheme, isDark);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate theme');
        console.error('Theme generation error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    generateScheme();
  }, [sourceColor, themeContext, isDark, colorEngine, isMobile]);
  
  // Extract color from image
  const extractColorFromImage = useCallback(async (imageUrl: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const scheme = await colorEngine.extractColorScheme(imageUrl, {
        platform: isMobile ? 'web' : 'web', // TODO: Detect actual platform
        quality: 'medium',
        enhanceFoodColors: true,
        contextualMode: themeContext === 'default' ? undefined : themeContext,
      });
      
      setColorScheme(scheme);
      setSourceColor(scheme.source);
      
      // Apply CSS custom properties
      applyThemeToCss(scheme, isDark);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract colors');
      console.error('Color extraction error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [colorEngine, isMobile, themeContext, isDark]);
  
  // Reset to default theme
  const resetTheme = useCallback(() => {
    setSourceColor(defaultSourceColor);
    setThemeContext('default');
    setColorScheme(null);
    setError(null);
  }, [defaultSourceColor]);
  
  // Create theme object
  const theme = useMemo<MaterialYouTheme>(() => {
    const baseTokens = { ...defaultMaterialYouTokens };
    
    // Apply color scheme if available
    if (colorScheme) {
      baseTokens.colors.source = colorScheme.source;
      baseTokens.colors.primary = {
        light: colorScheme.primary,
        dark: colorScheme.primary,
      };
      baseTokens.colors.secondary = {
        light: colorScheme.secondary,
        dark: colorScheme.secondary,
      };
      baseTokens.colors.tertiary = {
        light: colorScheme.tertiary,
        dark: colorScheme.tertiary,
      };
      baseTokens.colors.neutral = {
        light: colorScheme.neutral,
        dark: colorScheme.neutral,
      };
      baseTokens.colors.neutralVariant = {
        light: colorScheme.neutralVariant,
        dark: colorScheme.neutralVariant,
      };
      
      // Apply food accent colors if available
      if (colorScheme.foodAccent) {
        baseTokens.colors.semantic.fresh.value = colorScheme.foodAccent.fresh;
        baseTokens.colors.semantic.warm.value = colorScheme.foodAccent.warm;
        baseTokens.colors.semantic.social.value = colorScheme.foodAccent.indulgent;
      }
    }
    
    return {
      ...baseTokens,
      colorScheme,
      isDark,
      isHighContrast,
      currentContext: themeContext,
    };
  }, [colorScheme, isDark, isHighContrast, themeContext]);
  
  const value = useMemo<MaterialYouThemeContextValue>(() => ({
    theme,
    extractColorFromImage,
    setSourceColor,
    setThemeContext,
    resetTheme,
    isLoading,
    error,
  }), [theme, extractColorFromImage, resetTheme, isLoading, error]);
  
  return (
    <MaterialYouThemeContext.Provider value={value}>
      {children}
    </MaterialYouThemeContext.Provider>
  );
}

/**
 * Hook to use Material You theme
 */
export function useMaterialYouTheme() {
  const context = useContext(MaterialYouThemeContext);
  if (!context) {
    throw new Error('useMaterialYouTheme must be used within MaterialYouThemeProvider');
  }
  return context;
}

/**
 * Apply theme to CSS custom properties
 */
function applyThemeToCss(scheme: ColorScheme, isDark: boolean) {
  const root = document.documentElement;
  const colors = isDark ? scheme.styles.dark : scheme.styles.light;
  
  // Apply Material You color properties
  root.style.setProperty('--md-sys-color-primary', colors.primary);
  root.style.setProperty('--md-sys-color-on-primary', colors.onPrimary);
  root.style.setProperty('--md-sys-color-primary-container', colors.primaryContainer);
  root.style.setProperty('--md-sys-color-on-primary-container', colors.onPrimaryContainer);
  
  root.style.setProperty('--md-sys-color-secondary', colors.secondary);
  root.style.setProperty('--md-sys-color-on-secondary', colors.onSecondary);
  root.style.setProperty('--md-sys-color-secondary-container', colors.secondaryContainer);
  root.style.setProperty('--md-sys-color-on-secondary-container', colors.onSecondaryContainer);
  
  root.style.setProperty('--md-sys-color-tertiary', colors.tertiary);
  root.style.setProperty('--md-sys-color-on-tertiary', colors.onTertiary);
  root.style.setProperty('--md-sys-color-tertiary-container', colors.tertiaryContainer);
  root.style.setProperty('--md-sys-color-on-tertiary-container', colors.onTertiaryContainer);
  
  root.style.setProperty('--md-sys-color-error', colors.error);
  root.style.setProperty('--md-sys-color-on-error', colors.onError);
  root.style.setProperty('--md-sys-color-error-container', colors.errorContainer);
  root.style.setProperty('--md-sys-color-on-error-container', colors.onErrorContainer);
  
  root.style.setProperty('--md-sys-color-background', colors.background);
  root.style.setProperty('--md-sys-color-on-background', colors.onBackground);
  root.style.setProperty('--md-sys-color-surface', colors.surface);
  root.style.setProperty('--md-sys-color-on-surface', colors.onSurface);
  root.style.setProperty('--md-sys-color-surface-variant', colors.surfaceVariant);
  root.style.setProperty('--md-sys-color-on-surface-variant', colors.onSurfaceVariant);
  
  root.style.setProperty('--md-sys-color-outline', colors.outline);
  root.style.setProperty('--md-sys-color-outline-variant', colors.outlineVariant);
  root.style.setProperty('--md-sys-color-shadow', colors.shadow);
  root.style.setProperty('--md-sys-color-scrim', colors.scrim);
  root.style.setProperty('--md-sys-color-inverse-surface', colors.inverseSurface);
  root.style.setProperty('--md-sys-color-inverse-on-surface', colors.inverseOnSurface);
  root.style.setProperty('--md-sys-color-inverse-primary', colors.inversePrimary);
  
  // Apply food accent colors if available
  if (scheme.foodAccent) {
    root.style.setProperty('--md-sys-color-fresh', scheme.foodAccent.fresh);
    root.style.setProperty('--md-sys-color-warm', scheme.foodAccent.warm);
    root.style.setProperty('--md-sys-color-indulgent', scheme.foodAccent.indulgent);
  }
  
  // Update theme-color meta tag for mobile browsers
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', colors.surface);
  }
}

export default MaterialYouThemeProvider;