/**
 * AssistantComposer — composer sticky de la surface conversation.
 *
 * PRP-233 PR2 — input texte + bouton micro inline + send.
 * V10-03E — le micro dicte dans le champ : le texte est relu et corrigé,
 * puis envoyé par le même chemin que la saisie au clavier.
 * PRP-224 PR3 — `Textarea` (Enter envoie, Shift+Enter newline) + mode
 * picker. Quand le mode change et qu'une conversation existe déjà,
 * `PATCH /conversations/:id` propage la nouvelle valeur côté backend.
 *
 * Accessibilité : aria-label, aria-pressed (mic), tap target ≥ 44 px,
 * order tab textarea → mode → mic → send.
 */
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

import { appendDictation, useDictation } from '@/hooks/useDictation';
import {
  newClientRequestId,
  patchAssistantConversation,
  postAssistantText,
} from '@/services/assistantApi';
import type {
  AssistantConversationMode,
  AssistantPlanResponse,
} from '@/services/assistantApi';
import AssistantModePicker from './AssistantModePicker';
import { DictationMicButton, DictationStatusLine } from './DictationControls';

interface AssistantComposerProps {
  conversationId?: string | null;
  /** Current mode. Default 'general'. The parent owns URL state. */
  mode?: AssistantConversationMode;
  onModeChange?: (mode: AssistantConversationMode) => void;
  onResponse?: (response: AssistantPlanResponse) => void;
  onError?: (err: Error) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  expectedUserId?: string;
  sessionMessages?: import('@smart/shared').AssistantSessionMessage[];
  sessionRevision?: number;
}

export default function AssistantComposer({
  conversationId,
  mode = 'general',
  onModeChange,
  onResponse,
  onError,
  autoFocus = false,
  disabled, sessionMessages, sessionRevision, expectedUserId,
}: AssistantComposerProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error,setError]=useState<string|null>(null);
  const [dictated, setDictated] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const focusAfterSend = useRef(false);
  const request = useRef<{ id: string; text: string; conversationId?: string | null } | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const dictation = useDictation({
    owner: expectedUserId,
    onTranscript: transcript => {
      setText(previous => appendDictation(previous, transcript));
      setDictated(true);
      focusAfterSend.current = true;
    },
  });
  const isRecording = dictation.status === 'recording';
  const isTranscribing = dictation.status === 'transcribing';

  // PRP-224 PR3 — keep the textarea auto-sizing to its content but
  // capped so it doesn't push the thread off-screen.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);
  useEffect(() => {
    if (!sending && !isTranscribing && focusAfterSend.current) {
      focusAfterSend.current = false;
      textareaRef.current?.focus();
    }
  }, [sending, isTranscribing]);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled || sending || isRecording || isTranscribing) return;
    setSending(true);setError(null);
    if (!request.current || request.current.text !== trimmed || request.current.conversationId !== conversationId)
      request.current = { id: newClientRequestId(), text: trimmed, conversationId };
    try {
      const response = await postAssistantText({
        text: trimmed,
        clientRequestId: request.current.id, expectedUserId,
        conversationId: conversationId ?? undefined, sessionMessages, sessionRevision,
      });
      if (!response.memory_results?.some(r => r.status === 'verification_required')) { setText(''); setDictated(false); request.current = null; }
      onResponse?.(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Réponse non confirmée. Ta question est conservée ; tu peux réessayer.');
      onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      focusAfterSend.current = true;
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter envoie, Shift+Enter newline (PRP-224 §15 a11y).
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const handleModeChange = async (next: AssistantConversationMode) => {
    onModeChange?.(next);
    if (conversationId) {
      try {
        await patchAssistantConversation(conversationId, { mode: next });
        await queryClient.invalidateQueries({ queryKey: ['assistant-conversation'] });
        await queryClient.invalidateQueries({ queryKey: ['assistant-conversations'] });
      } catch (err) {
        toast({
          title: 'Mode non sauvegardé',
          description: err instanceof Error ? err.message : 'Erreur réseau',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 bg-background/95 backdrop-blur border-t p-3 z-20"
    >
      {error && <p role="alert" className="mb-2 text-sm text-destructive">{error}</p>}
      <DictationStatusLine dictation={dictation} className="mb-2" />
      {dictated && text.trim() && !isRecording && !isTranscribing && (
        <p className="mb-2 text-xs text-muted-foreground">Texte dicté : relis-le et corrige-le si besoin, puis envoie.</p>
      )}
      <div className="flex gap-2 items-end min-w-0">
        <AssistantModePicker
          value={mode}
          onChange={handleModeChange}
          disabled={disabled || sending || isRecording || isTranscribing}
          compact
        />
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={e => { setText(e.target.value); if (!e.target.value.trim()) setDictated(false); }}
          onKeyDown={handleKeyDown}
          placeholder={
            isRecording
              ? "J'écoute…"
              : isTranscribing
                ? 'Transcription…'
                : 'Ta question sur le repas, le stock…'
          }
          autoFocus={autoFocus}
          disabled={disabled || sending || isRecording || isTranscribing}
          rows={1}
          className="min-w-0 flex-1 resize-none min-h-[44px] py-2 text-base"
          aria-label="Message à envoyer à l'assistant"
        />
        <DictationMicButton dictation={dictation} disabled={disabled || sending} />
        <Button
          type="submit"
          size="icon"
          variant="default"
          disabled={disabled || sending || !text.trim() || isRecording || isTranscribing}
          aria-label="Envoyer"
          className="min-w-[44px] min-h-[44px]"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>
    </form>
  );
}
