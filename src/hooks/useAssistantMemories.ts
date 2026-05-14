/**
 * PRP-223 PR6 — useAssistantMemories.
 *
 * TanStack Query hook over the memory CRUD client. Provides:
 *  - paginated list (active + candidate by default)
 *  - mutations: promote, forget, patch
 * Cache invalidation centralised via the shared `assistant-memories`
 * query key.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  AssistantMemoryItem,
  AssistantMemoryKind,
  AssistantMemoryStatus,
  CursorPage,
  forgetAssistantMemory,
  getAssistantMemories,
  patchAssistantMemory,
  promoteAssistantMemory,
} from '@/services/assistantApi';

const QUERY_KEY = ['assistant-memories'] as const;

interface UseAssistantMemoriesOpts {
  status?: AssistantMemoryStatus;
  kind?: AssistantMemoryKind;
  limit?: number;
  enabled?: boolean;
}

export function useAssistantMemories(opts: UseAssistantMemoriesOpts = {}) {
  const queryClient = useQueryClient();

  const query = useQuery<CursorPage<AssistantMemoryItem>>({
    queryKey: [...QUERY_KEY, opts.status ?? 'visible', opts.kind ?? 'all', opts.limit ?? 50],
    queryFn: () =>
      getAssistantMemories({
        status: opts.status,
        kind: opts.kind,
        limit: opts.limit ?? 50,
      }),
    enabled: opts.enabled ?? true,
    staleTime: 30_000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const promote = useMutation({
    mutationFn: (memoryId: string) => promoteAssistantMemory(memoryId),
    onSuccess: invalidate,
  });

  const forget = useMutation({
    mutationFn: (memoryId: string) => forgetAssistantMemory(memoryId),
    onSuccess: invalidate,
  });

  const patch = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Parameters<typeof patchAssistantMemory>[1];
    }) => patchAssistantMemory(id, patch),
    onSuccess: invalidate,
  });

  const items = query.data?.items ?? [];

  return {
    memories: items,
    candidates: items.filter(m => m.status === 'candidate'),
    actives: items.filter(m => m.status === 'active'),
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    promote: (memoryId: string) => promote.mutateAsync(memoryId),
    forget: (memoryId: string) => forget.mutateAsync(memoryId),
    patch: (id: string, patch: Parameters<typeof patchAssistantMemory>[1]) =>
      patchAssistantMemory ? patchAssistantMemory(id, patch) : undefined,
    isPromoting: promote.isPending,
    isForgetting: forget.isPending,
  };
}
