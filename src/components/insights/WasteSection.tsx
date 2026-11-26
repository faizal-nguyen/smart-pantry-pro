import { LoadingSkeleton } from '@/components/ui/skeleton';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { formatMoney, formatNumber, formatDate } from '@smart/shared';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { noonOf, useCalendarToday } from '@/hooks/useCalendarToday';
import { useWasteLog } from '@/hooks/useWasteLog';
import { WASTE_WINDOW_DAYS, knownCost, wasteSummary, type WasteEvent, type WastePeriod, type WasteReason, type WasteSummary } from '@/lib/wasteSummary';

const HISTORY_PAGE = 20;
const REASON_LABELS: Record<WasteReason, string> = { expired: 'Périmé', spoiled: 'Abîmé', leftover: 'Reste', other: 'Autre' };
const PERIOD_LABELS: Record<WastePeriod, string> = { last30: `${WASTE_WINDOW_DAYS} derniers jours`, all: 'Depuis le début' };

const sinceLabel = (start: string, end: string) => `depuis le ${formatDate(start, start.slice(0, 4) === end.slice(0, 4) ? 'dayMonth' : 'dayMonthYear')}`;
const periodLabel = (period: WastePeriod, summary: WasteSummary) => summary.start === null ? 'aucune déclaration datée'
  : period === 'last30' ? `${PERIOD_LABELS.last30}, ${sinceLabel(summary.start, summary.end)}` : sinceLabel(summary.start, summary.end);
const undatedLabel = (count: number) => count > 1
  ? `${count} déclarations sans date utilisable, non comptées`
  : '1 déclaration sans date utilisable, non comptée';
const quantityLabel = (event: WasteEvent) => {
  const amount = Number(event.quantity);
  return Number.isFinite(amount) && amount > 0 ? `${formatNumber(amount, { maximumFractionDigits: 2 })}${event.unit_type ? ` ${event.unit_type}` : ''}` : null;
};
const eventDay = (event: WasteEvent) => formatDate(event.occurred_at, 'dayMonthYear') || 'Date inconnue';

