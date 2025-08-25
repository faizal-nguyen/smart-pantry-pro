/**
 * Dynamic Color Engine for Material You
 * Generates adaptive color schemes from images using Material Design 3 principles
 */

import { 
  argbFromHex, 
  hexFromArgb,
  themeFromSourceColor,
  Theme,
  TonalPalette as MaterialTonalPalette,
  Scheme,
  Hct
} from '@material/material-color-utilities';
import { ColorExtractor } from './ColorExtractor';
import { TonalPalette, MaterialYouTokens } from '@/design-system/tokens/material-you-tokens';
import { prepareColorForMaterialUtils, ensureHexPrefix } from '@/lib/color-utils';

export interface ColorScheme {
  source: string;
  primary: TonalPalette;
  secondary: TonalPalette;
  tertiary: TonalPalette;
  neutral: TonalPalette;
  neutralVariant: TonalPalette;
  error: TonalPalette;
  styles: {
    light: SchemeColors;
    dark: SchemeColors;
  };
  foodAccent?: {
    fresh: string;
    warm: string;
    indulgent: string;
  };
}

export interface SchemeColors {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  shadow: string;
  scrim: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
}

export interface ExtractionOptions {
  quality?: 'low' | 'medium' | 'high';
  platform?: 'web' | 'ios' | 'android';
  fallbackColor?: string;
  enhanceFoodColors?: boolean;
  contextualMode?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'shopping' | 'cooking';
}

export class DynamicColorEngine {
  private colorExtractor: ColorExtractor;
  private cache: Map<string, ColorScheme>;
  
  constructor() {
    this.colorExtractor = new ColorExtractor();
    this.cache = new Map();
  }
  
