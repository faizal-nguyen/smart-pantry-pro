/**
 * ConversationHistoryList — sidebar listing of recent conversations.
 *
 * PRP-223 PR6 — first version: list + click → navigate.
 * PRP-224 PR2 — orchestrateur léger : header + AssistantSearchBar
 * (toggleable) + ConversationListItem (chacun avec rename/archive/
 * delete via dropdown menu).
 */
import React from 'react';
import { MessageCircle } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useAssistantConversations } from '@/hooks/useAssistantConversations';

import AssistantSearchBar from './AssistantSearchBar';
import ConversationListItem from './ConversationListItem';

interface ConversationHistoryListProps {
  /** Show the inline search bar at the top. Default: true. */
  showSearch?: boolean;
  /** Max conversations to fetch in the recent list. Default 8. */
  limit?: number;
}

export default function ConversationHistoryList({
  showSearch = true,
  limit = 8,
}: ConversationHistoryListProps) {
  const { conversations, isLoading } = useAssistantConversations({
    status: 'active',
    limit,
  });

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

  const isEmpty = conversations.length === 0;

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" aria-hidden="true" />
          Conversations
        </h3>

        {showSearch && <AssistantSearchBar limit={10} />}

        {isEmpty ? (
          <EmptyState
            icon={MessageCircle}
            title="Aucune conversation"
            description="Tes échanges avec l'assistant apparaîtront ici."
          />
        ) : (
          <ul className="divide-y divide-border">
            {conversations.map(c => (
              <ConversationListItem key={c.id} conversation={c} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
