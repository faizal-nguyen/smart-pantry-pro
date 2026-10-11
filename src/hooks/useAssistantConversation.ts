/**
 * PRP-233 PR2 — useAssistantConversation (singular).
 *
 * Thin wrapper around `getAssistantConversation(id)` (PRP-223 PR6).
 * Returns the conversation row + loading/error state. Disabled when
 * `id` is null/undefined.
 */
import { useAuthSessionOptional } from './useAuthenticatedUser';
import { useQuery } from '@tanstack/react-query';

import {
  AssistantConversation,
  getAssistantConversation,
} from '@/services/assistantApi';

export function useAssistantConversation(id: string | null | undefined) {
  const owner = useAuthSessionOptional().user?.id;
  const query = useQuery<{ conversation: AssistantConversation }>({
    queryKey: ['assistant-conversation', owner, id ?? null],
    queryFn: () => getAssistantConversation(id as string, { expectedUserId: owner }),
    enabled: !!owner && !!id,
    staleTime: 30_000,
  });

  return {
    conversation: query.data?.conversation ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