  /**
   * Extract color scheme from an image URL
   */
  async extractColorScheme(
    imageUrl: string, 
    options: ExtractionOptions = {}
  ): Promise<ColorScheme> {
    const cacheKey = `${imageUrl}-${JSON.stringify(options)}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    try {
      // Extract dominant color from image
      const dominantColor = await this.colorExtractor.extractFromImage(imageUrl, {
        platform: options.platform || 'web',
        quality: options.quality || 'medium',
        fallback: options.fallbackColor || '#2DD4BF',
      });
      
      // Validate and prepare color for Material Color Utilities
      const validatedColor = prepareColorForMaterialUtils(dominantColor);
      
      // Convert to ARGB for Material Color Utilities
      const sourceArgb = argbFromHex(validatedColor);
      
      // Generate Material You theme
      const theme = themeFromSourceColor(sourceArgb, [
        {
          name: 'custom-1',
          value: sourceArgb,
          blend: true,
        },
      ]);
      
      // Create color scheme
      const colorScheme = this.createColorScheme(theme, dominantColor, options);
      
      // Cache the result
      this.cache.set(cacheKey, colorScheme);
      
      return colorScheme;
    } catch (error) {
      console.error('Error extracting color scheme:', error);
      // Return fallback scheme
      return this.createFallbackScheme(options.fallbackColor || '#2DD4BF');
    }
  }
  
  /**
   * Generate color scheme from a hex color
   */
  generateFromColor(hexColor: string, options: ExtractionOptions = {}): ColorScheme {
    // Validate color before processing
    const validatedColor = prepareColorForMaterialUtils(hexColor);
    const sourceArgb = argbFromHex(validatedColor);
    const theme = themeFromSourceColor(sourceArgb);
    return this.createColorScheme(theme, validatedColor, options);
  }
  
  /**
   * Create color scheme from Material theme
   */
  private createColorScheme(
    theme: Theme, 
    sourceColor: string,
    options: ExtractionOptions
  ): ColorScheme {
    const { palettes, schemes } = theme;
    
    // Convert Material palettes to our format
    const primary = this.convertTonalPalette(palettes.primary);
    const secondary = this.convertTonalPalette(palettes.secondary);
    const tertiary = this.convertTonalPalette(palettes.tertiary);
    const neutral = this.convertTonalPalette(palettes.neutral);
    const neutralVariant = this.convertTonalPalette(palettes.neutralVariant);
    const error = this.convertTonalPalette(palettes.error);
    
    // Generate food accent colors if requested
    const foodAccent = options.enhanceFoodColors 
      ? this.generateFoodAccentColors(sourceColor, options.contextualMode)
      : undefined;
    
    return {
      source: sourceColor,
      primary,
      secondary,
      tertiary,
      neutral,
      neutralVariant,
      error,
      styles: {
        light: this.schemeToColors(schemes.light),
        dark: this.schemeToColors(schemes.dark),
      },
      foodAccent,
    };
  }
  
  /**
   * Convert Material tonal palette to our format
   */
  private convertTonalPalette(palette: MaterialTonalPalette): TonalPalette {
    return {
      0: hexFromArgb(palette.tone(0)),
      10: hexFromArgb(palette.tone(10)),
      20: hexFromArgb(palette.tone(20)),
      30: hexFromArgb(palette.tone(30)),
      40: hexFromArgb(palette.tone(40)),
      50: hexFromArgb(palette.tone(50)),
      60: hexFromArgb(palette.tone(60)),
      70: hexFromArgb(palette.tone(70)),
      80: hexFromArgb(palette.tone(80)),
      90: hexFromArgb(palette.tone(90)),
      95: hexFromArgb(palette.tone(95)),
      99: hexFromArgb(palette.tone(99)),
      100: hexFromArgb(palette.tone(100)),
    };
  }
  
  /**
   * Convert Material scheme to color values
   */
  private schemeToColors(scheme: Scheme): SchemeColors {
    return {
      primary: hexFromArgb(scheme.primary),
      onPrimary: hexFromArgb(scheme.onPrimary),
      primaryContainer: hexFromArgb(scheme.primaryContainer),
      onPrimaryContainer: hexFromArgb(scheme.onPrimaryContainer),
      secondary: hexFromArgb(scheme.secondary),
      onSecondary: hexFromArgb(scheme.onSecondary),
      secondaryContainer: hexFromArgb(scheme.secondaryContainer),
      onSecondaryContainer: hexFromArgb(scheme.onSecondaryContainer),
      tertiary: hexFromArgb(scheme.tertiary),
      onTertiary: hexFromArgb(scheme.onTertiary),
      tertiaryContainer: hexFromArgb(scheme.tertiaryContainer),
      onTertiaryContainer: hexFromArgb(scheme.onTertiaryContainer),
      error: hexFromArgb(scheme.error),
      onError: hexFromArgb(scheme.onError),
      errorContainer: hexFromArgb(scheme.errorContainer),
      onErrorContainer: hexFromArgb(scheme.onErrorContainer),
      background: hexFromArgb(scheme.background),
      onBackground: hexFromArgb(scheme.onBackground),
      surface: hexFromArgb(scheme.surface),
      onSurface: hexFromArgb(scheme.onSurface),
      surfaceVariant: hexFromArgb(scheme.surfaceVariant),
      onSurfaceVariant: hexFromArgb(scheme.onSurfaceVariant),
      outline: hexFromArgb(scheme.outline),
      outlineVariant: hexFromArgb(scheme.outlineVariant),
      shadow: hexFromArgb(scheme.shadow),
      scrim: hexFromArgb(scheme.scrim),
      inverseSurface: hexFromArgb(scheme.inverseSurface),
      inverseOnSurface: hexFromArgb(scheme.inverseOnSurface),
      inversePrimary: hexFromArgb(scheme.inversePrimary),
    };
  }
  
  /**
   * Generate food-specific accent colors
   */
  private generateFoodAccentColors(
    sourceColor: string, 
    context?: string
  ): { fresh: string; warm: string; indulgent: string } {
    // Validate color before processing
    const validatedColor = prepareColorForMaterialUtils(sourceColor);
    const sourceHct = Hct.fromInt(argbFromHex(validatedColor));
    
    // Adjust colors based on food psychology
    const fresh = Hct.from(
      (sourceHct.hue + 120) % 360, // Green shift
      Math.min(sourceHct.chroma * 1.2, 120), // Higher chroma
      Math.min(sourceHct.tone + 10, 90) // Lighter
    );
    
    const warm = Hct.from(
      (sourceHct.hue + 30) % 360, // Orange/red shift
      Math.min(sourceHct.chroma * 1.1, 100),
      Math.max(sourceHct.tone - 10, 40) // Darker
    );
    
    const indulgent = Hct.from(
      (sourceHct.hue + 270) % 360, // Purple shift
      Math.min(sourceHct.chroma * 0.9, 80),
      Math.max(sourceHct.tone - 20, 30) // Much darker
    );
    
    return {
      fresh: hexFromArgb(fresh.toInt()),
      warm: hexFromArgb(warm.toInt()),
      indulgent: hexFromArgb(indulgent.toInt()),
    };
  }
  
  /**
   * Create fallback color scheme
   */
  private createFallbackScheme(fallbackColor: string): ColorScheme {
    return this.generateFromColor(fallbackColor);
  }
  
  /**
   * Apply contextual adjustments based on meal time or mode
   */
  applyContextualAdjustments(
    scheme: ColorScheme,
    context: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'shopping' | 'cooking'
  ): ColorScheme {
    const adjustments = {
      breakfast: { hueShift: 30, chromaBoost: 1.2, toneShift: 10 }, // Warmer, brighter
      lunch: { hueShift: 0, chromaBoost: 1.0, toneShift: 0 }, // Neutral
      dinner: { hueShift: -30, chromaBoost: 0.8, toneShift: -10 }, // Cooler, darker
      snack: { hueShift: 45, chromaBoost: 1.3, toneShift: 5 }, // Playful
      shopping: { hueShift: -15, chromaBoost: 0.9, toneShift: 0 }, // Focus
      cooking: { hueShift: 20, chromaBoost: 1.1, toneShift: -5 }, // Energetic
    };
    
    const adjustment = adjustments[context];
    
    // Apply adjustments to the source color
    const sourceHct = Hct.fromInt(argbFromHex(scheme.source));
    const adjustedHct = Hct.from(
      (sourceHct.hue + adjustment.hueShift) % 360,
      Math.min(sourceHct.chroma * adjustment.chromaBoost, 120),
      Math.max(Math.min(sourceHct.tone + adjustment.toneShift, 90), 10)
    );
    
    // Regenerate scheme with adjusted color
    return this.generateFromColor(hexFromArgb(adjustedHct.toInt()));
  }
  
  /**
   * Clear color cache
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

export default DynamicColorEngine;