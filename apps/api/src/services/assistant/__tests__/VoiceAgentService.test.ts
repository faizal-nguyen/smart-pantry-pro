/**
 * VoiceAgentService — orchestration tests.
 *
 * All IO is mocked: AICompletionClient, WhisperClient, ActionLogWriter,
 * ToolHandlerRegistry. The ProductResolver isn't called by the
 * orchestrator itself (handlers use it), so a stub is enough.
 */
import { randomUUID } from 'node:crypto';

import { ConfirmationTokenSigner } from '../ConfirmationTokenSigner.js';
import { ToolRegistry } from '../ToolRegistry.js';
import {
  ToolHandlerRegistry,
  type ToolHandler,
  type ToolExecutionContext,
} from '../handlers/types.js';
import { VoiceAgentService, VoiceAgentError } from '../VoiceAgentService.js';
import type { AICompletionClient } from '../../imports/RecipeExtractionService.js';
import type { WhisperClient } from '../../media/WhisperTranscriber.js';
import type { ActionLogRow } from '../ActionLogWriter.js';

const SECRET = 'a'.repeat(64);
const USER = '11111111-1111-1111-1111-111111111111';

function makeRow(overrides: Partial<ActionLogRow> = {}): ActionLogRow {
  return {
    id: '44444444-4444-4444-4444-444444444444',
    user_id: USER,
    client_request_id: '22222222-2222-2222-2222-222222222222',
    session_id: '33333333-3333-3333-3333-333333333333',
    step_seq: 0,
    audio_sha256: null,
    tool: 'add_shopping_items',
    tool_args: {},
    risk_tier: 'low',
    status: 'planned',
    result: null,
    error_code: null,
    error_message: null,
    reversible: true,
    reversible_action: null,
    undo_expires_at: null,
    undone_at: null,
    llm_model: 'gpt-4o-mini',
    cost_usd: null,
    created_at: '2026-05-08T00:00:00Z',
    executed_at: null,
    updated_at: '2026-05-08T00:00:00Z',
    ...overrides,
  };
}

class MockWriter {
  insertCalls: Array<Parameters<any>[0]> = [];
  updateCalls: Array<{ id: string; kind: string; payload: any }> = [];
  rows: ActionLogRow[] = [];
  byAudio: Map<string, ActionLogRow> = new Map();

  async insertPlanned(input: any) {
    this.insertCalls.push(input);
    const row = makeRow({
      // Real UUID — the ConfirmationTokenSigner filters non-UUIDs as a
      // security measure, so the orchestrator must produce real UUIDs
      // (and so must the writer it talks to).
      id: randomUUID(),
      tool: input.tool,
      tool_args: input.toolArgs,
      step_seq: input.stepSeq,
      risk_tier: input.riskTier,
      reversible: input.reversible,
    });
    this.rows.push(row);
    return row;
  }
  async markExecuted(id: string, params: any) {
    this.updateCalls.push({ id, kind: 'executed', payload: params });
    const row = this.rows.find((r) => r.id === id);
    if (row) row.status = 'executed';
  }
  async markFailed(id: string, code: string, msg: string) {
    this.updateCalls.push({ id, kind: 'failed', payload: { code, msg } });
    const row = this.rows.find((r) => r.id === id);
    if (row) row.status = 'failed';
  }
  async markUndone(id: string) {
    this.updateCalls.push({ id, kind: 'undone', payload: {} });
    const row = this.rows.find((r) => r.id === id);
    if (row) row.status = 'undone';
  }
  async findByAudioSha(_userId: string, audioSha256: string) {
    return this.byAudio.get(audioSha256) ?? null;
  }
  async fetchPlanned(_userId: string, ids: readonly string[]) {
    return this.rows.filter((r) => ids.includes(r.id) && r.status === 'planned');
  }
  async fetchById(_userId: string, id: string) {
    return this.rows.find((r) => r.id === id) ?? null;
  }
}

function makeAi(toolCalls: Array<{ name: string; arguments: any }>, content = ''): AICompletionClient {
  return {
    async complete(req) {
      return {
        content,
        model: req.model,
        usage: { prompt_tokens: 100, completion_tokens: 50 },
        ...(toolCalls.length > 0
          ? {
              tool_calls: toolCalls.map((tc, i) => ({
                id: `tc-${i}`,
                name: tc.name,
                arguments:
                  typeof tc.arguments === 'string'
                    ? tc.arguments
                    : JSON.stringify(tc.arguments),
              })),
            }
          : {}),
      };
    },
  };
}

