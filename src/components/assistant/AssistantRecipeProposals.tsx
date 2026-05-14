/**
 * AssistantRecipeProposals — extrait les recettes BDD des tool results
 * d'une `AssistantPlanResponse` et affiche des cards cliquables.
 *
 * PRP-224 follow-up — V1 ancre les suggestions assistant sur la BDD
 * recettes. Le system prompt force find_cookable_recipes / search_recipes
 * / read_recent_recipes. Quand un de ces tools a tourné, ce composant
 * dépile leur `result.recipes` et rend des liens vers
 * `/kitchen/recipes/:id`.
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
}

const RECIPE_TOOLS = new Set([
  'find_cookable_recipes',
  'search_recipes',
  'read_recent_recipes',
]);

function extractRecipes(actions: ExecutedAction[]): RecipeView[] {
  const seen = new Set<string>();
  const recipes: RecipeView[] = [];
  for (const a of actions) {
    if (!RECIPE_TOOLS.has(a.tool)) continue;
    const result = a.result as unknown;
    if (!result || typeof result !== 'object') continue;
    const list = (result as { recipes?: unknown }).recipes;
    if (!Array.isArray(list)) continue;
    for (const raw of list) {
      if (!raw || typeof raw !== 'object') continue;
      const r = raw as RecipeView;
      if (!r.id || !r.name || seen.has(r.id)) continue;
      seen.add(r.id);
      recipes.push(r);
    }
  }
  return recipes;
}

interface AssistantRecipeProposalsProps {
  response: AssistantPlanResponse | null;
  /** Max recipes to render. Default 4. */
  limit?: number;
}

export default function AssistantRecipeProposals({
  response,
  limit = 4,
}: AssistantRecipeProposalsProps) {
  const navigate = useNavigate();
  if (!response) return null;

  const recipes = extractRecipes(response.actions_executed).slice(0, limit);
  if (recipes.length === 0) return null;

  return (
    <div className="space-y-2 my-3" role="region" aria-label="Recettes suggérées">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Recettes suggérées
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {recipes.map(r => {
          const totalTime =
            (r.prep_time ?? 0) + (r.cook_time ?? 0);
          return (
            <Card
              key={r.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/kitchen/recipes/${r.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/kitchen/recipes/${r.id}`);
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
                  <div className="w-16 h-16 rounded bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center flex-shrink-0">
                    <ChefHat className="h-6 w-6 text-orange-400" aria-hidden="true" />
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
                  {typeof r.missing_count === 'number' && r.missing_count === 0 && (
                    <Badge variant="outline" className="mt-1 text-[10px] bg-green-50 text-green-700 border-green-300">
                      Tu as tout
                    </Badge>
                  )}
                  {typeof r.missing_count === 'number' && r.missing_count > 0 && (
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {r.missing_count} manquant{r.missing_count > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
