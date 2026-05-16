/**
 * PRP-221 Sprint 1 frontend — global floating mic button.
 *
 * Tap once → start recording. Tap again → stop, upload, show result
 * dialog. Pulses red while recording. Hides itself entirely if the
 * user is on /auth or any unauth surface (the dialog needs a Supabase
 * session to mint the API call).
 *
 * Coexists with FloatingVideoButton.tsx (different bottom-right
 * offset).
 */
import { Mic, Square, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

export interface AssistantFABProps {
  status: 'idle' | 'recording' | 'uploading' | 'processing' | 'done' | 'error';
  recordingMs: number;
  onClick: () => void;
  /** Hide on these route paths. Defaults to /auth and /login. */
  hideOnPaths?: readonly string[];
}

const DEFAULT_HIDE_PATHS = ['/auth', '/login', '/signup'] as const;

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function AssistantFAB({
  status,
  recordingMs,
  onClick,
  hideOnPaths = DEFAULT_HIDE_PATHS,
}: AssistantFABProps) {
  const location = useLocation();
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setHasSession(Boolean(data.session));
    });
    const { data } = supabase.auth.onAuthStateChange((_evt, session) => {
      setHasSession(Boolean(session));
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  if (hideOnPaths.some((p) => location.pathname.startsWith(p))) return null;
  if (hasSession === false) return null;

  const isRecording = status === 'recording';
  const isBusy = status === 'uploading' || status === 'processing';

  const label = isRecording
    ? `Arrêter l'enregistrement (${formatMs(recordingMs)})`
    : isBusy
      ? 'Traitement en cours…'
      : 'Activer l’assistant vocal';

  return (
    <Button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={isBusy}
      className={cn(
        'fixed z-40 h-14 w-14 rounded-full shadow-xl transition-all',
        'bottom-6 right-6 sm:bottom-8 sm:right-8',
        isRecording
          ? 'bg-red-600 hover:bg-red-700 animate-pulse'
          : 'bg-primary hover:bg-primary/90'
      )}
      data-testid="assistant-fab"
    >
      {isBusy ? (
        <Loader2 className="h-6 w-6 animate-spin text-white" />
      ) : isRecording ? (
        <div className="flex flex-col items-center justify-center text-white">
          <Square className="h-5 w-5" fill="currentColor" />
          <span className="mt-0.5 text-[10px] font-mono leading-none">
            {formatMs(recordingMs)}
          </span>
        </div>
      ) : (
        <Mic className="h-6 w-6 text-white" />
      )}
    </Button>
  );
}
