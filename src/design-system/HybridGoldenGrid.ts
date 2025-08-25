/**
 * Hybrid Golden-8px Grid System
 * Combines Mathematical Golden Ratio with practical 8px grid for optimal layout harmony
 * Based on PRP-022-Layout-Optimization specification
 */

export class HybridGoldenGrid {
  private static readonly PHI = 1.618033988749;
  private static readonly BASE_UNIT = 8; // Maintains compatibility with design systems
  
  /**
   * Generates hybrid grid system combining golden ratio proportions with 8px base
   */
  static generateHybridGrid(viewportWidth: number, viewportHeight: number) {
    return {
      // Base 8px for standard components
      baseGrid: {
        unit: this.BASE_UNIT,
        scale: [0, 0.5, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48],
        spacing: {
          xxs: this.BASE_UNIT * 0.5,  // 4px
          xs: this.BASE_UNIT,         // 8px
          sm: this.BASE_UNIT * 1.5,   // 12px
          md: this.BASE_UNIT * 2,     // 16px
          lg: this.BASE_UNIT * 3,     // 24px
          xl: this.BASE_UNIT * 4,     // 32px
          xxl: this.BASE_UNIT * 6,    // 48px
          xxxl: this.BASE_UNIT * 8,   // 64px
        },
      },
      
      // Golden ratio for macro proportions
      goldenProportions: {
        sections: {
          primary: Math.round(viewportHeight * 0.618), // Hero adaptive
          secondary: Math.round(viewportHeight * 0.382),
          majorThird: Math.round(viewportHeight * 0.618 * 0.618), // Nested golden ratio
        },
        columns: {
          wide: Math.round(12 / this.PHI), // ~7 columns
          narrow: 12 - Math.round(12 / this.PHI), // ~5 columns
          golden: {
            primary: Math.round(12 * 0.618), // ~7.4 columns
            secondary: Math.round(12 * 0.382), // ~4.6 columns
          },
        }
      },
      
      // Hybrid breakpoints (standard + Fibonacci)
      breakpoints: {
        // Standard industry breakpoints
        xs: 320,   // Standard mobile min
        sm: 768,   // Standard tablet
        md: 1024,  // Standard desktop
        lg: 1440,  // Standard wide
        xl: 1920,  // Standard ultra-wide
        
        // Fibonacci enhancements for fine-tuning
        fibonacci: {
          mobile: 377,    // Fine mobile breakpoint
          tablet: 610,    // Fine tablet breakpoint
          desktop: 987,   // Fine desktop breakpoint
          wide: 1597,     // Fine wide breakpoint
        },
      },
      
      // Touch zones platform-adaptive
      touchTargets: this.calculateAdaptiveTouchZones(),
      
      // Container constraints based on golden ratio
      containers: this.calculateGoldenContainers(viewportWidth),
    };
  }
  
  /**
   * Calculates platform-adaptive touch zones combining golden ratio with platform minimums
   */
  private static calculateAdaptiveTouchZones() {
    const platform = this.detectPlatform();
    const goldenMinimum = this.BASE_UNIT * 5.5; // ~44px (golden-derived)
    
    return {
      minimum: Math.max(
        goldenMinimum,
        platform === 'ios' ? 44 : 48 // Respect platform guidelines
      ),
      comfortable: Math.round(goldenMinimum * this.PHI), // ~71px
      generous: Math.round(goldenMinimum * this.PHI * this.PHI), // ~115px
      
      // Context-specific touch zones
      contextual: {
        cooking: Math.round(goldenMinimum * this.PHI * 1.1), // Larger for cooking context
        shopping: goldenMinimum, // Standard for shopping
        browsing: Math.round(goldenMinimum * 0.9), // Slightly smaller for dense content
      },
    };
  }
  
  /**
   * Calculates golden ratio-based container widths for content areas
   */
  private static calculateGoldenContainers(viewportWidth: number) {
    const maxContentWidth = Math.min(viewportWidth * 0.95, 1440); // Never exceed 95% or 1440px
    
    return {
      // Golden ratio content widths
      primary: Math.round(maxContentWidth * 0.618),   // Main content area
      secondary: Math.round(maxContentWidth * 0.382), // Sidebar/secondary content
      
      // Nested golden proportions for complex layouts
      nested: {
        major: Math.round(maxContentWidth * 0.618 * 0.618), // ~38.2%
        minor: Math.round(maxContentWidth * 0.618 * 0.382), // ~23.6%
      },
      
      // Full-width constraints
      full: maxContentWidth,
      wide: Math.round(maxContentWidth * 0.85),
      narrow: Math.round(maxContentWidth * 0.618),
    };
  }
  
