import { LoadingSkeleton } from '@/components/ui/skeleton';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { PANTRY_TIME_ZONE } from '@smart/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useStockInsights } from '@/hooks/useStockInsights';
import { EXPIRY_HORIZON_DAYS, type StockInsights } from '@/lib/stockInsights';

const DAY_LABEL = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: PANTRY_TIME_ZONE });
const dayLabel = (date: string) => DAY_LABEL.format(new Date(`${date}T12:00:00Z`));
const lots = (count: number) => `${count} ${count > 1 ? 'lots' : 'lot'}`;

/** What the window leaves out, so that « 0 lot » never reads as « nothing to use ». */
function coverage({ undatedLots, expiredLots }: StockInsights): string {
  const parts: string[] = [];
  if (undatedLots > 0) parts.push(`${lots(undatedLots)} sans date`);
  if (expiredLots > 0) parts.push(`${lots(expiredLots)} à date dépassée`);
  if (parts.length === 0) return 'Tous tes lots ont une date à venir';
  return `${parts.join(' et ')}, non ${undatedLots + expiredLots > 1 ? 'comptés' : 'compté'}`;
}

/**
 * V11-06 E1a: only what the stock measures, each figure with its period and coverage. A loading or
 * failed read never shows as zero; a measured zero does. Declared losses follow in their own section.
 */
export function InsightsDashboard({ onSettled }: { onSettled?: () => void } = {}) {
  const { status, insights, retry } = useStockInsights();
  useEffect(() => { if (status !== 'loading') onSettled?.(); }, [status, onSettled]);

  if (status === 'loading') return <LoadingSkeleton label="Chargement de ton stock…" count={2} className="grid gap-4 sm:grid-cols-2" itemClassName="h-44 rounded-lg" />;
  if (status === 'error' || !insights) {
    return <div role="alert" className="kitchen-notice">
      <p>Impossible de lire ton stock pour le moment.</p>
      <Button variant="outline" className="min-h-11" onClick={() => { void retry(); }}>Réessayer</Button>
    </div>;
  }
  if (insights.lotsInStock === 0) {
    return <div className="space-y-4">
      <EmptyState icon={Package} title="Aucun produit en stock" description="Ces mesures se calculent sur ton stock : elles apparaîtront avec ton premier produit." />
      <div className="flex justify-center"><Button className="min-h-11" asChild><Link to="/pantry/inventory">Ajouter au stock</Link></Button></div>
    </div>;
  }

  return <div className="grid gap-4 sm:grid-cols-2">
    <section aria-labelledby="insights-soon-title">
      <Card className="h-full"><CardContent className="space-y-2 p-5">
        <h3 id="insights-soon-title" className="kitchen-section-title">À utiliser sous {EXPIRY_HORIZON_DAYS} jours</h3>
        <p className="text-3xl font-semibold tabular-nums">{lots(insights.expiringSoon)}</p>
        <p className="text-sm text-muted-foreground">d’ici le {dayLabel(insights.horizon)}</p>
        <p className="text-sm text-muted-foreground">{coverage(insights)}</p>
        <Button variant="link" className="min-h-11 px-0" asChild><Link to="/pantry/inventory">Voir mon stock</Link></Button>
      </CardContent></Card>
    </section>
    <section aria-labelledby="insights-stock-title">
      <Card className="h-full"><CardContent className="space-y-2 p-5">
        <h3 id="insights-stock-title" className="kitchen-section-title">Lots en stock</h3>
        <p className="text-3xl font-semibold tabular-nums">{lots(insights.lotsInStock)}</p>
        <p className="text-sm text-muted-foreground">à quantité positive, à ce jour</p>
      </CardContent></Card>
    </section>
  </div>;
}
