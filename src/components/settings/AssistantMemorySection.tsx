/**
 * PRP-235 PR2 — AssistantMemorySection.
 *
 * Section Settings « Assistant & mémoire ». Monte les composants
 * PRP-223 existants tels quels :
 *   - `MemoryPanel` — liste des memories active + candidates avec
 *     les affordances confirm / oublier + disclaimer health_sensitive
 *   - `ConversationHistoryList` (limit=5, showSearch=false) — un
 *     aperçu compact des dernières conversations cliquables
 *
 * Aucune duplication de logique mémoire ici — single source of truth
 * vit dans `useAssistantMemories` / `useAssistantConversations`.
 * Lien direct vers `/assistant` pour la conversation complète.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, MessageCircle, MessageSquare } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import MemoryPanel from '@/components/assistant/MemoryPanel';
import ConversationHistoryList from '@/components/assistant/ConversationHistoryList';

export default function AssistantMemorySection() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {/* Header + lien vers la conversation complète */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" aria-hidden="true" />
            Assistant &amp; mémoire
          </CardTitle>
          <CardDescription>
            Confirmer, oublier ou corriger ce que l&apos;assistant retient de toi.
            Les souvenirs sensibles (allergies, santé) gardent un encart dédié.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/assistant')}
            className="gap-2"
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Ouvrir l&apos;assistant
          </Button>
        </CardContent>
      </Card>

      {/* MemoryPanel PRP-223 PR6 — gère active/candidate + actions
          (confirm, oublier) + disclaimer health_sensitive. */}
      <MemoryPanel />

      {/* Aperçu compact des conversations récentes — pas de search
          ici (cas d'usage dans la page assistant complète) ;
          juste les 5 dernières pour rejoindre rapidement un
          échange. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Conversations récentes
          </CardTitle>
          <CardDescription>
            Aperçu — la liste complète vit dans la page Assistant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConversationHistoryList limit={5} showSearch={false} />
        </CardContent>
      </Card>
    </div>
  );
}
