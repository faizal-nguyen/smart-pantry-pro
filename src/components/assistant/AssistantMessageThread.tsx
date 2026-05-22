/**
 * AssistantMessageThread — fil messages d'une conversation.
 *
 * PRP-233 PR2 — render user/assistant/tool messages avec leur audio
 * transcript optionnel. Layout : user à droite, assistant à gauche,
 * tool/system discrets. Cards d'actions inline si action_log_ids
 * remonte un mapping (déferré PR4+, V1 affiche juste les ids count).
 */
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Bot, User as UserIcon, Cog, Sparkles, BookmarkPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { AssistantMessage } from '@/services/assistantApi';
import AssistantRecipeProposals from './AssistantRecipeProposals';
import AddChefIdeaDialog from './AddChefIdeaDialog';

/**
 * PRP-239 PR4 §10.4 — split a chef synthesis text on the off-DB header.
 * Returns { db, offDb }. When the header isn't present, the whole text
 * lands in `db` and `offDb` is null. Detection is case-insensitive
 * + accent-insensitive, and matches the exact phrase the chef system
 * prompt instructs the LLM to use.
 */
function splitChefSections(text: string): { db: string; offDb: string | null } {
  const headerRegex = /(?:^|\n)\s*[*#-]*\s*Id[eé]es?\s+chef\s+hors\s+biblioth[eè]que[*:.]*\s*\n?/i;
  const match = headerRegex.exec(text);
  if (!match) return { db: text, offDb: null };
  const db = text.slice(0, match.index).trimEnd();
  const offDb = text.slice(match.index + match[0].length).trim();
  if (!offDb) return { db: text, offDb: null };
  return { db, offDb };
}

/**
 * Inner component that renders the chef synthesis. Extracted so it can
 * own the AddChefIdeaDialog `open` state — keeping it close to the
 * off-DB section + button (PR-D wires the conversion CTA here).
 */
function ChefContent({
  content,
  conversationId,
}: {
  content: string;
  conversationId?: string;
}): React.ReactElement {
  const { db, offDb } = splitChefSections(content);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!offDb) {
    return <p className="whitespace-pre-wrap text-sm">{content}</p>;
  }
  return (
    <>
      <p className="whitespace-pre-wrap text-sm">{db}</p>
      <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          Idées chef hors bibliothèque
        </p>
        <p className="whitespace-pre-wrap text-sm opacity-90">{offDb}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setDialogOpen(true)}
        >
          <BookmarkPlus className="h-3 w-3 mr-1" />
          Ajouter à mes recettes
        </Button>
      </div>
      <AddChefIdeaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        ideaText={offDb}
        conversationId={conversationId}
      />
    </>
  );
}

interface AssistantMessageThreadProps {
  messages: AssistantMessage[];
  isLoading?: boolean;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({ msg }: { msg: AssistantMessage }) {
  const isUser = msg.role === 'user';
  const isAssistant = msg.role === 'assistant';
  const isTool = msg.role === 'tool';

  if (isTool || msg.role === 'system') {
    // Discrets pour les rôles non conversationnels.
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground my-1">
        <Cog className="h-3 w-3" aria-hidden="true" />
        <span className="italic">{msg.content}</span>
      </div>
    );
  }

  return (
    <div className="my-3">
      <div
        className={cn(
          'flex gap-2',
          isUser ? 'justify-end' : 'justify-start',
        )}
      >
        {/* PRP-237 PR3 — assistant avatar circle in accent-ai (electric
            blue) to mark the IA presence, while the user message bubble
            keeps the saffron primary for the user voice. */}
        {isAssistant && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-ai/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-accent-ai" aria-hidden="true" />
          </div>
        )}
        <div
          className={cn(
            'max-w-[80%] rounded-2xl px-4 py-2',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted text-foreground rounded-tl-sm',
          )}
        >
          {msg.content_format === 'transcript' && (
            <p className="text-xs italic opacity-70 mb-1">Transcrit depuis l'audio</p>
          )}
          {/* PRP-239 PR4 §10.4 — visual separation of off-DB chef ideas.
              PR-D adds the "Ajouter à mes recettes" CTA on the off-DB
              section so users can convert chef suggestions into real
              library entries via RecipePolicySanitizer + RPC. */}
          {isAssistant && msg.content
            ? <ChefContent content={msg.content} conversationId={msg.conversation_id} />
            : <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
          }
          <p
            className={cn(
              'text-[10px] mt-1 opacity-60',
              isUser ? 'text-right' : 'text-left',
            )}
          >
            {formatTime(msg.created_at)}
            {msg.action_log_ids.length > 0 && (
              <span> · {msg.action_log_ids.length} action{msg.action_log_ids.length > 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
        {isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <UserIcon className="h-4 w-4" aria-hidden="true" />
          </div>
        )}
      </div>
      {isAssistant && (
        <div className="ml-10">
          <AssistantRecipeProposals metadata={msg.metadata} />
        </div>
      )}
    </div>
  );
}

export default function AssistantMessageThread({
  messages,
  isLoading,
}: AssistantMessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="space-y-3 py-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded-2xl max-w-[60%]" />
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
        <p className="text-sm">Démarre la conversation ci-dessous.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1" role="log" aria-live="polite" aria-relevant="additions">
      {messages.map(msg => (
        <MessageBubble key={msg.id} msg={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
