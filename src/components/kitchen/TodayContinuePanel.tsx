/**
 * PRP-234 PR3 — TodayContinuePanel.
 *
 * Affiche les recettes vues récemment + un lien compact « N imports
 * à vérifier » si applicable. Source = `useTodayContinue`.
 */
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChefHat, Clock } from 'lucide-react';

import { useTodayContinue } from '@/hooks/useTodayContinue';
import {
  PanelChrome,
  PanelEmpty,
  PanelError,
  PanelSkeleton,
} from '@/components/kitchen/TodayPanelShell';

const TITLE = 'Continuer';

interface RecipeRowProps {
  recipeId: string;
  name: string;
  imageUrl: string | null;
  totalTime: number;
}

function RecipeRow({ recipeId, name, imageUrl, totalTime }: RecipeRowProps) {
  return (
    <Link
      to={`/kitchen/recipes/${recipeId}`}
      className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/60 focus:bg-muted/60 focus:outline-none"
      aria-label={`Ouvrir ${name}`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="h-10 w-10 flex-shrink-0 rounded object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-surface-muted">
          <ChefHat className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium line-clamp-1">{name}</p>
        {totalTime > 0 && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {totalTime} min
          </p>
        )}
      </div>
    </Link>
  );
}

export default function TodayContinuePanel() {
  const navigate = useNavigate();
  const { items, pendingImports, isLoading, isError, refetch } = useTodayContinue();

  if (isLoading) return <PanelSkeleton title={TITLE} />;
  if (isError) {
    return (
      <PanelError
        title={TITLE}
        message="Impossible de charger ton activité récente."
        onRetry={() => void refetch()}
      />
    );
  }

  if (items.length === 0 && pendingImports === 0) {
    return (
      <PanelEmpty
        title={TITLE}
        message="Ouvre ta première recette — elle réapparaîtra ici à ta prochaine visite."
        cta={{
          label: 'Ouvrir mes recettes',
          onClick: () => navigate('/kitchen/recipes'),
        }}
      />
    );
  }

  return (
    <PanelChrome title={TITLE}>
      <div className="space-y-1">
        {items.map((item) => (
          <RecipeRow
            key={item.recipe_id}
            recipeId={item.recipe_id}
            name={item.recipe_name}
            imageUrl={item.image_url}
            totalTime={(item.prep_time ?? 0) + (item.cook_time ?? 0)}
          />
        ))}
        {pendingImports > 0 && (
          <Link
            to="/kitchen/recipes?tab=inbox"
            className="block pt-2 text-sm text-muted-foreground hover:underline focus:underline focus:outline-none"
          >
            {pendingImports} import{pendingImports > 1 ? 's' : ''} à vérifier →
          </Link>
        )}
      </div>
    </PanelChrome>
  );
}
