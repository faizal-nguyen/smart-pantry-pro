/**
 * PRP-221 Sprint 1 frontend — result dialog.
 *
 * Shows the transcript + executed actions (with per-action undo) +
 * pending actions (with confirm/cancel). When an action is undone,
 * we mark it visually and disable the undo button. When pending
 * actions are confirmed, we POST /actions/execute and merge the
 * response into the displayed state.
 */
import { useMemo, useState } from 'react';
import { Check, AlertTriangle, RotateCcw, Loader2, MessageCircle, X } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

import {
  postAssistantConfirm,
  postAssistantUndo,
  type AssistantPlanResponse,
  type ExecutedAction,
  type PendingAction,
  type RiskTier,
} from '@/services/assistantApi';
import {
  dispatchAgentDbChanged,
  tablesForTool,
  type AgentAffectedTable,
} from '@/lib/agentEvents';

export interface AssistantResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: AssistantPlanResponse | null;
  /** Called with the merged state after a /actions/execute round-trip. */
  onResultPatched: (patch: Partial<AssistantPlanResponse>) => void;
}

const RISK_LABEL: Record<RiskTier, string> = {
  read: 'lecture',
  low: 'faible',
  medium: 'moyen',
  high: 'sensible',
};

const RISK_TONE: Record<RiskTier, string> = {
  read: 'bg-slate-100 text-slate-700',
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-900',
  high: 'bg-red-100 text-red-800',
};

