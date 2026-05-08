/**
 * PRP-221 J4 — VoiceAgentService.
 *
 * Synchronous orchestrator for /api/assistant/voice + /text + /confirm
 * + /undo. Pure logic; HTTP wiring lives in J5.
 *
 * Flow (per /voice or /text request) :
 *   1. (voice) Whisper transcribe
 *   2. (voice) audio_sha256 dedup window 10min
 *   3. GPT-4o-mini with the tool catalog (whitelist optional)
 *   4. For each tool_call returned by the model :
 *        a. Zod-validate args via ToolRegistry
 *        b. Classify risk via RiskClassifier (server-side, never trust LLM)
 *        c. INSERT assistant_action_log row, status='planned'
 *        d. read/low → execute immediately, mark executed + reversibility
 *           medium/high → leave planned, return for client confirmation
 *   5. If any pending actions, sign a confirmation_token referencing
 *      their action_log_ids
 *   6. Synthesize a user-facing message from the LLM `content` (when
 *      provided) or a deterministic summary
 *   7. Return the structured AssistantPlanResponse
 *
 * Caps :
 *   - maxToolCalls (default 6) — the orchestrator only honours the first
 *     N tool_calls from the model, ignoring extras. PRP-221 §17.
 *   - On invalid args (Zod fail), retry the LLM ONCE with gpt-4o + an
 *     "Previous response failed validation" hint (PRP-221 §18 Q4).
 */
import { createHash, randomUUID } from 'node:crypto';

import type {
  AICompletionClient,
  AICompletionRequest,
  AICompletionResponse,
  AICompletionToolCall,
} from '../imports/RecipeExtractionService.js';
import {
  ToolRegistry,
  ToolArgsValidationError,
  type ToolName,
} from './ToolRegistry.js';
import { classifyRisk, type RiskClassification } from './RiskClassifier.js';
import { ActionLogWriter, type ActionLogRow } from './ActionLogWriter.js';
import {
  ConfirmationTokenSigner,
  ConfirmationTokenError,
} from './ConfirmationTokenSigner.js';
import {
  ToolHandlerRegistry,
  ToolHandlerNotFoundError,
  DEFAULT_UNDO_WINDOW_MS,
  type ToolExecutionContext,
  type ToolExecutionResult,
} from './handlers/types.js';
import {
  computeWhisperCostUsd,
  type WhisperClient,
} from '../media/WhisperTranscriber.js';
import type { RiskTier } from './schemas/tools.js';

const DEFAULT_MODEL = 'gpt-4o-mini';
const FALLBACK_MODEL = 'gpt-4o';
const DEFAULT_MAX_TOOL_CALLS = 6;
const DEFAULT_CONFIRMATION_TTL_MS = 5 * 60_000;

const PRICES_PER_M: Record<string, { in: number; out: number }> = {
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
  'gpt-4o': { in: 2.5, out: 10 },
};

const AGENT_SYSTEM_PROMPT = `You are Smart Pantry Pro's kitchen assistant. The user speaks to you in French (default) or English.

You help manage their inventory, shopping list, recipes, and meal plan via tool calls.

GROUND your suggestions in real state: call read_inventory / read_shopping_list / read_recent_recipes BEFORE proposing actions if the user's intent depends on stock.

Be precise:
- never invent products, quantities, or recipes the user did not mention
- when the user mentions an item that may match several inventory rows, call ask_clarification
- product names go to tools as plain text ("tomate", "yaourt grec") — the server resolves them to IDs

Format the final assistant message in the user's language (FR if FR, EN if EN). Keep it short, confirm what was done, ask only what's strictly necessary.

If the request requires no action (e.g. casual chat), just answer in plain text without calling tools.`;

// ---- Public API shapes -----------------------------------------------

export interface VoiceAgentRequestInput {
  source: 'voice' | 'text';
  audioPath?: string;
  audioSha256?: string;
  /** Audio duration in seconds, used only for Whisper cost computation. */
  audioDurationSeconds?: number;
  text?: string;
  language?: string;

  userId: string;
  clientRequestId: string;
  /**
   * Optional whitelist of tools this surface allows (e.g. the legacy
   * shopping voice page only exposes add_shopping_items).
   */
  allowedTools?: readonly ToolName[];
}

export interface ExecutedActionDescriptor {
  action_id: string;
  step_seq: number;
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
  reversible: boolean;
  undo_expires_at: string | null;
  risk_tier: RiskTier;
}

