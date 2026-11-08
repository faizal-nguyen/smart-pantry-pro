/**
 * PRP-221 J4 — VoiceAgentService.
 *
 * Synchronous orchestrator for /api/assistant/voice + /text + /confirm
 * + /undo. Pure logic; HTTP wiring lives in J5.
 *
 * Flow (per /voice or /text request) :
 *   1. (voice) transcribe (SpeechTranscriber; the app now dictates via
 *      /transcribe and sends the corrected text to /text)
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
import { calendarDate, calendarWeekStart, memoryHistoryFloor, MemoryWriteResultSchema, withinMemoryHistory, type MemoryPolicy, type MemoryWriteResult, type AssistantSessionMessage } from '@smart/shared';
import { recipeWordsMatched } from './handlers/read.js';
import { StockCommandError } from '../stock/StockCommandService.js';
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
import type { SpeechTranscriber } from '../media/SpeechTranscriber.js';
import type { RiskTier } from './schemas/tools.js';
import type { AssistantModelReceipt, AssistantRole } from '@smart/shared';
import { loadAssistantModelConfig, freezeConfig, type AssistantModelConfig } from '../ai/ModelConfig.js';
import { ModelInvocation } from '../ai/ModelInvocation.js';
import { providerErrorSummary } from '../ai/OpenAITransport.js';

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
In French, always use « tu » (Tutoie toujours l'utilisateur), never « vous ».

You help manage their inventory, shopping list, recipes, and meal plan via tool calls.

GROUND your suggestions in real state: call read_inventory / read_shopping_list / read_recent_recipes BEFORE suggesting recipes or purchases that depend on stock.
DIRECT COMMANDS are not suggestions:
- Adding by name (« ajoute du lait », « mets des œufs sur ma liste ») → call add_inventory_items / add_shopping_items directly, without reading first.
- A recipe command (« j’ai cuisiné X », « mets X au menu demain soir », « supprime la recette X ») needs the recipe id: first call search_recipes with { "query": "<X>" } (it tolerates typos), then cook_recipe / add_recipe_to_meal_plan / delete_recipe with the id from that result. If several recipes match, ask_clarification with their names; if none matches, say so.
- Acting on something already there (« j’ai utilisé / mangé / jeté 200 g de riz », « retire le lait de ma liste », « coche le pain », « corrige la date du yaourt ») needs that row's id: first call read_inventory with { "search": "<product>" } or read_shopping_list with { "search": "<item>" }, then call consume_inventory_items / update_inventory_item / remove_shopping_items / mark_shopping_items_bought with the id from that result. Never invent an id; if several rows match and the user did not say which, ask_clarification.
In read_inventory results, expired: true means already past its date: say « périmé depuis le … », never « expire le … ».

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
    - "végétarien", "sans viande" → { "dietary_flag": "vegetarien" }
    - "sans crème", "pas de champignons" → { "exclude_ingredients": ["crème"] } (this request only). A follow-up like « Et sans crème ? » refines the previous ask: call the tool again with the earlier ingredient and context args plus the new exclusion.
- Only when all relevant tool calls come back empty should you ask the user to import a new recipe or add items to the shopping list.
- DO NOT invent recipes out of thin air. Only propose recipes returned by a tool.
- When you propose recipes, reference them by their exact \`name\` (e.g. « Pâtes carbonara »). The UI surfaces clickable cards from the tool result — do not paste long ingredient lists, keep your reply short and let the cards speak.

Be precise:
- never invent products, quantities, or recipes the user did not mention
- when the user mentions an item that may match several inventory rows, call ask_clarification
- adding to the inventory or the shopping list never depends on current stock: call add_inventory_items / add_shopping_items directly, even when the inventory is empty
- product names go to tools as plain text ("tomate", "yaourt grec") — the server resolves them to IDs

Format the final assistant message in the user's language (FR if FR, EN if EN). Keep it short, confirm what was done, ask only what's strictly necessary.

If the request requires no action (e.g. casual chat), just answer in plain text without calling tools.`;

// ---- Public API shapes -----------------------------------------------

export interface VoiceAgentRequestInput {
  source: 'voice' | 'text';
  audioPath?: string;
  audioSha256?: string;
  /** Browser-measured duration; only an estimated cost when the provider reports none. */
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
  /** Names of the rows the action targets, from this turn's reads (display only). */
  labels?: Record<string, string>;
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
  /** Names of the rows the action targets, from this turn's reads (display only). */
  labels?: Record<string, string>;
  /** What the action will do on the data as it is now, from its handler's preview (display only). */
  details?: string[];
  risk_tier: RiskTier;
  reason: string;
}

