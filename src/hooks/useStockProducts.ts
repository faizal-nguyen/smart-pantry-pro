import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatShoppingQuantity } from '@/lib/shoppingChanges';

/** A product of the account's stock, with the amounts of its lots (« 1 contenant », « 250 ml »). */
export interface StockProduct { id: string; name: string; amounts: string[] }

interface LotRow { product_id: string | null; quantity: number | null; unit: string | null; product: { name: string | null } | null }

/** Lots grouped by product, sorted by name; a lot without product or name is left out. */
export function stockProducts(rows: LotRow[]): StockProduct[] {
  const byProduct = new Map<string, StockProduct>();
  for (const row of rows) {
    const name = row.product?.name?.trim();
    if (!row.product_id || !name) continue;
    const amount = row.quantity == null ? 'quantité à vérifier' : `${formatShoppingQuantity(Number(row.quantity))} ${row.unit ?? ''}`.trim();
    const known = byProduct.get(row.product_id);
    byProduct.set(row.product_id, known ? { ...known, amounts: [...known.amounts, amount] } : { id: row.product_id, name, amounts: [amount] });
  }
  return [...byProduct.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

/** PostgREST answers at most this many rows (max-rows), possibly fewer. */
const PAGE = 1000;

/** Every lot of the account: the next page starts after the rows actually read, until the count. */
async function readLots(owner: string): Promise<LotRow[]> {
  const rows: LotRow[] = [];
  for (;;) {
    const { data, error, count } = await supabase.from('inventory').select('id, product_id, quantity, unit, product:products(name)', { count: 'exact' })
      .eq('user_id', owner).order('id').range(rows.length, rows.length + PAGE - 1);
    if (error) throw error;
    const page = (data ?? []) as unknown as LotRow[];
    rows.push(...page);
    if (!page.length || rows.length >= (count ?? 0)) return rows;
  }
}

/** The products of the account's stock, read again each time a dialog opens (`enabled`). */
export function useStockProducts(owner: string, enabled: boolean) {
  return useQuery({
    queryKey: ['stock-products', owner],
    enabled,
    staleTime: 0,
    queryFn: async () => stockProducts(await readLots(owner)),
  });
}
