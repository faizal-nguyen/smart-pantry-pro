/**
 * Environment Variable Validation
 * Validates required environment variables at startup
 */

export interface EnvConfig {
  // OpenAI Configuration
  OPENAI_API_KEY?: string;
  VITE_OPENAI_API_KEY?: string;

  // Facebook/Instagram Configuration
  FACEBOOK_APP_ID?: string;
  FACEBOOK_APP_SECRET?: string;

  // Feature Flags
  ENABLE_INSTAGRAM_IMPORT?: boolean;
}

/**
 * Validate environment variables
 */
export function validateEnv(): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check OpenAI configuration
  if (!process.env.VITE_OPENAI_API_KEY) {
    warnings.push('⚠️ VITE_OPENAI_API_KEY not configured - AI features will be limited');
  }

  // Check Facebook/Instagram configuration
  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
    warnings.push('⚠️ Facebook credentials not configured - Instagram import will use manual mode');
  }

  // Log warnings in development
  if (process.env.NODE_ENV === 'development' && warnings.length > 0) {
    console.warn('Environment Configuration Warnings:');
    warnings.forEach(warning => console.warn(warning));
  }

  return {
    valid: true, // App can still run with warnings
    warnings
  };
}

/**
 * Get safe environment config
 */
export function getEnvConfig(): EnvConfig {
  return {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    VITE_OPENAI_API_KEY: process.env.VITE_OPENAI_API_KEY,
    FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
    FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,
    ENABLE_INSTAGRAM_IMPORT: process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET ? true : false,
  };
}

/**
 * Check if Instagram import is available
 */
export function isInstagramImportAvailable(): boolean {
  return !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);
}