export interface PendingActionDescriptor {
  action_id: string;
  step_seq: number;
  tool: string;
  args: Record<string, unknown>;
  risk_tier: RiskTier;
  reason: string;
}

export interface AssistantPlanResponse {
  session_id: string;
  transcript: string;
  detected_language?: string;
  message: string;
  actions_executed: ExecutedActionDescriptor[];
  actions_pending: PendingActionDescriptor[];
  confirmation_token: string | null;
  cost: {
    whisper_usd: number;
    llm_usd: number;
    total_usd: number;
  };
  model_used: string;
  duration_ms: number;
  /** True if this is a 10-minute audio_sha256 replay of a previous session. */
  replayed?: boolean;
}

export interface ConfirmationInput {
  userId: string;
  confirmationToken: string;
}

export interface UndoInput {
  userId: string;
  actionId: string;
}

export interface VoiceAgentOptions {
  model?: string;
  fallbackModel?: string;
  maxToolCalls?: number;
  confirmationTtlMs?: number;
  systemPrompt?: string;
  /** Default undo window for low/medium successful actions. */
  undoWindowMs?: number;
}

// ---- Errors ---------------------------------------------------------

export class VoiceAgentError extends Error {
  constructor(
    readonly code:
      | 'TRANSCRIPTION_FAILED'
      | 'LLM_FAILED'
      | 'NO_TOOL_HANDLER'
      | 'CONFIRMATION_INVALID'
      | 'CONFIRMATION_EXPIRED'
      | 'UNDO_NOT_FOUND'
      | 'UNDO_NOT_REVERSIBLE'
      | 'UNDO_EXPIRED'
      | 'UNDO_HANDLER_MISSING'
      | 'INTERNAL',
    message: string
  ) {
    super(message);
    this.name = 'VoiceAgentError';
  }
}

// ---- Service --------------------------------------------------------

export class VoiceAgentService {
  private readonly model: string;
  private readonly fallbackModel: string;
  private readonly maxToolCalls: number;
  private readonly undoWindowMs: number;
  private readonly systemPrompt: string;
  private readonly confirmationTtlMs: number;

  constructor(
    private readonly ai: AICompletionClient,
    private readonly whisper: WhisperClient,
    private readonly toolRegistry: ToolRegistry,
    private readonly handlerRegistry: ToolHandlerRegistry,
    private readonly writer: ActionLogWriter,
    private readonly signer: ConfirmationTokenSigner,
    options: VoiceAgentOptions = {}
  ) {
    this.model = options.model ?? DEFAULT_MODEL;
    this.fallbackModel = options.fallbackModel ?? FALLBACK_MODEL;
    this.maxToolCalls = options.maxToolCalls ?? DEFAULT_MAX_TOOL_CALLS;
    this.confirmationTtlMs = options.confirmationTtlMs ?? DEFAULT_CONFIRMATION_TTL_MS;
    this.undoWindowMs = options.undoWindowMs ?? DEFAULT_UNDO_WINDOW_MS;
    this.systemPrompt = options.systemPrompt ?? AGENT_SYSTEM_PROMPT;
  }

  // ---- /voice and /text -------------------------------------------

