/**
 * RecipeMobileActionBar — barre d'actions sticky en bas d'ecran sur mobile.
 *
 * PRP-238 PR1 etape (d). Avant : les 3 actions (Cuisiner, Ajouter
 * manquants, Modifier) etaient dans `<RecipePrimaryActions>` rendues
 * inline dans le flux de la page, donc accessibles seulement apres scroll.
 * Sur mobile en cuisine c'est inutilisable.
 *
 * Maintenant : sur mobile (`md:hidden`), une barre sticky en bas s'empile
 * juste au-dessus de la bottom nav (via `--mobile-nav-height` defini en
 * etape (a)). Les boutons mesurent au moins 44px (tap target iOS).
 *
 * Desktop conserve `<RecipePrimaryActions>` inline.
 */
import { Button } from '@/components/ui/button';

interface RecipeMobileActionBarProps {
  onCook: () => void;
  onAddMissingToShoppingList: () => void;
  onEdit: () => void;
  cooking?: boolean;
  addingToCart?: boolean;
  canCook?: boolean;
  canAddMissing?: boolean;
  missingCount?: number;
  canEdit?: boolean;
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
  canEdit = true,
}: RecipeMobileActionBarProps) {
  return (
    <div
      data-testid="recipe-action-bar-mobile"
      className="md:hidden app-action-bar-mobile bg-background/95 backdrop-blur-md border-t shadow-lg"
    >
      <div className="grid grid-cols-3 gap-2 p-2">
        <Button
          size="lg"
          className="min-h-12 h-auto min-w-0 whitespace-normal break-words px-2 py-2 text-sm"
          onClick={onCook}
          disabled={cooking || !canCook}
          data-testid="primary-action"
          aria-label="Commencer cette recette"
        >
          {cooking ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <>
              <span>Commencer</span>
            </>
          )}
        </Button>

        <Button
          size="lg"
          variant="secondary"
          className="min-h-12 h-auto min-w-0 whitespace-normal break-words px-2 py-2 text-sm relative"
          onClick={onAddMissingToShoppingList}
          disabled={addingToCart || !canAddMissing}
          data-testid="primary-action"
          aria-label={
            missingCount
              ? `Ajouter ${missingCount} ingrédients manquants aux courses`
              : 'Ajouter les ingrédients manquants aux courses'
          }
        >
          {addingToCart ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <>
              <span>Manquants</span>
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
          className="min-h-12 h-auto min-w-0 whitespace-normal break-words px-2 py-2 text-sm"
          onClick={onEdit}
          disabled={!canEdit}
          aria-label="Modifier cette recette"
        >
          <span>Modifier</span>
        </Button>
      </div>
    </div>
  );
}
