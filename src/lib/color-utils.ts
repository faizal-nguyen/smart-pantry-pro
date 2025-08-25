/**
 * Color utility functions for validation and conversion
 */

/**
 * Validates a hex color string
 * @param hex - Color string to validate
 * @returns boolean indicating if valid hex color
 */
export function isValidHexColor(hex: string): boolean {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8})$/;
  return hexRegex.test(hex);
}

/**
 * Ensures a hex color string has the # prefix
 * @param color - Color string that may or may not have # prefix
 * @returns Properly formatted hex color
 */
export function ensureHexPrefix(color: string): string {
  if (!color) return '#000000';
  
  // Remove any existing # to avoid duplication
  const cleanColor = color.replace(/^#/, '');
  
  // More flexible validation that handles various color formats
  // Accept 3, 6, or 8 digit hex values (8 for alpha channel)
  if (!/^[A-Fa-f0-9]{3}$|^[A-Fa-f0-9]{6}$|^[A-Fa-f0-9]{8}$/.test(cleanColor)) {
    console.warn(`Invalid hex color: ${color}, using fallback`);
    return '#000000';
  }
  
  // Expand 3-digit hex to 6-digit
  if (cleanColor.length === 3) {
    const expanded = cleanColor
      .split('')
      .map(char => char + char)
      .join('');
    return `#${expanded}`;
  }
  
  // Truncate 8-digit (ARGB) to 6-digit (RGB) if needed
  if (cleanColor.length === 8) {
    // Remove alpha channel from ARGB format
    return `#${cleanColor.slice(2)}`;
  }
  
  return `#${cleanColor}`;
}

/**
 * Safely converts a color value to ARGB format expected by Material Color Utilities
 * @param color - Hex color string
 * @returns Safe hex color for argbFromHex
 */
export function prepareColorForMaterialUtils(color: string): string {
  // Ensure valid hex format
  const hexColor = ensureHexPrefix(color);
  
  // Validate the result
  if (!isValidHexColor(hexColor)) {
    return '#2DD4BF'; // Default brand color as fallback
  }
  
  return hexColor;
}

/**
 * Converts a transparent-capable color to an opaque version
 * @param color - RGBA or hex color that might be transparent
 * @returns Opaque color string
 */
export function makeColorOpaque(color: string): string {
  // Handle "transparent" keyword
  if (color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
    return 'rgba(255, 255, 255, 0)'; // Use white with 0 alpha instead
  }
  
  // Handle rgba with low alpha
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    const [, r, g, b, a] = rgbaMatch;
    const alpha = parseFloat(a || '1');
    
    // If alpha is very low, return the color with minimal alpha to avoid "transparent"
    if (alpha < 0.01) {
      return `rgba(${r}, ${g}, ${b}, 0.01)`;
    }
    
    return color;
  }
  
  return color;
}

/**
 * Validates and sanitizes a color for animation
 * @param color - Color value to validate
 * @returns Animation-safe color value
 */
export function prepareColorForAnimation(color: string): string {
  // Replace "transparent" with a nearly transparent color
  if (color === 'transparent') {
    return 'rgba(0, 0, 0, 0.001)';
  }
  
  // Ensure color has proper format
  return makeColorOpaque(color);
}