function makeAiSequence(responses: Array<{ tool_calls?: any[]; content?: string }>): AICompletionClient {
  let i = 0;
  return {
    async complete(req) {
      const r = responses[i++] ?? { content: '' };
      return {
        content: r.content ?? '',
        model: req.model,
        usage: { prompt_tokens: 100, completion_tokens: 50 },
        ...(r.tool_calls
          ? {
              tool_calls: r.tool_calls.map((tc: any, idx: number) => ({
                id: `tc-${i}-${idx}`,
                name: tc.name,
                arguments:
                  typeof tc.arguments === 'string'
                    ? tc.arguments
                    : JSON.stringify(tc.arguments),
              })),
            }
          : {}),
      };
    },
  };
}

const mockWhisper: WhisperClient = {
  async transcribe() {
    return { text: '(unused)', language: 'en' };
  },
};

function makeCtx(): ToolExecutionContext {
  return {
    userId: USER,
    userClient: {} as any,
    adminClient: {} as any,
    productResolver: {} as any,
  };
}

function makeService({
  ai,
  handlers,
  writer = new MockWriter(),
  signer = new ConfirmationTokenSigner(SECRET),
  whisper = mockWhisper,
}: {
  ai: AICompletionClient;
  handlers: Record<string, ToolHandler>;
  writer?: MockWriter;
  signer?: ConfirmationTokenSigner;
  whisper?: WhisperClient;
}): { service: VoiceAgentService; writer: MockWriter; signer: ConfirmationTokenSigner } {
  const handlerRegistry = new ToolHandlerRegistry();
  for (const [name, h] of Object.entries(handlers)) {
    handlerRegistry.register(name, h);
  }
  const service = new VoiceAgentService(
    ai,
    whisper,
    new ToolRegistry(),
    handlerRegistry,
    writer as any,
    signer
  );
  return { service, writer, signer };
}

