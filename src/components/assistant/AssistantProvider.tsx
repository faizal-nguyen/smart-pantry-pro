/**
 * PRP-221 Sprint 1 frontend — top-level wiring.
 *
 * Mounts :
 *   - the floating mic FAB (visible on every authenticated route)
 *   - the result dialog (opens after each /voice or /text round-trip)
 *
 * One instance per app. Wrap the router children in `<AssistantProvider>`
 * inside App.tsx so the FAB hangs over every page.
 *
 * PRP-233 PR3 — sticky conversation. The FAB now carries the active
 * conversation across pages: when a turn returns a `conversation_id`,
 * we stash `{id, ts}` in `sessionStorage.assistant.lastConversationId`
 * and replay it on every subsequent tap as long as `ts` is younger
 * than 2 hours. The user can still pop into `/assistant?conversation=:id`
 * via the result dialog to read the full thread.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { useToast } from '@/hooks/use-toast';
import { useAssistantVoice } from '@/hooks/useAssistantVoice';
import {
  dispatchAgentDbChanged,
  tablesForTool,
  type AgentAffectedTable,
} from '@/lib/agentEvents';

import { AssistantFAB } from './AssistantFAB';
import { AssistantResultDialog } from './AssistantResultDialog';

// PRP-233 PR3 — sessionStorage key + TTL for sticky conversation_id.
const STICKY_CONVERSATION_KEY = 'assistant.lastConversationId';
const STICKY_CONVERSATION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function getStickyConversationId(): string | undefined {
  if (typeof sessionStorage === 'undefined') return undefined;
  try {
    const raw = sessionStorage.getItem(STICKY_CONVERSATION_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { id?: string; ts?: number };
    if (!parsed.id || typeof parsed.ts !== 'number') return undefined;
    if (Date.now() - parsed.ts > STICKY_CONVERSATION_TTL_MS) return undefined;
    return parsed.id;
  } catch {
    return undefined;
  }
}

function setStickyConversationId(id: string): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(
      STICKY_CONVERSATION_KEY,
      JSON.stringify({ id, ts: Date.now() }),
    );
  } catch {
    /* sessionStorage unavailable (privacy mode, quota) */
  }
}

export interface AssistantProviderProps {
  children?: React.ReactNode;
  /** Whisper language hint. Default: undefined (auto-detect). */
  language?: string;
  /** Tools whitelist (e.g. shopping page only). Default: undefined (all 21). */
  allowedTools?: readonly string[];
}

export function AssistantProvider({
  children,
  language,
  allowedTools,
}: AssistantProviderProps) {
  const { toast } = useToast();
  const location = useLocation();
  // PRP-233 PR3 — read the sticky conversation_id once at mount and
  // again before each recording so the FAB inherits it across pages.
  const getConversationId = useCallback(() => getStickyConversationId(), []);
  const voice = useAssistantVoice({ language, allowedTools, getConversationId });
  const [dialogOpen, setDialogOpen] = useState(false);

  // Mobile audit P0#2 — la page /assistant a déjà son propre composer
  // (micro + texte). Le FAB global créerait un doublon visuel et un
  // overlap bottom-right avec le composer docké. On masque donc le FAB
  // sur cette route uniquement, partout ailleurs il reste visible.
  const hideFab = location.pathname.startsWith('/assistant');

  // Auto-open the dialog when a result lands + invalidate downstream
  // hook caches for any table the executed actions touched.
  useEffect(() => {
    if (voice.status !== 'done' || !voice.result) return;
    setDialogOpen(true);
    // PRP-233 PR3 — stash the conversation_id so the next FAB tap
    // (from any page) joins the same conversation for ≤ 2h.
    if (voice.result.conversation_id) {
      setStickyConversationId(voice.result.conversation_id);
    }
    const tables: AgentAffectedTable[] = voice.result.actions_executed.flatMap(
      (a) => tablesForTool(a.tool)
    );
    dispatchAgentDbChanged(tables);
  }, [voice.status, voice.result]);

  // Surface errors as toasts so they don't get lost.
  useEffect(() => {
    if (voice.status === 'error' && voice.error) {
      toast({
        title: 'Assistant',
        description: voice.error,
        variant: 'destructive',
      });
    }
  }, [voice.status, voice.error, toast]);

  const fabStatus = useMemo(() => {
    if (voice.status === 'idle' || voice.status === 'error' || voice.status === 'done') {
      return 'idle' as const;
    }
    return voice.status;
  }, [voice.status]);

  const handleClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      // Keep last result around for now — user can re-open via FAB if
      // we add that affordance. For V1 we just reset state so the next
      // recording starts fresh.
      voice.reset();
    }
  };

  return (
    <>
      {children}
      {!hideFab && (
        <AssistantFAB
          status={fabStatus}
          recordingMs={voice.recordingMs}
          onClick={() => {
            if (fabStatus === 'idle' || fabStatus === 'recording') {
              void voice.toggleRecording();
            }
          }}
        />
      )}
      <AssistantResultDialog
        open={dialogOpen}
        onOpenChange={handleClose}
        result={voice.result}
        onResultPatched={voice.patchResult}
      />
    </>
  );
}
