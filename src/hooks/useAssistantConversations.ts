/**
 * PRP-223 PR6 — useAssistantConversations + useAssistantMessages.
 *
 * Two thin TanStack Query hooks for the conversation history surface
 * (consumed by `ConversationHistoryList` and, later, PRP-224's chat UI).
 */
import { useAuthSessionOptional } from './useAuthenticatedUser';
import { useQuery } from '@tanstack/react-query';

import {
  AssistantConversation,
  AssistantConversationStatus,
  AssistantMessage,
  CursorPage,
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
  const query = useQuery<CursorPage<AssistantConversation>>({
    queryKey: ['assistant-conversations', owner, opts.status ?? 'all', opts.limit ?? 20],
    queryFn: () =>
      getAssistantConversations({ status: opts.status, limit: opts.limit ?? 20 }, { expectedUserId: owner }),
    enabled: !!owner && (opts.enabled ?? true),
    staleTime: 60_000,
  });

  return {
    conversations: query.data?.items ?? [],
    nextCursor: query.data?.nextCursor ?? null,
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
  const query = useQuery<CursorPage<AssistantMessage>>({
    queryKey: ['assistant-messages', owner, conversationId, opts.limit ?? 50],
    queryFn: () =>
      conversationId
        ? getAssistantMessages(conversationId, { limit: opts.limit ?? 50 }, { expectedUserId: owner })
        : Promise.resolve({ items: [] as AssistantMessage[], nextCursor: null }),
    enabled: !!owner && (opts.enabled ?? true) && !!conversationId,
    staleTime: 30_000,
  });

  return {
    messages: query.data?.items ?? [],
    nextCursor: query.data?.nextCursor ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