describe('VoiceAgentService.handleRequest (text)', () => {
  it('executes a low-risk tool inline and returns it as actions_executed', async () => {
    const ai = makeAi([
      {
        name: 'add_shopping_items',
        arguments: { items: [{ name: 'Tomate', quantity: 2 }] },
      },
    ]);
    const { service, writer } = makeService({
      ai,
      handlers: {
        add_shopping_items: {
          async execute(_ctx, args: any) {
            return {
              result: { added: args.items.length },
              reversibleAction: {
                tool: 'remove_shopping_items',
                args: { shopping_item_ids: ['x'] },
              },
            };
          },
        },
      },
    });

    const res = await service.handleRequest(
      {
        source: 'text',
        text: 'Ajoute 2 tomates à la liste',
        userId: USER,
        clientRequestId: '22222222-2222-2222-2222-222222222222',
      },
      makeCtx()
    );

    expect(res.actions_executed).toHaveLength(1);
    expect(res.actions_pending).toHaveLength(0);
    expect(res.actions_executed[0].tool).toBe('add_shopping_items');
    expect(res.actions_executed[0].reversible).toBe(true);
    expect(res.confirmation_token).toBeNull();
    expect(writer.updateCalls.find((c) => c.kind === 'executed')).toBeDefined();
    expect(res.cost.llm_usd).toBeGreaterThan(0);
  });

  it('plans a high-risk tool but does NOT execute, signs a confirmation_token', async () => {
    const ai = makeAi([
      {
        name: 'delete_recipe',
        arguments: { recipe_id: '11111111-1111-1111-1111-111111111111' },
      },
    ]);
    const handlerCalled = jest.fn();
    const { service, signer } = makeService({
      ai,
      handlers: {
        delete_recipe: {
          async execute() {
            handlerCalled();
            return { result: {} };
          },
        },
      },
    });

    const res = await service.handleRequest(
      {
        source: 'text',
        text: 'Supprime la recette curry',
        userId: USER,
        clientRequestId: '22222222-2222-2222-2222-222222222222',
      },
      makeCtx()
    );

    expect(res.actions_executed).toHaveLength(0);
    expect(res.actions_pending).toHaveLength(1);
    expect(res.actions_pending[0].risk_tier).toBe('high');
    expect(res.confirmation_token).not.toBeNull();
    expect(handlerCalled).not.toHaveBeenCalled();

    // The token must verify back for the same user.
    const payload = signer.verify(res.confirmation_token!, USER);
    expect(payload.actionLogIds).toEqual([res.actions_pending[0].action_id]);
  });

  it('escalates a high-volume add_inventory_items to high tier', async () => {
    const items = Array.from({ length: 11 }, (_, i) => ({ name: `item-${i}`, quantity: 1 }));
    const ai = makeAi([{ name: 'add_inventory_items', arguments: { items } }]);
    const { service } = makeService({
      ai,
      handlers: {
        add_inventory_items: {
          async execute(_ctx, _args) {
            return { result: {} };
          },
        },
      },
    });

    const res = await service.handleRequest(
      {
        source: 'text',
        text: '11 items',
        userId: USER,
        clientRequestId: '22222222-2222-2222-2222-222222222222',
      },
      makeCtx()
    );

    expect(res.actions_executed).toHaveLength(0);
    expect(res.actions_pending).toHaveLength(1);
    expect(res.actions_pending[0].risk_tier).toBe('high');
    expect(res.actions_pending[0].reason).toMatch(/Volume/);
  });

  it('caps tool calls at maxToolCalls (default 6)', async () => {
    const calls = Array.from({ length: 10 }, () => ({
      name: 'read_inventory',
      arguments: {},
    }));
    const ai = makeAi(calls);
    const { service } = makeService({
      ai,
      handlers: {
        read_inventory: {
          async execute() {
            return { result: { items: [] } };
          },
        },
      },
    });

    const res = await service.handleRequest(
      {
        source: 'text',
        text: 'lis tout',
        userId: USER,
        clientRequestId: '22222222-2222-2222-2222-222222222222',
      },
      makeCtx()
    );

    expect(res.actions_executed.length).toBe(6);
  });

  it('returns the LLM content as message when provided', async () => {
    const ai = makeAi(
      [{ name: 'add_shopping_items', arguments: { items: [{ name: 'lait', quantity: 1 }] } }],
      'Ajouté 1 brique de lait à la liste.'
    );
    const { service } = makeService({
      ai,
      handlers: {
        add_shopping_items: {
          async execute() {
            return { result: { added: 1 } };
          },
        },
      },
    });

    const res = await service.handleRequest(
      {
        source: 'text',
        text: 'Ajoute du lait à la liste',
        userId: USER,
        clientRequestId: '22222222-2222-2222-2222-222222222222',
      },
      makeCtx()
    );

    expect(res.message).toBe('Ajouté 1 brique de lait à la liste.');
  });

  it('synthesizes a deterministic message when LLM content is empty', async () => {
    const ai = makeAi([
      { name: 'add_shopping_items', arguments: { items: [{ name: 'pain', quantity: 1 }] } },
    ]);
    const { service } = makeService({
      ai,
      handlers: {
        add_shopping_items: {
          async execute() {
            return { result: {} };
          },
        },
      },
    });

    const res = await service.handleRequest(
      {
        source: 'text',
        text: 'pain',
        userId: USER,
        clientRequestId: '22222222-2222-2222-2222-222222222222',
      },
      makeCtx()
    );
    expect(res.message).toMatch(/1 action/);
  });

  it('returns a friendly message on empty transcript', async () => {
    const ai = makeAi([]);
    const { service } = makeService({ ai, handlers: {} });

    const res = await service.handleRequest(
      {
        source: 'text',
        text: '',
        userId: USER,
        clientRequestId: '22222222-2222-2222-2222-222222222222',
      },
      makeCtx()
    );
    expect(res.message).toMatch(/pas compris/);
    expect(res.actions_executed).toHaveLength(0);
  });

  it('replays a previous response when audio_sha256 matches a recent log row', async () => {
    const writer = new MockWriter();
    const replayedRow = makeRow({
      session_id: '99999999-9999-9999-9999-999999999999',
      audio_sha256: 'abc',
    });
    writer.byAudio.set('abc', replayedRow);

    const ai = makeAi([]); // should not be called
    const aiSpy = jest.spyOn(ai, 'complete');
    const { service } = makeService({ ai, handlers: {}, writer });

    const res = await service.handleRequest(
      {
        source: 'voice',
        audioPath: '/tmp/fake.mp3',
        audioSha256: 'abc',
        userId: USER,
        clientRequestId: '22222222-2222-2222-2222-222222222222',
      },
      makeCtx()
    );

    expect(res.replayed).toBe(true);
    expect(res.session_id).toBe('99999999-9999-9999-9999-999999999999');
    expect(aiSpy).not.toHaveBeenCalled();
  });

  it('marks the row failed when the handler throws but keeps processing other tool calls', async () => {
    const ai = makeAi([
      { name: 'add_shopping_items', arguments: { items: [{ name: 'a', quantity: 1 }] } },
      { name: 'read_inventory', arguments: {} },
    ]);
    const writer = new MockWriter();
    const { service } = makeService({
      ai,
      writer,
      handlers: {
        add_shopping_items: {
          async execute() {
            throw new Error('DB went away');
          },
        },
        read_inventory: {
          async execute() {
            return { result: { items: ['butter'] } };
          },
        },
      },
    });

    const res = await service.handleRequest(
      {
        source: 'text',
        text: 'add then read',
        userId: USER,
        clientRequestId: '22222222-2222-2222-2222-222222222222',
      },
      makeCtx()
    );

    expect(res.actions_executed.length).toBe(1);
    expect(res.actions_executed[0].tool).toBe('read_inventory');
    expect(writer.updateCalls.find((c) => c.kind === 'failed')).toBeDefined();
  });

  it('retries on the fallback model when args fail Zod validation', async () => {
    const ai = makeAiSequence([
      // Round 1: invalid args (negative quantity)
      {
        tool_calls: [
          {
            name: 'add_shopping_items',
            arguments: { items: [{ name: 'x', quantity: -5 }] },
          },
        ],
      },
      // Round 2: valid args
      {
        tool_calls: [
          {
            name: 'add_shopping_items',
            arguments: { items: [{ name: 'x', quantity: 1 }] },
          },
        ],
      },
    ]);
    const aiSpy = jest.spyOn(ai, 'complete');
    const { service } = makeService({
      ai,
      handlers: {
        add_shopping_items: {
          async execute() {
            return { result: { added: 1 } };
          },
        },
      },
    });

    const res = await service.handleRequest(
      {
        source: 'text',
        text: 'x',
        userId: USER,
        clientRequestId: '22222222-2222-2222-2222-222222222222',
      },
      makeCtx()
    );

    // PRP-224 follow-up — three calls now: R1 (invalid args, default model),
    // R2 (fallback retry with valid args), R3 (text synthesis on default
    // model after the tool succeeded and the original response had no
    // textual content).
    expect(aiSpy).toHaveBeenCalledTimes(3);
    expect(aiSpy.mock.calls[1][0].model).toBe('gpt-4o');
    expect(aiSpy.mock.calls[2][0].model).toBe('gpt-4o-mini');
    expect(res.actions_executed).toHaveLength(1);
  });
});