export interface AssistantPlanResponse {
  session_id: string;
  transcript: string;
  detected_language?: string;
  message: string;
  /** Answers the user can tap when the reply asks which recipe (or a clarification). */
  choices?: Array<{ label: string; reply: string }>;
  actions_executed: ExecutedActionDescriptor[];
  actions_pending: PendingActionDescriptor[];
  confirmation_token: string | null;
  cost: {
    /** Historical name kept for compatibility: transcription cost, 0 for text. */
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
  /** Revision of the last revocation: session turns sent from this revision on stay admitted. */
  history_floor?: number;
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
  /** Clock for the date given to the model (tests). */
  now?: () => Date;
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
      | 'INVALID_ITEMS'
      | 'REQUEST_CONFLICT'
      | 'ACTION_UNVERIFIED'
      | 'EXECUTION_FAILED'
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
  private readonly now: () => Date;
  private readonly confirmationTtlMs: number;
  /** PRP-223 PR3 — optional memory persistence; null disables conversation logging. */
  private readonly memoryService: import('./MemoryService.js').MemoryService | null;
  /** PRP-223 PR4 — optional ContextBuilder for system prompt enrichment. */
  private readonly contextBuilder: import('./ContextBuilder.js').ContextBuilder | null;
  /** PRP-223 PR5 — optional MemoryExtractor (rules V1). */
  private readonly memoryExtractor: import('./MemoryExtractor.js').MemoryExtractor | null;

  constructor(
    private readonly ai: AICompletionClient,
    private readonly transcriber: SpeechTranscriber,
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
      vision:{...base.roles.vision},
    } });
    this.maxToolCalls = Math.min(options.maxToolCalls ?? DEFAULT_MAX_TOOL_CALLS,this.modelConfig.limits.maxTools);
    this.confirmationTtlMs = options.confirmationTtlMs ?? DEFAULT_CONFIRMATION_TTL_MS;
    this.undoWindowMs = options.undoWindowMs ?? DEFAULT_UNDO_WINDOW_MS;
    this.systemPrompt = options.systemPrompt ?? AGENT_SYSTEM_PROMPT;
    this.now = options.now ?? (() => new Date());
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
  /** A preview that cannot be computed leaves the action to confirm without details. */
  private async previewPending(tool: string, args: unknown, ctx: ToolExecutionContext): Promise<string[] | undefined> {
    if (!this.handlerRegistry.has(tool)) return undefined;
    const handler = this.handlerRegistry.get(tool);
    if (!handler.preview) return undefined;
    try {
      const lines = await handler.preview(ctx, args);
      return lines.length ? lines : undefined;
    } catch (err) {
      console.warn(`[assistant.preview] ${tool} failed:`, err instanceof Error ? err.name : 'PreviewError');
      return undefined;
    }
  }

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

    // 1. Transcript: transcribed for voice, raw text otherwise.
    let transcript = '';
    let detectedLanguage: string | undefined;
    let transcriptionUsd: number | null = 0;

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
        const transcribed = await this.transcriber.transcribe({
          audioPath: input.audioPath,
          languages: input.language ? [input.language] : undefined,
          clientDurationSeconds: input.audioDurationSeconds,
        });
        transcript = transcribed.text;
        detectedLanguage = transcribed.languages[0];
        transcriptionUsd = transcribed.cost.usd;
      } catch (err) {
        throw new VoiceAgentError(
          'TRANSCRIPTION_FAILED',
          err instanceof Error ? err.message : 'Transcription failed'
        );
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
    // A scope of reads only (the « Aide » window) can change nothing: the model
    // must say so and point to the conversations page, never offer the change.
    const readOnly = tools.every(tool => tool.function.name === 'ask_clarification' || this.toolRegistry.get(tool.function.name).defaultRiskTier === 'read');
    // Without today's date the model invents a week for « demain soir » (audit 2026-11-07).
    const basePrompt = `${readOnly ? `${this.systemPrompt}\n\n${READ_ONLY_SCOPE}` : this.systemPrompt}\n\n${todayContext(this.now())}`;

    // PRP-223 PR4 — enrich the system prompt with the user's memory
    // context (top memories, last summary, recent messages, session
    // context). Best-effort: any ContextBuilder failure leaves the
    // prompt at its baseline.
    let systemContent = basePrompt;
    let recentMessagesText = '';
    let allowedProfileVersion:number|undefined;
    let profileSnapshotVersion:number|undefined;
    let contextPolicy: MemoryPolicy | null = null;
    let lastProviderPolicy: MemoryPolicy | null = null;
    if (this.contextBuilder) {
      try {
        const block = await this.contextBuilder.build(input.userId, conversationId);
        contextPolicy = block.policy ?? null;
        recentMessagesText = block.recentMessagesText ?? '';
        profileSnapshotVersion=block.profileVersion;
        if (block.shareProfileWithModel) allowedProfileVersion=block.profileVersion;
        if (block.combinedText) {
          systemContent = `${basePrompt}\n\n--- Mémoire utilisateur ---\n${block.combinedText}`;
        }
      } catch (err) {

        console.error('[assistant.context] build failed.');
      }
    }

    // Session turns were admitted under requestPolicy, stored context under
    // contextPolicy. An empty context block (no policy) holds nothing to
    // revoke, so it must not discard the session turns or tool results.
    const stillAdmitted = (current: MemoryPolicy | null) =>
      sameMemoryPolicy(requestPolicy, current) && (!contextPolicy || sameMemoryPolicy(contextPolicy, current));
    const providerGuard = this.memoryService ? async (messages: AICompletionRequest['messages']) => {
      const current = await this.memoryService!.readPolicySafe(input.userId);
      lastProviderPolicy = current;
      if (stillAdmitted(current)) return messages;
      // No old tool result, summary, profile detail or context survives a changed
      // revision. The current voluntary question can still be answered.
      allowedProfileVersion = undefined;
      systemContent = basePrompt;
      return [{ role: 'system' as const, content: basePrompt }, { role: 'user' as const, content: transcript }];
    } : undefined;

    // A memory saved by this or an earlier turn does not end the session; a revocation does.
    const sessionTurns: AICompletionRequest['messages'] = requestPolicy && withinMemoryHistory(requestPolicy, input.sessionRevision) && !requestPolicy.saveHistory
      ? (input.sessionMessages ?? []).slice(-8).map(m => ({ role: m.role, content: m.content.slice(0,500) })) : [];
    const aiMessages: AICompletionRequest['messages'] = [
      { role: 'system', content: systemContent },
      ...sessionTurns,
      { role: 'user', content: transcript },
    ];

    let ai1: AICompletionResponse;
    try { ai1 = await this.callLLMSafe(invocation, 'dialogue', aiMessages, tools, providerGuard, 'tool_selection'); }
    catch {
      const receipt=invocation.receipt();
      return {session_id:sessionId,transcript,detected_language:detectedLanguage,
        message:'L’assistant n’a pas pu répondre. Les résultats de mémorisation sont affichés séparément.',
        actions_executed:[],actions_pending:[],confirmation_token:null,model_used:null,model_receipt:receipt,
        cost:{whisper_usd:transcriptionUsd ?? 0,llm_usd:receipt.llm_usd,total_usd:receipt.llm_usd===null || transcriptionUsd===null ? null : transcriptionUsd+receipt.llm_usd},
        duration_ms:Date.now()-start,conversation_id:conversationId,memory_results:memoryResults,memory_revision:requestPolicy?.revision,history_floor:requestPolicy ? memoryHistoryFloor(requestPolicy) : undefined};
    }
    if (this.memoryService && !sameMemoryPolicy(lastProviderPolicy, await this.memoryService.readPolicySafe(input.userId)))
      ai1 = { ...ai1, content: "Tes réglages ont changé pendant cet échange. Relance ta demande pour utiliser tes choix actuels.", tool_calls: [] };
    let repaired = false;
    const outcomes = new Map<string, unknown>();
    const attemptedWrites = new Map<string, string>();
    const unverified: Array<{action_id:string;tool:string}> = [];
    let toolIssue = false;
    let activeResponse = ai1;
    let followupUsed = false;
    let replayPrefix: Array<Record<string,unknown>> = [];
    // What the model may see of a tool call's outcome under the current policy.
    const modelOutcome = (call: { id: string; name: string }, policy: MemoryPolicy | null) => {
      const value=(outcomes.get(call.id) ?? {status:'not_executed',reason:'tool_limit_or_scope'}) as Record<string,unknown>;
      const result=this.memoryService ? memoryModelToolResult(call.name,value.result,policy) : recommendationModelContext(value.result,allowedProfileVersion) ?? value.result;
      return {...value,result};
    };
    const continuationFor = (response: AICompletionResponse, role: AssistantRole, policy: MemoryPolicy | null) => {
      const requestedModel=this.modelConfig.roles[role].model;
      const continuation=[...replayPrefix,...(response.continuation ?? [])]
        .filter(item=>item.type!=='reasoning'||response.model===requestedModel)
        .map(item=>({...item}));
      for(const call of response.tool_calls ?? []) {
        // Every output has its corresponding function item, including injected clients.
        if(!continuation.some(item=>item.type==='function_call'&&item.call_id===call.id))
          continuation.push({type:'function_call',call_id:call.id,name:call.name,arguments:call.arguments});
        continuation.push({type:'function_call_output',call_id:call.id,output:JSON.stringify(modelOutcome(call,policy))});
      }
      return continuation;
    };

    // The same recipe action on several recipes means the model could not choose.
    let ambiguousRecipes: AmbiguousRecipes | null = null;
    const firstCalls = keepUnambiguousRecipeWrites(ai1.tool_calls ?? [], new Map(), transcript);
    ambiguousRecipes = firstCalls.ambiguous ?? ambiguousRecipes;
    const toolCalls = firstCalls.kept.slice(0, this.maxToolCalls);

    // 3. Execute / plan each tool_call
    const executed: ExecutedActionDescriptor[] = [];
    const pending: PendingActionDescriptor[] = [];
    // Recipe ids not read this turn are checked against the user's library (iPhone
    // 2026-11-07 22:48: an invented id reached Confirmer and failed).
    const resolvedRecipeNames = new Map<string, string>();
    let recipeNotFound = false;
    let library: Promise<RecipeName[] | null> | null = null;
    const loadLibrary = () => (library ??= loadRecipeLibrary(ctx));

    for (let i = 0; i < toolCalls.length; i++) {
      try { invocation.checkWork(); } catch { toolIssue=true; break; }
      let tc = toolCalls[i];
      if (input.allowedTools && !input.allowedTools.includes(tc.name as ToolName)) { outcomes.set(tc.id,{status:'forbidden_scope'}); toolIssue=true; continue; }
      try { this.toolRegistry.get(tc.name); } catch { outcomes.set(tc.id,{status:'unknown_tool'}); toolIssue=true; continue; }
      if (tc.name in RECIPE_WRITES) {
        const resolution = await resolveRecipeWrite(tc.name, tc.arguments, transcript, recipeNames(executed), loadLibrary);
        for (const [id, name] of resolution.names) resolvedRecipeNames.set(id, name);
        if (resolution.ambiguous) { ambiguousRecipes ??= resolution.ambiguous; outcomes.set(tc.id,{status:'not_executed',reason:'ambiguous_recipe'}); continue; }
        if (resolution.notFound) { recipeNotFound = true; outcomes.set(tc.id,{status:'not_executed',reason:'recipe_not_found'}); continue; }
        if (resolution.arguments !== tc.arguments) { tc = { ...tc, arguments: resolution.arguments }; toolCalls[i] = tc; }
      }
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
            ...sessionTurns,
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
          // Reformatting JSON needs no culinary model.
          try { ai2 = await this.callLLMSafe(invocation, 'dialogue', retryMessages, tools.filter(t=>t.function.name===tc.name), providerGuard, 'argument_repair'); }
          catch { toolIssue=true; break; }
          if (this.memoryService && !sameMemoryPolicy(lastProviderPolicy, await this.memoryService.readPolicySafe(input.userId))) {
            activeResponse = { ...ai2, content: 'Tes réglages ont changé pendant cet échange. Relance ta demande.', tool_calls: [] };
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
          const details = await this.previewPending(planned.tool,parsedArgs,ctx);
          pending.push({action_id:planned.id,step_seq:stepSeq,tool:planned.tool,args:parsedArgs as Record<string,unknown>,
            ...(details ? {details} : {}),risk_tier:planned.risk_tier,reason:risk.reason ?? defaultReasonForTier(planned.risk_tier,planned.tool)});
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
        const details = await this.previewPending(tc.name,parsedArgs,ctx);
        pending.push({
          action_id: planned.id,
          step_seq: stepSeq,
          tool: tc.name,
          args: parsedArgs as Record<string, unknown>,
          ...(details ? { details } : {}),
          risk_tier: risk.tier,
          reason: risk.reason ?? defaultReasonForTier(risk.tier, tc.name),
        });
      }
      // Permit one bounded follow-up after reads, so read → write ("ajoute…"
      // after read_inventory) and inventory → recommendation finish in one
      // turn. Chat Completions gets the receipts as text and skips the hop
      // after a recipe tool, whose synthesis already runs.
      // Once a write was attempted, only the later text synthesis can run.
      const chatTransport=this.modelConfig.roles.dialogue.transport!=='responses';
      // « J'ai cuisiné les carbonara » needs the recipe id read here to call cook_recipe; so does
      // « le Lamb Biryani » answering our « Laquelle as-tu cuisinée ? » (live repro 2026-11-08).
      if (i===toolCalls.length-1 && !followupUsed && (!chatTransport || !executed.some(action=>isRecipeTool(action.tool)) || RECIPE_ACTION.test(transcript)
          || answersRecipeQuestion(sessionTurns, recentMessagesText)) &&
          executed.length>0 && executed.every(action=>action.risk_tier==='read') && !pending.length && !unverified.length && !toolIssue &&
          toolCalls.length<this.maxToolCalls && invocation.calls.length<this.modelConfig.limits.maxCalls-1) {
        followupUsed=true;
        const policy=this.memoryService ? await this.memoryService.readPolicySafe(input.userId) : null;
        const continuation=continuationFor(activeResponse,'dialogue',policy);
        const receipts=(activeResponse.tool_calls ?? []).map(call=>'• '+call.name+' → '+JSON.stringify(compactForModel(modelOutcome(call,policy))).slice(0,MODEL_RESULT_CHARS));
        const messages:AICompletionRequest['messages']=[
          {role:'system',content:systemContent},...aiMessages.slice(1),
          ...(chatTransport ? [{role:'assistant' as const,content:`J'ai déjà exécuté ces outils :\n${receipts.join('\n')}`}] : []),
          {role:'user',content:'Les résultats des outils sont fournis. Appelle seulement un outil encore nécessaire pour terminer cette demande, sinon réponds en utilisant ces reçus. Ne répète aucune action.'},
        ];
        // The hop exists to act on what was read: offer writes, clarification
        // and the recipe engine (inventory → recommendation), never a tool that
        // already ran nor another plain read, which would spend the hop the
        // requested write needs (prod log 2026-11-04: a second read_inventory
        // at 18:45, read_shopping_list at 19:50).
        const followupTools=tools.filter(tool=>{
          const name=tool.function.name;
          if(executed.some(action=>action.tool===name)) return false;
          return this.toolRegistry.get(name).defaultRiskTier!=='read' || isRecipeTool(name);
        });
        try {
          const next=await this.callLLMSafe(invocation,'dialogue',messages,followupTools,providerGuard,'tool_followup',continuation);
          if(this.memoryService&&!sameMemoryPolicy(lastProviderPolicy,await this.memoryService.readPolicySafe(input.userId))) {toolIssue=true;break;}
          replayPrefix=continuation;
          activeResponse=next;
          const nextCalls=keepUnambiguousRecipeWrites(next.tool_calls ?? [],recipeNames(executed),transcript);
          ambiguousRecipes=nextCalls.ambiguous ?? ambiguousRecipes;
          toolCalls.push(...nextCalls.kept.slice(0,this.maxToolCalls-toolCalls.length));
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
            stillAdmitted(currentPolicy) ? currentPolicy : null)
            : recommendationModelContext(a.result, allowedProfileVersion) ?? a.result;
          // Tool arguments can contain private preferences. Results are enough.
          return '• ' + a.tool + ' → ' + JSON.stringify(compactForModel(result)).slice(0, MODEL_RESULT_CHARS);
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
        const currentSystem=executed.some(action=>recommendationProfileChanged(action.result,profileSnapshotVersion)) ? basePrompt : systemContent;
        const synthesisSystem = chefMode
          ? `${currentSystem}\n\n${chefSystemPrompt()}`
          : currentSystem;
        const synthesisInstruction = chefMode
          ? CHEF_ROUND2_INSTRUCTION
          : "Maintenant rédige ta réponse finale, courte et utile, dans la langue de ma question. Appuie-toi sur les résultats ci-dessus, ne ré-invoque pas d'outil.";

        const synthesisMessages: AICompletionRequest['messages'] = [
          { role: 'system', content: synthesisSystem },
          // Without the earlier turns « Et sans crème ? » is answered as a new question.
          ...sessionTurns,
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
    // iPhone 2026-11-07: « j'ai cuisiné byriani » prepared cook_recipe on all 5 biryani.
    const knownRecipes = new Map([...recipeNames(executed), ...resolvedRecipeNames]);
    if (ambiguousRecipes && !pending.length) message = ambiguityQuestion(ambiguousRecipes, knownRecipes);
    else if (recipeNotFound && !pending.length && !executed.some(action => action.risk_tier !== 'read'))
      message = 'Je n’ai pas retrouvé cette recette dans ta bibliothèque : je n’ai rien changé. Redis son nom tel qu’il apparaît dans Recettes.';
    const choices = ambiguousRecipes && !pending.length ? recipeChoices(ambiguousRecipes, knownRecipes, transcript) : clarificationChoices(executed);
    if (toolIssue) {
      const statuses = [...outcomes.values()].map(outcome => (outcome as { status?: string; reason?: string } | null));
      const outOfScope = statuses.some(outcome => outcome?.status === 'forbidden_scope');
      const unavailable = statuses.some(outcome => outcome?.status === 'unknown_tool' || outcome?.reason === 'handler_unavailable');
      const changed = executed.some(action => action.risk_tier !== 'read') || pending.length > 0;
      message = (outOfScope ? 'Une action n’est pas disponible sur cette page'
        : unavailable ? 'Cette action n’est pas encore disponible' : 'Une action n’a pas pu être préparée')
        // Worded so the change-claim guard below does not read « a été modifié ».
        + (changed ? '. ' + synthesizeMessage(executed, pending)
          : unavailable ? ' : je n’ai rien changé.' : ' : je n’ai rien changé. Précise le produit et redis-le-moi.');
    }
    if (unverified.length) message = 'Une action n’a pas pu être confirmée. Vérifie son résultat avant de la répéter. ' + synthesizeMessage(executed,pending);
    // A model can announce a change no write tool made ("J'ai ajouté…" after
    // a read only). Only an executed, pending or unverified write backs it.
    if (!executed.some(a => a.risk_tier !== 'read') && !pending.length && !unverified.length && CHANGE_CLAIM.test(message)) {
      console.warn('[assistant.claim_without_write] replaced');
      message = readOnly ? READ_ONLY_MESSAGE : NO_CHANGE_MESSAGE;
    }
    // A menu add that took a slot's meal names it, and how to get it back (audit 2026-11-07).
    for (const action of executed) {
      const replaced = action.tool === 'add_recipe_to_meal_plan' ? (action.result as { replaced_recipe_name?: unknown } | null)?.replaced_recipe_name : undefined;
      if (typeof replaced === 'string' && replaced && !message.includes(replaced))
        message = `${message} Ça remplace « ${replaced} » dans ton menu : touche « Annuler » pour le remettre.`.trim();
    }
    let currentAfterProvider = this.memoryService ? await this.memoryService.readPolicySafe(input.userId) : null;
    let canRecordResponse = !this.memoryService || sameMemoryPolicy(lastProviderPolicy, currentAfterProvider);
    if (!canRecordResponse && !memoryOnly) message = 'Tes réglages ou tes souvenirs ont changé pendant cet échange. Relance ta demande pour utiliser tes choix actuels.';

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
      if(!canRecordResponse&&!memoryOnly) message='Tes réglages ou tes souvenirs ont changé pendant cet échange. Relance ta demande pour utiliser tes choix actuels.';
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
        // A search made to cook, plan or delete one recipe is not a list of ideas: its cards
        // open the recipe, so under « Laquelle ? » or a pending cook they hid the choices and
        // Confirmer (iPhone 2026-11-08).
        const recipeWrite = !!ambiguousRecipes || recipeNotFound || [...executed, ...pending].some(action => action.tool in RECIPE_WRITES);
        const recipeProposals = recipeWrite ? null : extractRecipeProposalsFromExecuted(executed);
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
      ...(choices.length ? { choices } : {}),
      actions_executed: withLabels(executed, executed, resolvedRecipeNames),
      actions_pending: withLabels(pending, executed, resolvedRecipeNames),
      confirmation_token: confirmationToken,
      cost: {
        whisper_usd: transcriptionUsd ?? 0,
        llm_usd: modelReceipt.llm_usd,
        // No exact total when one component is unknown.
        total_usd: modelReceipt.llm_usd === null || transcriptionUsd === null ? null : transcriptionUsd + modelReceipt.llm_usd,
      },
      model_used: activeResponse.model || null,
      model_receipt: modelReceipt, actions_unverified: unverified,
      duration_ms: Date.now() - start,
      conversation_id: conversationId,
      memory_results: memoryResults, memory_revision: currentAfterProvider?.revision,
      history_floor: currentAfterProvider ? memoryHistoryFloor(currentAfterProvider) : undefined, summary_status: summaryResult.status, summary_cost_unknown: summaryResult.costUnknown,
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
    actions_failed: Array<{ action_id: string; tool: string; error_code: string; reason?: string }>;
  }> {
    let payload;
    try {
      payload = this.signer.verify(input.confirmationToken, input.userId);
    } catch (err) {
      if (err instanceof ConfirmationTokenError) {
        // The client shows this text as is.
        if (err.code === 'EXPIRED') throw new VoiceAgentError('CONFIRMATION_EXPIRED', 'Cette confirmation date de plus de 5 minutes : redis-moi ta demande pour la préparer à nouveau.');
        throw new VoiceAgentError('CONFIRMATION_INVALID', 'Cette confirmation n’est plus valable : redis-moi ta demande.');
      }
      throw err;
    }

    const rows = await this.writer.claimPlanned(input.userId, payload.actionLogIds);
    const executed: ExecutedActionDescriptor[] = [];
    const failed: Array<{ action_id: string; tool: string; error_code: string; reason?: string }> = [];
    // Rows another confirmation already took: report what that run did instead of « 0 exécutée ».
    const claimed = new Set(rows.map(row => row.id));
    const earlier = await this.writer.fetchByIds(input.userId, payload.actionLogIds.filter(id => !claimed.has(id)));
    for (const row of earlier) {
      if (row.status === 'executed') executed.push({ action_id: row.id, step_seq: row.step_seq, tool: row.tool, args: row.tool_args,
        result: row.result, reversible: Boolean(row.reversible_action), undo_expires_at: row.undo_expires_at, risk_tier: row.risk_tier });
      else if (row.status === 'failed') failed.push({ action_id: row.id, tool: row.tool, error_code: row.error_code ?? 'EXECUTION_FAILED' });
    }

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
        // StockCommandError messages are written for the user; anything else stays generic.
        failed.push({ action_id: row.id, tool: row.tool, error_code: code, ...(err instanceof StockCommandError ? { reason: err.message } : {}) });
      }
    }

    return { actions_executed: executed, actions_failed: failed };
  }

  // ---- /photos/add ------------------------------------------------

  /**
   * Adds the products the owner kept from a grocery photo: the same
   * add_inventory_items action as a typed request (product matching, lot
   * top-up, action log, undo), without a model call. A retried request
   * returns its first result instead of adding twice.
   */
  async addReviewedGroceries(
    input: { userId: string; clientRequestId: string; items: unknown },
    ctx: ToolExecutionContext
  ): Promise<{ action: ExecutedActionDescriptor }> {
    const tool = 'add_inventory_items';
    let args: Record<string, unknown>;
    try { args = this.toolRegistry.parseArgs(tool, { items: input.items }); }
    catch { throw new VoiceAgentError('INVALID_ITEMS', 'Chaque produit gardé doit avoir un nom et une quantité positive.'); }
    if ((args.items as Array<{ quantity: number }>).some(item => item.quantity <= 0)) {
      throw new VoiceAgentError('INVALID_ITEMS', 'Chaque produit gardé doit avoir un nom et une quantité positive.');
    }
    const spec = this.toolRegistry.get(tool);
    const planned = await this.writer.insertPlanned({
      userId: input.userId, clientRequestId: input.clientRequestId, sessionId: input.clientRequestId,
      stepSeq: 0, tool, toolArgs: args, riskTier: 'low', reversible: spec.reversible,
    });
    const action = (result: unknown, undoExpiresAt: string | null): ExecutedActionDescriptor => ({
      action_id: planned.id, step_seq: 0, tool, args, result,
      reversible: undoExpiresAt !== null, undo_expires_at: undoExpiresAt, risk_tier: planned.risk_tier,
    });
    if (planned.replayed) {
      if (planned.tool !== tool || hashArgs(planned.tool_args) !== hashArgs(args)) {
        throw new VoiceAgentError('REQUEST_CONFLICT', 'Cette demande a déjà servi à un autre ajout. Recommence la lecture des photos.');
      }
      if (planned.status === 'executed') return { action: action(planned.result, planned.reversible_action ? planned.undo_expires_at : null) };
      throw new VoiceAgentError('ACTION_UNVERIFIED', 'Cet ajout reste à vérifier dans le stock avant de recommencer.');
    }
    try {
      const exec = (await this.handlerRegistry.get(tool).execute(
        { ...ctx, commandId: planned.id, sessionId: input.clientRequestId }, args)) as ToolExecutionResult;
      const undoExpiresAt = spec.reversible && exec.reversibleAction ? new Date(Date.now() + this.undoWindowMs) : null;
      await this.writer.markExecuted(planned.id, {
        result: exec.result as Record<string, unknown>,
        reversibleAction: spec.reversible ? exec.reversibleAction ?? null : undefined,
        undoExpiresAt,
      });
      return { action: action(exec.result, undoExpiresAt?.toISOString() ?? null) };
    } catch (err) {
      await this.writer.markFailed(planned.id, 'EXECUTION_FAILED', err instanceof Error ? err.message : 'unknown');
      throw new VoiceAgentError('EXECUTION_FAILED', 'L’ajout au stock n’a pas abouti. Vérifie le stock avant de réessayer.');
    }
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
    } catch (error) {
      console.warn('[assistant.llm] call failed:', { role, purpose, model: invocation.config.roles[role].model, ...providerErrorSummary(error) });
      throw new VoiceAgentError('LLM_FAILED','Appel du modèle indisponible ou limite atteinte.');
    }
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

// What a confirmation is about, in the user's words: « ton stock », not « l'état ».
const CONFIRMATION_TARGET: Record<string, string> = {
  consume_inventory_items: 'ton stock', update_inventory_item: 'ton stock', clear_inventory_category: 'ton stock', cook_recipe: 'ton stock',
  remove_shopping_items: 'ta liste de courses', clear_shopping_list: 'ta liste de courses',
  delete_recipe: 'tes recettes', import_recipe_from_url: 'tes recettes',
};
function defaultReasonForTier(tier: RiskTier, tool?: string): string {
  const target = (tool && CONFIRMATION_TARGET[tool]) ?? 'tes données';
  switch (tier) {
    case 'medium':
      return `Cette action modifie ${target} : vérifie-la avant de confirmer.`;
    case 'high':
      return `Action sensible sur ${target} : vérifie-la avant de confirmer.`;
    default:
      return '';
  }
}

const CHANGE_CLAIM = /(?:\bj['’]ai|\bje viens d['’]|\bc['’]est|\b(?:a|ont|est|sont) été)\s+(?:bien\s+)?(?:ajout|retir|supprim|modifi|mis à jour|mise à jour|enregistr|marqu|coch|consomm|vid|déplac)|\bI(?:['’]ve| have)?\s+(?:just\s+)?(?:added|removed|deleted|updated|marked|cleared)\b/iu;
const NO_CHANGE_MESSAGE = 'Je n’ai encore rien modifié. Redis-moi ce que tu veux ajouter ou changer, par exemple « ajoute 2 kg de pommes de terre au stock ».';
const READ_ONLY_MESSAGE = 'Je n’ai rien modifié : cette fenêtre d’aide peut seulement consulter ton stock, ta liste et tes recettes. Pour ajouter ou changer quelque chose, touche « Ouvrir les conversations » et redis-le-moi.';
const READ_ONLY_SCOPE = `READ-ONLY WINDOW: here you can only read (stock, shopping list, recipes, memories). Never offer, promise or announce a change. If the user asks to add, remove, update or mark anything, answer in one short sentence, in their language, that this help window can only consult and that the « Ouvrir les conversations » button opens the assistant that makes changes.`;

// Past cooking or a meal to plan: the recipe tool only finds the id, a write must follow.
// \b ignores accented letters (« cuisiné »), hence the \p{L} lookarounds.
const RECIPE_ACTION = new RegExp(['(?:j[\'’]ai|on a|nous avons)\\s+(?:cuisiné|préparé|fait|mangé|terminé)',
  '(?:mets|ajoute|place|planifie|programme|prévois)[^.?!]{0,60}(?:menu|planning|programme|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|demain)',
  'supprim\\p{L}*[^.?!]{0,40}recette'].map(part => `(?<![\\p{L}\\p{N}])${part}(?![\\p{L}\\p{N}])`).join('|'), 'iu');

// The model copies one date per meal-plan call; the server derives week and day.
// Given week_start + day_of_week to fill in, gpt-4o-mini mixed them up (live repro 2026-11-07).
const FRENCH_DAY = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const FRENCH_WEEKDAY = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long' });
const noon = (iso: string) => new Date(`${iso}T12:00:00Z`);
function shiftDate(iso: string, days: number): string {
  return new Date(noon(iso).getTime() + days * 86400000).toISOString().slice(0, 10);
}
function todayContext(now: Date): string {
  const today = calendarDate(now)!, weekStart = calendarWeekStart(now)!;
  const week = (start: string) => Array.from({ length: 7 }, (_, i) => `${FRENCH_WEEKDAY.format(noon(shiftDate(start, i)))} ${shiftDate(start, i)}`).join(', ');
  return `TODAY (Europe/Paris): Aujourd’hui : ${FRENCH_DAY.format(noon(today))} (${today}). Demain : ${FRENCH_DAY.format(noon(shiftDate(today, 1)))} (${shiftDate(today, 1)}).\n`
    + `Cette semaine : ${week(weekStart)}.\nSemaine prochaine : ${week(shiftDate(weekStart, 7))}.\n`
    + 'For read_meal_plan and add_recipe_to_meal_plan pass `date` (YYYY-MM-DD). A date or week the user states explicitly (« la semaine du lundi 5 octobre 2026 », « le 12 décembre ») always wins over today: use that date. Only a relative date (aujourd’hui, ce soir, demain, cette semaine, la semaine prochaine) is copied from these lines; never compute one.';
}

// Tool results reach the model as text. Stock and shopping rows keep only what it
// needs, so 40 rows fit instead of the first four or five (audit 2026-11-07).
const MODEL_RESULT_CHARS = 6000;
const ROW_FIELDS = ['id', 'product_name', 'name', 'quantity', 'unit', 'unit_type', 'expiry_date', 'days_to_expiry', 'expired', 'is_purchased', 'location'];
function compactForModel(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const object = value as Record<string, unknown>;
  if (Array.isArray(object.items) && object.items.every(item => item && typeof item === 'object' && 'product_name' in (item as object))) {
    return { ...object, total: object.items.length, items: (object.items as Array<Record<string, unknown>>).slice(0, 80)
      .map(item => Object.fromEntries(ROW_FIELDS.filter(key => item[key] !== undefined && item[key] !== null).map(key => [key, item[key]]))) };
  }
  return 'result' in object ? { ...object, result: compactForModel(object.result) } : object;
}

/** « 200 g » alone cannot be confirmed: name the rows a write targets, from the reads of the same turn. */
function withLabels<T extends { args: Record<string, unknown> }>(actions: T[], executed: ExecutedActionDescriptor[], extra: Map<string, string> = new Map()): T[] {
  const names = new Map([...recipeNames(executed), ...extra]);
  for (const action of executed) {
    if (action.tool !== 'read_inventory' && action.tool !== 'read_shopping_list') continue;
    const items = (action.result as { items?: Array<{ id?: unknown; product_name?: unknown }> } | null)?.items;
    for (const item of Array.isArray(items) ? items : [])
      if (typeof item.id === 'string' && typeof item.product_name === 'string' && item.product_name) names.set(item.id, item.product_name);
  }
  if (!names.size) return actions;
  return actions.map(action => {
    const { args } = action;
    const ids = [
      ...(Array.isArray(args.items) ? (args.items as Array<{ inventory_id?: unknown }>).map(item => item?.inventory_id) : []),
      ...(Array.isArray(args.shopping_item_ids) ? args.shopping_item_ids : []),
      args.inventory_id,
      args.recipe_id,
    ].filter((id): id is string => typeof id === 'string' && names.has(id));
    return ids.length ? { ...action, labels: Object.fromEntries(ids.map(id => [id, names.get(id)!])) } : action;
  });
}

/** Recipe names read this turn (searches and suggestion buckets), by id. */
function recipeNames(executed: ExecutedActionDescriptor[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const action of executed) {
    if (!isRecipeTool(action.tool) || !action.result || typeof action.result !== 'object') continue;
    const result = action.result as Record<string, unknown>;
    for (const key of ['recipes', 'cookable_now', 'almost_cookable', 'verify_suggestions', 'recent_suggestions'])
      for (const row of Array.isArray(result[key]) ? result[key] as Array<{ id?: unknown; name?: unknown }> : [])
        if (typeof row.id === 'string' && typeof row.name === 'string' && row.name) names.set(row.id, row.name);
  }
  return names;
}

const RECIPE_WRITES: Record<string, string> = {
  cook_recipe: 'Laquelle as-tu cuisinée ?',
  add_recipe_to_meal_plan: 'Laquelle veux-tu mettre au menu ?',
  delete_recipe: 'Laquelle veux-tu supprimer ?',
};
interface AmbiguousRecipes { tool: string; recipeIds: string[] }
/**
 * Drops a recipe write the user's words do not pin down: one prepared on several
 * recipes, or one recipe picked among search results that match the words as well
 * (live repro 2026-11-07: « byriani » → Buhari, then Lamb, among three biryani).
 */
function keepUnambiguousRecipeWrites<T extends { name: string; arguments: string }>(calls: T[], candidates: Map<string, string>, transcript: string): { kept: T[]; ambiguous: AmbiguousRecipes | null } {
  let ambiguous: AmbiguousRecipes | null = null;
  const recipeId = (call: T) => { try { const id = (JSON.parse(call.arguments) as { recipe_id?: unknown }).recipe_id; return typeof id === 'string' ? id : null; } catch { return null; } };
  const dropped = new Set<string>();
  for (const tool of Object.keys(RECIPE_WRITES)) {
    const ids = [...new Set(calls.filter(call => call.name === tool).map(recipeId).filter((id): id is string => !!id))];
    if (ids.length > 1) { dropped.add(tool); ambiguous ??= { tool, recipeIds: ids }; continue; }
    const chosen = ids[0] && candidates.get(ids[0]);
    if (!chosen) continue;
    const score = recipeWordsMatched(chosen, transcript);
    // Words naming no candidate (« la première ») leave the choice to the model.
    const rivals = score > 0 ? [...candidates].filter(([id, name]) => id !== ids[0] && recipeWordsMatched(name, transcript) >= score).map(([id]) => id) : [];
    if (rivals.length) { dropped.add(tool); ambiguous ??= { tool, recipeIds: [ids[0], ...rivals] }; }
  }
  return { kept: calls.filter(call => !dropped.has(call.name)), ambiguous };
}
interface RecipeName { id: string; name: string }
/** null when the library cannot be read: the id is then left as is, not refused. */
async function loadRecipeLibrary(ctx: ToolExecutionContext): Promise<RecipeName[] | null> {
  try {
    const { data, error } = await ctx.userClient.from('recipes').select('id, name').eq('user_id', ctx.userId).limit(1000);
    return error ? null : ((data ?? []) as RecipeName[]);
  } catch { return null; }
}
/**
 * A recipe write whose id was not read this turn: keep a real id the words name at
 * least as well as any other recipe, else use the one recipe the words name best,
 * ask when several tie, and refuse when none is named.
 */
async function resolveRecipeWrite(tool: string, rawArguments: string, transcript: string, known: Map<string, string>,
  loadLibrary: () => Promise<RecipeName[] | null>): Promise<{ arguments: string; names: Map<string, string>; ambiguous?: AmbiguousRecipes; notFound?: boolean }> {
  let args: Record<string, unknown>;
  try { args = JSON.parse(rawArguments) as Record<string, unknown>; } catch { return { arguments: rawArguments, names: new Map() }; }
  const id = typeof args.recipe_id === 'string' ? args.recipe_id : null;
  if (id && known.has(id)) return { arguments: rawArguments, names: new Map() };
  const recipes = await loadLibrary();
  if (!recipes) return { arguments: rawArguments, names: new Map() };
  const scored = recipes.map(recipe => ({ ...recipe, score: recipeWordsMatched(recipe.name, transcript) }));
  const best = Math.max(0, ...scored.map(recipe => recipe.score));
  const own = scored.find(recipe => recipe.id === id);
  // A real id kept when the words name no recipe (« la première ») or name it alone.
  const rivals = own ? scored.filter(recipe => recipe.id !== own.id && recipe.score >= own.score).length : 0;
  if (own && (best === 0 || (own.score === best && rivals === 0))) return { arguments: rawArguments, names: new Map([[own.id, own.name]]) };
  const top = best > 0 ? scored.filter(recipe => recipe.score === best) : [];
  const names = new Map(top.map(recipe => [recipe.id, recipe.name] as const));
  if (top.length === 1) return { arguments: JSON.stringify({ ...args, recipe_id: top[0].id }), names };
  if (top.length > 1) return { arguments: rawArguments, names, ambiguous: { tool, recipeIds: top.map(recipe => recipe.id) } };
  return { arguments: rawArguments, names, notFound: true };
}
/** One tappable answer per candidate, phrased so the next turn names it unambiguously. */
function recipeChoices(ambiguous: AmbiguousRecipes, names: Map<string, string>, transcript: string): Array<{ label: string; reply: string }> {
  return ambiguous.recipeIds.map(id => names.get(id)).filter((name): name is string => !!name).slice(0, 6).map(name => ({
    label: name,
    reply: ambiguous.tool === 'cook_recipe' ? `J’ai cuisiné ${name}`
      : ambiguous.tool === 'delete_recipe' ? `Supprime la recette ${name}` : `${transcript.trim().replace(/[.!?]+$/, '')} : ${name}`,
  }));
}
function clarificationChoices(executed: ExecutedActionDescriptor[]): Array<{ label: string; reply: string }> {
  const asked = executed.find(action => action.tool === 'ask_clarification');
  const options = (asked?.result as { options?: unknown } | undefined)?.options;
  return Array.isArray(options) ? options.filter((option): option is string => typeof option === 'string' && !!option.trim()).slice(0, 6)
    .map(option => ({ label: option, reply: option })) : [];
}
/** The last assistant reply (session turns, else saved history) asked which recipe. */
function answersRecipeQuestion(sessionTurns: AICompletionRequest['messages'], recentMessagesText: string): boolean {
  const lastSession = [...sessionTurns].reverse().find(turn => turn.role === 'assistant')?.content;
  const lastSaved = recentMessagesText.split('\n').reverse().find(line => line.startsWith('assistant: '));
  const last = typeof lastSession === 'string' ? lastSession : lastSaved ?? '';
  return Object.values(RECIPE_WRITES).some(question => last.includes(question));
}
function ambiguityQuestion(ambiguous: AmbiguousRecipes, names: Map<string, string>): string {
  const listed = ambiguous.recipeIds.map(id => names.get(id)).filter((name): name is string => !!name).slice(0, 6);
  return listed.length ? `Plusieurs recettes correspondent : ${listed.join(', ')}. ${RECIPE_WRITES[ambiguous.tool]} Touche son nom ci-dessous, ou redis-le-moi.`
    : `Plusieurs recettes correspondent. ${RECIPE_WRITES[ambiguous.tool]} Redis-le-moi avec son nom.`;
}

function synthesizeMessage(
  executed: ExecutedActionDescriptor[],
  pending: PendingActionDescriptor[]
): string {
  // A read that only found the row to change is not news next to a pending write.
  const changes = executed.filter(action => action.risk_tier !== 'read');
  const done = changes.length || pending.length ? changes : executed;
  if (done.length === 0 && pending.length === 0) return 'Rien à faire.';
  const parts: string[] = [];
  if (done.length > 0) parts.push(`${done.length} action${done.length > 1 ? 's' : ''} exécutée${done.length > 1 ? 's' : ''}.`);
  if (pending.length > 0) parts.push(pending.length > 1
    ? `${pending.length} actions à confirmer : vérifie-les ci-dessous, puis touche « Confirmer ».`
    : '1 action à confirmer : vérifie-la ci-dessous, puis touche « Confirmer ».');
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
