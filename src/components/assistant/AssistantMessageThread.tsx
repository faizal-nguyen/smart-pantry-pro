/**
 * AssistantMessageThread — fil messages d'une conversation.
 *
 * PRP-233 PR2 — render user/assistant/tool messages avec leur audio
 * transcript optionnel. Layout : user à droite, assistant à gauche,
 * tool/system discrets. Cards d'actions inline si action_log_ids
 * remonte un mapping (déferré PR4+, V1 affiche juste les ids count).
 */
import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Bot, User as UserIcon, Cog } from 'lucide-react';

import type { AssistantMessage } from '@/services/assistantApi';

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
    <div
      className={cn(
        'flex gap-2 my-3',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      {isAssistant && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" aria-hidden="true" />
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
        <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
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