describe('VoiceAgentService.handleConfirm', () => {
  it('verifies the token, executes planned actions, returns descriptors', async () => {
    const writer = new MockWriter();
    // Pre-populate a planned row with a real UUID — the signer's verify
    // filters non-UUID action_log_ids as a tampering defence.
    const planned = makeRow({
      id: randomUUID(),
      tool: 'delete_recipe',
      tool_args: { recipe_id: '11111111-1111-1111-1111-111111111111' },
      risk_tier: 'high',
      status: 'planned',
      reversible: false,
    });
    writer.rows.push(planned);

    const handlerSpy = jest.fn(async () => ({ result: { deleted: true } }));
    const ai = makeAi([]); // not used
    const signer = new ConfirmationTokenSigner(SECRET);
    const token = signer.sign({
      userId: USER,
      sessionId: planned.session_id,
      actionLogIds: [planned.id],
    });

    const { service } = makeService({
      ai,
      writer,
      signer,
      handlers: {
        delete_recipe: { execute: handlerSpy as any },
      },
    });

    const res = await service.handleConfirm(
      { userId: USER, confirmationToken: token },
      makeCtx()
    );

    expect(res.actions_executed.length).toBe(1);
    expect(res.actions_failed).toHaveLength(0);
    expect(handlerSpy).toHaveBeenCalled();
  });

  it('throws CONFIRMATION_INVALID on tampered token', async () => {
    const ai = makeAi([]);
    const { service } = makeService({ ai, handlers: {} });

    await expect(
      service.handleConfirm(
        { userId: USER, confirmationToken: 'not.valid' },
        makeCtx()
      )
    ).rejects.toMatchObject({
      code: 'CONFIRMATION_INVALID',
    });
  });

  it('throws CONFIRMATION_EXPIRED on expired token', async () => {
    const signer = new ConfirmationTokenSigner(SECRET);
    const expired = signer.sign({
      userId: USER,
      sessionId: '33333333-3333-3333-3333-333333333333',
      actionLogIds: ['44444444-4444-4444-4444-444444444444'],
      expiresAt: Date.now() - 1000,
    });
    const ai = makeAi([]);
    const { service } = makeService({ ai, handlers: {}, signer });

    await expect(
      service.handleConfirm(
        { userId: USER, confirmationToken: expired },
        makeCtx()
      )
    ).rejects.toMatchObject({
      code: 'CONFIRMATION_EXPIRED',
    });
  });
});

