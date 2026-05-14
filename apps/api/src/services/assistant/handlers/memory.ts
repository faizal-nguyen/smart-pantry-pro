/**
 * PRP-223 PR4 — assistant memory tool handlers.
 *
 * Wires the LLM tool catalogue (`read_user_memories`,
 * `search_conversation_history`) to `MemoryService`. PR5 will append
 * the write tools (`remember_preference`, `forget_memory`,
 * `update_response_style`). PR7 will append `record_recipe_feedback`
 * once `CookingJournalService` lands.
 *
 * Read tools are `defaultRiskTier='read'` and `reversible=false` — they
 * never escalate beyond `read` in `RiskClassifier`.
 *
 * Each handler runs with the per-request `ToolExecutionContext`, but
 * delegates DB access to `MemoryService` (which holds the admin client
 * with explicit user_id filters — defence in depth on top of RLS).
 */
import type { ToolHandler, ToolHandlerRegistry } from './types.js';
import type { MemoryService, AssistantMemoryItem } from '../MemoryService.js';
import type { CookingJournalService } from '../../cooking/CookingJournalService.js';
import type {
  ForgetMemoryArgs,
  ReadUserMemoriesArgs,
  RecordRecipeFeedbackArgs,
  RememberPreferenceArgs,
  SearchConversationHistoryArgs,
  UpdateResponseStyleArgs,
} from '../schemas/tools.js';

export interface MemoryHandlerDeps {
  memoryService: MemoryService;
  /** PRP-223 PR7 — dedicated service for cooking_journal_entries (replaces
   *  the direct admin-client write that PR5 had as a placeholder). */
  cookingJournal: CookingJournalService;
}

interface MemoryView {
  id: string;
  kind: string;
  scope: string;
  content: string;
  sensitivity: string;
  confidence: number;
  last_used_at: string | null;
}

function toView(row: AssistantMemoryItem): MemoryView {
  return {
    id: row.id,
    kind: row.kind,
    scope: row.scope,
    content: row.content,
    sensitivity: row.sensitivity,
    confidence: row.confidence,
    last_used_at: row.last_used_at,
  };
}

class ReadUserMemoriesHandler implements ToolHandler<ReadUserMemoriesArgs> {
  constructor(private readonly deps: MemoryHandlerDeps) {}

  async execute(ctx: { userId: string }, args: ReadUserMemoriesArgs) {
    const limit = args.limit ?? 8;
    const { items } = await this.deps.memoryService.listMemories(ctx.userId, {
      limit: Math.min(limit * 3, 50), // fetch a bit more, then filter & cap
      status: 'active',
      kind: args.kind,
    });
    let filtered = items;
    if (args.query) {
      const q = args.query.toLowerCase();
      filtered = filtered.filter(m =>
        (m.content ?? '').toLowerCase().includes(q) ||
        (m.normalized_content ?? '').toLowerCase().includes(q),
      );
    }
    const top = filtered.slice(0, limit);
    return { result: { memories: top.map(toView) } };
  }
}

class SearchConversationHistoryHandler implements ToolHandler<SearchConversationHistoryArgs> {
  constructor(private readonly deps: MemoryHandlerDeps) {}

  async execute(ctx: { userId: string }, args: SearchConversationHistoryArgs) {
    const limit = args.limit ?? 10;
    // V1: client-side filtering over the most recent conversations'
    // messages. ILIKE in SQL would be tighter but PRP-223 §7 keeps
    // pg_trgm optional, so we stay portable.
    const { items: conversations } = await this.deps.memoryService.listConversations(
      ctx.userId,
      { limit: 20 },
    );
    const matches: Array<{
      conversation_id: string;
      message_id: string;
      role: string;
      created_at: string;
      snippet: string;
    }> = [];
    const needle = args.query.toLowerCase();
    for (const conv of conversations) {
      const recent = await this.deps.memoryService.getRecentMessages(conv.id, ctx.userId, 50);
      for (const msg of recent) {
        if (msg.content.toLowerCase().includes(needle)) {
          matches.push({
            conversation_id: conv.id,
            message_id: msg.id,
            role: msg.role,
            created_at: msg.created_at,
            snippet: snippet(msg.content, args.query),
          });
          if (matches.length >= limit) break;
        }
      }
      if (matches.length >= limit) break;
    }
    return { result: { matches } };
  }
}

