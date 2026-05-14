/**
 * AssistantComposer — composer sticky de la surface conversation.
 *
 * PRP-233 PR2 — input texte + bouton micro inline (réutilise
 * useAssistantVoice) + bouton envoyer. Le micro est en parallèle du
 * texte ; les 2 flux écrivent dans la même conversation_id passée en
 * prop (PR3 ajoutera le sticky 2h côté FAB global).
 *
 * Accessibilité : input gardé focusable, bouton micro avec aria-pressed
 * en mode recording, tap target min 44px.
 */
import React, { FormEvent, useRef, useState } from 'react';
import { Loader2, Mic, Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { useAssistantVoice } from '@/hooks/useAssistantVoice';
import { newClientRequestId, postAssistantText } from '@/services/assistantApi';
import type { AssistantPlanResponse } from '@/services/assistantApi';

interface AssistantComposerProps {
  conversationId?: string | null;
  onResponse?: (response: AssistantPlanResponse) => void;
  onError?: (err: Error) => void;
  /** Auto-focus on mount. Default: true on desktop, false on mobile. */
  autoFocus?: boolean;
  disabled?: boolean;
}

export default function AssistantComposer({
  conversationId,
  onResponse,
  onError,
  autoFocus = true,
  disabled,
}: AssistantComposerProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const voice = useAssistantVoice();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const response = await postAssistantText({
        text: trimmed,
        clientRequestId: newClientRequestId(),
        // conversationId not yet plumbed through postAssistantText signature.
        // PR3 will extend the signature to accept it; the backend already
        // accepts `conversation_id` (PRP-223 PR3).
      });
      setText('');
      onResponse?.(response);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const isRecording = voice.status === 'recording';
  const isProcessing =
    voice.status === 'uploading' || voice.status === 'processing';

  const handleMicClick = () => {
    if (isRecording) {
      void voice.stopRecording();
    } else {
      void voice.startRecording();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 bg-background/95 backdrop-blur border-t p-3 flex gap-2 items-end z-20"
    >
      <Input
        ref={inputRef}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={
          isRecording
            ? 'J\'écoute…'
            : isProcessing
              ? 'Transcription…'
              : 'Demande à l\'assistant…'
        }
        autoFocus={autoFocus}
        disabled={disabled || sending || isRecording || isProcessing}
        className="flex-1 min-h-[44px]"
        aria-label="Message à envoyer à l'assistant"
      />
      <Button
        type="button"
        size="icon"
        variant={isRecording ? 'destructive' : 'outline'}
        onClick={handleMicClick}
        disabled={disabled || sending || isProcessing}
        aria-label={isRecording ? 'Arrêter l\'enregistrement' : 'Démarrer un enregistrement vocal'}
        aria-pressed={isRecording}
        className={cn('min-w-[44px] min-h-[44px]', isRecording && 'animate-pulse')}
      >
        {isRecording ? <Square className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
      </Button>
      <Button
        type="submit"
        size="icon"
        disabled={disabled || sending || !text.trim() || isRecording}
        aria-label="Envoyer"
        className="min-w-[44px] min-h-[44px]"
      >
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="h-4 w-4" aria-hidden="true" />
        )}
      </Button>
    </form>
  );
}
