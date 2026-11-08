import { supabase } from '@/integrations/supabase/client';

// unaccent keeps ligatures and these letters apart from Unicode decomposition: map them the same way.
const UNACCENT: Record<string, string> = { œ: 'oe', Œ: 'OE', æ: 'ae', Æ: 'AE', ß: 'ss', ø: 'o', Ø: 'O', ł: 'l', Ł: 'L', đ: 'd', Đ: 'D' };

/** The products.normalized_name the database derives: lower(unaccent(trim(name))). */
export function productNameKey(name: string): string {
  return name.trim().replace(/[œŒæÆßøØłŁđĐ]/g, letter => UNACCENT[letter]).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
}

export interface ProductRow { id: string; name: string; [column: string]: unknown }

async function findByKey(key: string): Promise<ProductRow | null> {
  const { data, error } = await supabase.from('products').select('*').eq('normalized_name', key).maybeSingle();
  if (error) throw error;
  return data as ProductRow | null;
}

/**
 * The shared product of this name, accents and case aside, created when it is new.
 * An ilike lookup missed « Crème fraîche » for « Creme fraiche », and the insert then
 * hit the unique normalized name (audit 2026-11-07).
 */
export async function findOrCreateProduct(input: { name: string; category: string; unit: string }): Promise<ProductRow> {
  const name = input.name.trim();
  const key = productNameKey(name);
  const existing = await findByKey(key);
  if (existing) return existing;
  const { data, error } = await supabase.from('products').insert({ name, category: input.category, unit_type: input.unit }).select().single();
  if (!error && data) return data as ProductRow;
  if (error?.code === '23505') {
    // Created meanwhile, or under a key this function does not derive exactly.
    const created = await findByKey(key);
    if (created) return created;
    throw new Error('Ce produit existe déjà sous un nom proche. Choisis-le dans la liste.');
  }
  throw error ?? new Error('Création du produit non confirmée.');
}
