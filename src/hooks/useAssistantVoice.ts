/**
 * PRP-221 Sprint 1 frontend — voice/text recording + dispatch hook.
 *
 * State machine :
 *   idle ─► recording ─► uploading ─► processing ─► done
 *                                   └─► error (recoverable)
 *   At any point: cancel() → idle.
 *
 * Recording uses MediaRecorder. We pick the best supported MIME for
 * Whisper compatibility (webm/opus is best).
 *
 * Idempotency : a single client_request_id is minted at recording
 * START. If the upload fails and the user retries, we keep the same
 * id so the server dedupes via UNIQUE(user_id, client_request_id, step_seq).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  postAssistantVoice,
  postAssistantText,
  newClientRequestId,
  type AssistantPlanResponse,
} from '@/services/assistantApi';

export type AssistantStatus =
  | 'idle'
  | 'recording'
  | 'uploading'
  | 'processing'
  | 'done'
  | 'error';

export interface UseAssistantVoiceOptions {
  /** ISO-639-1 language hint to Whisper. Default: undefined (auto-detect). */
  language?: string;
  /** Restrict to a subset of tools (e.g. shopping page = ['add_shopping_items']). */
  allowedTools?: readonly string[];
  /** Hard-cap recording length in ms. Default 60s. */
  maxRecordingMs?: number;
}

export interface UseAssistantVoiceReturn {
  status: AssistantStatus;
  recordingMs: number;
  result: AssistantPlanResponse | null;
  error: string | null;
  /** Tap once to start, tap again to stop and send. */
  toggleRecording: () => Promise<void>;
  /** Send a typed message instead of audio. */
  sendText: (text: string) => Promise<void>;
  /** Throw away the current state (cancels mic if active). */
  reset: () => void;
  /** Update the cached result after a confirm/undo round-trip. */
  patchResult: (patch: Partial<AssistantPlanResponse>) => void;
}

const PREFERRED_MIMES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
];

function pickSupportedMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const mime of PREFERRED_MIMES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return null;
}

export function useAssistantVoice(
  options: UseAssistantVoiceOptions = {}
): UseAssistantVoiceReturn {
  const { language, allowedTools, maxRecordingMs = 60_000 } = options;

  const [status, setStatus] = useState<AssistantStatus>('idle');
  const [recordingMs, setRecordingMs] = useState(0);
  const [result, setResult] = useState<AssistantPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeRef = useRef<string>('');
  const startedAtRef = useRef<number>(0);
  const tickerRef = useRef<number | null>(null);
  const maxStopTimerRef = useRef<number | null>(null);
  const requestIdRef = useRef<string | null>(null);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (tickerRef.current !== null) {
      window.clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
    if (maxStopTimerRef.current !== null) {
      window.clearTimeout(maxStopTimerRef.current);
      maxStopTimerRef.current = null;
    }
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  // Always cleanup on unmount (don't leave the mic hot).
  useEffect(() => {
    return () => cleanupStream();
  }, [cleanupStream]);

  const reset = useCallback(() => {
    cleanupStream();
    requestIdRef.current = null;
    setStatus('idle');
    setRecordingMs(0);
    setResult(null);
    setError(null);
  }, [cleanupStream]);

  const dispatchAudio = useCallback(
    async (blob: Blob, durationSeconds: number) => {
      if (!requestIdRef.current) requestIdRef.current = newClientRequestId();
      setStatus('uploading');
      setError(null);
      try {
        const response = await postAssistantVoice({
          audio: blob,
          audioMime: mimeRef.current,
          clientRequestId: requestIdRef.current,
          language,
          audioDurationSeconds: durationSeconds,
          allowedTools,
        });
        setStatus('done');
        setResult(response);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
    },
    [allowedTools, language]
  );

  const startRecording = useCallback(async () => {
    if (status === 'recording') return;
    setError(null);
    setResult(null);
    setRecordingMs(0);
    requestIdRef.current = newClientRequestId();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setStatus('error');
      setError(
        err instanceof Error
          ? `Permission micro refusée : ${err.message}`
          : 'Permission micro refusée'
      );
      return;
    }

    const mime = pickSupportedMime();
    if (!mime) {
      stream.getTracks().forEach((t) => t.stop());
      setStatus('error');
      setError('Aucun encodeur audio compatible (essaie Chrome ou Firefox).');
      return;
    }
    mimeRef.current = mime;
    streamRef.current = stream;

    const recorder = new MediaRecorder(stream, { mimeType: mime });
    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      const durationSec = (Date.now() - startedAtRef.current) / 1000;
      cleanupStream();
      void dispatchAudio(blob, durationSec);
    };
    recorder.onerror = () => {
      cleanupStream();
      setStatus('error');
      setError('Enregistrement audio interrompu.');
    };

    startedAtRef.current = Date.now();
    recorder.start();
    setStatus('recording');

    tickerRef.current = window.setInterval(() => {
      setRecordingMs(Date.now() - startedAtRef.current);
    }, 100);

    maxStopTimerRef.current = window.setTimeout(() => {
      if (recorderRef.current && recorderRef.current.state === 'recording') {
        recorderRef.current.stop();
      }
    }, maxRecordingMs);
  }, [cleanupStream, dispatchAudio, maxRecordingMs, status]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
  }, []);

  const toggleRecording = useCallback(async () => {
    if (status === 'recording') stopRecording();
    else await startRecording();
  }, [startRecording, status, stopRecording]);

  const sendText = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      requestIdRef.current = newClientRequestId();
      setError(null);
      setResult(null);
      setStatus('uploading');
      try {
        const response = await postAssistantText({
          text: text.trim(),
          clientRequestId: requestIdRef.current,
          language,
          allowedTools,
        });
        setStatus('done');
        setResult(response);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Send failed');
      }
    },
    [allowedTools, language]
  );

  const patchResult = useCallback(
    (patch: Partial<AssistantPlanResponse>) => {
      setResult((prev) => (prev ? { ...prev, ...patch } : prev));
    },
    []
  );

  return {
    status,
    recordingMs,
    result,
    error,
    toggleRecording,
    sendText,
    reset,
    patchResult,
  };
}
