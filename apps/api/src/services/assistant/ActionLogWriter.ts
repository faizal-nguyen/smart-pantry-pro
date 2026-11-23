/**
 * PRP-221 J4 — Writer thin around `assistant_action_log`.
 *
 * The table has RLS that blocks user-level INSERT/UPDATE/DELETE — only
 * service-role writes. So this writer takes the admin client.
 *
 * Methods :
 *   - insertPlanned          new row with status='planned'
 *   - claimPlanned           planned → executing (a confirmation takes the row)
 *   - markExecuted           planned/executing → executed (+ result + reversibility)
 *   - markFailed             planned/executing → failed (+ error_code/msg)
 *   - reconcileExecuting     executing past EXECUTING_STALE_AFTER_MS → executed
 *                            if a stock receipt proves it, else failed (to verify)
 *   - markUndone             executed → undone (set undone_at)
 *   - findByAudioSha         10-min lookup for /voice replay protection
 *
 * The handler hot-path doesn't need a transaction across multiple
 * actions in a session — each row is independent and the
 * UNIQUE(user_id, client_request_id, step_seq) catches retries
 * naturally. The session_id grouping is for audit/UI, not for
 * write atomicity.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { RiskTier } from './schemas/tools.js';

const TEN_MINUTES_AGO_SQL = "now() - interval '10 minutes'";

/**
 * How long a row stays `executing` before it is no longer awaited and gets
 * reconciled. A confirmation can only come back while its token is valid
 * (five minutes), so the delay must stay below that for a retry to settle
 * the row; and well above a handler run (database commands and provider
 * calls bounded by their own timeouts, a few seconds). Settling too early is
 * never a false success: without a receipt the row is only « à vérifier »,
 * and the first run's own result still overwrites it.
 */
export const EXECUTING_STALE_AFTER_MS = 2 * 60_000;

export type ActionLogStatus = 'planned' | 'executing' | 'executed' | 'failed' | 'undone' | 'cancelled';

export interface ActionLogRow {
  id: string;
  user_id: string;
  client_request_id: string;
  session_id: string;
  step_seq: number;
  audio_sha256: string | null;
  tool: string;
  tool_args: Record<string, unknown>;
  risk_tier: RiskTier;
  status: ActionLogStatus;
  result: Record<string, unknown> | null;
  error_code: string | null;
  error_message: string | null;
  reversible: boolean;
  reversible_action: { tool: string; args: Record<string, unknown> } | null;
  undo_expires_at: string | null;
  undone_at: string | null;
  llm_model: string | null;
  cost_usd: number | null;
  created_at: string;
  executed_at: string | null;
  updated_at: string;
  /** Local return metadata only; never stored as a database column. */
  replayed?: boolean;
}

export interface InsertPlannedInput {
  userId: string;
  clientRequestId: string;
  sessionId: string;
  stepSeq: number;
  audioSha256?: string | null;
  tool: string;
  toolArgs: Record<string, unknown>;
  riskTier: RiskTier;
  reversible: boolean;
  llmModel?: string | null;
  costUsd?: number | null;
}

export class ActionLogWriter {
  constructor(private readonly adminClient: SupabaseClient<any, any, any>) {}

