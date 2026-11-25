/**
 * V11-01 E5b — a receipt reviewed against the list, in groups: checked, partial (the remainder stays
 * to buy, D14), added off the list, set aside, and the rows of the list the receipt does not name.
 * One button applies it as one reconcile_receipt; a possible duplicate waits for the user's word.
 */
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import type { ReceiptScan, StockCommandResult } from '@smart/shared';
import { Button } from '@/components/ui/button';
import type { ShoppingItem } from '@/hooks/useShoppingList';
import type { useReceiptReview } from '@/hooks/useReceiptReview';
import { needsCheck, rowName, rowUnit, type ReviewLine } from '@/lib/receiptMatching';
import { formatShoppingQuantity } from '@/lib/shoppingChanges';
import ReceiptLineCard from './ReceiptLineCard';
import { receiptAmount, receiptDay } from './receiptFormat';

interface ReceiptReviewProps {
  scan: ReceiptScan;
  rows: ShoppingItem[];
  review: ReturnType<typeof useReceiptReview>;
  onApplied: (result: StockCommandResult) => void;
}

export default function ReceiptReview({ scan, rows, review, onApplied }: ReceiptReviewProps) {
  const { lines, groups, sending, outcome, error } = review;
  const kept = lines.filter(line => line.target.kind !== 'skip').length;
  const locked = sending || outcome === 'unconfirmed' || outcome === 'applied';
  const rowOf = (line: ReviewLine) => line.target.kind === 'list' ? rows.find(row => line.target.kind === 'list' && row.id === line.target.shoppingId) : undefined;
  const partialNote = (line: ReviewLine) => {
    const row = rowOf(line);
    const bought = row ? groups.bought.get(row.id) : null;
    if (!row || bought === null || bought === undefined) return undefined;
    const unit = rowUnit(row) ?? '';
    return `${formatShoppingQuantity(bought)} ${unit} sur ${formatShoppingQuantity(Number(row.quantity))} ${unit} : le reste reste à acheter.`;
  };
  const sections: Array<[string, string, ReviewLine[], ((line: ReviewLine) => string | undefined) | undefined]> = [
    ['receipt-checked', 'Cochés sur ta liste', groups.checked, undefined],
    ['receipt-partial', 'Achat partiel', groups.partial, partialNote],
    ['receipt-added', 'Ajoutés comme achetés', groups.added, () => 'Absent de ta liste : ajouté comme acheté.'],
    ['receipt-skipped', 'Écartés', groups.skipped, () => 'Ni coché, ni rangé.'],
  ];
  // Left during the sending: the receipt is applied, but nobody is taken back to Courses.
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  const submit = async () => {
    const result = await review.send();
    if (result && mounted.current) onApplied(result);
  };
  const head = [scan.store ?? 'Magasin non lu', receiptDay(scan.purchased_on), receiptAmount(scan.total, scan.currency)].filter(Boolean).join(' · ');

  return <div className="kitchen-shopping-layout kitchen-receipt-layout">
    <div className="kitchen-receipt-work">
      <p className="kitchen-receipt-head">{head}</p>
      {scan.possible_duplicate && <div role="alert" className="kitchen-proposal-error">
        <p>Un ticket du même magasin, du même jour et du même total a déjà été rapproché le {receiptDay(scan.possible_duplicate.applied_at)}.</p>
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" className="h-5 w-5" checked={review.duplicateConfirmed} disabled={locked} onChange={event => review.confirmDuplicate(event.target.checked)} />
          C’est un autre ticket
        </label>
      </div>}
      {sections.map(([id, title, items, note]) => items.length > 0 && <section key={id} className="kitchen-receipt-group" aria-labelledby={id}>
        <h2 id={id}>{title} ({items.length})</h2>
        <ul>
          {items.map(line => <ReceiptLineCard key={line.index} line={line} read={scan.lines[line.index]} rows={rows} check={needsCheck(line, scan.lines[line.index])}
            note={note?.(line)} disabled={locked} onEdit={change => review.editLine(line.index, change)} onTarget={target => review.setTarget(line.index, target)} />)}
        </ul>
      </section>)}
      {groups.remaining.length > 0 && <section className="kitchen-receipt-group" aria-labelledby="receipt-remaining">
        <h2 id="receipt-remaining">Restent à acheter ({groups.remaining.length})</h2>
        <ul className="kitchen-receipt-remaining">
          {groups.remaining.map(row => <li key={row.id}>{rowName(row) || 'Produit'} · {formatShoppingQuantity(Number(row.quantity))} {rowUnit(row) ?? ''}</li>)}
        </ul>
      </section>}
    </div>
    <aside className="kitchen-shopping-summary" data-ready="true" aria-labelledby="receipt-summary-title">
      <h2 id="receipt-summary-title" className="kitchen-section-title">{kept} achat{kept > 1 ? 's' : ''} à rapprocher</h2>
      {error && <div role="alert" className="kitchen-proposal-error">
        <p>{error}</p>
        {outcome === 'unconfirmed' && <Button type="button" variant="outline" className="min-h-11 gap-2" aria-disabled={sending} onClick={() => void submit()}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />Renvoyer
        </Button>}
        {outcome === 'applied' && <Link className="inline-flex min-h-11 items-center underline underline-offset-2" to="/shopping/list">Voir mes courses</Link>}
      </div>}
      {outcome !== 'applied' && outcome !== 'unconfirmed' && <Button type="button" className="min-h-11 h-auto w-full whitespace-normal py-3" aria-disabled={sending} disabled={!kept}
        onClick={() => { if (!sending) void submit(); }}>
        {sending ? 'Rapprochement en cours…' : `Rapprocher ${kept} achat${kept > 1 ? 's' : ''} de ma liste`}
      </Button>}
      <p className="kitchen-shopping-note text-xs text-muted-foreground">Un seul envoi, que tu pourras annuler depuis Courses. Tu rangeras ensuite tes achats dans le stock.</p>
    </aside>
  </div>;
}
