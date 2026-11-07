/**
 * PRP-221 J5c — Meta tool handlers.
 *
 *   - ask_clarification    surfaces a question to the UI; no DB write
 *
 * summarize_session and undo_action were removed from the assistant (audit
 * 2026-11-07): each request has a new session id and the model never sees an
 * action id, so neither could work. The UI's Annuler button still undoes
 * through the shared performUndo helper.
 */
import type {
  ToolHandler,
  ToolExecutionContext,
  ToolExecutionResult,
} from './types.js';
import type { ToolHandlerRegistry } from './types.js';
import type { AskClarificationArgs } from '../schemas/tools.js';

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

// ---- registration helper --------------------------------------------

export function registerMetaHandlers(registry: ToolHandlerRegistry): void {
  registry.register('ask_clarification', new AskClarificationHandler());
}