  /**
   * Detects current platform for platform-specific optimizations
   */
  private static detectPlatform(): 'ios' | 'android' | 'web' {
    if (typeof window === 'undefined') return 'web';
    
    const userAgent = window.navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod|ios/.test(userAgent)) {
      return 'ios';
    } else if (/android/.test(userAgent)) {
      return 'android';
    }
    
    return 'web';
  }
  
  /**
   * Calculates optimal spacing for given context and density
   */
  static calculateContextualSpacing(
    context: 'cooking' | 'shopping' | 'browsing',
    density: 'low' | 'medium' | 'high'
  ) {
    const baseSpacing = this.BASE_UNIT;
    
    // Context multipliers
    const contextMultiplier = {
      cooking: 1.2,     // More space for cooking interactions
      shopping: 1.0,    // Standard spacing for shopping
      browsing: 0.9,    // Denser for content browsing
    }[context];
    
    // Density multipliers
    const densityMultiplier = {
      low: 1.3,     // More spacious
      medium: 1.0,  // Standard
      high: 0.8,    // More compact
    }[density];
    
    const goldenMultiplier = this.PHI / 2; // Apply golden ratio influence
    
    return Math.round(baseSpacing * contextMultiplier * densityMultiplier * goldenMultiplier);
  }
  
  /**
   * Generates CSS custom properties for the hybrid grid system
   */
  static generateCSSProperties(viewportWidth: number, viewportHeight: number) {
    const grid = this.generateHybridGrid(viewportWidth, viewportHeight);
    
    return {
      // Base spacing units
      '--spacing-unit': `${grid.baseGrid.unit}px`,
      '--spacing-xxs': `${grid.baseGrid.spacing.xxs}px`,
      '--spacing-xs': `${grid.baseGrid.spacing.xs}px`,
      '--spacing-sm': `${grid.baseGrid.spacing.sm}px`,
      '--spacing-md': `${grid.baseGrid.spacing.md}px`,
      '--spacing-lg': `${grid.baseGrid.spacing.lg}px`,
      '--spacing-xl': `${grid.baseGrid.spacing.xl}px`,
      '--spacing-xxl': `${grid.baseGrid.spacing.xxl}px`,
      '--spacing-xxxl': `${grid.baseGrid.spacing.xxxl}px`,
      
      // Golden ratio proportions
      '--golden-primary-section': `${grid.goldenProportions.sections.primary}px`,
      '--golden-secondary-section': `${grid.goldenProportions.sections.secondary}px`,
      '--golden-major-third': `${grid.goldenProportions.sections.majorThird}px`,
      
      // Column proportions
      '--golden-wide-columns': grid.goldenProportions.columns.wide,
      '--golden-narrow-columns': grid.goldenProportions.columns.narrow,
      
      // Touch targets
      '--touch-minimum': `${grid.touchTargets.minimum}px`,
      '--touch-comfortable': `${grid.touchTargets.comfortable}px`,
      '--touch-generous': `${grid.touchTargets.generous}px`,
      
      // Container widths
      '--container-primary': `${grid.containers.primary}px`,
      '--container-secondary': `${grid.containers.secondary}px`,
      '--container-full': `${grid.containers.full}px`,
      '--container-wide': `${grid.containers.wide}px`,
      '--container-narrow': `${grid.containers.narrow}px`,
      
      // Fibonacci breakpoints
      '--bp-fibonacci-mobile': `${grid.breakpoints.fibonacci.mobile}px`,
      '--bp-fibonacci-tablet': `${grid.breakpoints.fibonacci.tablet}px`,
      '--bp-fibonacci-desktop': `${grid.breakpoints.fibonacci.desktop}px`,
      '--bp-fibonacci-wide': `${grid.breakpoints.fibonacci.wide}px`,
    };
  }
  
  /**
   * Utility method to get golden ratio multiplied value
   */
  static goldenMultiply(value: number, power: number = 1): number {
    return Math.round(value * Math.pow(this.PHI, power));
  }
  
  /**
   * Utility method to get golden ratio divided value
   */
  static goldenDivide(value: number, power: number = 1): number {
    return Math.round(value / Math.pow(this.PHI, power));
  }
}

export default HybridGoldenGrid;