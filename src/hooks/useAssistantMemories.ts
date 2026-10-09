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
import { useAuthSessionOptional } from './useAuthenticatedUser';

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
  const { user }=useAuthSessionOptional();
  const owner=user?.id;
  const ownerOptions=()=>{ if (!owner) throw new Error('Connectez-vous pour gérer la mémoire.');return { expectedUserId:owner }; };

  const query = useQuery<CursorPage<AssistantMemoryItem>>({
    queryKey: [...QUERY_KEY, owner, opts.status ?? 'visible', opts.kind ?? 'all', opts.limit ?? 50],
    queryFn: () =>
      getAssistantMemories({
        status: opts.status,
        kind: opts.kind,
        limit: opts.limit ?? 50,
      },ownerOptions()),
    enabled: !!owner && (opts.enabled ?? true),
    staleTime: 30_000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const promote = useMutation({
    mutationFn: (memoryId: string) => promoteAssistantMemory(memoryId,ownerOptions()),
    onSuccess: invalidate,
  });

  const forget = useMutation({
    mutationFn: (memoryId: string) => forgetAssistantMemory(memoryId,ownerOptions()),
    onSuccess: invalidate,
  });

  const patch = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Parameters<typeof patchAssistantMemory>[1];
    }) => patchAssistantMemory(id, patch,ownerOptions()),
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
    patch: (id: string, value: Parameters<typeof patchAssistantMemory>[1]) => patch.mutateAsync({ id,patch:value }),
    isPromoting: promote.isPending,
    isForgetting: forget.isPending,
  };
}
