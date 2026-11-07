/**
 * ProductSheet — what the stock knows about one product: the photo kept by
 * its owner, the brand, the lot, and the Open Food Facts details (Nutri-Score,
 * NOVA, allergens, ingredients) with their credit, as the ODbL licence asks.
 */
import { pantryDateLabel } from '@smart/shared';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { InventoryItem } from '@/hooks/useInventory';
import NutriScoreBadge from './NutriScoreBadge';

const NOVA_GROUPS: Record<number, string> = {
  1: 'aliment pas ou peu transformé',
  2: 'ingrédient culinaire transformé',
  3: 'aliment transformé',
  4: 'produit ultra-transformé',
};
const ALLERGENS: Record<string, string> = {
  'en:gluten': 'gluten', 'en:crustaceans': 'crustacés', 'en:eggs': 'œufs', 'en:fish': 'poisson', 'en:peanuts': 'arachides',
  'en:soybeans': 'soja', 'en:milk': 'lait', 'en:nuts': 'fruits à coque', 'en:celery': 'céleri', 'en:mustard': 'moutarde',
  'en:sesame-seeds': 'sésame', 'en:sulphur-dioxide-and-sulphites': 'sulfites', 'en:lupin': 'lupin', 'en:molluscs': 'mollusques',
};
const allergenName = (tag: string) => ALLERGENS[tag] ?? tag.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ');

interface ProductSheetProps {
  item: InventoryItem;
  photoUrl?: string;
  now: Date;
  onClose: () => void;
}

export default function ProductSheet({ item, photoUrl, now, onClose }: ProductSheetProps) {
  const product = item.product;
  const name = product?.name ?? 'Produit';
  const scores = product?.nutrition_json?.scores;
  const allergens = product?.allergens_json?.allergensTags ?? [];
  const offCode = product?.enrichment_status === 'enriched' ? product.off_product_code : null;
  const quantity = Number.isFinite(item.quantity) ? `${item.quantity} ${item.unit ?? product?.unit_type ?? ''}`.trim() : 'à vérifier';
  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg min-w-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="break-words">{name}</DialogTitle>
          <DialogDescription>{product?.brand ? `Marque : ${product.brand}` : 'Fiche du produit'}</DialogDescription>
        </DialogHeader>
        {photoUrl && <img src={photoUrl} alt={`Photo de ${name}`} className="max-h-[50vh] w-full rounded-lg bg-muted object-contain" />}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Quantité</dt><dd>{quantity}</dd>
          <dt className="text-muted-foreground">Date</dt><dd>{pantryDateLabel(item.expiry_date, now)}</dd>
          <dt className="text-muted-foreground">Zone</dt><dd>{item.location || 'non renseignée'}</dd>
          {product?.barcode && <><dt className="text-muted-foreground">Code-barres</dt><dd>{product.barcode}</dd></>}
        </dl>
        {offCode ? (
          <section aria-labelledby="product-sheet-off" className="space-y-2 border-t pt-3 text-sm">
            <h3 id="product-sheet-off" className="font-semibold">Infos Open Food Facts</h3>
            {scores?.nutriScore && scores.nutriScore !== 'unknown' && <p>Nutri-Score <NutriScoreBadge grade={scores.nutriScore} /></p>}
            {scores?.novaGroup && <p>NOVA {scores.novaGroup} : {NOVA_GROUPS[scores.novaGroup]}</p>}
            {allergens.length > 0 && <p>Allergènes : {allergens.map(allergenName).join(', ')}</p>}
            {product?.ingredients_text && <p><span className="text-muted-foreground">Ingrédients : </span>{product.ingredients_text}</p>}
            <p className="text-xs text-muted-foreground">
              Source : <a className="underline" href={`https://world.openfoodfacts.org/product/${encodeURIComponent(offCode)}`} target="_blank" rel="noreferrer">Open Food Facts</a>, licence ODbL.
            </p>
          </section>
        ) : (product?.brand || product?.barcode) ? (
          <p className="border-t pt-3 text-sm text-muted-foreground">Open Food Facts ne connaît pas encore ce produit : pas de Nutri-Score ni d’allergènes à afficher.</p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
