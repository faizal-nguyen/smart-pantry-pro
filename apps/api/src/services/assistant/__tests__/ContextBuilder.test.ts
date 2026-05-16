/**
 * PRP-223 PR4 — ContextBuilder unit tests.
 *
 * Stubs MemoryService at the public-method level (the underlying
 * Supabase chain is already covered by MemoryService.test.ts).
 */
import { ContextBuilder, CONTEXT_BUILDER_LIMITS } from '../ContextBuilder.js';
import type {
  AssistantConversationSummary,
  AssistantMemoryItem,
  AssistantMessage,
  AssistantSessionContext,
} from '../MemoryService.js';

const USER = '11111111-1111-1111-1111-111111111111';
const CONV = '22222222-2222-2222-2222-222222222222';

function mem(o: Partial<AssistantMemoryItem> = {}): AssistantMemoryItem {
  return {
    id: 'm-' + (o.id ?? '0'),
    user_id: USER,
    kind: 'preference',
    scope: 'global',
    status: 'active',
    subject_type: null,
    subject_id: null,
    content: 'aime indien leger',
    normalized_content: 'aime indien leger',
    confidence: 0.8,
    sensitivity: 'normal',
    source: 'assistant_inferred',
    evidence: {},
    approved_at: null,
    last_used_at: null,
    expires_at: null,
    deleted_at: null,
    created_at: '2026-05-13T00:00:00Z',
    updated_at: '2026-05-13T00:00:00Z',
    ...o,
  } as AssistantMemoryItem;
}

function msg(o: Partial<AssistantMessage> = {}): AssistantMessage {
  return {
    id: 'msg-' + (o.id ?? '0'),
    conversation_id: CONV,
    user_id: USER,
    role: 'user',
    content: 'salut',
    content_format: 'text',
    audio_transcript: null,
    tool_calls: [],
    action_log_ids: [],
    metadata: {},
    created_at: '2026-05-13T00:00:00Z',
    ...o,
  } as AssistantMessage;
}

function makeStub(opts: {
  responseStyle?: AssistantMemoryItem | null;
  topMemories?: AssistantMemoryItem[];
  summary?: AssistantConversationSummary | null;
  recentMessages?: AssistantMessage[];
  sessionContext?: AssistantSessionContext[];
  fail?: 'responseStyle' | 'topMemories' | 'summary' | 'recent' | 'session';
}) {
  return {
    async getResponseStyleMemory() {
      if (opts.fail === 'responseStyle') throw new Error('boom');
      return opts.responseStyle ?? null;
    },
    async getTopActiveMemories() {
      if (opts.fail === 'topMemories') throw new Error('boom');
      return opts.topMemories ?? [];
    },
    async getLatestSummary() {
      if (opts.fail === 'summary') throw new Error('boom');
      return opts.summary ?? null;
    },
    async getRecentMessages() {
      if (opts.fail === 'recent') throw new Error('boom');
      return opts.recentMessages ?? [];
    },
    async getActiveSessionContext() {
      if (opts.fail === 'session') throw new Error('boom');
      return opts.sessionContext ?? [];
    },
  } as any;
}

describe('ContextBuilder', () => {
  it('returns an empty block when the user has no memory and no conversation', async () => {
    const builder = new ContextBuilder(makeStub({}));
    const block = await builder.build(USER, null);
    expect(block.combinedText).toBe('');
    expect(block.memoriesText).toBe('');
    expect(block.tokenEstimate).toBe(0);
  });

  it('renders the response_style at the top when set', async () => {
    const builder = new ContextBuilder(
      makeStub({
        responseStyle: mem({ id: 'rs', kind: 'response_style', content: 'reponds court' }),
        topMemories: [mem({ id: 'p1', kind: 'preference', content: 'aime indien' })],
      }),
    );
    const block = await builder.build(USER);
    expect(block.responseStyle).toContain('reponds court');
    expect(block.combinedText.indexOf(block.responseStyle!)).toBe(0);
    expect(block.memoriesText).toContain('aime indien');
  });

  it('caps memories at the configured limit', async () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      mem({ id: String(i), content: `pref ${i}` }),
    );
    const builder = new ContextBuilder(makeStub({ topMemories: many }));
    const block = await builder.build(USER);
    const lines = block.memoriesText.split('\n').filter(l => l.startsWith('•'));
    expect(lines.length).toBeLessThanOrEqual(CONTEXT_BUILDER_LIMITS.maxMemories);
  });

  it('renders summary, recent messages and session context when available', async () => {
    const builder = new ContextBuilder(
      makeStub({
        summary: {
          id: 's',
          conversation_id: CONV,
          user_id: USER,
          summary: 'On a parlé recettes pâtes.',
          covered_message_ids: [],
          model_used: 'gpt-4o-mini',
          created_at: '2026-05-13T00:00:00Z',
        } as any,
        recentMessages: [msg({ id: '1', role: 'user', content: 'des pâtes ?' })],
        sessionContext: [
          {
            id: 'sc',
            user_id: USER,
            conversation_id: CONV,
            key: 'time_budget',
            value: '20 min',
            expires_at: '2099-01-01T00:00:00Z',
            created_at: '2026-05-13T00:00:00Z',
          } as any,
        ],
      }),
    );
    const block = await builder.build(USER, CONV);
    expect(block.summaryText).toContain('On a parlé recettes pâtes.');
    expect(block.recentMessagesText).toContain('Utilisateur');
    expect(block.recentMessagesText).toContain('des pâtes');
    expect(block.sessionContextText).toContain('time_budget');
  });

  it('survives memory read failures without throwing', async () => {
    const builder = new ContextBuilder(makeStub({ fail: 'topMemories' }));
    const block = await builder.build(USER);
    // No memories rendered, but the call completed.
    expect(block.memoriesText).toBe('');
  });

  it('keeps the token budget bounded', async () => {
    const huge = mem({ content: 'x'.repeat(20_000) });
    const builder = new ContextBuilder(
      makeStub({ topMemories: [huge, huge, huge, huge, huge, huge, huge, huge] }),
    );
    const block = await builder.build(USER);
    expect(block.tokenEstimate).toBeLessThanOrEqual(CONTEXT_BUILDER_LIMITS.maxTokensEstimate);
  });
});
