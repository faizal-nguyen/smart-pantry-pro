/**
 * V10-03E E2 — review step of the floating mic: the dictated text is shown,
 * can be corrected or completed by another dictation, and only "Envoyer"
 * reaches the assistant.
 */
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { UseDictationReturn } from '@/hooks/useDictation';
import { DictationMicButton, DictationStatusLine } from './DictationControls';

export interface AssistantDraftDialogProps {
  open: boolean;
  draft: string;
  onDraftChange: (draft: string) => void;
  dictation: UseDictationReturn;
  sending: boolean;
  error: string | null;
  onSend: () => void;
  /** Closes without sending; the dictation in progress is dropped. */
  onDiscard: () => void;
}

export function AssistantDraftDialog({
  open, draft, onDraftChange, dictation, sending, error, onSend, onDiscard,
}: AssistantDraftDialogProps) {
  const busy = sending || dictation.status === 'recording' || dictation.status === 'transcribing';
  return (
    <Dialog open={open} onOpenChange={next => { if (!next && !sending) onDiscard(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vérifie ta demande</DialogTitle>
          <DialogDescription>Rien n’est envoyé à l’assistant avant que tu appuies sur Envoyer.</DialogDescription>
        </DialogHeader>
        <DictationStatusLine dictation={dictation} />
        <label className="space-y-2 text-sm font-medium">
          Demande à envoyer
          <Textarea
            value={draft}
            onChange={event => onDraftChange(event.target.value)}
            disabled={sending || dictation.status === 'recording' || dictation.status === 'transcribing'}
            placeholder="Ta demande apparaît ici. Tu peux la corriger."
            className="text-base"
          />
        </label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center justify-end gap-2">
          <DictationMicButton dictation={dictation} disabled={sending} className="mr-auto" />
          <Button type="button" variant="outline" className="min-h-11" disabled={sending} onClick={onDiscard}>
            Annuler
          </Button>
          <Button type="button" className="min-h-11" disabled={busy || !draft.trim()} onClick={onSend}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Envoyer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
