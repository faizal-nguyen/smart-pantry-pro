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
import { keepsSessionTurns, type AssistantSessionMessage } from '@smart/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { readAssistantAsk } from '@/hooks/useAskAssistant';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import AssistantMessageThread from './AssistantMessageThread';
import AssistantComposer from './AssistantComposer';
import AssistantMemoryNotice from './AssistantMemoryNotice';
import AssistantModelDetails from './AssistantModelDetails';
import { AssistantActionsPanel } from './AssistantActionsPanel';
import { dispatchAgentDbChanged, tablesForTool } from '@/lib/agentEvents';
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
  const location = useLocation();
  const askedByButton = readAssistantAsk(location.state);
  const owner = useAuthSessionOptional().user?.id;
  const ownerRef = useRef(owner); ownerRef.current = owner;
  const [session, setSession] = useState<{ owner?: string; messages: AssistantSessionMessage[]; revision?: number }>({ messages: [] });
  const [latest, setLatest] = useState<{ owner?: string; result: AssistantPlanResponse } | null>(null);
  const currentSession = session.owner === owner ? session : { messages: [] };
  // Only the reply of this conversation (or of this session) may be confirmed here.
  const latestHere = latest && latest.owner === owner && (latest.result.conversation_id ?? null) === conversationId ? latest.result : null;
  const actionsRef = useRef<HTMLDivElement>(null);
  const awaitingConfirmation = !!latestHere?.confirmation_token && latestHere.actions_pending.length > 0;
  useEffect(() => { if (awaitingConfirmation) actionsRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }); }, [awaitingConfirmation, latestHere]);
  useEffect(() => {
    const clear = (event: Event) => { if ((event as CustomEvent<{owner?:string}>).detail?.owner === owner) setSession({ owner, messages: [] }); };
    window.addEventListener('assistant-memory-changed', clear);
    return () => window.removeEventListener('assistant-memory-changed', clear);
  }, [owner]);
  const queryClient = useQueryClient();
  // In a saved conversation the thread scrolls to its end when the new messages
  // arrive: the block goes inside it, after the reply, or it ends up off screen.
  // A tapped choice (« Lamb (Mutton) Biryani ») is sent like a typed answer.
  const [quickReply, setQuickReply] = useState<string | null>(null);
  const actions = latestHere && (
    <div ref={actionsRef} className="mt-4 space-y-3">
      {!!latestHere.choices?.length && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Réponses possibles">
          {latestHere.choices.map(choice => (
            <Button key={choice.label} type="button" variant="outline" size="sm" className="min-h-11 whitespace-normal text-left"
              disabled={!!quickReply} onClick={() => setQuickReply(choice.reply)}>
              {choice.label}
            </Button>
          ))}
        </div>
      )}
      <AssistantActionsPanel result={latestHere}
        onResultPatched={patch => setLatest(previous => previous && previous.result === latestHere ? { ...previous, result: { ...previous.result, ...patch } } : previous)} />
    </div>
  );
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
    // Stock, shopping or menu pages refresh what an executed action changed.
    dispatchAgentDbChanged(response.actions_executed.flatMap(action => tablesForTool(action.tool)));
    if (!response.conversation_id) setSession(previous => ({ owner, revision: response.memory_revision,
      messages: [...(previous.owner === owner && keepsSessionTurns(previous.revision, response) ? previous.messages : []),
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
      className="kitchen-assistant-conversation"
      data-testid="assistant-surface"
    >
      <CardContent className="kitchen-assistant-thread">
        <AssistantMemoryNotice result={latest && latest.owner === owner ? latest.result : null} />
        {latest && latest.owner===owner && !latest.result.conversation_id && <AssistantModelDetails receipt={latest.result.model_receipt} />}
        {currentSession.messages.length > 0 && <div className="space-y-4"><p className="text-xs text-muted-foreground">Échange de cette session. L’historique durable est désactivé ou indisponible.</p>{currentSession.messages.map((m,i) => <p key={i} className="whitespace-pre-wrap text-sm"><span className="block font-medium">{m.role === 'user' ? 'Vous' : 'Assistant'}</span>{m.content}</p>)}</div>}
        {!conversationId && currentSession.messages.length === 0 ? (
          <div className="kitchen-assistant-welcome"><h2 className="text-lg font-semibold">Un coup de main en cuisine ?</h2><p className="text-sm text-muted-foreground">Demande quoi préparer avec tes ingrédients ou par quoi remplacer un produit. Écris ou dicte ta question ci-dessous.</p></div>
        ) : (
          <AssistantMessageThread messages={messages} isLoading={messagesLoading} footer={conversationId ? actions : null} />
        )}
        {!conversationId && actions}
      </CardContent>
      <AssistantComposer
        key={owner}
        expectedUserId={owner}
        sessionMessages={currentSession.messages} sessionRevision={currentSession.revision}
        conversationId={conversationId}
        mode={mode}
        onModeChange={onModeChange}
        onResponse={handleResponse}
        initialRequest={askedByButton ?? quickReply ?? undefined}
        onInitialRequestTaken={() => { if (askedByButton) navigate(location.pathname + location.search, { replace: true, state: null }); else setQuickReply(null); }}
      />
    </Card>
  );
}