  /**
   * Insert a new row with status='planned'. Returns the row id.
   * On UNIQUE(user_id, client_request_id, step_seq) collision, returns
   * the existing row (idempotent retry).
   */
  async insertPlanned(input: InsertPlannedInput): Promise<ActionLogRow> {
    const payload = {
      user_id: input.userId,
      client_request_id: input.clientRequestId,
      session_id: input.sessionId,
      step_seq: input.stepSeq,
      audio_sha256: input.audioSha256 ?? null,
      tool: input.tool,
      tool_args: input.toolArgs,
      risk_tier: input.riskTier,
      status: 'planned',
      reversible: input.reversible,
      llm_model: input.llmModel ?? null,
      cost_usd: input.costUsd ?? null,
    };

    const { data, error } = await this.adminClient
      .from('assistant_action_log')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      // 23505 → idempotent retry: re-fetch the row that already exists.
      if ((error as { code?: string }).code === '23505') {
        const existing = await this.findByRequestStep(
          input.userId,
          input.clientRequestId,
          input.stepSeq
        );
        if (existing) return { ...existing, replayed: true };
      }
      throw error;
    }
    return data as ActionLogRow;
  }

  async markExecuted(
    id: string,
    params: {
      result: Record<string, unknown>;
      reversibleAction?: { tool: string; args: Record<string, unknown> } | null;
      undoExpiresAt?: Date | null;
      costUsd?: number | null;
    }
  ): Promise<void> {
    const update: Record<string, unknown> = {
      status: 'executed',
      executed_at: new Date().toISOString(),
      result: params.result,
    };
    if (params.reversibleAction !== undefined) {
      update.reversible_action = params.reversibleAction;
      // Keep the row.reversible flag truthful: an action that has no
      // computable inverse downgrades to reversible=false at exec time.
      update.reversible = params.reversibleAction !== null;
    }
    if (params.undoExpiresAt !== undefined) {
      update.undo_expires_at = params.undoExpiresAt
        ? params.undoExpiresAt.toISOString()
        : null;
    }
    if (params.costUsd !== undefined) {
      update.cost_usd = params.costUsd;
    }

    const { error } = await this.adminClient
      .from('assistant_action_log')
      .update(update)
      .eq('id', id);
    if (error) throw error;
  }

  async markFailed(
    id: string,
    errorCode: string,
    errorMessage: string
  ): Promise<void> {
    const { error } = await this.adminClient
      .from('assistant_action_log')
      .update({
        status: 'failed',
        error_code: errorCode,
        error_message: errorMessage.slice(0, 500),
      })
      .eq('id', id);
    if (error) throw error;
  }

  async markUndone(id: string): Promise<void> {
    const { error } = await this.adminClient
      .from('assistant_action_log')
      .update({ status: 'undone', undone_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  /**
   * Look up the most recent log row that hashed this audio in the last
   * 10 minutes (PRP-221 §8 belt-and-braces /voice retry protection).
   * Returns null if not found.
   */
  async findByAudioSha(
    userId: string,
    audioSha256: string
  ): Promise<ActionLogRow | null> {
    const { data, error } = await this.adminClient
      .from('assistant_action_log')
      .select('*')
      .eq('user_id', userId)
      .eq('audio_sha256', audioSha256)
      .gte('created_at', new Date(Date.now() - 10 * 60_000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return (data as ActionLogRow | null) ?? null;
  }

  async fetchPlanned(userId: string, ids: readonly string[]): Promise<ActionLogRow[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.adminClient
      .from('assistant_action_log')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'planned')
      .in('id', ids);
    if (error) throw error;
    return (data ?? []) as ActionLogRow[];
  }

  /**
   * Takes planned rows for execution in one UPDATE … WHERE status='planned':
   * a second confirmation sent at the same time (double tap, retry after a
   * lost reply) gets none of them, so an action never runs twice. The rows
   * become `executing`, not `executed`: only the handler's outcome
   * (markExecuted / markFailed) says whether the action happened.
   */
  async claimPlanned(userId: string, ids: readonly string[]): Promise<ActionLogRow[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.adminClient
      .from('assistant_action_log')
      .update({ status: 'executing' })
      .eq('user_id', userId)
      .eq('status', 'planned')
      .in('id', ids)
      .select('*');
    if (error) throw error;
    return (data ?? []) as ActionLogRow[];
  }

  /**
   * Settles a row left `executing` past EXECUTING_STALE_AFTER_MS (interrupted
   * run, or its result could not be recorded). A stock command takes the row
   * id as `command_id`, so its receipt proves the action happened: the row
   * becomes executed, without an assistant undo since the full effect of the
   * tool is unknown here. Without a receipt it becomes failed with
   * EXECUTION_UNVERIFIED (« à vérifier »). Both writes only apply to a row
   * still `executing`: a run that finished meanwhile keeps its own result.
   * Any other row is returned unchanged, without a query.
   */
  async reconcileExecuting(userId: string, row: ActionLogRow, now: number = Date.now()): Promise<ActionLogRow> {
    if (row.status !== 'executing') return row;
    if (now - Date.parse(row.updated_at) < EXECUTING_STALE_AFTER_MS) return row;

    const { data: receipt, error: receiptError } = await this.adminClient
      .from('stock_commands')
      .select('result')
      .eq('user_id', userId)
      .eq('command_id', row.id)
      .maybeSingle();
    if (receiptError) throw receiptError;

    const update: Record<string, unknown> = receipt
      ? {
          status: 'executed',
          executed_at: new Date(now).toISOString(),
          result: { ...((receipt as { result?: Record<string, unknown> | null }).result ?? {}), reconciled_from: 'stock_commands' },
          reversible: false,
          reversible_action: null,
          undo_expires_at: null,
        }
      : {
          status: 'failed',
          error_code: 'EXECUTION_UNVERIFIED',
          error_message: 'Résultat à vérifier : aucune trace de la commande après le délai.',
        };
    const { data, error } = await this.adminClient
      .from('assistant_action_log')
      .update(update)
      .eq('user_id', userId)
      .eq('id', row.id)
      .eq('status', 'executing')
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (data) return data as ActionLogRow;
    return (await this.fetchById(userId, row.id)) ?? row;
  }

  async fetchByIds(userId: string, ids: readonly string[]): Promise<ActionLogRow[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.adminClient
      .from('assistant_action_log')
      .select('*')
      .eq('user_id', userId)
      .in('id', ids);
    if (error) throw error;
    return (data ?? []) as ActionLogRow[];
  }

  async fetchById(userId: string, id: string): Promise<ActionLogRow | null> {
    const { data, error } = await this.adminClient
      .from('assistant_action_log')
      .select('*')
      .eq('user_id', userId)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as ActionLogRow | null) ?? null;
  }

  private async findByRequestStep(
    userId: string,
    clientRequestId: string,
    stepSeq: number
  ): Promise<ActionLogRow | null> {
    const { data, error } = await this.adminClient
      .from('assistant_action_log')
      .select('*')
      .eq('user_id', userId)
      .eq('client_request_id', clientRequestId)
      .eq('step_seq', stepSeq)
      .maybeSingle();
    if (error) throw error;
    return (data as ActionLogRow | null) ?? null;
  }
}
