/**
 * PRP-234 PR3 — TodayAntiWastePanel.
 *
 * Liste les produits proches péremption (≤ 7j) + CTA « Voir recettes
 * pour utiliser » qui prompte l'assistant en mode anti_waste. Source
 * = `useTodayAntiWaste`.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Leaf } from 'lucide-react';

import { useTodayAntiWaste } from '@/hooks/useTodayAntiWaste';
import { useToast } from '@/hooks/use-toast';
import {
  PanelChrome,
  PanelEmpty,
  PanelError,
  PanelSkeleton,
} from '@/components/kitchen/TodayPanelShell';
import { Button } from '@/components/ui/button';
import {
  getAssistantRequestId,
  postAssistantText,
} from '@/services/assistantApi';

const TITLE = 'Anti-gaspi';

function urgencyLabel(daysToExpiry: number): { text: string; urgent: boolean } {
  if (daysToExpiry < 0) return { text: `Expiré il y a ${Math.abs(daysToExpiry)}j`, urgent: true };
  if (daysToExpiry === 0) return { text: 'Aujourd’hui', urgent: true };
  if (daysToExpiry === 1) return { text: 'Demain', urgent: true };
  if (daysToExpiry <= 3) return { text: `Dans ${daysToExpiry}j`, urgent: true };
  return { text: `Dans ${daysToExpiry}j`, urgent: false };
}

export default function TodayAntiWastePanel() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items, isLoading, isError, refetch } = useTodayAntiWaste(7);
  const [pending, setPending] = React.useState(false);

  if (isLoading) return <PanelSkeleton title={TITLE} />;
  if (isError) {
    return (
      <PanelError
        title={TITLE}
        message="Impossible de charger ton inventaire."
        onRetry={() => void refetch()}
      />
    );
  }

  if (items.length === 0) {
    return (
      <PanelEmpty
        title={TITLE}
        message="Rien à finir cette semaine. Bonne nouvelle 🌱"
      />
    );
  }

  const askAssistant = async () => {
    if (pending) return;
    setPending(true);
    try {
      const namesPreview = items.slice(0, 4).map((it) => it.product_name).join(', ');
      const { client_request_id } = await getAssistantRequestId();
      await postAssistantText({
        text: `J’ai besoin d’utiliser bientôt : ${namesPreview}. Propose-moi des recettes anti-gaspi.`,
        clientRequestId: client_request_id,
      });
      toast({
        title: 'Demande envoyée à l’assistant',
        description: 'Sa réponse arrive dans la conversation.',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Assistant indisponible',
        description: err instanceof Error ? err.message : 'Erreur inconnue',
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <PanelChrome title={TITLE}>
      <ul className="space-y-1" aria-label="Produits proches péremption">
        {items.slice(0, 5).map((item) => {
          const { text, urgent } = urgencyLabel(item.days_to_expiry);
          return (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-md p-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium line-clamp-1">{item.product_name}</p>
                <p
                  className={
                    urgent
                      ? 'inline-flex items-center gap-1 text-xs text-destructive'
                      : 'text-xs text-muted-foreground'
                  }
                >
                  {urgent && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
                  {text}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {item.quantity > 0 ? `×${item.quantity}` : ''}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => navigate('/pantry')}
        >
          Voir mon inventaire
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1 text-muted-foreground"
          disabled={pending}
          onClick={() => void askAssistant()}
        >
          <Leaf className="h-3 w-3" aria-hidden="true" />
          Voir recettes
        </Button>
      </div>
    </PanelChrome>
  );
}
