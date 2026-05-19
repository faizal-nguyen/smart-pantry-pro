/**
 * EnrichmentStatus — bouton "Enrichir" + spinner + état error.
 *
 * PRP-225 PR6 — déclenche `POST /api/products/:id/enrich` via
 * `useProductEnrichment`. Le bouton s'auto-désactive pendant la
 * requête et toast en cas d'échec. La présence du composant signale
 * qu'un produit peut être enrichi ; quand `status === 'enriched'`
 * et qu'on est non-stale, on cache le bouton sauf si `force`.
 *
 * Tokens PRP-237 : variant `ai` du Button (electric blue) pour
 * marquer la présence IA.
 */
import * as React from 'react';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import {
  useProductEnrichment,
  type EnrichmentResultPayload,
} from '@/hooks/useProductEnrichment';
import type { ProductEnrichmentStatus } from './ProductBadge';

interface EnrichmentStatusProps {
  productId: string;
  status?: ProductEnrichmentStatus;
  /** Si vrai, le bouton s'affiche même quand le produit est déjà enrichi. */
  force?: boolean;
  /** Wording du bouton si non enrichi (default: "Enrichir"). */
  label?: string;
  /** Wording du bouton si déjà enrichi (default: "Rafraîchir"). */
  refreshLabel?: string;
  className?: string;
  onEnriched?: (result: EnrichmentResultPayload) => void;
}

export function EnrichmentStatus({
  productId,
  status = 'none',
  force = false,
  label = 'Enrichir',
  refreshLabel = 'Rafraîchir',
  className,
  onEnriched,
}: EnrichmentStatusProps) {
  const { enrich, isPending, error } = useProductEnrichment();

  const isEnriched = status === 'enriched';
  if (isEnriched && !force) return null;

  const Icon = isEnriched ? RefreshCw : Sparkles;
  const buttonLabel = isEnriched ? refreshLabel : label;

  const handleClick = async () => {
    try {
      const result = await enrich(productId);
      onEnriched?.(result);
    } catch {
      // useProductEnrichment expose `error` ; on n'a pas besoin de re-throw
      // ici, le toast / inline error couvre l'UX.
    }
  };

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <Button
        type="button"
        variant="ai"
        size="sm"
        disabled={isPending}
        onClick={handleClick}
        aria-label={buttonLabel}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Icon className="h-4 w-4" aria-hidden="true" />
        )}
        <span>{buttonLabel}</span>
      </Button>
      {error && (
        <span className="text-xs text-destructive" role="alert">
          {error.message}
        </span>
      )}
    </div>
  );
}

export default EnrichmentStatus;
