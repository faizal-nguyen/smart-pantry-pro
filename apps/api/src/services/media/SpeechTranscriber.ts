/**
 * V10-03E E1 — speech-to-text adapter for the assistant.
 *
 * One adapter, one contract per model, checked against the OpenAI docs on
 * 2026-11-03 (guides/speech-to-text, models/gpt-transcribe, API reference):
 *   - gpt-transcribe : `languages` (array, replaces `language`), `prompt`,
 *     JSON response `{ text, languages: [{ code }], usage? }`. 0.0045 USD/min.
 *   - whisper-1 (deprecated, shut down on 2027-02-26) : `language`,
 *     `prompt`, `verbose_json` with `duration`. 0.006 USD/min.
 * `usage` may be `{ type: 'duration', seconds }` or `{ type: 'tokens', ... }`;
 * the docs do not say which one gpt-transcribe returns, so both are read and
 * no token price is invented. Files: 25 MB max, flac/mp3/mp4/mpeg/mpga/m4a/
 * ogg/wav/webm.
 *
 * The provider is selected server-side (ASSISTANT_TRANSCRIPTION_MODEL) so a
 * rollback does not need a client release. Whisper cannot be that rollback
 * after its shutdown date.
 */
import { createReadStream } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  TranscriptionModelSchema,
  type AssistantTranscription,
  type TranscriptionModel,
} from '@smart/shared';

export const TRANSCRIPTION_PRICING_VERSION = 'openai-transcription-usd-2026-11-03';
export const TRANSCRIPTION_USD_PER_MINUTE: Readonly<Record<TranscriptionModel, number>> = Object.freeze({
  'gpt-transcribe': 0.0045,
  'whisper-1': 0.006,
});

/** Fixed recognition context. Never carries profile, health data or memories (V10-03C). */
const RECOGNITION_PROMPT =
  'Demande dictée dans une application de cuisine : courses, stock, recettes, quantités et unités.';

export type TranscriptionResult = Omit<AssistantTranscription, 'client_request_id'>;

export interface TranscribeInput {
  audioPath: string;
  /** Expected ISO-639-1 languages, already bounded by the caller. */
  languages?: readonly string[];
  /** Duration measured by the browser. Only ever yields an estimated cost. */
  clientDurationSeconds?: number;
}

export interface SpeechTranscriber {
  readonly model: TranscriptionModel;
  transcribe(input: TranscribeInput): Promise<TranscriptionResult>;
}

/** The raw `audio.transcriptions.create` call, injectable for tests. */
export type TranscriptionProvider = (params: Record<string, unknown>) => Promise<unknown>;

const ProviderResponseSchema = z.object({
  text: z.string(),
  languages: z.array(z.object({ code: z.string() })).optional(),
  language: z.string().optional(),
  duration: z.number().nonnegative().optional(),
  usage: z.union([
    z.object({ type: z.literal('duration'), seconds: z.number().nonnegative() }),
    z.object({ type: z.literal('tokens') }),
  ]).optional().catch(undefined), // an unknown usage shape costs "unknown", it does not lose the text
});

export function loadTranscriptionModel(env: NodeJS.ProcessEnv = process.env): TranscriptionModel {
  const parsed = TranscriptionModelSchema.safeParse(env.ASSISTANT_TRANSCRIPTION_MODEL ?? 'gpt-transcribe');
  if (!parsed.success) throw new Error('ASSISTANT_TRANSCRIPTION_MODEL_INVALID');
  return parsed.data;
}

