/**
 * The photo the owner kept on each product (grocery photos), as short-lived
 * signed URLs: the bucket is private. Products without a photo are absent.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAgentDbInvalidation } from '@/lib/agentEvents';

const SIGNED_URL_SECONDS = 60 * 60;
// Refreshed well before the signed URLs expire.
const STALE_MS = 15 * 60 * 1000;

async function readProductPhotos(productIds: string[]): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('user_product_photos').select('product_id, photo_path').in('product_id', productIds);
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return new Map();
  const { data: signed, error: signError } = await supabase.storage.from('grocery-photos')
    .createSignedUrls([...new Set(rows.map(row => row.photo_path))], SIGNED_URL_SECONDS);
  if (signError) throw signError;
  const urls = new Map((signed ?? []).flatMap(entry => (entry.path && entry.signedUrl ? [[entry.path, entry.signedUrl] as const] : [])));
  return new Map(rows.flatMap(row => {
    const url = urls.get(row.photo_path);
    return url ? [[row.product_id, url] as const] : [];
  }));
}

export function useProductPhotos(productIds: readonly string[]): Map<string, string> {
  const ids = [...new Set(productIds)].sort();
  const query = useQuery({
    queryKey: ['product-photos', ids],
    queryFn: () => readProductPhotos(ids),
    enabled: ids.length > 0,
    staleTime: STALE_MS,
  });
  // A photo add may give an existing product a new photo.
  useAgentDbInvalidation(['inventory'], () => query.refetch());
  return query.data ?? new Map();
}
