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
import { canAddToShoppingList, needsPurchase, type RecommendationEvidence } from '@smart/shared';
import { RecommendationEvidenceDetails } from '@/components/recipes/PersonalizedRecipeSuggestions';
import type { RecommendedRecipeView } from '@/services/recommendationsApi';
import { useNutritionProfile } from '@/hooks/useNutritionProfile';
import { Link } from 'react-router-dom';
import { ArrowRight, ChefHat, Clock, Users, Plus, CalendarPlus, Check, Undo2 } from 'lucide-react';
import { useCookRecipe } from '@/hooks/useCookRecipe';
import { recipeDetailPath } from '@/lib/recipeLinks';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { AssistantPlanResponse, ExecutedAction } from '@/services/assistantApi';
import {
  fireRecipeAssistantAction,
  type RecipeAction,
} from '@/lib/recipeActions';

interface RecipeView extends Partial<RecommendationEvidence> {
  id: string;
  name: string;
  prep_time?: number | null;
  cook_time?: number | null;
  servings?: number | null;
  image_url?: string | null;
  cuisine_category?: string | null;
  meal_type?: string | null;
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
  recent_suggestions: RecipeView[];verify_suggestions:RecipeView[];excluded_suggestions:RecipeView[];
  /** PRP-226 PR4 — id of the originating `recommendation_events` row. */
  event_id?: string;
}

