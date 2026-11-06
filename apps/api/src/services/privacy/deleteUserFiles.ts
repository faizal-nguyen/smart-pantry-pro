import type { SupabaseClient } from '@supabase/supabase-js';

const PAGE = 1000;
const MAX_PAGES = 20;
const REMOVE_BATCH = 100;

interface StorageObject {
  bucket_id: string;
  name: string;
}

/**
 * Deletes every Storage file of a user, as listed by the SQL function
 * `list_user_storage_objects`: what they uploaded from the app, and what the
 * API stored for them under `users/<id>/`. Goes through the Storage API,
 * the only way that removes the file itself and not just its row.
 * Returns how many files were removed; throws if any removal fails.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function deleteUserFiles(admin: SupabaseClient<any, any, any>, userId: string): Promise<number> {
  let removed = 0;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, error } = await admin.rpc('list_user_storage_objects', { p_user: userId, p_limit: PAGE });
    if (error) throw error;
    const objects = (data ?? []) as StorageObject[];
    const byBucket = new Map<string, string[]>();
    for (const o of objects) byBucket.set(o.bucket_id, [...(byBucket.get(o.bucket_id) ?? []), o.name]);
    for (const [bucket, names] of byBucket) {
      for (let i = 0; i < names.length; i += REMOVE_BATCH) {
        const { error: removeError } = await admin.storage.from(bucket).remove(names.slice(i, i + REMOVE_BATCH));
        if (removeError) throw removeError;
      }
    }
    removed += objects.length;
    if (objects.length < PAGE) return removed;
  }
  // Files keep being listed after removal: stop rather than loop.
  throw new Error('USER_FILES_REMAINING');
}
