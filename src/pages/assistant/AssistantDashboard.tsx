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
import KitchenPageHeader from '@/components/layout/KitchenPageHeader';
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
        'culinary-page kitchen-page kitchen-assistant-page',
        getStyleClasses(),
        adaptiveInterface.buttonSpacing === 'spacious' && 'space-y-12',
      )}
    >
        <KitchenPageHeader title="Assistant" description="Un coup de main pour cuisiner avec ce que tu as." actions={<Link to="/settings?section=assistant-memory" className="kitchen-inline-link">Ma mémoire</Link>}/>

        <div className="kitchen-assistant-layout">
          <AssistantConversationSurface
            conversationId={conversationId}
            mode={mode}
            onModeChange={handleModeChange}
          />

          <aside className="kitchen-assistant-sidebar">
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
