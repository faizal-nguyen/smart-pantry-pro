import { randomUUID } from 'node:crypto';
import { classifyMemoryFact, normalizeMemoryText } from '@smart/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../types/supabase.js';
import type { ToolHandler, ToolHandlerRegistry, ToolExecutionContext } from './types.js';
import type { MemoryService } from '../MemoryService.js';
import { modelMemoryView, sameMemoryPolicy } from '../MemoryPolicy.js';
import { memoryRpc } from '../memoryRpc.js';
import type { CookingJournalService } from '../../cooking/CookingJournalService.js';
import type { ForgetMemoryArgs, ReadUserMemoriesArgs, RecordRecipeFeedbackArgs, RememberPreferenceArgs,
  SearchConversationHistoryArgs, UpdateResponseStyleArgs } from '../schemas/tools.js';
export interface MemoryHandlerDeps { memoryService: MemoryService; cookingJournal: CookingJournalService }

class ReadUserMemoriesHandler implements ToolHandler<ReadUserMemoriesArgs> {
  constructor(private readonly deps: MemoryHandlerDeps) {}
  async execute(ctx: ToolExecutionContext, args: ReadUserMemoriesArgs) {
    const policy = await this.deps.memoryService.readPolicySafe(ctx.userId);
    if (!policy) return { result: { memories: [], policy_revision: null } };
    const rows = await this.deps.memoryService.modelMemories(ctx.userId, policy, 200, 'model_tool');
    const filtered = rows.filter(m => (!args.kind || m.kind === args.kind) && (!args.query || m.content.toLowerCase().includes(args.query.toLowerCase())));
    if (!sameMemoryPolicy(policy, await this.deps.memoryService.readPolicySafe(ctx.userId))) return { result: { memories: [], policy_revision: null } };
    return { result: { memories: filtered.slice(0, args.limit ?? 8).map(modelMemoryView), policy_revision: policy.revision } };
  }
}
class SearchConversationHistoryHandler implements ToolHandler<SearchConversationHistoryArgs> {
  constructor(private readonly deps: MemoryHandlerDeps) {}
  async execute(ctx: ToolExecutionContext, args: SearchConversationHistoryArgs) {
    const policy = await this.deps.memoryService.readPolicySafe(ctx.userId);
    if (!policy?.saveHistory) return { result: { matches: [], policy_revision: null } };
    const { items } = await this.deps.memoryService.listConversations(ctx.userId, { limit: 20 });
    const matches: Array<{ conversation_id: string; message_id: string; role: string; snippet: string }> = [];
    for (const conv of items) {
      const { messages, summary } = await this.deps.memoryService.modelArtifacts(ctx.userId, policy, conv.id, 100);
      for (const row of messages) if (row.content.toLowerCase().includes(args.query.toLowerCase()))
        matches.push({ conversation_id: conv.id, message_id: row.id, role: row.role, snippet: row.content.slice(0, 240) });
      if (summary?.summary.toLowerCase().includes(args.query.toLowerCase())) matches.push({
        conversation_id: conv.id, message_id: summary.id, role: 'summary', snippet: summary.summary.slice(0, 240),
      });
      if (matches.length >= (args.limit ?? 10)) break;
    }
    if (!sameMemoryPolicy(policy, await this.deps.memoryService.readPolicySafe(ctx.userId))) return { result: { matches: [], policy_revision: null } };
    return { result: { matches: matches.slice(0, args.limit ?? 10), policy_revision: policy.revision } };
  }
}
class RememberPreferenceHandler implements ToolHandler<RememberPreferenceArgs> {
  constructor(private readonly deps: MemoryHandlerDeps) {}
  async execute(ctx: ToolExecutionContext, args: RememberPreferenceArgs) {
    const original = classifyMemoryFact(ctx.requestText ?? '');
    // A model-generated instruction cannot make a transient/inferred input durable.
    if (!original || original.destination === 'session' || original.destination === 'feedback')
      return { result: { status: 'not_saved', reason: 'explicit_fact_required' } };
    const result = await this.deps.memoryService.saveExtractedFact(ctx.userId, ctx.commandId ?? randomUUID(),
      ctx.requestText!, args.kind, original.source, ctx.userClient as SupabaseClient<Database>, 'tool');
    return { result };
  }
}
class ForgetMemoryHandler implements ToolHandler<ForgetMemoryArgs> {
  constructor(private readonly deps: MemoryHandlerDeps) {}
  async execute(ctx: ToolExecutionContext, args: ForgetMemoryArgs) {
    const request = normalizeMemoryText(ctx.requestText ?? '');
    const negated = /\b(?:n|ne)\s+(?:l\s+)?(?:oublie|efface|supprime)z?\b.{0,40}\b(?:pas|jamais|rien)\b/.test(request);
    if (negated || !/\b(?:oublie|efface|supprime)z?\b/.test(request)) throw new Error('MEMORY_FORGET_INTENT_REQUIRED');
    const receipt = ctx.commandId ? await this.deps.memoryService.getCommandReceipt(ctx.userId, ctx.commandId) : null;
    if (receipt) return { result: receipt };
    const row = await this.deps.memoryService.getMemory(args.memory_id, ctx.userId);
    const policy = await this.deps.memoryService.readPolicy(ctx.userId);
    return { result: await this.deps.memoryService.executeCommand(ctx.userId, {
      command_id: ctx.commandId ?? randomUUID(), operation: 'forget', memory_id: row.id,
      expected_version: row.version ?? 0, expected_revision: policy.revision,
    }, ctx.userClient as SupabaseClient<Database>) };
  }
}
class UpdateResponseStyleHandler implements ToolHandler<UpdateResponseStyleArgs> {
  constructor(private readonly deps: MemoryHandlerDeps) {}
  async execute(ctx: ToolExecutionContext, args: UpdateResponseStyleArgs) {
    if (!/souviens|retiens|memorise|mémorise|réponds|reponds|style de reponse|style de réponse/iu.test(ctx.requestText ?? ''))
      return { result: { status: 'not_saved', reason: 'explicit_fact_required' } };
    const result = await this.deps.memoryService.saveExtractedFact(ctx.userId, ctx.commandId ?? randomUUID(), ctx.requestText!,
      'response_style', 'user_explicit', ctx.userClient as SupabaseClient<Database>, 'tool');
    return { result };
  }
}
class RecordRecipeFeedbackHandler implements ToolHandler<RecordRecipeFeedbackArgs> {
  constructor(private readonly deps: MemoryHandlerDeps) {}
  async execute(ctx: ToolExecutionContext, args: RecordRecipeFeedbackArgs) {
    const { data, error } = await memoryRpc(ctx.userClient as SupabaseClient<Database>, 'record_assistant_recipe_feedback', {
      p_feedback: { ...args, command_id: ctx.commandId ?? randomUUID() },
    });
    if (error) throw new Error('RECIPE_FEEDBACK_NOT_SAVED');
    return { result: data };
  }
}
export function registerMemoryHandlers(registry: ToolHandlerRegistry, deps: MemoryHandlerDeps): void {
  registry.register('read_user_memories', new ReadUserMemoriesHandler(deps));
  registry.register('search_conversation_history', new SearchConversationHistoryHandler(deps));
  registry.register('remember_preference', new RememberPreferenceHandler(deps));
  registry.register('forget_memory', new ForgetMemoryHandler(deps));
  registry.register('update_response_style', new UpdateResponseStyleHandler(deps));
  registry.register('record_recipe_feedback', new RecordRecipeFeedbackHandler(deps));
}
