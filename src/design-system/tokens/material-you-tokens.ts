/**
 * Material You Design Tokens for Smart Pantry
 * Based on Material Design 3 guidelines with food-focused customizations
 */

import { Platform } from '@/lib/utils';

// Material You Color Tokens
export interface MaterialYouTokens {
  colors: {
    // Dynamic colors from Material You
    source: string;
    primary: DynamicColorToken;
    secondary: DynamicColorToken;
    tertiary: DynamicColorToken;
    error: StaticColorToken;
    neutral: DynamicColorToken;
    neutralVariant: DynamicColorToken;
    
    // Food-specific semantic colors
    semantic: {
      fresh: ColorToken;
      warm: ColorToken;
      social: ColorToken;
      healthy: ColorToken;
      expired: ColorToken;
    };
    
    // Contextual meal-based palettes
    contextual: {
      breakfast: ColorPalette;
      lunch: ColorPalette;
      dinner: ColorPalette;
      snack: ColorPalette;
      shopping: ColorPalette;
      cooking: ColorPalette;
    };
  };
  
  typography: TypographyTokens;
  spacing: SpacingTokens;
  shape: ShapeTokens;
  motion: MotionTokens;
  elevation: ElevationTokens;
  state: StateTokens;
}

// Dynamic color token that adapts based on theme
export interface DynamicColorToken {
  light: TonalPalette;
  dark: TonalPalette;
  highContrast?: TonalPalette;
}

// Static color token for fixed colors
export interface StaticColorToken {
  value: string;
  onColor: string;
  container: string;
  onContainer: string;
}

// Tonal palette with Material 3 tones
export interface TonalPalette {
  0: string;    // Black
  10: string;   // Very dark
  20: string;
  30: string;
  40: string;
  50: string;   // Mid tone
  60: string;
  70: string;
  80: string;
  90: string;
  95: string;
  99: string;   // Near white
  100: string;  // White
}

// Basic color token
export interface ColorToken {
  value: string;
  meaning: string;
  usage: string[];
}

// Color palette for contextual themes
export interface ColorPalette {
  primary: string;
  secondary: string;
  surface: string;
  background: string;
  accent: string;
  mood: string; // Special mood color for context
}

// Typography tokens following Material 3 type scale
export interface TypographyTokens {
  fontFamily: {
    brand: string;
    default: string;
    mono: string;
  };
  
  typeScale: {
    displayLarge: TypeStyle;
    displayMedium: TypeStyle;
    displaySmall: TypeStyle;
    headlineLarge: TypeStyle;
    headlineMedium: TypeStyle;
    headlineSmall: TypeStyle;
    titleLarge: TypeStyle;
    titleMedium: TypeStyle;
    titleSmall: TypeStyle;
    labelLarge: TypeStyle;
    labelMedium: TypeStyle;
    labelSmall: TypeStyle;
    bodyLarge: TypeStyle;
    bodyMedium: TypeStyle;
    bodySmall: TypeStyle;
  };
}

export interface TypeStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
}

// Spacing tokens based on 8px grid
export interface SpacingTokens {
  unit: number;
  scale: {
    xxs: number;  // 4px
    xs: number;   // 8px
    sm: number;   // 12px
    md: number;   // 16px
    lg: number;   // 24px
    xl: number;   // 32px
    xxl: number;  // 48px
    xxxl: number; // 64px
  };
}

// Shape tokens for corner radius
export interface ShapeTokens {
  corner: {
    none: number;      // 0px
    extraSmall: number; // 4px
    small: number;      // 8px
    medium: number;     // 12px
    large: number;      // 16px
    extraLarge: number; // 28px
    full: string;       // 50%
  };
}

// Motion tokens for animations
export interface MotionTokens {
  duration: {
    short1: number; // 50ms
    short2: number; // 100ms
    short3: number; // 150ms
    short4: number; // 200ms
    medium1: number; // 250ms
    medium2: number; // 300ms
    medium3: number; // 350ms
    medium4: number; // 400ms
    long1: number; // 450ms
    long2: number; // 500ms
    long3: number; // 550ms
    long4: number; // 600ms
    extraLong1: number; // 700ms
    extraLong2: number; // 800ms
    extraLong3: number; // 900ms
    extraLong4: number; // 1000ms
  };
  