  async handleRequest(
    input: VoiceAgentRequestInput,
    ctx: ToolExecutionContext
  ): Promise<AssistantPlanResponse> {
    const start = Date.now();
    const sessionId = randomUUID();

    // 1. Transcript: from Whisper for voice, raw text otherwise.
    let transcript = '';
    let detectedLanguage: string | undefined;
    let whisperUsd = 0;

    if (input.source === 'voice') {
      if (!input.audioPath) {
        throw new VoiceAgentError(
          'TRANSCRIPTION_FAILED',
          'audioPath required when source=voice'
        );
      }
      // 10-min audio sha replay protection (PRP-221 §8 belt-and-braces)
      if (input.audioSha256) {
        const replayed = await this.writer.findByAudioSha(
          input.userId,
          input.audioSha256
        );
        if (replayed) {
          return this.buildReplayResponse(start, replayed);
        }
      }
      try {
        const transcribed = await this.whisper.transcribe({
          audioPath: input.audioPath,
          language: input.language,
        });
        transcript = transcribed.text.trim();
        detectedLanguage = transcribed.language;
      } catch (err) {
        throw new VoiceAgentError(
          'TRANSCRIPTION_FAILED',
          err instanceof Error ? err.message : 'Whisper failed'
        );
      }
      if (input.audioDurationSeconds && input.audioDurationSeconds > 0) {
        whisperUsd = computeWhisperCostUsd(input.audioDurationSeconds);
      }
    } else {
      transcript = (input.text ?? '').trim();
      detectedLanguage = input.language;
    }

    if (!transcript) {
      return this.emptyResponse(start, sessionId, transcript, detectedLanguage);
    }

    // 2. LLM round 1 with tool catalog
    const tools = this.toolRegistry.toOpenAITools(input.allowedTools);
    const aiMessages: AICompletionRequest['messages'] = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: transcript },
    ];

    const ai1 = await this.callLLMSafe(this.model, aiMessages, tools);
    let llmUsd = this.usdFromUsage(ai1.model || this.model, ai1.usage);
    let activeResponse = ai1;

    const toolCalls = (ai1.tool_calls ?? []).slice(0, this.maxToolCalls);

    // 3. Execute / plan each tool_call
    const executed: ExecutedActionDescriptor[] = [];
    const pending: PendingActionDescriptor[] = [];

    for (let i = 0; i < toolCalls.length; i++) {
      const tc = toolCalls[i];
      const stepSeq = i;

      let parsedArgs: unknown;
      try {
        parsedArgs = this.parseToolArgs(tc);
      } catch (err) {
        if (err instanceof ToolArgsValidationError) {
          // Round 2 escalation : retry on fallback model with the same
          // user message + a hint about the invalid args (§18 Q4).
          const retryMessages: AICompletionRequest['messages'] = [
            { role: 'system', content: this.systemPrompt },
            { role: 'user', content: transcript },
            {
              role: 'assistant',
              content:
                `Previous response had invalid args for tool "${err.toolName}": ` +
                err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') +
                '. Please reformat the call carefully.',
            },
          ];
          const ai2 = await this.callLLMSafe(this.fallbackModel, retryMessages, tools);
          llmUsd += this.usdFromUsage(ai2.model || this.fallbackModel, ai2.usage);
          activeResponse = ai2;
          // Restart the loop with the retried tool_calls (only the failed
          // step; previously executed steps stay).
          const retriedCalls = (ai2.tool_calls ?? []).slice(0, this.maxToolCalls - i);
          if (retriedCalls.length === 0) {
            // Retry produced no tool calls — surface the error and bail.
            break;
          }
          // Re-enter the loop from this index with the retry's calls.
          // Simpler model: replace the rest of toolCalls with retry's.
          toolCalls.splice(i, toolCalls.length - i, ...retriedCalls);
          i--; // re-process at this index
          continue;
        }
        throw err;
      }

      const spec = this.toolRegistry.get(tc.name);
      const risk = classifyRisk(spec, parsedArgs, ctx);

      // INSERT planned row
      let planned: ActionLogRow;
      try {
        planned = await this.writer.insertPlanned({
          userId: input.userId,
          clientRequestId: input.clientRequestId,
          sessionId,
          stepSeq,
          audioSha256: input.audioSha256 ?? null,
          tool: tc.name,
          toolArgs: parsedArgs as Record<string, unknown>,
          riskTier: risk.tier,
          reversible: spec.reversible,
          llmModel: activeResponse.model || this.model,
        });
      } catch (err) {
        throw new VoiceAgentError(
          'INTERNAL',
          err instanceof Error ? err.message : 'action log insert failed'
        );
      }

      if (risk.tier === 'read' || risk.tier === 'low') {
        // Execute immediately
        try {
          const handler = this.handlerRegistry.get(tc.name);
          const exec = await handler.execute(ctx, parsedArgs);
          await this.writer.markExecuted(planned.id, {
            result: exec.result as Record<string, unknown>,
            reversibleAction: spec.reversible
              ? exec.reversibleAction ?? null
              : undefined,
            undoExpiresAt:
              spec.reversible && exec.reversibleAction
                ? new Date(Date.now() + this.undoWindowMs)
                : null,
            costUsd: exec.extraCostUsd,
          });
          executed.push({
            action_id: planned.id,
            step_seq: stepSeq,
            tool: tc.name,
            args: parsedArgs as Record<string, unknown>,
            result: exec.result,
            reversible: Boolean(exec.reversibleAction),
            undo_expires_at:
              exec.reversibleAction
                ? new Date(Date.now() + this.undoWindowMs).toISOString()
                : null,
            risk_tier: risk.tier,
          });
        } catch (err) {
          if (err instanceof ToolHandlerNotFoundError) {
            await this.writer.markFailed(
              planned.id,
              'NO_TOOL_HANDLER',
              err.message
            );
            throw new VoiceAgentError('NO_TOOL_HANDLER', err.message);
          }
          await this.writer.markFailed(
            planned.id,
            'EXECUTION_FAILED',
            err instanceof Error ? err.message : 'unknown error'
          );
          // Keep going — other tool calls in the batch may still succeed.
        }
      } else {
        // medium / high : keep planned, return for confirmation
        pending.push({
          action_id: planned.id,
          step_seq: stepSeq,
          tool: tc.name,
          args: parsedArgs as Record<string, unknown>,
          risk_tier: risk.tier,
          reason: risk.reason ?? defaultReasonForTier(risk.tier),
        });
      }
    }

    // 4. Sign confirmation_token if pending
    let confirmationToken: string | null = null;
    if (pending.length > 0) {
      confirmationToken = this.signer.sign({
        userId: input.userId,
        sessionId,
        actionLogIds: pending.map((p) => p.action_id),
        expiresAt: Date.now() + this.confirmationTtlMs,
      });
    }

    // 5. Build user-facing message
    const message =
      activeResponse.content && activeResponse.content.trim().length > 0
        ? activeResponse.content.trim()
        : synthesizeMessage(executed, pending);

    return {
      session_id: sessionId,
      transcript,
      detected_language: detectedLanguage,
      message,
      actions_executed: executed,
      actions_pending: pending,
      confirmation_token: confirmationToken,
      cost: {
        whisper_usd: whisperUsd,
        llm_usd: Number(llmUsd.toFixed(6)),
        total_usd: Number((whisperUsd + llmUsd).toFixed(6)),
      },
      model_used: activeResponse.model || this.model,
      duration_ms: Date.now() - start,
    };
  }

  // ---- /confirm ---------------------------------------------------

  async handleConfirm(
    input: ConfirmationInput,
    ctx: ToolExecutionContext
  ): Promise<{
    actions_executed: ExecutedActionDescriptor[];
    actions_failed: Array<{ action_id: string; tool: string; error_code: string }>;
  }> {
    let payload;
    try {
      payload = this.signer.verify(input.confirmationToken, input.userId);
    } catch (err) {
      if (err instanceof ConfirmationTokenError) {
        const code: VoiceAgentError['code'] =
          err.code === 'EXPIRED' ? 'CONFIRMATION_EXPIRED' : 'CONFIRMATION_INVALID';
        throw new VoiceAgentError(code, err.code);
      }
      throw err;
    }

    const rows = await this.writer.fetchPlanned(input.userId, payload.actionLogIds);
    const executed: ExecutedActionDescriptor[] = [];
    const failed: Array<{ action_id: string; tool: string; error_code: string }> = [];

    for (const row of rows) {
      try {
        const handler = this.handlerRegistry.get(row.tool);
        const exec = (await handler.execute(ctx, row.tool_args)) as ToolExecutionResult;
        await this.writer.markExecuted(row.id, {
          result: exec.result as Record<string, unknown>,
          reversibleAction: row.reversible ? exec.reversibleAction ?? null : undefined,
          undoExpiresAt:
            row.reversible && exec.reversibleAction
              ? new Date(Date.now() + this.undoWindowMs)
              : null,
        });
        executed.push({
          action_id: row.id,
          step_seq: row.step_seq,
          tool: row.tool,
          args: row.tool_args,
          result: exec.result,
          reversible: Boolean(exec.reversibleAction),
          undo_expires_at: exec.reversibleAction
            ? new Date(Date.now() + this.undoWindowMs).toISOString()
            : null,
          risk_tier: row.risk_tier,
        });
      } catch (err) {
        const code = err instanceof Error ? 'EXECUTION_FAILED' : 'UNKNOWN';
        await this.writer.markFailed(
          row.id,
          code,
          err instanceof Error ? err.message : 'unknown'
        );
        failed.push({ action_id: row.id, tool: row.tool, error_code: code });
      }
    }

    return { actions_executed: executed, actions_failed: failed };
  }

  // ---- /undo ------------------------------------------------------

  async handleUndo(
    input: UndoInput,
    ctx: ToolExecutionContext
  ): Promise<{ undone: boolean; result?: unknown }> {
    const row = await this.writer.fetchById(input.userId, input.actionId);
    if (!row) throw new VoiceAgentError('UNDO_NOT_FOUND', input.actionId);
    if (row.status !== 'executed' || !row.reversible || !row.reversible_action) {
      throw new VoiceAgentError('UNDO_NOT_REVERSIBLE', row.id);
    }
    if (row.undo_expires_at && new Date(row.undo_expires_at) < new Date()) {
      throw new VoiceAgentError('UNDO_EXPIRED', row.id);
    }

    if (!this.handlerRegistry.has(row.reversible_action.tool)) {
      throw new VoiceAgentError(
        'UNDO_HANDLER_MISSING',
        `No handler for inverse tool "${row.reversible_action.tool}"`
      );
    }
    const handler = this.handlerRegistry.get(row.reversible_action.tool);
    const exec = await handler.execute(ctx, row.reversible_action.args);
    await this.writer.markUndone(row.id);
    return { undone: true, result: exec.result };
  }

  // ---- helpers ----------------------------------------------------

  private parseToolArgs(tc: AICompletionToolCall): unknown {
    let raw: unknown;
    try {
      raw = JSON.parse(tc.arguments || '{}');
    } catch (err) {
      throw new ToolArgsValidationError(tc.name, [
        {
          code: 'custom',
          path: [],
          message: `tool_call.arguments not JSON: ${
            err instanceof Error ? err.message : String(err)
          }`,
        } as any,
      ]);
    }
    return this.toolRegistry.parseArgs(tc.name, raw);
  }

  private async callLLMSafe(
    model: string,
    messages: AICompletionRequest['messages'],
    tools: AICompletionRequest['tools']
  ): Promise<AICompletionResponse> {
    try {
      return await this.ai.complete({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 1500,
        tools,
        tool_choice: tools && tools.length > 0 ? 'auto' : 'none',
      });
    } catch (err) {
      throw new VoiceAgentError(
        'LLM_FAILED',
        err instanceof Error ? err.message : 'AI client failed'
      );
    }
  }

  private usdFromUsage(model: string, usage: { prompt_tokens: number; completion_tokens: number }) {
    const price = PRICES_PER_M[model] ?? PRICES_PER_M[DEFAULT_MODEL];
    return (usage.prompt_tokens * price.in + usage.completion_tokens * price.out) / 1_000_000;
  }

  private buildReplayResponse(start: number, row: ActionLogRow): AssistantPlanResponse {
    return {
      session_id: row.session_id,
      transcript: '',
      message: 'Action déjà exécutée (réplique audio détectée).',
      actions_executed: [],
      actions_pending: [],
      confirmation_token: null,
      cost: { whisper_usd: 0, llm_usd: 0, total_usd: 0 },
      model_used: row.llm_model ?? DEFAULT_MODEL,
      duration_ms: Date.now() - start,
      replayed: true,
    };
  }

  private emptyResponse(
    start: number,
    sessionId: string,
    transcript: string,
    detectedLanguage?: string
  ): AssistantPlanResponse {
    return {
      session_id: sessionId,
      transcript,
      detected_language: detectedLanguage,
      message: "Je n'ai pas compris, redis ?",
      actions_executed: [],
      actions_pending: [],
      confirmation_token: null,
      cost: { whisper_usd: 0, llm_usd: 0, total_usd: 0 },
      model_used: this.model,
      duration_ms: Date.now() - start,
    };
  }
}

// ---- helpers --------------------------------------------------------

function defaultReasonForTier(tier: RiskTier): string {
  switch (tier) {
    case 'medium':
      return 'Action modifiant l\'état — confirme.';
    case 'high':
      return 'Action sensible — confirmation requise.';
    default:
      return '';
  }
}

function synthesizeMessage(
  executed: ExecutedActionDescriptor[],
  pending: PendingActionDescriptor[]
): string {
  if (executed.length === 0 && pending.length === 0) {
    return 'Rien à faire.';
  }
  const parts: string[] = [];
  if (executed.length > 0) {
    parts.push(
      `${executed.length} action${executed.length > 1 ? 's' : ''} exécutée${
        executed.length > 1 ? 's' : ''
      }.`
    );
  }
  if (pending.length > 0) {
    parts.push(
      `${pending.length} action${pending.length > 1 ? 's' : ''} en attente de confirmation.`
    );
  }
  return parts.join(' ');
}

/**
 * Stable hash of a JSON-serializable args object — used by the writer
 * for the audio_sha256 fallback and exposed for tests.
 */
export function hashArgs(args: unknown): string {
  return createHash('sha256').update(JSON.stringify(args ?? {})).digest('hex');
}
