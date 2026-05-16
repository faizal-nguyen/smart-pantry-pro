/**
 * AssistantActionInlineCard — carte action inline dans le fil messages.
 *
 * PRP-233 PR2 — affiche une action (exécutée, pending, ou undone) avec
 * son tier de risque et son CTA. Pending high-risk = Confirmer/Annuler
 * (pas de "Modifier" V1 per §6).
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, RotateCcw, ShieldAlert } from 'lucide-react';

type RiskTier = 'read' | 'low' | 'medium' | 'high';

export interface InlineActionDescriptor {
  action_id: string;
  tool: string;
  args: Record<string, unknown>;
  risk_tier: RiskTier;
  status: 'executed' | 'pending' | 'undone' | 'failed';
  reason?: string;
  reversible?: boolean;
  undo_expires_at?: string | null;
}

interface AssistantActionInlineCardProps {
  action: InlineActionDescriptor;
  onConfirm?: () => void;
  onCancel?: () => void;
  onUndo?: () => void;
  isPending?: boolean;
}

const TOOL_LABELS: Record<string, string> = {
  add_inventory_items: 'Ajouter des produits à l\'inventaire',
  add_shopping_items: 'Ajouter à la liste de courses',
  mark_shopping_items_bought: 'Marquer des courses achetées',
  consume_inventory_items: 'Décompter de l\'inventaire',
  remove_inventory_items: 'Retirer de l\'inventaire',
  delete_shopping_items: 'Supprimer de la liste de courses',
  import_recipe_from_url: 'Importer une recette',
  add_recipe_to_meal_plan: 'Ajouter au planning de repas',
  remember_preference: 'Mémoriser une préférence',
  forget_memory: 'Oublier une mémoire',
  update_response_style: 'Adapter le style de réponse',
  record_recipe_feedback: 'Noter cette recette',
};

function labelForTool(tool: string): string {
  return TOOL_LABELS[tool] ?? tool;
}

const TIER_STYLES: Record<RiskTier, { label: string; cls: string }> = {
  read: { label: 'Lecture', cls: 'bg-blue-100 text-blue-700' },
  low: { label: 'Sûr', cls: 'bg-green-100 text-green-700' },
  medium: { label: 'À confirmer', cls: 'bg-amber-100 text-amber-700' },
  high: { label: 'Action sensible', cls: 'bg-red-100 text-red-700' },
};

export default function AssistantActionInlineCard({
  action,
  onConfirm,
  onCancel,
  onUndo,
  isPending,
}: AssistantActionInlineCardProps) {
  const tier = TIER_STYLES[action.risk_tier];
  const isHighRisk = action.risk_tier === 'medium' || action.risk_tier === 'high';

  return (
    <Card className="my-2">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className={tier.cls}>
                {tier.label}
              </Badge>
              {action.status === 'pending' && (
                <Badge variant="outline" className="text-amber-700 border-amber-400">
                  <ShieldAlert className="h-3 w-3 mr-1" aria-hidden="true" />
                  En attente
                </Badge>
              )}
              {action.status === 'undone' && (
                <Badge variant="outline">Annulée</Badge>
              )}
              {action.status === 'failed' && (
                <Badge variant="destructive">Échec</Badge>
              )}
            </div>
            <p className="text-sm font-medium">{labelForTool(action.tool)}</p>
            {action.reason && (
              <p className="text-xs text-muted-foreground mt-1">{action.reason}</p>
            )}
          </div>
        </div>

        {action.status === 'pending' && isHighRisk && (
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={onCancel}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button size="sm" onClick={onConfirm} disabled={isPending}>
              <Check className="h-4 w-4 mr-1" aria-hidden="true" />
              Confirmer
            </Button>
          </div>
        )}

        {action.status === 'executed' && action.reversible && onUndo && (
          <div className="flex justify-end">
            <Button size="sm" variant="ghost" onClick={onUndo} disabled={isPending}>
              <RotateCcw className="h-4 w-4 mr-1" aria-hidden="true" />
              Annuler cette action
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
