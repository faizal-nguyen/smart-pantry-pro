import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ConfidenceBadgeProps {
  /** Confidence in the [0..1] range (PRP-220.06 ImportedRecipeDraft.confidence). */
  value: number;
  className?: string;
  /** When true, prefix with the literal "Confidence:" before the percentage. */
  withLabel?: boolean;
}

/**
 * Surface the AI/heuristic confidence of an imported recipe draft.
 *
 *   value >= 0.8  → green   "Confiance élevée (87%)"
 *   value >= 0.5  → amber   "À vérifier (62%)"
 *   value <  0.5  → red     "Faible confiance (34%)"
 *
 * The thresholds match the gating used by `ExtractedRecipeModal`'s
 * save button (PRP-220.08): below 0.4 the user has to verify before
 * the draft can be persisted.
 */
export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ value, className, withLabel }) => {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const label = withLabel ? `Confiance: ${pct}%` : `${pct}%`;

  if (value >= 0.8) {
    return (
      <Badge
        variant="outline"
        className={cn(
          'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
          className
        )}
      >
        Confiance élevée ({label})
      </Badge>
    );
  }

  if (value >= 0.5) {
    return (
      <Badge
        variant="outline"
        className={cn(
          'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
          className
        )}
      >
        À vérifier ({label})
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className={cn(className)}>
      Faible confiance ({label})
    </Badge>
  );
};

export default ConfidenceBadge;
