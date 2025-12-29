import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase.js';

// Environment variables - CRITICAL: Use correct keys for security
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

// Validate required configuration
if (!supabaseUrl) {
  throw new Error('SUPABASE_URL is required');
}

if (!supabaseAnonKey) {
  throw new Error('SUPABASE_ANON_KEY is required');
}

/**
 * Admin Supabase client with service role key
 * WARNING: This client bypasses Row Level Security (RLS)
 * ONLY use for admin operations that require unrestricted access
 * Never use this for user-scoped operations!
 */
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Create a user-scoped Supabase client with JWT token
 * This client enforces Row Level Security (RLS) policies
 * Use this for all user-scoped operations to ensure data isolation
 */
export function createUserSupabaseClient(token: string) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
