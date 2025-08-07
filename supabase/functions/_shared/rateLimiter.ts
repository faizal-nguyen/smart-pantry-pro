import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix: string; // Prefix for Redis-like key
}

export class RateLimiter {
  private supabase: any;
  private config: RateLimitConfig;

  constructor(supabaseUrl: string, supabaseServiceKey: string, config: RateLimitConfig) {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    this.config = config;
  }

  async checkLimit(userId: string, endpoint: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `${this.config.keyPrefix}:${endpoint}:${userId}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      // Get or create rate limit record
      const { data: existingRecord, error: fetchError } = await this.supabase
        .from('rate_limits')
        .select('*')
        .eq('key', key)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw fetchError;
      }

      // If no record exists or window expired, create/reset
      if (!existingRecord || existingRecord.window_start < windowStart) {
        const { error: upsertError } = await this.supabase
          .from('rate_limits')
          .upsert({
            key,
            window_start: now,
            request_count: 1,
            updated_at: new Date().toISOString()
          });

        if (upsertError) throw upsertError;

        return {
          allowed: true,
          remaining: this.config.maxRequests - 1,
          resetTime: now + this.config.windowMs
        };
      }

      // Check if limit exceeded
      if (existingRecord.request_count >= this.config.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: existingRecord.window_start + this.config.windowMs
        };
      }

      // Increment counter
      const { error: updateError } = await this.supabase
        .from('rate_limits')
        .update({
          request_count: existingRecord.request_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('key', key);

      if (updateError) throw updateError;

      return {
        allowed: true,
        remaining: this.config.maxRequests - existingRecord.request_count - 1,
        resetTime: existingRecord.window_start + this.config.windowMs
      };

    } catch (error) {
      console.error('Rate limiter error:', error);
      // On error, allow request but log warning
      return { allowed: true, remaining: -1, resetTime: 0 };
    }
  }
}

// Preset configurations for different API types
export const RateLimitPresets = {
  AI: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 50,
    keyPrefix: 'ai'
  },
  VISION: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 30,
    keyPrefix: 'vision'
  },
  EXTERNAL_API: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyPrefix: 'external'
  },
  SOCIAL_MEDIA: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
    keyPrefix: 'social'
  }
};