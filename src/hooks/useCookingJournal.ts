/**
 * PRP-223 PR7 — useCookingJournal.
 *
 * Thin TanStack Query hook over /api/assistant/cooking-journal. The list
 * query is paginated via cursor (we expose `items + nextCursor` directly
 * for now; PRP-224 will likely add `useInfiniteQuery` once the chat UI
 * needs it).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiPost } from '@/lib/api';

export type CookingOutcome = 'loved' | 'liked' | 'ok' | 'disliked' | 'failed';

export interface CookingJournalEntry {
  id: string;
  user_id: string;
  recipe_id: string | null;
  recipe_title: string;
  cooked_at: string;
  rating: number | null;
  outcome: CookingOutcome | null;
  notes: string | null;
  would_cook_again: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface RecordCookingFeedbackInput {
  recipe_id?: string;
  recipe_title: string;
  outcome?: CookingOutcome;
  rating?: number;
  notes?: string;
  would_cook_again?: boolean;
}

const QUERY_KEY = ['cooking-journal'] as const;

function getCookingJournal(opts: { recipeId?: string; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (opts.recipeId) params.set('recipe_id', opts.recipeId);
  if (opts.limit) params.set('limit', String(opts.limit));
  const qs = params.toString();
  return apiGet<CursorPage<CookingJournalEntry>>(
    `/assistant/cooking-journal${qs ? `?${qs}` : ''}`,
  );
}

function postCookingJournalEntry(
  input: RecordCookingFeedbackInput,
): Promise<{ entry: CookingJournalEntry }> {
  return apiPost<{ entry: CookingJournalEntry }>('/assistant/cooking-journal', input);
}

export function useCookingJournal(opts: { recipeId?: string; limit?: number; enabled?: boolean } = {}) {
  const queryClient = useQueryClient();

  const query = useQuery<CursorPage<CookingJournalEntry>>({
    queryKey: [...QUERY_KEY, opts.recipeId ?? null, opts.limit ?? 20],
    queryFn: () => getCookingJournal({ recipeId: opts.recipeId, limit: opts.limit }),
    enabled: opts.enabled ?? true,
    staleTime: 60_000,
  });

  const record = useMutation({
    mutationFn: (input: RecordCookingFeedbackInput) => postCookingJournalEntry(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return {
    entries: query.data?.items ?? [],
    nextCursor: query.data?.nextCursor ?? null,
    isLoading: query.isLoading,
    error: query.error,
    record: (input: RecordCookingFeedbackInput) => record.mutateAsync(input),
    isRecording: record.isPending,
  };
}

export { postCookingJournalEntry };
