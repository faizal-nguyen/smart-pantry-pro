/**
 * VoiceAgentService — orchestration tests.
 *
 * All IO is mocked: AICompletionClient, SpeechTranscriber, ActionLogWriter,
 * ToolHandlerRegistry. The ProductResolver isn't called by the
 * orchestrator itself (handlers use it), so a stub is enough.
 */
import { randomUUID } from 'node:crypto';
import type { ContextBuilder } from '../ContextBuilder.js';
import { MemoryExtractor } from '../MemoryExtractor.js';
import type { MemoryService } from '../MemoryService.js';
import { policy as memoryPolicy,receipt as memoryReceipt,message as memoryMessage,CONV } from '../__fixtures__/memory.js';

import { ConfirmationTokenSigner } from '../ConfirmationTokenSigner.js';
import { ToolRegistry } from '../ToolRegistry.js';
import type { ToolName } from '../schemas/tools.js';
import {
  ToolHandlerRegistry,
  type ToolHandler,
  type ToolExecutionContext,
} from '../handlers/types.js';
import { VoiceAgentService, VoiceAgentError, extractRecipeProposalsFromExecuted } from '../VoiceAgentService.js';
import type { AICompletionClient,AICompletionRequest } from '../../imports/RecipeExtractionService.js';
import type { SpeechTranscriber } from '../../media/SpeechTranscriber.js';
import type { ActionLogRow, ActionLogWriter } from '../ActionLogWriter.js';
import { benchmarkConfig, type AssistantModelConfig } from '../../ai/ModelConfig.js';
import { StockCommandError } from '../../stock/StockCommandService.js';

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
  async claimPlanned(_userId: string, ids: readonly string[]) {
    const taken = this.rows.filter((r) => ids.includes(r.id) && r.status === 'planned');
    for (const row of taken) row.status = 'executed';
    return taken.map((r) => ({ ...r }));
  }
  async fetchByIds(_userId: string, ids: readonly string[]) {
    return this.rows.filter((r) => ids.includes(r.id));
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

const mockTranscriber: SpeechTranscriber = {
  model: 'gpt-transcribe',
  async transcribe() {
    return { transcription_id: 'transcription-test', text: '(unused)', languages: ['en'], requested_model: 'gpt-transcribe', served_model: null,
      duration_seconds: null, duration_source: null, cost: { usd: null, quality: 'unknown', reason: 'duration_unknown', pricing_version: 'test' } };
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
  transcriber = mockTranscriber,
  contextBuilder,
  modelConfig,
  memoryService,
}: {
  ai: AICompletionClient;
  handlers: Record<string, ToolHandler>;
  writer?: MockWriter;
  signer?: ConfirmationTokenSigner;
  transcriber?: SpeechTranscriber;
  contextBuilder?:ContextBuilder;
  modelConfig?:AssistantModelConfig;
  memoryService?: unknown;
}): { service: VoiceAgentService; writer: MockWriter; signer: ConfirmationTokenSigner } {
  const handlerRegistry = new ToolHandlerRegistry();
  for (const [name, h] of Object.entries(handlers)) {
    handlerRegistry.register(name, h);
  }
  const service = new VoiceAgentService(
    ai,
    transcriber,
    new ToolRegistry(),
    handlerRegistry,
    writer as any,
    signer,
    { contextBuilder, modelConfig, memoryService: memoryService as MemoryService | undefined }
  );
  return { service, writer, signer };
}

// These orchestration tests pin the gpt-4o-mini/gpt-4o preset; the production
// default (gpt-6-luna, with its extra read round) is covered by ModelTransport.test.
const presetBefore = process.env.ASSISTANT_MODEL_PRESET;
beforeAll(() => { process.env.ASSISTANT_MODEL_PRESET = 'baseline'; });
afterAll(() => { if (presetBefore === undefined) delete process.env.ASSISTANT_MODEL_PRESET; else process.env.ASSISTANT_MODEL_PRESET = presetBefore; });

describe('VoiceAgentService.handleRequest (text)', () => {
  it.each([{ share:false,version:2 },{ share:true,version:2 },{ share:true,version:1 }])('synthesizes after server scoring, sharing profile evidence only with current consent (%j)',async({ share,version })=>{
    const requests:AICompletionRequest[]=[];
    const recipe={ id:'recipe',name:'Riz',profile_version:2,reference:{ id:'recipe',source:'recipes' },duration_minutes:15,availability:{ status:'available',uncertainties:[] },constraints:{ status:'compatible',findings:[{ code:'DECLARED_ALLERGY',ingredient:'Beurre',message:'allergie privée au lait' }],limitations:[] },nutrition:{ status:'unavailable' },reason_codes:[] };
    const result={ pipeline_version:3,profile_version:2,cookable_now:[recipe],almost_cookable:[],verify_suggestions:[],excluded_suggestions:[] };
    const ai:AICompletionClient={ complete:async request=>{
      requests.push(request);
      const usage={ prompt_tokens:100,completion_tokens:50 };
      return requests.length===1 ? { model:request.model,usage,content:'Choix avant vérification.',tool_calls:[{ id:'tc',name:'suggest_recipes_for_context',arguments:'{}' }] } : { model:request.model,usage,content:'Consultez les cartes pour les raisons.' };
    } };
    const contextBuilder={ build:async()=>({ combinedText:'Ancien contexte de test.',shareProfileWithModel:share,profileVersion:version }) } as unknown as ContextBuilder;
    const { service }=makeService({ ai,contextBuilder,handlers:{ suggest_recipes_for_context:{ execute:async()=>({ result }) } } });
    const response=await service.handleRequest({ userId:USER,text:'Des recettes ?',source:'text',clientRequestId:randomUUID() },makeCtx());
    expect(requests).toHaveLength(2);
    const synthesis=JSON.stringify(requests[1].messages);
    if (share && version===2) expect(synthesis).toContain('allergie privée');else expect(synthesis).not.toContain('allergie privée');
    if (version!==2) expect(synthesis).not.toContain('Ancien contexte de test');
    expect(JSON.stringify(response.actions_executed)).toContain('allergie privée');
    expect(response.message).toBe('Consultez les cartes pour les raisons.');
  });
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
    // A JSON repair stays on the dialogue model (audit 2026-11-07).
    expect(aiSpy.mock.calls[1][0].model).toBe('gpt-4o-mini');
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
  messages: Array<{ conversation_id: string; user_id: string; role: string; content: string; action_log_ids: string[]; metadata:Record<string,unknown> }> = [];
  createCalls = 0;
  failNext = false;

  async readPolicySafe(userId: string) { return { userId, revision:0, memoryEnabled:false, saveHistory:true, shareProfile:false, profileVersion:0 }; }
  async modelArtifacts() { return { messages:[],summary:null,session:[],privateTerms:[] }; }
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
      metadata: opts.metadata ?? {},
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
      mockTranscriber,
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
      mockTranscriber,
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

describe('V10-03D transport, receipts and replay boundaries',()=>{
  const input={userId:USER,clientRequestId:'22222222-2222-4222-8222-222222222222',source:'text' as const,text:'Ajoute deux pommes aux courses.'};
  const args={items:[{name:'pommes',quantity:2}]};
  it('rejects a forged owner before any provider or action IO',async()=>{
    const ai={complete:jest.fn()};const {service,writer}=makeService({ai,handlers:{}});
    await expect(service.handleRequest({...input,userId:'another-owner'},makeCtx())).rejects.toThrow('Propriétaire');
    expect(ai.complete).not.toHaveBeenCalled();expect(writer.rows).toHaveLength(0);
  });
  it('enforces a read-only surface even when the provider returns a write outside its catalog',async()=>{
    const handler={execute:jest.fn(async()=>({result:{saved:true}}))};
    const {service,writer}=makeService({ai:makeAi([{name:'add_shopping_items',arguments:args}],'Tout est ajouté.'),handlers:{add_shopping_items:handler}});
    const response=await service.handleRequest({...input,allowedTools:['read_inventory']},makeCtx());
    expect(handler.execute).not.toHaveBeenCalled();expect(writer.rows).toHaveLength(0);
    expect(response.actions_executed).toHaveLength(0);expect(response.message).not.toContain('Tout est ajouté');
    expect(response.model_receipt?.calls).toHaveLength(1);
  });
  it('repairs an invalid call once and stops if the repair is also invalid',async()=>{
    const ai=makeAi([{name:'add_shopping_items',arguments:{items:[{name:'pommes',quantity:-2}]}}]);
    const handler={execute:jest.fn(async()=>({result:{saved:true}}))};
    const {service}=makeService({ai,handlers:{add_shopping_items:handler}});
    const response=await service.handleRequest(input,makeCtx());
    expect(handler.execute).not.toHaveBeenCalled();expect(response.model_receipt?.calls.map(c=>c.purpose)).toEqual(['tool_selection','argument_repair']);
    expect(response.model_receipt?.llm_usd).toBeGreaterThan(0);expect(response.message).toMatch(/pas pu être préparée/);
  });
  it('does not repeat an uncertain write inside the same batch',async()=>{
    const handler={execute:jest.fn(async()=>{throw new Error('Reply lost after writing');})};
    const {service}=makeService({ai:makeAi([{name:'add_shopping_items',arguments:args},{name:'add_shopping_items',arguments:args}],'Ajouté.'),handlers:{add_shopping_items:handler}});
    const response=await service.handleRequest(input,makeCtx());
    expect(handler.execute).toHaveBeenCalledTimes(1);expect(response.actions_unverified).toHaveLength(1);
    expect(response.actions_executed).toHaveLength(0);expect(response.message).toMatch(/Vérifie/);
  });
  it.each(['executed','planned','failed'] as const)('reuses or qualifies an existing %s write on a lost-response retry',async status=>{
    const writer=new MockWriter();writer.insertPlanned=async planned=>makeRow({tool:'add_shopping_items',tool_args:args,status,replayed:true,result:{saved:true}});
    const handler={execute:jest.fn(async()=>({result:{saved:true}}))};
    const {service}=makeService({writer,ai:makeAi([{name:'add_shopping_items',arguments:args}]),handlers:{add_shopping_items:handler}});
    const response=await service.handleRequest(input,makeCtx());
    expect(handler.execute).not.toHaveBeenCalled();
    if(status==='executed') {expect(response.actions_executed).toHaveLength(1);expect(response.actions_unverified).toHaveLength(0);}
    else {expect(response.actions_executed).toHaveLength(0);expect(response.actions_unverified).toHaveLength(1);}
  });
  it('binds Responses function outputs to call_id and keeps opaque reasoning out of the receipt',async()=>{
    const requests:AICompletionRequest[]=[];
    const ai:AICompletionClient={complete:async request=>{
      requests.push(request);return {content:requests.length===1 ? '' : 'Deux tomates.',model:request.model,usage:{prompt_tokens:100,completion_tokens:20,cache_write_tokens:0},
        ...(requests.length===1 ? {tool_calls:[{id:'provider-call-id',name:'read_inventory',arguments:'{}'}],
          continuation:[{type:'reasoning',id:'r1',encrypted_content:'PRIVATE_OPAQUE',summary:[]},{type:'function_call',call_id:'provider-call-id',name:'read_inventory',arguments:'{}'}]} : {})};
    }};
    const {service}=makeService({ai,modelConfig:benchmarkConfig('luna'),handlers:{read_inventory:{execute:async()=>({result:{items:[{name:'tomates',quantity:2}]}})}}});
    const response=await service.handleRequest({...input,text:'Lis mon inventaire.'},makeCtx());
    expect(requests[1].continuation).toEqual(expect.arrayContaining([expect.objectContaining({type:'function_call_output',call_id:'provider-call-id',output:expect.stringContaining('executed')})]));
    expect(JSON.stringify(response.model_receipt)).not.toContain('PRIVATE_OPAQUE');
    expect(response.model_receipt?.calls).toHaveLength(2);
  });
  it('continues inventory → recommendation with linked outputs, within the shared call cap',async()=>{
    const requests:AICompletionRequest[]=[];
    const ai:AICompletionClient={complete:async request=>{
      requests.push(request);const name=requests.length===1 ? 'read_inventory':'suggest_recipes_for_context';
      const id='hop-'+requests.length;
      return {content:requests.length===3 ? 'Une soupe, durée à vérifier.':'',model:request.model,
        usage:{prompt_tokens:100,completion_tokens:20,cache_write_tokens:0,cached_tokens:0},
        ...(requests.length<=2 ? {tool_calls:[{id,name,arguments:'{}'}],continuation:[{type:'function_call',call_id:id,name,arguments:'{}'}]} : {})};
    }};
    const read={execute:jest.fn(async()=>({result:{items:[]}}))};const suggest={execute:jest.fn(async()=>({result:{recipes:[]}}))};
    const {service}=makeService({ai,modelConfig:benchmarkConfig('luna'),handlers:{read_inventory:read,suggest_recipes_for_context:suggest}});
    const response=await service.handleRequest({...input,text:'Que cuisiner parmi mes recettes avec mon stock ?'},makeCtx());
    expect(read.execute).toHaveBeenCalledTimes(1);expect(suggest.execute).toHaveBeenCalledTimes(1);
    expect(response.model_receipt?.calls.map(c=>c.purpose)).toEqual(['tool_selection','tool_followup','synthesis']);
    expect(requests[2].continuation).toEqual(expect.arrayContaining([
      expect.objectContaining({type:'function_call_output',call_id:'hop-1'}),expect.objectContaining({type:'function_call_output',call_id:'hop-2'}),
    ]));
  });
  it('falls back only for synthesis, bills every attempted call and publishes no rejected stream delta',async()=>{
    let count=0;const ai:AICompletionClient={complete:async request=>{
      count++;return {content:count===1 ? '' : 'Une soupe de tomates.',model:request.model,usage:{prompt_tokens:100,completion_tokens:20,cached_tokens:0},
        ...(count===1 ? {tool_calls:[{id:'recipe-call',name:'suggest_recipes_for_context',arguments:'{}'}]} : {})};
    },completeStream:async function*(){yield {done:false,delta:'SECRET_PARTIAL_STREAM avec du porc'};throw new Error('stream lost');}};
    const handler={execute:jest.fn(async()=>({result:{recipes:[{id:'r',name:'Soupe'}]}}))};
    const {service}=makeService({ai,handlers:{suggest_recipes_for_context:handler}});
    const events:unknown[]=[];const response=await service.handleRequest({...input,text:'Une recette ?'},makeCtx(),event=>events.push(event));
    expect(handler.execute).toHaveBeenCalledTimes(1);expect(response.model_receipt?.calls.map(c=>c.purpose)).toEqual(['tool_selection','synthesis_stream','synthesis_fallback']);
    expect(response.model_receipt).toMatchObject({llm_usd:null,quality:'unknown'});expect(response.model_receipt?.known_subtotal_usd).toBeGreaterThan(0);
    expect(JSON.stringify(events.filter(event=>(event as {type:string}).type==='delta'))).not.toContain('SECRET_PARTIAL_STREAM');
    expect(events.filter(event=>(event as {type:string}).type==='delta')).toHaveLength(1);
  });
});

describe('V10-03C provider and write boundaries',()=>{
  const input={userId:USER,clientRequestId:'22222222-2222-4222-8222-222222222222',source:'text' as const,text:'Souviens-toi que je préfère les plats épicés'};
  function serviceFor(memory:unknown,ai:AICompletionClient,context:ContextBuilder,handlers:Record<string,ToolHandler>={}) {
    const registry=new ToolHandlerRegistry();for(const [name,handler] of Object.entries(handlers)) registry.register(name,handler);
    return new VoiceAgentService(ai,mockTranscriber,new ToolRegistry(),registry,new MockWriter() as unknown as ActionLogWriter,new ConfirmationTokenSigner(SECRET),
      {memoryService:memory as MemoryService,memoryExtractor:new MemoryExtractor(),contextBuilder:context});
  }
  it('waits for the memory write before dispatch, and qualifies an uncertain result instead of claiming saved',async()=>{
    let finish:(v:ReturnType<typeof memoryReceipt>)=>void=()=>{};
    const write=jest.fn(()=>new Promise<ReturnType<typeof memoryReceipt>>(resolve=>{finish=resolve;}));
    const p=memoryPolicy({userId:USER,saveHistory:false});
    const memory={readPolicySafe:async()=>p,saveExtractedFact:write};
    const ai={complete:jest.fn(async(req:AICompletionRequest)=>({content:'Bien retenu.',model:req.model,usage:{prompt_tokens:10,completion_tokens:10}}))};
    const context={build:async()=>({policy:p,combinedText:''})} as unknown as ContextBuilder;
    const pending=serviceFor(memory,ai,context).handleRequest(input,makeCtx());
    await new Promise(resolve=>setTimeout(resolve,0));expect(write).toHaveBeenCalledTimes(1);expect(ai.complete).not.toHaveBeenCalled();
    finish(memoryReceipt({status:'verification_required'}));const result=await pending;
    expect(result.memory_results?.[0].status).toBe('verification_required');expect(result.message).not.toContain('Bien retenu');expect(result.message).toMatch(/vérifi/i);
  });
  it('revocation before dispatch removes old stored context but keeps the voluntary current question',async()=>{
    const old=memoryPolicy({userId:USER,saveHistory:false});let current=old;
    const memory={readPolicySafe:async()=>current};
    const context={build:async()=>{current={...old,revision:5,memoryEnabled:false};return {policy:old,combinedText:'SECRET_STORED_PREFERENCE'};}} as unknown as ContextBuilder;
    const ai={complete:jest.fn(async(req:AICompletionRequest)=>({content:'Une réponse',model:req.model,usage:{prompt_tokens:10,completion_tokens:10}}))};
    await serviceFor(memory,ai,context).handleRequest({...input,text:'Comment cuire une soupe ?'},makeCtx());
    expect(JSON.stringify(ai.complete.mock.calls[0][0].messages)).not.toContain('SECRET_STORED');expect(ai.complete.mock.calls[0][0].messages.slice(-1)[0]?.content).toBe('Comment cuire une soupe ?');
  });
  it('revocation during a provider call discards old tool requests before any execution',async()=>{
    const old=memoryPolicy({userId:USER,saveHistory:false});let current=old;const handler={execute:jest.fn(async()=>({result:{items:[]}}))};
    const ai={complete:async(req:AICompletionRequest)=>{current={...old,revision:5,memoryEnabled:false};return {content:'',model:req.model,usage:{prompt_tokens:10,completion_tokens:10},tool_calls:[{id:'tool-one',name:'read_inventory',arguments:'{}'}]};}};
    const memory={readPolicySafe:async()=>current};const context={build:async()=>({policy:old,combinedText:''})} as unknown as ContextBuilder;
    const result=await serviceFor(memory,ai,context,{read_inventory:handler}).handleRequest({...input,text:'Que reste-t-il ?'},makeCtx());
    expect(handler.execute).not.toHaveBeenCalled();expect(result.message).toMatch(/réglages.*ont changé/);
  });
  it('the live orchestrator actually awaits summary generation and persistence at the threshold',async()=>{
    const p=memoryPolicy({userId:USER,revision:0});const memory=new StubMemoryService();memory.conversations.set(CONV,{id:CONV,user_id:USER});
    memory.readPolicySafe=async()=>p;
    memory.modelArtifacts=async()=>({messages:Array.from({length:20},(_,i)=>memoryMessage({id:`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,user_id:USER,conversation_id:CONV,policy_revision:0})),summary:null,session:[],privateTerms:[]});
    const persist=jest.fn(async()=>({claimed:true}));const record=jest.fn(async()=>({id:'summary-saved'}));
    const serviceMemory=Object.assign(memory,{persistArtifact:persist,recordSummary:record});
    const ai={complete:jest.fn(async(req:AICompletionRequest)=>({content:req.max_tokens===320 ? 'Une soupe choisie. Cuisson à vérifier.' : 'Cuire la soupe doucement.',model:req.model,usage:{prompt_tokens:10,completion_tokens:10}}))};
    const context={build:async()=>({policy:p,combinedText:''})} as unknown as ContextBuilder;
    const result=await serviceFor(serviceMemory,ai,context).handleRequest({...input,text:'Comment cuire la soupe ?',conversationId:CONV},makeCtx());
    expect(ai.complete).toHaveBeenCalledTimes(2);expect(persist).toHaveBeenCalled();expect(record).toHaveBeenCalled();expect(result.summary_status).toBe('saved');
    expect(result.model_receipt?.calls.map(c=>c.role)).toEqual(['dialogue','summary']);
    expect(memory.messages.find(m=>m.role==='assistant')?.metadata.model_receipt).toMatchObject({calls:expect.arrayContaining([expect.objectContaining({role:'summary'})])});
  });
  it('revocation during the summary also suppresses the final text and assistant history',async()=>{
    const original=memoryPolicy({userId:USER,revision:0});let current=original;
    const memory=new StubMemoryService();memory.conversations.set(CONV,{id:CONV,user_id:USER});memory.readPolicySafe=async()=>current;
    memory.modelArtifacts=async()=>({messages:Array.from({length:20},(_,i)=>memoryMessage({id:'synthetic-'+i,user_id:USER,policy_revision:0})),summary:null,session:[],privateTerms:[]});
    const record=jest.fn();Object.assign(memory,{persistArtifact:async()=>({claimed:true}),recordSummary:record});
    const ai={complete:async(req:AICompletionRequest)=>{
      if(req.max_tokens===320) current={...original,revision:1,saveHistory:false,memoryEnabled:false};
      return {content:'OLD_CONTEXT_RESPONSE',model:req.model,usage:{prompt_tokens:10,completion_tokens:5}};
    }};
    const context={build:async()=>({policy:original,combinedText:'OLD_STORED_CONTEXT'})} as unknown as ContextBuilder;
    const events:unknown[]=[];const result=await serviceFor(memory,ai,context).handleRequest({...input,text:'Une soupe ?',conversationId:CONV},makeCtx(),event=>events.push(event));
    expect(result.summary_status).toBe('revision_changed');expect(result.message).toMatch(/ont changé/);
    expect(record).not.toHaveBeenCalled();expect(memory.messages.filter(m=>m.role==='assistant')).toHaveLength(0);
    expect(JSON.stringify(events)).not.toContain('OLD_CONTEXT_RESPONSE');expect(result.memory_revision).toBe(1);
  });
});

describe('session continuity when durable history is off',()=>{
  const p=memoryPolicy({userId:USER,saveHistory:false,memoryEnabled:false});
  const sessionMessages=[{role:'user' as const,content:'Ajoute deux kilos de pommes de terre au stock.'},
    {role:'assistant' as const,content:'Plusieurs types de pommes de terre : lesquelles ?'}];
  const input={userId:USER,clientRequestId:'22222222-2222-4222-8222-222222222222',source:'text' as const,text:'Des classiques.',
    sessionMessages,sessionRevision:p.revision};
  function serviceWith(context:ContextBuilder,ai:AICompletionClient,handlers:Record<string,ToolHandler>={}) {
    const registry=new ToolHandlerRegistry();for(const [name,handler] of Object.entries(handlers)) registry.register(name,handler);
    return new VoiceAgentService(ai,mockTranscriber,new ToolRegistry(),registry,new MockWriter() as unknown as ActionLogWriter,
      new ConfirmationTokenSigner(SECRET),{memoryService:{readPolicySafe:async()=>p} as unknown as MemoryService,memoryExtractor:new MemoryExtractor(),contextBuilder:context});
  }
  const sent=(ai:{complete:jest.Mock})=>JSON.stringify(ai.complete.mock.calls[0][0].messages);
  it.each([
    ['a context block for the same policy',{policy:p,combinedText:''}],
    ['an empty context block (no stored context)',{policy:null,combinedText:''}],
  ])('sends the earlier session turns to the model with %s',async(_label,block)=>{
    const ai={complete:jest.fn(async(req:AICompletionRequest)=>({content:'Ajouté.',model:req.model,usage:{prompt_tokens:10,completion_tokens:10}}))};
    await serviceWith({build:async()=>block} as unknown as ContextBuilder,ai).handleRequest(input,makeCtx());
    expect(sent(ai)).toContain('Ajoute deux kilos de pommes de terre');
    expect(ai.complete.mock.calls[0][0].messages.slice(-1)[0]?.content).toBe('Des classiques.');
  });
  it.each([
    ['a memory saved since the turn was read keeps them',{revision:p.revision+1,historyFloor:p.revision},true],
    ['a revocation since then drops them',{revision:p.revision+1,historyFloor:p.revision+1},false],
  ])('%s',async(_label,changes,kept)=>{
    const current={...p,...changes};
    const ai={complete:jest.fn(async(req:AICompletionRequest)=>({content:'Ajouté.',model:req.model,usage:{prompt_tokens:10,completion_tokens:10}}))};
    const result=await new VoiceAgentService(ai,mockTranscriber,new ToolRegistry(),new ToolHandlerRegistry(),new MockWriter() as unknown as ActionLogWriter,
      new ConfirmationTokenSigner(SECRET),{memoryService:{readPolicySafe:async()=>current} as unknown as MemoryService,memoryExtractor:new MemoryExtractor(),
        contextBuilder:{build:async()=>({policy:current,combinedText:''})} as unknown as ContextBuilder}).handleRequest(input,makeCtx());
    expect(sent(ai).includes('Ajoute deux kilos de pommes de terre')).toBe(kept);
    expect(result.history_floor).toBe(current.historyFloor);
  });
  it('keeps tool results for the follow-up call with an empty context block',async()=>{
    const handler={execute:jest.fn(async()=>({result:{items:[{name:'Pommes de terre grenaille'}]}}))};
    const ai={complete:jest.fn(async(req:AICompletionRequest)=>ai.complete.mock.calls.length===1
      ? {content:'',model:req.model,usage:{prompt_tokens:10,completion_tokens:10},tool_calls:[{id:'tool-one',name:'read_inventory',arguments:'{}'}]}
      : {content:'Vous avez des grenailles.',model:req.model,usage:{prompt_tokens:10,completion_tokens:10}})};
    const result=await serviceWith({build:async()=>({policy:null,combinedText:''})} as unknown as ContextBuilder,ai,{read_inventory:handler})
      .handleRequest({...input,text:'Que reste-t-il ?'},makeCtx());
    expect(handler.execute).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(ai.complete.mock.calls.slice(1).map(call=>call[0].messages))).toContain('Pommes de terre grenaille');
    expect(result.message).not.toMatch(/réglages.*ont changé/);
  });
  it('the recipe answer is written knowing the earlier turns (« Et sans crème ? »)',async()=>{
    const turns=[{role:'user' as const,content:'Propose-moi un dîner avec du poulet'},{role:'assistant' as const,content:'Hibachi Fried Rice ou Soboro Udon.'}];
    const suggestion={pipeline_version:3,profile_version:0,cookable_now:[],almost_cookable:[],verify_suggestions:[],excluded_suggestions:[],recent_suggestions:[],
      request_constraints:{exclude_ingredients:['crème'],diets:[]}};
    const handler={execute:jest.fn(async()=>({result:suggestion}))};
    const ai={complete:jest.fn(async(req:AICompletionRequest)=>ai.complete.mock.calls.length===1
      ? {content:'',model:req.model,usage:{prompt_tokens:10,completion_tokens:10},tool_calls:[{id:'tool-one',name:'suggest_recipes_for_context',arguments:'{"ingredient":"poulet","exclude_ingredients":["crème"]}'}]}
      : {content:'Sans crème : Hibachi Fried Rice.',model:req.model,usage:{prompt_tokens:10,completion_tokens:10}})};
    await serviceWith({build:async()=>({policy:p,combinedText:''})} as unknown as ContextBuilder,ai,{suggest_recipes_for_context:handler})
      .handleRequest({...input,text:'Et sans crème ?',sessionMessages:turns},makeCtx());
    expect(ai.complete).toHaveBeenCalledTimes(2);
    const synthesis=JSON.stringify(ai.complete.mock.calls[1][0].messages);
    expect(synthesis).toContain('Propose-moi un dîner avec du poulet');
    expect(synthesis).toContain('exclude_ingredients');
  });
});

describe('a failed model call is logged (prod case 2026-11-05: dead OpenAI key)',()=>{
  it('logs why the provider refused, without the key quoted by the SDK or the user text',async()=>{
    const warn=jest.spyOn(console,'warn').mockImplementation(()=>{});
    try {
      const refused=Object.assign(new Error('Incorrect API key provided: sk-proj-abcd****wxyz'),{name:'AuthenticationError',status:401,code:'invalid_api_key',type:'invalid_request_error'});
      const ai={complete:jest.fn(async()=>{throw refused;})};
      const result=await new VoiceAgentService(ai,mockTranscriber,new ToolRegistry(),new ToolHandlerRegistry(),new MockWriter() as unknown as ActionLogWriter,new ConfirmationTokenSigner(SECRET))
        .handleRequest({userId:USER,clientRequestId:'33333333-3333-4333-8333-333333333333',source:'text',text:'ajoute 1 pot de tahini'},makeCtx());
      expect(result.message).toMatch(/n’a pas pu répondre/);
      const logged=warn.mock.calls.find(([label])=>label==='[assistant.llm] call failed:');
      expect(logged?.[1]).toMatchObject({role:'dialogue',purpose:'tool_selection',name:'AuthenticationError',status:401,code:'invalid_api_key'});
      expect(JSON.stringify(logged)).not.toMatch(/sk-proj|tahini/);
    } finally { warn.mockRestore(); }
  });
});

describe('no change is announced without a write',()=>{
  const input={userId:USER,clientRequestId:'22222222-2222-4222-8222-222222222222',source:'text' as const,text:'Ajoute deux kilos de pommes de terre au stock.'};
  function run(tool:string,handler:ToolHandler,claim:string) {
    const registry=new ToolHandlerRegistry();registry.register(tool,handler);
    const ai={complete:jest.fn(async(req:AICompletionRequest)=>ai.complete.mock.calls.length===1
      ? {content:'',model:req.model,usage:{prompt_tokens:10,completion_tokens:10},tool_calls:[{id:'tool-one',name:tool,arguments:tool==='read_inventory' ? '{}' : '{"items":[{"name":"pommes de terre","quantity":2,"unit":"kg"}]}'}]}
      : {content:claim,model:req.model,usage:{prompt_tokens:10,completion_tokens:10}})};
    return new VoiceAgentService(ai,mockTranscriber,new ToolRegistry(),registry,new MockWriter() as unknown as ActionLogWriter,new ConfirmationTokenSigner(SECRET))
      .handleRequest(input,makeCtx());
  }
  it('replaces "J\'ai ajouté" when only a read ran (prod case 2026-11-04)',async()=>{
    const result=await run('read_inventory',{execute:jest.fn(async()=>({result:{items:[]}}))},"J'ai ajouté deux kilos de pommes de terre à votre stock.");
    expect(result.message).not.toMatch(/ajouté/);
    expect(result.message).toMatch(/rien modifié/);
  });
  it('keeps the claim when a write actually ran',async()=>{
    const add={execute:jest.fn(async()=>({result:{added:[{inventory_id:'i1',product_id:'p1',product_name:'pomme de terre',quantity:2}],ambiguous:[]},reversibleAction:null}))};
    const result=await run('add_inventory_items',add,"J'ai ajouté deux kilos de pommes de terre à votre stock.");
    expect(add.execute).toHaveBeenCalledTimes(1);
    expect(result.message).toMatch(/J'ai ajouté/);
  });
  const AIDE_TOOLS=['read_inventory','read_shopping_list','search_recipes','suggest_recipes_for_context','read_user_memories','ask_clarification'] as const;
  function scope(allowedTools:readonly ToolName[]|undefined,claim:string) {
    const requests:AICompletionRequest[]=[];
    const ai={complete:jest.fn(async(req:AICompletionRequest)=>{requests.push(req);return requests.length===1
      ? {content:'',model:req.model,usage:{prompt_tokens:10,completion_tokens:10},tool_calls:[{id:'tool-one',name:'read_inventory',arguments:'{}'}]}
      : {content:claim,model:req.model,usage:{prompt_tokens:10,completion_tokens:10}};})};
    const registry=new ToolHandlerRegistry();registry.register('read_inventory',{execute:jest.fn(async()=>({result:{items:[]}}))});
    const result=new VoiceAgentService(ai,mockTranscriber,new ToolRegistry(),registry,new MockWriter() as unknown as ActionLogWriter,new ConfirmationTokenSigner(SECRET))
      .handleRequest({...input,text:'oui ajoute 2 kilos en plus',allowedTools},makeCtx());
    return {result,requests};
  }
  it('in the read-only Aide scope, says the window only reads and points to the conversations (prod case 2026-11-04)',async()=>{
    const {result,requests}=scope(AIDE_TOOLS,"J'ai ajouté 2 kilos de pommes de terre.");
    const {message}=await result;
    expect(message).toMatch(/Ouvrir les conversations/);
    expect(message).not.toMatch(/ajouté/);
    expect(String(requests[0].messages[0].content)).toMatch(/READ-ONLY WINDOW/);
  });
  it('the full scope gets no read-only instruction',async()=>{
    const {result,requests}=scope(undefined,"J'ai ajouté 2 kilos de pommes de terre.");
    expect((await result).message).toMatch(/rien modifié/);
    expect(String(requests[0].messages[0].content)).not.toMatch(/READ-ONLY WINDOW/);
  });
});

describe('Chat Completions tool follow-up after reads (baseline)',()=>{
  const input={userId:USER,clientRequestId:'22222222-2222-4222-8222-222222222222',source:'text' as const};
  type Step={content?:string;call?:{name:string;arguments:string}};
  function scripted(steps:Step[]) {
    const requests:AICompletionRequest[]=[];
    const ai:AICompletionClient={complete:async request=>{
      requests.push(request);const step=steps[requests.length-1] ?? {content:'fin'};
      return {content:step.content ?? '',model:request.model,usage:{prompt_tokens:10,completion_tokens:10},
        ...(step.call ? {tool_calls:[{id:'call-'+requests.length,...step.call}]} : {})};
    }};
    return {ai,requests};
  }
  const potatoes={result:{items:[{product_name:'pomme de terre',quantity:1,unit_type:'unit'}]}};
  it('reads, then adds in the same turn (prod case 2026-11-04 16:53)',async()=>{
    const {ai,requests}=scripted([{call:{name:'read_inventory',arguments:'{}'}},
      {call:{name:'add_inventory_items',arguments:'{"items":[{"name":"pomme de terre","quantity":2,"unit":"kg"}]}'}},
      {content:"J'ai ajouté 2 kg de pommes de terre."}]);
    const add={execute:jest.fn(async()=>({result:{added:[{inventory_id:'i1',product_id:'p1',product_name:'pomme de terre',quantity:2}],ambiguous:[]},reversibleAction:null}))};
    const {service}=makeService({ai,modelConfig:benchmarkConfig('baseline'),handlers:{read_inventory:{execute:async()=>potatoes},add_inventory_items:add}});
    const response=await service.handleRequest({...input,text:'Ajoute deux kilos de pommes de terre au stock.'},makeCtx());
    expect(add.execute).toHaveBeenCalledTimes(1);
    expect(response.model_receipt?.calls.map(c=>c.purpose)).toEqual(['tool_selection','tool_followup','synthesis']);
    expect(JSON.stringify(requests[1].messages)).toContain('pomme de terre');
    expect(response.message).toBe("J'ai ajouté 2 kg de pommes de terre.");
  });
  it('does not offer already-run reads in the follow-up (prod case 2026-11-04 18:45)',async()=>{
    const {ai,requests}=scripted([{call:{name:'read_inventory',arguments:'{}'}},
      {call:{name:'add_inventory_items',arguments:'{"items":[{"name":"pomme de terre","quantity":2,"unit":"kg"}]}'}},
      {content:"J'ai ajouté 2 kg de pommes de terre."}]);
    const add={execute:jest.fn(async()=>({result:{added:[{inventory_id:'i1',product_id:'p1',product_name:'pomme de terre',quantity:2}],ambiguous:[]},reversibleAction:null}))};
    const {service}=makeService({ai,modelConfig:benchmarkConfig('baseline'),handlers:{read_inventory:{execute:async()=>potatoes},add_inventory_items:add}});
    await service.handleRequest({...input,text:'Ajoute deux kilos de pommes de terre au stock.'},makeCtx());
    const offered=(requests[1].tools ?? []).map(t=>t.function.name);
    expect(offered).not.toContain('read_inventory');
    // 19:50: the hop went to read_shopping_list, another plain read.
    expect(offered).not.toContain('read_shopping_list');
    expect(offered).toEqual(expect.arrayContaining(['add_inventory_items','ask_clarification','suggest_recipes_for_context']));
  });
  it('answers a read-only question in two calls, the follow-up replacing the synthesis',async()=>{
    const {ai}=scripted([{call:{name:'read_inventory',arguments:'{}'}},{content:'Il te reste une pomme de terre.'}]);
    const {service}=makeService({ai,modelConfig:benchmarkConfig('baseline'),handlers:{read_inventory:{execute:async()=>potatoes}}});
    const response=await service.handleRequest({...input,text:'Que reste-t-il ?'},makeCtx());
    expect(response.model_receipt?.calls.map(c=>c.purpose)).toEqual(['tool_selection','tool_followup']);
    expect(response.message).toBe('Il te reste une pomme de terre.');
  });
  it.each([
    ['Je veux faire une soupe aux oignons, qu’est-ce qui nous manque ?','search_recipes','{"query":"soupe aux oignons"}'],
    ['Une recette tunisienne avec les ingrédients qu’on a ?','suggest_recipes_for_context','{"cuisine":"tunisienne"}'],
  ])('an empty discovery reads real stock before answering: %s',async(text,tool,args)=>{
    const {ai,requests}=scripted([{content:'Importe une recette avant de continuer.',call:{name:tool,arguments:args}},
      {content:'Je vais proposer une version.'},
      {content:'Idées chef hors bibliothèque\n**Soupe aux oignons adaptée**\nOignons présents ; bouillon à prévoir.'}]);
    const stock={execute:jest.fn(async()=>({result:{complete:true,items:[{product_name:'Oignons',quantity:1,unit_type:'kg',quantity_quality:'estimated',expired:false,notes:'Environ un kilo.'}]}}))};
    const {service}=makeService({ai,modelConfig:benchmarkConfig('luna'),handlers:{[tool]:{execute:async()=>({result:{recipes:[]}})},read_inventory:stock}});
    const response=await service.handleRequest({...input,text},makeCtx());
    expect(stock.execute).toHaveBeenCalledTimes(1);
    expect(response.actions_executed.map(action=>action.tool)).toEqual([tool,'read_inventory']);
    expect(response.model_receipt?.calls.map(call=>call.purpose)).toEqual(['tool_selection','tool_followup','synthesis']);
    expect(response.message).not.toContain('Importe une recette');
    expect(JSON.stringify(requests[1].messages)).toContain('Oignons');
    const synthesis=JSON.stringify(requests[2].messages);
    expect(synthesis).toContain('Oignons');
    expect(synthesis).toContain('estimated');
    expect(synthesis).toContain('Environ un kilo.');
    expect(synthesis).toContain('la bibliothèque est une source, pas une limite');
    expect(String(requests[0].messages[0].content)).not.toContain('Only propose recipes returned by a tool');
  });
  it.each(['luna','baseline'] as const)('completes an empty recipe search with stock, plant evidence and real links using %s',async preset=>{
    const requests:AICompletionRequest[]=[];
    const calls=[
      [{id:'recipe-search',name:'suggest_recipes_for_context',arguments:'{"ingredient":"radis noir"}'}],
      [{id:'health-read',name:'read_food_guidance',arguments:'{}'},{id:'web-search',name:'search_web_recipes',arguments:'{"query":"recettes radis noir"}'}],
    ];
    const ai:AICompletionClient={complete:async request=>{
      requests.push(request);const tool_calls=calls[requests.length-1];
      return {content:tool_calls?'':'Une recette et les précautions de tes plantes.',model:request.model,usage:{prompt_tokens:100,completion_tokens:20},
        ...(tool_calls?{tool_calls,continuation:tool_calls.map(c=>({type:'function_call',call_id:c.id,name:c.name,arguments:c.arguments}))}:{})};
    }};
    const {service}=makeService({ai,modelConfig:benchmarkConfig(preset),handlers:{
      suggest_recipes_for_context:{execute:async()=>({result:{recipes:[]}})},
      read_inventory:{execute:async()=>({result:{complete:true,items:[{product_name:'Radis noir',quantity:4,expired:false}]}})},
      read_food_guidance:{execute:async()=>({result:{facts:[{name:'Pollen d’abeilles',precautions:['Risque allergique.']}]}})},
      search_web_recipes:{execute:async()=>({result:{sources:[{title:'Recette radis noir',url:'https://www.marmiton.org/recette-radis-noir',ingredients_verified:false}]}})},
    }});
    const response=await service.handleRequest({...input,text:'Recettes avec mon radis noir et bienfaits de mes tisanes ?',allowedTools:['suggest_recipes_for_context','read_inventory','read_food_guidance','search_web_recipes']},makeCtx());
    expect(response.actions_executed.map(a=>a.tool)).toEqual(['suggest_recipes_for_context','read_inventory','read_food_guidance','search_web_recipes']);
    expect(response.model_receipt?.calls.map(c=>c.purpose)).toEqual(['tool_selection','tool_followup','synthesis']);
    expect(JSON.stringify(requests[1].messages)).toContain('Radis noir');
    expect(JSON.stringify(requests[1].continuation??[])).not.toContain('recipe-fallback-stock');
    expect(JSON.stringify(requests[2].messages)).toContain('Pollen d’abeilles');
    expect(JSON.stringify(requests[2].messages)).toContain('https://www.marmiton.org/recette-radis-noir');
    expect(requests[1].tools?.map(t=>t.function.name)).toEqual(['search_web_recipes','read_food_guidance']);
  });
  it('does not read stock outside the allowed tools after an empty search',async()=>{
    const {ai}=scripted([{call:{name:'search_recipes',arguments:'{"query":"soupe"}'}},{content:'Une version proposée, stock non vérifié.'}]);
    const stock={execute:jest.fn()};
    const {service}=makeService({ai,modelConfig:benchmarkConfig('luna'),handlers:{search_recipes:{execute:async()=>({result:{recipes:[]}})},read_inventory:stock}});
    await service.handleRequest({...input,text:'Une soupe ?',allowedTools:['search_recipes']},makeCtx());
    expect(stock.execute).not.toHaveBeenCalled();
  });
  it.each([false,true])('keeps all usable stock names ahead of detailed rows with memory=%s',async(withMemory)=>{
    const {ai,requests}=scripted([{call:{name:'search_recipes',arguments:'{"query":"soupe"}'}},{content:'Une soupe proposée.'}]);
    const items=Array.from({length:109},(_,i)=>({id:`lot-${i}`,product_name:i===108 ? 'Oignons' : `Produit ${i}`,quantity:1,unit_type:'kg',expired:false,notes:'x'.repeat(300)}));
    const memory=withMemory ? new StubMemoryService() : undefined;
    const {service}=makeService({ai,modelConfig:benchmarkConfig('luna'),memoryService:memory,handlers:{search_recipes:{execute:async()=>({result:{recipes:[]}})},read_inventory:{execute:async()=>({result:{items,complete:true}})}}});
    await service.handleRequest({...input,text:'Une soupe ?'},makeCtx());
    expect(JSON.stringify(requests[1].messages)).toContain('Oignons');
    expect(JSON.stringify(requests[1].messages)).toContain('stock_names');
  });
  it('keeps recipe turns at two calls (no hop after a recipe tool)',async()=>{
    const {ai}=scripted([{call:{name:'suggest_recipes_for_context',arguments:'{}'}},{content:'Aucune recette ne correspond.'}]);
    const {service}=makeService({ai,modelConfig:benchmarkConfig('baseline'),handlers:{suggest_recipes_for_context:{execute:async()=>({result:{recipes:[]}})}}});
    const response=await service.handleRequest({...input,text:'Que cuisiner ce soir ?'},makeCtx());
    expect(response.model_receipt?.calls.map(c=>c.purpose)).not.toContain('tool_followup');
    expect(response.model_receipt?.calls).toHaveLength(2);
  });
});

describe('stock-first meals (hungry-user report 2026-11-12)',()=>{
  const input={userId:USER,clientRequestId:'22222222-2222-4222-8222-222222222222',source:'text' as const};
  it.each(['luna','baseline'] as const)('reads stock once and synthesizes meals without a recipe-search loop (%s)',async preset=>{
    const requests:AICompletionRequest[]=[];
    const ai:AICompletionClient={complete:jest.fn(async request=>{
      requests.push(request);
      return {content:'Idées chef hors bibliothèque\n**Nouilles au brocoli**\nFais sauter les légumes puis les nouilles.',model:request.model,usage:{prompt_tokens:100,completion_tokens:50}};
    })};
    const stock={execute:jest.fn(async()=>({result:{complete:true,items:[
      {product_name:'Nouilles Lamian',quantity:1,unit:'sachet',expired:false},
      {product_name:'Brocoli',quantity:1,unit:'pièce',expired:false},
      {product_name:'Riz basmati',quantity:10,unit:'kg',expired:false},
    ]}}))};
    const recipes={execute:jest.fn(async()=>({result:{cookable_now:[{id:'rasam',name:'Rasam'}]}}))};
    const {service}=makeService({ai,modelConfig:benchmarkConfig(preset),handlers:{read_inventory:stock,suggest_recipes_for_context:recipes}});
    const response=await service.handleRequest({...input,text:'J’ai faim de ouf - je peux me faire quoi à manger là avec ce que j’ai ?'},makeCtx());
    expect(stock.execute).toHaveBeenCalledTimes(1);
    expect(recipes.execute).not.toHaveBeenCalled();
    expect(response.actions_executed.map(a=>a.tool)).toEqual(['read_inventory']);
    expect(extractRecipeProposalsFromExecuted(response.actions_executed)).toBeNull();
    expect(requests).toHaveLength(1);
    expect(response.model_receipt?.calls.map(c=>c.purpose)).toEqual(['synthesis']);
    expect(requests[0].continuation ?? []).toEqual([]);
    const sent=JSON.stringify(requests[0].messages);
    expect(sent).toContain('Nouilles Lamian');
    expect(sent).toContain('3 à 4 idées différentes de repas complets');
    expect(sent).not.toContain("PRIORITÉ — BDD d'abord");
  });

  it('keeps a large stock receipt structured, with all names and conservation alerts',async()=>{
    const requests:AICompletionRequest[]=[];
    const ai:AICompletionClient={complete:async request=>{requests.push(request);return {content:'Des idées avec le stock lu.',model:request.model,usage:{prompt_tokens:100,completion_tokens:50}};}};
    const items=Array.from({length:121},(_,i)=>({id:'lot-'+i,product_name:i===120?'Nouilles Lamian':'Produit '+i,quantity:1,unit:'sachet',expired:i===100,
      conservation_review_required:i===110,notes:'Une note longue. '.repeat(100)}));
    const {service}=makeService({ai,handlers:{read_inventory:{execute:async()=>({result:{items,complete:true}})}}});
    await service.handleRequest({...input,text:'Plusieurs idées avec mon stock, j’ai faim'},makeCtx());
    const receipt=requests[0].messages.find(m=>m.role==='assistant'&&String(m.content).includes('read_inventory → '))!;
    const data=JSON.parse(String(receipt.content).split('read_inventory → ')[1]);
    expect(JSON.stringify(data).length).toBeLessThanOrEqual(24000);
    expect(data).toMatchObject({complete:true,details_complete:false,total:121});
    expect(data.stock_names).toContain('Nouilles Lamian');
    expect(data.stock_names).not.toContain('Produit 100');
    expect(data.expired_stock_names).toEqual(['Produit 100']);
    expect(data.conservation_review_stock_names).toEqual(['Produit 110']);
    expect(data).not.toHaveProperty('preview');
  });

  it('does not bypass a restricted tool surface',async()=>{
    const stock={execute:jest.fn()};
    const {service}=makeService({ai:makeAi([],'Lecture du stock indisponible sur cette page.'),handlers:{read_inventory:stock}});
    const response=await service.handleRequest({...input,text:'J’ai faim, que faire avec mon stock ?',allowedTools:['ask_clarification']},makeCtx());
    expect(stock.execute).not.toHaveBeenCalled();
    expect(response.actions_executed).toEqual([]);
  });

  it('reports a failed stock read without inventing meals or asking for a product',async()=>{
    const ai={complete:jest.fn()};
    const {service}=makeService({ai:ai as AICompletionClient,handlers:{read_inventory:{execute:async()=>{throw new Error('stock unavailable');}}}});
    const response=await service.handleRequest({...input,text:'J’ai la dalle, propose plusieurs idées avec mon stock'},makeCtx());
    expect(ai.complete).not.toHaveBeenCalled();
    expect(response.message).toContain('Je n’ai pas pu lire ton stock');
    expect(response.message).not.toContain('Précise le produit');
  });
});

describe('a command on an existing row reads its id first (prod case 2026-11-06 11:46)',()=>{
  const input={userId:USER,clientRequestId:'22222222-2222-4222-8222-222222222222',source:'text' as const};
  const LOT='44444444-4444-4444-8444-444444444444';
  type Step={content?:string;call?:{name:string;arguments:string}};
  function scripted(steps:Step[]) {
    const requests:AICompletionRequest[]=[];
    const ai:AICompletionClient={complete:async request=>{
      requests.push(request);const step=steps[requests.length-1] ?? {content:'fin'};
      return {content:step.content ?? '',model:request.model,usage:{prompt_tokens:10,completion_tokens:10},
        ...(step.call ? {tool_calls:[{id:'call-'+requests.length,...step.call}]} : {})};
    }};
    return {ai,requests};
  }
  it('the prompt sends « j’ai utilisé », « retire », « coche » to a read with a search, never to an invented id',async()=>{
    const {ai,requests}=scripted([{content:'ok'}]);
    const {service}=makeService({ai,handlers:{},modelConfig:benchmarkConfig('baseline')});
    await service.handleRequest({...input,text:'Bonjour'},makeCtx());
    const system=String(requests[0].messages[0].content);
    expect(system).toMatch(/read_inventory with \{ "search"/);
    expect(system).toMatch(/read_shopping_list with \{ "search"/);
    expect(system).toMatch(/Never invent an id/);
    expect(system).not.toMatch(/call its write tool directly, without reading first\./);
  });
  it('« J’ai utilisé 200 g de riz »: read, then a consume to confirm that names the product',async()=>{
    const {ai,requests}=scripted([{call:{name:'read_inventory',arguments:'{"search":"riz"}'}},
      {call:{name:'consume_inventory_items',arguments:JSON.stringify({items:[{inventory_id:LOT,quantity:200,unit:'g'}]})}},
      {content:'Je décompte 200 g de riz basmati, à confirmer.'}]);
    const consume={execute:jest.fn()};
    const {service}=makeService({ai,modelConfig:benchmarkConfig('baseline'),handlers:{
      read_inventory:{execute:async()=>({result:{items:[{id:LOT,product_name:'Riz basmati',quantity:1,unit_type:'kg'}]}})},consume_inventory_items:consume}});
    const response=await service.handleRequest({...input,text:'J’ai utilisé 200 g de riz'},makeCtx());
    expect((requests[1].tools ?? []).map(t=>t.function.name)).toContain('consume_inventory_items');
    expect(consume.execute).not.toHaveBeenCalled();
    expect(response.actions_pending).toHaveLength(1);
    expect(response.actions_pending[0]).toMatchObject({tool:'consume_inventory_items',labels:{[LOT]:'Riz basmati'}});
    expect(response.confirmation_token).toBeTruthy();
    // The read changed nothing: it is not announced as « 1 action exécutée ».
    expect(response.message).toBe('1 action à confirmer : vérifie-la ci-dessous, puis touche « Confirmer ».');
    expect(response.actions_pending[0].reason).toBe('Cette action modifie ton stock : vérifie-la avant de confirmer.');
  });
  it('an action that could not be prepared does not blame the page',async()=>{
    const {ai}=scripted([{call:{name:'consume_inventory_items',arguments:'{"items":[{"inventory_id":"riz","quantity":200}]}'}},
      {call:{name:'consume_inventory_items',arguments:'{"items":[{"inventory_id":"riz","quantity":200}]}'}}]);
    const {service}=makeService({ai,handlers:{},modelConfig:benchmarkConfig('baseline')});
    const response=await service.handleRequest({...input,text:'J’ai utilisé 200 g de riz'},makeCtx());
    expect(response.message).not.toMatch(/sur cette page/);
    expect(response.message).toMatch(/pas pu être préparée : je n’ai rien changé/);
  });
});

describe('assistant reliability (audit 2026-11-07)',()=>{
  const input={userId:USER,clientRequestId:'22222222-2222-4222-8222-222222222222',source:'text' as const};
  const RECIPE='55555555-5555-4555-8555-555555555555';
  type Step={content?:string;call?:{name:string;arguments:string}};
  function scripted(steps:Step[]) {
    const requests:AICompletionRequest[]=[];
    const ai:AICompletionClient={complete:async request=>{
      requests.push(request);const step=steps[requests.length-1] ?? {content:'fin'};
      return {content:step.content ?? '',model:request.model,usage:{prompt_tokens:10,completion_tokens:10},
        ...(step.call ? {tool_calls:[{id:'call-'+requests.length,...step.call}]} : {})};
    }};
    return {ai,requests};
  }
  function serviceAt(now:Date,ai:AICompletionClient,handlers:Record<string,ToolHandler>={},writer=new MockWriter()) {
    const registry=new ToolHandlerRegistry();for(const [name,handler] of Object.entries(handlers)) registry.register(name,handler);
    return new VoiceAgentService(ai,mockTranscriber,new ToolRegistry(),registry,writer as unknown as ActionLogWriter,
      new ConfirmationTokenSigner(SECRET),{modelConfig:benchmarkConfig('baseline'),now:()=>now});
  }
  it('recipe commands search the recipe first, and past dates are said as past (iPhone 2026-11-07)',async()=>{
    const {ai,requests}=scripted([{content:'ok'}]);
    await serviceAt(new Date(),ai).handleRequest({...input,text:'Bonjour'},makeCtx());
    const system=String(requests[0].messages[0].content);
    expect(system).toMatch(/« j’ai cuisiné X »[^\n]*search_recipes/);
    expect(system).toMatch(/mets X au menu[^\n]*search_recipes/);
    expect(system).toMatch(/expired: true[^\n]*périmé depuis/);
  });
  it('the model knows today’s date in Paris, tomorrow and the week start, and is told to say « tu »',async()=>{
    const {ai,requests}=scripted([{content:'ok'}]);
    // 23:30 UTC on Saturday is already Sunday 00:30 in Paris.
    await serviceAt(new Date('2026-11-07T23:30:00Z'),ai).handleRequest({...input,text:'Bonjour'},makeCtx());
    const system=String(requests[0].messages[0].content);
    expect(system).toContain('Aujourd’hui : dimanche 8 novembre 2026 (2026-11-08)');
    // Tomorrow is already next week: a plain date, the server derives the week.
    expect(system).toContain('Demain : lundi 9 novembre 2026 (2026-11-09)');
    expect(system).toContain('Cette semaine : lundi 2026-11-02');
    expect(system).toContain('dimanche 2026-11-08.');
    expect(system).toContain('Semaine prochaine : lundi 2026-11-09');
    // An explicit week asked for (benchmark plan.01) is not replaced by the current one.
    expect(system).toMatch(/explicitly[^\n]*always wins over today[^\n]*Only a relative date[^\n]*is copied from these lines/);
    expect(system).toMatch(/Tutoie/);
  });
  it('« J’ai cuisiné les pâtes carbonara »: the recipe found, the cook is prepared in the same turn',async()=>{
    const {ai,requests}=scripted([{call:{name:'search_recipes',arguments:'{"query":"carbonara"}'}},
      {call:{name:'cook_recipe',arguments:JSON.stringify({recipe_id:RECIPE})}},{content:'fin'}]);
    const cook={execute:jest.fn()};
    const response=await serviceAt(new Date(),ai,{search_recipes:{execute:async()=>({result:{recipes:[{id:RECIPE,name:'Pâtes carbonara'}]}})},cook_recipe:cook})
      .handleRequest({...input,text:'J’ai cuisiné les pâtes carbonara'},makeCtx());
    expect((requests[1].tools ?? []).map(t=>t.function.name)).toContain('cook_recipe');
    expect(JSON.stringify(requests[1].messages)).toContain(RECIPE);
    expect(response.actions_pending.map(a=>a.tool)).toEqual(['cook_recipe']);
    expect(cook.execute).not.toHaveBeenCalled();
  });
  it('the model sees the whole stock, not the first 1 500 characters',async()=>{
    const items=Array.from({length:40},(_,i)=>({id:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,product_id:'p'+i,product_name:'Produit numéro '+i,
      category:'épicerie',unit_type:'g',quantity:100+i,expiry_date:null,days_to_expiry:null,location:'placard',image_url:'https://example.test/'+'x'.repeat(80)}));
    const {ai,requests}=scripted([{call:{name:'read_inventory',arguments:'{}'}},{content:'Tu as 40 produits.'}]);
    await serviceAt(new Date(),ai,{read_inventory:{execute:async()=>({result:{items}})}}).handleRequest({...input,text:'Qu’est-ce que j’ai en stock ?'},makeCtx());
    const seen=JSON.stringify(requests[1].messages);
    expect(seen).toContain('Produit numéro 39');
    expect(seen).not.toContain('example.test');
  });
  it('a second Confirmer, even at the same time, does not run the action again and reports the first run',async()=>{
    const writer=new MockWriter();
    const row=makeRow({id:randomUUID(),tool:'consume_inventory_items',tool_args:{items:[]},risk_tier:'medium',status:'planned',reversible:false});
    writer.rows.push(row);
    const consume={execute:jest.fn(async()=>({result:{consumed:1}}))};
    const service=serviceAt(new Date(),makeAi([]),{consume_inventory_items:consume},writer);
    const token=new ConfirmationTokenSigner(SECRET).sign({userId:USER,sessionId:row.session_id,actionLogIds:[row.id]});
    const [first,second]=await Promise.all([service.handleConfirm({userId:USER,confirmationToken:token},makeCtx()),
      service.handleConfirm({userId:USER,confirmationToken:token},makeCtx())]);
    const again=await service.handleConfirm({userId:USER,confirmationToken:token},makeCtx());
    expect(consume.execute).toHaveBeenCalledTimes(1);
    for (const res of [first,second,again]) expect(res.actions_executed.map(a=>a.action_id)).toEqual([row.id]);
  });
  it('an expired confirmation says so in French',async()=>{
    const signer=new ConfirmationTokenSigner(SECRET);
    const token=signer.sign({userId:USER,sessionId:randomUUID(),actionLogIds:[randomUUID()],expiresAt:Date.now()-1000});
    await expect(serviceAt(new Date(),makeAi([])).handleConfirm({userId:USER,confirmationToken:token},makeCtx()))
      .rejects.toMatchObject({code:'CONFIRMATION_EXPIRED',message:expect.stringMatching(/plus de 5 minutes.*redis-moi/i)});
  });
  it('an action the server cannot run says it is not available, not « précise le produit »',async()=>{
    const {ai}=scripted([{call:{name:'add_recipe_to_meal_plan',arguments:JSON.stringify({recipe_id:RECIPE,date:'2026-11-02',meal_type:'dinner'})}}]);
    const response=await serviceAt(new Date(),ai).handleRequest({...input,text:'Mets les carbonara lundi soir'},makeCtx());
    expect(response.message).toMatch(/pas encore disponible/);
    expect(response.message).not.toMatch(/Précise le produit/);
  });
  it('an argument repair stays on the dialogue model and keeps the session turns',async()=>{
    const p=memoryPolicy({userId:USER,saveHistory:false,memoryEnabled:false});
    const {ai,requests}=scripted([{call:{name:'add_shopping_items',arguments:'{"items":[{"name":"lait","quantity":-1}]}'}},
      {call:{name:'add_shopping_items',arguments:'{"items":[{"name":"lait","quantity":1,"unit":"L"}]}'}},{content:'Ajouté.'}]);
    const registry=new ToolHandlerRegistry();registry.register('add_shopping_items',{execute:async()=>({result:{added:[]},reversibleAction:null})});
    await new VoiceAgentService(ai,mockTranscriber,new ToolRegistry(),registry,new MockWriter() as unknown as ActionLogWriter,new ConfirmationTokenSigner(SECRET),
      {modelConfig:benchmarkConfig('baseline'),memoryService:{readPolicySafe:async()=>p} as unknown as MemoryService,memoryExtractor:new MemoryExtractor(),
        contextBuilder:{build:async()=>({policy:p,combinedText:''})} as unknown as ContextBuilder})
      .handleRequest({...input,text:'Et du lait',sessionMessages:[{role:'user',content:'Ajoute des œufs à ma liste'},{role:'assistant',content:'Ajouté.'}],sessionRevision:p.revision},makeCtx());
    expect(requests[1].model).toBe(benchmarkConfig('baseline').roles.dialogue.model);
    expect(JSON.stringify(requests[1].messages)).toContain('Ajoute des œufs à ma liste');
  });
});

describe('several recipes match (iPhone 2026-11-07 15:21: 5 biryani, 5 cook_recipe)',()=>{
  const input={userId:USER,clientRequestId:'22222222-2222-4222-8222-222222222222',source:'text' as const,text:'j’ai cuisiné byriani'};
  const ids=['55555555-5555-4555-8555-555555555551','55555555-5555-4555-8555-555555555552','55555555-5555-4555-8555-555555555553'];
  const names=['Lamb (Mutton) Biryani','Buhari Chicken Biryani','Dindigul Chicken Biryani'];
  const search={execute:async()=>({result:{recipes:ids.map((id,i)=>({id,name:names[i]}))}})};
  function run(cookIds:string[],text=input.text,memoryService?:StubMemoryService) {
    let n=0;
    const ai:AICompletionClient={complete:async request=>{
      n++;
      const calls=n===1 ? [{id:'s1',name:'search_recipes',arguments:'{"query":"byriani"}'}]
        : n===2 ? cookIds.map((id,i)=>({id:'c'+i,name:'cook_recipe',arguments:JSON.stringify({recipe_id:id})})) : [];
      return {content:n>2 ? 'Super !' : '',model:request.model,usage:{prompt_tokens:10,completion_tokens:10},...(calls.length ? {tool_calls:calls} : {})};
    }};
    const {service}=makeService({ai,handlers:{search_recipes:search,cook_recipe:{execute:jest.fn()}},modelConfig:benchmarkConfig('baseline'),memoryService});
    return service.handleRequest({...input,text},makeCtx());
  }
  const savedReply=(memory:StubMemoryService)=>memory.messages.find(message=>message.role==='assistant')!;
  it('the saved question shows no recipe cards, only the choices (iPhone 2026-11-08: a tapped card opened the recipe)',async()=>{
    const memory=new StubMemoryService();
    const response=await run(ids,input.text,memory);
    expect(response.choices?.map(choice=>choice.label)).toEqual(names);
    expect(savedReply(memory).metadata.recipe_proposals).toBeUndefined();
    expect(response.message).toMatch(/Touche son nom ci-dessous/);
  });
  it('a cook prepared from a search shows no cards either: Confirmer is the only thing to tap',async()=>{
    const memory=new StubMemoryService();
    const response=await run([ids[0]],'j’ai cuisiné le lamb biryani',memory);
    expect(response.actions_pending.map(action=>action.tool)).toEqual(['cook_recipe']);
    expect(savedReply(memory).metadata.recipe_proposals).toBeUndefined();
  });
  it('a plain recipe search still saves its cards',async()=>{
    const memory=new StubMemoryService();
    await run([],'montre-moi mes biryani',memory);
    expect((savedReply(memory).metadata.recipe_proposals as {recent_suggestions:unknown[]}).recent_suggestions).toHaveLength(3);
  });
  it('prepares nothing and asks which one, naming them',async()=>{
    const response=await run(ids);
    expect(response.actions_pending).toEqual([]);
    expect(response.confirmation_token).toBeNull();
    expect(response.message).toMatch(/Plusieurs recettes correspondent/);
    for (const name of names) expect(response.message).toContain(name);
    expect(response.message).toMatch(/Laquelle as-tu cuisinée/);
  });
  it('one of the matches picked at random is not kept either (live repro: Buhari then Lamb)',async()=>{
    const response=await run([ids[1]]);
    expect(response.actions_pending).toEqual([]);
    expect(response.message).toMatch(/Laquelle as-tu cuisinée/);
    for (const name of names) expect(response.message).toContain(name);
  });
  it('words that single one out keep it: « j’ai cuisiné le lamb biryani »',async()=>{
    const response=await run([ids[0]],'j’ai cuisiné le lamb biryani');
    expect(response.actions_pending).toHaveLength(1);
    expect(response.actions_pending[0].labels).toEqual({[ids[0]]:names[0]});
  });
});

describe('groceries kept from a photo are added without a model call',()=>{
  const items=[{name:'Lait demi-écrémé',quantity:6,unit:'bouteille',brand:'Lactel'},{name:'Riz',quantity:1,unit:'kg',expiry_date:'2027-03-01'}];
  class ReplayWriter extends MockWriter {
    async insertPlanned(input: Parameters<MockWriter['insertPlanned']>[0]) {
      const existing=this.rows.find(r=>r.client_request_id===input.clientRequestId && r.step_seq===input.stepSeq);
      if (existing) return { ...existing, replayed: true };
      const row=await super.insertPlanned(input);row.client_request_id=input.clientRequestId;return row;
    }
    async markExecuted(id: string, params: Parameters<MockWriter['markExecuted']>[1]) {
      await super.markExecuted(id,params);const row=this.rows.find(r=>r.id===id);
      if (row) { row.result=params.result;row.reversible_action=params.reversibleAction ?? null;row.undo_expires_at=params.undoExpiresAt?.toISOString() ?? null; }
    }
  }
  const added={added:[{inventory_id:'inv-1',product_id:'p-1',product_name:'Lait demi-écrémé',quantity:6}],ambiguous:[]};
  it('runs add_inventory_items once, logs it as executed and keeps it undoable',async()=>{
    const execute=jest.fn(async()=>({result:added,reversibleAction:{tool:'_undo_inventory_add',args:{inventory_ids:['inv-1']}}}));
    const ai={complete:jest.fn()};const writer=new ReplayWriter();
    const {service}=makeService({ai:ai as unknown as AICompletionClient,handlers:{add_inventory_items:{execute}},writer});
    const first=await service.addReviewedGroceries({userId:USER,clientRequestId:'66666666-6666-4666-8666-666666666666',items},makeCtx());
    expect(ai.complete).not.toHaveBeenCalled();
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({userId:USER,commandId:first.action.action_id}),{items});
    expect(first.action).toMatchObject({tool:'add_inventory_items',result:added,reversible:true,risk_tier:'low'});
    expect(first.action.undo_expires_at).not.toBeNull();
    expect(writer.rows).toHaveLength(1);expect(writer.rows[0].status).toBe('executed');
    const again=await service.addReviewedGroceries({userId:USER,clientRequestId:'66666666-6666-4666-8666-666666666666',items},makeCtx());
    expect(execute).toHaveBeenCalledTimes(1);expect(again.action.action_id).toBe(first.action.action_id);expect(again.action.result).toEqual(added);
  });
  it('refuses a product without name or with a negative quantity before any write',async()=>{
    const execute=jest.fn();const writer=new ReplayWriter();
    const {service}=makeService({ai:{complete:jest.fn()} as unknown as AICompletionClient,handlers:{add_inventory_items:{execute}},writer});
    for (const bad of [[{name:'',quantity:1,unit:'kg'}],[{name:'Riz',quantity:-1,unit:'kg'}],[]])
      await expect(service.addReviewedGroceries({userId:USER,clientRequestId:'77777777-7777-4777-8777-777777777777',items:bad},makeCtx())).rejects.toMatchObject({code:'INVALID_ITEMS'});
    expect(execute).not.toHaveBeenCalled();expect(writer.rows).toHaveLength(0);
  });
  it('a failed add is logged as failed and reported, never as added',async()=>{
    const writer=new ReplayWriter();
    const {service}=makeService({ai:{complete:jest.fn()} as unknown as AICompletionClient,handlers:{add_inventory_items:{execute:jest.fn(async()=>{throw new Error('lot conflict');})}},writer});
    await expect(service.addReviewedGroceries({userId:USER,clientRequestId:'88888888-8888-4888-8888-888888888888',items},makeCtx())).rejects.toMatchObject({code:'EXECUTION_FAILED'});
    expect(writer.rows[0].status).toBe('failed');
  });
});

describe('a recipe action without a search this turn (iPhone 2026-11-07 22:48: invented recipe id)',()=>{
  const input={userId:USER,clientRequestId:'22222222-2222-4222-8222-222222222222',source:'text' as const};
  const LAMB='55555555-5555-4555-8555-555555555551',BUHARI='55555555-5555-4555-8555-555555555552',DINDIGUL='55555555-5555-4555-8555-555555555553';
  const library=[{id:LAMB,name:'Lamb (Mutton) Biryani'},{id:BUHARI,name:'Buhari Chicken Biryani'},{id:DINDIGUL,name:'Dindigul Chicken Biryani'},{id:'55555555-5555-4555-8555-555555555554',name:'Pâtes carbonara'}];
  const recipesClient={from:()=>{const chain:Record<string,unknown>={};for(const m of ['select','eq','limit','order']) chain[m]=()=>chain;
    chain.then=(resolve:(v:unknown)=>unknown)=>Promise.resolve({data:library,error:null}).then(resolve);return chain;}};
  const ctx=()=>({...makeCtx(),userClient:recipesClient as any});
  function cook(text:string,recipeId='b2b4e0d0-4c5e-4e3b-8c9e-5b5e5b5e5b5e') {
    let n=0;
    const ai:AICompletionClient={complete:async request=>{n++;
      return {content:n>1 ? 'ok' : '',model:request.model,usage:{prompt_tokens:10,completion_tokens:10},
        ...(n===1 ? {tool_calls:[{id:'c1',name:'cook_recipe',arguments:JSON.stringify({recipe_id:recipeId,servings:1})}]} : {})};
    }};
    const {service}=makeService({ai,handlers:{cook_recipe:{execute:jest.fn()}},modelConfig:benchmarkConfig('baseline')});
    return service.handleRequest({...input,text},ctx());
  }
  it('« le Lamb (Mutton) Biryani »: the invented id is replaced by the recipe the words name',async()=>{
    const response=await cook('le Lamb (Mutton) Biryani');
    expect(response.actions_pending).toHaveLength(1);
    expect(response.actions_pending[0].args.recipe_id).toBe(LAMB);
    expect(response.actions_pending[0].labels).toEqual({[LAMB]:'Lamb (Mutton) Biryani'});
  });
  it('« byriani »: several recipes match, so it asks which and offers them as choices',async()=>{
    const response=await cook('j’ai cuisiné byriani');
    expect(response.actions_pending).toEqual([]);
    expect(response.message).toMatch(/Laquelle as-tu cuisinée/);
    expect(response.choices?.map(c=>c.label).sort()).toEqual(['Buhari Chicken Biryani','Dindigul Chicken Biryani','Lamb (Mutton) Biryani']);
    expect(response.choices?.find(c=>c.label==='Lamb (Mutton) Biryani')?.reply).toBe('J’ai cuisiné Lamb (Mutton) Biryani');
  });
  it('no recipe named by the words: nothing prepared, and it says so',async()=>{
    const response=await cook('j’ai cuisiné un couscous');
    expect(response.actions_pending).toEqual([]);
    expect(response.message).toMatch(/pas retrouvé cette recette/);
  });
  it('a real biryani id is not kept when « byriani » names the others as well',async()=>{
    const response=await cook('j’ai cuisiné byriani',BUHARI);
    expect(response.actions_pending).toEqual([]);
    expect(response.choices).toHaveLength(3);
  });
  it('a real id whose recipe the words name is kept',async()=>{
    const response=await cook('j’ai cuisiné les pâtes carbonara','55555555-5555-4555-8555-555555555554');
    expect(response.actions_pending[0].args.recipe_id).toBe('55555555-5555-4555-8555-555555555554');
  });
  it('a failed confirmation says why',async()=>{
    const writer=new MockWriter();
    const row=makeRow({id:randomUUID(),tool:'cook_recipe',tool_args:{recipe_id:LAMB},risk_tier:'medium',status:'planned',reversible:false});
    writer.rows.push(row);
    const {service}=makeService({ai:makeAi([]),writer,handlers:{cook_recipe:{execute:async()=>{throw new StockCommandError('RECIPE_NOT_FOUND',404);}}}});
    const token=new ConfirmationTokenSigner(SECRET).sign({userId:USER,sessionId:row.session_id,actionLogIds:[row.id]});
    const res=await service.handleConfirm({userId:USER,confirmationToken:token},makeCtx());
    expect(res.actions_failed).toEqual([expect.objectContaining({action_id:row.id,reason:new StockCommandError('RECIPE_NOT_FOUND',404).message})]);
  });
});

describe('answering « laquelle ? » by typing the name (live repro 2026-11-08)',()=>{
  const LAMB='55555555-5555-4555-8555-555555555551';
  const p=memoryPolicy({userId:USER,saveHistory:false,memoryEnabled:false});
  const asked=[{role:'user' as const,content:'j’ai cuisiné byriani'},
    {role:'assistant' as const,content:'Plusieurs recettes correspondent : Lamb (Mutton) Biryani, Buhari Chicken Biryani. Laquelle as-tu cuisinée ? Redis-le-moi avec son nom.'}];
  it('« le Lamb (Mutton) Biryani » continues the cook: the follow-up hop runs after the search',async()=>{
    const requests:AICompletionRequest[]=[];
    const ai:AICompletionClient={complete:async request=>{requests.push(request);const n=requests.length;
      return {content:n>2 ? 'ok' : '',model:request.model,usage:{prompt_tokens:10,completion_tokens:10},
        ...(n===1 ? {tool_calls:[{id:'s1',name:'search_recipes',arguments:'{"query":"Lamb (Mutton) Biryani"}'}]}
          : n===2 ? {tool_calls:[{id:'c1',name:'cook_recipe',arguments:JSON.stringify({recipe_id:LAMB})}]} : {})};}};
    const registry=new ToolHandlerRegistry();
    registry.register('search_recipes',{execute:async()=>({result:{recipes:[{id:LAMB,name:'Lamb (Mutton) Biryani'}]}})});
    registry.register('cook_recipe',{execute:jest.fn()});
    const response=await new VoiceAgentService(ai,mockTranscriber,new ToolRegistry(),registry,new MockWriter() as unknown as ActionLogWriter,new ConfirmationTokenSigner(SECRET),
      {modelConfig:benchmarkConfig('baseline'),memoryService:{readPolicySafe:async()=>p} as unknown as MemoryService,memoryExtractor:new MemoryExtractor(),
        contextBuilder:{build:async()=>({policy:p,combinedText:''})} as unknown as ContextBuilder})
      .handleRequest({userId:USER,clientRequestId:'22222222-2222-4222-8222-222222222222',source:'text',text:'le Lamb (Mutton) Biryani',sessionMessages:asked,sessionRevision:p.revision},makeCtx());
    expect((requests[1].tools ?? []).map(t=>t.function.name)).toContain('cook_recipe');
    expect(response.actions_pending.map(a=>[a.tool,a.labels])).toEqual([['cook_recipe',{[LAMB]:'Lamb (Mutton) Biryani'}]]);
  });
});

describe('an action to confirm says what it will do (iPhone 2026-11-08: Confirmer refused a cook)',()=>{
  const RECIPE='55555555-5555-4555-8555-555555555551';
  function cookWith(preview:()=>Promise<string[]>) {
    let n=0;
    const ai:AICompletionClient={complete:async request=>{n++;
      return {content:n>1 ? 'ok' : '',model:request.model,usage:{prompt_tokens:10,completion_tokens:10},
        ...(n===1 ? {tool_calls:[{id:'c1',name:'cook_recipe',arguments:JSON.stringify({recipe_id:RECIPE})}]} : {})};}};
    const execute=jest.fn();
    const {service}=makeService({ai,handlers:{cook_recipe:{execute,preview}},modelConfig:benchmarkConfig('baseline')});
    return {execute,response:service.handleRequest({userId:USER,clientRequestId:'22222222-2222-4222-8222-222222222222',source:'text',text:'j’ai cuisiné les pâtes carbonara'},makeCtx())};
  }
  it('the pending cook carries what the stock gives and what it does not',async()=>{
    const {execute,response}=cookWith(async()=>['Je retire de ton stock : Pâtes 200 g.','Pas dans ton stock, rien à retirer : Guanciale.']);
    const {actions_pending}=await response;
    expect(actions_pending.map(action=>action.details)).toEqual([['Je retire de ton stock : Pâtes 200 g.','Pas dans ton stock, rien à retirer : Guanciale.']]);
    expect(execute).not.toHaveBeenCalled();
  });
  it('a preview that fails leaves the action to confirm as it was',async()=>{
    const {response}=cookWith(async()=>{throw new Error('stock indisponible');});
    const {actions_pending}=await response;
    expect(actions_pending).toHaveLength(1);
    expect(actions_pending[0].details).toBeUndefined();
  });
});

describe('a menu add that replaces a meal says so (audit 2026-11-07: replaced silently)',()=>{
  const RECIPE='55555555-5555-4555-8555-555555555551';
  function planWith(result:Record<string,unknown>,reply='C’est noté pour lundi soir.') {
    let n=0;
    const ai:AICompletionClient={complete:async request=>{n++;
      return {content:n>1 ? reply : '',model:request.model,usage:{prompt_tokens:10,completion_tokens:10},
        ...(n===1 ? {tool_calls:[{id:'p1',name:'add_recipe_to_meal_plan',arguments:JSON.stringify({recipe_id:RECIPE,date:'2026-11-09',meal_type:'dinner'})}]} : {})};}};
    const handler={execute:async()=>({result,reversibleAction:{tool:'_undo_stock_command',args:{original_command_id:'c'}}})};
    const {service}=makeService({ai,handlers:{add_recipe_to_meal_plan:handler},modelConfig:benchmarkConfig('baseline')});
    return service.handleRequest({userId:USER,clientRequestId:'22222222-2222-4222-8222-222222222222',source:'text',text:'mets le dhal au menu lundi soir'},makeCtx());
  }
  it('names the meal it replaced and how to get it back',async()=>{
    const response=await planWith({entry_id:'e',recipe_name:'Dhal',replaced_recipe_name:'Curry'});
    expect(response.message).toContain('Ça remplace « Curry » dans ton menu : touche « Annuler » pour le remettre.');
    expect(response.actions_executed[0].reversible).toBe(true);
  });
  it('says nothing more when the reply already names it, or nothing was replaced',async()=>{
    expect((await planWith({entry_id:'e',replaced_recipe_name:'Curry'},'Dhal remplace Curry lundi soir.')).message).toBe('Dhal remplace Curry lundi soir.');
    expect((await planWith({entry_id:'e'})).message).toBe('C’est noté pour lundi soir.');
  });
});

describe('a tapped recipe choice (iPhone 2026-11-09: several seconds with nothing on screen)',()=>{
  const LAMB='55555555-5555-4555-8555-555555555551',BUHARI='55555555-5555-4555-8555-555555555552';
  const library=[{id:LAMB,name:'Lamb (Mutton) Biryani'},{id:BUHARI,name:'Buhari Chicken Biryani'}];
  const recipesClient={from:()=>{const chain:Record<string,unknown>={};for(const m of ['select','eq','limit','order']) chain[m]=()=>chain;
    chain.then=(resolve:(v:unknown)=>unknown)=>Promise.resolve({data:library,error:null}).then(resolve);return chain;}};
  const ctx=()=>({...makeCtx(),userClient:recipesClient as never});
  const input={userId:USER,clientRequestId:'22222222-2222-4222-8222-222222222222',source:'text' as const,text:'J’ai cuisiné Lamb (Mutton) Biryani'};
  it('the « laquelle ? » choices carry the exact action to prepare',async()=>{
    let n=0;
    const ai:AICompletionClient={complete:async request=>{n++;
      const calls=n===1 ? [{id:'s1',name:'search_recipes',arguments:'{"query":"byriani"}'}]
        : n===2 ? [LAMB,BUHARI].map((id,i)=>({id:'c'+i,name:'cook_recipe',arguments:JSON.stringify({recipe_id:id,servings:2})})) : [];
      return {content:n>2 ? 'ok' : '',model:request.model,usage:{prompt_tokens:10,completion_tokens:10},...(calls.length ? {tool_calls:calls} : {})};}};
    const search={execute:async()=>({result:{recipes:library}})};
    const {service}=makeService({ai,handlers:{search_recipes:search,cook_recipe:{execute:jest.fn()}},modelConfig:benchmarkConfig('baseline')});
    const response=await service.handleRequest({...input,text:'j’ai cuisiné byriani'},ctx());
    expect(response.choices?.find(choice=>choice.label==='Lamb (Mutton) Biryani')?.action).toEqual({tool:'cook_recipe',args:{servings:2,recipe_id:LAMB}});
  });
  it('prepares that action without calling the model',async()=>{
    const complete=jest.fn();
    const preview=jest.fn(async()=>['Je retire de ton stock : oignon 2 unités.']);
    const {service}=makeService({ai:{complete},handlers:{cook_recipe:{execute:jest.fn(),preview}},modelConfig:benchmarkConfig('baseline')});
    const response=await service.handleRequest({...input,choice:{tool:'cook_recipe',args:{recipe_id:LAMB}}},ctx());
    expect(complete).not.toHaveBeenCalled();
    expect(response.actions_pending.map(action=>[action.tool,action.labels,action.details])).toEqual([['cook_recipe',{[LAMB]:'Lamb (Mutton) Biryani'},['Je retire de ton stock : oignon 2 unités.']]]);
    expect(response.message).toBe('1 action à confirmer : vérifie-la ci-dessous, puis touche « Confirmer ».');
  });
  // iPhone 2026-11-09, after #109: with the history on, nothing came back. No model call meant
  // no policy read, so the turn looked « réglages changés »: action dropped, reply not saved.
  it('with the history on, prepares the action and saves the reply in the conversation',async()=>{
    const memory=new StubMemoryService();
    const conversation=await memory.createConversation(USER);
    const complete=jest.fn();
    const preview=jest.fn(async()=>['Je retire de ton stock : oignon 2 unités.']);
    const {service}=makeService({ai:{complete},handlers:{cook_recipe:{execute:jest.fn(),preview}},modelConfig:benchmarkConfig('baseline'),memoryService:memory});
    const response=await service.handleRequest({...input,conversationId:conversation.id,choice:{tool:'cook_recipe',args:{recipe_id:LAMB}}},ctx());
    expect(complete).not.toHaveBeenCalled();
    expect(response.actions_pending.map(action=>action.tool)).toEqual(['cook_recipe']);
    expect(response.confirmation_token).toEqual(expect.any(String));
    expect(response.message).toBe('1 action à confirmer : vérifie-la ci-dessous, puis touche « Confirmer ».');
    expect(memory.messages.map(message=>[message.role,message.content])).toEqual([
      ['user','J’ai cuisiné Lamb (Mutton) Biryani'],['assistant','1 action à confirmer : vérifie-la ci-dessous, puis touche « Confirmer ».']]);
  });
  it('a recipe outside the library is refused, still without the model',async()=>{
    const complete=jest.fn();
    const {service}=makeService({ai:{complete},handlers:{cook_recipe:{execute:jest.fn()}},modelConfig:benchmarkConfig('baseline')});
    const response=await service.handleRequest({...input,choice:{tool:'cook_recipe',args:{recipe_id:'99999999-9999-4999-8999-999999999999'}}},ctx());
    expect(complete).not.toHaveBeenCalled();
    expect(response.actions_pending).toEqual([]);
    expect(response.message).toMatch(/pas retrouvé cette recette/);
  });
  it('a choice naming another tool is not trusted: the request goes to the model as typed',async()=>{
    const complete=jest.fn(async(request:AICompletionRequest)=>({content:'ok',model:request.model,usage:{prompt_tokens:1,completion_tokens:1}}));
    const {service}=makeService({ai:{complete},handlers:{},modelConfig:benchmarkConfig('baseline')});
    await service.handleRequest({...input,choice:{tool:'remove_shopping_items',args:{ids:['x']}}},ctx());
    expect(complete).toHaveBeenCalled();
  });
});
