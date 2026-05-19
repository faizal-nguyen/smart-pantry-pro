/**
 * useProductEnrichment — appelle `POST /api/products/:id/enrich`.
 *
 * PRP-225 PR6 — hook React Query mutation utilisé par `EnrichmentStatus`
 * et par l'inventaire pour re-sync un produit depuis OpenFoodFacts via
 * le pipeline serveur (cache durable + rate limiter).
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { apiPost, ApiError } from '@/lib/api';

export interface EnrichmentResultProduct {
  id: string;
  name: string;
  brand?: string | null;
  image_url?: string | null;
  enrichment_status?: string;
  enrichment_source?: string;
  enrichment_confidence?: number;
  off_product_code?: string | null;
}

export interface EnrichmentResultPayload {
  kind: 'matched' | 'created' | 'ambiguous' | 'not_found';
  product?: EnrichmentResultProduct;
  via?: string;
  confidence?: number;
}

const ENRICH_TOAST = {
  success: 'Produit enrichi avec OpenFoodFacts.',
  noMatch: 'Aucun enrichissement trouvé pour ce produit.',
  error: 'Enrichissement impossible — réessaie dans un instant.',
};

export function useProductEnrichment() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const queryClient = useQueryClient();

  const enrich = async (productId: string): Promise<EnrichmentResultPayload> => {
    setIsPending(true);
    setError(null);
    try {
      const data = await apiPost<EnrichmentResultPayload>(`/products/${productId}/enrich`, {});

      // Invalider tout ce qui dépend de products/inventory pour que
      // les composants ré-affichent l'image / la nutrition mises à jour.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['product', productId] }),
      ]);

      if (data.kind === 'matched' || data.kind === 'created') {
        toast.success(ENRICH_TOAST.success);
      } else if (data.kind === 'not_found') {
        toast.message(ENRICH_TOAST.noMatch);
      }
      return data;
    } catch (err) {
      const e =
        err instanceof ApiError
          ? new Error(err.message)
          : err instanceof Error
            ? err
            : new Error(String(err));
      setError(e);
      toast.error(ENRICH_TOAST.error);
      throw e;
    } finally {
      setIsPending(false);
    }
  };

  return { enrich, isPending, error };
}
