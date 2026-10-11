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
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase.js';
import { MemoryWriteResultSchema, type MemoryPolicy, type MemoryWriteResult, type AssistantSessionMessage } from '@smart/shared';
import { sameMemoryPolicy } from './MemoryPolicy.js';
import { memoryModelToolResult } from './MemoryModelOutput.js';
import { ConversationSummaryService, type SummaryResult } from './ConversationSummaryService.js';
import { recommendationModelContext,recommendationProfileChanged } from '../recommendations/RecommendationModelContext.js';

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
import { performUndo, UndoFailedError } from './undo.js';
import {
  computeWhisperCostUsd,
  type WhisperClient,
} from '../media/WhisperTranscriber.js';
import type { RiskTier } from './schemas/tools.js';
import type { AssistantModelReceipt, AssistantRole } from '@smart/shared';
import { loadAssistantModelConfig, freezeConfig, type AssistantModelConfig } from '../ai/ModelConfig.js';
import { ModelInvocation } from '../ai/ModelInvocation.js';

// PRP-239 PR4 — chef agent helpers (round-2 escalation + post-check).
import {
  isRecipeTool,
  chefSystemPrompt,
  CHEF_ROUND2_INSTRUCTION,
  postcheckChefOutput,
  type AssistantStreamEvent,
} from './chefAgent.js';

const DEFAULT_MAX_TOOL_CALLS = 6;
const DEFAULT_CONFIRMATION_TTL_MS = 5 * 60_000;