function shortToolName(tool: string): string {
  return tool.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function previewArgs(args: Record<string, unknown>): string {
  // Best-effort summary. For item lists we emit one bulleted line per
  // entry so the user can scan a 16-item add without horizontal scroll.
  if (Array.isArray((args as any).items)) {
    const items = (args as any).items as Array<{ name?: string; quantity?: number; unit?: string }>;
    return items
      .map((it) => {
        const qty = it.quantity ?? '';
        const unit = it.unit ?? '';
        const name = it.name ?? '';
        return `• ${`${qty} ${unit} ${name}`.replace(/\s+/g, ' ').trim()}`;
      })
      .join('\n');
  }
  if ('shopping_item_ids' in args) {
    return `${(args.shopping_item_ids as string[]).length} article(s)`;
  }
  if ('recipe_id' in args && 'meal_type' in args) {
    return `${(args as any).meal_type} • ${(args as any).week_start ?? ''}`;
  }
  if ('url' in args) return String((args as any).url);
  if ('category' in args) return String((args as any).category);
  return JSON.stringify(args).slice(0, 100);
}

export function AssistantResultDialog({
  open,
  onOpenChange,
  result,
  onResultPatched,
}: AssistantResultDialogProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [executingConfirm, setExecutingConfirm] = useState(false);
  const [undoInFlight, setUndoInFlight] = useState<string | null>(null);

  const totalCost = result?.cost.total_usd ?? 0;
  const durationSec = useMemo(
    () => (result ? Math.max(1, Math.round(result.duration_ms / 1000)) : 0),
    [result]
  );

  const handleConfirm = async () => {
    if (!result?.confirmation_token) return;
    setExecutingConfirm(true);
    try {
      const exec = await postAssistantConfirm(result.confirmation_token);
      onResultPatched({
        actions_executed: [...result.actions_executed, ...exec.actions_executed],
        actions_pending: [],
        confirmation_token: null,
      });
      // Invalidate UI caches for the tables the just-confirmed actions
      // touched.
      const tables: AgentAffectedTable[] = exec.actions_executed.flatMap((a) =>
        tablesForTool(a.tool)
      );
      dispatchAgentDbChanged(tables);
      toast({
        title: 'Actions confirmées',
        description: `${exec.actions_executed.length} exécutée(s), ${exec.actions_failed.length} échec(s).`,
      });
    } catch (err) {
      toast({
        title: 'Confirmation impossible',
        description: err instanceof Error ? err.message : 'Erreur inconnue',
        variant: 'destructive',
      });
    } finally {
      setExecutingConfirm(false);
    }
  };

  const handleCancelPending = () => {
    if (!result) return;
    onResultPatched({ actions_pending: [], confirmation_token: null });
  };

  const handleUndo = async (actionId: string) => {
    setUndoInFlight(actionId);
    try {
      await postAssistantUndo(actionId);
      if (result) {
        onResultPatched({
          actions_executed: result.actions_executed.map((a) =>
            a.action_id === actionId ? { ...a, reversible: false } : a
          ),
        });
        // Invalidate UI caches for the table the original action touched.
        const original = result.actions_executed.find((a) => a.action_id === actionId);
        if (original) {
          dispatchAgentDbChanged(tablesForTool(original.tool));
        }
      }
      toast({ title: 'Action annulée' });
    } catch (err) {
      toast({
        title: 'Annulation impossible',
        description: err instanceof Error ? err.message : 'Erreur inconnue',
        variant: 'destructive',
      });
    } finally {
      setUndoInFlight(null);
    }
  };

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

        <ScrollArea className="max-h-[55vh] -mx-2 px-2">
          {result.actions_executed.length > 0 && (
            <section className="space-y-2 mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Exécutées ({result.actions_executed.length})
              </h3>
              <ul className="space-y-2">
                {result.actions_executed.map((action) => (
                  <ExecutedRow
                    key={action.action_id}
                    action={action}
                    onUndo={() => handleUndo(action.action_id)}
                    undoing={undoInFlight === action.action_id}
                  />
                ))}
              </ul>
            </section>
          )}

          {result.actions_pending.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                À confirmer ({result.actions_pending.length})
              </h3>
              <ul className="space-y-2">
                {result.actions_pending.map((action) => (
                  <PendingRow key={action.action_id} action={action} />
                ))}
              </ul>
            </section>
          )}

          {result.actions_executed.length === 0 && result.actions_pending.length === 0 && (
            <p className="text-sm text-muted-foreground italic py-6 text-center">
              Aucune action — l'assistant a juste répondu.
            </p>
          )}
        </ScrollArea>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
          <div className="text-xs text-muted-foreground tabular-nums">
            Coût session : ${totalCost.toFixed(4)} • {durationSec}s • {result.model_used}
          </div>
          <div className="flex gap-2 ml-auto">
            {result.actions_pending.length > 0 ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancelPending}
                  disabled={executingConfirm}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirm}
                  disabled={executingConfirm}
                  className="bg-primary"
                >
                  {executingConfirm ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Confirmer ({result.actions_pending.length})
                </Button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExecutedRow({
  action,
  onUndo,
  undoing,
}: {
  action: ExecutedAction;
  onUndo: () => void;
  undoing: boolean;
}) {
  const undoExpired = action.undo_expires_at
    ? new Date(action.undo_expires_at) < new Date()
    : true;
  const canUndo = action.reversible && !undoExpired;

  return (
    <li className="flex items-start justify-between gap-2 rounded-md border bg-emerald-50/40 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="text-sm font-medium">{shortToolName(action.tool)}</span>
          <Badge className={cn('text-[10px] uppercase', RISK_TONE[action.risk_tier])}>
            {RISK_LABEL[action.risk_tier]}
          </Badge>
        </div>
        <p className="text-sm text-foreground/80 whitespace-pre-line break-words leading-relaxed">
          {previewArgs(action.args)}
        </p>
      </div>
      {canUndo && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={onUndo}
          disabled={undoing}
        >
          {undoing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
          <span className="ml-1 text-xs">Annuler</span>
        </Button>
      )}
    </li>
  );
}

function PendingRow({ action }: { action: PendingAction }) {
  return (
    <li className="flex items-start gap-2 rounded-md border bg-amber-50/60 p-3">
      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-medium">{shortToolName(action.tool)}</span>
          <Badge className={cn('text-[10px] uppercase', RISK_TONE[action.risk_tier])}>
            {RISK_LABEL[action.risk_tier]}
          </Badge>
        </div>
        <p className="text-sm text-foreground/80 whitespace-pre-line break-words leading-relaxed">
          {previewArgs(action.args)}
        </p>
        {action.reason && (
          <p className="text-xs italic text-amber-800 mt-1.5 break-words">{action.reason}</p>
        )}
      </div>
    </li>
  );
}
