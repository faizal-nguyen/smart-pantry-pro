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
 * V2 : persister ces propositions dans `assistant_messages.metadata`
 * pour que la reload historique les reaffiche (aujourd'hui c'est une
 * vue éphémère sur le dernier turn).
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, Clock, Users } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AssistantPlanResponse, ExecutedAction } from '@/services/assistantApi';

interface RecipeView {
  id: string;
  name: string;
  prep_time?: number | null;
  cook_time?: number | null;
  servings?: number | null;
  image_url?: string | null;
  cuisine_category?: string | null;
  missing_count?: number;
  total_essential?: number;
  unlinked?: boolean;
  unlinked_count?: number;
}

interface RecipeBuckets {
  cookable_now: RecipeView[];
  almost_cookable: RecipeView[];
  recent_suggestions: RecipeView[];
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
    const result = a.result as Partial<RecipeBuckets> | undefined;
    if (!result || typeof result !== 'object') continue;
    for (const key of ['cookable_now', 'almost_cookable', 'recent_suggestions'] as const) {
      const arr = (result as Record<string, unknown>)[key];
      if (!Array.isArray(arr)) continue;
      buckets[key].push(...dedupe(arr.filter(isRecipeView), seen));
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

interface RecipeCardProps {
  recipe: RecipeView;
  showCookabilityBadge: boolean;
}

function RecipeCard({ recipe: r, showCookabilityBadge }: RecipeCardProps) {
  const navigate = useNavigate();
  const totalTime = (r.prep_time ?? 0) + (r.cook_time ?? 0);
  const open = () => navigate(`/kitchen/recipes/${r.id}`);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={open}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
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
          /* PRP-237 PR3 — placeholder neutre (surface-muted + saffron
             icon) au lieu du gradient orange/red qui traînait du look
             "healthy demo" pré-refonte. */
          <div className="w-16 h-16 rounded bg-surface-muted flex items-center justify-center flex-shrink-0">
            <ChefHat className="h-6 w-6 text-saffron" aria-hidden="true" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm line-clamp-2">{r.name}</h4>
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
          {showCookabilityBadge && (() => {
            const missing = r.missing_count ?? 0;
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
    </Card>
  );
}

interface BucketSectionProps {
  title: string;
  recipes: RecipeView[];
  limit: number;
  showCookabilityBadge: boolean;
}

function BucketSection({ title, recipes, limit, showCookabilityBadge }: BucketSectionProps) {
  const visible = recipes.slice(0, limit);
  if (visible.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {title}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visible.map((r) => (
          <RecipeCard key={r.id} recipe={r} showCookabilityBadge={showCookabilityBadge} />
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
      />
      <BucketSection
        title="Presque cuisinable"
        recipes={buckets.almost_cookable}
        limit={limit}
        showCookabilityBadge
      />
      <BucketSection
        title="Idées de ta base"
        recipes={buckets.recent_suggestions}
        limit={limit}
        showCookabilityBadge={false}
      />
    </div>
  );
}
