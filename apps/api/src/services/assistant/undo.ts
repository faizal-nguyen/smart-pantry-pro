/**
 * PRP-221 J5c — Shared undo logic.
 *
 * Used by :
 *   - VoiceAgentService.handleUndo (the /api/assistant/actions/:id/undo route)
 *   - the `undo_action` tool handler (so the LLM can trigger an undo
 *     mid-session)
 *
 * Contract :
 *   - Caller has already authenticated and scoped `userId` to the
 *     current request.
 *   - The action_log row must be `status='executed'` AND `reversible=true`
 *     AND `undo_expires_at > now()`.
 *   - The inverse handler must exist in the registry (LLM-public or
 *     internal, doesn't matter for the lookup).
 *
 * Failures throw `UndoFailedError` with a typed code so the caller
 * can map to the right HTTP status / VoiceAgentError.
 */
import type { ActionLogWriter, ActionLogRow } from './ActionLogWriter.js';
import { ToolHandlerRegistry } from './handlers/types.js';
import type { ToolExecutionContext } from './handlers/types.js';

export type UndoFailureCode =
  | 'NOT_FOUND'
  | 'NOT_REVERSIBLE'
  | 'EXPIRED'
  | 'HANDLER_MISSING'
  | 'EXECUTION_FAILED';

export class UndoFailedError extends Error {
  constructor(
    readonly code: UndoFailureCode,
    message: string,
    readonly actionId?: string
  ) {
    super(message);
    this.name = 'UndoFailedError';
  }
}

export interface UndoOutcome {
  undone: boolean;
  result?: unknown;
  /** The original action that was reversed. */
  action: ActionLogRow;
}

export async function performUndo(
  ctx: ToolExecutionContext,
  actionId: string,
  writer: ActionLogWriter,
  handlerRegistry: ToolHandlerRegistry
): Promise<UndoOutcome> {
  const row = await writer.fetchById(ctx.userId, actionId);
  if (!row) throw new UndoFailedError('NOT_FOUND', `action ${actionId} not found`, actionId);
  if (row.status !== 'executed' || !row.reversible || !row.reversible_action) {
    throw new UndoFailedError('NOT_REVERSIBLE', `action ${actionId} is not reversible`, actionId);
  }
  if (row.undo_expires_at && new Date(row.undo_expires_at) < new Date()) {
    throw new UndoFailedError('EXPIRED', `undo window for ${actionId} has expired`, actionId);
  }

  if (!handlerRegistry.has(row.reversible_action.tool)) {
    throw new UndoFailedError(
      'HANDLER_MISSING',
      `No handler registered for inverse tool "${row.reversible_action.tool}"`,
      actionId
    );
  }

  const handler = handlerRegistry.get(row.reversible_action.tool);
  let result: unknown;
  try {
    const exec = await handler.execute(ctx, row.reversible_action.args);
    result = exec.result;
  } catch (err) {
    throw new UndoFailedError(
      'EXECUTION_FAILED',
      err instanceof Error ? err.message : 'inverse handler threw',
      actionId
    );
  }

  await writer.markUndone(row.id);
  return { undone: true, result, action: row };
}
