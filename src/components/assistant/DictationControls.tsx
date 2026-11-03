/**
 * V10-03E E2 — shared dictation controls: the mic button and the state line
 * (listening time, transcription, error) with the cancel action.
 * Same wording on every surface that dictates.
 */
import { Loader2, Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UseDictationReturn } from '@/hooks/useDictation';

const LIMIT_LABEL = '1:00';

function formatMs(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function DictationMicButton({ dictation, disabled, className }: {
  dictation: UseDictationReturn;
  disabled?: boolean;
  className?: string;
}) {
  const recording = dictation.status === 'recording';
  const transcribing = dictation.status === 'transcribing';
  return (
    <Button
      type="button"
      size="icon"
      variant={recording ? 'destructive' : 'outline'}
      onClick={() => void dictation.toggle()}
      disabled={disabled || transcribing}
      aria-label={recording ? 'Terminer la dictée' : 'Dicter'}
      aria-pressed={recording}
      className={cn('min-w-[44px] min-h-[44px]', recording && 'animate-pulse', className)}
    >
      {recording ? <Square className="h-4 w-4" aria-hidden="true" />
        : transcribing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        : <Mic className="h-4 w-4" aria-hidden="true" />}
    </Button>
  );
}

export function DictationStatusLine({ dictation, className }: {
  dictation: UseDictationReturn;
  className?: string;
}) {
  if (dictation.status === 'error' && dictation.error) {
    return <p role="alert" className={cn('text-sm text-destructive', className)}>{dictation.error}</p>;
  }
  if (dictation.status !== 'recording' && dictation.status !== 'transcribing') return null;
  return (
    <div role="status" className={cn('flex items-center justify-between gap-2 text-sm text-muted-foreground', className)}>
      <span>
        {dictation.status === 'recording'
          ? `J'écoute… ${formatMs(dictation.recordingMs)} / ${LIMIT_LABEL}`
          : 'Transcription… rien ne sera envoyé avant ta relecture.'}
      </span>
      <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={dictation.cancel}>
        Annuler la dictée
      </Button>
    </div>
  );
}
