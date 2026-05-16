/**
 * PRP-234 PR3 — TodayRecommendationsPanel.
 *
 * Affiche les 3 meilleures recettes du moteur PRP-226 (bucket
 * `cookable_now` + fallback `almost_cookable` si vide) avec score
 * et 1-2 raisons déterministes. Click → détail recette. Source =
 * `useTodayRecommendations` → POST /api/v1/recommendations/suggest.
 */
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ChefHat, Plus, Sparkles } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { useTodayRecommendations } from '@/hooks/useTodayRecommendations';
import {
  PanelChrome,
  PanelEmpty,
  PanelError,
  PanelSkeleton,
} from '@/components/kitchen/TodayPanelShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getAssistantRequestId,
  postAssistantText,
} from '@/services/assistantApi';
import type { RecommendedRecipeView } from '@/services/recommendationsApi';
import { fireRecipeAssistantAction, type RecipeAction } from '@/lib/recipeActions';

const TITLE = 'À cuisiner avec ce que tu as';

interface RecoRowProps {
  recipe: RecommendedRecipeView;
  onAction: (recipe: RecommendedRecipeView, action: RecipeAction) => void;
  pendingAction: RecipeAction | null;
}

function RecoRow({ recipe, onAction, pendingAction }: RecoRowProps) {
  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);
  const reasons = (recipe.reasons ?? []).slice(0, 2);
  const score =
    typeof recipe.score_total === 'number' ? recipe.score_total : null;
  const hasMissing = (recipe.missing_count ?? 0) > 0;

  return (
    <div className="rounded-md transition-colors hover:bg-muted/60 focus-within:bg-muted/60">
      <Link
        to={`/kitchen/recipes/${recipe.id}`}
        className="flex items-start gap-3 p-2 focus:outline-none"
        aria-label={`Ouvrir ${recipe.name}`}
      >
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt=""
            className="h-12 w-12 flex-shrink-0 rounded object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-surface-muted">
            <ChefHat className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p className="flex-1 text-sm font-medium leading-snug line-clamp-2">
              {recipe.name}
            </p>
            {score !== null && score >= 70 && (
              <Badge
                variant="outline"
                className="flex-shrink-0 border-saffron/40 bg-saffron/10 text-[10px] text-saffron"
                title={`Score ${score}/100`}
              >
                {score}
              </Badge>
            )}
          </div>
          {totalTime > 0 && (
            <p className="text-xs text-muted-foreground">{totalTime} min</p>
          )}
          {reasons.length > 0 && (
            <p className="mt-1 line-clamp-2 text-[11px] italic text-muted-foreground">
              {reasons.join(' · ')}
            </p>
          )}
        </div>
      </Link>
      {/* PRP-234 PR4 — quick actions sous la card, hors du Link pour ne
          pas déclencher la navigation au click. */}
      <div className="flex flex-wrap gap-1 px-2 pb-2 -mt-1" role="group" aria-label={`Actions pour ${recipe.name}`}>
        {hasMissing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-[11px]"
            disabled={pendingAction !== null}
            onClick={(e) => {
              e.stopPropagation();
              onAction(recipe, 'add_missing');
            }}
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            Ajouter les manquants
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-[11px]"
          disabled={pendingAction !== null}
          onClick={(e) => {
            e.stopPropagation();
            onAction(recipe, 'cooked');
          }}
        >
          <Check className="h-3 w-3" aria-hidden="true" />
          Cuisinée
        </Button>
      </div>
    </div>
  );
}

export default function TodayRecommendationsPanel() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading, isError, refetch } = useTodayRecommendations();
  const [pending, setPending] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<RecipeAction | null>(null);

  const handleRowAction = async (
    recipe: RecommendedRecipeView,
    action: RecipeAction,
  ) => {
    if (pendingAction !== null) return;
    setPendingAction(action);
    try {
      const title = await fireRecipeAssistantAction(recipe, action);
      toast({ title, description: `Recette : ${recipe.name}` });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Action impossible',
        description: err instanceof Error ? err.message : 'Erreur inconnue',
      });
    } finally {
      setPendingAction(null);
    }
  };

  if (isLoading) return <PanelSkeleton title={TITLE} />;
  if (isError) {
    return (
      <PanelError
        title={TITLE}
        message="Impossible de charger les suggestions."
        onRetry={() => void refetch()}
      />
    );
  }

  const cookable = data?.cookable_now ?? [];
  const almost = data?.almost_cookable ?? [];
  const visible = cookable.length > 0 ? cookable.slice(0, 3) : almost.slice(0, 3);

  const askAssistant = async () => {
    if (pending) return;
    setPending(true);
    try {
      const { client_request_id } = await getAssistantRequestId();
      await postAssistantText({
        text: 'Que puis-je cuisiner ce soir avec ce que j’ai ?',
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

  if (visible.length === 0) {
    return (
      <PanelEmpty
        title={TITLE}
        message="Pas encore assez d’inventaire pour suggérer une recette."
        cta={{
          label: 'Demander à l’assistant',
          onClick: () => void askAssistant(),
        }}
      />
    );
  }

  return (
    <PanelChrome title={TITLE}>
      <div className="space-y-1">
        {visible.map((r) => (
          <RecoRow
            key={r.id}
            recipe={r}
            onAction={(rec, act) => void handleRowAction(rec, act)}
            pendingAction={pendingAction}
          />
        ))}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => navigate('/kitchen/recipes')}
          >
            Voir toutes mes recettes
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 text-muted-foreground"
            disabled={pending}
            onClick={() => void askAssistant()}
          >
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            Demander à l’assistant
          </Button>
        </div>
      </div>
    </PanelChrome>
  );
}
