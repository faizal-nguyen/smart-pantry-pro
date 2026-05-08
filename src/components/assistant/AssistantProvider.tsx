/**
 * PRP-221 Sprint 1 frontend — top-level wiring.
 *
 * Mounts :
 *   - the floating mic FAB (visible on every authenticated route)
 *   - the result dialog (opens after each /voice or /text round-trip)
 *
 * One instance per app. Wrap the router children in `<AssistantProvider>`
 * inside App.tsx so the FAB hangs over every page.
 */
import { useEffect, useMemo, useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import { useAssistantVoice } from '@/hooks/useAssistantVoice';

import { AssistantFAB } from './AssistantFAB';
import { AssistantResultDialog } from './AssistantResultDialog';

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
  const voice = useAssistantVoice({ language, allowedTools });
  const [dialogOpen, setDialogOpen] = useState(false);

  // Auto-open the dialog when a result lands. User can close it; we
  // don't reopen it on the same result.
  useEffect(() => {
    if (voice.status === 'done' && voice.result) {
      setDialogOpen(true);
    }
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
      <AssistantFAB
        status={fabStatus}
        recordingMs={voice.recordingMs}
        onClick={() => {
          if (fabStatus === 'idle' || fabStatus === 'recording') {
            void voice.toggleRecording();
          }
        }}
      />
      <AssistantResultDialog
        open={dialogOpen}
        onOpenChange={handleClose}
        result={voice.result}
        onResultPatched={voice.patchResult}
      />
    </>
  );
}
