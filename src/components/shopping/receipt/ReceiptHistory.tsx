/**
 * V11-01 E5b — the account's last receipts (read or applied, newest first). A receipt read but not
 * applied can be taken up again; it is kept 7 days after its reading.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ReceiptScanSummary } from '@smart/shared';
import { fetchReceiptHistory } from '@/services/receipts';
import { receiptAmount, receiptDay } from './receiptFormat';

export default function ReceiptHistory({ owner }: { owner: string }) {
  const [items, setItems] = useState<ReceiptScanSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetchReceiptHistory(owner, controller.signal).then(setItems).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [owner]);

  if (failed) return <p className="text-sm text-muted-foreground">L’historique des tickets ne peut pas être lu pour le moment.</p>;
  if (!items?.length) return null;
  return <section className="kitchen-receipt-history" aria-labelledby="receipt-history-title">
    <h2 id="receipt-history-title">Tickets récents</h2>
    <ul>
      {items.map(item => {
        const label = [receiptDay(item.purchased_on ?? item.created_at), item.store ?? 'Magasin non lu'].filter(Boolean).join(' · ');
        const details = [receiptAmount(item.total, item.currency), `${item.line_count} ligne${item.line_count > 1 ? 's' : ''}`].filter(Boolean).join(' · ');
        return <li key={item.id}>
          <span className="min-w-0"><span className="block font-medium break-words">{label}</span><span className="text-sm text-muted-foreground">{details}</span></span>
          {item.state === 'read'
            ? <Link className="kitchen-receipt-history-action" to={`/shopping/ticket?scan=${item.id}`} aria-label={`Reprendre le ticket ${label}`}>Reprendre</Link>
            : <span className="text-sm text-muted-foreground">Rapproché le {receiptDay(item.applied_at)}</span>}
        </li>;
      })}
    </ul>
  </section>;
}
