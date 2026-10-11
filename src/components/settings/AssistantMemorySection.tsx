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
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';
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
  const privacy = usePrivacySettings();
  const queryClient = useQueryClient();
  const ownerRef = useRef(privacy.owner); ownerRef.current = privacy.owner;
  const [notice, setNotice] = useState<{ owner: string | undefined; text: string } | null>(null);
  const toggleMemory = async (enabled: boolean) => {
    const actor = privacy.owner;
    setNotice(null);
    const saved = await privacy.updateSettings({ assistantMemoryEnabled: enabled });
    if (ownerRef.current !== actor) return;
    setNotice({ owner: actor, text: saved ? enabled ? 'Mémoire activée.' : 'Mémoire désactivée. Les souvenirs restent consultables et supprimables.' : 'Ce choix n’a pas pu être confirmé.' });
    if (saved) {
      await queryClient.invalidateQueries({ queryKey: ['assistant-memory-policy'] });
      window.dispatchEvent(new CustomEvent('assistant-memory-changed', { detail: { owner: actor } }));
    }
  };

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
            Vos goûts et habitudes, avec une destination claire. Vous pouvez les vérifier, les corriger et les oublier.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4"><label htmlFor="assistant-memory-enabled" className="space-y-1"><span className="block font-medium text-sm">Retenir mes goûts et habitudes</span><span className="block text-xs text-muted-foreground">Autorise les nouveaux souvenirs et leur réutilisation. La désactivation conserve la liste et permet l’oubli.</span></label><Switch id="assistant-memory-enabled" aria-label="Retenir mes goûts et habitudes" className="shrink-0" checked={privacy.settings.assistantMemoryEnabled ?? false} disabled={privacy.isLoading || privacy.isUpdating || !!privacy.error} onCheckedChange={enabled => void toggleMemory(enabled)} /></div>
          {privacy.error && <p role="alert" className="text-sm">Vos autorisations ne peuvent pas être relues. Rechargez les réglages avant de les modifier.</p>}
          {notice && notice.owner === privacy.owner && <p role="status" className="text-sm">{notice.text}</p>}
          <p className="text-sm text-muted-foreground">{privacy.isLoading ? 'Lecture de l’autorisation d’historique…' : privacy.error ? 'L’autorisation d’historique est indisponible.' : `L’historique des conversations est ${privacy.settings.saveHistory ? 'activé' : 'désactivé'}.`} Le partage du profil est un choix distinct.</p>
          <Button variant="ghost" className="min-h-11" onClick={() => navigate('/settings?section=data-privacy')}>Gérer l’historique et mes données</Button>
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