const AGENT_SYSTEM_PROMPT = `You are Smart Pantry Pro's kitchen assistant. The user speaks to you in French (default) or English.

You help manage their inventory, shopping list, recipes, and meal plan via tool calls.

GROUND your suggestions in real state: call read_inventory / read_shopping_list / read_recent_recipes BEFORE proposing actions if the user's intent depends on stock.

RECIPE SUGGESTIONS — VERY IMPORTANT:
- Pick the RIGHT tool based on what the user actually asked:
    A. OPEN suggestions ("qu'est-ce que je peux faire", "propose-moi", "que cuisiner ce soir", "j'ai envie de quelque chose de léger"):
       → call suggest_recipes_for_context. It returns cookable_now, almost_cookable, verify_suggestions and excluded_suggestions, with structured evidence. Suggest at most 3 candidates; never recommend excluded_suggestions as compatible and never certify verify_suggestions. Explain only actual reason_codes and nutrition coverage; a missing criterion is unavailable.
    B. INGREDIENT-CENTRIC questions ("quelle recette avec des cuisses de poulet", "recettes au paneer", "j'ai du gochujang, que faire", "des idées avec du saumon", "recettes utilisant X"):
       → call suggest_recipes_for_context with { "ingredient": "<the ingredient phrase>" }. It applies the same explicit profile, original lots and personal adaptations as open suggestions.
    C. RECIPE-BY-NAME lookup ("la recette de Bibimbap", "tu as une carbonara"):
       → call search_recipes with the name as query.
- For narrower asks on suggest_recipes_for_context pass context args to the same tool:
    - "rapide", "j'ai 20 minutes" → { "max_prep_time": 20, "goal": "quick" }
    - "ce soir" → { "meal_type": "dinner", "goal": "tonight" }
    - "anti-gaspi", "à finir bientôt" → { "goal": "anti_waste" }
    - "léger", "healthy" → { "goal": "light" } (no health claim in your reply)
    - "protéiné" → { "goal": "high_protein" }
    - "réconfortant" → { "goal": "comfort", "craving": "comfort" }
    - "batch cooking" → { "goal": "batch_cooking" }
    - "une recette italienne" → { "query": "italien" }
    - 4 personnes → { "servings": 4 }
- Only when all relevant tool calls come back empty should you ask the user to import a new recipe or add items to the shopping list.
- DO NOT invent recipes out of thin air. Only propose recipes returned by a tool.
- When you propose recipes, reference them by their exact \`name\` (e.g. « Pâtes carbonara »). The UI surfaces clickable cards from the tool result — do not paste long ingredient lists, keep your reply short and let the cards speak.

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
  /**
   * PRP-223 PR3 — optional existing conversation id to link this turn
   * to. When omitted, the service creates a new conversation via
   * `MemoryService.createConversation`. Backward-compatible: callers
   * that ignore this field simply get a fresh conversation each call.
   */
  conversationId?: string;
  sessionMessages?: AssistantSessionMessage[];
  sessionRevision?: number;
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
    llm_usd: number | null;
    total_usd: number | null;
  };
  model_used: string | null;
  model_receipt?: AssistantModelReceipt;
  actions_unverified?: Array<{ action_id: string; tool: string }>;
  duration_ms: number;
  /** True if this is a 10-minute audio_sha256 replay of a previous session. */
  replayed?: boolean;
  /**
   * PRP-223 PR3 — id of the conversation this turn was recorded into.
   * Optional in the response shape so callers from before PRP-223 keep
   * compiling; absent only when no `MemoryService` is wired into the
   * service (legacy/test paths).
   */
  conversation_id?: string;
  memory_results?: MemoryWriteResult[];
  memory_revision?: number;
  summary_status?: SummaryResult['status'];
  summary_cost_unknown?: boolean;
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
  modelConfig?: AssistantModelConfig;
  model?: string;
  fallbackModel?: string;
  maxToolCalls?: number;
  confirmationTtlMs?: number;
  systemPrompt?: string;
  /** Default undo window for low/medium successful actions. */
  undoWindowMs?: number;
  /**
   * PRP-223 PR3 — optional MemoryService. When present, every turn is
   * recorded into `assistant_conversations` / `assistant_messages` and
   * the response carries `conversation_id`. When absent (legacy tests,
   * standalone smoke), the service stays stateless on the memory side.
   */
  memoryService?: import('./MemoryService.js').MemoryService;
  /**
   * PRP-223 PR4 — optional ContextBuilder. When present, the recent
   * memory + summary + session-context block is injected into the
   * system prompt before the LLM call. Absent ⇒ stateless prompt.
   */
  contextBuilder?: import('./ContextBuilder.js').ContextBuilder;
  /**
   * PRP-223 PR5 — optional MemoryExtractor (rules V1). When present,
   * each user turn is classified and its necessary writes are awaited
   * and session_context. Failures are logged and never block the
   * assistant response.
   */
  memoryExtractor?: import('./MemoryExtractor.js').MemoryExtractor;
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
  private readonly modelConfig: AssistantModelConfig;
  private readonly maxToolCalls: number;
  private readonly undoWindowMs: number;
  private readonly systemPrompt: string;
  private readonly confirmationTtlMs: number;
  /** PRP-223 PR3 — optional memory persistence; null disables conversation logging. */
  private readonly memoryService: import('./MemoryService.js').MemoryService | null;
  /** PRP-223 PR4 — optional ContextBuilder for system prompt enrichment. */
  private readonly contextBuilder: import('./ContextBuilder.js').ContextBuilder | null;
  /** PRP-223 PR5 — optional MemoryExtractor (rules V1). */
  private readonly memoryExtractor: import('./MemoryExtractor.js').MemoryExtractor | null;

  constructor(
    private readonly ai: AICompletionClient,
    private readonly whisper: WhisperClient,
    private readonly toolRegistry: ToolRegistry,
    private readonly handlerRegistry: ToolHandlerRegistry,
    private readonly writer: ActionLogWriter,
    private readonly signer: ConfirmationTokenSigner,
    options: VoiceAgentOptions = {}
  ) {
    const base = options.modelConfig ?? loadAssistantModelConfig();
    this.modelConfig = freezeConfig({ ...base, limits:{...base.limits}, roles:{
      dialogue:{...base.roles.dialogue, ...(options.model ? {model:options.model} : {})},
      culinary:{...base.roles.culinary, ...(options.fallbackModel ? {model:options.fallbackModel} : {})}, summary:{...base.roles.summary},
    } });
    this.maxToolCalls = Math.min(options.maxToolCalls ?? DEFAULT_MAX_TOOL_CALLS,this.modelConfig.limits.maxTools);
    this.confirmationTtlMs = options.confirmationTtlMs ?? DEFAULT_CONFIRMATION_TTL_MS;
    this.undoWindowMs = options.undoWindowMs ?? DEFAULT_UNDO_WINDOW_MS;
    this.systemPrompt = options.systemPrompt ?? AGENT_SYSTEM_PROMPT;
    this.memoryService = options.memoryService ?? null;
    this.contextBuilder = options.contextBuilder ?? null;
    this.memoryExtractor = options.memoryExtractor ?? null;
  }

  // ---- /voice and /text -------------------------------------------

  /**
   * PRP-239 PR4 §10.2 — optional progress sink. When provided, the
   * service fires a callback for each major milestone (tool execution,
   * policy redaction). The `/api/assistant/text/stream` route wires
   * this into an SSE writer; the non-streaming `/text` and `/voice`
   * routes pass `undefined` and stay unchanged.
   */
  async handleRequest(
    input: VoiceAgentRequestInput,
    ctx: ToolExecutionContext,
    onProgress?: (event: AssistantStreamEvent) => void,
  ): Promise<AssistantPlanResponse> {
    if (input.userId !== ctx.userId) throw new VoiceAgentError('INTERNAL','Propriétaire de la requête incohérent.');
    const start = Date.now();
    const sessionId = randomUUID();
    const invocation = new ModelInvocation(sessionId,this.modelConfig,this.ai,start);

    // PRP-223 PR3 — resolve the conversation up-front so the same id is
    // attached to both the input recording and the response. We touch
    // the memory layer only when a MemoryService was injected; legacy
    // tests/setups stay untouched.
    let conversationId: string | undefined;
    let requestPolicy = this.memoryService ? await this.memoryService.readPolicySafe(input.userId) : null;

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
          return this.buildReplayResponse(start, replayed, conversationId);
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
      return this.emptyResponse(start, sessionId, transcript, detectedLanguage, conversationId);
    }

    if (requestPolicy?.saveHistory) conversationId = await this.resolveConversationId(input);

    // Wait for the exact current-input commands before any claim of saving.
    const memoryResults = await this.runExtraction({ userId: input.userId, conversationId,
      text: transcript, source: input.source }, input.clientRequestId, ctx);
    requestPolicy = this.memoryService ? await this.memoryService.readPolicySafe(input.userId) : null;
    if (this.memoryService && conversationId && requestPolicy?.saveHistory) {
      try {
        await this.memoryService.recordMessage(conversationId, input.userId, {
          id: memoryCommandId(input.userId + ':' + conversationId + ':' + input.clientRequestId + ':user'),
          role: 'user', content: transcript, content_format: input.source === 'voice' ? 'transcript' : 'text',
          metadata: { source: input.source, language: detectedLanguage ?? null }, policy: requestPolicy,
        });
      } catch { console.warn('[assistant.memory] user history not saved'); }
    }

    // 2. LLM round 1 with tool catalog
    const tools = this.toolRegistry.toOpenAITools(input.allowedTools);

    // PRP-223 PR4 — enrich the system prompt with the user's memory
    // context (top memories, last summary, recent messages, session
    // context). Best-effort: any ContextBuilder failure leaves the
    // prompt at its baseline.
    let systemContent = this.systemPrompt;
    let allowedProfileVersion:number|undefined;
    let profileSnapshotVersion:number|undefined;
    let contextPolicy: MemoryPolicy | null = null;
    let lastProviderPolicy: MemoryPolicy | null = null;
    if (this.contextBuilder) {
      try {
        const block = await this.contextBuilder.build(input.userId, conversationId);
        contextPolicy = block.policy ?? null;
        profileSnapshotVersion=block.profileVersion;
        if (block.shareProfileWithModel) allowedProfileVersion=block.profileVersion;
        if (block.combinedText) {
          systemContent = `${this.systemPrompt}\n\n--- Mémoire utilisateur ---\n${block.combinedText}`;
        }
      } catch (err) {

        console.error('[assistant.context] build failed.');
      }
    }

    const providerGuard = this.memoryService ? async (messages: AICompletionRequest['messages']) => {
      const current = await this.memoryService!.readPolicySafe(input.userId);
      lastProviderPolicy = current;
      if (sameMemoryPolicy(contextPolicy, current)) return messages;
      // No old tool result, summary, profile detail or context survives a changed
      // revision. The current voluntary question can still be answered.
      allowedProfileVersion = undefined;
      systemContent = this.systemPrompt;
      return [{ role: 'system' as const, content: this.systemPrompt }, { role: 'user' as const, content: transcript }];
    } : undefined;

    const aiMessages: AICompletionRequest['messages'] = [
      { role: 'system', content: systemContent },
      ...(requestPolicy && input.sessionRevision === requestPolicy.revision && !requestPolicy.saveHistory
        ? (input.sessionMessages ?? []).slice(-8).map(m => ({ role: m.role, content: m.content.slice(0,500) })) : []),
      { role: 'user', content: transcript },
    ];

    let ai1: AICompletionResponse;
    try { ai1 = await this.callLLMSafe(invocation, 'dialogue', aiMessages, tools, providerGuard, 'tool_selection'); }
    catch {
      const receipt=invocation.receipt();
      return {session_id:sessionId,transcript,detected_language:detectedLanguage,
        message:'L’assistant n’a pas pu répondre. Les résultats de mémorisation sont affichés séparément.',
        actions_executed:[],actions_pending:[],confirmation_token:null,model_used:null,model_receipt:receipt,
        cost:{whisper_usd:whisperUsd,llm_usd:receipt.llm_usd,total_usd:receipt.llm_usd===null ? null : whisperUsd+receipt.llm_usd},
        duration_ms:Date.now()-start,conversation_id:conversationId,memory_results:memoryResults,memory_revision:requestPolicy?.revision};
    }
    if (this.memoryService && !sameMemoryPolicy(lastProviderPolicy, await this.memoryService.readPolicySafe(input.userId)))
      ai1 = { ...ai1, content: "Vos réglages ont changé pendant cet échange. Relancez votre demande pour utiliser les choix actuels.", tool_calls: [] };
    let repaired = false;
    const outcomes = new Map<string, unknown>();
    const attemptedWrites = new Map<string, string>();
    const unverified: Array<{action_id:string;tool:string}> = [];
    let toolIssue = false;
    let activeResponse = ai1;
    let followupUsed = false;
    let replayPrefix: Array<Record<string,unknown>> = [];
    const continuationFor = (response: AICompletionResponse, role: AssistantRole, policy: MemoryPolicy | null) => {
      const requestedModel=this.modelConfig.roles[role].model;
      const continuation=[...replayPrefix,...(response.continuation ?? [])]
        .filter(item=>item.type!=='reasoning'||response.model===requestedModel)
        .map(item=>({...item}));
      for(const call of response.tool_calls ?? []) {
        // Every output has its corresponding function item, including injected clients.
        if(!continuation.some(item=>item.type==='function_call'&&item.call_id===call.id))
          continuation.push({type:'function_call',call_id:call.id,name:call.name,arguments:call.arguments});
        const value=(outcomes.get(call.id) ?? {status:'not_executed',reason:'tool_limit_or_scope'}) as Record<string,unknown>;
        const result=this.memoryService ? memoryModelToolResult(call.name,value.result,policy) : recommendationModelContext(value.result,allowedProfileVersion) ?? value.result;
        continuation.push({type:'function_call_output',call_id:call.id,output:JSON.stringify({...value,result})});
      }
      return continuation;
    };

    const toolCalls = (ai1.tool_calls ?? []).slice(0, this.maxToolCalls);

    // 3. Execute / plan each tool_call
    const executed: ExecutedActionDescriptor[] = [];
    const pending: PendingActionDescriptor[] = [];

    for (let i = 0; i < toolCalls.length; i++) {
      try { invocation.checkWork(); } catch { toolIssue=true; break; }
      const tc = toolCalls[i];
      if (input.allowedTools && !input.allowedTools.includes(tc.name as ToolName)) { outcomes.set(tc.id,{status:'forbidden_scope'}); toolIssue=true; continue; }
      try { this.toolRegistry.get(tc.name); } catch { outcomes.set(tc.id,{status:'unknown_tool'}); toolIssue=true; continue; }
      const stepSeq = i;

      let parsedArgs: unknown;
      try {
        parsedArgs = this.parseToolArgs(tc);
      } catch (err) {
        if (err instanceof ToolArgsValidationError) {
          outcomes.set(tc.id,{status:'invalid_arguments'});
          if (repaired) { toolIssue=true; break; }
          repaired = true;
          // Round 2 escalation : retry on fallback model with the same
          // user message + a hint about the invalid args (§18 Q4).
          const retryMessages: AICompletionRequest['messages'] = [
            // PRP-223 PR4 — keep the enriched system prompt on retry so
            // the fallback model sees the same memory context.
            { role: 'system', content: systemContent },
            { role: 'user', content: transcript },
            {
              role: 'assistant',
              content:
                `Previous response had invalid args for tool "${err.toolName}": ` +
                err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') +
                '. Please reformat the call carefully.',
            },
          ];
          let ai2: AICompletionResponse;
          try { ai2 = await this.callLLMSafe(invocation, 'culinary', retryMessages, tools.filter(t=>t.function.name===tc.name), providerGuard, 'argument_repair'); }
          catch { toolIssue=true; break; }
          if (this.memoryService && !sameMemoryPolicy(lastProviderPolicy, await this.memoryService.readPolicySafe(input.userId))) {
            activeResponse = { ...ai2, content: 'Vos réglages ont changé pendant cet échange. Relancez votre demande.', tool_calls: [] };
            break;
          }
          activeResponse = ai2;
          // Restart the loop with the retried tool_calls (only the failed
          // step; previously executed steps stay).
          const retriedCalls = (ai2.tool_calls ?? []).filter(call=>call.name===tc.name).slice(0,1);
          if (retriedCalls.length === 0) {
            toolIssue=true;
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

      const writeKey = tc.name + ':' + hashArgs(parsedArgs);
      if (risk.tier !== 'read' && attemptedWrites.has(writeKey)) {
        outcomes.set(tc.id,{status:'already_attempted',action_id:attemptedWrites.get(writeKey)});
        continue;
      }

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
          toolArgs: ['remember_preference','update_response_style','read_user_memories','search_conversation_history'].includes(tc.name)
            ? { memory_command: true } : parsedArgs as Record<string, unknown>,
          riskTier: risk.tier,
          reversible: spec.reversible,
          llmModel: activeResponse.model || null,
        });
      } catch (err) {

        console.error(
          `[assistant.insertPlanned] failed for tool=${tc.name}:`,
          err instanceof Error ? err.name : 'ActionLogError'
        );
        outcomes.set(tc.id,{status:'not_executed',reason:'action_log_unavailable'});
        toolIssue=true;
        continue;
      }

      if (risk.tier !== 'read') attemptedWrites.set(writeKey,planned.id);
      if (planned.replayed) {
        const privateCommand = ['remember_preference','update_response_style','read_user_memories','search_conversation_history'].includes(tc.name);
        if (planned.tool !== tc.name || (!privateCommand && hashArgs(planned.tool_args) !== hashArgs(parsedArgs))) {
          outcomes.set(tc.id,{status:'not_executed',reason:'request_identity_conflict'});
          toolIssue=true;
          continue;
        }
        if (planned.status === 'executed') {
          outcomes.set(tc.id,{status:'executed',action_id:planned.id,result:planned.result,replayed:true});
          executed.push({action_id:planned.id,step_seq:stepSeq,tool:planned.tool,args:parsedArgs as Record<string,unknown>,
            result:planned.result,reversible:Boolean(planned.reversible_action),undo_expires_at:planned.undo_expires_at,risk_tier:planned.risk_tier});
        } else if (planned.status === 'planned' && ['medium','high'].includes(planned.risk_tier)) {
          outcomes.set(tc.id,{status:'awaiting_confirmation',action_id:planned.id});
          pending.push({action_id:planned.id,step_seq:stepSeq,tool:planned.tool,args:parsedArgs as Record<string,unknown>,
            risk_tier:planned.risk_tier,reason:risk.reason ?? defaultReasonForTier(planned.risk_tier)});
        } else if (planned.risk_tier !== 'read') {
          outcomes.set(tc.id,{status:'verification_required',action_id:planned.id});
          unverified.push({action_id:planned.id,tool:planned.tool});
        } else {
          outcomes.set(tc.id,{status:'not_executed',reason:'previous_read_incomplete'});
          toolIssue=true;
        }
        continue;
      }
      if (risk.tier === 'read' || risk.tier === 'low') {
        // Execute immediately
        try {
          const handler = this.handlerRegistry.get(tc.name);

          console.log(`[assistant.handler] executing ${tc.name}`);
          const exec = await handler.execute(
            { ...ctx, commandId: planned.id, sessionId, conversationId, requestText: transcript },
            parsedArgs,
          );
          if(exec.extraCostUsd!==undefined) invocation.addToolCost(planned.id,tc.name,exec.extraCostUsd);
          await this.writer.markExecuted(planned.id, {
            result: ['read_user_memories','search_conversation_history'].includes(tc.name)
              ? { status: 'read', count: Array.isArray((exec.result as Record<string, unknown>)?.memories) ? ((exec.result as Record<string, unknown>).memories as unknown[]).length : 0 }
              : exec.result as Record<string, unknown>,
            reversibleAction: spec.reversible
              ? exec.reversibleAction ?? null
              : undefined,
            undoExpiresAt:
              spec.reversible && exec.reversibleAction
                ? new Date(Date.now() + this.undoWindowMs)
                : null,
            costUsd: exec.extraCostUsd,
          });
          outcomes.set(tc.id,{status:'executed',action_id:planned.id,result:exec.result});
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
          // PRP-239 PR4 §10.2 — stream the tool result as it lands so
          // the UI can render intermediate progress (recipe cards,
          // inventory rows) before the LLM finishes the synthesis.
          onProgress?.({ type: 'tool_result', tool: tc.name, payload: exec.result });
        } catch (err) {
          if (err instanceof ToolHandlerNotFoundError) {
            await this.writer.markFailed(planned.id,'NO_TOOL_HANDLER','Handler indisponible.').catch(()=>undefined);
            outcomes.set(tc.id,{status:'not_executed',reason:'handler_unavailable'});
            toolIssue=true;
            continue;
          }

          console.error(
            `[assistant.handler] ${tc.name} failed:`,
            err instanceof Error ? err.name : 'ToolExecutionError'
          );
          await this.writer.markFailed(planned.id,'EXECUTION_FAILED','Résultat à vérifier.').catch(()=>undefined);
          outcomes.set(tc.id,{status:risk.tier==='read' ? 'failed' : 'verification_required',action_id:planned.id});
          if (risk.tier !== 'read') unverified.push({action_id:planned.id,tool:tc.name});
          else toolIssue=true;
          // Other distinct commands may complete; this command is never replayed blindly.
        }
      } else {
        // medium / high : keep planned, return for confirmation
        outcomes.set(tc.id,{status:'awaiting_confirmation',action_id:planned.id});
        pending.push({
          action_id: planned.id,
          step_seq: stepSeq,
          tool: tc.name,
          args: parsedArgs as Record<string, unknown>,
          risk_tier: risk.tier,
          reason: risk.reason ?? defaultReasonForTier(risk.tier),
        });
      }
      // Responses may select one tool at a time. Permit a bounded follow-up
      // after reads, so inventory → recommendation actually reaches the engine.
      // Once a write was attempted, only the later text synthesis can run.
      if (i===toolCalls.length-1 && !followupUsed && this.modelConfig.roles.dialogue.transport==='responses' &&
          executed.length>0 && executed.every(action=>action.risk_tier==='read') && !pending.length && !unverified.length && !toolIssue &&
          toolCalls.length<this.maxToolCalls && invocation.calls.length<this.modelConfig.limits.maxCalls-1) {
        followupUsed=true;
        const policy=this.memoryService ? await this.memoryService.readPolicySafe(input.userId) : null;
        const continuation=continuationFor(activeResponse,'dialogue',policy);
        const messages:AICompletionRequest['messages']=[
          {role:'system',content:systemContent},{role:'user',content:transcript},
          {role:'user',content:'Les résultats des outils sont fournis. Appelle seulement un outil encore nécessaire pour terminer cette demande, sinon réponds en utilisant ces reçus. Ne répète aucune action.'},
        ];
        try {
          const next=await this.callLLMSafe(invocation,'dialogue',messages,tools,providerGuard,'tool_followup',continuation);
          if(this.memoryService&&!sameMemoryPolicy(lastProviderPolicy,await this.memoryService.readPolicySafe(input.userId))) {toolIssue=true;break;}
          replayPrefix=continuation;
          activeResponse=next;
          toolCalls.push(...(next.tool_calls ?? []).slice(0,this.maxToolCalls-toolCalls.length));
        } catch {toolIssue=true;}
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

    // PRP-239 PR4 §10.3 — recipe-tool detection drives BOTH the round-2
    // chef escalation (gpt-4o + policy prompt) AND the post-check
    // redaction (detectOnly). Hoisting it here so the post-check can
    // run on the final message regardless of whether round-2 fired —
    // QA suite (recipe.002) revealed that a round-1-with-content path
    // could leak "porc" from a recipe description without ever entering
    // the chef branch.
    const chefMode = executed.some((a) => isRecipeTool(a.tool));

    // PRP-224 follow-up — LLM Round 2 synthesis. The Round 1 call often
    // returns only tool_calls and an empty `content`. Without a second
    // round the user just sees "1 action exécutée." which is useless.
    // We feed the executed tool results back to the LLM (as text-encoded
    // assistant + user messages so we don't have to extend the OpenAI
    // client to support the `tool` role) and ask for the final answer
    // in the user's language. `tool_choice='none'` prevents another
    // tool-call hop.
    if (
      executed.length > 0 &&
      pending.length === 0 &&
      (!activeResponse.content || activeResponse.content.trim().length === 0 || executed.some(action=>recommendationModelContext(action.result,allowedProfileVersion)!==null))
    ) {
      try {
        const currentPolicy = this.memoryService ? await this.memoryService.readPolicySafe(input.userId) : null;
        const summaryParts = executed.map(a => {
          const result = this.memoryService ? memoryModelToolResult(a.tool, a.result,
            sameMemoryPolicy(contextPolicy, currentPolicy) ? currentPolicy : null)
            : recommendationModelContext(a.result, allowedProfileVersion) ?? a.result;
          // Tool arguments can contain private preferences. Results are enough.
          return '• ' + a.tool + ' → ' + JSON.stringify(result).slice(0, 1500);
        });

        // PRP-239 PR4 §10.3 — escalate to the quality model when a
        // recipe-centric tool ran. The chef synthesis benefits from
        // gpt-4o's richer reasoning + the explicit policy + structure
        // injected in `chefSystemPrompt`. For non-recipe turns (e.g.
        // shopping list ack, confirmation) we keep gpt-4o-mini.
        // `chefMode` is computed at the outer scope above so the
        // post-check after round-2 can use the same signal.
        // Preserve the old chef baseline for a fair comparison. Candidates only
        // escalate explicitly for a complex menu; ordinary recipes stay economical.
        const synthesisRole: AssistantRole = chefMode && (this.modelConfig.preset === 'baseline' || /batch|menu|plusieurs repas|adapter.*plusieurs/iu.test(transcript)) ? 'culinary' : 'dialogue';
        const continuation = continuationFor(activeResponse,synthesisRole,currentPolicy);
        const currentSystem=executed.some(action=>recommendationProfileChanged(action.result,profileSnapshotVersion)) ? this.systemPrompt : systemContent;
        const synthesisSystem = chefMode
          ? `${currentSystem}\n\n${chefSystemPrompt()}`
          : currentSystem;
        const synthesisInstruction = chefMode
          ? CHEF_ROUND2_INSTRUCTION
          : "Maintenant rédige ta réponse finale, courte et utile, dans la langue de ma question. Appuie-toi sur les résultats ci-dessus, ne ré-invoque pas d'outil.";

        const synthesisMessages: AICompletionRequest['messages'] = [
          { role: 'system', content: synthesisSystem },
          { role: 'user', content: transcript },
          {
            role: 'assistant',
            content:
              `J'ai déjà exécuté ces outils pour répondre :\n${summaryParts.join('\n')}`,
          },
          { role: 'user', content: synthesisInstruction },
        ];

        // PRP-239 PR-C — stream the chef synthesis token-by-token when
        // the caller subscribed to onProgress AND the configured AI
        // client supports completeStream. Falls back to the
        // non-streaming path transparently otherwise (legacy tests,
        // mock clients, /text and /voice routes that don't pass
        // onProgress).
        let synthesis: AICompletionResponse;
        const wantStream = chefMode && Boolean(onProgress) && Boolean(this.ai.completeStream);
        if (wantStream) {
          try {
            synthesis = await this.callLLMStreamSafe(
              invocation, synthesisRole,
              synthesisMessages,
              (delta) => onProgress?.({ type: 'delta', text: delta }),
              providerGuard, continuation,
            );
          } catch (err) {
            // Graceful degradation — if streaming throws (e.g. the
            // injected AICompletionClient doesn't implement
            // completeStream), retry once on the non-streaming path so
            // we never lose the synthesis to a transient stream error.

            console.warn('[assistant.chef.stream] falling back to non-stream.');
            synthesis = await this.callLLMSafe(invocation, synthesisRole, synthesisMessages, [], providerGuard, 'synthesis_fallback', continuation);
          }
        } else {
          synthesis = await this.callLLMSafe(invocation, synthesisRole, synthesisMessages, [], providerGuard, 'synthesis', continuation);
        }
        if (synthesis.content && synthesis.content.trim()) {
          activeResponse = synthesis;
        }

        // Post-check moved out of the round-2 branch (see below) so it
        // fires even when round-2 was skipped because round-1 already
        // returned content.
      } catch (err) {

        console.error('[assistant.synthesis] round 2 failed, falling back.');
      }
    }

    // PRP-239 PR4 §10.4 — deterministic post-check on chef-mode output.
    // detectOnly runs ONLY when a recipe tool fired (`chefMode`), so
    // pedagogical answers like "explique le mirin" on non-recipe turns
    // are not redacted. Hoisted out of the round-2 branch so it ALSO
    // fires when round-1 already produced content (QA suite caught a
    // `Kimchi Jjigae … et du porc.` leak coming straight from a recipe
    // description echoed by the LLM without the chef synthesis).
    if (chefMode && activeResponse.content) {
      const guard = postcheckChefOutput(activeResponse.content);
      if (guard) {
        activeResponse = { ...activeResponse, content: guard.redacted };

        console.warn(
          '[assistant.chef.policy_postcheck_blocked]',
          guard.violations.map((v) => v.ruleId),
        );
        // Surface the redaction event for streaming clients.
        onProgress?.({
          type: 'policy_warning',
          violations: guard.violations,
          action: 'redacted',
        });
      }
    }

    // 5. Build user-facing message
    let message =
      activeResponse.content && activeResponse.content.trim().length > 0
        ? activeResponse.content.trim()
        : synthesizeMessage(executed, pending);

    for (const action of executed) {
      const result = MemoryWriteResultSchema.safeParse(action.result);
      if (result.success && !memoryResults.some(r => r.command_id === result.data.command_id)) memoryResults.push(result.data);
    }
    const memoryOnly = memoryResults.length > 0 && executed.every(a => ['remember_preference','forget_memory','update_response_style'].includes(a.tool)) && pending.length === 0;
    if (memoryOnly) message = memoryResults.map(memoryResultNotice).filter(Boolean).filter((v,i,a) => a.indexOf(v) === i).join(' ');
    if (pending.length) message = synthesizeMessage(executed,pending);
    if (toolIssue) message = 'Une action n’a pas pu être validée sur cette page. '+synthesizeMessage(executed,pending);
    if (unverified.length) message = 'Une action n’a pas pu être confirmée. Vérifie son résultat avant de la répéter. ' + synthesizeMessage(executed,pending);
    let currentAfterProvider = this.memoryService ? await this.memoryService.readPolicySafe(input.userId) : null;
    let canRecordResponse = !this.memoryService || sameMemoryPolicy(lastProviderPolicy, currentAfterProvider);
    if (!canRecordResponse && !memoryOnly) message = 'Vos réglages ou vos souvenirs ont changé pendant cet échange. Relancez votre demande pour utiliser les choix actuels.';

    let summaryResult: SummaryResult = { status: 'disabled', costUsd: 0 };
    if (this.memoryService && conversationId && canRecordResponse && lastProviderPolicy?.saveHistory) {
      summaryResult = await new ConversationSummaryService(this.memoryService, this.ai, invocation)
        .maintain(input.userId, conversationId, lastProviderPolicy);
    }
    // Summary generation is another awaited provider turn. A revocation during
    // it must also suppress the previous context before persistence or streaming.
    if(this.memoryService) {
      currentAfterProvider=await this.memoryService.readPolicySafe(input.userId);
      canRecordResponse=sameMemoryPolicy(lastProviderPolicy,currentAfterProvider);
      if(!canRecordResponse&&!memoryOnly) message='Vos réglages ou vos souvenirs ont changé pendant cet échange. Relancez votre demande pour utiliser les choix actuels.';
    }
    if(onProgress&&message) onProgress({type:'delta',text:message});

    // PRP-223 PR3 — record the assistant turn. Aggregate the action_log
    // ids on the assistant message so the chat history can link back to
    // the audit log. Pending actions are also referenced because they
    // produced log rows in `planned` status.
    //
    // Sprint 2 (recipe-anchor follow-up) — also persist the recipe bucket
    // proposals into metadata.recipe_proposals so reload of historical
    // conversations re-renders the clickable cards instead of losing
    // them when the live response goes out of scope.
    if (this.memoryService && conversationId && canRecordResponse && lastProviderPolicy?.saveHistory) {
      try {
        const actionLogIds = [
          ...executed.map(e => e.action_id),
          ...pending.map(p => p.action_id),
        ];
        const recipeProposals = extractRecipeProposalsFromExecuted(executed);
        const messageMetadata: Record<string, unknown> = {
          model: activeResponse.model || null,
          model_receipt: invocation.receipt(),
        };
        if (recipeProposals) {
          messageMetadata.recipe_proposals = recipeProposals;
        }
        await this.memoryService.recordMessage(conversationId, input.userId, {
          id: memoryCommandId(input.userId + ':' + conversationId + ':' + input.clientRequestId + ':assistant'),
          role: 'assistant',
          content: message,
          policy: lastProviderPolicy!,
          content_format: 'text',
          tool_calls: toolCalls.map(tc => ({ name: tc.name })),
          action_log_ids: actionLogIds,
          metadata: messageMetadata,
        });
      } catch (err) {

        console.error('[assistant.memory] recordMessage(assistant) failed.');
      }
    }

    const modelReceipt = invocation.receipt();
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
          llm_usd: modelReceipt.llm_usd,
        total_usd: modelReceipt.llm_usd === null ? null : whisperUsd + modelReceipt.llm_usd,
      },
      model_used: activeResponse.model || null,
      model_receipt: modelReceipt, actions_unverified: unverified,
      duration_ms: Date.now() - start,
      conversation_id: conversationId,
      memory_results: memoryResults, memory_revision: currentAfterProvider?.revision, summary_status: summaryResult.status, summary_cost_unknown: summaryResult.costUnknown,
    };
  }

  /**
   * PRP-223 PR5 — runs the rules-based MemoryExtractor and writes the
   * candidates via MemoryService. Always best-effort: nothing here can
   * propagate up to the assistant response.
   */
  private async runExtraction(input: import('./MemoryExtractor.js').MemoryExtractionInput,
    requestId: string, ctx: ToolExecutionContext): Promise<MemoryWriteResult[]> {
    if (!this.memoryExtractor || !this.memoryService) return [];
    const receipts: MemoryWriteResult[] = [];
    for (const result of this.memoryExtractor.extract(input)) {
      if (result.kind === 'session') {
        if (input.conversationId) try {
          await this.memoryService.setSessionContext(input.userId, result.candidate.key, result.candidate.value,
            new Date(Date.now() + result.candidate.ttlMs), { conversationId: input.conversationId });
        } catch { /* the current utterance still supplies the temporary request */ }
        continue;
      }
      const candidate = result.candidate;
      const commandId = memoryCommandId(input.userId + ':' + requestId + ':' + candidate.fact.semanticSubject);
      try {
        receipts.push(await this.memoryService.saveExtractedFact(input.userId, commandId, candidate.content,
          candidate.kind, candidate.source, ctx.userClient as SupabaseClient<Database>, input.source === 'voice' ? 'voice' : 'text'));
      } catch {
        receipts.push({ command_id: commandId, operation: 'save', status: 'not_saved', memory_id: null,
          version: null, destination: candidate.fact.destination, policy_revision: 0, profile_version: null, reason: 'permissions_or_write_unavailable' });
      }
    }
    return receipts;
  }

  /**
   * PRP-223 PR3 — fetches/creates the conversation. If the input carries
   * a `conversationId`, we verify it belongs to the user via
   * `MemoryService.getConversation`; on cross-user or missing row we
   * fall back to a fresh conversation (rather than throwing, to keep
   * the assistant available).
   */
  private async resolveConversationId(input: VoiceAgentRequestInput): Promise<string | undefined> {
    if (!this.memoryService) return undefined;
    if (input.conversationId) {
      try {
        const existing = await this.memoryService.getConversation(input.conversationId, input.userId);
        if (existing.status !== 'deleted') return existing.id;
      } catch (err) {

        console.warn('[assistant.memory] getConversation failed, opening new one.');
      }
    }
    try {
      const created = await this.memoryService.createConversation(input.userId, {
        mode: 'general',
      });
      return created.id;
    } catch (err) {

      console.error('[assistant.memory] createConversation failed.');
      return undefined;
    }
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
        const exec = (await handler.execute(
          { ...ctx, commandId: row.id, sessionId: row.session_id },
          row.tool_args
        )) as ToolExecutionResult;
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
    try {
      const outcome = await performUndo(
        ctx,
        input.actionId,
        this.writer,
        this.handlerRegistry
      );
      return { undone: outcome.undone, result: outcome.result };
    } catch (err) {
      if (err instanceof UndoFailedError) {
        const code: VoiceAgentError['code'] =
          err.code === 'NOT_FOUND'
            ? 'UNDO_NOT_FOUND'
            : err.code === 'NOT_REVERSIBLE'
              ? 'UNDO_NOT_REVERSIBLE'
              : err.code === 'EXPIRED'
                ? 'UNDO_EXPIRED'
                : err.code === 'HANDLER_MISSING'
                  ? 'UNDO_HANDLER_MISSING'
                  : 'INTERNAL';
        throw new VoiceAgentError(code, err.message);
      }
      throw err;
    }
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
        },
      ]);
    }
    return this.toolRegistry.parseArgs(tc.name, raw);
  }

  private async callLLMSafe(
    invocation: ModelInvocation, role: AssistantRole,
    messages: AICompletionRequest['messages'], tools: AICompletionRequest['tools'],
    guard?: (messages: AICompletionRequest['messages']) => Promise<AICompletionRequest['messages']>,
    purpose = 'synthesis', continuation: Array<Record<string,unknown>> = [],
  ): Promise<AICompletionResponse> {
    const safe = guard ? await guard(messages) : messages;
    try {
      return await invocation.complete(role,{messages:safe,temperature:0.2,tools,tool_choice:tools?.length ? 'auto' : 'none',
        ...(safe === messages && invocation.config.roles[role].transport === 'responses' ? {continuation} : {})},purpose);
    } catch { throw new VoiceAgentError('LLM_FAILED','Appel du modèle indisponible ou limite atteinte.'); }
  }
  private async callLLMStreamSafe(
    invocation: ModelInvocation, role: AssistantRole, messages: AICompletionRequest['messages'],
    _onDelta: (text:string)=>void,
    guard?: (messages: AICompletionRequest['messages']) => Promise<AICompletionRequest['messages']>,
    continuation: Array<Record<string,unknown>> = [],
  ): Promise<AICompletionResponse> {
    const safe=guard ? await guard(messages) : messages;
    return invocation.complete(role,{messages:safe,temperature:0.2,
      ...(safe === messages && invocation.config.roles[role].transport === 'responses' ? {continuation} : {})},'synthesis_stream',true);
  }

  private buildReplayResponse(
    start: number,
    row: ActionLogRow,
    conversationId?: string,
  ): AssistantPlanResponse {
    return {
      session_id: row.session_id,
      transcript: '',
      message: 'Action déjà exécutée (réplique audio détectée).',
      actions_executed: [],
      actions_pending: [],
      confirmation_token: null,
      cost: { whisper_usd: 0, llm_usd: 0, total_usd: 0 },
      model_used: null,
      duration_ms: Date.now() - start,
      replayed: true,
      conversation_id: conversationId,
    };
  }

  private emptyResponse(
    start: number,
    sessionId: string,
    transcript: string,
    detectedLanguage?: string,
    conversationId?: string,
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
      model_used: null,
      duration_ms: Date.now() - start,
      conversation_id: conversationId,
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

interface RecipeProposalsBuckets {
  cookable_now: unknown[];
  almost_cookable: unknown[];
  recent_suggestions: unknown[];
  verify_suggestions?:unknown[];excluded_suggestions?:unknown[];pipeline_version?:number;profile_version?:number;calculated_at?:string;
  /**
   * PRP-226 PR4 — id of the `recommendation_events` row this proposal
   * was emitted from. The frontend echoes it on every interaction
   * (« cuisinée », « planifier », « ajouter les manquants ») so the
   * audit log links each action back to its originating recommendation.
   * Absent when the LLM only called legacy single-bucket tools.
   */
  event_id?: string;
}

const LEGACY_RECIPE_TOOLS = new Set<string>([
  'find_cookable_recipes',
  'search_recipes',
  'find_recipes_using_ingredient',
  'read_recent_recipes',
]);

/**
 * Pull the 3-bucket recipe proposals from the executed tool calls so we
 * can stash them in `assistant_messages.metadata.recipe_proposals`. The
 * frontend then re-hydrates the clickable cards on history reload
 * instead of losing them when the live response goes out of scope.
 *
 * Returns null when no recipe tool ran on this turn.
 */
export function extractRecipeProposalsFromExecuted(
  executed: ExecutedActionDescriptor[]
): RecipeProposalsBuckets | null {
  const buckets: RecipeProposalsBuckets = {
    cookable_now: [],
    almost_cookable: [],
    recent_suggestions: [],verify_suggestions:[],excluded_suggestions:[],
  };
  const seen = new Set<string>();
  let hadAnyRecipeTool = false;

  const pushUnique = (target: unknown[], list: unknown[]) => {
    for (const r of list) {
      if (!r || typeof r !== 'object') continue;
      const id = (r as { id?: unknown }).id;
      const name = (r as { name?: unknown }).name;
      if (typeof id !== 'string' || typeof name !== 'string') continue;
      if (seen.has(id)) continue;
      seen.add(id);
      target.push(r);
    }
  };

  // Primary: suggest_recipes_for_context returns the 3 buckets directly.
  for (const a of executed) {
    if (a.tool !== 'suggest_recipes_for_context') continue;
    hadAnyRecipeTool = true;
    const result = a.result as
      | (Partial<RecipeProposalsBuckets> & { event_id?: unknown })
      | undefined;
    if (!result || typeof result !== 'object') continue;
    if (Array.isArray(result.cookable_now)) pushUnique(buckets.cookable_now, result.cookable_now);
    if (Array.isArray(result.almost_cookable)) pushUnique(buckets.almost_cookable, result.almost_cookable);
    if (Array.isArray(result.recent_suggestions)) pushUnique(buckets.recent_suggestions, result.recent_suggestions);
    if (Array.isArray(result.verify_suggestions)) pushUnique(buckets.verify_suggestions!,result.verify_suggestions);
    if (Array.isArray(result.excluded_suggestions)) pushUnique(buckets.excluded_suggestions!,result.excluded_suggestions);
    if (typeof result.pipeline_version==='number') buckets.pipeline_version=result.pipeline_version;
    if (typeof result.profile_version==='number') buckets.profile_version=result.profile_version;
    if (typeof result.calculated_at==='string') buckets.calculated_at=result.calculated_at;
    // PRP-226 PR4 — capture the originating event id (first non-empty
    // wins, since a single turn rarely calls the tool twice).
    if (!buckets.event_id && typeof result.event_id === 'string' && result.event_id.length > 0) {
      buckets.event_id = result.event_id;
    }
  }

  // Fallback: legacy single-bucket tools (find_cookable_recipes etc.).
  for (const a of executed) {
    if (!LEGACY_RECIPE_TOOLS.has(a.tool)) continue;
    hadAnyRecipeTool = true;
    const result = a.result as { recipes?: unknown } | undefined;
    if (!result || typeof result !== 'object') continue;
    const list = result.recipes;
    if (!Array.isArray(list)) continue;
    if (a.tool === 'find_cookable_recipes') {
      // Bucket by cookability score when the field is present.
      const cookable: unknown[] = [];
      const almost: unknown[] = [];
      for (const r of list) {
        if (!r || typeof r !== 'object') continue;
        const score =
          ((r as { missing_count?: number }).missing_count ?? 0) +
          ((r as { unlinked_count?: number }).unlinked_count ?? 0);
        if (score === 0) cookable.push(r);
        else almost.push(r);
      }
      pushUnique(buckets.cookable_now, cookable);
      pushUnique(buckets.almost_cookable, almost);
    } else {
      pushUnique(buckets.recent_suggestions, list);
    }
  }

  if (!hadAnyRecipeTool) return null;
  if (
    buckets.cookable_now.length === 0 &&
    buckets.almost_cookable.length === 0 &&
    buckets.recent_suggestions.length === 0
  ) {
    return null;
  }
  return buckets;
}

function memoryCommandId(value: string): string {
  const hex = createHash('sha256').update(value).digest('hex').slice(0, 32);
  return hex.slice(0,8) + '-' + hex.slice(8,12) + '-4' + hex.slice(13,16) + '-8' + hex.slice(17,20) + '-' + hex.slice(20);
}
function memoryResultNotice(result: MemoryWriteResult): string {
  if (result.status === 'verification_required') return 'Enregistrement à vérifier dans Ma mémoire. Réessayez avec la même commande après vérification.';
  if (result.status === 'disabled') return 'La mémoire est désactivée. Vous pouvez l’activer dans Réglages → Ma mémoire.';
  if (result.status === 'awaiting_confirmation') return result.destination === 'profile'
    ? 'Proposition enregistrée. Confirmez le changement dans Ma mémoire ou dans votre profil alimentaire.'
    : 'Préférence proposée dans Ma mémoire, à confirmer.';
  if (result.status === 'not_saved') return 'La préférence n’a pas été enregistrée. Votre demande reste utilisable pour cet échange.';
  if (result.operation === 'forget') return result.destination === 'profile'
    ? 'Référence oubliée. Le réglage confirmé reste dans votre profil alimentaire.' : 'Souvenir oublié.';
  if (result.operation === 'reject') return 'Proposition rejetée.';
  return result.destination === 'profile' ? 'Profil alimentaire mis à jour.' : result.operation === 'correct' ? 'Souvenir corrigé.' : 'Préférence retenue.';
}
