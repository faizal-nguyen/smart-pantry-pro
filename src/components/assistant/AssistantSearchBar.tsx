/**
 * AssistantSearchBar — debounced search over conversation history.
 *
 * PRP-224 PR2 — input + results list panel. Clicking a match navigates
 * to `/assistant?conversation=:id`. Empty state when query.length >= 2
 * and 0 matches.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAssistantHistorySearch } from '@/hooks/useAssistantHistorySearch';

interface AssistantSearchBarProps {
  className?: string;
  /** Limit on the result list. Default 10. */
  limit?: number;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function highlight(snippet: string, query: string): React.ReactNode {
  if (!query) return snippet;
  const lower = snippet.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx < 0) return snippet;
  const end = idx + query.length;
  return (
    <>
      {snippet.slice(0, idx)}
      <mark className="bg-yellow-100 dark:bg-yellow-900/40 text-foreground rounded px-0.5">
        {snippet.slice(idx, end)}
      </mark>
      {snippet.slice(end)}
    </>
  );
}

export default function AssistantSearchBar({
  className,
  limit = 10,
}: AssistantSearchBarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { matches, isLoading, debouncedQuery } = useAssistantHistorySearch(query, { limit });

  const showResults = debouncedQuery.length >= 2;

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="text"
          placeholder="Rechercher dans l'historique…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pl-9 pr-9 h-10"
          aria-label="Rechercher dans l'historique des conversations"
        />
        {query && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => setQuery('')}
            aria-label="Effacer la recherche"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      {showResults && (
        <div className="mt-2 border border-border rounded-lg bg-background shadow-sm max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Recherche…
            </div>
          ) : matches.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">
              Aucun résultat pour « {debouncedQuery} ».
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {matches.map(m => (
                <li key={`${m.source}-${m.message_id}`}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted focus:bg-muted focus:outline-none"
                    onClick={() => {
                      setQuery('');
                      navigate(`/assistant?conversation=${m.conversation_id}`);
                    }}
                  >
                    <p className="text-sm line-clamp-2">
                      {highlight(m.snippet, debouncedQuery)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {m.source === 'summary' ? 'Résumé · ' : ''}
                      {m.role ? `${m.role} · ` : ''}
                      {formatDate(m.created_at)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
