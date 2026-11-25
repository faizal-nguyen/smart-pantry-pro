import { supabase } from '@/integrations/supabase/client';
import type { WasteEvent } from '@/lib/wasteSummary';

const COLUMNS = 'id,product_name,category,quantity,unit_type,reason,notes,estimated_cost_eur,occurred_at';
const PAGE_SIZE = 500;
const MAX_ROWS = 5000;

export type WasteLogFailure = 'read' | 'too-many' | 'delete';
const MESSAGES: Record<WasteLogFailure, string> = {
  read: 'Les pertes déclarées n’ont pas pu être lues.',
  'too-many': 'Trop de déclarations pour les compter ici.',
  delete: 'La déclaration n’a pas pu être supprimée.',
};

export class WasteLogError extends Error {
  constructor(readonly failure: WasteLogFailure) {
    super(MESSAGES[failure]);
    this.name = 'WasteLogError';
  }
}

const instant = (value: string) => {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
};
/** The display order does not depend on the server's: newest first, then by id, unreadable dates last. */
const newestFirst = (rows: WasteEvent[]) =>
  rows.sort((a, b) => instant(b.occurred_at) - instant(a.occurred_at) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));

/**
 * Every declared loss of the account, newest first, read page by page to the end (PRP V11-06,
 * section 5): a page that fails fails the whole read, so a partial total is never shown as complete.
 */
export async function readWasteLog(owner: string, { pageSize = PAGE_SIZE, maxRows = MAX_ROWS } = {}): Promise<WasteEvent[]> {
  const rows: WasteEvent[] = [];
  const seen = new Set<string>();
  // The offset advances by the rows received and the read stops on an empty page: a server that
  // caps its pages below `pageSize` is still read to the end, never taken for the last page.
  for (let from = 0; ;) {
    const { data, error } = await supabase
      .from('food_waste_events')
      .select(COLUMNS)
      .eq('user_id', owner)
      .order('occurred_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + pageSize - 1);
    if (error || !data) throw new WasteLogError('read');
    if (data.length === 0) return newestFirst(rows);
    const before = rows.length;
    for (const row of data as unknown as WasteEvent[]) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      rows.push(row);
    }
    // A full page of rows already seen means the range is not honoured: stop rather than loop.
    if (rows.length === before && data.length >= pageSize) throw new WasteLogError('read');
    if (rows.length > maxRows) throw new WasteLogError('too-many');
    from += data.length;
  }
}

/** Removes one declaration of the account from the log; the stock is not credited back. */
export async function deleteWasteEvent(owner: string, id: string): Promise<void> {
  const { error } = await supabase.from('food_waste_events').delete().eq('id', id).eq('user_id', owner);
  if (error) throw new WasteLogError('delete');
}
