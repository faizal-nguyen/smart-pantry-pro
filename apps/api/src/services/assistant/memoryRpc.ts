import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase.js';
// Additive RPCs are locally validated while generated types await schema refresh.
export async function memoryRpc(client: SupabaseClient<Database>, name: string, args: Record<string, unknown>) {
  const rpc = client.rpc.bind(client) as unknown as (name: string, args: Record<string, unknown>) =>
    Promise<{ data: unknown; error: { message: string; code?: string } | null }>;
  return rpc(name, args);
}
