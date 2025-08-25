/**
 * Utility functions for handling and standardizing units
 */

export type Unit = 'g' | 'kg' | 'L' | 'mL' | 'unité' | 'unités';

export interface UnitConfig {
  singular: string;
  plural: string;
  abbreviation?: string;
  type: 'weight' | 'volume' | 'count';
}

export const UNIT_CONFIGS: Record<string, UnitConfig> = {
  // Weight units
  'g': { singular: 'gramme', plural: 'grammes', abbreviation: 'g', type: 'weight' },
  'gramme': { singular: 'gramme', plural: 'grammes', abbreviation: 'g', type: 'weight' },
  'grammes': { singular: 'gramme', plural: 'grammes', abbreviation: 'g', type: 'weight' },
  'kg': { singular: 'kilogramme', plural: 'kilogrammes', abbreviation: 'kg', type: 'weight' },
  'kilo': { singular: 'kilogramme', plural: 'kilogrammes', abbreviation: 'kg', type: 'weight' },
  'kilos': { singular: 'kilogramme', plural: 'kilogrammes', abbreviation: 'kg', type: 'weight' },
  'kilogramme': { singular: 'kilogramme', plural: 'kilogrammes', abbreviation: 'kg', type: 'weight' },
  'kilogrammes': { singular: 'kilogramme', plural: 'kilogrammes', abbreviation: 'kg', type: 'weight' },
  
  // Volume units
  'L': { singular: 'litre', plural: 'litres', abbreviation: 'L', type: 'volume' },
  'l': { singular: 'litre', plural: 'litres', abbreviation: 'L', type: 'volume' },
  'litre': { singular: 'litre', plural: 'litres', abbreviation: 'L', type: 'volume' },
  'litres': { singular: 'litre', plural: 'litres', abbreviation: 'L', type: 'volume' },
  'mL': { singular: 'millilitre', plural: 'millilitres', abbreviation: 'mL', type: 'volume' },
  'ml': { singular: 'millilitre', plural: 'millilitres', abbreviation: 'mL', type: 'volume' },
  'millilitre': { singular: 'millilitre', plural: 'millilitres', abbreviation: 'mL', type: 'volume' },
  'millilitres': { singular: 'millilitre', plural: 'millilitres', abbreviation: 'mL', type: 'volume' },
  'cl': { singular: 'centilitre', plural: 'centilitres', abbreviation: 'cl', type: 'volume' },
  'centilitre': { singular: 'centilitre', plural: 'centilitres', abbreviation: 'cl', type: 'volume' },
  'centilitres': { singular: 'centilitre', plural: 'centilitres', abbreviation: 'cl', type: 'volume' },
  
  // Count units
  'unité': { singular: 'unité', plural: 'unités', type: 'count' },
  'unités': { singular: 'unité', plural: 'unités', type: 'count' },
  'unite': { singular: 'unité', plural: 'unités', type: 'count' },
  'unites': { singular: 'unité', plural: 'unités', type: 'count' },
  'pièce': { singular: 'pièce', plural: 'pièces', type: 'count' },
  'pièces': { singular: 'pièce', plural: 'pièces', type: 'count' },
  'piece': { singular: 'pièce', plural: 'pièces', type: 'count' },
  'pieces': { singular: 'pièce', plural: 'pièces', type: 'count' },
};

/**
 * Standardize a unit string to its abbreviation or standard form
 */
export function standardizeUnit(unit: string | null | undefined): string {
  if (!unit) return 'unité';
  
  const normalized = unit.toLowerCase().trim();
  
  // Handle special cases
  if (normalized === 'unité(s)' || normalized === 'unite(s)') {
    return 'unité';
  }
  
  const config = UNIT_CONFIGS[normalized];
  if (config) {
    // Return abbreviation if available, otherwise singular form
    return config.abbreviation || config.singular;
  }
  
  // Default to the original unit if not found
  return unit;
}

/**
 * Get the display form of a unit based on quantity
 */
export function getUnitDisplay(unit: string | null | undefined, quantity: number): string {
  if (!unit) return quantity > 1 ? 'unités' : 'unité';
  
  const normalized = unit.toLowerCase().trim();
  const config = UNIT_CONFIGS[normalized];
  
  if (config) {
    // For abbreviations, always return the abbreviation
    if (config.abbreviation && (normalized === config.abbreviation || normalized === config.abbreviation.toLowerCase())) {
      return config.abbreviation;
    }
    
    // For full names, return singular or plural based on quantity
    return quantity > 1 ? config.plural : config.singular;
  }
  
  // Default behavior for unknown units
  return unit;
}

/**
 * Format quantity with unit for display
 */
export function formatQuantityWithUnit(quantity: number, unit: string | null | undefined): string {
  const unitDisplay = getUnitDisplay(unit, quantity);
  
  // For abbreviations, add a space
  const standardized = standardizeUnit(unit);
  const config = UNIT_CONFIGS[standardized];
  
  if (config?.abbreviation === unitDisplay) {
    return `${quantity} ${unitDisplay}`;
  }
  
  // For full words, add space
  return `${quantity} ${unitDisplay}`;
}

/**
 * Check if a unit is a weight unit
 */
export function isWeightUnit(unit: string | null | undefined): boolean {
  if (!unit) return false;
  const normalized = unit.toLowerCase().trim();
  const config = UNIT_CONFIGS[normalized];
  return config?.type === 'weight';
}

/**
 * Check if a unit is a volume unit
 */
export function isVolumeUnit(unit: string | null | undefined): boolean {
  if (!unit) return false;
  const normalized = unit.toLowerCase().trim();
  const config = UNIT_CONFIGS[normalized];
  return config?.type === 'volume';
}

/**
 * Check if a unit is a count unit
 */
export function isCountUnit(unit: string | null | undefined): boolean {
  if (!unit) return false;
  const normalized = unit.toLowerCase().trim();
  const config = UNIT_CONFIGS[normalized];
  return config?.type === 'count';
}