/**
 * RecipeInboxTab — onglet "À vérifier".
 *
 * PRP-232 PR2 — extrait de `src/pages/Recipes.tsx`. Wrapper sur le composant
 * `RecipeInbox` (qui était déjà tab-ready depuis PRP-220.12). Le tab transmet
 * le draft sélectionné au parent via `onVerifyDraft` pour que `Recipes.tsx`
 * puisse afficher l'`ExtractedRecipeModal` (pont legacy PRP-220.08, à
 * réécrire dans PRP-220.16/17).
 */
import React from 'react';
import { RecipeInbox } from '@/components/recipes/RecipeInbox';
import type { CurrentDraftResponse } from '@/services/recipe-import/types';

interface RecipeInboxTabProps {
  onVerifyDraft: (payload: CurrentDraftResponse) => void;
}

export default function RecipeInboxTab({ onVerifyDraft }: RecipeInboxTabProps) {
  return <RecipeInbox onVerifyDraft={onVerifyDraft} />;
}
