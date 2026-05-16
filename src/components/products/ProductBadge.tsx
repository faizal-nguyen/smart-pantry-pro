/**
 * ProductBadge — étiquette de statut d'enrichissement d'un produit.
 *
 * PRP-225 PR6 — affiche la source / la qualité de l'info produit
 * pour qu'on voie immédiatement ce qui vient d'OpenFoodFacts vs
 * de l'utilisateur vs de l'assistant. Utilise les tokens sémantiques
 * PRP-237 :
 *   - `accent-ai` (electric blue) → OpenFoodFacts (intelligence externe)
 *   - `muted` neutre              → Produit générique / À compléter
 *   - `success`                   → Enrichi avec haute confiance
 */
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type ProductEnrichmentStatus =
  | 'none'
  | 'pending'
  | 'enriched'
  | 'ambiguous'
  | 'failed'
  | 'stale';

export type ProductEnrichmentSource =
  | 'none'
  | 'openfoodfacts'
  | 'manual'
  | 'assistant'
  | 'barcode_scan';

interface ProductBadgeProps {
  status?: ProductEnrichmentStatus;
  source?: ProductEnrichmentSource;
  /** 0..1 — affiché entre parenthèses au-delà de 0.6 pour l'enrichi. */
  confidence?: number;
  /** Force un libellé court / dense (cards inventaire). */
  compact?: boolean;
  className?: string;
}

interface BadgeShape {
  label: string;
  shortLabel: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'info' | 'warning' | 'ai';
  className?: string;
  title: string;
}

function describe(status: ProductEnrichmentStatus, source: ProductEnrichmentSource): BadgeShape {
  if (status === 'enriched' && source === 'openfoodfacts') {
    return {
      label: 'OpenFoodFacts',
      shortLabel: 'OFF',
      variant: 'ai',
      title: 'Données issues d\'OpenFoodFacts, à vérifier.',
    };
  }
  if (status === 'enriched' && source === 'manual') {
    return {
      label: 'Saisie manuelle',
      shortLabel: 'Manuel',
      variant: 'outline',
      title: 'Données saisies à la main par l\'utilisateur.',
    };
  }
  if (status === 'enriched' && source === 'barcode_scan') {
    return {
      label: 'Scan',
      shortLabel: 'Scan',
      variant: 'success',
      title: 'Produit reconnu via le scan barcode.',
    };
  }
  if (status === 'pending') {
    return {
      label: 'Enrichissement…',
      shortLabel: '…',
      variant: 'outline',
      className: 'animate-pulse',
      title: 'Enrichissement en cours.',
    };
  }
  if (status === 'ambiguous') {
    return {
      label: 'À clarifier',
      shortLabel: '?',
      variant: 'warning',
      title: 'Plusieurs candidats possibles — clarification nécessaire.',
    };
  }
  if (status === 'failed') {
    return {
      label: 'Enrichissement échoué',
      shortLabel: 'Échec',
      variant: 'outline',
      title: 'OpenFoodFacts n\'a renvoyé aucune donnée fiable.',
    };
  }
  if (status === 'stale') {
    return {
      label: 'À rafraîchir',
      shortLabel: 'Stale',
      variant: 'outline',
      title: 'Données vieilles — clique pour les ré-actualiser.',
    };
  }
  // status === 'none' ou source non couverte
  return {
    label: 'À compléter',
    shortLabel: 'À compléter',
    variant: 'secondary',
    title: 'Produit générique sans enrichissement.',
  };
}

export function ProductBadge({
  status = 'none',
  source = 'none',
  confidence,
  compact = false,
  className,
}: ProductBadgeProps) {
  const shape = describe(status, source);
  const suffix =
    status === 'enriched' && typeof confidence === 'number' && confidence >= 0.6
      ? ` ${(confidence * 100).toFixed(0)}%`
      : '';
  return (
    <Badge
      variant={shape.variant}
      className={cn('text-xs', className)}
      title={shape.title}
    >
      {(compact ? shape.shortLabel : shape.label) + suffix}
    </Badge>
  );
}

export default ProductBadge;