describe('VoiceAgentService.handleUndo', () => {
  it('executes the reversible_action and marks the row undone', async () => {
    const writer = new MockWriter();
    writer.rows.push(
      makeRow({
        id: 'a-row',
        status: 'executed',
        reversible: true,
        reversible_action: { tool: 'remove_shopping_items', args: { shopping_item_ids: ['x'] } },
        undo_expires_at: new Date(Date.now() + 60_000).toISOString(),
      })
    );
    const undoSpy = jest.fn(async () => ({ result: { removed: 1 } }));
    const ai = makeAi([]);
    const { service } = makeService({
      ai,
      writer,
      handlers: {
        remove_shopping_items: { execute: undoSpy as any },
      },
    });

    const res = await service.handleUndo({ userId: USER, actionId: 'a-row' }, makeCtx());

    expect(res.undone).toBe(true);
    expect(undoSpy).toHaveBeenCalledWith(
      expect.anything(),
      { shopping_item_ids: ['x'] }
    );
    expect(writer.rows.find((r) => r.id === 'a-row')?.status).toBe('undone');
  });

  it('rejects undo when the action is not reversible', async () => {
    const writer = new MockWriter();
    writer.rows.push(
      makeRow({ id: 'irrev', status: 'executed', reversible: false, reversible_action: null })
    );
    const ai = makeAi([]);
    const { service } = makeService({ ai, writer, handlers: {} });

    await expect(
      service.handleUndo({ userId: USER, actionId: 'irrev' }, makeCtx())
    ).rejects.toMatchObject({ code: 'UNDO_NOT_REVERSIBLE' });
  });

  it('rejects undo past the 15-min window', async () => {
    const writer = new MockWriter();
    writer.rows.push(
      makeRow({
        id: 'expired',
        status: 'executed',
        reversible: true,
        reversible_action: { tool: 'remove_shopping_items', args: {} },
        undo_expires_at: new Date(Date.now() - 1000).toISOString(),
      })
    );
    const ai = makeAi([]);
    const { service } = makeService({
      ai,
      writer,
      handlers: { remove_shopping_items: { execute: jest.fn() as any } },
    });

    await expect(
      service.handleUndo({ userId: USER, actionId: 'expired' }, makeCtx())
    ).rejects.toMatchObject({ code: 'UNDO_EXPIRED' });
  });

  it('throws UNDO_NOT_FOUND on missing id', async () => {
    const ai = makeAi([]);
    const { service } = makeService({ ai, handlers: {} });

    await expect(
      service.handleUndo(
        { userId: USER, actionId: '99999999-9999-9999-9999-999999999999' },
        makeCtx()
      )
    ).rejects.toMatchObject({ code: 'UNDO_NOT_FOUND' });
  });
});

// PRP-223 PR3 — memory integration tests.
// We stub MemoryService at the public-method level rather than at the
// Supabase chain level (that mock is already unit-covered by the
// dedicated MemoryService.test.ts).

class StubMemoryService {
  conversations = new Map<string, { id: string; user_id: string }>();
  messages: Array<{ conversation_id: string; user_id: string; role: string; content: string; action_log_ids: string[] }> = [];
  createCalls = 0;
  failNext = false;

