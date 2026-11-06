/**
 * Actions of one assistant reply: executed (with undo) and pending (with
 * Confirmer / Ne pas faire). Shared by the floating-button result dialog and
 * the /assistant page, which is the only entry on mobile (audit 2026-11-04:
 * pending actions could never be confirmed on iPhone).
 */
import { useState } from 'react';
import { AlertTriangle, Check, Loader2, RotateCcw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { dispatchAgentDbChanged, tablesForTool } from '@/lib/agentEvents';

export interface AssistantActionsPanelProps {
  result: AssistantPlanResponse;
  /** Receives the merged state after a confirmation, a dismissal or an undo. */
  onResultPatched: (patch: Partial<AssistantPlanResponse>) => void;
}

const RISK_LABEL: Record<RiskTier, string> = { read: 'lecture', low: 'faible', medium: 'moyen', high: 'sensible' };
const RISK_TONE: Record<RiskTier, string> = {
  read: 'bg-slate-100 text-slate-700',
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-900',
  high: 'bg-red-100 text-red-800',
};

function shortToolName(tool: string): string {
  return tool.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

type Item = { name?: string; quantity?: number; unit?: string };
function previewArgs(args: Record<string, unknown>): string {
  // One bulleted line per item, so a 16-item add reads without horizontal scroll.
  if (Array.isArray(args.items)) {
    return (args.items as Item[])
      .map(item => `• ${`${item.quantity ?? ''} ${item.unit ?? ''} ${item.name ?? ''}`.replace(/\s+/g, ' ').trim()}`)
      .join('\n');
  }
  if (Array.isArray(args.shopping_item_ids)) return `${args.shopping_item_ids.length} article(s)`;
  if ('recipe_id' in args && 'meal_type' in args) return `${String(args.meal_type)} • ${String(args.week_start ?? '')}`;
  if ('url' in args) return String(args.url);
  if ('category' in args) return String(args.category);
  return JSON.stringify(args).slice(0, 100);
}

export function AssistantActionsPanel({ result, onResultPatched }: AssistantActionsPanelProps) {
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [undoing, setUndoing] = useState<string | null>(null);
  const pending = result.confirmation_token ? result.actions_pending : [];
  if (!result.actions_executed.length && !pending.length) return null;

  const confirm = async () => {
    if (!result.confirmation_token || confirming) return;
    setConfirming(true);
    setConfirmError(null);
    try {
      const done = await postAssistantConfirm(result.confirmation_token);
      onResultPatched({ actions_executed: [...result.actions_executed, ...done.actions_executed], actions_pending: [], confirmation_token: null });
      dispatchAgentDbChanged(done.actions_executed.flatMap(action => tablesForTool(action.tool)));
      toast({
        title: done.actions_failed.length ? 'Confirmation partielle' : 'Actions confirmées',
        description: `${done.actions_executed.length} exécutée(s), ${done.actions_failed.length} échec(s).`,
        ...(done.actions_failed.length ? { variant: 'destructive' as const } : {}),
      });
    } catch (err) {
      // Kept on screen: a toast can be missed on a phone, and the user may retry.
      setConfirmError(err instanceof Error ? err.message : 'Confirmation impossible. Réessaie ou relance ta demande.');
    } finally {
      setConfirming(false);
    }
  };

  const undo = async (action: ExecutedAction) => {
    setUndoing(action.action_id);
    try {
      await postAssistantUndo(action.action_id);
      onResultPatched({ actions_executed: result.actions_executed.map(a => (a.action_id === action.action_id ? { ...a, reversible: false } : a)) });
      dispatchAgentDbChanged(tablesForTool(action.tool));
      toast({ title: 'Action annulée' });
    } catch (err) {
      toast({ title: 'Annulation impossible', description: err instanceof Error ? err.message : 'Erreur inconnue', variant: 'destructive' });
    } finally {
      setUndoing(null);
    }
  };

  return (
    <section className="space-y-4" role="region" aria-label="Actions de l’assistant">
      {result.actions_executed.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exécutées ({result.actions_executed.length})</h3>
          <ul className="space-y-2">
            {result.actions_executed.map(action => (
              <ExecutedRow key={action.action_id} action={action} undoing={undoing === action.action_id} onUndo={() => void undo(action)} />
            ))}
          </ul>
        </div>
      )}
      {pending.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">À confirmer ({pending.length})</h3>
          <ul className="space-y-2">
            {pending.map(action => <PendingRow key={action.action_id} action={action} />)}
          </ul>
          {confirmError && <p role="alert" className="text-sm text-destructive">{confirmError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={confirming}
              onClick={() => { setConfirmError(null); onResultPatched({ actions_pending: [], confirmation_token: null }); }}>
              Ne pas faire
            </Button>
            <Button type="button" onClick={() => void confirm()} disabled={confirming}>
              {confirming ? <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" /> : <Check className="h-4 w-4 mr-2" aria-hidden="true" />}
              Confirmer ({pending.length})
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function ExecutedRow({ action, onUndo, undoing }: { action: ExecutedAction; onUndo: () => void; undoing: boolean }) {
  const expired = action.undo_expires_at ? new Date(action.undo_expires_at) < new Date() : true;
  return (
    <li className="flex items-start justify-between gap-2 rounded-md border bg-emerald-50/40 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium">{shortToolName(action.tool)}</span>
          <Badge className={cn('text-[10px] uppercase', RISK_TONE[action.risk_tier])}>{RISK_LABEL[action.risk_tier]}</Badge>
        </div>
        <p className="text-sm text-foreground/80 whitespace-pre-line break-words leading-relaxed">{previewArgs(action.args)}</p>
      </div>
      {action.reversible && !expired && (
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onUndo} disabled={undoing} aria-label="Annuler cette action">
          {undoing ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <RotateCcw className="h-3 w-3" aria-hidden="true" />}
          <span className="ml-1 text-xs">Annuler</span>
        </Button>
      )}
    </li>
  );
}

function PendingRow({ action }: { action: PendingAction }) {
  return (
    <li className="flex items-start gap-2 rounded-md border bg-amber-50/60 p-3">
      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-medium">{shortToolName(action.tool)}</span>
          <Badge className={cn('text-[10px] uppercase', RISK_TONE[action.risk_tier])}>{RISK_LABEL[action.risk_tier]}</Badge>
        </div>
        <p className="text-sm text-foreground/80 whitespace-pre-line break-words leading-relaxed">{previewArgs(action.args)}</p>
        {action.reason && <p className="text-xs italic text-amber-800 mt-1.5 break-words">{action.reason}</p>}
      </div>
    </li>
  );
}
