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
import { BookOpen, MessageCircle, MessageSquare } from 'lucide-react';

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
            <BookOpen className="h-5 w-5" aria-hidden="true" />
            Ce que l’assistant retient
          </CardTitle>
          <CardDescription>
            Voir et confirmer les souvenirs enregistrés, ou demander leur oubli.
            Les souvenirs sensibles (allergies, santé) gardent un encart dédié.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/assistant')}
            className="gap-2 min-h-11"
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Ouvrir l&apos;assistant
          </Button>
          <Button type="button" variant="ghost" className="min-h-11" onClick={()=>navigate('/settings?section=cooking')}>Voir mon profil alimentaire</Button>
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
            Retrouve un échange ou ouvre la liste complète dans l’assistant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConversationHistoryList limit={5} showSearch={false} />
        </CardContent>
      </Card>
    </div>
  );
}
