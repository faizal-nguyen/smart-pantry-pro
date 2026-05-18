import { z } from 'zod';

const EnvSchema = z.object({
  VIDEO_PROCESSOR_URL: z.string().url().optional(),
  INSTAGRAM_OEMBED_TOKEN: z.string().optional(),
  FACEBOOK_APP_TOKEN: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  LOG_LEVEL: z.enum(['debug','info','warn','error']).optional(),
  RATE_LIMIT_YT_MAX: z.coerce.number().int().positive().optional(),
  RATE_LIMIT_YT_WINDOW_MS: z.coerce.number().int().positive().optional(),
  MEDIA_STORAGE_BUCKET: z.string().min(1).optional(),
  MEDIA_MAX_MULTIPART_BYTES: z.coerce.number().int().positive().optional(),
  MEDIA_RIGHTS_POLICY_VERSION: z.string().min(1).optional(),
  // PRP-221 J4: HMAC secret for confirmation tokens. Must be ≥ 32 chars.
  // Optional in env so dev boots without it; the assistant router will
  // refuse to mount if it's absent at request time.
  ASSISTANT_HMAC_SECRET: z.string().min(32).optional(),
  ASSISTANT_AUDIO_MAX_BYTES: z.coerce.number().int().positive().optional(),
  // PRP-225 PR2: OpenFoodFacts client configuration. User-Agent is the
  // only field OFF actually requires per their reuse policy ; the
  // client refuses to call OFF in production if it's missing.
  OPENFOODFACTS_BASE_URL: z.string().url().optional(),
  OPENFOODFACTS_USER_AGENT: z.string().min(8).optional(),
  OPENFOODFACTS_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  OPENFOODFACTS_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().optional()
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // Do not crash in development; log a concise message
  const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
  // eslint-disable-next-line no-console
  console.warn(`[env] Environment validation warnings: ${issues}`);
}

export const env = (parsed.success ? parsed.data : (process.env as any)) as z.infer<typeof EnvSchema>;
