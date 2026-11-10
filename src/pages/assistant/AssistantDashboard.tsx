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
import React, { useMemo,useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { useAgeAdaptiveUI } from '@/hooks/useFamilyMode';
import { useResponsive } from '@/hooks/useResponsive';
import MemoryPanel from '@/components/assistant/MemoryPanel';
import KitchenPageHeader from '@/components/layout/KitchenPageHeader';
import ConversationHistoryList from '@/components/assistant/ConversationHistoryList';
import AssistantConversationSurface from '@/components/assistant/AssistantConversationSurface';
import type { AssistantConversationMode } from '@/services/assistantApi';
import { Button } from '@/components/ui/button';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from '@/components/ui/dialog';

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
  const [historyOpen,setHistoryOpen]=useState(false);
  const [newThread,setNewThread]=useState(0);
  const {viewport}=useResponsive();
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
      data-compact={viewport.availableHeight<600}
      className={cn(
        'culinary-page kitchen-page kitchen-assistant-page',
        getStyleClasses(),
        adaptiveInterface.buttonSpacing === 'spacious' && 'space-y-12',
      )}
    >
        <KitchenPageHeader title="Assistant" description="Un coup de main pour cuisiner avec ce que tu as." actions={<div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" aria-label="Nouvelle conversation" onClick={()=>{ setNewThread(value=>value+1);setSearchParams(mode==='general' ? {} : {mode}); }}><span className="sm:hidden">Nouveau</span><span className="hidden sm:inline">Nouvelle conversation</span></Button>
          <Button variant="outline" className="lg:hidden" onClick={()=>setHistoryOpen(true)}>Conversations</Button>
          <Link to="/settings?section=assistant-memory" aria-label="Ma mémoire" className="kitchen-inline-link"><span className="sm:hidden">Mémoire</span><span className="hidden sm:inline">Ma mémoire</span></Link>
        </div>}/>

        <div className="kitchen-assistant-layout">
          <AssistantConversationSurface
            key={`${user.id}:${newThread}`}
            conversationId={conversationId}
            mode={mode}
            onModeChange={handleModeChange}
          />

          <aside className="kitchen-assistant-sidebar">
            <MemoryPanel />
            <ConversationHistoryList />
          </aside>
        </div>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}><DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>Retrouver une conversation</DialogTitle><DialogDescription>Choisis un échange pour le lire et le reprendre.</DialogDescription></DialogHeader>
        <ConversationHistoryList onSelect={()=>setHistoryOpen(false)} />
      </DialogContent></Dialog>
    </div>
  );
};

export default AssistantDashboard;
