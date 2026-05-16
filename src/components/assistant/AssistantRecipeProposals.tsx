/**
 * AssistantRecipeProposals — extrait les recettes BDD des tool results
 * d'une `AssistantPlanResponse` et affiche des cards cliquables.
 *
 * Sprint 2 (PRP-224 follow-up) — supporte 3 buckets :
 *  - cookable_now (tu as tout)
 *  - almost_cookable (1-3 manquants ou inconnus)
 *  - recent_suggestions (recettes récentes, fallback)
 *
 * Source primaire : `suggest_recipes_for_context.result` qui renvoie les
 * 3 buckets en un seul tool call. Fallback : si le LLM appelle encore
 * find_cookable_recipes / search_recipes / read_recent_recipes, on
 * retombe sur l'ancien comportement single-bucket pour ne rien casser.
 *
 * PRP-226 PR4 — chaque card affiche :
 *  - le `score_total` (pill discrète quand ≥ 70)
 *  - 1-2 `reasons` déterministes en sous-titre
 *  - 3 actions rapides (Ajouter les manquants / Planifier / Cuisinée)
 *    qui re-prompt l'assistant via `/api/assistant/text` avec un wording
 *    explicite. Pas d'appel direct DB ici — on garde la boucle assistant
 *    (mémoire + action_log + undo) comme single source of truth.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, Clock, Users, Plus, CalendarPlus, Check } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { AssistantPlanResponse, ExecutedAction } from '@/services/assistantApi';
import {
  fireRecipeAssistantAction,
  type RecipeAction,
} from '@/lib/recipeActions';

interface RecipeView {
  id: string;
  name: string;
  prep_time?: number | null;
  cook_time?: number | null;
  servings?: number | null;
  image_url?: string | null;
  cuisine_category?: string | null;
  missing_count?: number;
  missing_ingredients?: string[];
  total_essential?: number;
  unlinked?: boolean;
  unlinked_count?: number;
  // PRP-226 PR4 — engine-emitted fields (optional, missing on legacy results).
  score_total?: number;
  reasons?: string[];
}

interface RecipeBuckets {
  cookable_now: RecipeView[];
  almost_cookable: RecipeView[];
  recent_suggestions: RecipeView[];
  /** PRP-226 PR4 — id of the originating `recommendation_events` row. */
  event_id?: string;
}

const LEGACY_RECIPE_TOOLS = new Set([
  'find_cookable_recipes',
  'search_recipes',
  'read_recent_recipes',
]);

function isRecipeView(raw: unknown): raw is RecipeView {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as Partial<RecipeView>;
  return typeof r.id === 'string' && typeof r.name === 'string';
}

function dedupe(list: RecipeView[], seen: Set<string>): RecipeView[] {
  const out: RecipeView[] = [];
  for (const r of list) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  return out;
}

function extractBuckets(actions: ExecutedAction[]): RecipeBuckets {
  const seen = new Set<string>();
  const buckets: RecipeBuckets = { cookable_now: [], almost_cookable: [], recent_suggestions: [] };

  // Primary: suggest_recipes_for_context returns the 3 buckets directly.
  for (const a of actions) {
    if (a.tool !== 'suggest_recipes_for_context') continue;
    const result = a.result as
      | (Partial<RecipeBuckets> & { event_id?: unknown })
      | undefined;
    if (!result || typeof result !== 'object') continue;
    for (const key of ['cookable_now', 'almost_cookable', 'recent_suggestions'] as const) {
      const arr = (result as Record<string, unknown>)[key];
      if (!Array.isArray(arr)) continue;
      buckets[key].push(...dedupe(arr.filter(isRecipeView), seen));
    }
    if (!buckets.event_id && typeof result.event_id === 'string' && result.event_id.length > 0) {
      buckets.event_id = result.event_id;
    }
  }

  if (
    buckets.cookable_now.length ||
    buckets.almost_cookable.length ||
    buckets.recent_suggestions.length
  ) {
    return buckets;
  }

  // Legacy fallback: single `recipes` array from find_cookable_recipes /
  // search_recipes / read_recent_recipes. Bucket them by the cookability
  // info if present (find_cookable_recipes only), otherwise treat as recent.
  for (const a of actions) {
    if (!LEGACY_RECIPE_TOOLS.has(a.tool)) continue;
    const result = a.result as { recipes?: unknown } | undefined;
    if (!result || typeof result !== 'object') continue;
    const list = result.recipes;
    if (!Array.isArray(list)) continue;

    for (const raw of dedupe(list.filter(isRecipeView), seen)) {
      if (a.tool === 'find_cookable_recipes') {
        const score = (raw.missing_count ?? 0) + (raw.unlinked_count ?? 0);
        if (score === 0) buckets.cookable_now.push(raw);
        else buckets.almost_cookable.push(raw);
      } else {
        buckets.recent_suggestions.push(raw);
      }
    }
  }

  return buckets;
}

