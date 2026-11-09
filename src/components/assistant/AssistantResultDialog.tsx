/**
 * PRP-221 Sprint 1 frontend — result dialog of the floating button.
 *
 * Shows the transcript, the answer and the reply's actions. Executed and
 * pending actions (undo, Confirmer) live in AssistantActionsPanel, shared
 * with the /assistant page.
 */
import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import AssistantMemoryNotice from './AssistantMemoryNotice';
import { AssistantActionsPanel } from './AssistantActionsPanel';
import type { AssistantPlanResponse } from '@/services/assistantApi';

export interface AssistantResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: AssistantPlanResponse | null;
  /** Called with the merged state after a /actions/execute round-trip. */
  onResultPatched: (patch: Partial<AssistantPlanResponse>) => void;
}

export function AssistantResultDialog({
  open,
  onOpenChange,
  result,
  onResultPatched,
}: AssistantResultDialogProps) {
  const navigate = useNavigate();


  if (!result) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🎤 Assistant
            {result.replayed && (
              <Badge variant="outline" className="text-xs">
                Réplique audio détectée
              </Badge>
            )}
          </DialogTitle>
          {result.transcript && (
            <DialogDescription className="line-clamp-3 text-sm italic">
              « {result.transcript} »
            </DialogDescription>
          )}
        </DialogHeader>

        {result.message && (
          <p className="text-sm text-foreground/90">{result.message}</p>
        )}
        <AssistantMemoryNotice result={result} />

        <ScrollArea className="max-h-[55vh] -mx-2 px-2">
          <AssistantActionsPanel result={result} onResultPatched={onResultPatched} />

          {result.actions_executed.length === 0 && result.actions_pending.length === 0 && (
            <p className="text-sm text-muted-foreground italic py-6 text-center">
              Aucune action — l'assistant a juste répondu.
            </p>
          )}
        </ScrollArea>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
          <div className="flex gap-2 ml-auto">
            {result.conversation_id && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/assistant?conversation=${result.conversation_id}`);
                }}
              >
                <MessageCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                Ouvrir la conversation
              </Button>
            )}
            <Button type="button" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
