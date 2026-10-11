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
import { useEffect, useRef, useState } from 'react';
import { useAuthSessionOptional } from '@/hooks/useAuthenticatedUser';
import type { AssistantSessionMessage } from '@smart/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';

import AssistantMessageThread from './AssistantMessageThread';
import AssistantComposer from './AssistantComposer';
import AssistantMemoryNotice from './AssistantMemoryNotice';
import AssistantModelDetails from './AssistantModelDetails';
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
  const owner = useAuthSessionOptional().user?.id;
  const ownerRef = useRef(owner); ownerRef.current = owner;
  const [session, setSession] = useState<{ owner?: string; messages: AssistantSessionMessage[]; revision?: number }>({ messages: [] });
  const [latest, setLatest] = useState<{ owner?: string; result: AssistantPlanResponse } | null>(null);
  const currentSession = session.owner === owner ? session : { messages: [] };
  useEffect(() => {
    const clear = (event: Event) => { if ((event as CustomEvent<{owner?:string}>).detail?.owner === owner) setSession({ owner, messages: [] }); };
    window.addEventListener('assistant-memory-changed', clear);
    return () => window.removeEventListener('assistant-memory-changed', clear);
  }, [owner]);
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
    if (ownerRef.current !== owner) return;
    setLatest({ owner, result: response });
    if (!response.conversation_id) setSession(previous => ({ owner, revision: response.memory_revision,
      messages: [...(previous.owner === owner && previous.revision === response.memory_revision ? previous.messages : []),
        { role: 'user' as const, content: response.transcript.slice(0,500) }, { role: 'assistant' as const, content: response.message.slice(0,500) }].slice(-8) }));
    void queryClient.invalidateQueries({ queryKey: ['assistant-memories'] });
    void queryClient.invalidateQueries({ queryKey: ['assistant-memory-policy'] });
    if (response.conversation_id && !conversationId) {
      navigate(`/assistant?conversation=${response.conversation_id}`, { replace: true });
      return;
    }
    if (response.conversation_id) {
      queryClient.invalidateQueries({ queryKey: ['assistant-messages'] });
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
        <AssistantMemoryNotice result={latest && latest.owner === owner ? latest.result : null} />
        {latest && latest.owner===owner && !latest.result.conversation_id && <AssistantModelDetails receipt={latest.result.model_receipt} />}
        {currentSession.messages.length > 0 && <div className="space-y-4"><p className="text-xs text-muted-foreground">Échange de cette session. L’historique durable est désactivé ou indisponible.</p>{currentSession.messages.map((m,i) => <p key={i} className="whitespace-pre-wrap text-sm"><span className="block font-medium">{m.role === 'user' ? 'Vous' : 'Assistant'}</span>{m.content}</p>)}</div>}
        {!conversationId && currentSession.messages.length === 0 ? (
          <div className="space-y-3 py-6"><h2 className="text-lg font-semibold">Un coup de main en cuisine ?</h2><p className="text-sm text-muted-foreground">Demande quoi préparer avec tes ingrédients ou par quoi remplacer un produit. Écris ta question ci-dessous.</p></div>
        ) : (
          <AssistantMessageThread messages={messages} isLoading={messagesLoading} />
        )}
      </CardContent>
      <AssistantComposer
        key={owner}
        expectedUserId={owner}
        sessionMessages={currentSession.messages} sessionRevision={currentSession.revision}
        conversationId={conversationId}
        mode={mode}
        onModeChange={onModeChange}
        onResponse={handleResponse}
      />
    </Card>
  );
}
