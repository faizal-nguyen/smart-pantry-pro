import { z } from 'zod';

/**
 * Client-side environment configuration with validation
 * Uses Zod for runtime validation of environment variables
 */

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  VITE_OPENAI_API_KEY: z.string().optional(),
  VITE_DEEPGRAM_API_KEY: z.string().optional(),
  VITE_GOOGLE_CLOUD_API_KEY: z.string().optional(),
  VITE_CLOUDINARY_CLOUD_NAME: z.string().optional(),
  VITE_CLOUDINARY_API_KEY: z.string().optional(),
  VITE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
});

// Parse and validate environment variables
function parseEnv() {
  try {
    return envSchema.parse({
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
      VITE_OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
      VITE_DEEPGRAM_API_KEY: import.meta.env.VITE_DEEPGRAM_API_KEY,
      VITE_GOOGLE_CLOUD_API_KEY: import.meta.env.VITE_GOOGLE_CLOUD_API_KEY,
      VITE_CLOUDINARY_CLOUD_NAME: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
      VITE_CLOUDINARY_API_KEY: import.meta.env.VITE_CLOUDINARY_API_KEY,
      VITE_ENV: import.meta.env.VITE_ENV,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => e.path.join('.')).join(', ');
      throw new Error(
        `❌ Missing or invalid environment variables: ${missingVars}\n\n` +
        `Please check your .env file and ensure all required variables are set.\n` +
        `See .env.example for reference.`
      );
    }
    throw error;
  }
}

export const env = parseEnv();

/**
 * Typed configuration object
 * Provides structured access to environment variables
 */
export const config = {
  supabase: {
    url: env.VITE_SUPABASE_URL,
    anonKey: env.VITE_SUPABASE_ANON_KEY,
  },
  openai: {
    apiKey: env.VITE_OPENAI_API_KEY,
    enabled: !!env.VITE_OPENAI_API_KEY,
  },
  deepgram: {
    apiKey: env.VITE_DEEPGRAM_API_KEY,
    enabled: !!env.VITE_DEEPGRAM_API_KEY,
  },
  googleCloud: {
    apiKey: env.VITE_GOOGLE_CLOUD_API_KEY,
    enabled: !!env.VITE_GOOGLE_CLOUD_API_KEY,
  },
  cloudinary: {
    cloudName: env.VITE_CLOUDINARY_CLOUD_NAME,
    apiKey: env.VITE_CLOUDINARY_API_KEY,
    enabled: !!(env.VITE_CLOUDINARY_CLOUD_NAME && env.VITE_CLOUDINARY_API_KEY),
  },
  environment: env.VITE_ENV,
  isDevelopment: env.VITE_ENV === 'development',
  isStaging: env.VITE_ENV === 'staging',
  isProduction: env.VITE_ENV === 'production',
} as const;

// Log configuration status in development (without exposing secrets)
if (config.isDevelopment) {
  console.log('🔧 Environment Configuration:', {
    environment: config.environment,
    supabase: '✅ Configured',
    openai: config.openai.enabled ? '✅ Enabled' : '⚠️ Disabled',
    deepgram: config.deepgram.enabled ? '✅ Enabled' : '⚠️ Disabled',
    googleCloud: config.googleCloud.enabled ? '✅ Enabled' : '⚠️ Disabled',
    cloudinary: config.cloudinary.enabled ? '✅ Enabled' : '⚠️ Disabled',
  });
}
