import { act, renderHook } from '@testing-library/react';
import { appendDictation, useDictation } from '../useDictation';

const mockTranscribe = jest.fn();
// lib/api reads import.meta.env, which ts-jest cannot load: a local ApiError stands in.
jest.mock('@/services/assistantApi', () => ({
  ApiError: class ApiError extends Error {},
  newClientRequestId: () => '55555555-5555-4555-8555-555555555555',
  postAssistantTranscription: (...args: unknown[]) => mockTranscribe(...args),
}));
const { ApiError } = jest.requireMock('@/services/assistantApi') as { ApiError: new (message: string, options?: unknown) => Error };

class FakeRecorder {
  static supported = true;
  static throwOnCreate = false;
  /** Browsers fire `stop` after stop() returns; tests can hold it back. */
  static deferStop = false;
  static pendingStop: (() => void) | null = null;
  static last: FakeRecorder | null = null;
  static isTypeSupported = (mime: string) => FakeRecorder.supported && mime === 'audio/webm;codecs=opus';
  state: 'inactive' | 'recording' = 'inactive';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(readonly stream: unknown, readonly options: { mimeType: string; audioBitsPerSecond: number }) {
    if (FakeRecorder.throwOnCreate) throw new DOMException('unsupported', 'NotSupportedError');
    FakeRecorder.last = this;
  }
  start() { this.state = 'recording'; }
  stop() {
    if (this.state === 'inactive') return;
    this.state = 'inactive';
    const emit = () => { this.ondataavailable?.({ data: new Blob(['audio'], { type: 'audio/webm' }) }); this.onstop?.(); };
    if (FakeRecorder.deferStop) FakeRecorder.pendingStop = emit; else emit();
  }
}
const track = { stop: jest.fn() };
const getUserMedia = jest.fn();
const transcription = (text: string) => ({ transcription_id: 't', client_request_id: '55555555-5555-4555-8555-555555555555', text, languages: ['fr'],
  requested_model: 'gpt-transcribe', served_model: null, duration_seconds: 2, duration_source: 'provider',
  cost: { usd: 0.00015, quality: 'known', reason: null, pricing_version: 'test' } });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }

beforeEach(() => {
  FakeRecorder.supported = true;
  FakeRecorder.throwOnCreate = false;
  FakeRecorder.deferStop = false;
  FakeRecorder.pendingStop = null;
  FakeRecorder.last = null;
  track.stop.mockReset();
  mockTranscribe.mockReset();
  getUserMedia.mockReset().mockResolvedValue({ getTracks: () => [track] });
  (globalThis as { MediaRecorder?: unknown }).MediaRecorder = FakeRecorder;
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
});

function setup(owner = 'owner-a', maxRecordingMs?: number) {
  const onTranscript = jest.fn();
  const hook = renderHook(props => useDictation({ onTranscript, owner: props.owner, maxRecordingMs }), { initialProps: { owner } });
  return { onTranscript, hook };
}

test('a stopped recording is transcribed and handed over as text, never sent to the agent', async () => {
  mockTranscribe.mockResolvedValue(transcription('Ajoute deux litres de lait'));
  const { onTranscript, hook } = setup();
  await act(() => hook.result.current.toggle());
  expect(hook.result.current.status).toBe('recording');
  expect(FakeRecorder.last?.options).toMatchObject({ mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 64000 });
  await act(() => hook.result.current.toggle());
  expect(onTranscript).toHaveBeenCalledWith('Ajoute deux litres de lait');
  expect(hook.result.current.status).toBe('idle');
  expect(track.stop).toHaveBeenCalled();
  expect(mockTranscribe).toHaveBeenCalledWith(expect.objectContaining({ languages: ['fr'], expectedUserId: 'owner-a', audioMime: 'audio/webm;codecs=opus' }));
});

test('cancelling a recording uploads nothing and frees the microphone', async () => {
  const { onTranscript, hook } = setup();
  await act(() => hook.result.current.toggle());
  act(() => hook.result.current.cancel());
  expect(hook.result.current.status).toBe('idle');
  expect(track.stop).toHaveBeenCalled();
  expect(mockTranscribe).not.toHaveBeenCalled();
  expect(onTranscript).not.toHaveBeenCalled();
});

