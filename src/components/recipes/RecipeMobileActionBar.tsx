/**
 * RecipeMobileActionBar — barre d'actions sticky en bas d'ecran sur mobile.
 *
 * PRP-238 PR1 etape (d). Avant : les 3 actions (Cuisiner, Ajouter
 * manquants, Modifier) etaient dans `<RecipePrimaryActions>` rendues
 * inline dans le flux de la page, donc accessibles seulement apres scroll.
 * Sur mobile en cuisine c'est inutilisable.
 *
 * Maintenant : sur mobile (`sm:hidden`), une barre sticky en bas s'empile
 * juste au-dessus de la bottom nav (via `--mobile-nav-height` defini en
 * etape (a)). Les boutons mesurent au moins 44px (tap target iOS).
 *
 * Desktop conserve `<RecipePrimaryActions>` inline.
 */
import { Button } from '@/components/ui/button';
import { ChefHat, Edit, ShoppingCart } from 'lucide-react';

interface RecipeMobileActionBarProps {
  onCook: () => void;
  onAddMissingToShoppingList: () => void;
  onEdit: () => void;
  cooking?: boolean;
  addingToCart?: boolean;
  canCook?: boolean;
  canAddMissing?: boolean;
  missingCount?: number;
}

export default function RecipeMobileActionBar({
  onCook,
  onAddMissingToShoppingList,
  onEdit,
  cooking = false,
  addingToCart = false,
  canCook = true,
  canAddMissing = true,
  missingCount,
}: RecipeMobileActionBarProps) {
  return (
    <div
      data-testid="recipe-action-bar-mobile"
      className="sm:hidden app-action-bar-mobile bg-background/95 backdrop-blur-md border-t shadow-lg"
    >
      <div className="grid grid-cols-3 gap-2 p-2">
        <Button
          size="lg"
          className="h-12 px-2 text-xs"
          onClick={onCook}
          disabled={cooking || !canCook}
          data-testid="primary-action"
          aria-label="Marquer cette recette comme cuisinee"
        >
          {cooking ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <>
              <ChefHat className="w-4 h-4 mr-1" aria-hidden="true" />
              <span className="truncate">Cuisiner</span>
            </>
          )}
        </Button>

        <Button
          size="lg"
          variant="secondary"
          className="h-12 px-2 text-xs relative"
          onClick={onAddMissingToShoppingList}
          disabled={addingToCart || !canAddMissing}
          data-testid="primary-action"
          aria-label={
            missingCount
              ? `Ajouter ${missingCount} ingredients manquants aux courses`
              : 'Ajouter les ingredients manquants aux courses'
          }
        >
          {addingToCart ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <>
              <ShoppingCart className="w-4 h-4 mr-1" aria-hidden="true" />
              <span className="truncate">Manquants</span>
              {missingCount && missingCount > 0 ? (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-semibold rounded-full min-w-5 h-5 flex items-center justify-center px-1">
                  {missingCount}
                </span>
              ) : null}
            </>
          )}
        </Button>

        <Button
          size="lg"
          variant="outline"
          className="h-12 px-2 text-xs"
          onClick={onEdit}
          aria-label="Modifier cette recette"
        >
          <Edit className="w-4 h-4 mr-1" aria-hidden="true" />
          <span className="truncate">Modifier</span>
        </Button>
      </div>
    </div>
  );
}
