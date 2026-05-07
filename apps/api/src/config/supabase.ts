import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase.js';

/**
 * PRP-220.10: lazy clients.
 *
 * The previous version of this module validated SUPABASE_URL at import
 * time. That broke any boot path that imports a route module before
 * dotenv has run (e.g. jest globalSetup spawning node apps/api/dist
 * with whatever env happens to be inherited). We now defer the
 * validation + client construction to first use through a Proxy: the
 * `supabaseAdmin` symbol still looks like a Supabase client to
 * consumers, but the underlying instance is materialised on the first
 * property access — by which time process.env is fully populated.
 */

let _admin: SupabaseClient<Database> | null = null;

function buildAdminClient(): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';
  if (!url) throw new Error('SUPABASE_URL is required');
  if (!serviceKey) {
    // Anon-only fallback: keeps dev boots working when service key
    // hasn't been provided yet. Calls that need admin scope will
    // surface a 401/403 from Supabase, which is the right signal.
    console.warn('[supabase] SUPABASE_SERVICE_KEY missing — admin client falls back to anon scope.');
  }
  return createClient<Database>(url, serviceKey || process.env.SUPABASE_ANON_KEY || '', {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getAdminClient(): SupabaseClient<Database> {
  if (!_admin) _admin = buildAdminClient();
  return _admin;
}

/**
 * Admin Supabase client with service role key.
 * WARNING: This client bypasses Row Level Security (RLS).
 * ONLY use for admin operations that require unrestricted access.
 * Never use this for user-scoped operations!
 */
export const supabaseAdmin: SupabaseClient<Database> = new Proxy(
  {} as SupabaseClient<Database>,
  {
    get(_target, prop, receiver) {
      const client = getAdminClient();
      const value = Reflect.get(client as object, prop, receiver);
      return typeof value === 'function' ? value.bind(client) : value;
    },
  }
);

/**
 * Create a user-scoped Supabase client with JWT token.
 * This client enforces Row Level Security (RLS) policies.
 * Use this for all user-scoped operations to ensure data isolation.
 */
export function createUserSupabaseClient(token: string): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || '';
  if (!url) throw new Error('SUPABASE_URL is required');
  if (!anonKey) throw new Error('SUPABASE_ANON_KEY is required');
  return createClient<Database>(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
