import { z } from 'zod';

/**
 * Client-side environment configuration with validation.
 *
 * RULE (PRP-220.02): no secret API key may live here. Anything prefixed
 * with VITE_ ends up in the client bundle and must be considered public.
 *
 * AI / transcription / media-secret keys live ONLY in apps/api/.env and
 * are accessed by the client through `src/lib/api.ts` against the
 * authenticated /api/* endpoints.
 */

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  VITE_API_BASE_URL: z.string().optional(),
  VITE_CLOUDINARY_CLOUD_NAME: z.string().optional(),
  VITE_CLOUDINARY_API_KEY: z.string().optional(),
  VITE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
});

function parseEnv() {
  try {
    return envSchema.parse({
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      VITE_CLOUDINARY_CLOUD_NAME: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
      VITE_CLOUDINARY_API_KEY: import.meta.env.VITE_CLOUDINARY_API_KEY,
      VITE_ENV: import.meta.env.VITE_ENV,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => e.path.join('.')).join(', ');
      throw new Error(
        `❌ Missing or invalid environment variables: ${missingVars}\n\n` +
        `Please check your .env.local and ensure all required variables are set.\n` +
        `See .env.example for reference.`
      );
    }
    throw error;
  }
}

export const env = parseEnv();

export const config = {
  supabase: {
    url: env.VITE_SUPABASE_URL,
    anonKey: env.VITE_SUPABASE_ANON_KEY,
  },
  api: {
    baseUrl: env.VITE_API_BASE_URL ?? '',
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

if (config.isDevelopment) {
  console.log('🔧 Environment Configuration:', {
    environment: config.environment,
    supabase: '✅ Configured',
    api: config.api.baseUrl ? `→ ${config.api.baseUrl}` : '→ /api (Vite proxy)',
    cloudinary: config.cloudinary.enabled ? '✅ Public credentials' : '⚠️ Disabled',
  });
}
