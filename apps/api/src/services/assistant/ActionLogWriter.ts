/**
 * PRP-221 J4 — Writer thin around `assistant_action_log`.
 *
 * The table has RLS that blocks user-level INSERT/UPDATE/DELETE — only
 * service-role writes. So this writer takes the admin client.
 *
 * Methods :
 *   - insertPlanned          new row with status='planned'
 *   - markExecuted           planned → executed (+ result + reversibility)
 *   - markFailed             planned/running → failed (+ error_code/msg)
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
  status: 'planned' | 'executed' | 'failed' | 'undone' | 'cancelled';
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
        if (existing) return existing;
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
