/**
 * V10-03E E2 — dictation: record → transcribe → hand the text to the caller.
 *
 *   idle ─► recording ─► transcribing ─► idle   (onTranscript(text))
 *                     └─► error (recoverable; typing always stays available)
 *   cancel() at any point: the capture is dropped and never uploaded, or the
 *   late transcription is ignored. A new recording, an account change or an
 *   unmount does the same.
 *
 * This hook never reaches the agent. The caller puts the text in its own
 * editable field; the user corrects it and sends it like a typed message, so
 * a misheard word cannot change the stock before it is read.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ApiError,
  newClientRequestId,
  postAssistantTranscription,
} from '@/services/assistantApi';

export type DictationStatus = 'idle' | 'recording' | 'transcribing' | 'error';

export interface UseDictationOptions {
  /** Receives the transcribed text; the caller shows it as an editable draft. */
  onTranscript: (text: string) => void;
  /** Account the dictation belongs to. A change drops the dictation in flight. */
  owner?: string;
  /** Expected ISO-639-1 languages. Default French. */
  languages?: readonly string[];
  /** Hard cap, also enforced by the server. Default 60 s. */
  maxRecordingMs?: number;
}

export interface UseDictationReturn {
  status: DictationStatus;
  recordingMs: number;
  error: string | null;
  /** Start, or stop and transcribe. Ignored while a transcription is pending. */
  toggle: () => Promise<void>;
  /** Drop the recording, or ignore the pending transcription. */
  cancel: () => void;
}

const PREFERRED_MIMES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
];
const DEFAULT_LANGUAGES = ['fr'] as const;
// Speech needs little: keeps 60 s well under the server size limit.
const AUDIO_BITS_PER_SECOND = 64_000;

/** A dictation adds to what is already written; it never replaces it. */
export function appendDictation(current: string, dictated: string): string {
  return current.trim() ? `${current.trimEnd()} ${dictated}` : dictated;
}

function pickSupportedMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  return PREFERRED_MIMES.find(mime => MediaRecorder.isTypeSupported(mime)) ?? null;
}

export function useDictation({
  onTranscript,
  owner,
  languages = DEFAULT_LANGUAGES,
  maxRecordingMs = 60_000,
}: UseDictationOptions): UseDictationReturn {
  const [status, setStatus] = useState<DictationStatus>('idle');
  const [recordingMs, setRecordingMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tickerRef = useRef<number | null>(null);
  const limitRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Every start, cancel, account change and unmount bumps the epoch; late
  // callbacks from an older epoch are ignored.
  const epochRef = useRef(0);
  const latest = useRef({ onTranscript, owner, languages });
  latest.current = { onTranscript, owner, languages };

  /** Frees the microphone, listeners and timers. */
  const release = useCallback(() => {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state !== 'inactive') recorder.stop();
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (tickerRef.current !== null) window.clearInterval(tickerRef.current);
    if (limitRef.current !== null) window.clearTimeout(limitRef.current);
    tickerRef.current = null;
    limitRef.current = null;
  }, []);

  const cancel = useCallback(() => {
    epochRef.current++;
    release();
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus('idle');
    setRecordingMs(0);
    setError(null);
  }, [release]);

  // Account change and unmount: the previous dictation is dropped.
  useEffect(() => cancel, [owner, cancel]);

  const fail = useCallback((message: string) => {
    setStatus('error');
    setError(message);
  }, []);

  const transcribe = useCallback(async (audio: Blob, mime: string, seconds: number, epoch: number) => {
    if (epoch !== epochRef.current) return;
    if (audio.size === 0) return fail('Aucun son enregistré. Réessaie ou écris ta demande.');
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('transcribing');
    try {
      const result = await postAssistantTranscription({
        audio,
        audioMime: mime,
        clientRequestId: newClientRequestId(),
        languages: latest.current.languages,
        audioDurationSeconds: seconds,
        expectedUserId: latest.current.owner,
        signal: controller.signal,
      });
      if (epoch !== epochRef.current) return;
      abortRef.current = null;
      if (!result.text) return fail("Je n'ai rien entendu de clair. Réessaie ou écris ta demande.");
      setStatus('idle');
      setRecordingMs(0);
      latest.current.onTranscript(result.text);
    } catch (err) {
      if (epoch !== epochRef.current) return;
      abortRef.current = null;
      fail(err instanceof ApiError ? err.message : 'Transcription indisponible. Tu peux écrire ta demande.');
    }
  }, [fail]);

  const start = useCallback(async () => {
    const epoch = ++epochRef.current;
    setError(null);
    setRecordingMs(0);
    const mime = pickSupportedMime();
    if (!mime || !navigator.mediaDevices?.getUserMedia) {
      return fail("La dictée n'est pas disponible sur ce navigateur. Écris ta demande.");
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      if (epoch !== epochRef.current) return;
      return fail(err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Micro refusé. Autorise-le dans le navigateur ou écris ta demande.'
        : 'Micro indisponible. Écris ta demande.');
    }
    if (epoch !== epochRef.current) {
      stream.getTracks().forEach(track => track.stop());
      return;
    }
    streamRef.current = stream;
    const chunks: Blob[] = [];
    const startedAt = Date.now();
    try {
      const recorder = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: AUDIO_BITS_PER_SECOND });
      recorderRef.current = recorder;
      recorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        if (epoch !== epochRef.current) return;
        const seconds = (Date.now() - startedAt) / 1000;
        release();
        void transcribe(new Blob(chunks, { type: mime }), mime, seconds, epoch);
      };
      recorder.onerror = () => {
        if (epoch !== epochRef.current) return;
        release();
        fail("L'enregistrement s'est interrompu. Réessaie ou écris ta demande.");
      };
      recorder.start();
    } catch {
      release();
      return fail("Le micro n'a pas pu démarrer. Réessaie ou écris ta demande.");
    }
    setStatus('recording');
    tickerRef.current = window.setInterval(() => setRecordingMs(Date.now() - startedAt), 250);
    limitRef.current = window.setTimeout(() => {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    }, maxRecordingMs);
  }, [fail, maxRecordingMs, release, transcribe]);

  const toggle = useCallback(async () => {
    const recorder = recorderRef.current;
    // A stopped recorder stays referenced until its `stop` event, which the
    // browser fires later: taps in between must not start a second capture.
    if (recorder) {
      if (recorder.state === 'recording') recorder.stop();
      return;
    }
    if (!abortRef.current) await start();
  }, [start]);

  return { status, recordingMs, error, toggle, cancel };
}
