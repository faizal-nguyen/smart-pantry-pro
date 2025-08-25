/**
 * Motion utility functions for framer-motion compatibility
 */

/**
 * Converts CSS cubic-bezier strings to framer-motion compatible format
 * @param cssEasing - CSS easing string like "cubic-bezier(0.4, 0.0, 0.2, 1)"
 * @returns Array of numbers for framer-motion or predefined easing string
 */
export function convertCubicBezierToFramer(cssEasing: string): number[] | string {
  // Handle cubic-bezier strings
  if (cssEasing.startsWith('cubic-bezier(')) {
    const match = cssEasing.match(/cubic-bezier\(([^)]+)\)/);
    if (match) {
      const values = match[1].split(',').map(num => parseFloat(num.trim()));
      if (values.length === 4 && values.every(v => !isNaN(v))) {
        return values;
      }
    }
  }
  
  // Map common Material Design easings to framer-motion presets
  const easingMap: Record<string, string> = {
    'cubic-bezier(0.4, 0.0, 0.2, 1)': 'easeInOut',      // Material standard
    'cubic-bezier(0.3, 0.0, 1.0, 1.0)': 'easeIn',       // Material accelerate
    'cubic-bezier(0.0, 0.0, 0.2, 1.0)': 'easeOut',      // Material decelerate
    'cubic-bezier(0.2, 0.0, 0.0, 1.0)': 'easeInOut',    // Material emphasized
    'linear': 'linear',
    'ease': 'easeInOut',
    'ease-in': 'easeIn',
    'ease-out': 'easeOut',
    'ease-in-out': 'easeInOut',
  };
  
  // Return mapped value or default to easeInOut
  return easingMap[cssEasing] || 'easeInOut';
}

/**
 * Gets framer-motion compatible easing from Material You tokens
 * @param tokenEasing - Easing value from Material You tokens
 * @returns Framer-motion compatible easing
 */
export function getFramerEasing(tokenEasing: string | number[] | undefined): number[] | string {
  if (!tokenEasing) {
    return 'easeInOut';
  }
  
  // If already an array, return as-is
  if (Array.isArray(tokenEasing)) {
    return tokenEasing;
  }
  
  // Convert string to framer-motion format
  return convertCubicBezierToFramer(tokenEasing);
}