export function createSpeechTranscriber(
  model: TranscriptionModel = loadTranscriptionModel(),
  provider: TranscriptionProvider = openAIProvider(),
): SpeechTranscriber {
  return {
    model,
    async transcribe(input) {
      const file = createReadStream(input.audioPath);
      const languages = input.languages ?? [];
      const params: Record<string, unknown> = model === 'whisper-1'
        ? { file, model, prompt: RECOGNITION_PROMPT, response_format: 'verbose_json', ...(languages[0] ? { language: languages[0] } : {}) }
        : { file, model, prompt: RECOGNITION_PROMPT, ...(languages.length ? { languages: [...languages] } : {}) };
      let raw: unknown;
      try {
        raw = await provider(params);
      } finally {
        file.destroy(); // no open descriptor left when the provider fails early
      }
      const response = ProviderResponseSchema.safeParse(raw);
      if (!response.success) throw new Error('Unexpected transcription response');
      const { text, usage } = response.data;
      const providerSeconds = usage?.type === 'duration' ? usage.seconds : response.data.duration ?? null;
      return {
        transcription_id: randomUUID(),
        text: text.trim(),
        languages: response.data.languages?.map(language => language.code) ?? (response.data.language ? [response.data.language] : []),
        requested_model: model,
        served_model: null,
        ...measure(model, providerSeconds, input.clientDurationSeconds, usage?.type),
      };
    },
  };
}

function measure(
  model: TranscriptionModel,
  providerSeconds: number | null,
  clientSeconds: number | undefined,
  usageType: 'duration' | 'tokens' | undefined,
): Pick<TranscriptionResult, 'duration_seconds' | 'duration_source' | 'cost'> {
  const price = (seconds: number) => Number(((seconds / 60) * TRANSCRIPTION_USD_PER_MINUTE[model]).toFixed(6));
  const cost = { pricing_version: TRANSCRIPTION_PRICING_VERSION };
  if (providerSeconds !== null) {
    return { duration_seconds: providerSeconds, duration_source: 'provider', cost: { ...cost, usd: price(providerSeconds), quality: 'known', reason: null } };
  }
  if (clientSeconds !== undefined && Number.isFinite(clientSeconds) && clientSeconds >= 0) {
    return { duration_seconds: clientSeconds, duration_source: 'client', cost: { ...cost, usd: price(clientSeconds), quality: 'estimated', reason: 'client_reported_duration' } };
  }
  return { duration_seconds: null, duration_source: null,
    cost: { ...cost, usd: null, quality: 'unknown', reason: usageType === 'tokens' ? 'token_usage_not_priced' : 'duration_unknown' } };
}

/**
 * Container detected from the first bytes. The extension sent to the provider
 * follows the content, never the client-declared MIME or file name.
 */
export type AudioFormat = 'webm' | 'mp4' | 'ogg' | 'wav' | 'mp3';

export function detectAudioFormat(bytes: Uint8Array): AudioFormat | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (bytes.length < 12) return null;
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return 'webm';
  if (ascii(4, 8) === 'ftyp') return 'mp4';
  if (ascii(0, 4) === 'OggS') return 'ogg';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return 'wav';
  if (ascii(0, 3) === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) return 'mp3';
  return null;
}

/**
 * Lazy-loads the SDK so importing this module does not fail when
 * OPENAI_API_KEY is missing in non-AI environments. A dictation is short:
 * 30 s timeout and a single retry instead of the SDK's 10 min default.
 */
interface OpenAIAudioClient {
  audio: { transcriptions: { create(params: Record<string, unknown>): Promise<unknown> } };
}
type OpenAIConstructor = new (options: { apiKey: string; timeout: number; maxRetries: number }) => OpenAIAudioClient;

function openAIProvider(): TranscriptionProvider {
  let client: OpenAIAudioClient | null = null;
  return async (params) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set on the server.');
    if (!client) {
      const mod = (await import('openai')) as unknown as { default?: OpenAIConstructor; OpenAI?: OpenAIConstructor };
      const OpenAI = mod.default ?? mod.OpenAI;
      if (!OpenAI) throw new Error('OpenAI SDK unavailable');
      client = new OpenAI({ apiKey, timeout: 30_000, maxRetries: 1 });
    }
    return client.audio.transcriptions.create(params);
  };
}