// ---- Action wiring -------------------------------------------------
// PRP-234 PR4 — prompts + fire helper extraits dans `src/lib/recipeActions.ts`
// pour partage avec `TodayRecommendationsPanel` et `MenuEntryCard`.

// ---- Card --------------------------------------------------------

interface RecipeCardProps {
  recipe: RecipeView;
  showCookabilityBadge: boolean;
  showActions: boolean;
}

function RecipeCard({ recipe: r, showCookabilityBadge, showActions }: RecipeCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pendingAction, setPendingAction] = React.useState<RecipeAction | null>(null);
  const totalTime = (r.prep_time ?? 0) + (r.cook_time ?? 0);
  const open = () => navigate(`/kitchen/recipes/${r.id}`);

  const handleAction = async (action: RecipeAction) => {
    if (pendingAction) return;
    setPendingAction(action);
    try {
      const title = await fireRecipeAssistantAction(r, action);
      toast({ title, description: `Recette : ${r.name}` });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast({
        title: 'Action impossible',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setPendingAction(null);
    }
  };

  const score = typeof r.score_total === 'number' ? r.score_total : null;
  const reasons = (r.reasons ?? []).slice(0, 2);
  const missing = r.missing_count ?? 0;
  const hasMissingIngredients = missing > 0;

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={open}
        className="w-full text-left transition-colors hover:bg-surface-muted/50 focus:bg-surface-muted/50 focus:outline-none"
        aria-label={`Ouvrir la recette ${r.name}`}
      >
        <CardContent className="p-3 flex gap-3">
          {r.image_url ? (
            <img
              src={r.image_url}
              alt=""
              className="w-16 h-16 rounded object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded bg-surface-muted flex items-center justify-center flex-shrink-0">
              <ChefHat className="h-6 w-6 text-saffron" aria-hidden="true" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <h4 className="font-medium text-sm line-clamp-2 flex-1">{r.name}</h4>
              {score !== null && score >= 70 && (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-saffron/10 text-saffron border-saffron/40 flex-shrink-0"
                  aria-label={`Score de pertinence ${score} sur 100`}
                  title={`Score ${score}/100`}
                >
                  {score}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {totalTime > 0 && (
                <span className="flex items-center gap-0.5">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {totalTime} min
                </span>
              )}
              {r.servings != null && (
                <span className="flex items-center gap-0.5">
                  <Users className="h-3 w-3" aria-hidden="true" />
                  {r.servings}
                </span>
              )}
              {r.cuisine_category && (
                <Badge variant="secondary" className="text-[10px] py-0">
                  {r.cuisine_category}
                </Badge>
              )}
            </div>
            {reasons.length > 0 && (
              <p className="text-[11px] text-muted-foreground italic mt-1 line-clamp-2">
                {reasons.join(' · ')}
              </p>
            )}
            {showCookabilityBadge && (() => {
              const unknown = r.unlinked_count ?? 0;
              const total = missing + unknown;
              if (total === 0) {
                return (
                  <Badge variant="outline" className="mt-1 text-[10px] bg-green-50 text-green-700 border-green-300">
                    Tu as tout
                  </Badge>
                );
              }
              const parts: string[] = [];
              if (missing > 0) parts.push(`${missing} manquant${missing > 1 ? 's' : ''}`);
              if (unknown > 0) parts.push(`${unknown} à vérifier`);
              return (
                <Badge variant="outline" className="mt-1 text-[10px]">
                  {parts.join(' · ')}
                </Badge>
              );
            })()}
          </div>
        </CardContent>
      </button>
      {showActions && (
        <div
          className="flex flex-wrap gap-1 px-3 pb-3 -mt-1"
          role="group"
          aria-label={`Actions pour ${r.name}`}
        >
          {hasMissingIngredients && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] gap-1"
              disabled={pendingAction !== null}
              onClick={(e) => {
                e.stopPropagation();
                void handleAction('add_missing');
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
            className="h-7 px-2 text-[11px] gap-1"
            disabled={pendingAction !== null}
            onClick={(e) => {
              e.stopPropagation();
              void handleAction('plan');
            }}
          >
            <CalendarPlus className="h-3 w-3" aria-hidden="true" />
            Planifier
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] gap-1"
            disabled={pendingAction !== null}
            onClick={(e) => {
              e.stopPropagation();
              void handleAction('cooked');
            }}
          >
            <Check className="h-3 w-3" aria-hidden="true" />
            Cuisinée
          </Button>
        </div>
      )}
    </Card>
  );
}

interface BucketSectionProps {
  title: string;
  recipes: RecipeView[];
  limit: number;
  showCookabilityBadge: boolean;
  showActions: boolean;
}

function BucketSection({ title, recipes, limit, showCookabilityBadge, showActions }: BucketSectionProps) {
  const visible = recipes.slice(0, limit);
  if (visible.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {title}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visible.map((r) => (
          <RecipeCard
            key={r.id}
            recipe={r}
            showCookabilityBadge={showCookabilityBadge}
            showActions={showActions}
          />
        ))}
      </div>
    </div>
  );
}

function bucketsFromMetadata(metadata: Record<string, unknown> | undefined | null): RecipeBuckets | null {
  if (!metadata) return null;
  const proposals = metadata.recipe_proposals;
  if (!proposals || typeof proposals !== 'object') return null;
  const out: RecipeBuckets = { cookable_now: [], almost_cookable: [], recent_suggestions: [] };
  for (const key of ['cookable_now', 'almost_cookable', 'recent_suggestions'] as const) {
    const arr = (proposals as Record<string, unknown>)[key];
    if (Array.isArray(arr)) out[key] = arr.filter(isRecipeView);
  }
  const eventId = (proposals as Record<string, unknown>).event_id;
  if (typeof eventId === 'string' && eventId.length > 0) out.event_id = eventId;
  return out;
}

interface AssistantRecipeProposalsProps {
  /** Live plan response — when present, extract from actions_executed. */
  response?: AssistantPlanResponse | null;
  /** Persisted message metadata — when present, hydrate from recipe_proposals. */
  metadata?: Record<string, unknown> | null;
  /** Max recipes to render per bucket. Default 4. */
  limit?: number;
}

export default function AssistantRecipeProposals({
  response,
  metadata,
  limit = 4,
}: AssistantRecipeProposalsProps) {
  // metadata path takes precedence (it's the persisted form, survives reloads).
  const buckets = metadata
    ? bucketsFromMetadata(metadata)
    : response
    ? extractBuckets(response.actions_executed)
    : null;
  if (!buckets) return null;

  const total =
    buckets.cookable_now.length +
    buckets.almost_cookable.length +
    buckets.recent_suggestions.length;
  if (total === 0) return null;

  return (
    <div className="space-y-4 my-3" role="region" aria-label="Recettes suggérées">
      <BucketSection
        title="Tu as tout en stock"
        recipes={buckets.cookable_now}
        limit={limit}
        showCookabilityBadge
        showActions
      />
      <BucketSection
        title="Presque cuisinable"
        recipes={buckets.almost_cookable}
        limit={limit}
        showCookabilityBadge
        showActions
      />
      <BucketSection
        title="Idées de ta base"
        recipes={buckets.recent_suggestions}
        limit={limit}
        showCookabilityBadge={false}
        showActions
      />
    </div>
  );
}
