/**
 * PRP-221 Sprint 1 frontend — top-level wiring.
 *
 * Mounts :
 *   - the floating mic FAB (desktop, outside /assistant)
 *   - V10-03E — the review dialog: the dictated text is shown and can be
 *     corrected; only "Envoyer" sends it to /text. Nothing acts on audio.
 *   - the result dialog (opens after each /text round-trip)
 *
 * One instance per app. Wrap the router children in `<AssistantProvider>`
 * inside App.tsx so the FAB hangs over every page.
 *
 * PRP-233 PR3 — sticky conversation. The FAB now carries the active
 * conversation across pages: when a turn returns a `conversation_id`,
 * we stash `{id, ts}` in `sessionStorage.assistant.lastConversationId:<account>:active`
 * and replay it on every subsequent tap as long as `ts` is younger
 * than 2 hours. The user can still pop into `/assistant?conversation=:id`
 * via the result dialog to read the full thread.
 */
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuthSessionOptional } from '@/hooks/useAuthenticatedUser';

import { appendDictation, useDictation } from '@/hooks/useDictation';
import { dispatchAgentDbChanged, tablesForTool } from '@/lib/agentEvents';
import {
  newClientRequestId,
  postAssistantText,
  type AssistantPlanResponse,
} from '@/services/assistantApi';

import { AssistantDraftDialog } from './AssistantDraftDialog';
import { AssistantFAB } from './AssistantFAB';
import { AssistantResultDialog } from './AssistantResultDialog';

// PRP-233 PR3 — sessionStorage key + TTL for sticky conversation_id.
const STICKY_CONVERSATION_KEY = 'assistant.lastConversationId';
const STICKY_CONVERSATION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function getStickyConversationId(owner?: string): string | undefined {
  if (!owner || typeof sessionStorage === 'undefined') return undefined;
  try {
    const raw = sessionStorage.getItem(`${STICKY_CONVERSATION_KEY}:${owner}:active`);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { id?: string; ts?: number };
    if (!parsed.id || typeof parsed.ts !== 'number') return undefined;
    if (Date.now() - parsed.ts > STICKY_CONVERSATION_TTL_MS) return undefined;
    return parsed.id;
  } catch {
    return undefined;
  }
}

function setStickyConversationId(owner: string, id: string): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(
      `${STICKY_CONVERSATION_KEY}:${owner}:active`,
      JSON.stringify({ id, ts: Date.now() }),
    );
  } catch {
    /* sessionStorage unavailable (privacy mode, quota) */
  }
}

export interface AssistantProviderProps {
  children?: React.ReactNode;
  /** Expected dictation language. Default: French (useDictation). */
  language?: string;
  /** Tools whitelist (e.g. shopping page only). Default: undefined (all). */
  allowedTools?: readonly string[];
}

export function AssistantProvider({
  children,
  language,
  allowedTools,
}: AssistantProviderProps) {
  const location = useLocation();
  const { isMobile } = useResponsive();
  const { user } = useAuthSessionOptional();
  const owner = user?.id;
  const activeOwner = useRef(owner);
  activeOwner.current = owner;

  /** null: review dialog closed. */
  const [draft, setDraft] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [result, setResult] = useState<AssistantPlanResponse | null>(null);
  // Same id while the same text is retried, so a resend is deduplicated.
  const request = useRef<{ id: string; text: string } | null>(null);

  const dictation = useDictation({
    owner,
    // The server accepts ISO-639-1 codes only: « fr-FR » becomes « fr ».
    languages: language ? [language.slice(0, 2).toLowerCase()] : undefined,
    onTranscript: text => setDraft(previous => appendDictation(previous ?? '', text)),
  });

  // A draft or a result never follows the user into another account.
  useEffect(() => {
    setDraft(null);
    setSendError(null);
    setResult(null);
    request.current = null;
  }, [owner]);

  // FAB visibility rules :
  //   1. Mobile audit P0#2 (PR1) — Sur /assistant le composer dedie
  //      remplit deja le besoin micro + texte. Le FAB global ferait
  //      doublon + overlap bottom-right.
  //   2. PRP-238 PR2 — Sur mobile, l'Assistant a deja sa propre entree
  //      dans la bottom nav (MobileNavigation). Le FAB ailleurs creerait
  //      donc un doublon visuel et masque potentiellement des actions.
  //      Sur desktop/tablet (sm+) la sidebar gauche n'a pas l'entree
  //      assistant prominente, le FAB reste utile la.
  const hideFab = location.pathname.startsWith('/assistant') || isMobile;

  const fabStatus = dictation.status === 'recording' ? 'recording' as const
    : dictation.status === 'transcribing' || sending ? 'processing' as const
    : 'idle' as const;

  const startDictation = () => {
    if (fabStatus === 'processing') return;
    setDraft(previous => previous ?? '');
    setSendError(null);
    void dictation.toggle();
  };

  const discard = () => {
    dictation.cancel();
    setDraft(null);
    setSendError(null);
    request.current = null;
  };

  const send = async () => {
    const text = draft?.trim();
    if (!text || !owner || sending) return;
    if (request.current?.text !== text) request.current = { id: newClientRequestId(), text };
    setSending(true);
    setSendError(null);
    try {
      const response = await postAssistantText({
        text,
        clientRequestId: request.current.id,
        language,
        allowedTools,
        conversationId: getStickyConversationId(owner),
        expectedUserId: owner,
      });
      if (activeOwner.current !== owner) return;
      // PRP-233 PR3 — the next FAB tap (from any page) joins the same
      // conversation for ≤ 2h.
      if (response.conversation_id) setStickyConversationId(owner, response.conversation_id);
      dispatchAgentDbChanged(response.actions_executed.flatMap(action => tablesForTool(action.tool)));
      setDraft(null);
      request.current = null;
      setResult(response);
    } catch (err) {
      if (activeOwner.current !== owner) return;
      setSendError(err instanceof Error ? err.message : 'Envoi non confirmé. Ta demande est conservée ; tu peux réessayer.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {children}
      {!hideFab && (
        <AssistantFAB
          status={fabStatus}
          recordingMs={dictation.recordingMs}
          onClick={startDictation}
        />
      )}
      <AssistantDraftDialog
        open={draft !== null}
        draft={draft ?? ''}
        onDraftChange={setDraft}
        dictation={dictation}
        sending={sending}
        error={sendError}
        onSend={() => void send()}
        onDiscard={discard}
      />
      <AssistantResultDialog
        open={result !== null}
        onOpenChange={open => { if (!open) setResult(null); }}
        result={result}
        onResultPatched={patch => setResult(previous => (previous ? { ...previous, ...patch } : previous))}
      />
    </>
  );
}
