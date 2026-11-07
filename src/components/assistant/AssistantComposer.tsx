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
 * Photos : jusqu'à 4 photos jointes au message. Avec une question, les
 * produits vus partent avec elle (ligne « Sur mes photos ») et un encart
 * propose « Ajouter au stock » ; sans question, la liste à vérifier s'ouvre
 * directement. Rien n'entre dans le stock sans cette vérification.
 *
 * Accessibilité : aria-label, aria-pressed (mic), tap target ≥ 44 px,
 * order tab textarea → mode → photo → mic → send.
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
  postGroceryPhotos,
} from '@/services/assistantApi';
import type {
  AssistantConversationMode,
  AssistantPlanResponse,
  RecognizedGrocery,
} from '@/services/assistantApi';
import AssistantModePicker from './AssistantModePicker';
import { DictationMicButton, DictationStatusLine } from './DictationControls';
import GroceryReviewDialog from './GroceryReviewDialog';
import { JoinedPhotosStrip, JoinPhotosButton, SeenGroceriesCard } from './ComposerPhotos';
import { MAX_JOINED_PHOTOS, useJoinedPhotos, type JoinedPhoto } from '@/hooks/useJoinedPhotos';
import { groceriesNote } from '@/lib/groceriesNote';

interface SeenGroceries { photos: Blob[]; items: RecognizedGrocery[] }
const NOTHING_SEEN = 'Aucune course reconnue sur ces photos. Étale les produits, étiquettes visibles, et réessaie.';

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
  /** A question brought by a « Demander à l'assistant » button, sent once on arrival. */
  initialRequest?: string;
  /** Called when that question is taken, so the parent can forget it (no resend on reload). */
  onInitialRequestTaken?: () => void;
}

export default function AssistantComposer({
  conversationId,
  mode = 'general',
  onModeChange,
  onResponse,
  onError,
  autoFocus = false,
  disabled, sessionMessages, sessionRevision, expectedUserId, initialRequest, onInitialRequestTaken,
}: AssistantComposerProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error,setError]=useState<string|null>(null);
  const [dictated, setDictated] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const focusAfterSend = useRef(false);
  const request = useRef<{ id: string; text: string; conversationId?: string | null } | null>(null);
  const joined = useJoinedPhotos();
  // The photos already read: a resend after a failed reply does not read them again.
  const recognized = useRef<{ photos: JoinedPhoto[]; seen: SeenGroceries } | null>(null);
  const [reading, setReading] = useState(false);
  const [seen, setSeen] = useState<SeenGroceries | null>(null);
  const [review, setReview] = useState<(SeenGroceries & { key: number }) | null>(null);
  const reviews = useRef(0);
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
    await submit(text);
  };

  const initialTaken = useRef(false);
  useEffect(() => {
    // Wait for the account: the composer is keyed by it and remounts once it is known.
    if (!initialRequest || initialTaken.current || !expectedUserId || disabled) return;
    initialTaken.current = true;
    onInitialRequestTaken?.();
    setText(initialRequest);
    void submit(initialRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRequest, expectedUserId, disabled]);

  const openReview = (groceries: SeenGroceries) => { reviews.current += 1; setReview({ ...groceries, key: reviews.current }); };

  async function readPhotos(photos: JoinedPhoto[]): Promise<SeenGroceries> {
    if (recognized.current?.photos === photos) return recognized.current.seen;
    setReading(true);
    try {
      const blobs = photos.map(photo => photo.blob);
      const { items } = await postGroceryPhotos({ photos: blobs, expectedUserId });
      const groceries = { photos: blobs, items };
      recognized.current = { photos, seen: groceries };
      return groceries;
    } finally {
      setReading(false);
    }
  }

  async function submit(value: string) {
    const trimmed = value.trim();
    const photos = joined.photos;
    if ((!trimmed && photos.length === 0) || disabled || sending || isRecording || isTranscribing || joined.preparing) return;
    setSending(true);setError(null);
    try {
      let message = trimmed;
      let groceries: SeenGroceries | null = null;
      if (photos.length > 0) {
        groceries = await readPhotos(photos);
        if (groceries.items.length === 0) { setError(NOTHING_SEEN); return; }
        // Photos alone: straight to the list to review, nothing asked.
        if (!trimmed) { openReview(groceries); joined.clear(); setSeen(null); return; }
        message = `${trimmed}\n\n${groceriesNote(groceries.items)}`;
      }
      if (!request.current || request.current.text !== message || request.current.conversationId !== conversationId)
        request.current = { id: newClientRequestId(), text: message, conversationId };
      const response = await postAssistantText({
        text: message,
        clientRequestId: request.current.id, expectedUserId,
        conversationId: conversationId ?? undefined, sessionMessages, sessionRevision,
      });
      if (!response.memory_results?.some(r => r.status === 'verification_required')) { setText(''); setDictated(false); request.current = null; }
      if (groceries) { setSeen(groceries); joined.clear(); }
      onResponse?.(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Réponse non confirmée. Ta question est conservée ; tu peux réessayer.');
      onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      focusAfterSend.current = true;
      setSending(false);
    }
  }

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
    <>
    <form
      onSubmit={handleSubmit}
      className="kitchen-assistant-composer"
    >
      {error && <p role="alert" className="mb-2 text-sm text-destructive">{error}</p>}
      {seen && <SeenGroceriesCard items={seen.items} onAdd={() => openReview(seen)} onDismiss={() => setSeen(null)} />}
      <JoinedPhotosStrip photos={joined.photos} onRemove={joined.remove} disabled={sending} />
      {joined.problem && <p role="alert" className="mb-2 text-sm text-destructive">{joined.problem}</p>}
      {(reading || joined.preparing) && <p role="status" className="mb-2 flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{reading ? 'Lecture des photos…' : 'Préparation des photos…'}</p>}
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
                : joined.photos.length > 0
                  ? 'Une question sur ces photos ? (facultatif)'
                  : 'Ta question sur le repas, le stock…'
          }
          autoFocus={autoFocus}
          disabled={disabled || sending || isRecording || isTranscribing}
          rows={1}
          className="min-w-0 flex-1 resize-none min-h-[44px] py-2 text-base"
          aria-label="Message à envoyer à l'assistant"
        />
        <JoinPhotosButton onFiles={files => void joined.add(files)}
          disabled={disabled || sending || isRecording || isTranscribing || joined.preparing || joined.photos.length >= MAX_JOINED_PHOTOS} />
        <DictationMicButton dictation={dictation} disabled={disabled || sending} />
        <Button
          type="submit"
          size="icon"
          variant="default"
          disabled={disabled || sending || (!text.trim() && joined.photos.length === 0) || isRecording || isTranscribing || joined.preparing}
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
    {review && <GroceryReviewDialog key={review.key} owner={expectedUserId} photos={review.photos} items={review.items}
      onClose={() => setReview(null)} onAdded={() => setSeen(null)} />}
    </>
  );
}