  async createConversation(userId: string) {
    this.createCalls += 1;
    if (this.failNext) {
      this.failNext = false;
      throw new Error('boom');
    }
    const id = randomUUID();
    const conv = { id, user_id: userId };
    this.conversations.set(id, conv);
    return conv as any;
  }
  async getConversation(id: string, userId: string) {
    const conv = this.conversations.get(id);
    if (!conv || conv.user_id !== userId) {
      const err: any = new Error('not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    return conv as any;
  }
  async recordMessage(conversationId: string, userId: string, opts: any) {
    this.messages.push({
      conversation_id: conversationId,
      user_id: userId,
      role: opts.role,
      content: opts.content,
      action_log_ids: opts.action_log_ids ?? [],
    });
    return { id: randomUUID(), conversation_id: conversationId, user_id: userId, ...opts } as any;
  }
}

describe('VoiceAgentService memory integration (PRP-223 PR3)', () => {
  function makeServiceWithMemory({ memory }: { memory: StubMemoryService }) {
    const ai = makeAi([], 'OK pas d\'action.');
    const handlerRegistry = new ToolHandlerRegistry();
    const writer = new MockWriter();
    const service = new VoiceAgentService(
      ai,
      mockWhisper,
      new ToolRegistry(),
      handlerRegistry,
      writer as any,
      new ConfirmationTokenSigner(SECRET),
      { memoryService: memory as any },
    );
    return { service, writer };
  }

  it('creates a conversation when none is provided and returns its id', async () => {
    const memory = new StubMemoryService();
    const { service } = makeServiceWithMemory({ memory });

    const res = await service.handleRequest(
      {
        source: 'text',
        text: 'salut',
        userId: USER,
        clientRequestId: randomUUID(),
      },
      makeCtx(),
    );

    expect(res.conversation_id).toBeDefined();
    expect(memory.createCalls).toBe(1);
    expect(memory.messages).toHaveLength(2); // user + assistant
    expect(memory.messages[0].role).toBe('user');
    expect(memory.messages[1].role).toBe('assistant');
  });

  it('reuses an existing conversation when conversationId is provided', async () => {
    const memory = new StubMemoryService();
    // Pre-seed an owned conversation.
    const seed = await memory.createConversation(USER);
    memory.createCalls = 0; // reset for clarity

    const { service } = makeServiceWithMemory({ memory });
    const res = await service.handleRequest(
      {
        source: 'text',
        text: 'rebonjour',
        userId: USER,
        clientRequestId: randomUUID(),
        conversationId: seed.id,
      },
      makeCtx(),
    );

    expect(res.conversation_id).toBe(seed.id);
    expect(memory.createCalls).toBe(0);
    expect(memory.messages).toHaveLength(2);
    expect(memory.messages[0].conversation_id).toBe(seed.id);
  });

  it('falls back to a fresh conversation when conversationId belongs to another user', async () => {
    const memory = new StubMemoryService();
    // Seed a conversation owned by someone else.
    const otherUser = '99999999-9999-9999-9999-999999999999';
    const stranger = await memory.createConversation(otherUser);
    memory.createCalls = 0;

    const { service } = makeServiceWithMemory({ memory });
    const res = await service.handleRequest(
      {
        source: 'text',
        text: 'hello',
        userId: USER,
        clientRequestId: randomUUID(),
        conversationId: stranger.id, // wrong owner
      },
      makeCtx(),
    );

    expect(res.conversation_id).toBeDefined();
    expect(res.conversation_id).not.toBe(stranger.id);
    expect(memory.createCalls).toBe(1); // service opened a fresh one
  });

  it('memory write failures do not break the response', async () => {
    const memory = new StubMemoryService();
    memory.failNext = true; // first createConversation throws

    const { service } = makeServiceWithMemory({ memory });
    const res = await service.handleRequest(
      {
        source: 'text',
        text: 'bonjour',
        userId: USER,
        clientRequestId: randomUUID(),
      },
      makeCtx(),
    );

    // No conversation_id because creation failed, but the response still came back.
    expect(res.conversation_id).toBeUndefined();
    expect(res.message).toBeTruthy();
  });

  it('records action_log_ids on the assistant message for executed tools', async () => {
    const memory = new StubMemoryService();
    const ai = makeAi([
      {
        name: 'add_shopping_items',
        arguments: { items: [{ name: 'Tomate', quantity: 1 }] },
      },
    ]);
    const handlerRegistry = new ToolHandlerRegistry();
    handlerRegistry.register('add_shopping_items', {
      async execute() {
        return { result: { added: 1 } };
      },
    });
    const writer = new MockWriter();
    const service = new VoiceAgentService(
      ai,
      mockWhisper,
      new ToolRegistry(),
      handlerRegistry,
      writer as any,
      new ConfirmationTokenSigner(SECRET),
      { memoryService: memory as any },
    );

    const res = await service.handleRequest(
      {
        source: 'text',
        text: 'ajoute des tomates',
        userId: USER,
        clientRequestId: randomUUID(),
      },
      makeCtx(),
    );

    const assistantMsg = memory.messages.find(m => m.role === 'assistant');
    expect(assistantMsg).toBeDefined();
    expect(assistantMsg!.action_log_ids.length).toBeGreaterThan(0);
    expect(assistantMsg!.action_log_ids[0]).toBe(res.actions_executed[0]?.action_id);
  });
});
