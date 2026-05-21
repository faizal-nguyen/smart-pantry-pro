/**
 * WasteInsightsPage — PRP-222 PR5
 *
 * Dedicated /insights/waste route. Real numbers backed by
 * food_waste_events. No fakes: shows an empty-state when nothing has
 * been logged yet.
 */
import React from 'react';
import { Trash2, Calendar, TrendingDown, Euro, AlertCircle } from 'lucide-react';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useFoodWaste, WasteReason } from '@/hooks/useFoodWaste';

const REASON_LABELS: Record<WasteReason, string> = {
  expired: 'Périmé',
  spoiled: 'Abîmé',
  leftover: 'Reste',
  other: 'Autre',
};

const REASON_COLOR: Record<WasteReason, string> = {
  expired: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200',
  spoiled: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200',
  leftover: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
};

const formatEur = (n: number) => `${n.toFixed(2).replace('.', ',')} €`;
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

const WasteInsightsPage: React.FC = () => {
  // PRP-238 PR2 — AuthenticatedLayout garantit l'auth.
  const user = useAuthenticatedUser();
  void user;
  const { events, stats, loading, error, deleteEvent } = useFoodWaste();

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Trash2 className="w-6 h-6 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold">Anti-gaspi</h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base">
            Suivi de ce qui est jeté pour t&apos;aider à mieux acheter et cuisiner.
          </p>
        </header>

        {error && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 h-24" />
              </Card>
            ))}
          </div>
        ) : stats.totalEvents === 0 ? (
          <EmptyState
            icon={TrendingDown}
            title="Aucun gaspillage enregistré"
            description="Quand tu jettes un produit depuis ton garde-manger, il apparaît ici. Les chiffres sont calculés à partir de tes événements réels — rien d'inventé."
          />
        ) : (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Événements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.totalEvents}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.last30DaysEvents} sur 30j
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Euro className="w-4 h-4" />
                    Coût estimé
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatEur(stats.totalCostEur)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatEur(stats.last30DaysCostEur)} sur 30j
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" />
                    Quantité totale
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.totalQuantity.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground mt-1">unités cumulées</p>
                </CardContent>
              </Card>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Par raison</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(Object.keys(stats.byReason) as WasteReason[]).map(reason => {
                    const count = stats.byReason[reason];
                    const pct = stats.totalEvents > 0 ? Math.round((count / stats.totalEvents) * 100) : 0;
                    return (
                      <div key={reason} className="flex items-center justify-between text-sm">
                        <Badge variant="outline" className={REASON_COLOR[reason]}>
                          {REASON_LABELS[reason]}
                        </Badge>
                        <span className="text-muted-foreground tabular-nums">
                          {count} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Par catégorie</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(stats.byCategory)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 6)
                    .map(([category, count]) => {
                      const pct = stats.totalEvents > 0 ? Math.round((count / stats.totalEvents) * 100) : 0;
                      return (
                        <div key={category} className="flex items-center justify-between text-sm">
                          <span>{category}</span>
                          <span className="text-muted-foreground tabular-nums">
                            {count} ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                </CardContent>
              </Card>
            </section>

            <section>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Historique
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-border">
                    {events.slice(0, 30).map(event => (
                      <li
                        key={event.id}
                        className="py-3 flex items-start justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium truncate">{event.product_name}</span>
                            <Badge variant="outline" className={REASON_COLOR[event.reason]}>
                              {REASON_LABELS[event.reason]}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(event.occurred_at)}
                            {event.category ? ` • ${event.category}` : ''}
                            {` • ${event.quantity}${event.unit_type ? ' ' + event.unit_type : ''}`}
                            {event.estimated_cost_eur != null
                              ? ` • ${formatEur(Number(event.estimated_cost_eur))}`
                              : ''}
                          </p>
                          {event.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              {event.notes}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void deleteEvent(event.id)}
                          aria-label="Supprimer cet événement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>
          </>
        )}
    </div>
  );
};

export default WasteInsightsPage;