  easing: {
    standard: string;
    standardAccelerate: string;
    standardDecelerate: string;
    emphasized: string;
    emphasizedAccelerate: string;
    emphasizedDecelerate: string;
    legacy: string;
    legacyAccelerate: string;
    legacyDecelerate: string;
    
    // Framer Motion compatible easing values
    framer?: {
      standard: number[];
      standardAccelerate: number[];
      standardDecelerate: number[];
      emphasized: number[];
      emphasizedAccelerate: number[];
      emphasizedDecelerate: number[];
      legacy: number[];
      legacyAccelerate: number[];
      legacyDecelerate: number[];
    };
  };
}

// Elevation tokens for depth
export interface ElevationTokens {
  level0: ElevationLevel;
  level1: ElevationLevel;
  level2: ElevationLevel;
  level3: ElevationLevel;
  level4: ElevationLevel;
  level5: ElevationLevel;
}

export interface ElevationLevel {
  value: number;
  shadow: string;
  overlay?: string;
}

// State layer tokens for interactive states
export interface StateTokens {
  opacity: {
    hover: number;
    focus: number;
    pressed: number;
    dragged: number;
    disabled: number;
  };
}

// Default Material You tokens implementation
export const defaultMaterialYouTokens: MaterialYouTokens = {
  colors: {
    source: '#2DD4BF', // Default source color (fresh teal)
    
    primary: {
      light: generateTonalPalette('#2DD4BF'),
      dark: generateTonalPalette('#2DD4BF', true),
    },
    
    secondary: {
      light: generateTonalPalette('#F59E0B'),
      dark: generateTonalPalette('#F59E0B', true),
    },
    
    tertiary: {
      light: generateTonalPalette('#EC4899'),
      dark: generateTonalPalette('#EC4899', true),
    },
    
    error: {
      value: '#BA1A1A',
      onColor: '#FFFFFF',
      container: '#FFDAD6',
      onContainer: '#410002',
    },
    
    neutral: {
      light: generateTonalPalette('#787579'),
      dark: generateTonalPalette('#787579', true),
    },
    
    neutralVariant: {
      light: generateTonalPalette('#787579'),
      dark: generateTonalPalette('#787579', true),
    },
    
    semantic: {
      fresh: {
        value: '#2DD4BF',
        meaning: 'Freshness, health, vitality',
        usage: ['Fresh products', 'Health indicators', 'Success states'],
      },
      warm: {
        value: '#F59E0B',
        meaning: 'Comfort, appetite, warmth',
        usage: ['Cooked meals', 'Comfort food', 'Recipe warmth'],
      },
      social: {
        value: '#EC4899',
        meaning: 'Sharing, community, joy',
        usage: ['Social features', 'Sharing', 'Community'],
      },
      healthy: {
        value: '#10B981',
        meaning: 'Nutrition, wellness, balance',
        usage: ['Nutrition info', 'Health scores', 'Dietary goals'],
      },
      expired: {
        value: '#EF4444',
        meaning: 'Expiration, warning, attention',
        usage: ['Expired items', 'Warnings', 'Critical alerts'],
      },
    },
    
    contextual: {
      breakfast: {
        primary: '#FCD34D',
        secondary: '#FED7AA',
        surface: '#FFFBEB',
        background: '#FEFCE8',
        accent: '#F59E0B',
        mood: 'energetic',
      },
      lunch: {
        primary: '#10B981',
        secondary: '#86EFAC',
        surface: '#F0FDF4',
        background: '#ECFDF5',
        accent: '#059669',
        mood: 'balanced',
      },
      dinner: {
        primary: '#8B5CF6',
        secondary: '#C4B5FD',
        surface: '#F5F3FF',
        background: '#FAF5FF',
        accent: '#7C3AED',
        mood: 'relaxed',
      },
      snack: {
        primary: '#EC4899',
        secondary: '#FBCFE8',
        surface: '#FDF2F8',
        background: '#FEFEFE',
        accent: '#DB2777',
        mood: 'playful',
      },
      shopping: {
        primary: '#3B82F6',
        secondary: '#93C5FD',
        surface: '#EFF6FF',
        background: '#F0F9FF',
        accent: '#2563EB',
        mood: 'focused',
      },
      cooking: {
        primary: '#EA580C',
        secondary: '#FED7AA',
        surface: '#FFF7ED',
        background: '#FFFBEB',
        accent: '#DC2626',
        mood: 'active',
      },
    },
  },
  
  typography: {
    fontFamily: {
      brand: Platform.select({
        ios: '-apple-system, SF Pro Display',
        android: 'Google Sans, Roboto',
        default: 'Inter, system-ui',
      }),
      default: Platform.select({
        ios: '-apple-system, SF Pro Text',
        android: 'Roboto',
        default: 'Inter, system-ui',
      }),
      mono: Platform.select({
        ios: 'SF Mono',
        android: 'Roboto Mono',
        default: 'JetBrains Mono, monospace',
      }),
    },
    
    typeScale: {
      displayLarge: {
        fontFamily: 'brand',
        fontSize: 57,
        fontWeight: 400,
        lineHeight: 64,
        letterSpacing: -0.25,
      },
      displayMedium: {
        fontFamily: 'brand',
        fontSize: 45,
        fontWeight: 400,
        lineHeight: 52,
        letterSpacing: 0,
      },
      displaySmall: {
        fontFamily: 'brand',
        fontSize: 36,
        fontWeight: 400,
        lineHeight: 44,
        letterSpacing: 0,
      },
      headlineLarge: {
        fontFamily: 'brand',
        fontSize: 32,
        fontWeight: 400,
        lineHeight: 40,
        letterSpacing: 0,
      },
      headlineMedium: {
        fontFamily: 'brand',
        fontSize: 28,
        fontWeight: 400,
        lineHeight: 36,
        letterSpacing: 0,
      },
      headlineSmall: {
        fontFamily: 'default',
        fontSize: 24,
        fontWeight: 400,
        lineHeight: 32,
        letterSpacing: 0,
      },
      titleLarge: {
        fontFamily: 'default',
        fontSize: 22,
        fontWeight: 400,
        lineHeight: 28,
        letterSpacing: 0,
      },
      titleMedium: {
        fontFamily: 'default',
        fontSize: 16,
        fontWeight: 500,
        lineHeight: 24,
        letterSpacing: 0.15,
      },
      titleSmall: {
        fontFamily: 'default',
        fontSize: 14,
        fontWeight: 500,
        lineHeight: 20,
        letterSpacing: 0.1,
      },
      labelLarge: {
        fontFamily: 'default',
        fontSize: 14,
        fontWeight: 500,
        lineHeight: 20,
        letterSpacing: 0.1,
      },
      labelMedium: {
        fontFamily: 'default',
        fontSize: 12,
        fontWeight: 500,
        lineHeight: 16,
        letterSpacing: 0.5,
      },
      labelSmall: {
        fontFamily: 'default',
        fontSize: 11,
        fontWeight: 500,
        lineHeight: 16,
        letterSpacing: 0.5,
      },
      bodyLarge: {
        fontFamily: 'default',
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 24,
        letterSpacing: 0.5,
      },
      bodyMedium: {
        fontFamily: 'default',
        fontSize: 14,
        fontWeight: 400,
        lineHeight: 20,
        letterSpacing: 0.25,
      },
      bodySmall: {
        fontFamily: 'default',
        fontSize: 12,
        fontWeight: 400,
        lineHeight: 16,
        letterSpacing: 0.4,
      },
    },
  },
  
  spacing: {
    unit: 8,
    scale: {
      xxs: 4,
      xs: 8,
      sm: 12,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
      xxxl: 64,
    },
  },
  
  shape: {
    corner: {
      none: 0,
      extraSmall: 4,
      small: 8,
      medium: 12,
      large: 16,
      extraLarge: 28,
      full: '50%',
    },
  },
  
  motion: {
    duration: {
      short1: 50,
      short2: 100,
      short3: 150,
      short4: 200,
      medium1: 250,
      medium2: 300,
      medium3: 350,
      medium4: 400,
      long1: 450,
      long2: 500,
      long3: 550,
      long4: 600,
      extraLong1: 700,
      extraLong2: 800,
      extraLong3: 900,
      extraLong4: 1000,
    },
    
    easing: {
      // CSS cubic-bezier strings for CSS animations
      standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      standardAccelerate: 'cubic-bezier(0.3, 0.0, 1.0, 1.0)',
      standardDecelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1.0)',
      emphasized: 'cubic-bezier(0.2, 0.0, 0.0, 1.0)',
      emphasizedAccelerate: 'cubic-bezier(0.3, 0.0, 0.8, 0.15)',
      emphasizedDecelerate: 'cubic-bezier(0.05, 0.7, 0.1, 1.0)',
      legacy: 'cubic-bezier(0.4, 0.0, 1.0, 1.0)',
      legacyAccelerate: 'cubic-bezier(0.0, 0.0, 1.0, 1.0)',
      legacyDecelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1.0)',
      
      // Framer Motion compatible arrays
      framer: {
        standard: [0.4, 0.0, 0.2, 1],
        standardAccelerate: [0.3, 0.0, 1.0, 1.0],
        standardDecelerate: [0.0, 0.0, 0.2, 1.0],
        emphasized: [0.2, 0.0, 0.0, 1.0],
        emphasizedAccelerate: [0.3, 0.0, 0.8, 0.15],
        emphasizedDecelerate: [0.05, 0.7, 0.1, 1.0],
        legacy: [0.4, 0.0, 1.0, 1.0],
        legacyAccelerate: [0.0, 0.0, 1.0, 1.0],
        legacyDecelerate: [0.0, 0.0, 0.2, 1.0],
      },
    },
  },
  
  elevation: {
    level0: {
      value: 0,
      shadow: 'none',
    },
    level1: {
      value: 1,
      shadow: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
      overlay: 'rgba(103, 80, 164, 0.05)',
    },
    level2: {
      value: 3,
      shadow: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
      overlay: 'rgba(103, 80, 164, 0.08)',
    },
    level3: {
      value: 6,
      shadow: '0px 4px 8px 3px rgba(0, 0, 0, 0.15), 0px 1px 3px rgba(0, 0, 0, 0.3)',
      overlay: 'rgba(103, 80, 164, 0.11)',
    },
    level4: {
      value: 8,
      shadow: '0px 6px 10px 4px rgba(0, 0, 0, 0.15), 0px 2px 3px rgba(0, 0, 0, 0.3)',
      overlay: 'rgba(103, 80, 164, 0.12)',
    },
    level5: {
      value: 12,
      shadow: '0px 8px 12px 6px rgba(0, 0, 0, 0.15), 0px 4px 4px rgba(0, 0, 0, 0.3)',
      overlay: 'rgba(103, 80, 164, 0.14)',
    },
  },
  
  state: {
    opacity: {
      hover: 0.08,
      focus: 0.12,
      pressed: 0.12,
      dragged: 0.16,
      disabled: 0.38,
    },
  },
};

// Helper function to generate tonal palette (simplified version)
function generateTonalPalette(baseColor: string, isDark = false): TonalPalette {
  // This is a simplified version. In production, use material-color-utilities
  return {
    0: '#000000',
    10: baseColor,
    20: baseColor,
    30: baseColor,
    40: baseColor,
    50: baseColor,
    60: baseColor,
    70: baseColor,
    80: baseColor,
    90: baseColor,
    95: baseColor,
    99: '#FFFFFF',
    100: '#FFFFFF',
  };
}

export default defaultMaterialYouTokens;