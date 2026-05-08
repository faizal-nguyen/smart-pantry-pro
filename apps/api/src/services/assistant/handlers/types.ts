/**
 * PRP-221 J4 — Handler interface for tool execution.
 *
 * Each tool in `TOOL_SPECS` is paired with a handler that knows how to
 * actually do the work — INSERT INTO inventory, query recipes, etc.
 * The orchestrator (`VoiceAgentService`) calls handlers but does not
 * import their implementations. That keeps J4 testable without DB.
 *
 * Real implementations land in J5 (handlers/inventory.ts,
 * handlers/shopping.ts, …) and are registered into a
 * `ToolHandlerRegistry` that the orchestrator consumes.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { ProductResolver } from '../ProductResolver.js';

/**
 * Per-request context passed to every handler. Contains both clients
 * (user-scoped for RLS-bound writes, admin for storage / cross-table)
 * plus the resolver shared across handlers in the same request.
 */
export interface ToolExecutionContext {
  userId: string;
  userClient: SupabaseClient<any, any, any>;
  adminClient: SupabaseClient<any, any, any>;
  productResolver: ProductResolver;
  /**
   * Inventory ids that ProductResolver flagged as ambiguous in this
   * request. Read by RiskClassifier to escalate consume_inventory_items
   * when an ambiguous item is referenced.
   */
  ambiguousInventoryIds?: string[];
}

/**
 * Reversible action shape — the inverse instruction stored on the
 * action_log row to power undo. Built by the original handler at
 * execute time, NOT by the LLM.
 */
export interface ReversibleAction {
  tool: string;
  args: Record<string, unknown>;
}

/**
 * Result of a successful execution. The orchestrator persists `result`
 * verbatim into action_log.result and returns it to the client.
 */
export interface ToolExecutionResult<TResult = unknown> {
  result: TResult;
  /**
   * undefined  → the spec marked reversible:false from the start
   *              (e.g. delete_recipe, read_*).
   * null       → reversible in principle but the inverse can't be
   *              computed for this particular call.
   * object     → the inverse instruction.
   */
  reversibleAction?: ReversibleAction | null;
  /** Optional cost surcharge (e.g. import_recipe_from_url chains another GPT call). */
  extraCostUsd?: number;
}

export interface ToolHandler<TArgs = unknown, TResult = unknown> {
  /**
   * Execute the tool. MUST throw on user-visible failure (the
   * orchestrator will catch and mark the row as failed with a clear
   * code).
   *
   * The Zod schema has already validated `args` — handlers can trust
   * the shape.
   */
  execute(
    ctx: ToolExecutionContext,
    args: TArgs
  ): Promise<ToolExecutionResult<TResult>>;
}

export class ToolHandlerNotFoundError extends Error {
  constructor(toolName: string) {
    super(`No handler registered for tool: ${toolName}`);
    this.name = 'ToolHandlerNotFoundError';
  }
}

export class ToolHandlerRegistry {
  private readonly handlers = new Map<string, ToolHandler>();

  register<TArgs, TResult>(name: string, handler: ToolHandler<TArgs, TResult>): void {
    this.handlers.set(name, handler as ToolHandler);
  }

  registerAll(entries: ReadonlyArray<{ name: string; handler: ToolHandler<any, any> }>): void {
    for (const { name, handler } of entries) {
      this.register(name, handler);
    }
  }

  get(name: string): ToolHandler {
    const h = this.handlers.get(name);
    if (!h) throw new ToolHandlerNotFoundError(name);
    return h;
  }

  has(name: string): boolean {
    return this.handlers.has(name);
  }

  list(): readonly string[] {
    return [...this.handlers.keys()];
  }
}

/** Default undo window from PRP-221 §9 — the executor sets undo_expires_at = now() + 15min. */
export const DEFAULT_UNDO_WINDOW_MS = 15 * 60_000;
