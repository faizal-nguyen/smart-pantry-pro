/**
 * PRP-224 PR1 — useAssistantHistorySearch.
 *
 * Debounced TanStack Query hook over /api/assistant/search. The query
 * only fires when the (debounced) input is ≥ 2 characters, so the user
 * isn't bombarded with empty results while typing the first letter.
 */
import { useEffect, useState } from 'react';
import { useAuthSessionOptional } from './useAuthenticatedUser';
import { useQuery } from '@tanstack/react-query';

import {
  AssistantSearchMatch,
  searchAssistantHistory,
} from '@/services/assistantApi';

interface UseAssistantHistorySearchOpts {
  limit?: number;
  debounceMs?: number;
  enabled?: boolean;
}

const DEFAULT_DEBOUNCE = 300;
const MIN_QUERY_LENGTH = 2;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function useAssistantHistorySearch(
  query: string,
  opts: UseAssistantHistorySearchOpts = {},
) {
  const owner = useAuthSessionOptional().user?.id;
  const debounced = useDebouncedValue(query.trim(), opts.debounceMs ?? DEFAULT_DEBOUNCE);
  const shouldFetch = !!owner && (opts.enabled ?? true) && debounced.length >= MIN_QUERY_LENGTH;

  const queryResult = useQuery<{ matches: AssistantSearchMatch[] }>({
    queryKey: ['assistant-search', owner, debounced, opts.limit ?? 20],
    queryFn: () => searchAssistantHistory(debounced, opts.limit ?? 20, { expectedUserId: owner }),
    enabled: shouldFetch,
    staleTime: 30_000,
  });

  return {
    matches: queryResult.data?.matches ?? [],
    isLoading: shouldFetch && queryResult.isLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error,
    debouncedQuery: debounced,
  };
}
