/**
 * AssistantDashboard — page Assistant (/assistant).
 *
 * PRP-233 PR1 — cleanup vitrine : retire le wording "Chat IA"/"IA Rapide"
 * /"Assistant IA"/"Actions Rapides" et les 2 quick actions qui pointaient
 * vers `/assistant/chat`. PR2 ajoutera la surface conversation MVP
 * (composer inline + fil messages). Pour PR1, la page ne montre que
 * MemoryPanel + ConversationHistoryList (PRP-223 PR6).
 */
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useAgeAdaptiveUI } from '@/hooks/useFamilyMode';
import AppNavigation from '@/components/navigation/AppNavigation';
import { PageLoader } from '@/components/layout/PageLoader';
import MemoryPanel from '@/components/assistant/MemoryPanel';
import ConversationHistoryList from '@/components/assistant/ConversationHistoryList';

const AssistantDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { adaptiveInterface, getStyleClasses } = useAgeAdaptiveUI();

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
          'container mx-auto p-6 space-y-8',
          getStyleClasses(),
          adaptiveInterface.buttonSpacing === 'spacious' && 'space-y-12',
        )}
      >
        <header className="flex flex-col space-y-4">
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
                adaptiveInterface.largerText ? 'text-4xl' : 'text-3xl',
              )}
            >
              Assistant
            </h1>
          </div>
          <p
            className={cn(
              'text-muted-foreground',
              adaptiveInterface.largerText ? 'text-lg' : 'text-base',
            )}
          >
            Pose-moi une question avec le bouton micro en bas à droite, ou ouvre une
            conversation existante.
          </p>
        </header>

        {/* PRP-223 PR6 — memory + conversations récentes. Empty states gérés
            par les composants eux-mêmes. PR2 ajoutera la conversation surface
            inline (composer + fil messages). */}
        <div className="space-y-6">
          <MemoryPanel />
          <ConversationHistoryList />
        </div>
      </div>
    </AppNavigation>
  );
};

export default AssistantDashboard;
