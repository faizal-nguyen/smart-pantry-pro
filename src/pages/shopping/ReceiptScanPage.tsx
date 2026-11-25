/**
 * V11-01 E5b — « Scanner le ticket », served on /shopping/ticket (?scan=<id> once read: the scan is in
 * the address, D8). One photo read by the API (E5a), reviewed against the list, applied as one
 * reconcile_receipt; then Courses opens with the notice and « Annuler », and its « Ranger mes achats »
 * takes the purchases in its draft.
 */
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { ReceiptScan, StockCommandResult } from '@smart/shared';
import KitchenPageHeader from '@/components/layout/KitchenPageHeader';
import ReceiptCapture from '@/components/shopping/receipt/ReceiptCapture';
import ReceiptHistory from '@/components/shopping/receipt/ReceiptHistory';
import ReceiptReview from '@/components/shopping/receipt/ReceiptReview';
import { receiptDay } from '@/components/shopping/receipt/receiptFormat';
import { Button } from '@/components/ui/button';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { useReceiptReview } from '@/hooks/useReceiptReview';
import { useShoppingList } from '@/hooks/useShoppingList';
import { describeShoppingChanges } from '@/lib/shoppingChanges';
import { fetchReceipt } from '@/services/receipts';

export default function ReceiptScanPage() {
  const user = useAuthenticatedUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const scanId = params.get('scan');
  // The scan just read comes with the navigation: no second reading of it.
  const arrived = (location.state as { receiptScan?: ReceiptScan } | null)?.receiptScan ?? null;
  // Under review, the action bar stays above the phone's navigation: the page keeps room for it.
  return <div className={`culinary-page kitchen-page kitchen-shopping-page kitchen-receipt-page ${scanId ? 'has-purchases' : ''}`}>
    <Link className="kitchen-week-back" to="/shopping/list"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Courses</Link>
    <KitchenPageHeader title="Scanner le ticket" description="Ton ticket de caisse rapproché de ta liste : tes achats cochés, ce qui reste à acheter, les achats ajoutés." />
    {scanId
      ? <ReceiptScreen key={scanId} owner={user.id} scanId={scanId} initial={arrived?.id === scanId ? arrived : null} />
      : <div className="kitchen-receipt-start">
        <ReceiptCapture owner={user.id} onScanned={scan => navigate({ search: `?scan=${scan.id}` }, { state: { receiptScan: scan } })} />
        <ReceiptHistory owner={user.id} />
      </div>}
  </div>;
}

function ReceiptScreen({ owner, scanId, initial }: { owner: string; scanId: string; initial: ReceiptScan | null }) {
  const [scan, setScan] = useState<ReceiptScan | null>(initial);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (initial) return;
    const controller = new AbortController();
    fetchReceipt(owner, scanId, controller.signal).then(setScan).catch((failure: unknown) => {
      if (controller.signal.aborted) return;
      const status = (failure as { status?: unknown } | null)?.status;
      setError(status === 404 ? 'Ce ticket n’est plus disponible : scanne-le à nouveau.'
        : failure instanceof Error ? failure.message : 'Ce ticket ne peut pas être lu pour le moment.');
    });
    return () => controller.abort();
  }, [owner, scanId, initial]);

  if (error) return <div role="alert" className="kitchen-proposal-error">
    <p>{error}</p>
    <Link className="inline-flex min-h-11 items-center underline underline-offset-2" to="/shopping/ticket">Scanner un ticket</Link>
  </div>;
  if (!scan) return <p role="status" className="text-sm text-muted-foreground">Lecture du ticket…</p>;
  if (scan.state === 'applied') return <div className="kitchen-receipt-done">
    <p>Ce ticket a déjà été rapproché de ta liste le {receiptDay(scan.applied_at)}.</p>
    <Button asChild className="min-h-11"><Link to="/shopping/list">Voir mes courses</Link></Button>
  </div>;
  return <ReceiptToReview owner={owner} scan={scan} />;
}

function ReceiptToReview({ owner, scan }: { owner: string; scan: ReceiptScan }) {
  const navigate = useNavigate();
  // The list's intentions are resumed by Courses; this page resends its own receipt (useReceiptReview).
  const shopping = useShoppingList({ notify: false, resume: false });
  const review = useReceiptReview({ owner, scan, rows: shopping.shoppingList, rowsReady: !shopping.loading, refetchRows: shopping.refetch });
  // The review is replaced in the history: a way back never shows a receipt already applied.
  const applied = (result: StockCommandResult) => navigate('/shopping/list', { replace: true, state: { shoppingChange: {
    commandId: result.command_id, message: describeShoppingChanges(result.shopping_changes, result.command_type),
  } } });
  if (shopping.loading) return <p role="status" className="text-sm text-muted-foreground">Lecture de ta liste…</p>;
  if (shopping.error && !shopping.shoppingList.length) return <div role="alert" className="kitchen-proposal-error">
    <p>{shopping.error}</p>
    <Button type="button" variant="outline" className="min-h-11" onClick={() => void shopping.refetch().catch(() => undefined)}>Relire ma liste</Button>
  </div>;
  return <ReceiptReview scan={scan} rows={shopping.shoppingList} review={review} onApplied={applied} />;
}
