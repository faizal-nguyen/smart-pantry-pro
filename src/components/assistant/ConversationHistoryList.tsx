/**
 * PRP-223 PR6 — ConversationHistoryList.
 *
 * Minimal list of recent assistant conversations. Click → navigates to
 * `/assistant/chat?conversation=:id` which PRP-224's full ChatGPT-like UX
 * will pick up. Until then, the legacy AssistantAI page receives the
 * param and can simply ignore it.
 */
import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useAssistantConversations } from '@/hooks/useAssistantConversations';

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function ConversationHistoryList() {
  const navigate = useNavigate();
  const { conversations, isLoading } = useAssistantConversations({ status: 'active', limit: 8 });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="Aucune conversation"
        description="Tes échanges avec l'assistant apparaîtront ici."
      />
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          Conversations récentes
        </h3>
        <ul className="divide-y divide-border">
          {conversations.map(c => (
            <li key={c.id} className="py-2">
              <Button
                variant="ghost"
                className="w-full justify-start h-auto py-2"
                onClick={() => navigate(`/assistant/chat?conversation=${c.id}`)}
              >
                <div className="text-left">
                  <p className="font-medium truncate">
                    {c.title ?? 'Conversation sans titre'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(c.last_message_at ?? c.created_at)} · {c.mode}
                  </p>
                </div>
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
