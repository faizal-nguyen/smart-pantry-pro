/**
 * AssistantDashboard — page /assistant.
 *
 * PRP-233 PR2 — surface conversation MVP :
 *  - lit `?conversation=:id` depuis l'URL
 *  - rend AssistantConversationSurface (fil + composer inline)
 *  - sidebar memory + history (desktop md+), masquée mobile
 * PRP-224 PR3 — lit `?mode=` depuis l'URL, le passe au composer ;
 *  toute modification met à jour l'URL + persiste côté backend.
 */
import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { useAgeAdaptiveUI } from '@/hooks/useFamilyMode';
import MemoryPanel from '@/components/assistant/MemoryPanel';
import ConversationHistoryList from '@/components/assistant/ConversationHistoryList';
import AssistantConversationSurface from '@/components/assistant/AssistantConversationSurface';
import type { AssistantConversationMode } from '@/services/assistantApi';

const VALID_MODES: readonly AssistantConversationMode[] = [
  'general',
  'kitchen',
  'shopping',
  'inventory',
  'recipes',
  'nutrition',
  'cooking',
];

function normaliseMode(raw: string | null): AssistantConversationMode {
  if (!raw) return 'general';
  return (VALID_MODES as readonly string[]).includes(raw)
    ? (raw as AssistantConversationMode)
    : 'general';
}

const AssistantDashboard: React.FC = () => {
  // PRP-238 PR2 — AuthenticatedLayout garantit l'auth.
  const user = useAuthenticatedUser();
  void user;
  const { adaptiveInterface, getStyleClasses } = useAgeAdaptiveUI();
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationId = searchParams.get('conversation');
  const mode = useMemo(() => normaliseMode(searchParams.get('mode')), [searchParams]);

  const handleModeChange = (next: AssistantConversationMode) => {
    setSearchParams(
      prev => {
        const params = new URLSearchParams(prev);
        if (next === 'general') {
          params.delete('mode');
        } else {
          params.set('mode', next);
        }
        return params;
      },
      { replace: true },
    );
  };

  return (
    <div
      className={cn(
        'culinary-page container mx-auto p-4 sm:p-6 space-y-4',
        getStyleClasses(),
        adaptiveInterface.buttonSpacing === 'spacious' && 'space-y-12',
      )}
    >
        <header className="flex flex-col space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h1
              className={cn(
                'font-semibold text-foreground',
                adaptiveInterface.largerText ? 'text-3xl' : 'text-2xl',
              )}
            >
              Assistant
            </h1>
            <Link to="/settings?section=assistant-memory" className="inline-flex min-h-11 items-center text-sm underline">Mémoire</Link>
          </div>
          <p className="text-sm text-muted-foreground">
            Pose ta question ci-dessous ou utilise le bouton micro.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <AssistantConversationSurface
            conversationId={conversationId}
            mode={mode}
            onModeChange={handleModeChange}
          />

          <aside className="space-y-6 hidden lg:block">
            <MemoryPanel />
            <ConversationHistoryList />
          </aside>
        </div>

      {/* Mobile : memory + history sous le fil */}
      <details className="lg:hidden"><summary className="min-h-11 cursor-pointer text-sm">Retrouver une conversation</summary><ConversationHistoryList /></details>
    </div>
  );
};

export default AssistantDashboard;
