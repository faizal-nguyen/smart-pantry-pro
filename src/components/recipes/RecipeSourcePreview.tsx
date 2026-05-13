/**
 * RecipeSourcePreview — wrapper de RecipeSourceCard.
 *
 * PRP-232 PR4 — donne un point d'entrée stable à la hiérarchie §9 du
 * détail recette. RecipeSourceCard se cache déjà tout seul quand la
 * recette est manuelle ; ce wrapper ne fait qu'ajouter la marge top et
 * conserver la même API pour ne pas casser PRP-220.17.
 */
import React from 'react';
import { RecipeSourceCard, type RecipeSourceLike } from '@/components/recipes/RecipeSourceCard';

interface RecipeSourcePreviewProps {
  recipe: RecipeSourceLike;
  className?: string;
}

export default function RecipeSourcePreview({ recipe, className }: RecipeSourcePreviewProps) {
  return <RecipeSourceCard recipe={recipe} className={className ?? 'mt-4'} />;
}
