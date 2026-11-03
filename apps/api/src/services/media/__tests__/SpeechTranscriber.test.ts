import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AssistantTranscriptionSchema } from '@smart/shared';
import {
  createSpeechTranscriber,
  detectAudioFormat,
  loadTranscriptionModel,
  type TranscriptionProvider,
} from '../SpeechTranscriber.js';

const audioPath = path.join(mkdtempSync(path.join(os.tmpdir(), 'speech-test-')), 'audio.webm');
writeFileSync(audioPath, Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0]));

function provider(response: unknown) {
  const calls: Record<string, unknown>[] = [];
  const create: TranscriptionProvider = async (params) => { calls.push(params); return response; };
  return { create, calls };
}
const valid = (result: object) => AssistantTranscriptionSchema.parse({ client_request_id: '55555555-5555-4555-8555-555555555555', ...result });

test('gpt-transcribe sends languages, never the deprecated language or verbose_json', async () => {
  const fake = provider({ text: ' Ajoute deux litres de lait. ', languages: [{ code: 'fr' }], usage: { type: 'duration', seconds: 30 } });
  const result = await createSpeechTranscriber('gpt-transcribe', fake.create).transcribe({ audioPath, languages: ['fr'] });
  const params = fake.calls[0];
  expect(params).toMatchObject({ model: 'gpt-transcribe', languages: ['fr'] });
  expect(params).not.toHaveProperty('language');
  expect(params).not.toHaveProperty('response_format');
  expect(String(params.prompt)).not.toMatch(/santé|allerg|mémoire/i);
  expect(valid(result)).toMatchObject({
    text: 'Ajoute deux litres de lait.', languages: ['fr'], requested_model: 'gpt-transcribe', served_model: null,
    duration_seconds: 30, duration_source: 'provider', cost: { usd: 0.00225, quality: 'known', reason: null },
  });
});

test('whisper-1 keeps its own contract while it remains available', async () => {
  const fake = provider({ text: 'Bonjour', language: 'french', duration: 12 });
  const result = await createSpeechTranscriber('whisper-1', fake.create).transcribe({ audioPath, languages: ['fr', 'en'] });
  expect(fake.calls[0]).toMatchObject({ model: 'whisper-1', language: 'fr', response_format: 'verbose_json' });
  expect(fake.calls[0]).not.toHaveProperty('languages');
  expect(result).toMatchObject({ languages: ['french'], duration_seconds: 12, duration_source: 'provider', cost: { usd: 0.0012, quality: 'known' } });
});

test('a browser duration only gives an estimate, and token usage is never priced by guess', async () => {
  const tokens = provider({ text: 'Trois oeufs', languages: [], usage: { type: 'tokens', input_tokens: 50, output_tokens: 4, total_tokens: 54 } });
  const estimated = await createSpeechTranscriber('gpt-transcribe', tokens.create).transcribe({ audioPath, clientDurationSeconds: 20 });
  expect(estimated).toMatchObject({ languages: [], duration_seconds: 20, duration_source: 'client', cost: { usd: 0.0015, quality: 'estimated', reason: 'client_reported_duration' } });
  const unknown = await createSpeechTranscriber('gpt-transcribe', tokens.create).transcribe({ audioPath });
  expect(valid(unknown)).toMatchObject({ duration_seconds: null, duration_source: null, cost: { usd: null, quality: 'unknown', reason: 'token_usage_not_priced' } });
  expect(tokens.calls[1]).not.toHaveProperty('languages');
});

test('an unknown usage shape keeps the text; a response without text is an error', async () => {
  const odd = provider({ text: 'Du sel', usage: { type: 'credits', amount: 3 } });
  expect(await createSpeechTranscriber('gpt-transcribe', odd.create).transcribe({ audioPath }))
    .toMatchObject({ text: 'Du sel', cost: { usd: null, quality: 'unknown', reason: 'duration_unknown' } });
  await expect(createSpeechTranscriber('gpt-transcribe', provider({ error: 'nope' }).create).transcribe({ audioPath }))
    .rejects.toThrow('Unexpected transcription response');
});

test('the model is chosen on the server and invalid values stop the boot', () => {
  expect(loadTranscriptionModel({})).toBe('gpt-transcribe');
  expect(loadTranscriptionModel({ ASSISTANT_TRANSCRIPTION_MODEL: 'whisper-1' })).toBe('whisper-1');
  expect(() => loadTranscriptionModel({ ASSISTANT_TRANSCRIPTION_MODEL: 'gpt-4o-transcribe' })).toThrow('ASSISTANT_TRANSCRIPTION_MODEL_INVALID');
});

test('the audio format comes from the content, not from the declared type', () => {
  const pad = (head: number[] | string, size = 16) => {
    const bytes = typeof head === 'string' ? Array.from(Buffer.from(head, 'latin1')) : head;
    return Uint8Array.from([...bytes, ...new Array(Math.max(0, size - bytes.length)).fill(0)]);
  };
  expect(detectAudioFormat(pad([0x1a, 0x45, 0xdf, 0xa3]))).toBe('webm');
  expect(detectAudioFormat(pad('\0\0\0\x1cftypiso5'))).toBe('mp4');
  expect(detectAudioFormat(pad('OggS'))).toBe('ogg');
  expect(detectAudioFormat(pad('RIFF\0\0\0\0WAVE'))).toBe('wav');
  expect(detectAudioFormat(pad('ID3'))).toBe('mp3');
  expect(detectAudioFormat(pad([0xff, 0xfb]))).toBe('mp3');
  expect(detectAudioFormat(pad('<html><body>'))).toBeNull();
  expect(detectAudioFormat(Uint8Array.from([0x1a, 0x45]))).toBeNull();
});