function MeasureCard({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section aria-labelledby={id}>
    <Card className="h-full"><CardContent className="space-y-2 p-5">
      <h3 id={id} className="kitchen-section-title">{title}</h3>
      {children}
    </CardContent></Card>
  </section>;
}

function Counts({ rows }: { rows: { label: string; count: number }[] }) {
  return <ul className="space-y-1 text-sm">
    {rows.map(row => <li key={row.label} className="flex items-baseline justify-between gap-3">
      <span className="min-w-0 break-words">{row.label}</span><span className="tabular-nums text-muted-foreground">{row.count}</span>
    </li>)}
  </ul>;
}

function Measures({ period, summary }: { period: WastePeriod; summary: WasteSummary }) {
  const categories = summary.byCategory.map(item => ({ label: item.category, count: item.count }));
  if (summary.otherCategoriesCount > 0) categories.push({ label: 'Autres catégories', count: summary.otherCategoriesCount });
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <MeasureCard id="losses-count-title" title="Pertes">
      <p className="text-2xl font-semibold tabular-nums">{summary.count} {summary.count > 1 ? 'pertes déclarées' : 'perte déclarée'}</p>
      <p className="text-sm text-muted-foreground">{periodLabel(period, summary)}</p>
      {summary.undatedCount > 0 && <p className="text-sm text-muted-foreground">{undatedLabel(summary.undatedCount)}</p>}
    </MeasureCard>
    <MeasureCard id="losses-reasons-title" title="Par motif">
      <Counts rows={summary.byReason.map(item => ({ label: REASON_LABELS[item.reason], count: item.count }))} />
    </MeasureCard>
    <MeasureCard id="losses-categories-title" title="Par catégorie">
      <Counts rows={categories} />
    </MeasureCard>
    <MeasureCard id="losses-cost-title" title="Coût connu">
      {summary.knownCostCount > 0 ? <>
        <p className="text-3xl font-semibold tabular-nums">{formatMoney(summary.knownCostTotal)}</p>
        <p className="text-sm text-muted-foreground">coût connu pour {summary.knownCostCount} {summary.knownCostCount > 1 ? 'pertes' : 'perte'} sur {summary.count}</p>
      </> : <p className="text-sm text-muted-foreground">Coût inconnu pour les pertes de la période</p>}
    </MeasureCard>
  </div>;
}

/**
 * V11-06 E1b: declared losses in « Mes analyses ». Counts of declarations for a bounded period of
 * calendar days, a cost only where known, and the log itself, whose deletion never credits stock.
 */
export function WasteSection({ onSettled }: { onSettled?: () => void } = {}) {
  const { status, events, retry, remove } = useWasteLog();
  useEffect(() => { if (status !== 'loading') onSettled?.(); }, [status, onSettled]);
  const today = useCalendarToday();
  const [period, setPeriod] = useState<WastePeriod>('last30');
  const [shown, setShown] = useState(HISTORY_PAGE);
  const [pending, setPending] = useState<WasteEvent | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const historyTitle = useRef<HTMLHeadingElement>(null);
  const sectionTitle = useRef<HTMLHeadingElement>(null);
  const confirmed = useRef(false);
  const summary = useMemo(() => wasteSummary(events, period, noonOf(today)), [events, period, today]);

  const confirmDelete = async () => {
    const target = pending;
    if (!target) return;
    // Deleting the last declaration removes the history: focus then goes to the section title.
    const wasLast = events.length === 1;
    confirmed.current = true;
    setPending(null);
    setDeleteError(null);
    try {
      await remove(target.id);
      (wasLast ? sectionTitle : historyTitle).current?.focus();
    } catch {
      setDeleteError('La déclaration n’a pas pu être supprimée. Réessaie.');
      historyTitle.current?.focus();
    }
  };

  let body: ReactNode;
  if (status === 'loading') body = <LoadingSkeleton label="Chargement de tes pertes…" count={4} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" itemClassName="h-28 rounded-lg" />;
  else if (status === 'error') {
    body = <div role="alert" className="kitchen-notice">
      <p>Impossible de lire tes pertes pour le moment.</p>
      <Button variant="outline" className="min-h-11" onClick={() => { void retry(); }}>Réessayer</Button>
    </div>;
  } else if (events.length === 0) {
    body = <div className="space-y-3">
      <p className="font-medium">Aucune perte déclarée pour l’instant</p>
      <p className="text-sm text-muted-foreground">Quand tu jettes un produit depuis ton stock, la perte apparaît ici.</p>
      <Button variant="outline" className="min-h-11" asChild><Link to="/pantry/inventory">Déclarer depuis mon stock</Link></Button>
    </div>;
  } else {
    body = <>
      {summary.count === 0 && period === 'last30' ? <div className="space-y-3">
        <p className="font-medium">Aucune perte déclarée sur les {PERIOD_LABELS.last30}</p>
        <Button variant="outline" className="min-h-11" onClick={() => setPeriod('all')}>Voir depuis le début</Button>
      </div> : <Measures period={period} summary={summary} />}
      {deleteError && <p role="alert" className="text-sm text-destructive">{deleteError}</p>}
      <div className="space-y-2">
        <h3 id="losses-history-title" ref={historyTitle} tabIndex={-1} className="kitchen-section-title">Historique des déclarations</h3>
        <ul aria-labelledby="losses-history-title" className="divide-y divide-border">
          {events.slice(0, shown).map(event => <li key={event.id} className="flex items-start justify-between gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="break-words font-medium">{event.product_name}</p>
              <p className="text-sm text-muted-foreground">{[
                eventDay(event), REASON_LABELS[event.reason], event.category,
                quantityLabel(event),
                knownCost(event.estimated_cost_eur) === null ? null : formatMoney(knownCost(event.estimated_cost_eur)!),
              ].filter(Boolean).join(' · ')}</p>
              {event.notes && <p className="break-words text-sm italic text-muted-foreground">{event.notes}</p>}
            </div>
            <Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label={`Supprimer la déclaration : ${event.product_name}, ${eventDay(event)}`}
              onClick={() => { confirmed.current = false; setPending(event); }}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </li>)}
        </ul>
        {events.length > shown && <Button variant="outline" className="min-h-11" onClick={() => setShown(count => count + HISTORY_PAGE)}>Afficher les plus anciennes</Button>}
      </div>
    </>;
  }

  return <section id="pertes" aria-labelledby="losses-title" className="scroll-mt-20 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="losses-title" ref={sectionTitle} tabIndex={-1} className="kitchen-section-title">Pertes déclarées</h2>
      {status === 'ready' && events.length > 0 && <div role="group" aria-label="Période" className="inline-flex gap-1 rounded-md border p-1">
        {(Object.keys(PERIOD_LABELS) as WastePeriod[]).map(value => <Button key={value} size="sm" className="min-h-11"
          variant={period === value ? 'secondary' : 'ghost'} aria-pressed={period === value} onClick={() => setPeriod(value)}>{PERIOD_LABELS[value]}</Button>)}
      </div>}
    </div>
    {body}
    <AlertDialog open={pending !== null} onOpenChange={open => { if (!open) setPending(null); }}>
      <AlertDialogContent onCloseAutoFocus={event => { if (confirmed.current) event.preventDefault(); }}>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer cette déclaration ?</AlertDialogTitle>
          <AlertDialogDescription>{pending && `« ${pending.product_name} », ${eventDay(pending)}. `}Elle disparaît du journal des pertes et de ces chiffres. Le stock n’est pas recrédité.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11">Annuler</AlertDialogCancel>
          <AlertDialogAction className="min-h-11" onClick={() => { void confirmDelete(); }}>Supprimer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}
