/**
 * RecipePrimaryActions — actions principales du détail recette.
 *
 * PRP-232 PR4 — extrait de `src/pages/RecipeDetail.tsx`. Trois actions
 * "Marquer comme cuisinée", "Ajouter les manquants aux courses", "Modifier".
 * Le wording évite "Décrémenter l'inventaire" (verboten §9). Le détail
 * de l'effet (décrémentation) reste documenté côté handler.
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChefHat, Edit, ShoppingCart } from 'lucide-react';

interface RecipePrimaryActionsProps {
  onCook: () => void;
  onAddMissingToShoppingList: () => void;
  onEdit: () => void;
  cooking?: boolean;
  addingToCart?: boolean;
  canCook?: boolean;
  canAddMissing?: boolean;
}

export default function RecipePrimaryActions({
  onCook,
  onAddMissingToShoppingList,
  onEdit,
  cooking = false,
  addingToCart = false,
  canCook = true,
  canAddMissing = true,
}: RecipePrimaryActionsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
      <Button onClick={onCook} disabled={cooking || !canCook}>
        {cooking ? (
          <>
            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Mise à jour…
          </>
        ) : (
          <>
            <ChefHat className="w-4 h-4 mr-2" aria-hidden="true" />
            Marquer comme cuisinée
          </>
        )}
      </Button>

      <Button variant="secondary" onClick={onAddMissingToShoppingList} disabled={addingToCart || !canAddMissing}>
        {addingToCart ? (
          <>
            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Ajout en cours…
          </>
        ) : (
          <>
            <ShoppingCart className="w-4 h-4 mr-2" aria-hidden="true" />
            Ajouter les manquants
          </>
        )}
      </Button>

      <Button variant="outline" onClick={onEdit}>
        <Edit className="w-4 h-4 mr-2" aria-hidden="true" />
        Modifier
      </Button>
    </div>
  );
}
