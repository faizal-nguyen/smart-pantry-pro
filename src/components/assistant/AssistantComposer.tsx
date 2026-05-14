/**
 * AssistantComposer — composer sticky de la surface conversation.
 *
 * PRP-233 PR2 — input texte + bouton micro inline + send.
 * PRP-224 PR3 — `Textarea` (Enter envoie, Shift+Enter newline) + mode
 * picker. Quand le mode change et qu'une conversation existe déjà,
 * `PATCH /conversations/:id` propage la nouvelle valeur côté backend.
 *
 * Accessibilité : aria-label, aria-pressed (mic), tap target ≥ 44 px,
 * order tab textarea → mode → mic → send.
 */
import React, { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Mic, Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { useAssistantVoice } from '@/hooks/useAssistantVoice';
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

interface AssistantComposerProps {
  conversationId?: string | null;
  /** Current mode. Default 'general'. The parent owns URL state. */
  mode?: AssistantConversationMode;
  onModeChange?: (mode: AssistantConversationMode) => void;
  onResponse?: (response: AssistantPlanResponse) => void;
  onError?: (err: Error) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}

export default function AssistantComposer({
  conversationId,
  mode = 'general',
  onModeChange,
  onResponse,
  onError,
  autoFocus = true,
  disabled,
}: AssistantComposerProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const voice = useAssistantVoice({
    getConversationId: () => conversationId ?? undefined,
  });

  // PRP-224 PR3 — keep the textarea auto-sizing to its content but
  // capped so it doesn't push the thread off-screen.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const response = await postAssistantText({
        text: trimmed,
        clientRequestId: newClientRequestId(),
        conversationId: conversationId ?? undefined,
      });
      setText('');
      onResponse?.(response);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setSending(false);
      textareaRef.current?.focus();
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
        await queryClient.invalidateQueries({ queryKey: ['assistant-conversation', conversationId] });
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

  const isRecording = voice.status === 'recording';
  const isProcessing = voice.status === 'uploading' || voice.status === 'processing';

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
      className="sticky bottom-0 bg-background/95 backdrop-blur border-t p-3 z-20"
    >
      <div className="flex gap-2 items-end">
        <AssistantModePicker
          value={mode}
          onChange={handleModeChange}
          disabled={disabled || sending || isRecording || isProcessing}
          compact
        />
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isRecording
              ? "J'écoute…"
              : isProcessing
                ? 'Transcription…'
                : "Demande à l'assistant… (Maj+Entrée = nouvelle ligne)"
          }
          autoFocus={autoFocus}
          disabled={disabled || sending || isRecording || isProcessing}
          rows={1}
          className="flex-1 resize-none min-h-[44px] py-2"
          aria-label="Message à envoyer à l'assistant"
        />
        <Button
          type="button"
          size="icon"
          variant={isRecording ? 'destructive' : 'outline'}
          onClick={handleMicClick}
          disabled={disabled || sending || isProcessing}
          aria-label={isRecording ? "Arrêter l'enregistrement" : 'Démarrer un enregistrement vocal'}
          aria-pressed={isRecording}
          className={cn('min-w-[44px] min-h-[44px]', isRecording && 'animate-pulse')}
        >
          {isRecording ? (
            <Square className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Mic className="h-4 w-4" aria-hidden="true" />
          )}
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
      </div>
    </form>
  );
}
