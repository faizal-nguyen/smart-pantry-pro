/**
 * PRP-221 J5c — Meta tool handlers.
 *
 *   - ask_clarification    surfaces a question to the UI; no DB write
 *   - summarize_session    reads assistant_action_log filtered by session
 *   - undo_action          delegates to the shared `performUndo` helper
 *
 * undo_action is the trickiest: it needs the action_log writer + the
 * full handler registry (to dispatch the inverse). Both are injected
 * at construction time. The registry reference is captured by closure,
 * which is safe because by the time the LLM invokes undo_action all
 * other handlers are already registered.
 */
import type {
  ToolHandler,
  ToolExecutionContext,
  ToolExecutionResult,
} from './types.js';
import { ToolHandlerRegistry, DEFAULT_UNDO_WINDOW_MS } from './types.js';
import type {
  AskClarificationArgs,
  SummarizeSessionArgs,
  UndoActionArgs,
} from '../schemas/tools.js';
import type { ActionLogWriter } from '../ActionLogWriter.js';
import { performUndo, UndoFailedError } from '../undo.js';

// ---- ask_clarification ----------------------------------------------

export interface AskClarificationResult {
  question: string;
  options: string[];
}

export class AskClarificationHandler
  implements ToolHandler<AskClarificationArgs, AskClarificationResult>
{
  async execute(
    _ctx: ToolExecutionContext,
    args: AskClarificationArgs
  ): Promise<ToolExecutionResult<AskClarificationResult>> {
    return {
      result: {
        question: args.question,
        options: args.options ?? [],
      },
    };
  }
}

// ---- summarize_session ----------------------------------------------

export interface SummarizedAction {
  id: string;
  step_seq: number;
  tool: string;
  status: string;
  risk_tier: string;
  created_at: string;
  executed_at: string | null;
  cost_usd: number | null;
  reversible: boolean;
}

export interface SummarizeSessionResult {
  session_id: string | null;
  actions: SummarizedAction[];
  total_actions: number;
  executed: number;
  pending: number;
  failed: number;
  total_cost_usd: number;
}

export class SummarizeSessionHandler
  implements ToolHandler<SummarizeSessionArgs, SummarizeSessionResult>
{
  async execute(
    ctx: ToolExecutionContext,
    _args: SummarizeSessionArgs
  ): Promise<ToolExecutionResult<SummarizeSessionResult>> {
    if (!ctx.sessionId) {
      return {
        result: {
          session_id: null,
          actions: [],
          total_actions: 0,
          executed: 0,
          pending: 0,
          failed: 0,
          total_cost_usd: 0,
        },
      };
    }

    const { data, error } = await ctx.userClient
      .from('assistant_action_log')
      .select(
        'id, step_seq, tool, status, risk_tier, reversible, cost_usd, created_at, executed_at'
      )
      .eq('user_id', ctx.userId)
      .eq('session_id', ctx.sessionId)
      .order('step_seq', { ascending: true });
    if (error) throw error;

    const rows = (data ?? []) as Array<{
      id: string;
      step_seq: number;
      tool: string;
      status: string;
      risk_tier: string;
      reversible: boolean;
      cost_usd: number | null;
      created_at: string;
      executed_at: string | null;
    }>;

    const counts = rows.reduce(
      (acc, r) => {
        acc.total += 1;
        if (r.status === 'executed') acc.executed += 1;
        else if (r.status === 'planned') acc.pending += 1;
        else if (r.status === 'failed') acc.failed += 1;
        acc.cost += r.cost_usd ?? 0;
        return acc;
      },
      { total: 0, executed: 0, pending: 0, failed: 0, cost: 0 }
    );

    return {
      result: {
        session_id: ctx.sessionId,
        actions: rows.map((r) => ({
          id: r.id,
          step_seq: r.step_seq,
          tool: r.tool,
          status: r.status,
          risk_tier: r.risk_tier,
          reversible: r.reversible,
          cost_usd: r.cost_usd,
          created_at: r.created_at,
          executed_at: r.executed_at,
        })),
        total_actions: counts.total,
        executed: counts.executed,
        pending: counts.pending,
        failed: counts.failed,
        total_cost_usd: Number(counts.cost.toFixed(6)),
      },
    };
  }
}

// ---- undo_action ----------------------------------------------------

export interface UndoActionResult {
  undone: boolean;
  action_id: string;
  inverse_tool: string;
  result?: unknown;
}

export class UndoActionHandler
  implements ToolHandler<UndoActionArgs, UndoActionResult>
{
  constructor(
    private readonly writer: ActionLogWriter,
    /**
     * Reference to the same registry this handler is registered into.
     * Captured by closure so the inverse-handler lookup at execute
     * time picks up handlers registered later.
     */
    private readonly handlerRegistry: ToolHandlerRegistry,
    private readonly undoWindowMs: number = DEFAULT_UNDO_WINDOW_MS
  ) {}

  async execute(
    ctx: ToolExecutionContext,
    args: UndoActionArgs
  ): Promise<ToolExecutionResult<UndoActionResult>> {
    try {
      const outcome = await performUndo(
        ctx,
        args.action_id,
        this.writer,
        this.handlerRegistry
      );
      return {
        result: {
          undone: outcome.undone,
          action_id: args.action_id,
          inverse_tool: outcome.action.reversible_action?.tool ?? '',
          result: outcome.result,
        },
      };
    } catch (err) {
      if (err instanceof UndoFailedError) {
        // Re-throw as-is; the orchestrator's `markFailed` catches it
        // and the surrounding action_log row records the failure
        // with a meaningful error_message. We don't want
        // CONFIRMATION_INVALID etc. to bubble up here since this is
        // a tool call, not a confirmation.
        throw err;
      }
      throw err;
    }
  }
}

// ---- registration helper --------------------------------------------

export interface MetaHandlersDeps {
  writer: ActionLogWriter;
  undoWindowMs?: number;
}

export function registerMetaHandlers(
  registry: ToolHandlerRegistry,
  deps: MetaHandlersDeps
): void {
  registry.register('ask_clarification', new AskClarificationHandler());
  registry.register('summarize_session', new SummarizeSessionHandler());
  registry.register(
    'undo_action',
    new UndoActionHandler(deps.writer, registry, deps.undoWindowMs)
  );
}
