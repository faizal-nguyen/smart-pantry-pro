/**
 * AssistantConversationSurface — surface conversation MVP de /assistant.
 *
 * PRP-233 PR2 — assemble :
 *  - fil messages (AssistantMessageThread) chargé via useAssistantMessages,
 *  - composer sticky (AssistantComposer),
 *  - empty state si pas de conversation.
 *
 * L'`conversationId` vient du searchParam `?conversation=:id` géré par
 * le parent (`AssistantDashboard`). Pas de fetch tant qu'il est null —
 * le composer permet déjà d'envoyer du texte (et le backend ouvre une
 * conversation automatiquement, PRP-223 PR3).
 */
import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Bot } from 'lucide-react';

import AssistantMessageThread from './AssistantMessageThread';
import AssistantComposer from './AssistantComposer';
import { useAssistantConversation } from '@/hooks/useAssistantConversation';
import { useAssistantMessages } from '@/hooks/useAssistantConversations';
import type {
  AssistantConversationMode,
  AssistantPlanResponse,
} from '@/services/assistantApi';

interface AssistantConversationSurfaceProps {
  conversationId: string | null;
  mode: AssistantConversationMode;
  onModeChange: (mode: AssistantConversationMode) => void;
}

export default function AssistantConversationSurface({
  conversationId,
  mode,
  onModeChange,
}: AssistantConversationSurfaceProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { conversation } = useAssistantConversation(conversationId);
  const { messages, isLoading: messagesLoading } = useAssistantMessages(
    conversationId,
    { limit: 50, enabled: !!conversationId },
  );

  // Recipe proposals now ride on assistant_messages.metadata, so the
  // thread renders them inline. We just need to invalidate after a turn
  // so the latest message (with its persisted buckets) flows back in.
  const handleResponse = (response: AssistantPlanResponse) => {
    if (response.conversation_id && !conversationId) {
      navigate(`/assistant?conversation=${response.conversation_id}`, { replace: true });
      return;
    }
    if (response.conversation_id) {
      queryClient.invalidateQueries({ queryKey: ['assistant-messages', response.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ['assistant-conversations'] });
    }
  };

  // Mobile audit P2#8 — sur mobile le `h-[70vh]` dans une Card laissait
  // ~30vh aux bords + header AppNavigation + nav bottom, le composer
  // sticky se retrouvait à mi-écran. On bascule en chat plein écran :
  //   • mobile : `h-[calc(100dvh-13rem)]` (≈208px = header page + nav 96)
  //              + bords droits pour gagner les marges.
  //   • desktop : on garde la Card 70vh.
  // Le composer est en flex-col donc dock naturellement en bas.
  return (
    <Card
      className="flex flex-col overflow-hidden h-[calc(100dvh-13rem)] rounded-none border-x-0 sm:h-[70vh] sm:rounded-xl sm:border-x"
      data-testid="assistant-surface"
    >
      <CardContent className="flex-1 overflow-y-auto p-4">
        {!conversationId ? (
          <EmptyState
            icon={Bot}
            title="Démarre une nouvelle conversation"
            description="Tape une question ou utilise le bouton micro ci-dessous."
          />
        ) : (
          <AssistantMessageThread messages={messages} isLoading={messagesLoading} />
        )}
      </CardContent>
      <AssistantComposer
        conversationId={conversationId}
        mode={mode}
        onModeChange={onModeChange}
        onResponse={handleResponse}
      />
    </Card>
  );
}