test('a late transcription is ignored after a cancel or an account change', async () => {
  const pending = deferred<ReturnType<typeof transcription>>();
  mockTranscribe.mockReturnValue(pending.promise);
  const { onTranscript, hook } = setup();
  await act(() => hook.result.current.toggle());
  await act(() => hook.result.current.toggle());
  expect(hook.result.current.status).toBe('transcribing');
  const signal = mockTranscribe.mock.calls[0][0].signal as AbortSignal;
  act(() => hook.result.current.cancel());
  expect(signal.aborted).toBe(true);
  await act(async () => pending.resolve(transcription('ancienne phrase')));
  expect(onTranscript).not.toHaveBeenCalled();

  const second = deferred<ReturnType<typeof transcription>>();
  mockTranscribe.mockReturnValue(second.promise);
  await act(() => hook.result.current.toggle());
  await act(() => hook.result.current.toggle());
  hook.rerender({ owner: 'owner-b' });
  expect(hook.result.current.status).toBe('idle');
  await act(async () => second.resolve(transcription('phrase du compte A')));
  expect(onTranscript).not.toHaveBeenCalled();
});

test('a refused or missing microphone leaves typing available with an explanation', async () => {
  getUserMedia.mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
  const { hook } = setup();
  await act(() => hook.result.current.toggle());
  expect(hook.result.current).toMatchObject({ status: 'error', error: expect.stringContaining('Micro refusé') });
  FakeRecorder.supported = false;
  await act(() => hook.result.current.toggle());
  expect(hook.result.current.error).toContain("n'est pas disponible");
  expect(mockTranscribe).not.toHaveBeenCalled();
});

test('the time limit stops the recording and transcribes it', async () => {
  jest.useFakeTimers();
  try {
    mockTranscribe.mockResolvedValue(transcription('Trois oeufs'));
    const { onTranscript, hook } = setup('owner-a', 1000);
    await act(() => hook.result.current.toggle());
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(onTranscript).toHaveBeenCalledWith('Trois oeufs');
  } finally {
    jest.useRealTimers();
  }
});

test('an empty transcript or a server refusal asks to retry instead of filling the field', async () => {
  mockTranscribe.mockResolvedValueOnce(transcription('')).mockRejectedValueOnce(new ApiError('Dictée trop longue (max 60 s).', { status: 413 }));
  const { onTranscript, hook } = setup();
  await act(() => hook.result.current.toggle());
  await act(() => hook.result.current.toggle());
  expect(hook.result.current).toMatchObject({ status: 'error', error: expect.stringContaining('rien entendu') });
  await act(() => hook.result.current.toggle());
  await act(() => hook.result.current.toggle());
  expect(hook.result.current.error).toBe('Dictée trop longue (max 60 s).');
  expect(onTranscript).not.toHaveBeenCalled();
});

test('a second tap before the browser confirms the stop does not lose the dictation', async () => {
  mockTranscribe.mockResolvedValue(transcription('Une boîte de pois chiches'));
  FakeRecorder.deferStop = true;
  const { onTranscript, hook } = setup();
  await act(() => hook.result.current.toggle());
  await act(() => hook.result.current.toggle());
  await act(() => hook.result.current.toggle());
  expect(getUserMedia).toHaveBeenCalledTimes(1);
  await act(async () => FakeRecorder.pendingStop?.());
  expect(onTranscript).toHaveBeenCalledWith('Une boîte de pois chiches');
  expect(mockTranscribe).toHaveBeenCalledTimes(1);
});

test('a recorder that cannot start frees the microphone and explains', async () => {
  FakeRecorder.throwOnCreate = true;
  const { hook } = setup();
  await act(() => hook.result.current.toggle());
  expect(hook.result.current).toMatchObject({ status: 'error', error: expect.stringContaining("n'a pas pu démarrer") });
  expect(track.stop).toHaveBeenCalled();
});

test('a cancel during the permission prompt or an unmount leaves no live microphone', async () => {
  const permission = deferred<{ getTracks: () => typeof track[] }>();
  getUserMedia.mockReturnValueOnce(permission.promise);
  const { hook } = setup();
  let starting!: Promise<void>;
  act(() => { starting = hook.result.current.toggle(); });
  act(() => hook.result.current.cancel());
  await act(async () => { permission.resolve({ getTracks: () => [track] }); await starting; });
  expect(track.stop).toHaveBeenCalled();
  expect(FakeRecorder.last).toBeNull();
  expect(hook.result.current.status).toBe('idle');

  track.stop.mockReset();
  await act(() => hook.result.current.toggle());
  expect(hook.result.current.status).toBe('recording');
  hook.unmount();
  expect(track.stop).toHaveBeenCalled();
  expect(mockTranscribe).not.toHaveBeenCalled();
});

test('dictated text is added to what was typed, never replacing it', () => {
  expect(appendDictation('', 'du lait')).toBe('du lait');
  expect(appendDictation('Pour ce soir,  ', 'du lait')).toBe('Pour ce soir, du lait');
});
