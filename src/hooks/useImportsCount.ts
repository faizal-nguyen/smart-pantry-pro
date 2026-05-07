/**
 * Aggregated counts + quota query for the inbox (PRP-220.19).
 *
 * Wraps `GET /api/imports/social/counts`. Used by:
 *   - InboxQuotaBadge (active vs limit, upgrade prompt at 80%)
 *   - RecipeImportOnboarding (gates the "first 5 recipes" sheet)
 *   - Sidebar collections counters (post-MVP)
 *
 * The endpoint is cheap (single SELECT + aggregations in JS), so we
 * keep a 30s staleTime that matches the import list query — no point
 * refreshing more aggressively when the list itself is debounced.
 */
import { useQuery } from '@tanstack/react-query';

import { importsApi, type CountsResponse } from '@/services/recipe-import/api';

export const IMPORTS_COUNT_QUERY_KEY = ['social-imports', 'counts'] as const;

export interface UseImportsCountOptions {
  /** Disable network access for storybook / unit tests. */
  enabled?: boolean;
}

export function useImportsCount(options: UseImportsCountOptions = {}) {
  const query = useQuery<CountsResponse>({
    queryKey: IMPORTS_COUNT_QUERY_KEY,
    queryFn: () => importsApi.getCounts(),
    enabled: options.enabled ?? true,
    staleTime: 30 * 1000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    /** Convenience accessors so consumers don't repeat the chain. */
    active: query.data?.active ?? 0,
    total: query.data?.total ?? 0,
    quota: query.data?.quota,
  };
}