function snippet(content: string, query: string): string {
  const idx = content.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return content.slice(0, 200);
  const start = Math.max(0, idx - 60);
  const end = Math.min(content.length, idx + query.length + 60);
  const head = start > 0 ? '…' : '';
  const tail = end < content.length ? '…' : '';
  return `${head}${content.slice(start, end)}${tail}`;
}

// ---- PRP-223 PR5 — write handlers ---------------------------------------

class RememberPreferenceHandler implements ToolHandler<RememberPreferenceArgs> {
  constructor(private readonly deps: MemoryHandlerDeps) {}
  async execute(ctx: { userId: string }, args: RememberPreferenceArgs) {
    const created = await this.deps.memoryService.createMemory(ctx.userId, {
      kind: args.kind,
      content: args.content,
      normalized_content: args.content.toLowerCase().trim(),
      sensitivity: args.sensitivity ?? 'normal',
      source: 'user_explicit',
      // status is auto-set: active for normal, candidate for health_sensitive
    });
    return {
      result: { memory_id: created.id, status: created.status },
      reversibleAction: { tool: 'forget_memory', args: { memory_id: created.id } },
    };
  }
}

class ForgetMemoryHandler implements ToolHandler<ForgetMemoryArgs> {
  constructor(private readonly deps: MemoryHandlerDeps) {}
  async execute(ctx: { userId: string }, args: ForgetMemoryArgs) {
    const forgotten = await this.deps.memoryService.forgetMemory(args.memory_id, ctx.userId);
    return {
      result: { memory_id: forgotten.id, status: forgotten.status },
      // No reversibleAction: re-promoting a soft-deleted row would be
      // brittle; the user can re-tell the assistant the fact instead.
    };
  }
}

class UpdateResponseStyleHandler implements ToolHandler<UpdateResponseStyleArgs> {
  constructor(private readonly deps: MemoryHandlerDeps) {}
  async execute(ctx: { userId: string }, args: UpdateResponseStyleArgs) {
    // Forget the previous response_style memory (if any), then create
    // the new one. Two-step rather than an UPDATE so the audit trail is
    // explicit and ContextBuilder always reads the freshest row.
    const previous = await this.deps.memoryService.getResponseStyleMemory(ctx.userId);
    if (previous) {
      try {
        await this.deps.memoryService.forgetMemory(previous.id, ctx.userId);
      } catch {
        // best-effort; the create below still wins.
      }
    }
    const created = await this.deps.memoryService.createMemory(ctx.userId, {
      kind: 'response_style',
      content: args.preference,
      normalized_content: args.preference.toLowerCase().trim(),
      sensitivity: 'normal',
      source: 'user_explicit',
    });
    return { result: { memory_id: created.id } };
  }
}

class RecordRecipeFeedbackHandler implements ToolHandler<RecordRecipeFeedbackArgs> {
  constructor(private readonly deps: MemoryHandlerDeps) {}
  async execute(ctx: { userId: string }, args: RecordRecipeFeedbackArgs) {
    const entry = await this.deps.cookingJournal.record(ctx.userId, {
      recipe_id: args.recipe_id ?? null,
      recipe_title: args.recipe_title,
      outcome: args.outcome ?? null,
      rating: args.rating ?? null,
      notes: args.notes ?? null,
      would_cook_again: args.would_cook_again ?? null,
    });
    return {
      result: {
        id: entry.id,
        recipe_id: entry.recipe_id,
        recipe_title: entry.recipe_title,
        outcome: entry.outcome,
        rating: entry.rating,
      },
    };
  }
}

export function registerMemoryHandlers(
  registry: ToolHandlerRegistry,
  deps: MemoryHandlerDeps,
): void {
  registry.register('read_user_memories', new ReadUserMemoriesHandler(deps));
  registry.register('search_conversation_history', new SearchConversationHistoryHandler(deps));
  registry.register('remember_preference', new RememberPreferenceHandler(deps));
  registry.register('forget_memory', new ForgetMemoryHandler(deps));
  registry.register('update_response_style', new UpdateResponseStyleHandler(deps));
  registry.register('record_recipe_feedback', new RecordRecipeFeedbackHandler(deps));
}
