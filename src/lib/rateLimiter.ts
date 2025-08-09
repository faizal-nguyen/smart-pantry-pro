import { createClient } from '@supabase/supabase-js';
import { RateLimitConfig } from '@/config/security';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class RateLimiter {
  private cache: Map<string, { count: number; resetTime: number }> = new Map();

  /**
   * Check if request is within rate limit
   */
  async checkLimit(key: string, config: RateLimitConfig): Promise<boolean> {
    const now = Date.now();
    const fullKey = `${config.keyPrefix}_${key}`;

    // Try to get from cache first
    let record = this.cache.get(fullKey);

    if (!record) {
      // Try to get from database
      const { data } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('key', fullKey)
        .single();

      if (data && data.reset_time > now) {
        record = {
          count: data.request_count,
          resetTime: data.reset_time
        };
      }
    }

    // If no record or expired, create new
    if (!record || record.resetTime <= now) {
      record = {
        count: 0,
        resetTime: now + config.windowMs
      };
    }

    // Check if limit exceeded
    if (record.count >= config.maxRequests) {
      return false;
    }

    // Increment count
    record.count++;
    
    // Update cache
    this.cache.set(fullKey, record);

    // Update database (async, don't wait)
    this.updateDatabase(fullKey, record).catch(console.error);

    return true;
  }

  /**
   * Get reset time for a key
   */
  async getResetTime(key: string): Promise<number> {
    const record = this.cache.get(key);
    if (record) {
      return record.resetTime;
    }

    const { data } = await supabase
      .from('rate_limits')
      .select('reset_time')
      .eq('key', key)
      .single();

    return data?.reset_time || Date.now();
  }

  /**
   * Update database with rate limit info
   */
  private async updateDatabase(
    key: string, 
    record: { count: number; resetTime: number }
  ): Promise<void> {
    await supabase.from('rate_limits').upsert({
      key,
      request_count: record.count,
      reset_time: record.resetTime,
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Clean up expired entries (run periodically)
   */
  async cleanup(): Promise<void> {
    const now = Date.now();

    // Clean cache
    for (const [key, record] of this.cache.entries()) {
      if (record.resetTime <= now) {
        this.cache.delete(key);
      }
    }

    // Clean database
    await supabase
      .from('rate_limits')
      .delete()
      .lt('reset_time', now);
  }

  /**
   * Reset limits for a specific key
   */
  async reset(key: string): Promise<void> {
    this.cache.delete(key);
    await supabase
      .from('rate_limits')
      .delete()
      .eq('key', key);
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Clean up expired entries every hour
if (typeof window === 'undefined') {
  setInterval(() => {
    rateLimiter.cleanup().catch(console.error);
  }, 60 * 60 * 1000);
}

/**
 * Simple rate limiter handler for Vercel Functions
 */
export async function rateLimiterHandler(req: any, res: any): Promise<{
  allowed: boolean;
  retryAfter?: number;
}> {
  try {
    const clientIP = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.connection?.remoteAddress || 
                     'unknown';
    
    const key = `api_${clientIP}`;
    const config = {
      keyPrefix: 'social_parser',
      maxRequests: 100, // 100 requests per window
      windowMs: 60 * 60 * 1000 // 1 hour
    };

    const allowed = await rateLimiter.checkLimit(key, config);
    
    if (!allowed) {
      const resetTime = await rateLimiter.getResetTime(key);
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      
      return {
        allowed: false,
        retryAfter
      };
    }

    return { allowed: true };

  } catch (error) {
    console.error('Rate limiter error:', error);
    // On error, allow the request to proceed
    return { allowed: true };
  }
}