const LEGACY_RECIPE_TOOLS = new Set([
  'find_cookable_recipes',
  'search_recipes',
  'find_recipes_using_ingredient',
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
  const buckets: RecipeBuckets = { cookable_now: [], almost_cookable: [], recent_suggestions: [],verify_suggestions:[],excluded_suggestions:[] };

  // Primary: suggest_recipes_for_context returns the 3 buckets directly.
  for (const a of actions) {
    if (a.tool !== 'suggest_recipes_for_context') continue;
    const result = a.result as
      | (Partial<RecipeBuckets> & { event_id?: unknown })
      | undefined;
    if (!result || typeof result !== 'object') continue;
    for (const key of ['cookable_now','almost_cookable','recent_suggestions','verify_suggestions','excluded_suggestions'] as const) {
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
    buckets.recent_suggestions.length || buckets.verify_suggestions.length || buckets.excluded_suggestions.length
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
  const [pendingAction, setPendingAction] = React.useState<RecipeAction | null>(null);
  const cooking = useCookRecipe(r);
  const cooked = cooking.status === 'cooked' || cooking.status === 'undoing';
  const totalTime=r.duration_minutes ?? (r.prep_time ?? 0)+(r.cook_time ?? 0);
  const profile=useNutritionProfile();
  const stale=r.profile_version!==undefined && (profile.error || profile.isLoading || profile.data?.profile.version!==r.profile_version);
  const evidence=!!r.reference && !!r.constraints && !!r.availability && !!r.nutrition && !!r.reason_codes;
  const detailPath = recipeDetailPath(r.reference ?? { id: r.id, source: 'recipes' }, r.servings);

  const handleAction = async (action: RecipeAction) => {
    if (pendingAction) return;
    setPendingAction(action);
    try {
      const title = await fireRecipeAssistantAction(r, action);
      toast(title, { description: `Recette : ${r.name}` });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error('Action impossible', {
        description: message,
      });
    } finally {
      setPendingAction(null);
    }
  };

  const gaps = (r.availability?.missing ?? []).filter(item => item.is_essential !== false);
  const purchases = [...new Set(gaps.filter(needsPurchase).map(item => item.ingredient_name))];
  const checks = [...new Set(gaps.filter(item => !needsPurchase(item)).map(item => item.ingredient_name))];
  const summarize = (names: string[]) => names.slice(0, 3).join(', ') + (names.length > 3 ? ` et ${names.length - 3} de plus` : '');
  const hasMissingIngredients = gaps.some(canAddToShoppingList);
  const label = /^(side|side[ _-]dish|accompagnement)$/i.test(r.meal_type ?? '') ? 'Accompagnement' : r.cuisine_category;

  return (
    <Card className="min-w-0 overflow-hidden">
      <Link
        to={detailPath}
        className="block rounded-md text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        aria-label={`Ouvrir la recette ${r.name}`}
      >
        <CardContent className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 p-3">
          {r.image_url ? (
            <img
              src={r.image_url}
              alt=""
              className="h-14 w-14 rounded object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded bg-muted">
              <ChefHat className="h-6 w-6 text-saffron" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0">
            <h4 className="text-sm font-semibold [overflow-wrap:anywhere]">{r.name}</h4>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {totalTime > 0 && (
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {totalTime} min
                </span>
              )}
              {r.servings != null && (
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <Users className="h-3 w-3" aria-hidden="true" />
                  {r.servings} pers.
                </span>
              )}
            </div>
          </div>
          {label && <Badge variant="secondary" className="col-span-2 w-fit max-w-full break-words">{label}</Badge>}
          {showCookabilityBadge && !stale && (
            <div className="col-span-2 space-y-1 break-words text-sm">
              {purchases.length > 0 && <p><strong>À prévoir :</strong> {summarize(purchases)}</p>}
              {checks.length > 0 && <p><strong>Quantité ou unité à vérifier :</strong> {summarize(checks)}</p>}
              {r.availability?.status==='available' && r.constraints?.status==='compatible' && !gaps.length && !r.availability.uncertainties.length
                ? <p>Tout en stock</p>
                : !gaps.length && <p>Disponibilité à vérifier</p>}
            </div>
          )}
          <span className="col-span-2 inline-flex min-h-8 items-center gap-1 text-sm font-medium text-primary">
            Voir la recette <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </CardContent>
      </Link>
      {stale && <p className="px-3 pb-2 text-sm">Le profil a changé ou doit être relu. Recalculez ces idées avant de choisir.</p>}
      {evidence && <div className="px-3"><RecommendationEvidenceDetails recipe={r as RecommendedRecipeView}/></div>}
      {(stale || r.constraints?.status==='verify') && <Button className="min-h-11 mx-3 mb-2" variant="ghost" asChild><Link to="/settings?section=cooking">Vérifier mon profil</Link></Button>}
      {showActions && !stale && evidence && r.constraints?.status==='compatible' && r.availability?.status!=='verify' && (
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
              className="min-h-11 px-2 text-[11px] gap-1"
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
            className="min-h-11 px-2 text-[11px] gap-1"
            disabled={pendingAction !== null}
            onClick={(e) => {
              e.stopPropagation();
              void handleAction('plan');
            }}
          >
            <CalendarPlus className="h-3 w-3" aria-hidden="true" />
            Planifier
          </Button>
          {cooked ? (
            <>
              <Button type="button" variant="ghost" size="sm" className="min-h-11 px-2 text-[11px] gap-1" disabled aria-label={`${r.name} est cuisinée`}>
                <Check className="h-3 w-3" aria-hidden="true" />
                Cuisinée ✓
              </Button>
              <Button type="button" variant="ghost" size="sm" className="min-h-11 px-2 text-[11px] gap-1" disabled={cooking.status === 'undoing'}
                aria-label={`Annuler : ${r.name} n’est pas cuisinée`} onClick={(e) => { e.stopPropagation(); void cooking.undo(); }}>
                <Undo2 className="h-3 w-3" aria-hidden="true" />
                Annuler
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-11 px-2 text-[11px] gap-1"
              disabled={pendingAction !== null || cooking.status === 'cooking'}
              onClick={(e) => {
                e.stopPropagation();
                void cooking.cook();
              }}
            >
              <Check className="h-3 w-3" aria-hidden="true" />
              Cuisinée
            </Button>
          )}
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
      <div className="grid grid-cols-1 gap-2">
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
  const out: RecipeBuckets = { cookable_now: [], almost_cookable: [], recent_suggestions: [],verify_suggestions:[],excluded_suggestions:[] };
  for (const key of ['cookable_now','almost_cookable','recent_suggestions','verify_suggestions','excluded_suggestions'] as const) {
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
  limit = 3,
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
    buckets.recent_suggestions.length+buckets.verify_suggestions.length+buckets.excluded_suggestions.length;
  if (total === 0) return null;

  return (
    <div className="space-y-4 my-3" role="region" aria-label="Recettes suggérées">
      <BucketSection
        title="Idées avec ton stock"
        recipes={buckets.cookable_now}
        limit={limit}
        showCookabilityBadge
        showActions
      />
      <BucketSection
        title="Avec quelques ingrédients à prévoir"
        recipes={buckets.almost_cookable}
        limit={limit}
        showCookabilityBadge
        showActions
      />
      <BucketSection title="À vérifier" recipes={buckets.verify_suggestions} limit={limit} showCookabilityBadge={false} showActions={false}/>
      {buckets.excluded_suggestions.length > 0 && (
        <details>
          <summary className="min-h-11 cursor-pointer py-2 text-sm text-muted-foreground">Recettes écartées</summary>
          <BucketSection title="Écartées : raisons" recipes={buckets.excluded_suggestions} limit={limit} showCookabilityBadge={false} showActions={false}/>
        </details>
      )}
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
