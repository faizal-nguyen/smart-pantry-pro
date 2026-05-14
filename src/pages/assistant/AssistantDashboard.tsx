/**
 * AssistantDashboard — page /assistant.
 *
 * PRP-233 PR2 — surface conversation MVP :
 *  - lit `?conversation=:id` depuis l'URL
 *  - rend AssistantConversationSurface (fil + composer inline)
 *  - sidebar memory + history (desktop md+), masquée mobile
 *
 * PR3 ajoutera le sticky FAB 2h. PRP-224 portera le polish ChatGPT-like.
 */
import React, { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useAgeAdaptiveUI } from '@/hooks/useFamilyMode';
import AppNavigation from '@/components/navigation/AppNavigation';
import { PageLoader } from '@/components/layout/PageLoader';
import MemoryPanel from '@/components/assistant/MemoryPanel';
import ConversationHistoryList from '@/components/assistant/ConversationHistoryList';
import AssistantConversationSurface from '@/components/assistant/AssistantConversationSurface';

const AssistantDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { adaptiveInterface, getStyleClasses } = useAgeAdaptiveUI();
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get('conversation');

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };
    getUser();
  }, []);

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AppNavigation user={user}>
      <div
        className={cn(
          'container mx-auto p-4 sm:p-6 space-y-6',
          getStyleClasses(),
          adaptiveInterface.buttonSpacing === 'spacious' && 'space-y-12',
        )}
      >
        <header className="flex flex-col space-y-2">
          <div className="flex items-center gap-3">
            <Bot
              className={cn(
                'text-primary',
                adaptiveInterface.iconSize === 'large' ? 'w-8 h-8' : 'w-6 h-6',
              )}
              aria-hidden="true"
            />
            <h1
              className={cn(
                'font-bold text-foreground',
                adaptiveInterface.largerText ? 'text-3xl' : 'text-2xl',
              )}
            >
              Assistant
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Pose ta question ci-dessous ou utilise le bouton micro.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <AssistantConversationSurface conversationId={conversationId} />

          <aside className="space-y-6 hidden lg:block">
            <MemoryPanel />
            <ConversationHistoryList />
          </aside>
        </div>

        {/* Mobile : memory + history sous le fil */}
        <div className="lg:hidden space-y-6">
          <MemoryPanel />
          <ConversationHistoryList />
        </div>
      </div>
    </AppNavigation>
  );
};

export default AssistantDashboard;
