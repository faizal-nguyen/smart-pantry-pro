import React from 'react';
import { AlertTriangle, Crown, Infinity as InfinityIcon, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useImportsCount } from '@/hooks/useImportsCount';
import { isQuotaExhausted, isQuotaWarning } from '@/lib/featureGates';

interface InboxQuotaBadgeProps {
  className?: string;
}

/**
 * Inbox quota gauge (PRP-220.19). Shows the user's "active imports"
 * usage against their tier ceiling, plus an upgrade nudge when they
 * cross 80% of the cap on free.
 *
 * Source of truth: server `/api/imports/social/counts` (already
 * inclusive of the user's tier). Premium gets a "∞" infinity badge,
 * never a gauge.
 *
 * Hidden while the counts query is loading so we never show a
 * misleading "0 / 25" before data lands.
 */
export const InboxQuotaBadge: React.FC<InboxQuotaBadgeProps> = ({ className }) => {
  const { data, isLoading, active, quota } = useImportsCount();

  if (isLoading || !data || !quota) return null;

  if (quota.tier === 'premium' || quota.limit === null) {
    return (
      <Card className={className} data-testid="inbox-quota-badge" data-tier="premium">
        <CardContent className="flex items-center gap-3 py-3">
          <Crown className="h-5 w-5 text-amber-500" aria-hidden />
          <div className="flex-1 text-sm">
            <span className="font-medium">{active} imports actifs</span>
            <span className="ml-2 text-muted-foreground">
              <InfinityIcon className="inline h-3.5 w-3.5" aria-hidden /> illimité
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const exhausted = isQuotaExhausted(quota);
  const warning = isQuotaWarning(active, quota);
  const percent = Math.min(100, Math.round((active / quota.limit) * 100));

  return (
    <Card
      className={className}
      data-testid="inbox-quota-badge"
      data-tier="free"
      data-warning={warning ? 'true' : 'false'}
    >
      <CardContent className="flex flex-col gap-2 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {active} / {quota.limit} imports actifs
          </span>
          <span
            className={[
              'text-xs',
              exhausted
                ? 'text-destructive'
                : warning
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-muted-foreground',
            ].join(' ')}
          >
            {exhausted
              ? 'Quota atteint'
              : `${quota.remaining} restant${(quota.remaining ?? 0) > 1 ? 's' : ''}`}
          </span>
        </div>
        <Progress value={percent} aria-label="Quota d'imports actifs" />

        {(warning || exhausted) && (
          <Alert>
            <AlertTriangle className="h-4 w-4" aria-hidden />
            <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>
                {exhausted
                  ? 'Limite gratuite atteinte. Archive des imports ou passe Premium pour continuer.'
                  : `Plus que ${quota.remaining} imports gratuits.`}
              </span>
              <Button size="sm" asChild>
                <Link to="/billing/upgrade">
                  <Sparkles className="mr-1 h-4 w-4" aria-hidden /> Passer Premium
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default InboxQuotaBadge;
