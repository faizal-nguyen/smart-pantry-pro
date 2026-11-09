import { ModelInvocation } from '../ModelInvocation.js';
import { benchmarkConfig } from '../ModelConfig.js';
import type { AICompletionResponse } from '../../imports/RecipeExtractionService.js';

const ok: AICompletionResponse = { model: 'gpt-4o-mini', content: 'ok', usage: { prompt_tokens: 10, completion_tokens: 5, cached_tokens: 0 } };
const failure = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

// Audit 2026-11-07 (reliability P2 8): one 429 or 503 from OpenAI failed the whole turn (maxRetries 0).
describe('a refusal before any output is tried once more', () => {
  test.each([429, 500, 503])('a %s, then an answer', async status => {
    const ai = { complete: jest.fn().mockRejectedValueOnce(failure(status)).mockResolvedValueOnce(ok) };
    const invocation = new ModelInvocation('id', benchmarkConfig('baseline'), ai);
    await expect(invocation.complete('dialogue', { messages: [] }, 'first')).resolves.toBe(ok);
    expect(ai.complete).toHaveBeenCalledTimes(2);
    expect(invocation.receipt().calls).toEqual([expect.objectContaining({ status: 'completed' })]);
  });
  test('only once', async () => {
    const ai = { complete: jest.fn().mockRejectedValue(failure(503)) };
    await expect(new ModelInvocation('id', benchmarkConfig('baseline'), ai).complete('dialogue', { messages: [] }, 'first')).rejects.toMatchObject({ status: 503 });
    expect(ai.complete).toHaveBeenCalledTimes(2);
  });
  test.each([[400, 'a bad request'], [401, 'a refused key']])('never for %s (%s)', async status => {
    const ai = { complete: jest.fn().mockRejectedValue(failure(status)) };
    await expect(new ModelInvocation('id', benchmarkConfig('baseline'), ai).complete('dialogue', { messages: [] }, 'first')).rejects.toBeDefined();
    expect(ai.complete).toHaveBeenCalledTimes(1);
  });
  test('never without a status (a timeout may already be billed)', async () => {
    const ai = { complete: jest.fn().mockRejectedValue(new Error('offline')) };
    await expect(new ModelInvocation('id', benchmarkConfig('baseline'), ai).complete('dialogue', { messages: [] }, 'first')).rejects.toThrow('offline');
    expect(ai.complete).toHaveBeenCalledTimes(1);
  });
  test('never when too little time is left before the deadline', async () => {
    const config = benchmarkConfig('baseline');
    const ai = { complete: jest.fn().mockRejectedValue(failure(503)) };
    const late = new ModelInvocation('id', config, ai, Date.now() - config.limits.deadlineMs + 1000);
    await expect(late.complete('dialogue', { messages: [] }, 'first')).rejects.toBeDefined();
    expect(ai.complete).toHaveBeenCalledTimes(1);
  });
});
