/**
 * PRP-223 PR4 — ContextBuilder.
 *
 * Assembles the short memory block injected into the LLM system prompt
 * before each turn. Budget (PRP-223 §8.3):
 *   - max 8 active memories  (priorisé sur last_used_at then updated_at)
 *   - max 1 conversation summary
 *   - max 10 recent messages
 *   - non-expired session_context
 *   - aim for ~1200 tokens (heuristic: 4 chars ≈ 1 token)
 *
 * The output is rendered as a single string ready to be inlined into
 * the existing `AGENT_SYSTEM_PROMPT` via VoiceAgentService.
 */
import type {
  AssistantConversationSummary,
  AssistantMemoryItem,
  AssistantMessage,
  AssistantSessionContext,
  MemoryService,
} from './MemoryService.js';

export const CONTEXT_BUILDER_LIMITS = {
  maxMemories: 8,
  maxRecentMessages: 10,
  maxTokensEstimate: 1200,
} as const;

const CHARS_PER_TOKEN = 4; // OpenAI rough average for FR/EN.

export interface MemoryContextBlock {
  responseStyle: string | null;
  memoriesText: string;
  summaryText: string | null;
  recentMessagesText: string;
  sessionContextText: string;
  /** Aggregated string ready to inject into the system prompt. */
  combinedText: string;
  tokenEstimate: number;
}

const EMPTY_BLOCK: MemoryContextBlock = {
  responseStyle: null,
  memoriesText: '',
  summaryText: null,
  recentMessagesText: '',
  sessionContextText: '',
  combinedText: '',
  tokenEstimate: 0,
};

export class ContextBuilder {
  constructor(private readonly memory: MemoryService) {}

  async build(userId: string, conversationId?: string | null): Promise<MemoryContextBlock> {
    // Parallelise the reads — they don't depend on each other.
    const [responseStyleMem, topMemories, summary, recentMessages, sessionContext] =
      await Promise.all([
        safe(() => this.memory.getResponseStyleMemory(userId), null),
        safe(() => this.memory.getTopActiveMemories(userId, CONTEXT_BUILDER_LIMITS.maxMemories), []),
        conversationId
          ? safe(() => this.memory.getLatestSummary(conversationId, userId), null)
          : Promise.resolve<AssistantConversationSummary | null>(null),
        conversationId
          ? safe(
              () =>
                this.memory.getRecentMessages(
                  conversationId,
                  userId,
                  CONTEXT_BUILDER_LIMITS.maxRecentMessages,
                ),
              [] as AssistantMessage[],
            )
          : Promise.resolve<AssistantMessage[]>([]),
        safe(
          () =>
            this.memory.getActiveSessionContext(userId, {
              conversationId: conversationId ?? undefined,
            }),
          [] as AssistantSessionContext[],
        ),
      ]);

    const responseStyle = responseStyleMem
      ? formatResponseStyle(responseStyleMem)
      : null;

    const filteredMemories = topMemories
      .filter(m => m.kind !== 'response_style') // response_style rendered separately
      .slice(0, CONTEXT_BUILDER_LIMITS.maxMemories);

    const memoriesText = formatMemories(filteredMemories);
    const summaryText = summary ? `Résumé précédent : ${summary.summary}` : null;
    const recentMessagesText = formatRecentMessages(recentMessages);
    const sessionContextText = formatSessionContext(sessionContext);

    const combinedParts = [
      responseStyle,
      memoriesText || null,
      summaryText,
      recentMessagesText || null,
      sessionContextText || null,
    ].filter(Boolean) as string[];

    let combinedText = combinedParts.join('\n\n');
    let tokenEstimate = Math.ceil(combinedText.length / CHARS_PER_TOKEN);

    // Truncate from the tail (recent messages first) if we overshoot the budget.
    if (tokenEstimate > CONTEXT_BUILDER_LIMITS.maxTokensEstimate) {
      combinedText = truncateToTokens(combinedText, CONTEXT_BUILDER_LIMITS.maxTokensEstimate);
      tokenEstimate = Math.ceil(combinedText.length / CHARS_PER_TOKEN);
    }

    if (!combinedText) return EMPTY_BLOCK;

    return {
      responseStyle,
      memoriesText,
      summaryText,
      recentMessagesText,
      sessionContextText,
      combinedText,
      tokenEstimate,
    };
  }
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

function formatResponseStyle(mem: AssistantMemoryItem): string {
  return `Style de réponse préféré : ${mem.content}.`;
}

function formatMemories(memories: AssistantMemoryItem[]): string {
  if (memories.length === 0) return '';
  const lines = memories.map(m => {
    const tag = formatMemoryTag(m);
    return `• ${tag} ${m.content}`;
  });
  return ['Ce que je sais de l\'utilisateur :', ...lines].join('\n');
}

function formatMemoryTag(m: AssistantMemoryItem): string {
  switch (m.kind) {
    case 'preference':
      return '[goût]';
    case 'negative_preference':
      return '[à éviter]';
    case 'habit':
      return '[habitude]';
    case 'cooking_style':
      return '[cuisine]';
    case 'diet_goal':
      return '[objectif diet]';
    case 'constraint':
      return '[contrainte]';
    case 'recipe_feedback':
      return '[retour recette]';
    case 'shopping_pattern':
      return '[courses]';
    default:
      return '[note]';
  }
}

function formatRecentMessages(messages: AssistantMessage[]): string {
  if (messages.length === 0) return '';
  const lines = messages.map(m => {
    const role = m.role === 'assistant' ? 'Assistant' : m.role === 'user' ? 'Utilisateur' : m.role;
    const content = m.content.length > 240 ? `${m.content.slice(0, 240)}…` : m.content;
    return `${role} : ${content}`;
  });
  return ['Derniers échanges :', ...lines].join('\n');
}

function formatSessionContext(rows: AssistantSessionContext[]): string {
  if (rows.length === 0) return '';
  const lines = rows.map(r => {
    const valueStr = typeof r.value === 'string' ? r.value : JSON.stringify(r.value);
    return `• ${r.key} = ${valueStr}`;
  });
  return ['Contexte temporaire :', ...lines].join('\n');
}

function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1)}…`;
}
