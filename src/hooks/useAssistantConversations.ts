/**
 * PRP-223 PR6 — useAssistantConversations + useAssistantMessages.
 *
 * Two thin TanStack Query hooks for the conversation history surface
 * (consumed by `ConversationHistoryList` and, later, PRP-224's chat UI).
 */
import { useAuthSessionOptional } from './useAuthenticatedUser';
import { useInfiniteQuery } from '@tanstack/react-query';

import {
  AssistantConversationStatus,
  AssistantMessage,
  getAssistantConversations,
  getAssistantMessages,
} from '@/services/assistantApi';

interface UseConversationsOpts {
  status?: AssistantConversationStatus;
  limit?: number;
  enabled?: boolean;
}

export function useAssistantConversations(opts: UseConversationsOpts = {}) {
  const owner = useAuthSessionOptional().user?.id;
  const query = useInfiniteQuery({
    queryKey: ['assistant-conversations', owner, opts.status ?? 'all', opts.limit ?? 20],
    initialPageParam:null as string|null,
    queryFn: ({pageParam}) =>
      getAssistantConversations({ status: opts.status, limit: opts.limit ?? 20,cursor:pageParam ?? undefined }, { expectedUserId: owner }),
    getNextPageParam:page=>page.nextCursor ?? undefined,
    enabled: !!owner && (opts.enabled ?? true),
    staleTime: 60_000,
  });

  return {
    conversations: [...new Map((query.data?.pages.flatMap(p=>p.items) ?? []).map(row=>[row.id,row])).values()],
    hasMore:query.hasNextPage,loadMore:query.fetchNextPage,isLoadingMore:query.isFetchingNextPage,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useAssistantMessages(
  conversationId: string | null,
  opts: { limit?: number; enabled?: boolean } = {},
) {
  const owner = useAuthSessionOptional().user?.id;
  const query = useInfiniteQuery({
    queryKey: ['assistant-messages', owner, conversationId, opts.limit ?? 50],
    initialPageParam:null as string|null,
    queryFn: ({pageParam}) =>
      conversationId
        ? getAssistantMessages(conversationId, { limit: opts.limit ?? 50,cursor:pageParam ?? undefined }, { expectedUserId: owner })
        : Promise.resolve({ items: [] as AssistantMessage[], nextCursor: null }),
    enabled: !!owner && (opts.enabled ?? true) && !!conversationId,
    staleTime: 30_000,
    getNextPageParam:page=>page.nextCursor ?? undefined,
  });

  return {
    messages: [...new Map((query.data ? [...query.data.pages].reverse().flatMap(p=>p.items) : []).map(row=>[row.id,row])).values()],
    hasMore:query.hasNextPage,loadMore:query.fetchNextPage,isLoadingMore:query.isFetchingNextPage,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
